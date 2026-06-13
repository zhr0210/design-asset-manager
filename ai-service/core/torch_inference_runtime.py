from __future__ import annotations

import os
from typing import Any, Mapping


_FALSE_VALUES = {"0", "false", "no", "off"}
_TRUE_VALUES = {"1", "true", "yes", "on"}


def _env_enabled(
    env: Mapping[str, str],
    name: str,
    *,
    default: bool,
) -> bool:
    value = env.get(name)
    if value is None:
        return default
    normalized = value.strip().lower()
    if normalized in _TRUE_VALUES:
        return True
    if normalized in _FALSE_VALUES:
        return False
    return default


def configure_torch_inference_runtime(
    torch_module: Any | None = None,
    *,
    env: Mapping[str, str] | None = None,
) -> dict[str, Any]:
    """Apply the process-wide CUDA inference policy without loading a model."""
    if torch_module is None:
        import torch as torch_module

    runtime_env = os.environ if env is None else env
    cuda = getattr(torch_module, "cuda", None)
    is_available = getattr(cuda, "is_available", None)
    cuda_available = bool(callable(is_available) and is_available())
    if not cuda_available:
        return {
            "cuda_available": False,
            "tf32_enabled": False,
            "matmul_precision": None,
            "cudnn_benchmark": False,
        }

    tf32_enabled = _env_enabled(runtime_env, "DAM_CUDA_TF32", default=False)
    matmul_precision = "high" if tf32_enabled else "highest"
    set_matmul_precision = getattr(
        torch_module,
        "set_float32_matmul_precision",
        None,
    )
    if callable(set_matmul_precision):
        set_matmul_precision(matmul_precision)

    backends = getattr(torch_module, "backends", None)
    cuda_backend = getattr(backends, "cuda", None)
    matmul_backend = getattr(cuda_backend, "matmul", None)
    if matmul_backend is not None and hasattr(matmul_backend, "allow_tf32"):
        matmul_backend.allow_tf32 = tf32_enabled

    cudnn_benchmark = _env_enabled(
        runtime_env,
        "DAM_CUDNN_BENCHMARK",
        default=False,
    )
    cudnn_backend = getattr(backends, "cudnn", None)
    if cudnn_backend is not None:
        if hasattr(cudnn_backend, "allow_tf32"):
            cudnn_backend.allow_tf32 = tf32_enabled
        if hasattr(cudnn_backend, "benchmark"):
            cudnn_backend.benchmark = cudnn_benchmark

    return {
        "cuda_available": True,
        "tf32_enabled": tf32_enabled,
        "matmul_precision": matmul_precision,
        "cudnn_benchmark": cudnn_benchmark,
    }
