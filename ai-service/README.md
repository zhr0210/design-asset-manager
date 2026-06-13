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
- CUDA inference defaults to TF32-backed `high` float32 matmul precision. Set
  `DAM_CUDA_TF32=0` for exact float32 troubleshooting. Variable-shape cuDNN
  autotuning remains off unless `DAM_CUDNN_BENCHMARK=1` is explicitly set.
- Windows dependency installs select `onnxruntime-gpu`; macOS and Linux retain
  the CPU `onnxruntime` package and their existing provider selection.

## Tests

```bash
python -m unittest discover ai-service/tests
```

## Change Log

| Version | Time | Change |
| --- | --- | --- |
| v1.2.0 | 2026-06-13 | Added centralized CUDA inference policy, inference-mode execution, and Windows ONNX Runtime GPU dependency selection. |
| v1.1.0 | 2026-06-06 | Added a user-initiated fixed-tensor MPS execution probe that is separate from model inference evidence. |
| v1.0.0 | 2026-05-31 | Rewrote README as compact AI Worker map with safety rules. |
