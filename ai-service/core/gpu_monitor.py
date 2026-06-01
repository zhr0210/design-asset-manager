import torch
import subprocess
import xml.etree.ElementTree as ET
import os

try:
    import pynvml
    NVML_AVAILABLE = True
except ImportError:
    NVML_AVAILABLE = False

def get_gpu_processes():
    """
    Retrieves a list of processes currently running on the GPU by parsing
    nvidia-smi XML output. Handled with process safeguards and timeout.
    """
    processes = []
    try:
        result = subprocess.run(
            ["nvidia-smi", "-q", "-x"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=2.0
        )
        if result.returncode == 0:
            root = ET.fromstring(result.stdout)
            for gpu in root.findall('gpu'):
                procs_el = gpu.find('processes')
                if procs_el is not None:
                    for proc in procs_el.findall('process_info'):
                        pid_el = proc.find('pid')
                        name_el = proc.find('process_name')
                        used_mem_el = proc.find('used_gpu_memory')
                        type_el = proc.find('type')
                        
                        pid = int(pid_el.text) if pid_el is not None and pid_el.text else None
                        name = name_el.text if name_el is not None and name_el.text else "Unknown Process"
                        used_mem = used_mem_el.text if used_mem_el is not None and used_mem_el.text else "N/A"
                        proc_type = type_el.text if type_el is not None and type_el.text else "C+G"
                        
                        if pid:
                            base_name = os.path.basename(name) if name != "None" else "System Process"
                            processes.append({
                                "pid": pid,
                                "name": base_name,
                                "full_path": name,
                                "used_memory": used_mem,
                                "type": proc_type
                            })
    except Exception as e:
        # Silently default to empty in case of missing command or formatting mismatch
        pass
    return processes

def get_gpu_status():
    """
    Returns active GPU status.
    Uses PyTorch's native cuda query first, falls back to NVML, and then reports
    an explicit unavailable state. Normal runtime must never invent GPU metrics.
    """
    # Fetch real-time active GPU processes
    processes = get_gpu_processes()

    # 1. Try PyTorch Native (100% accurate for active PyTorch workloads)
    if torch.cuda.is_available():
        try:
            device = 0
            free_bytes, total_bytes = torch.cuda.mem_get_info(device)
            device_name = torch.cuda.get_device_name(device)
            total_vram_mb = int(total_bytes / (1024 * 1024))
            free_vram_mb = int(free_bytes / (1024 * 1024))
            used_vram_mb = total_vram_mb - free_vram_mb
            utilization_percent = int((used_vram_mb / total_vram_mb) * 100) if total_vram_mb > 0 else 0
            
            return {
                "available": True,
                "is_mock": False,
                "device_name": device_name,
                "total_vram_mb": total_vram_mb,
                "used_vram_mb": used_vram_mb,
                "free_vram_mb": free_vram_mb,
                "utilization_percent": utilization_percent,
                "processes": processes
            }
        except Exception as e:
            pass

    # 2. Try NVML Fallback
    if NVML_AVAILABLE:
        try:
            pynvml.nvmlInit()
            device_count = pynvml.nvmlDeviceGetCount()
            if device_count > 0:
                handle = pynvml.nvmlDeviceGetHandleByIndex(0)
                name = pynvml.nvmlDeviceGetName(handle)
                if isinstance(name, bytes):
                    name = name.decode('utf-8')
                mem_info = pynvml.nvmlDeviceGetMemoryInfo(handle)
                
                return {
                    "available": True,
                    "is_mock": False,
                    "device_name": name,
                    "total_vram_mb": int(mem_info.total / 1024 / 1024),
                    "used_vram_mb": int(mem_info.used / 1024 / 1024),
                    "free_vram_mb": int(mem_info.free / 1024 / 1024),
                    "utilization_percent": int((mem_info.used / mem_info.total) * 100),
                    "processes": processes
                }
        except Exception as e:
            pass

    # 3. Explicit unavailable state. Do not fabricate device, process, or VRAM data.
    return {
        "available": False,
        "is_mock": False,
        "device_name": None,
        "total_vram_mb": 0,
        "used_vram_mb": 0,
        "free_vram_mb": 0,
        "utilization_percent": 0,
        "processes": processes,
        "error": "CUDA, NVML, and nvidia-smi are unavailable."
    }
