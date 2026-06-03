"""macOS AI branch capability probes.

The probes are intentionally side-effect-light: they import runtime libraries and
inspect provider availability, but they do not download models, load weights, or
read user images.
"""

from __future__ import annotations

import importlib
import importlib.metadata
import platform as platform_module
import sys
from typing import Any, Callable, Dict, List

from core.clip_siglip_onnx_compat import probe_clip_siglip_onnx_environment


CapabilityPayload = Dict[str, Any]
ImportModule = Callable[[str], Any]


def _capability(
    capability_id: str,
    label: str,
    status: str,
    role: str,
    model_family: str | None = None,
    backend: str | None = None,
) -> CapabilityPayload:
    payload: CapabilityPayload = {
        "id": capability_id,
        "label": label,
        "status": status,
        "role": role,
    }
    if model_family:
        payload["modelFamily"] = model_family
    if backend:
        payload["backend"] = backend
    return payload


def _lane(lane_id: str, label: str, status: str, summary: str, capabilities: List[CapabilityPayload]) -> CapabilityPayload:
    return {
        "id": lane_id,
        "label": label,
        "status": status,
        "summary": summary,
        "capabilities": capabilities,
    }


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


def _probe_optional_module(
    import_name: str,
    import_module: ImportModule,
    package_name: str | None = None,
    backend: str | None = None,
) -> CapabilityPayload:
    module, error = _try_import(import_name, import_module)
    if module is None:
        return {
            "available": False,
            "version": None,
            "backend": backend,
            "error": error,
        }

    return {
        "available": True,
        "version": _module_version(module, package_name),
        "backend": backend,
        "error": None,
    }


def _probe_torch(import_module: ImportModule) -> CapabilityPayload:
    torch, error = _try_import("torch", import_module)
    if torch is None:
        return {
            "available": False,
            "version": None,
            "mpsBuilt": False,
            "mpsAvailable": False,
            "cpuFallback": False,
            "error": error,
        }

    version = _module_version(torch, "torch")
    mps_backend = getattr(getattr(torch, "backends", None), "mps", None)
    mps_built = bool(getattr(mps_backend, "is_built", lambda: False)())
    mps_available = bool(getattr(mps_backend, "is_available", lambda: False)())
    return {
        "available": True,
        "version": version,
        "mpsBuilt": mps_built,
        "mpsAvailable": mps_available,
        "cpuFallback": True,
        "error": None,
    }


def _probe_onnxruntime(import_module: ImportModule) -> CapabilityPayload:
    ort, error = _try_import("onnxruntime", import_module)
    if ort is None:
        return {
            "available": False,
            "version": None,
            "providers": [],
            "coremlAvailable": False,
            "cpuAvailable": False,
            "error": error,
        }

    providers = list(getattr(ort, "get_available_providers", lambda: [])())
    return {
        "available": True,
        "version": _module_version(ort, "onnxruntime"),
        "providers": providers,
        "coremlAvailable": "CoreMLExecutionProvider" in providers,
        "cpuAvailable": "CPUExecutionProvider" in providers,
        "error": None,
    }


def _probe_mlx(import_module: ImportModule) -> CapabilityPayload:
    mlx, error = _try_import("mlx", import_module)
    if mlx is None:
        return {
            "available": False,
            "version": None,
            "error": error,
        }

    return {
        "available": True,
        "version": _module_version(mlx, "mlx"),
        "error": None,
    }


def _probe_clip_siglip_onnx(import_module: ImportModule) -> CapabilityPayload:
    probe = probe_clip_siglip_onnx_environment(import_module=import_module)
    diagnostics = probe["diagnostics"]
    onnxruntime_probe = diagnostics["onnxruntime"]
    optimum_probe = diagnostics["optimum"]
    transformers_probe = diagnostics["transformers"]

    if not probe["compatible"]:
        missing = probe.get("error", {})
        if onnxruntime_probe["available"] and transformers_probe["available"]:
            status = "planned"
            version = optimum_probe["version"] or onnxruntime_probe["version"]
            error = optimum_probe["error"]
        else:
            status = "unavailable"
            version = None
            error = onnxruntime_probe["error"] or transformers_probe["error"]

        return {
            "available": False,
            "version": version,
            "status": status,
            "backend": "CLIP/SigLIP ONNX",
            "error": error or (missing.get("code") if isinstance(missing, dict) else None),
        }

    return {
        "available": True,
        "version": optimum_probe["version"] or onnxruntime_probe["version"],
        "status": "optional",
        "backend": "CLIP/SigLIP ONNX",
        "error": None,
    }


def _optional_status(is_macos: bool, module_available: bool) -> str:
    if module_available:
        return "optional"
    return "planned" if is_macos else "unavailable"


