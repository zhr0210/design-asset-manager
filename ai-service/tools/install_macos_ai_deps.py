"""Install macOS AI runtime dependencies: torch, transformers, onnxruntime.

Streams JSON progress events and real-time pip output to stdout so the
Electron main process can relay progress to the renderer.
"""

import json
import subprocess
import sys
import time


def emit(event: dict) -> None:
    print(json.dumps(event, ensure_ascii=False), flush=True)


def main() -> None:
    packages = [
        "pip",
        "setuptools",
        "wheel",
        "huggingface_hub",
        "uvicorn",
        "einops",
        "fairscale",
        "scipy",
        "fairscale",
        "fastapi",
        "python-multipart",
        "torch",
        "torchvision",
        "transformers",
        "onnxruntime",
        "optimum[onnxruntime]",
        "accelerate",
        "safetensors",
        "timm",
        "opencv-python-headless",
        "rapidocr-onnxruntime",
        "paddleocr",
        "paddlepaddle",
        "git+https://github.com/xinyu1205/recognize-anything.git",
        "pillow",
        "numpy",
    ]

    total = len(packages)
    emit({"type": "start", "message": f"Installing {total} macOS AI packages...", "packages": packages, "total": total})

    # Install all packages in a single pip invocation for speed and correct
    # dependency resolution.  Stream stdout line-by-line so the frontend
    # shows real progress instead of a spinning wheel.
    in_venv = sys.prefix != getattr(sys, "base_prefix", sys.prefix)
    user_flag = [] if in_venv else ["--user"]

    cmd = [sys.executable, "-m", "pip", "install", *user_flag, "--upgrade", *packages]
    emit({"type": "progress", "progress": 0, "message": f"Running: {' '.join(cmd[:4])} ... {total} packages"})

    started = time.time()
    try:
        proc = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
        )
    except Exception as e:
        emit({"type": "complete", "success": False, "progress": 100,
              "message": f"Failed to start pip: {e}", "failures": [{"package": "all", "detail": str(e)}]})
        sys.exit(1)

    output_lines: list[str] = []
    last_progress = 0
    for line in proc.stdout:
        line = line.rstrip("\n")
        output_lines.append(line)
        emit({"type": "pip-log", "message": line})

        # Crude progress estimate: pip outputs ~1 line per package download.
        # We report progress based on fraction of expected lines.
        elapsed = time.time() - started
        if elapsed > 5 and len(output_lines) > last_progress:
            pct = min(int(len(output_lines) / max(total * 3, 1) * 100), 95)
            if pct > last_progress:
                last_progress = pct
                emit({"type": "progress", "progress": pct,
                      "message": f"Installing... ({len(output_lines)} lines, {elapsed:.0f}s)"})

    proc.wait()
    elapsed = time.time() - started

    if proc.returncode == 0:
        emit({"type": "complete", "success": True, "progress": 100,
              "message": f"All {total} macOS AI dependencies installed in {elapsed:.0f}s."})
    else:
        tail = "\n".join(output_lines[-30:])
        emit({"type": "complete", "success": False, "progress": 100,
              "message": f"pip exited with code {proc.returncode} after {elapsed:.0f}s.",
              "failures": [{"package": "pip (all)", "detail": tail[-2000:]}]})
        sys.exit(1)


if __name__ == "__main__":
    main()
