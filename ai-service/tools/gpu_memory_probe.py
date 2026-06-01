import json
import sys
import subprocess

def main():
    res = {
        "success": True,
        "cudaAvailable": False,
        "gpuName": None,
        "totalVramGB": 0.0,
        "freeVramGB": 0.0,
        "usedVramGB": 0.0,
        "usagePercent": 0.0,
        "torch": None,
        "error": None
    }

    try:
        import torch
        res["cudaAvailable"] = torch.cuda.is_available()
        if res["cudaAvailable"]:
            res["gpuName"] = torch.cuda.get_device_name(0)
            res["torch"] = {
                "allocatedGB": round(torch.cuda.memory_allocated(0) / 1024**3, 2),
                "reservedGB": round(torch.cuda.memory_reserved(0) / 1024**3, 2)
            }
    except Exception as e:
        res["error"] = f"Torch initialization warning: {str(e)}"

    # Query nvidia-smi for overall system levels
    try:
        cmd = ["nvidia-smi", "--query-gpu=name,memory.total,memory.used,memory.free", "--format=csv,noheader,nounits"]
        output = subprocess.check_output(cmd, encoding="utf-8").strip()
        parts = [p.strip() for p in output.split(",")]
        if len(parts) >= 4:
            res["gpuName"] = parts[0]
            res["totalVramGB"] = round(float(parts[1]) / 1024, 2)
            res["usedVramGB"] = round(float(parts[2]) / 1024, 2)
            res["freeVramGB"] = round(float(parts[3]) / 1024, 2)
            res["usagePercent"] = round((res["usedVramGB"] / res["totalVramGB"]) * 100, 2)
    except Exception:
        # Fallback to PyTorch details if nvidia-smi is unavailable
        if res["cudaAvailable"]:
            total_mem = torch.cuda.get_device_properties(0).total_memory
            res["totalVramGB"] = round(total_mem / 1024**3, 2)
            # Torch can only estimate what it allocates/reserves, mock system levels
            res["usedVramGB"] = res["torch"]["reservedGB"]
            res["freeVramGB"] = round(res["totalVramGB"] - res["usedVramGB"], 2)
            res["usagePercent"] = round((res["usedVramGB"] / res["totalVramGB"]) * 100, 2)
        else:
            res["success"] = False
            res["error"] = "CUDA and nvidia-smi are both unavailable."

    print(json.dumps(res, ensure_ascii=False))

if __name__ == "__main__":
    main()