def probe_macos_ai_capabilities(
    platform_name: str | None = None,
    machine: str | None = None,
    import_module: ImportModule = importlib.import_module,
) -> CapabilityPayload:
    platform_name = platform_name or sys.platform
    machine = machine or platform_module.machine()
    is_macos = platform_name == "darwin"
    is_apple_silicon = is_macos and machine in {"arm64", "aarch64"}

    torch_probe = _probe_torch(import_module)
    onnx_probe = _probe_onnxruntime(import_module)
    mlx_probe = _probe_mlx(import_module)
    clip_siglip_onnx_probe = _probe_clip_siglip_onnx(import_module)
    ram_probe = _probe_optional_module("models.ram_tagger", import_module, backend="RAM++ PyTorch")
    florence_probe = _probe_optional_module("models.florence2_tagger", import_module, backend="Florence-2 PyTorch")
    clip_probe = _probe_optional_module("models.clip_design_classifier", import_module, backend="CLIP PyTorch")
    wd_probe = _probe_optional_module("models.wd_tagger", import_module, backend="ONNX Runtime")
    rapidocr_probe = _probe_optional_module("rapidocr_onnxruntime", import_module, package_name="rapidocr-onnxruntime", backend="RapidOCR ONNX")
    paddleocr_probe = _probe_optional_module("paddleocr", import_module, package_name="paddleocr", backend="PaddleOCR ONNX")

    mps_status = "ready" if torch_probe["mpsAvailable"] else "fallback" if torch_probe["cpuFallback"] else "unavailable"
    onnx_status = "ready" if onnx_probe["available"] else "unavailable"
    llama_status = "planned" if is_macos else "unavailable"

    lanes = [
        _lane(
            "python-mps",
            "Python MPS Runtime",
            mps_status,
            "PyTorch MPS route for RAM++, Florence-2, CLIP/SigLIP, with CPU fallback.",
            [
                _capability("python-mps.ram-plus", "RAM++ optional", _optional_status(is_macos, ram_probe["available"] and torch_probe["mpsAvailable"]), "tagging", "RAM++", ram_probe["backend"] or "PyTorch MPS"),
                _capability("python-mps.florence-2", "Florence-2 optional", _optional_status(is_macos, florence_probe["available"] and torch_probe["mpsAvailable"]), "tagging", "Florence-2", florence_probe["backend"] or "PyTorch MPS"),
                _capability("python-mps.clip-siglip", "CLIP/SigLIP optional", _optional_status(is_macos, clip_probe["available"] and torch_probe["mpsAvailable"]), "embedding", "CLIP/SigLIP", clip_probe["backend"] or "PyTorch MPS"),
                _capability("python-mps.cpu-fallback", "CPU fallback", "fallback" if torch_probe["cpuFallback"] else "unavailable", "fallback", None, "CPU"),
            ],
        ),
        _lane(
            "onnx-runtime",
            "ONNX Runtime",
            onnx_status,
            "ONNX lane for WD14, RapidOCR, PaddleOCR ONNX, CLIP/SigLIP ONNX, with CoreML or CPU fallback.",
            [
                _capability("onnx-runtime.wd14", "WD14 Tagger", _optional_status(is_macos, wd_probe["available"] and onnx_probe["available"]), "tagging", "WD14", wd_probe["backend"] or "ONNX Runtime"),
                _capability("onnx-runtime.rapidocr", "RapidOCR", _optional_status(is_macos, rapidocr_probe["available"] and onnx_probe["available"]), "ocr", "RapidOCR", rapidocr_probe["backend"] or "ONNX Runtime"),
                _capability("onnx-runtime.paddleocr", "PaddleOCR ONNX", _optional_status(is_macos, paddleocr_probe["available"] and onnx_probe["available"]), "ocr", "PaddleOCR", paddleocr_probe["backend"] or "ONNX Runtime"),
                _capability("onnx-runtime.clip-siglip", "CLIP/SigLIP ONNX", clip_siglip_onnx_probe["status"] if is_macos else "unavailable", "embedding", "CLIP/SigLIP", clip_siglip_onnx_probe["backend"]),
                _capability("onnx-runtime.coreml-fallback", "CoreML fallback", "fallback" if onnx_probe["coremlAvailable"] else "unavailable", "fallback", None, "CoreML"),
                _capability("onnx-runtime.cpu-fallback", "CPU fallback", "fallback" if onnx_probe["cpuAvailable"] else "unavailable", "fallback", None, "CPU"),
            ],
        ),
        _lane(
            "llama",
            "Llama",
            llama_status,
            "Large vision route for Qwen3-VL GGUF/MLX, Qwen2.5-VL Ollama fallback, and external HTTP fallback.",
            [
                _capability("llama.qwen3-vl-gguf", "Qwen3-VL GGUF", "planned" if is_macos else "unavailable", "prompt-reverse", "Qwen3-VL", "llama.cpp Metal"),
                _capability("llama.qwen3-vl-mlx", "Qwen3-VL MLX", "planned" if is_apple_silicon or mlx_probe["available"] else "fallback", "prompt-reverse", "Qwen3-VL", "MLX"),
                _capability("llama.qwen25-vl-ollama", "Qwen2.5-VL Ollama fallback", "fallback" if is_macos else "unavailable", "prompt-reverse", "Qwen2.5-VL", "Ollama"),
                _capability("llama.external-http", "external HTTP fallback", "fallback", "fallback", None, "OpenAI-compatible HTTP"),
            ],
        ),
    ]

    return {
        "platform": platform_name,
        "machine": machine,
        "isMacOS": is_macos,
        "isAppleSilicon": is_apple_silicon,
        "phase": "worker-probes",
        "torch": torch_probe,
        "onnxruntime": onnx_probe,
        "mlx": mlx_probe,
        "clipSiglipOnnx": clip_siglip_onnx_probe,
        "ram": ram_probe,
        "florence2": florence_probe,
        "clip": clip_probe,
        "wd14": wd_probe,
        "rapidocr": rapidocr_probe,
        "paddleocr": paddleocr_probe,
        "lanes": lanes,
    }
