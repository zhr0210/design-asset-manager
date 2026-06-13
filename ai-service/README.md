# AI Service

Local Python FastAPI worker for AI tagging, prompt reverse, visual analysis, routing, OCR helpers, and translation support.

## Entry Files

- `app.py`: FastAPI entry.
- `core/`: queue, scheduling, GPU and model management.
- `workers/`: task workers.
- `models/`: model wrappers.
- `utils/`: shared Python helpers.
- `tests/`: Python regression tests.

## Rules

- Keep inference in Python, not Electron main.
- Do not read or modify `models_cache/` by default.
- Do not change API response shapes without updating Electron callers.
- Runtime execution probes must use fixed synthetic inputs, return path-free evidence, and must not claim that a model route passed.
- CUDA inference defaults to exact float32 matmul precision. Set
  `DAM_CUDA_TF32=1` only after model-level quality validation. Variable-shape
  cuDNN autotuning remains off unless `DAM_CUDNN_BENCHMARK=1` is explicitly set.
- `requirements.txt` is the CPU-safe default on every platform. NVIDIA Windows
  hosts may explicitly use `requirements-windows-cuda.txt`; Windows alone is
  not evidence that a CUDA dependency profile is appropriate.

## Tests

```bash
python -m unittest discover ai-service/tests
```

## Change Log

| Version | Time | Change |
| --- | --- | --- |
| v1.2.1 | 2026-06-13 | Made TF32 and the Windows CUDA ONNX dependency profile explicit opt-ins; the default install remains exact and CPU-safe. |
| v1.2.0 | 2026-06-13 | Added centralized CUDA inference policy and inference-mode execution. |
| v1.1.0 | 2026-06-06 | Added a user-initiated fixed-tensor MPS execution probe that is separate from model inference evidence. |
| v1.0.0 | 2026-05-31 | Rewrote README as compact AI Worker map with safety rules. |
