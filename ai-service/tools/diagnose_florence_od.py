#!/usr/bin/env python3
"""One generated image: distinguish model <OD> token absence from parsing loss."""
import argparse,json,os,sys,time
from pathlib import Path
import socket,tempfile
p=argparse.ArgumentParser();p.add_argument('--execute',action='store_true');p.add_argument('--model-dir',type=Path);p.add_argument('--fixtures',type=Path);args=p.parse_args()
if not args.execute:
 print(json.dumps({'state':'review-only','inferenceCalls':0}));sys.exit(0)
root=args.fixtures.resolve();model=args.model_dir.resolve()
if root.parent!=Path(tempfile.gettempdir()).resolve() or not root.name.startswith('dam-florence-fixtures-') or not (root/'manifest.json').exists():raise RuntimeError('FIXTURE_SCOPE_INVALID')
os.environ.update({'HF_HUB_OFFLINE':'1','TRANSFORMERS_OFFLINE':'1','HF_HUB_DISABLE_TELEMETRY':'1','HF_HOME':str(model.parent/'hf-cache'),'HF_HUB_CACHE':str(model.parent/'hf-cache'/'hub')})
def blocked(*_args,**_kwargs):raise RuntimeError('NETWORK_DISABLED')
socket.socket.connect=blocked;socket.create_connection=blocked
import torch
from PIL import Image
from transformers import AutoProcessor,Florence2ForConditionalGeneration
processor=AutoProcessor.from_pretrained(str(model),local_files_only=True,trust_remote_code=False,use_fast=False)
network=Florence2ForConditionalGeneration.from_pretrained(str(model),local_files_only=True,trust_remote_code=False,use_safetensors=True,dtype=torch.float32,attn_implementation='eager').eval()
with Image.open(root/'f01.png') as original:image=original.convert('RGB')
inputs=processor(text='<OD>',images=image,return_tensors='pt')
with torch.inference_mode():ids=network.generate(**inputs,max_new_tokens=256,num_beams=1,do_sample=False)
raw=processor.batch_decode(ids,skip_special_tokens=False)[0]
result=processor.post_process_generation(raw,task='<OD>',image_size=image.size).get('<OD>')
report={'generatedOnly':True,'device':'cpu','fixture':'cup','rawTokenExcerpt':raw[:700],'output':result,'tokenCount':int(ids.shape[-1]),'qualityVerdict':'diagnostic-only'}
(root/'florence-od-diagnostic.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps({'state':'completed','hasLocationTokens':'<loc_' in raw,'parsedObjects':len(result.get('labels',[])) if isinstance(result,dict) else None,'tokenCount':report['tokenCount']}))
