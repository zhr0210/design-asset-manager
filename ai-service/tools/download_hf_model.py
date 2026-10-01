"""Download Hugging Face model via snapshot_download with TLS 1.2 enforcement."""
import argparse, json, os, sys, time, ssl
from pathlib import Path

# ── TLS 1.2 enforcement ──
import urllib3
_orig_pm_init = urllib3.PoolManager.__init__
def _patched_pm_init(self, *args, **kwargs):
    kwargs.setdefault("ssl_version", ssl.PROTOCOL_TLSv1_2)
    _orig_pm_init(self, *args, **kwargs)
urllib3.PoolManager.__init__ = _patched_pm_init


def emit(event):
    print(json.dumps(event, ensure_ascii=False), flush=True)


def fail(code, message, detail=None):
    emit({"type": "error", "success": False, "error": {"code": code, "message": message, "detail": detail}})
    sys.exit(1)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-id", required=True)
    parser.add_argument("--local-dir", required=True)
    parser.add_argument("--revision", default=None)
    parser.add_argument("--token", default=None)
    parser.add_argument("--mirror", default=None)
    args = parser.parse_args()

    if args.mirror:
        os.environ["HF_ENDPOINT"] = args.mirror

    try:
        from huggingface_hub import snapshot_download
    except Exception as e:
        fail("HF_HUB_IMPORT_FAILED", "huggingface_hub is not installed.", str(e))

    repo_id = args.repo_id
    local_dir = Path(args.local_dir).expanduser().resolve()
    local_dir.mkdir(parents=True, exist_ok=True)

    emit({"type": "start", "success": True, "repoId": repo_id, "timestamp": time.time()})

    try:
        snapshot_download(
            repo_id=repo_id, local_dir=str(local_dir), revision=args.revision,
            token=args.token or os.environ.get("HF_TOKEN"),
            local_dir_use_symlinks=False, resume_download=True,
            allow_patterns=["*.json", "*.safetensors", "*.model", "*.txt", "*.py",
                            "tokenizer*", "preprocessor_config.json", "generation_config.json",
                            "processor_config.json", "chat_template*", "merges.txt", "vocab.json",
                            "special_tokens_map.json", "*.tiktoken"],
            ignore_patterns=["*.msgpack", "*.h5", "*.ot", "*.onnx", "*.tflite", "*.gguf",
                             "flax_model*", "tf_model*"])
        emit({"type": "complete", "success": True, "repoId": repo_id, "timestamp": time.time()})
    except KeyboardInterrupt:
        fail("MODEL_DOWNLOAD_CANCELLED", "Model download cancelled.")
    except Exception as e:
        fail("MODEL_DOWNLOAD_FAILED", "Model download failed.", repr(e))


if __name__ == "__main__":
    main()
