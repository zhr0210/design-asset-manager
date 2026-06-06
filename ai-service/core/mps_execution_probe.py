"""Explicit real-execution probe for the PyTorch MPS runtime."""

from __future__ import annotations

import importlib
import math
import platform
from datetime import datetime, timezone
from typing import Any, Callable, Dict


ProbePayload = Dict[str, Any]
ImportModule = Callable[[str], Any]
ExecuteProbe = Callable[[Any], float]


def _checked_at() -> str:
    return datetime.now(timezone.utc).isoformat()


def _execute_tensor_probe(torch: Any) -> float:
    tensor = torch.tensor([1.0, 2.0, 3.0, 4.0], device="mps")
    result = (tensor * tensor).sum()
    synchronize = getattr(getattr(torch, "mps", None), "synchronize", None)
    if callable(synchronize):
        synchronize()
    return float(result.detach().cpu().item())


def probe_python_mps_execution(
    import_module: ImportModule = importlib.import_module,
    platform_name: str | None = None,
    execute_probe: ExecuteProbe = _execute_tensor_probe,
) -> ProbePayload:
    checked_at = _checked_at()
    current_platform = (platform_name or platform.system()).lower()
    if current_platform not in {"darwin", "macos"}:
        return {
            "success": False,
            "status": "unsupported",
            "checkedAt": checked_at,
            "runtime": None,
            "operation": "tensor_square_sum",
            "resultFinite": False,
            "errorCode": "PLATFORM_UNSUPPORTED",
            "errorType": None,
        }

    try:
        torch = import_module("torch")
    except Exception as exc:
        return {
            "success": False,
            "status": "dependency_missing",
            "checkedAt": checked_at,
            "runtime": None,
            "operation": "tensor_square_sum",
            "resultFinite": False,
            "errorCode": "TORCH_MISSING",
            "errorType": exc.__class__.__name__,
        }

    mps_backend = getattr(getattr(torch, "backends", None), "mps", None)
    is_available = bool(getattr(mps_backend, "is_available", lambda: False)()) if mps_backend else False
    if not is_available:
        return {
            "success": False,
            "status": "backend_unavailable",
            "checkedAt": checked_at,
            "runtime": "torch.mps",
            "operation": "tensor_square_sum",
            "resultFinite": False,
            "errorCode": "MPS_UNAVAILABLE",
            "errorType": None,
        }

    try:
        result = execute_probe(torch)
        result_finite = math.isfinite(result)
        if not result_finite:
            raise ValueError("MPS probe returned a non-finite result")
        return {
            "success": True,
            "status": "executed_real",
            "checkedAt": checked_at,
            "runtime": "torch.mps",
            "operation": "tensor_square_sum",
            "resultFinite": True,
            "errorCode": None,
            "errorType": None,
        }
    except Exception as exc:
        return {
            "success": False,
            "status": "execution_failed",
            "checkedAt": checked_at,
            "runtime": "torch.mps",
            "operation": "tensor_square_sum",
            "resultFinite": False,
            "errorCode": "MPS_EXECUTION_FAILED",
            "errorType": exc.__class__.__name__,
        }
