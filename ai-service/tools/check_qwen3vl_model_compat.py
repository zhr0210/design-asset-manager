import sys
import os
import json

def emit(payload):
    print(json.dumps(payload, ensure_ascii=False), flush=True)

def main():
    # Enforce UTF-8 to prevent CP936 decoding errors on Windows
    if hasattr(sys.stdin, "reconfigure"):
        sys.stdin.reconfigure(encoding="utf-8", errors="replace")
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")

    # Read config input from stdin
    try:
        input_data = json.loads(sys.stdin.read().strip())
    except Exception as e:
        emit({
            "success": False,
            "compatible": False,
            "error": {"code": "INPUT_PARSE_FAILED", "message": f"解析输入失败: {str(e)}"}
        })
        sys.exit(1)

    model_path = input_data.get("modelPath")
    model_id = input_data.get("modelId")
    quantization = input_data.get("quantization", "none")

    diagnostics = {
        "torchVersion": "unknown",
        "transformersVersion": "unknown",
        "cudaAvailable": False,
        "gpuName": None,
        "totalVramGB": 0,
        "requiredPackages": [],
        "missingPackages": []
    }

    # 1. Inspect package environment
    try:
        import torch
        import transformers
        diagnostics["torchVersion"] = torch.__version__
        diagnostics["transformersVersion"] = transformers.__version__
        diagnostics["cudaAvailable"] = torch.cuda.is_available()
        if diagnostics["cudaAvailable"]:
            diagnostics["gpuName"] = torch.cuda.get_device_name(0)
            diagnostics["totalVramGB"] = round(torch.cuda.get_device_properties(0).total_memory / 1024**3, 2)
    except Exception as e:
        emit({
            "success": False,
            "compatible": False,
            "diagnostics": diagnostics,
            "error": {"code": "ENVIRONMENT_INSUFFICIENT", "message": f"Python 依赖环境不完整: {str(e)}"}
        })
        sys.exit(0)

    # 2. Inspect transformers support for Qwen2.5-VL / Qwen3-VL
    # Note: Qwen3-VL uses Qwen2_5_VL structure in transformers.
    try:
        from transformers import Qwen2_5_VLForConditionalGeneration
    except ImportError:
        emit({
            "success": False,
            "compatible": False,
            "diagnostics": diagnostics,
            "error": {
                "code": "TRANSFORMERS_VERSION_OUTDATED",
                "message": "当前 Transformers 版本过低，不支持 Qwen3-VL/Qwen2.5-VL 结构。请在终端执行 'pip install --upgrade transformers' 后重试。"
            }
        })
        sys.exit(0)

    # 3. Handle quantization package requirements (compressed-tensors for AWQ)
    if "awq" in quantization:
        diagnostics["requiredPackages"] = ["compressed_tensors"]
        try:
            import compressed_tensors
        except ImportError:
            diagnostics["missingPackages"] = ["compressed-tensors"]
            emit({
                "success": False,
                "compatible": False,
                "diagnostics": diagnostics,
                "error": {
                    "code": "COMPRESSED_TENSORS_MISSING",
                    "message": "当前 Python 环境缺少 AWQ 量化加载所需的依赖包 'compressed-tensors'。请在终端运行 'pip install compressed-tensors' 补全依赖，或在设置中改用 Qwen3-VL 4B 稳定版 / 8B 原版。"
                }
            })
            sys.exit(0)

    # 4. Check model configuration directory sanity
    if not model_path or not os.path.exists(model_path):
        emit({
            "success": False,
            "compatible": False,
            "diagnostics": diagnostics,
            "error": {"code": "MODEL_PATH_NOT_FOUND", "message": f"本地模型文件夹不存在: {model_path}。"}
        })
        sys.exit(0)

    config_json_path = os.path.join(model_path, "config.json")
    if not os.path.exists(config_json_path):
        emit({
            "success": False,
            "compatible": False,
            "diagnostics": diagnostics,
            "error": {"code": "CONFIG_JSON_MISSING", "message": "缺失关键配置文件 config.json。"}
        })
        sys.exit(0)

    # Validate & self-heal quantization config ignore markers inside config.json
    try:
        config_modified = False
        with open(config_json_path, "r", encoding="utf-8") as f:
            config_data = json.load(f)
            q_conf = config_data.get("quantization_config")
            
            # Prevent loading quantized models as unquantized
            if quantization == "none" and q_conf:
                emit({
                    "success": False,
                    "compatible": False,
                    "diagnostics": diagnostics,
                    "error": {
                        "code": "MODEL_MISMATCH",
                        "message": "配置冲突！该模型文件夹中包含量化标记(quantization_config)，不可作为原版(none)加载。请修改设置中的模型分类。"
                    }
                })
                sys.exit(0)
                
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
                    with open(config_json_path, "w", encoding="utf-8") as f:
                        json.dump(config_data, f, indent=2, ensure_ascii=False)
    except Exception as e:
        emit({
            "success": False,
            "compatible": False,
            "diagnostics": diagnostics,
            "error": {"code": "CONFIG_READ_FAILED", "message": f"读取/自愈 config.json 失败: {str(e)}"}
        })
        sys.exit(0)

    # Successful pre-flight verification
    emit({
        "success": True,
        "compatible": True,
        "modelId": model_id,
        "quantization": quantization,
        "runtime": "transformers",
        "diagnostics": diagnostics,
        "error": None
    })

if __name__ == "__main__":
    main()
