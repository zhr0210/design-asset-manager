"""Validate registered ONNX models with an explicit CUDA Runtime environment."""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any


AI_SERVICE_ROOT = Path(__file__).resolve().parents[1]
if str(AI_SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(AI_SERVICE_ROOT))

from core.onnx_model_load_probe import probe_registered_onnx_model_load


def _failure(
    status: str,
    error: Exception | None = None,
    **evidence: Any,
) -> dict[str, Any]:
    return {
        "success": False,
        "status": status,
        "errorType": error.__class__.__name__ if error is not None else None,
        **evidence,
    }


def _model_summary(result: dict[str, Any]) -> dict[str, Any]:
    return {
        "success": result["success"],
        "status": result["status"],
        "providers": result["providers"],
        "operation": result["operation"],
        "resultFinite": result["resultFinite"],
        "embeddingDimension": result["embeddingDimension"],
        "inputCount": result["inputCount"],
        "outputCount": result["outputCount"],
    }


def probe_onnx_cuda_profile() -> dict[str, Any]:
    try:
        # Importing torch first exposes its bundled CUDA DLLs to ONNX Runtime.
        import torch as _torch
        import onnxruntime as ort
    except Exception as exc:
        return _failure("dependency_missing", exc)

    try:
        if hasattr(ort, "preload_dlls"):
            ort.preload_dlls(directory="")

        providers = list(ort.get_available_providers())
        if "CUDAExecutionProvider" not in providers:
            return _failure(
                "cuda_provider_unavailable",
                runtimeVersion=getattr(ort, "__version__", None),
                providers=providers,
            )

        wd_tagger = probe_registered_onnx_model_load("wd_tagger")
        clip = probe_registered_onnx_model_load("clip")
        models = {
            "wdTagger": _model_summary(wd_tagger),
            "clip": _model_summary(clip),
        }
        cuda_execution = all(
            result["success"]
            and result["providers"]
            and result["providers"][0] == "CUDAExecutionProvider"
            for result in (wd_tagger, clip)
        )

        return {
            "success": cuda_execution,
            "status": "executed_real" if cuda_execution else "model_probe_failed",
            "runtimeVersion": getattr(ort, "__version__", None),
            "providers": providers,
            "models": models,
        }
    except Exception as exc:
        return _failure("probe_failed", exc)


def main() -> int:
    result = probe_onnx_cuda_profile()
    print(json.dumps(result, ensure_ascii=True))
    return 0 if result.get("success") else 1


if __name__ == "__main__":
    raise SystemExit(main())
