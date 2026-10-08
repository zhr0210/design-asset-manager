# Model Download Optimizer & Parallel Transfer Analysis

This document provides a comprehensive read-only investigation and proposal for enhancing the Hugging Face model downloading tools within the Design Asset Manager application.

---

## 1. Executive Summary
The current model downloading system uses two primary Python scripts located in `ai-service/tools/`:
1. `download_hf_model.py`: Downloads full Hugging Face repositories using `huggingface_hub`'s `snapshot_download` function.
2. `download_cooperative_hf_model.py`: Direct file downloader using Python's built-in `urllib` library, designed to download specific models like RAM++, Florence-2, CLIP, and WD Tagger.

### Core Problems Identified:
- **No Mirror Switching Support**: Both scripts default to using the global `huggingface.co` domain, which can cause connection failures, speed issues, and timeouts in restricted regions (such as China).
- **Lacking Parallel Single-File Downloading**: Large binaries (e.g., Florence-2 `model.safetensors` of ~1.5 GB, RAM++ weights of ~1 GB, and Qwen3-VL/GGUFs of multiple GBs) are downloaded in a single thread, leading to slow transfer speeds.
- **No Native Resume-on-Failure in urllib**: In `download_cooperative_hf_model.py`, downloads are loaded entirely into RAM before saving. If a connection is interrupted, the download fails, wastes progress, and might result in corrupted files or Out-Of-Memory (OOM) crashes on low-spec host machines.
- **Lack of Progress Granularity**: The `urllib` wrapper does not stream incremental chunk-level progress events to stdout, making the Electron UI display coarse steps (0% and 50% jumps) rather than a smooth progress bar.

### Core Proposals:
1. **Universal Mirror Switcher**: Parse a `--mirror` CLI argument and read the `HF_ENDPOINT` environment variable in both scripts. Automatically rewrite domain endpoints to use `https://hf-mirror.com` (or other config) dynamically.
2. **Resume-on-Failure Engine**: Implement HTTP Range request queries (`Range: bytes=X-`) and write to temporary `{filename}.part` files in chunks of 64KB, validating existing byte sizes before resuming.
3. **Multi-Channel Parallel Downloader**: Implement segment-based parallel downloads (e.g., 4 channels) using a ThreadPoolExecutor. Each channel downloads a distinct range block to a `{filename}.part.i` file, which is then concatenated upon verification.

---

## 2. Current State Assessment

### 2.1. `download_hf_model.py` (Hugging Face Hub Wrapper)
- **Mechanism**: Calls `snapshot_download` from the `huggingface_hub` package.
- **TLS 1.2 Enforced**: Patches `urllib3.PoolManager` to force TLS 1.2 to avoid handshake failures on macOS with LibreSSL.
- **Filters**: Configured to ignore GGUF/ONNX/msgpack formats and allow JSON/safetensors/model files.
- **Resuming**: Employs `resume_download=True` natively within `snapshot_download`.
- **Parallelism**: Sequential download per-file. Cannot split a single large file into multi-channel range connections.

### 2.2. `download_cooperative_hf_model.py` (Urllib Wrapper)
- **Mechanism**: Iterates over hardcoded file list tuples in `COOPERATIVE_FILES`, downloading via `urllib.request.urlopen` with `ssl.CERT_NONE` and custom TLS 1.2 maximum version constraints.
- **Memory Overhead**:
  ```python
  data = resp.read()
  # ...
  dest.write_bytes(data)
  ```
  This loads the entire file binary into Python's heap memory. This is highly unsafe for files >1GB.
- **Resuming**: No resume support. The `validate_file` helper simply unlinks the existing file if it fails standard checks, starting the transfer from scratch on every run.
- **Parallelism**: Sequential download of files. Single thread per file, single connection per file.

---

## 3. Enhancement Design

### 3.1. Dynamic Mirror Site Switching
To allow switching from `huggingface.co` to `hf-mirror.com` or custom mirror services:

#### For `download_hf_model.py`:
We can hook into the standard Hugging Face Hub environment configuration. Hugging Face library reads `HF_ENDPOINT` during initialization.
```python
# Set endpoint environment variable prior to importing huggingface_hub
import os, argparse
parser = argparse.ArgumentParser()
parser.add_argument("--mirror", default=os.environ.get("HF_ENDPOINT", "https://huggingface.co"))
args, _ = parser.parse_known_args()

os.environ["HF_ENDPOINT"] = args.mirror
from huggingface_hub import snapshot_download
```

