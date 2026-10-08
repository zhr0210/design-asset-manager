#!/usr/bin/env python3
"""Explicit offline evaluation, never a Worker/DB queue or model installer."""
from __future__ import annotations
import argparse
import json
import os
from pathlib import Path
import socket
import sys
import tempfile
import math
import re
try:
    import resource
except ImportError:
    resource = None
import time


def safe_fixture_file(root: Path, name: str) -> Path:
    if Path(name).name != name:
        raise ValueError('FIXTURE_SCOPE_INVALID')
    p = (root / name).resolve()
    if root not in p.parents or not p.is_file():
        raise ValueError('FIXTURE_SCOPE_INVALID')
    return p


def normalize_location_tokens(text):
    return re.sub(r"(<loc_\d+>)\s+(?=<loc_\d+>)", r"\1", text)


def validate_output(task, result, width, height):
    if task != '<OD>':
        if not isinstance(result,str) or not result.strip() or len(result)>16000:
            raise ValueError('FLORENCE_RESULT_INVALID')
        return result
    if not isinstance(result,dict) or not isinstance(result.get('labels'),list) or not isinstance(result.get('bboxes'),list) or len(result['labels'])!=len(result['bboxes']) or len(result['labels'])>128:
        raise ValueError('FLORENCE_RESULT_INVALID')
    normalized=[]
    for label,box in zip(result['labels'],result['bboxes']):
        if not isinstance(label,str) or not label.strip() or len(label)>256 or not isinstance(box,(list,tuple)) or len(box)!=4 or any(not isinstance(v,(int,float)) and not hasattr(v,'item') for v in box):
            raise ValueError('FLORENCE_RESULT_INVALID')
        try: values=[float(v) for v in box]
        except (TypeError,ValueError): raise ValueError('FLORENCE_RESULT_INVALID')
        if not all(math.isfinite(v) for v in values): raise ValueError('FLORENCE_RESULT_INVALID')
        if not 0 <= values[0] <= values[2] <= width or not 0 <= values[1] <= values[3] <= height:
            raise ValueError('FLORENCE_RESULT_INVALID')
        normalized.append(values)
    return {'labels':result['labels'],'bboxes':normalized}


