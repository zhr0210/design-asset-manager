#!/usr/bin/env python3
import importlib
import importlib.metadata
import json
import os
import shutil
import subprocess
import sys


def check_command(args):
    path = shutil.which(args[0])
    if not path:
        return {
            "available": False,
            "path": None,
            "version": None,
            "status": "MISSING_PYTHON",
            "error": "Command not found",
        }

    try:
        result = subprocess.run(
            args,
            capture_output=True,
            text=True,
            timeout=3,
            errors="replace",
        )
        version = (result.stdout or result.stderr).strip() or None
        return {
            "available": result.returncode == 0,
            "path": path,
            "version": version,
            "status": "AVAILABLE" if result.returncode == 0 else "UNKNOWN_ERROR",
            "error": None if result.returncode == 0 else (result.stderr or result.stdout).strip(),
        }
    except Exception as exc:
        return {
            "available": False,
            "path": path,
            "version": None,
            "status": "UNKNOWN_ERROR",
            "error": f"{type(exc).__name__}: {exc}",
        }


def read_version(module, package_name):
    version = getattr(module, "__version__", None)
    if version:
        return str(version)
    try:
        return importlib.metadata.version(package_name)
    except importlib.metadata.PackageNotFoundError:
        return None
    except Exception:
        return None


def check_module(provider_key, module_name, package_name=None, candidate=None):
    try:
        module = importlib.import_module(module_name)
        payload = {
            "available": True,
            "module": module_name,
            "version": read_version(module, package_name or module_name),
            "status": "AVAILABLE",
            "error": None,
        }
    except ModuleNotFoundError as exc:
        payload = {
            "available": False,
            "module": module_name,
            "version": None,
            "status": "MISSING_MODULE",
            "error": type(exc).__name__,
        }
    except Exception as exc:
        payload = {
            "available": False,
            "module": module_name,
            "version": None,
            "status": "IMPORT_ERROR",
            "error": f"{type(exc).__name__}: {exc}",
        }

    if candidate:
        payload = {"candidate": candidate, **payload}
    return provider_key, payload


def main():
    python_command = check_command(["python", "--version"])
    py_launcher = check_command(["py", "-3", "--version"])

    providers = {}
    for key, payload in [
        check_module(
            "rapidocr_detection",
            "rapidocr_onnxruntime",
            "rapidocr-onnxruntime",
            "primary",
        ),
        check_module("paddleocr_detection", "paddleocr", "paddleocr", "fallback"),
        check_module("onnxruntime", "onnxruntime", "onnxruntime"),
    ]:
        providers[key] = payload

    # R2.2: Check local RapidOCR runner rapidocr_detect.py
    workspace = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    runner_path = os.path.join(workspace, "tools", "ocr", "rapidocr_detect.py")
    runner_exists = os.path.isfile(runner_path)

    runner_status = {
        "exists": runner_exists,
        "path": "tools/ocr/rapidocr_detect.py" if runner_exists else None,
        "dryRunOk": False,
        "exitCode": None,
        "jsonParseOk": False,
        "ok": None,
        "boxes": None,
        "error": None,
        "status": "MISSING_RUNNER"
    }

    paddle_runner_path = os.path.join(workspace, "tools", "ocr", "paddleocr_detect.py")
    paddle_runner_exists = os.path.isfile(paddle_runner_path)
    paddle_runner_status = {
        "exists": paddle_runner_exists,
        "path": "tools/ocr/paddleocr_detect.py" if paddle_runner_exists else None,
        "dryRunOk": False,
        "exitCode": None,
        "jsonParseOk": False,
        "ok": None,
        "boxes": None,
        "error": None,
        "status": "MISSING_RUNNER"
    }

    if runner_exists:
        try:
            res = subprocess.run(
                [sys.executable, runner_path, "--image", "__missing__.jpg", "--dry-run"],
                capture_output=True,
                text=True,
                timeout=3,
                errors="replace"
            )
            runner_status["exitCode"] = res.returncode
            try:
                parsed = json.loads(res.stdout.strip())
                runner_status["jsonParseOk"] = True
                runner_status["ok"] = parsed.get("ok")
                runner_status["boxes"] = parsed.get("boxes")
                runner_status["error"] = parsed.get("error")
                
                # Check R2.2 success criteria
                if (res.returncode == 0 and 
                    parsed.get("ok") is False and 
                    parsed.get("boxes") == [] and 
                    parsed.get("error") == "Image does not exist"):
                    runner_status["dryRunOk"] = True
                    runner_status["status"] = "PASS"
                else:
                    runner_status["status"] = "FAIL"
            except Exception as parse_err:
                runner_status["error"] = f"JSON parse error: {str(parse_err)}. Raw stdout: {res.stdout.strip()}"
                runner_status["status"] = "FAIL"
        except Exception as run_err:
            runner_status["error"] = f"Run error: {str(run_err)}"
            runner_status["status"] = "FAIL"

    if paddle_runner_exists:
        try:
            res = subprocess.run(
                [sys.executable, paddle_runner_path, "--image", "__missing__.jpg", "--dry-run"],
                capture_output=True,
                text=True,
                timeout=3,
                errors="replace"
            )
            paddle_runner_status["exitCode"] = res.returncode
            try:
                parsed = json.loads(res.stdout.strip())
                paddle_runner_status["jsonParseOk"] = True
                paddle_runner_status["ok"] = parsed.get("ok")
                paddle_runner_status["boxes"] = parsed.get("boxes")
                paddle_runner_status["error"] = parsed.get("error")

                if (res.returncode == 0 and
                    parsed.get("ok") is False and
                    parsed.get("boxes") == [] and
                    parsed.get("error") == "Image does not exist"):
                    paddle_runner_status["dryRunOk"] = True
                    paddle_runner_status["status"] = "PASS"
                else:
                    paddle_runner_status["status"] = "FAIL"
            except Exception as parse_err:
                paddle_runner_status["error"] = f"JSON parse error: {str(parse_err)}. Raw stdout: {res.stdout.strip()}"
                paddle_runner_status["status"] = "FAIL"
        except Exception as run_err:
            paddle_runner_status["error"] = f"Run error: {str(run_err)}"
            paddle_runner_status["status"] = "FAIL"

    output = {
        "ok": True,
        "status": "HEALTHCHECK_COMPLETE",
        "schemaVersion": "1.0",
        "python": {
            "currentExecutable": sys.executable,
            "currentVersion": sys.version.split()[0],
            "pythonCommandAvailable": python_command["available"],
            "pythonCommandPath": python_command["path"],
            "pythonCommandVersion": python_command["version"],
            "pyLauncherAvailable": py_launcher["available"],
            "pyLauncherPath": py_launcher["path"],
            "pyLauncherVersion": py_launcher["version"],
        },
        "providers": providers,
        "runner": {
            "rapidocr_detect": runner_status,
            "paddleocr_detect": paddle_runner_status,
        },
        "recommendation": {
            "defaultProvider": "none",
            "preferredFutureProvider": "paddleocr_detection",
            "shouldInstallNow": False,
            "notes": [
                "This script is offline-only and never installs dependencies.",
                "Missing OCR modules are an acceptable healthcheck result.",
                "Do not enable OCR providers by default until dependencies are explicitly approved.",
            ],
        },
        "exitCodePolicy": {
            "missingProviderModules": 0,
            "missingPythonCommands": 0,
            "scriptInternalError": 1,
        },
    }

    print(json.dumps(output, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
