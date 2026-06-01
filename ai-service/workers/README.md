# AI Workers

Task workers that call model wrappers and produce results for Electron polling.

## Entry Files

- `tag_worker.py`: automatic tagging pipeline.
- `prompt_worker.py`: prompt reverse workflow.
- `analysis_worker.py`: deep visual analysis workflow.

## Rules

- Treat `tag_worker.py` as protected.
- Do not bypass the Electron polling flow when syncing results.

## Tests

```bash
python -m unittest discover ai-service/tests
```

## Change Log

| Version | Time | Change |
| --- | --- | --- |
| v1.0.0 | 2026-05-31 | Rewrote README with compact worker ownership and protected-file rule. |
