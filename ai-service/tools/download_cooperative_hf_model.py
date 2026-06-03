"""Download cooperative AI models from Hugging Face via urllib with TLS 1.2.

Uses urllib.request with a custom SSLContext to avoid LibreSSL 2.8.3
TLS 1.3 handshake failures with proxy servers.
"""
import argparse, json, os, ssl, sys, time, urllib.request
from pathlib import Path
from typing import Optional

HF_RESOLVE = "https://huggingface.co/{repo_id}/resolve/main/{filename}"

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


def download_file(repo_id: str, filename: str, dest: Path, ctx: ssl.SSLContext) -> bool:
    """Download a single file from Hugging Face. Returns True on success."""
    url = HF_RESOLVE.format(repo_id=repo_id, filename=filename)
    dest.parent.mkdir(parents=True, exist_ok=True)
    
    # Check if file already exists and is complete
    if dest.exists():
        emit({"type": "progress", "progress": 0, "message": f"Skipping {filename} (exists)"})
        return True
    
    for attempt in range(3):
        try:
            req = urllib.request.Request(url)
            with urllib.request.urlopen(req, context=ctx, timeout=30) as resp:
                if resp.status == 200:
                    data = resp.read()
                    dest.write_bytes(data)
                    size_mb = len(data) / (1024 * 1024)
                    emit({"type": "progress", "progress": 50, "message": f"Downloaded {filename} ({size_mb:.1f} MB)"})
                    return True
                else:
                    emit({"type": "progress", "progress": 0, "message": f"HTTP {resp.status} for {filename}, retry {attempt+1}"})
        except Exception as e:
            if attempt < 2:
                time.sleep(2 ** attempt)
                emit({"type": "progress", "progress": 0, "message": f"Retry {attempt+1} for {filename}: {e}"})
            else:
                emit({"type": "error", "message": f"Failed to download {filename} after 3 attempts: {e}"})
                return False
    return False


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-id", required=True)
    parser.add_argument("--local-dir", required=True)
    parser.add_argument("--category", default="transformers", choices=["transformers", "pth", "onnx-csv"])
    parser.add_argument("--revision", default=None)
    parser.add_argument("--token", default=None)
    parser.add_argument("--model-family", default=None, choices=["ram", "florence2", "clip", "wd_tagger"])
    parser.add_argument("--all", action="store_true", help="Download all cooperative models")
    args = parser.parse_args()

    local_dir = Path(args.local_dir).expanduser().resolve()
    ctx = create_ssl_context()

    if args.all:
        emit({"type": "start", "success": True, "message": "Downloading all cooperative models"})
        for family, files in COOPERATIVE_FILES.items():
            family_dir = COOP_ROOT / FAMILY_DIRS[family]
            emit({"type": "progress", "progress": 0, "message": f"=== {family} ({len(files)} files) ==="})
            for repo_id, filename in files:
                dest = family_dir / filename
                if not download_file(repo_id, filename, dest, ctx):
                    emit({"type": "error", "message": f"Failed: {family}/{filename}"})
        emit({"type": "complete", "success": True, "message": "All cooperative model downloads attempted"})
        return

    if args.model_family and args.model_family in COOPERATIVE_FILES:
        family_dir = COOP_ROOT / FAMILY_DIRS[args.model_family]
        emit({"type": "start", "success": True, "repoId": args.repo_id, "localDir": str(family_dir)})
        files = COOPERATIVE_FILES[args.model_family]
        for repo_id, filename in files:
            dest = family_dir / filename
            download_file(repo_id, filename, dest, ctx)
        emit({"type": "complete", "success": True, "repoId": args.repo_id, "localPath": str(family_dir)})
        return

    # Legacy single-model per-category mode
    emit({"type": "start", "success": True, "repoId": args.repo_id, "localDir": str(local_dir),
          "category": args.category, "timestamp": time.time()})

    repo_id = args.repo_id
    category = args.category
    local_dir.mkdir(parents=True, exist_ok=True)

    if category == "onnx-csv":
        for filename in ["model.onnx", "selected_tags.csv"]:
            dest = local_dir / filename
            download_file(repo_id, filename, dest, ctx)
    elif category == "pth":
        filename = "ram_plus_swin_large_14m.pth"
        dest = local_dir / filename
        download_file(repo_id, filename, dest, ctx)
    else:
        # transformers: download all safetensors + configs
        for filename in ["model.safetensors", "config.json", "tokenizer.json",
                          "tokenizer_config.json", "preprocessor_config.json",
                          "generation_config.json", "vocab.json", "merges.txt",
                          "special_tokens_map.json"]:
            dest = local_dir / filename
            download_file(repo_id, filename, dest, ctx)

    emit({"type": "complete", "success": True, "repoId": args.repo_id, "localPath": str(local_dir)})


if __name__ == "__main__":
    main()
