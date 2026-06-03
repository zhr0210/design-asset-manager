# Platform-Specific AI Runtime Branches

Windows and macOS use different practical AI ecosystems, so Design Asset Manager treats them as separate AI runtime branches behind shared product workflows. Windows keeps the existing CUDA AI Worker main chain while moving Qwen3-VL large visual inference to quantized model services; macOS will use Python MPS, ONNX Runtime, llama.app / llama.cpp Metal, and MLX instead of forcing all AI models through Python MPS.