def evaluate(model_dir: Path, fixture_dir: Path, device_name: str, output: Path):
    # Must be set before importing Hub/Transformers; all input files are pre-provisioned.
    os.environ.update({'HF_HUB_OFFLINE':'1','TRANSFORMERS_OFFLINE':'1','HF_HUB_DISABLE_TELEMETRY':'1','TOKENIZERS_PARALLELISM':'false','PYTORCH_ENABLE_MPS_FALLBACK':'0','HF_HOME':str(model_dir.parent/'hf-cache'),'HF_HUB_CACHE':str(model_dir.parent/'hf-cache'/'hub'),'TORCH_HOME':str(model_dir.parent/'torch-cache')})
    def no_network(*_args, **_kwargs):
        raise RuntimeError('EVALUATION_NETWORK_DISABLED')
    socket.socket.connect = no_network
    socket.create_connection = no_network
    import torch
    from PIL import Image
    from transformers import AutoProcessor, Florence2ForConditionalGeneration
    torch.set_num_threads(4)
    if device_name == 'mps' and not torch.backends.mps.is_available():
        raise RuntimeError('MPS_UNAVAILABLE')
    manifest = json.loads((fixture_dir/'manifest.json').read_text())
    if manifest.get('generatedOnly') is not True or not 1 <= len(manifest.get('fixtures',[])) <= 16:
        raise ValueError('FIXTURE_SCOPE_INVALID')
    start = time.perf_counter()
    processor = AutoProcessor.from_pretrained(str(model_dir), local_files_only=True, trust_remote_code=False, use_fast=False)
    model, loading = Florence2ForConditionalGeneration.from_pretrained(str(model_dir), local_files_only=True, trust_remote_code=False, use_safetensors=True, dtype=torch.float32, attn_implementation='eager', output_loading_info=True)
    if any(loading.get(key) for key in ['missing_keys','unexpected_keys','mismatched_keys','error_msgs']):
        raise RuntimeError('MODEL_CHECKPOINT_INCOMPATIBLE')
    model = model.to(device_name).eval()
    load_ms = round((time.perf_counter()-start)*1000)
    rows = []
    report = {'generatedOnly':True,'device':device_name,'dtype':'float32','modelLoadMs':load_ms,'versions':{'torch':torch.__version__},'qualityVerdict':'requires-human-review','rows':rows}
    tasks = ['<CAPTION>', '<DETAILED_CAPTION>', '<OD>']
    if os.environ.get('DAM_FLORENCE_OD_ONLY') == '1': tasks = ['<OD>']
    for fixture in manifest['fixtures']:
        file = safe_fixture_file(fixture_dir, fixture['file'])
        with Image.open(file) as raw:
            if raw.width * raw.height > 4000000:
                raise ValueError('FIXTURE_SCOPE_INVALID')
            image = raw.convert('RGB')
        for task in tasks:
            started = time.perf_counter()
            try:
                inputs = processor(text=task, images=image, return_tensors='pt')
                inputs = {k:v.to(device_name,dtype=torch.float32) if k=='pixel_values' else v.to(device_name) for k,v in inputs.items()}
                with torch.inference_mode():
                    ids = model.generate(**inputs,max_new_tokens=256,num_beams=1,do_sample=False)
                # Grounding location tokens must remain intact for post-processing.
                text = processor.batch_decode(ids,skip_special_tokens=False)[0]
                parse_text=normalize_location_tokens(text) if task=='<OD>' else text
                result = processor.post_process_generation(parse_text,task=task,image_size=image.size).get(task)
                result=validate_output(task,result,*image.size)
                if device_name == 'mps':
                    torch.mps.synchronize()
                rows.append({'fixture':fixture['id'],'task':task,'elapsedMs':round((time.perf_counter()-started)*1000),'status':'completed','output':result,'reachedTokenLimit':int(ids.shape[-1])>=256,'rawTokenExcerpt':text[:700] if task=='<OD>' else None,'locationTokensJoined':parse_text!=text,'peakProcessRssBytes':int(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss)*(1 if sys.platform=='darwin' else 1024) if resource else None,'mpsDriverBytes':torch.mps.driver_allocated_memory() if device_name=='mps' else None})
            except Exception as error:
                # Never record a private traceback or infer success from a mock response.
                rows.append({'fixture':fixture['id'],'task':task,'status':'failed','errorType':type(error).__name__})
            output.write_text(json.dumps(report,ensure_ascii=False,indent=2))
    return report


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--execute',action='store_true')
    parser.add_argument('--model-dir',type=Path)
    parser.add_argument('--fixtures',type=Path)
    parser.add_argument('--device',choices=['cpu','mps'],default='cpu')
    parser.add_argument('--report',type=Path)
    args=parser.parse_args()
    if not args.execute:
        print(json.dumps({'state':'review-only','modelLoaded':False,'networkRequests':0,'tasks':['caption','detailed-caption','object-detection']}))
        return 0
    if not args.model_dir or not args.fixtures or not args.report:
        parser.error('Explicit model, generated fixture directory and report are required.')
    fixtures=args.fixtures.resolve()
    if fixtures.parent != Path(tempfile.gettempdir()).resolve() or not fixtures.name.startswith('dam-florence-fixtures-'):
        parser.error('Only this task generated fixture directory is accepted.')
    report=evaluate(args.model_dir.resolve(),fixtures,args.device,args.report)
    passed=all(row['status']=='completed' for row in report['rows'])
    print(json.dumps({'state':'completed' if passed else 'partial','rows':len(report['rows']),'qualityVerdict':report['qualityVerdict']}))
    return 0 if passed else 1

if __name__=='__main__':
    raise SystemExit(main())
