"""Install macOS AI runtime dependencies: torch, transformers, onnxruntime.

Streams JSON progress events to stdout so the Electron main process
can relay progress to the renderer.
"""

import json
import os
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
        "torch",
        "torchvision",
        "transformers",
        "onnxruntime",
        "optimum[onnxruntime]",
        "mlx",
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
    emit({"type": "start", "message": f"Installing {len(packages)} macOS AI packages...", "packages": packages})

    failures = []
    in_venv = sys.prefix != getattr(sys, "base_prefix", sys.prefix)
    user_flag = [] if in_venv else ["--user"]

    for i, pkg in enumerate(packages):
        progress = round((i / len(packages)) * 100)
        emit({"type": "progress", "progress": progress, "message": f"Installing {pkg} ({i+1}/{len(packages)})..."})

        try:
            install_args = [
                sys.executable,
                "-m",
                "pip",
                "install",
                *user_flag,
                "--upgrade",
                pkg,
            ]
            result = subprocess.run(
                install_args,
                capture_output=True,
                text=True,
                timeout=1800,
            )
            if result.returncode != 0:
                failures.append({
                    "package": pkg,
                    "detail": result.stderr[-1000:] if result.stderr else result.stdout[-1000:],
                })
                emit({
                    "type": "error",
                    "package": pkg,
                    "message": f"Failed to install {pkg}",
                    "detail": result.stderr[-1000:] if result.stderr else "Unknown error",
                })
            else:
                emit({
                    "type": "package-complete",
                    "package": pkg,
                    "success": True,
                    "progress": round(((i + 1) / len(packages)) * 100),
                    "message": f"Installed {pkg}",
                })
        except subprocess.TimeoutExpired:
            failures.append({"package": pkg, "detail": "timeout"})
            emit({"type": "error", "package": pkg, "message": f"Timeout installing {pkg}", "detail": "timeout"})
        except Exception as e:
            failures.append({"package": pkg, "detail": str(e)})
            emit({"type": "error", "package": pkg, "message": f"Error installing {pkg}: {str(e)}", "detail": str(e)})

    if failures:
        emit({
            "type": "complete",
            "success": False,
            "progress": 100,
            "message": f"Installation finished with {len(failures)} failed package(s).",
            "failures": failures,
        })
        sys.exit(1)

    emit({"type": "complete", "success": True, "progress": 100, "message": "All macOS AI dependencies installed."})


if __name__ == "__main__":
    main()
