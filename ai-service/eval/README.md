# AI Eval

Evaluation scripts and small checked-in router datasets.

## Entry Files

- `router_eval.py`: router evaluation runner.
- `router_metrics.py`: metrics helpers.
- `router_report.py`: report generation.
- `router_eval_dataset.json`: checked-in router dataset.

## Rules

- Do not read or modify large evaluation datasets or generated reports by default.
- Keep generated reports out of normal development context.

## Tests

```bash
python ai-service/eval/router_eval.py
```

## Change Log

| Version | Time | Change |
| --- | --- | --- |
| v1.0.0 | 2026-05-31 | Rewrote README with compact eval ownership and dataset boundary. |
