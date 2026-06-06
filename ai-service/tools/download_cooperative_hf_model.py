"""Download cooperative AI models from Hugging Face via urllib with TLS 1.2.

Uses urllib.request with a custom SSLContext to avoid LibreSSL 2.8.3
TLS 1.3 handshake failures with proxy servers.

Streams JSON progress events to stdout.
"""
import argparse, json, os, ssl, sys, time, urllib.request, concurrent.futures
from pathlib import Path
from typing import Optional

HF_RESOLVE = "https://huggingface.co/{repo_id}/resolve/main/{filename}"

# Expected minimum file sizes in bytes (validated after download to detect corruption)
EXPECTED_SIZES: dict[str, int] = {
    "model.onnx": 780_000_000,  # WD Tagger model.onnx ~800 MB
    "model.safetensors": 500_000_000,  # CLIP/Florence safetensors
}

COOPERATIVE_FILES = {
    "ram": [
        ("xinyu1205/recognize-anything-plus-model", "ram_plus_swin_large_14m.pth"),
    ],
    "florence2": [
        ("microsoft/Florence-2-large", "model.safetensors"),
        ("microsoft/Florence-2-large", "config.json"),
        ("microsoft/Florence-2-large", "tokenizer.json"),
        ("microsoft/Florence-2-large", "tokenizer_config.json"),
        ("microsoft/Florence-2-large", "preprocessor_config.json"),
        ("microsoft/Florence-2-large", "generation_config.json"),
    ],
    "clip": [
        ("laion/CLIP-ViT-B-32-laion2B-s34B-b79K", "model.safetensors"),
        ("laion/CLIP-ViT-B-32-laion2B-s34B-b79K", "config.json"),
        ("laion/CLIP-ViT-B-32-laion2B-s34B-b79K", "tokenizer.json"),
        ("laion/CLIP-ViT-B-32-laion2B-s34B-b79K", "tokenizer_config.json"),
        ("laion/CLIP-ViT-B-32-laion2B-s34B-b79K", "preprocessor_config.json"),
        ("laion/CLIP-ViT-B-32-laion2B-s34B-b79K", "vocab.json"),
        ("laion/CLIP-ViT-B-32-laion2B-s34B-b79K", "merges.txt"),
        ("laion/CLIP-ViT-B-32-laion2B-s34B-b79K", "special_tokens_map.json"),
    ],
    "wd_tagger": [
        ("SmilingWolf/wd-vit-tagger-v3", "model.onnx"),
        ("SmilingWolf/wd-vit-tagger-v3", "selected_tags.csv"),
    ],
}

FAMILY_DIRS = {
    "ram": "xinyu1205/ram-plus",
    "florence2": "microsoft/florence-2-large",
    "clip": "laion/clip-vit-b-32",
    "wd_tagger": "SmilingWolf/wd-vit-tagger-v3",
}

COOP_ROOT = Path.home() / "Library/Application Support/design-asset-manager/AIModels/cooperative"


def emit(event: dict) -> None:
    print(json.dumps(event, ensure_ascii=False), flush=True)


def create_ssl_context() -> ssl.SSLContext:
    ctx = ssl.create_default_context()
    ctx.maximum_version = ssl.TLSVersion.TLSv1_2
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx


def validate_file(dest: Path, filename: str) -> bool:
    """Check whether an existing file is valid. Returns True if ok, False if needs re-download."""
    if not dest.exists():
        return False
    actual_size = dest.stat().st_size
    # Check against expected minimum size
    expected_min = EXPECTED_SIZES.get(filename)
    if expected_min is not None and actual_size < expected_min:
        emit({"type": "progress", "progress": 0,
              "message": f"{filename} is {actual_size/1e6:.0f}MB (expected >={expected_min/1e6:.0f}MB) — re-downloading"})
        dest.unlink(missing_ok=True)
        return False
    # Check that the file is not empty or clearly truncated
    if actual_size < 100:
        emit({"type": "progress", "progress": 0,
              "message": f"{filename} is only {actual_size} bytes — re-downloading"})
        dest.unlink(missing_ok=True)
        return False
    if filename.endswith(".json"):
        try:
            with open(dest, "r", encoding="utf-8") as f:
                json.load(f)
        except Exception as e:
            emit({"type": "progress", "progress": 0,
                  "message": f"{filename} is corrupted JSON ({e}) — re-downloading"})
            dest.unlink(missing_ok=True)
            return False
    return True