#### For `download_cooperative_hf_model.py`:
Rewrite URLs dynamically by replacing the default Hugging Face resolve host:
```python
def get_resolve_url(repo_id: str, filename: str, mirror: str = None) -> str:
    base_url = mirror or os.environ.get("HF_ENDPOINT") or "https://huggingface.co"
    base_url = base_url.rstrip("/")
    return f"{base_url}/{repo_id}/resolve/main/{filename}"
```

### 3.2. Resume-on-Failure & Safe Streaming (urllib)
To prevent OOM errors and support resuming, files must be downloaded in chunks and appended to a `.part` file.

```python
def download_file_stream(url: str, dest: Path, ctx: ssl.SSLContext, token: str = None) -> bool:
    temp_path = dest.parent / f"{dest.name}.part"
    downloaded_bytes = 0
    
    # Read size of already completed chunk
    if temp_path.exists():
        downloaded_bytes = temp_path.stat().st_size
        
    req = urllib.request.Request(url)
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    if downloaded_bytes > 0:
        # Request only the rest of the file
        req.add_header("Range", f"bytes={downloaded_bytes}-")
        
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=60) as resp:
            # Check response status
            if resp.status == 206:
                mode = "ab" # Append mode for partial response
            else:
                mode = "wb" # Start fresh if server ignores range or returns 200
                downloaded_bytes = 0
                
            content_len = resp.headers.get("Content-Length")
            total_bytes = int(content_len) + downloaded_bytes if content_len else None
            
            with open(temp_path, mode) as f:
                while True:
                    chunk = resp.read(64 * 1024) # 64KB buffer
                    if not chunk:
                        break
                    f.write(chunk)
                    downloaded_bytes += len(chunk)
                    
                    # Smooth progress callback
                    if total_bytes:
                        percent = int((downloaded_bytes / total_bytes) * 100)
                        emit({"type": "progress", "progress": percent, 
                              "message": f"Downloading {dest.name}: {downloaded_bytes/1e6:.1f}/{total_bytes/1e6:.1f} MB ({percent}%)"})
            
        # Move temp to final target
        if temp_path.exists():
            temp_path.rename(dest)
        return True
    except Exception as e:
        emit({"type": "progress", "progress": 0, "message": f"Error during download of {dest.name}: {e}"})
        return False
```

### 3.3. Multi-Channel Segmented Parallel Downloader
For large binary weights, splitting the file into multiple ranges and downloading them concurrently increases link utilization.

