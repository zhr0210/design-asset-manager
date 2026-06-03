#!/usr/bin/env python3
import warnings
warnings.filterwarnings('ignore')

import importlib
import importlib.metadata
import json
import sys

def check_module(module_name, package_name):
    try:
        module = importlib.import_module(module_name)
        version = getattr(module, "__version__", None)
        if not version:
            try:
                version = importlib.metadata.version(package_name)
            except Exception:
                version = "unknown"
        return {
            "installed": True,
            "version": str(version),
            "error": None
        }
    except ModuleNotFoundError as exc:
        return {
            "installed": False,
            "version": None,
            "error": str(exc)
        }
    except Exception as exc:
        return {
            "installed": False,
            "version": None,
            "error": f"{type(exc).__name__}: {str(exc)}"
        }

def main():
    result = {
        "python": {
            "version": sys.version.split()[0],
            "executable": sys.executable
        },
        "easyocr": check_module("easyocr", "easyocr"),
        "rapidocr": check_module("rapidocr_onnxruntime", "rapidocr-onnxruntime"),
        "paddleocr": check_module("paddleocr", "paddleocr")
    }
    print(json.dumps(result, ensure_ascii=False))

if __name__ == "__main__":
    main()