def check_range_support(url: str, ctx: ssl.SSLContext) -> tuple[bool, Optional[int]]:
    """Sends a HEAD request to check range request support and retrieve total content length."""
    try:
        req = urllib.request.Request(url, method="HEAD")
        content_length = None
        with urllib.request.urlopen(req, context=ctx, timeout=15) as resp:
            accept_ranges = resp.headers.get("Accept-Ranges")
            cl = resp.headers.get("Content-Length")
            if cl:
                content_length = int(cl)
            if accept_ranges == "bytes":
                return True, content_length

        # Double check with a tiny range request
        range_req = urllib.request.Request(url, headers={"Range": "bytes=0-0"})
        with urllib.request.urlopen(range_req, context=ctx, timeout=15) as resp:
            if resp.status == 206:
                return True, content_length
    except Exception:
        pass
    return False, None


def commit_download_part(part_path: Path, dest: Path) -> None:
    """Atomically publish a completed .part file, replacing invalid targets on Windows."""
    part_path.replace(dest)


def download_segment(url: str, dest: Path, num_channels: int, index: int, start: int, end: int, ctx: ssl.SSLContext) -> bool:
    segment_path = dest.parent / f"{dest.name}.part.{num_channels}.{index}.{start}_{end}"
    chunk_size = end - start + 1

    existing_bytes = 0
    if segment_path.exists():
        existing_bytes = segment_path.stat().st_size

    if existing_bytes >= chunk_size:
        return True

    req_start = start + existing_bytes
    if req_start > end:
        return True

    for attempt in range(3):
        try:
            headers = {"Range": f"bytes={req_start}-{end}"}
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, context=ctx, timeout=45) as resp:
                if resp.status != 206:
                    return False

                mode = "ab" if existing_bytes > 0 else "wb"
                with open(segment_path, mode) as f:
                    while True:
                        chunk = resp.read(64 * 1024)
                        if not chunk:
                            break
                        f.write(chunk)

                if segment_path.stat().st_size >= chunk_size:
                    return True
        except Exception as e:
            time.sleep(1)
            if segment_path.exists():
                existing_bytes = segment_path.stat().st_size
            else:
                existing_bytes = 0
            req_start = start + existing_bytes

    return segment_path.exists() and segment_path.stat().st_size >= chunk_size


def download_parallel(url: str, dest: Path, total_size: int, num_channels: int, ctx: ssl.SSLContext) -> bool:
    dest.parent.mkdir(parents=True, exist_ok=True)
    chunk_size = (total_size + num_channels - 1) // num_channels

    segments = []
    for i in range(num_channels):
        start = i * chunk_size
        end = min((i + 1) * chunk_size - 1, total_size - 1)
        if start <= end:
            segments.append((i, start, end))

    with concurrent.futures.ThreadPoolExecutor(max_workers=num_channels) as executor:
        futures = {
            executor.submit(download_segment, url, dest, num_channels, idx, start, end, ctx): idx
            for idx, start, end in segments
        }

        results = {}
        for future in concurrent.futures.as_completed(futures):
            idx = futures[future]
            try:
                results[idx] = future.result()
            except Exception as e:
                results[idx] = False
                emit({"type": "progress", "progress": 0, "message": f"Segment {idx} failed: {e}"})

    all_ok = all(results.get(idx, False) for idx, _, _ in segments)
    if not all_ok:
        return False

    part_path = dest.parent / f"{dest.name}.part"
    try:
        with open(part_path, "wb") as outfile:
            for idx, start, end in segments:
                segment_path = dest.parent / f"{dest.name}.part.{num_channels}.{idx}.{start}_{end}"
                with open(segment_path, "rb") as infile:
                    while True:
                        chunk = infile.read(1024 * 1024)
                        if not chunk:
                            break
                        outfile.write(chunk)

        for idx, start, end in segments:
            (dest.parent / f"{dest.name}.part.{num_channels}.{idx}.{start}_{end}").unlink(missing_ok=True)

        commit_download_part(part_path, dest)
        return True
    except Exception as e:
        emit({"type": "progress", "progress": 0, "message": f"Error merging segments: {e}"})
        part_path.unlink(missing_ok=True)
        return False


