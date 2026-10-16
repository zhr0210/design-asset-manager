# AI Core

Shared runtime infrastructure for AI tasks.

## Entry Files

- `task_queue.py`: task lifecycle.
- `batch_scheduler.py`: batching and scheduling.
- `gpu_monitor.py`: GPU state checks.
- `model_manager.py`: model loading and memory coordination.
- `mps_execution_probe.py`: fixed-input real `torch.mps` execution evidence.

## Rules

- 可在获批目标内修改model_manager.py；保持本地制品加载、任务/资源拥有者和释放语义，核对实际消费者并运行相关行为测试，不设文件级禁改。
- Preserve GPU memory and lazy-loading behavior.

## Tests

```bash
python -m unittest discover ai-service/tests
```

## Change Log

| Version | Time | Change |
| --- | --- | --- |
| v1.2.0 | 2026-06-06 | Added a path-free, fixed-tensor MPS execution probe with structured unsupported/dependency/backend/failure states. |
| v1.1.0 | 2026-05-31 | GPU monitor now returns an explicit unavailable state instead of fabricated mock GPU metrics when CUDA/NVML/nvidia-smi are unavailable. |
| v1.0.0 | 2026-05-31 | Rewrote README with compact core ownership and protection rule. |
