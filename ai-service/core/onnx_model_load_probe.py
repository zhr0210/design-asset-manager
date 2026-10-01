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
    if model_family not in {"wd_tagger", "clip"}:
        return _result(model_family, "unsupported", checked_at, error_code="MODEL_FAMILY_UNSUPPORTED")

    model_root = model_path_resolver(model_family)
    if model_root is None:
        return _result(model_family, "artifact_missing", checked_at, error_code="MODEL_ARTIFACT_MISSING")

    model_path = Path(model_root) / ("onnx/model.onnx" if model_family == "clip" else "model.onnx")
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
        operation = "session_load"
        result_finite = True
        embedding_dimension = 0
        if model_family == "clip":
            operation = "image_text_embedding"
            try:
                result_finite, embedding_dimension = _run_clip_embedding_probe(
                    session,
                    Path(model_root),
                    import_module,
                )
            except Exception:
                if active_providers != ["CPUExecutionProvider"] and "CPUExecutionProvider" in available_providers:
                    del session
                    session = ort.InferenceSession(str(model_path), providers=["CPUExecutionProvider"])
                    active_providers = list(session.get_providers())
                    input_count = len(session.get_inputs())
                    output_count = len(session.get_outputs())
                    result_finite, embedding_dimension = _run_clip_embedding_probe(
                        session,
                        Path(model_root),
                        import_module,
                    )
                else:
                    raise
            if not result_finite or embedding_dimension <= 0:
                return _result(
                    model_family,
                    "execution_failed",
                    checked_at,
                    providers=active_providers,
                    input_count=input_count,
                    output_count=output_count,
                    operation=operation,
                    result_finite=result_finite,
                    embedding_dimension=embedding_dimension,
                    error_code="EMBEDDING_OUTPUT_INVALID",
                )
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
        operation=operation,
        result_finite=result_finite,
        embedding_dimension=embedding_dimension,
    )


def _run_clip_embedding_probe(
    session: Any,
    model_root: Path,
    import_module: ImportModule,
) -> tuple[bool, int]:
    numpy = import_module("numpy")
    transformers = import_module("transformers")
    image_module = import_module("PIL.Image")
    processor_class = getattr(transformers, "CLIPProcessor", None) or getattr(transformers, "AutoProcessor")
    processor = processor_class.from_pretrained(str(model_root), local_files_only=True)
    image = image_module.new("RGB", (224, 224), color=(220, 45, 45))
    encoded = processor(
        text=["a red design", "a blue design"],
        images=image,
        return_tensors="np",
        padding=True,
    )
    feed = {
        item.name: encoded[item.name]
        for item in session.get_inputs()
        if item.name in encoded
    }
    outputs = session.run(None, feed)
    output_meta = list(session.get_outputs())
    finite = bool(outputs) and all(bool(numpy.isfinite(value).all()) for value in outputs)
    embedding_dimension = 0
    for index, item in enumerate(output_meta):
        if item.name == "image_embeds" and index < len(outputs):
            shape = getattr(outputs[index], "shape", ())
            if shape:
                embedding_dimension = int(shape[-1])
            break
    return finite, embedding_dimension


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
    operation: str = "session_load",
    result_finite: bool = False,
    embedding_dimension: int = 0,
) -> ProbePayload:
    return {
        "success": status == "loaded_real",
        "modelFamily": model_family,
        "status": status,
        "checkedAt": checked_at,
        "providers": providers or [],
        "inputCount": input_count,
        "outputCount": output_count,
        "operation": operation,
        "resultFinite": result_finite,
        "embeddingDimension": embedding_dimension,
        "errorCode": error_code,
        "errorType": error_type,
    }
