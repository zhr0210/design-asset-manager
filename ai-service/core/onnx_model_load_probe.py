"""Explicit real-load probe for registered ONNX model artifacts."""

from __future__ import annotations

import importlib
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Dict, Optional

from core.cooperative_model_registry import find_downloaded_model


ProbePayload = Dict[str, Any]
ImportModule = Callable[[str], Any]
ModelPathResolver = Callable[[str], Optional[Path]]


def probe_registered_onnx_model_load(
    model_family: str = "wd_tagger",
    import_module: ImportModule = importlib.import_module,
    model_path_resolver: ModelPathResolver = find_downloaded_model,
) -> ProbePayload:
    """Create and release a real ONNX Runtime session for a registered model."""
    checked_at = datetime.now(timezone.utc).isoformat()
    if model_family != "wd_tagger":
        return _result(model_family, "unsupported", checked_at, error_code="MODEL_FAMILY_UNSUPPORTED")

    model_root = model_path_resolver(model_family)
    if model_root is None:
        return _result(model_family, "artifact_missing", checked_at, error_code="MODEL_ARTIFACT_MISSING")

    model_path = Path(model_root) / "model.onnx"
    if not model_path.is_file() or model_path.stat().st_size < 1024 * 1024:
        return _result(model_family, "artifact_invalid", checked_at, error_code="MODEL_ARTIFACT_INVALID")

    try:
        ort = import_module("onnxruntime")
    except Exception as exc:
        return _result(
            model_family,
            "dependency_missing",
            checked_at,
            error_code="ONNXRUNTIME_UNAVAILABLE",
            error_type=exc.__class__.__name__,
        )

    available_providers = list(getattr(ort, "get_available_providers", lambda: [])())
    providers = _select_providers(available_providers)
    try:
        session = ort.InferenceSession(str(model_path), providers=providers)
        active_providers = list(session.get_providers())
        input_count = len(session.get_inputs())
        output_count = len(session.get_outputs())
        del session
    except Exception as exc:
        return _result(
            model_family,
            "load_failed",
            checked_at,
            providers=providers,
            error_code="SESSION_LOAD_FAILED",
            error_type=exc.__class__.__name__,
        )

    return _result(
        model_family,
        "loaded_real",
        checked_at,
        providers=active_providers,
        input_count=input_count,
        output_count=output_count,
    )


def _select_providers(available: list[str]) -> list[str]:
    if "CoreMLExecutionProvider" in available:
        return ["CoreMLExecutionProvider", "CPUExecutionProvider"]
    if "CUDAExecutionProvider" in available:
        return ["CUDAExecutionProvider", "CPUExecutionProvider"]
    return ["CPUExecutionProvider"]


def _result(
    model_family: str,
    status: str,
    checked_at: str,
    providers: list[str] | None = None,
    input_count: int = 0,
    output_count: int = 0,
    error_code: str | None = None,
    error_type: str | None = None,
) -> ProbePayload:
    return {
        "success": status == "loaded_real",
        "modelFamily": model_family,
        "status": status,
        "checkedAt": checked_at,
        "providers": providers or [],
        "inputCount": input_count,
        "outputCount": output_count,
        "errorCode": error_code,
        "errorType": error_type,
    }
