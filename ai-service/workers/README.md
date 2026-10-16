# AI Workers

Task workers that call model wrappers and produce results for Electron polling.

## Entry Files

- `tag_worker.py`: automatic tagging pipeline.
- `prompt_worker.py`: prompt reverse workflow.
- `analysis_worker.py`: deep visual analysis workflow.

## Rules

- 修改tag_worker.py需核对实际调用者/兼容输出并运行相关行为测试；允许目标内必要修改，不设文件级禁改。
- 保留旧Worker lane的Electron-owned结果提交；poller不是所有新Pi/managed能力的统一执行路径。

## Tests

```bash
python -m unittest discover ai-service/tests
```

## Change Log

| Version | Time | Change |
| --- | --- | --- |
| v1.0.0 | 2026-05-31 | Rewrote README with compact worker ownership and protected-file rule. |