def download_stream_single(url: str, dest: Path, ctx: ssl.SSLContext, expected_size: Optional[int] = None) -> bool:
    part_path = dest.parent / f"{dest.name}.part"
    dest.parent.mkdir(parents=True, exist_ok=True)

    existing_bytes = 0
    if part_path.exists():
        existing_bytes = part_path.stat().st_size

    if expected_size and existing_bytes >= expected_size:
        commit_download_part(part_path, dest)
        return True

    headers = {}
    if existing_bytes > 0:
        headers["Range"] = f"bytes={existing_bytes}-"
        mode = "ab"
    else:
        mode = "wb"

    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, context=ctx, timeout=60) as resp:
            if existing_bytes > 0 and resp.status != 206:
                mode = "wb"
                existing_bytes = 0

            with open(part_path, mode) as f:
                while True:
                    chunk = resp.read(64 * 1024)
                    if not chunk:
                        break
                    f.write(chunk)

            actual_size = part_path.stat().st_size
            if expected_size and actual_size < expected_size:
                raise ValueError(f"Truncated download: got {actual_size} bytes, expected {expected_size}")

            commit_download_part(part_path, dest)
            return True
    except Exception as e:
        emit({"type": "progress", "progress": 0, "message": f"Error in stream download: {e}"})
        return False


