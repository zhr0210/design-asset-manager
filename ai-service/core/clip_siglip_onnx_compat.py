"""Compatibility checks for the CLIP/SigLIP ONNX route.

The helper stays side-effect-light: it inspects the Python environment and
local model-folder structure, but it does not download models or run inference.
"""

from __future__ import annotations

import importlib
import importlib.metadata
from pathlib import Path
from typing import Any, Callable, Dict


CompatibilityPayload = Dict[str, Any]
ImportModule = Callable[[str], Any]


def _try_import(name: str, import_module: ImportModule) -> tuple[Any | None, str | None]:
    try:
        return import_module(name), None
    except Exception as exc:  # pragma: no cover - exact import failures vary by environment.
        return None, exc.__class__.__name__


def _module_version(module: Any, package_name: str | None = None) -> str | None:
    version = getattr(module, "__version__", None)
    if version:
        return str(version)
    if not package_name:
        return None
    try:
        return str(importlib.metadata.version(package_name))
    except Exception:
        return None


def probe_clip_siglip_onnx_environment(import_module: ImportModule = importlib.import_module) -> CompatibilityPayload:
    onnxruntime, onnx_error = _try_import("onnxruntime", import_module)
    transformers, transformers_error = _try_import("transformers", import_module)
    optimum_onnxruntime, optimum_error = _try_import("optimum.onnxruntime", import_module)

    diagnostics: CompatibilityPayload = {
        "onnxruntime": {
            "available": onnxruntime is not None,
            "version": _module_version(onnxruntime, "onnxruntime") if onnxruntime is not None else None,
            "providers": list(getattr(onnxruntime, "get_available_providers", lambda: [])()) if onnxruntime is not None else [],
            "error": onnx_error,
        },
        "transformers": {
            "available": transformers is not None,
            "version": _module_version(transformers, "transformers") if transformers is not None else None,
            "error": transformers_error,
        },
        "optimum": {
            "available": optimum_onnxruntime is not None,
            "version": _module_version(optimum_onnxruntime, "optimum") if optimum_onnxruntime is not None else None,
            "error": optimum_error,
        },
    }

    compatible = bool(onnxruntime and transformers and optimum_onnxruntime)
    return {
        "success": True,
        "compatible": compatible,
        "runtime": "optimum.onnxruntime" if compatible else None,
        "diagnostics": diagnostics,
        "error": None if compatible else {
            "code": "ENVIRONMENT_INSUFFICIENT",
            "message": "CLIP/SigLIP ONNX 所需的 Python 依赖尚未齐备。",
        },
    }


def _list_onnx_files(model_path: Path) -> list[str]:
    candidates = []
    for directory in (model_path, model_path / "onnx"):
        if directory.exists() and directory.is_dir():
            for path in directory.glob("*.onnx"):
                candidates.append(path.name)
    return sorted(set(candidates))


def check_clip_siglip_onnx_model_compat(
    input_data: Dict[str, Any],
    import_module: ImportModule = importlib.import_module,
) -> CompatibilityPayload:
    probe = probe_clip_siglip_onnx_environment(import_module=import_module)
    diagnostics = probe["diagnostics"]

    model_path = input_data.get("modelPath")
    model_id = input_data.get("modelId")
    quantization = input_data.get("quantization", "none")

    if not probe["compatible"]:
        return probe

    if not model_path:
        return {
            "success": True,
            "compatible": True,
            "modelId": model_id,
            "runtime": probe["runtime"],
            "diagnostics": diagnostics,
            "error": None,
        }

    model_root = Path(model_path).expanduser()
    if not model_root.exists():
        return {
            "success": False,
            "compatible": False,
            "modelId": model_id,
            "runtime": probe["runtime"],
            "diagnostics": diagnostics,
            "error": {
                "code": "MODEL_PATH_NOT_FOUND",
                "message": f"本地模型文件夹不存在: {model_path}。",
            },
        }

    config_json_path = model_root / "config.json"
    if not config_json_path.exists():
        return {
            "success": False,
            "compatible": False,
            "modelId": model_id,
            "runtime": probe["runtime"],
            "diagnostics": diagnostics,
            "error": {
                "code": "CONFIG_JSON_MISSING",
                "message": "缺失关键配置文件 config.json。",
            },
        }

    onnx_files = _list_onnx_files(model_root)
    if not onnx_files:
        return {
            "success": False,
            "compatible": False,
            "modelId": model_id,
            "runtime": probe["runtime"],
            "diagnostics": diagnostics,
            "error": {
                "code": "ONNX_GRAPH_MISSING",
                "message": "模型目录中未找到 .onnx 文件，无法作为 CLIP/SigLIP ONNX 运行时使用。",
            },
        }

    if quantization == "none" and any(name.endswith("int8.onnx") or name.endswith("q4.onnx") for name in onnx_files):
        return {
            "success": False,
            "compatible": False,
            "modelId": model_id,
            "runtime": probe["runtime"],
            "diagnostics": diagnostics,
            "error": {
                "code": "MODEL_MISMATCH",
                "message": "模型目录包含量化 ONNX 文件，但设置要求原版(none)加载。",
            },
        }

    return {
        "success": True,
        "compatible": True,
        "modelId": model_id,
        "runtime": probe["runtime"],
        "diagnostics": {
            **diagnostics,
            "modelPath": str(model_root),
            "onnxFiles": onnx_files,
        },
        "error": None,
    }
