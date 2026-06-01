import sys
import os
import json
import time
import gc

# Reconfigure standard streams to use UTF-8 to prevent CP936 (GBK) decoding corruption on Windows
if hasattr(sys.stdin, 'reconfigure'):
    try:
        sys.stdin.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass
if hasattr(sys.stderr, 'reconfigure'):
    try:
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass


def emit(payload):
    print(json.dumps(payload, ensure_ascii=False), flush=True)

def fail(code, message, stderr="", exit_code=1):
    emit({
        "success": False,
        "provider": "prompt.qwen3vl",
        "modelId": os.environ.get("QWEN3VL_MODEL_ID", "Qwen/Qwen3-VL-8B-Instruct"),
        "device": "unknown",
        "durationMs": 0,
        "data": None,
        "error": {
            "code": code,
            "message": message,
            "stderr": stderr,
            "exitCode": exit_code
        },
        "diagnostics": {"cudaAvailable": False}
    })
    sys.exit(exit_code)

def main():
    try:
        # Read payload from stdin
        stdin_input = sys.stdin.read().strip()
        if not stdin_input:
            fail("EMPTY_INPUT", "Received empty stdin payload.")
        input_data = json.loads(stdin_input)
    except Exception as e:
        fail("INPUT_PARSE_FAILED", "Failed to parse JSON input from stdin", str(e))

    image_path = input_data.get("imagePath")
    model_path = input_data.get("modelPath")
    
    if image_path:
        image_path = os.path.expanduser(image_path)
    if model_path:
        model_path = os.path.expanduser(model_path)

    model_id = input_data.get("modelId", "Qwen/Qwen3-VL-8B-Instruct")
    quantization = input_data.get("quantization", "none")
    runtime = input_data.get("runtime", "transformers")
    
    options = input_data.get("options", {})
    max_image_size = options.get("maxImageSize", 1024)
    max_new_tokens = options.get("maxNewTokens", 512)
    temperature = options.get("temperature", 0.6)
    top_p = options.get("topP", 0.9)

    if not image_path or not os.path.exists(image_path):
        fail("IMAGE_NOT_FOUND", f"Image file not found: {image_path}")

    if not model_path or not os.path.exists(model_path):
        fail("MODEL_NOT_FOUND", f"Model path not found: {model_path}")

    start_time = time.time()

    # Pre-infer diagnostics
    torch_version = "unknown"
    transformers_version = "unknown"
    cuda_available = False
    gpu_name = None
    total_vram = 0.0
    free_vram_before = 0.0

    try:
        import torch
        import transformers
        torch_version = torch.__version__
        transformers_version = transformers.__version__
        cuda_available = torch.cuda.is_available()
        if cuda_available:
            gpu_name = torch.cuda.get_device_name(0)
            total_vram = round(torch.cuda.get_device_properties(0).total_memory / 1024**3, 2)
            # Fetch current Torch reserved memory VRAM status
            free_vram_before = round((torch.cuda.get_device_properties(0).total_memory - torch.cuda.memory_reserved(0)) / 1024**3, 2)
    except Exception as e:
        fail("DIAGNOSTICS_FAILED", "Failed to load torch/transformers dependencies", str(e))

    device = "cuda" if cuda_available else "cpu"

    try:
        from transformers import AutoModelForVision2Seq, AutoProcessor
        from qwen_vl_utils import process_vision_info
        from PIL import Image

        # 1. Prevent mismatch & auto-heal incompatible vision ignore paths
        config_path = os.path.join(model_path, "config.json")
        if os.path.exists(config_path):
            try:
                config_modified = False
                with open(config_path, "r", encoding="utf-8") as f:
                    config_data = json.load(f)
                
                # Check for model mismatch
                q_conf = config_data.get("quantization_config")
                if quantization == "none" and q_conf:
                    fail("MODEL_MISMATCH", "配置冲突！该模型文件夹包含量化配置(quantization_config)，但当前以原版(none)模式请求加载。请修改设置中的模型分类。")
                
                # Auto-heal vision ignore paths defensively using robust regex markers (solving group_size divisibility issues)
                if q_conf and "ignore" in q_conf:
                    ignore_list = q_conf["ignore"]
                    
                    # Check if our regex selectors are already injected
                    regex_visual = "re:.*visual\\..*"
                    regex_lm_head = "lm_head"
                    
                    if regex_visual not in ignore_list:
                        ignore_list.append(regex_visual)
                        config_modified = True
                    if regex_lm_head not in ignore_list:
                        ignore_list.append(regex_lm_head)
                        config_modified = True
                        
                    if config_modified:
                        q_conf["ignore"] = ignore_list
                        config_data["quantization_config"] = q_conf
                        
                        # Save the self-healed config back
                        with open(config_path, "w", encoding="utf-8") as f:
                            json.dump(config_data, f, indent=2, ensure_ascii=False)
            except Exception as e:
                # If fail was called, it exited; otherwise keep going
                pass

        # 2. Check AWQ library dependencies
        if "awq" in quantization:
            try:
                import compressed_tensors
            except ImportError:
                fail("MODEL_RUNTIME_INCOMPATIBLE", "当前 Python 环境缺少 AWQ 量化加载所需的 'compressed-tensors' 依赖库。请改用 Qwen3-VL 4B 稳定版或 Qwen3-VL 8B 原版。")

        # 3. Load model with robust error handling
        try:
            model = AutoModelForVision2Seq.from_pretrained(
                model_path,
                torch_dtype=torch.bfloat16 if cuda_available else torch.float32,
                device_map="auto" if cuda_available else None,
                trust_remote_code=True
            )
        except Exception as e:
            err_str = str(e)
            if "compressed" in err_str.lower() or "quantiz" in err_str.lower() or "awq" in err_str.lower():
                fail("MODEL_QUANTIZATION_NOT_SUPPORTED", f"当前环境暂不支持加载该量化模型: {err_str}。建议改用 Qwen3-VL 4B 稳定版或 Qwen3-VL 8B 原版。", err_str)
            else:
                fail("MODEL_LOAD_FAILED", f"加载大模型失败，请检查模型文件完整性或显存资源: {err_str}", err_str)

        processor = AutoProcessor.from_pretrained(model_path)

        # Preprocess / Downscale image to save VRAM
        img = Image.open(image_path)
        w, h = img.size
        if max(w, h) > max_image_size:
            scale = max_image_size / max(w, h)
            img = img.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)

        # Dynamically load Qwen3-VL system instructions from prompt loader, or use a custom text override.
        template_id = input_data.get("templateId", "qwen3vl.design_prompt.v1")
        prompt_text = input_data.get("promptTemplateText")
        try:
            if not prompt_text:
                worker_dir = os.path.dirname(os.path.abspath(__file__))
                parent_dir = os.path.dirname(worker_dir)
                if parent_dir not in sys.path:
                    sys.path.insert(0, parent_dir)
                from prompt_templates.qwen3vl_prompt_loader import load_prompt_template
                prompt_text = load_prompt_template(template_id)
        except Exception as e:
            fail("TEMPLATE_LOAD_FAILED", f"加载 Prompt 模板失败 '{template_id}': {str(e)}")

        messages = [
            {
                "role": "user",
                "content": [
                    {"type": "image", "image": img},
                    {"type": "text", "text": prompt_text}
                ]
            }
        ]

        # Prepare inputs
        text = processor.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
        image_inputs, video_inputs = process_vision_info(messages)
        inputs = processor(
            text=[text],
            images=image_inputs,
            videos=video_inputs,
            padding=True,
            return_tensors="pt"
        )
        inputs = inputs.to(device)

        # Run inference
        generated_ids = model.generate(
            **inputs,
            max_new_tokens=max_new_tokens,
            temperature=temperature,
            top_p=top_p,
            do_sample=True
        )
        generated_ids_trimmed = [
            out_ids[len(in_ids) :] for in_ids, out_ids in zip(inputs.input_ids, generated_ids)
        ]
        response = processor.batch_decode(
            generated_ids_trimmed, skip_special_tokens=True, clean_up_tokenization_spaces=False
        )[0]

        # Process/Parse response JSON defensively
        structured_data = {}
        parsed_ok = False
        
        # 1. Try standard JSON parsing
        try:
            first = response.find("{")
            last = response.rfind("}")
            if first != -1 and last != -1 and last > first:
                structured_data = json.loads(response[first:last+1].strip())
                parsed_ok = True
            else:
                structured_data = json.loads(response.strip())
                parsed_ok = True
        except Exception:
            pass

        # 2. Try regex-based fallback to extract fields if standard JSON parsing failed
        if not parsed_ok:
            try:
                import re
                
                fields = [
                    "englishPrompt", "chineseDescription", "shortCaption", 
                    "styleTags", "subjectTags", "compositionTags", 
                    "colorTags", "usageTags", "negativePromptSuggestion"
                ]
                
                # Clean up markdown code block wrappers
                cleaned_text = re.sub(r'```json\s*', '', response)
                cleaned_text = re.sub(r'```\s*', '', cleaned_text)
                
                extracted = {}
                for f in fields:
                    # Match "fieldName": "value" (allowing multiline and escaped characters)
                    # We match strings that are cleanly double-quoted
                    pattern = rf'"{f}"\s*:\s*"(.*?)"(?=\s*(?:,|\s|\n|\r|\}}))'
                    match = re.search(pattern, cleaned_text, re.DOTALL)
                    if match:
                        val = match.group(1).replace('\\"', '"').replace('\\n', '\n').strip()
                        extracted[f] = val
                    else:
                        # Try matching single quotes just in case
                        single_pattern = rf"'{f}'\s*:\s*'(.*?)'(?=\s*(?:,|\s|\n|\r|\}}))"
                        single_match = re.search(single_pattern, cleaned_text, re.DOTALL)
                        if single_match:
                            val = single_match.group(1).replace("\\'", "'").replace('\\n', '\n').strip()
                            extracted[f] = val
                        else:
                            # Try to extract array fields
                            array_pattern = rf'"{f}"\s*:\s*\[(.*?)\]'
                            array_match = re.search(array_pattern, cleaned_text, re.DOTALL)
                            if array_match:
                                items = re.findall(r'"(.*?)"', array_match.group(1))
                                extracted[f] = [item.strip() for item in items]

                if extracted.get("englishPrompt") or extracted.get("chineseDescription"):
                    structured_data = extracted
                    # Fill missing fields dynamically
                    if "englishPrompt" not in structured_data:
                        structured_data["englishPrompt"] = response
                    if "chineseDescription" not in structured_data:
                        structured_data["chineseDescription"] = "解析字段成功，但缺少中文描述。"
                    if "shortCaption" not in structured_data:
                        structured_data["shortCaption"] = "图片反推详情"
                    if "styleTags" not in structured_data:
                        structured_data["styleTags"] = []
                    if "subjectTags" not in structured_data:
                        structured_data["subjectTags"] = []
                    if "compositionTags" not in structured_data:
                        structured_data["compositionTags"] = []
                    if "colorTags" not in structured_data:
                        structured_data["colorTags"] = []
                    if "usageTags" not in structured_data:
                        structured_data["usageTags"] = []
                    if "negativePromptSuggestion" not in structured_data:
                        structured_data["negativePromptSuggestion"] = "low quality, blurry, messy layout"
                    structured_data["rawResponse"] = response
                    
                    parsed_ok = True
            except Exception:
                pass

        # 3. Last resort fallback
        if not parsed_ok:
            # Check if there is raw text and try to use it as English prompt
            raw_text = response.strip()
            structured_data = {
                "englishPrompt": raw_text if raw_text else "A detailed visual design reference.",
                "chineseDescription": "解析 JSON 失败，返回原始响应文本。",
                "shortCaption": "图片反推详情",
                "styleTags": [],
                "subjectTags": [],
                "compositionTags": [],
                "colorTags": [],
                "usageTags": [],
                "negativePromptSuggestion": "low quality, blurry, messy layout",
                "rawResponse": response
            }

        # Parse template version
        parts = template_id.split(".")
        template_version = parts[2] if len(parts) >= 3 else "unknown"
        
        # Inject template attributes safely
        if isinstance(structured_data, dict):
            structured_data["promptTemplateId"] = template_id
            structured_data["promptTemplateVersion"] = template_version

        # Clear active references and collect garbage immediately to release GPU memory
        del model
        del processor
        gc.collect()
        if cuda_available:
            torch.cuda.empty_cache()
            torch.cuda.ipc_collect()

        free_vram_after = 0.0
        if cuda_available:
            free_vram_after = round((torch.cuda.get_device_properties(0).total_memory - torch.cuda.memory_reserved(0)) / 1024**3, 2)

        emit({
            "success": True,
            "provider": "prompt.qwen3vl",
            "modelId": model_id,
            "device": device,
            "durationMs": int((time.time() - start_time) * 1000),
            "data": structured_data,
            "promptTemplateId": template_id,
            "promptTemplateVersion": template_version,
            "error": None,
            "diagnostics": {
                "modelId": model_id,
                "repoId": input_data.get("repoId"),
                "quantization": quantization,
                "runtime": runtime,
                "torchVersion": torch_version,
                "transformersVersion": transformers_version,
                "cudaAvailable": cuda_available,
                "gpuName": gpu_name,
                "totalVramGB": total_vram,
                "freeVramGBBefore": free_vram_before,
                "freeVramGBAfter": free_vram_after,
                "maxImageSize": max_image_size,
                "maxNewTokens": max_new_tokens
            }
        })

    except Exception as e:
        # Check OOM from exception
        err_msg = str(e)
        if "out of memory" in err_msg.lower() or "oom" in err_msg.lower():
            fail("CUDA_OUT_OF_MEMORY", "GPU CUDA Out Of Memory! Please switch to a smaller model (2B/4B) or close other VRAM tasks.")
        else:
            fail("QWEN3VL_PROMPT_FAILED", f"Qwen3-VL Prompt Reverse worker exception occurred: {err_msg}")

if __name__ == "__main__":
    main()
