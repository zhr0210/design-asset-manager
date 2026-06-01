# AI Core

Shared runtime infrastructure for AI tasks.

## Entry Files

- `task_queue.py`: task lifecycle.
- `batch_scheduler.py`: batching and scheduling.
- `gpu_monitor.py`: GPU state checks.
- `model_manager.py`: model loading and memory coordination.

## Rules

- Treat `model_manager.py` as protected.
- Preserve GPU memory and lazy-loading behavior.

## Tests

```bash
python -m unittest discover ai-service/tests
```

## Change Log

| Version | Time | Change |
| --- | --- | --- |
| v1.1.0 | 2026-05-31 | GPU monitor now returns an explicit unavailable state instead of fabricated mock GPU metrics when CUDA/NVML/nvidia-smi are unavailable. |
| v1.0.0 | 2026-05-31 | Rewrote README with compact core ownership and protection rule. |