def download_file(repo_id: str, filename: str, dest: Path, ctx: ssl.SSLContext, num_channels: int = 4) -> bool:
    """Download a single file from Hugging Face. Returns True on success."""
    url = HF_RESOLVE.format(repo_id=repo_id, filename=filename)
    dest.parent.mkdir(parents=True, exist_ok=True)

    # Check if file already exists and is complete
    if validate_file(dest, filename):
        size_mb = dest.stat().st_size / (1024 * 1024)
        emit({"type": "progress", "progress": 0, "message": f"Skipping {filename} ({size_mb:.1f} MB, exists)"})
        return True

    is_range_supported, total_size = check_range_support(url, ctx)
    if total_size is None:
        try:
            req = urllib.request.Request(url, method="HEAD")
            with urllib.request.urlopen(req, context=ctx, timeout=15) as resp:
                cl = resp.headers.get("Content-Length")
                if cl:
                    total_size = int(cl)
        except Exception:
            pass

    if is_range_supported and total_size and total_size > 15 * 1024 * 1024:
        emit({"type": "progress", "progress": 0, "message": f"Starting parallel download for {filename} ({total_size / 1e6:.1f} MB) using {num_channels} channels"})
        success = download_parallel(url, dest, total_size, num_channels, ctx)
        if success:
            size_mb = dest.stat().st_size / (1024 * 1024)
            emit({"type": "progress", "progress": 50, "message": f"Downloaded {filename} ({size_mb:.1f} MB)"})
            return True
        else:
            emit({"type": "progress", "progress": 0, "message": f"Parallel download failed for {filename}, falling back to single-channel streaming"})

    for attempt in range(3):
        success = download_stream_single(url, dest, ctx, total_size)
        if success:
            size_mb = dest.stat().st_size / (1024 * 1024)
            emit({"type": "progress", "progress": 50, "message": f"Downloaded {filename} ({size_mb:.1f} MB)"})
            return True
        time.sleep(2 ** attempt)
        emit({"type": "progress", "progress": 0, "message": f"Retry {attempt+1} for {filename}"})

    emit({"type": "error", "message": f"Failed to download {filename} after 3 attempts"})
    return False


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-id", required=True)
    parser.add_argument("--local-dir", required=True)
    parser.add_argument("--category", default="transformers",
                        choices=["transformers", "pth", "onnx-csv", "gguf"])
    parser.add_argument("--revision", default=None)
    parser.add_argument("--token", default=None)
    parser.add_argument("--model-family", default=None,
                        choices=["ram", "florence2", "clip", "wd_tagger"])
    parser.add_argument("--all", action="store_true",
                        help="Download all cooperative models")
    parser.add_argument("--mirror", default=None, help="Hugging Face mirror domain")
    parser.add_argument("--parallel", type=int, default=4, help="Number of parallel download channels")
    parser.add_argument("--threads", type=int, default=None, help="Number of parallel download channels (alias for parallel)")
    args = parser.parse_args()

    global HF_RESOLVE
    if args.mirror:
        mirror_domain = args.mirror
        if not mirror_domain.startswith("http://") and not mirror_domain.startswith("https://"):
            mirror_domain = "https://" + mirror_domain
        HF_RESOLVE = HF_RESOLVE.replace("https://huggingface.co", mirror_domain)

    num_channels = args.threads if args.threads is not None else args.parallel

    local_dir = Path(args.local_dir).expanduser().resolve()
    ctx = create_ssl_context()

    if args.all:
        emit({"type": "start", "success": True,
              "message": "Downloading all cooperative models"})
        for family, files in COOPERATIVE_FILES.items():
            family_dir = COOP_ROOT / FAMILY_DIRS[family]
            emit({"type": "progress", "progress": 0,
                  "message": f"=== {family} ({len(files)} files) ==="})
            for repo_id, filename in files:
                dest = family_dir / filename
                if not download_file(repo_id, filename, dest, ctx, num_channels=num_channels):
                    emit({"type": "error",
                          "message": f"Failed: {family}/{filename}"})
        emit({"type": "complete", "success": True,
              "message": "All cooperative model downloads attempted"})
        return

    if args.model_family and args.model_family in COOPERATIVE_FILES:
        family_dir = COOP_ROOT / FAMILY_DIRS[args.model_family]
        emit({"type": "start", "success": True, "repoId": args.repo_id})
        files = COOPERATIVE_FILES[args.model_family]
        for repo_id, filename in files:
            dest = family_dir / filename
            download_file(repo_id, filename, dest, ctx, num_channels=num_channels)
        emit({"type": "complete", "success": True, "repoId": args.repo_id})
        return

    # Legacy single-model per-category mode
    emit({"type": "start", "success": True, "repoId": args.repo_id,
          "category": args.category, "timestamp": time.time()})

    repo_id = args.repo_id
    category = args.category
    local_dir.mkdir(parents=True, exist_ok=True)

    if category == "onnx-csv":
        for filename in ["model.onnx", "selected_tags.csv"]:
            dest = local_dir / filename
            download_file(repo_id, filename, dest, ctx, num_channels=num_channels)
    elif category == "pth":
        filename = "ram_plus_swin_large_14m.pth"
        dest = local_dir / filename
        download_file(repo_id, filename, dest, ctx, num_channels=num_channels)
    elif category == "gguf":
        emit({"type": "progress", "progress": 0,
              "message": f"GGUF mode - downloading from {repo_id}"})
        emit({"type": "complete", "success": True, "repoId": repo_id})
        return
    else:
        # transformers: download all safetensors + configs
        for filename in ["model.safetensors", "config.json", "tokenizer.json",
                          "tokenizer_config.json", "preprocessor_config.json",
                          "generation_config.json", "vocab.json", "merges.txt",
                          "special_tokens_map.json"]:
            dest = local_dir / filename
            download_file(repo_id, filename, dest, ctx, num_channels=num_channels)

    emit({"type": "complete", "success": True, "repoId": args.repo_id})


if __name__ == "__main__":
    main()