```python
import concurrent.futures
import threading

def download_range_segment(url: str, segment_path: Path, start: int, end: int, ctx: ssl.SSLContext, token: str, progress_cb) -> bool:
    downloaded = 0
    if segment_path.exists():
        downloaded = segment_path.stat().st_size
        
    current_start = start + downloaded
    if current_start > end:
        return True # Segment already fully downloaded
        
    req = urllib.request.Request(url)
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    req.add_header("Range", f"bytes={current_start}-{end}")
    
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=60) as resp:
            if resp.status not in (200, 206):
                return False
            with open(segment_path, "ab" if downloaded > 0 else "wb") as f:
                while True:
                    chunk = resp.read(128 * 1024) # 128KB buffer
                    if not chunk:
                        break
                    f.write(chunk)
                    progress_cb(len(chunk))
        return True
    except Exception:
        return False

def download_file_parallel(url: str, dest: Path, ctx: ssl.SSLContext, num_channels: int = 4, token: str = None) -> bool:
    # 1. Fetch file size and Range capabilities
    req = urllib.request.Request(url, method="HEAD")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
        
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=20) as resp:
            total_size = int(resp.headers.get("Content-Length", 0))
            accept_ranges = resp.headers.get("Accept-Ranges") == "bytes" or resp.status == 206
    except Exception:
        # Fallback to single thread stream
        return download_file_stream(url, dest, ctx, token)
        
    # If file is too small (<15MB) or ranges are not accepted, fall back to sequential download
    if total_size < 15 * 1024 * 1024 or not accept_ranges:
        return download_file_stream(url, dest, ctx, token)
        
    # 2. Divide range blocks
    block_size = total_size // num_channels
    ranges = []
    for i in range(num_channels):
        start = i * block_size
        end = total_size - 1 if i == num_channels - 1 else (i + 1) * block_size - 1
        ranges.append((start, end))
        
    segment_files = [dest.parent / f"{dest.name}.part.{i}" for i in range(num_channels)]
    
    # Track overall progress
    downloaded_total = sum(f.stat().st_size for f in segment_files if f.exists())
    progress_lock = threading.Lock()
    
    def on_chunk_downloaded(bytes_len):
        nonlocal downloaded_total
        with progress_lock:
            downloaded_total += bytes_len
            percent = int((downloaded_total / total_size) * 100)
            emit({"type": "progress", "progress": percent,
                  "message": f"Downloading {dest.name}: {downloaded_total/1e6:.1f}/{total_size/1e6:.1f} MB ({percent}%)"})

    # 3. Thread Pool Download
    dest.parent.mkdir(parents=True, exist_ok=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=num_channels) as executor:
        futures = []
        for i, (start, end) in enumerate(ranges):
            futures.append(executor.submit(
                download_range_segment, url, segment_files[i], start, end, ctx, token, on_chunk_downloaded
            ))
        results = [fut.result() for fut in futures]
        
    # 4. Concatenate and clean up segments
    if all(results):
        try:
            with open(dest, "wb") as outfile:
                for seg_path in segment_files:
                    with open(seg_path, "rb") as infile:
                        while True:
                            buf = infile.read(4 * 1024 * 1024) # 4MB chunk merge
                            if not buf:
                                break
                            outfile.write(buf)
                    seg_path.unlink() # Delete partition file
            return True
        except Exception as e:
            emit({"type": "progress", "progress": 0, "message": f"Error merging segments for {dest.name}: {e}"})
            return False
    else:
        emit({"type": "progress", "progress": 0, "message": f"Failed to download some segments for {dest.name}."})
        return False
```

---

## 4. Specific Model Family Strategies

### 4.1. RAM++ (recognize-anything-plus-model)
- **Structure**: Uses PyTorch checkpoint weights (`ram_plus_swin_large_14m.pth`, ~1 GB).
- **Strategy**: This is a single, large, high-bandwidth binary weight.
- **Handling**: Directly downloaded via `download_file_parallel` with `num_channels=4`.

### 4.2. Florence-2 (Florence-2-large)
- **Structure**: Hugging Face repository containing config files (`config.json`, `tokenizer.json`, `generation_config.json`, etc.) and a large binary weight (`model.safetensors`, ~1.5 GB).
- **Strategy**:
  - Small text configs: Downloaded sequentially using standard HTTP streaming to minimize connection overhead.
  - Large binary (`model.safetensors`): Downloaded in parallel utilizing `download_file_parallel` to split the file.
- **Overall progress**: Thread-safe tracker tracks total progress of all files within the cooperative downloader structure.

### 4.3. CLIP/SigLIP ONNX Models
- **Structure**: ONNX runtime models (`model.onnx` or `.safetensors`, ~800 MB).
- **Strategy**: Uses `download_file_parallel` for `model.onnx` and `model.safetensors` weight components.

### 4.4. GGUF Models
- **Structure**: Large quantizations (`.gguf` files of 1GB to 4GB+).
- **Strategy**: Currently, GGUFs are partially managed via the Node-based installer or via manual command scripts. When using the Python downloaders, GGUF files should be split into 4–8 connections using `download_file_parallel`.
- **Aria2 Sidecar Coexistence**: The local model scanner checking GGUF files verifies completeness by confirming that no `.aria2` or `.part` files are co-located with the model file. Thus, using `.part` (or `.part.[0-3]`) filenames during transfer prevents the Electron main process from misinterpreting a downloading model as a fully installed one.

---

## 5. Execution Integration

### Patching Electron main side (`src/main/ipc/cooperative-model.ipc.ts`)
To configure mirrors and parallel settings, Electron can supply extra command line flags:
```typescript
const settings = SettingsService.getInstance().getSettings()
const mirror = settings.downloadSource === 'hf-mirror' ? 'https://hf-mirror.com' : 'https://huggingface.co'
const args = [
  '--repo-id', model.repoId,
  '--local-dir', localDir,
  '--category', model.category,
  '--mirror', mirror,
  '--channels', '4'
]
```
This guarantees alignment between Electron settings (such as the mirror toggle) and the underlying Python worker tool.
