import json
import sys
import gc

def get_torch_memory():
    try:
        import torch
        if torch.cuda.is_available():
            total_mem = torch.cuda.get_device_properties(0).total_memory
            reserved = torch.cuda.memory_reserved(0)
            return {
                "allocatedGB": round(torch.cuda.memory_allocated(0) / 1024**3, 2),
                "reservedGB": round(reserved, 2),
                "freeGB": round((total_mem - reserved) / 1024**3, 2),
                "totalGB": round(total_mem / 1024**3, 2)
            }
    except Exception:
        pass
    return None

def main():
    res = {
        "success": True,
        "before": get_torch_memory(),
        "after": None,
        "error": None
    }

    try:
        import torch
        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            torch.cuda.ipc_collect()
        res["after"] = get_torch_memory()
    except Exception as e:
        res["success"] = False
        res["error"] = {"code": "CLEAR_GPU_MEMORY_FAILED", "message": str(e)}

    print(json.dumps(res, ensure_ascii=False))

if __name__ == "__main__":
    main()
