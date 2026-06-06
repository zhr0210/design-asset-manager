"""Compatibility checks for the Python CUDA route.

The helper stays side-effect-light: it inspects the Python environment and
model-family importability, but it does not download models or run inference.
"""

from __future__ import annotations

import importlib
import importlib.metadata
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


def _probe_optional_family(import_name: str, import_module: ImportModule, backend: str) -> CompatibilityPayload:
    module, error = _try_import(import_name, import_module)
    return {
        "available": module is not None,
        "version": _module_version(module) if module is not None else None,
        "backend": backend,
        "error": error,
    }


def probe_python_cuda_environment(import_module: ImportModule = importlib.import_module) -> CompatibilityPayload:
    torch, torch_error = _try_import("torch", import_module)
    torchvision, torchvision_error = _try_import("torchvision", import_module)
    transformers, transformers_error = _try_import("transformers", import_module)

    cuda_backend = getattr(torch, "cuda", None) if torch is not None else None
    torch_version = getattr(torch, "version", None) if torch is not None else None
    cuda_built = bool(getattr(torch_version, "cuda", None))
    cuda_available = bool(getattr(cuda_backend, "is_available", lambda: False)()) if cuda_backend is not None else False

    ram_probe = _probe_optional_family("models.ram_tagger", import_module, "RAM++ PyTorch")
    florence_probe = _probe_optional_family("models.florence2_tagger", import_module, "Florence-2 PyTorch")
    clip_probe = _probe_optional_family("models.clip_design_classifier", import_module, "CLIP PyTorch")

    compatible = bool(torch and cuda_available)
    status = "optional" if compatible else "planned" if torch is not None else "unavailable"

    return {
        "success": True,
        "compatible": compatible,
        "runtime": "torch.cuda" if compatible else None,
        "diagnostics": {
            "torch": {
                "available": torch is not None,
                "version": _module_version(torch, "torch") if torch is not None else None,
                "cudaBuilt": cuda_built,
                "cudaAvailable": cuda_available,
                "cpuFallback": bool(torch),
                "error": torch_error,
            },
            "torchvision": {
                "available": torchvision is not None,
                "version": _module_version(torchvision, "torchvision") if torchvision is not None else None,
                "error": torchvision_error,
            },
            "transformers": {
                "available": transformers is not None,
                "version": _module_version(transformers, "transformers") if transformers is not None else None,
                "error": transformers_error,
            },
            "families": {
                "ram": ram_probe,
                "florence2": florence_probe,
                "clip": clip_probe,
            },
        },
        "status": status,
        "error": None if compatible else {
            "code": "ENVIRONMENT_INSUFFICIENT" if torch is None else "CUDA_UNAVAILABLE",
            "message": "Python CUDA 路线所需的 Python 依赖或 CUDA 后端尚未齐备。",
        },
    }
