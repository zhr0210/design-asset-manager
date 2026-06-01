# AI Models

Model wrappers used by AI workers.

## Entry Files

- `wd_tagger.py`: WD tagger.
- `florence2_tagger.py`: Florence-2 tagging.
- `joycaption.py`: caption and prompt model.
- `qwen_vl.py`: vision-language analysis.
- `visual_router.py` and related router files: model routing.
- `legacy/`: inactive legacy wrappers.

## Rules

- Do not move active model files without compatibility imports.
- Do not read or modify model weights or cache folders by default.

## Tests

```bash
python -m unittest discover ai-service/tests
```

## Change Log

| Version | Time | Change |
| --- | --- | --- |
| v1.0.0 | 2026-05-31 | Rewrote README with compact model map and cache boundary. |
