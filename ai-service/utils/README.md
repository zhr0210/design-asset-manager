# AI Utils

Shared Python helpers for preprocessing, tag cleanup, translation, localization, and prompt formatting.

## Entry Files

- `image_preprocess.py`: image preparation.
- `tag_cleaner.py`, `tag_source_normalizer.py`, `tag_fusion.py`: tag cleanup and fusion.
- `translation_service` helpers and dictionaries: translation support.
- `ocr_tag_extractor.py`: OCR tag extraction helper.

## Rules

- Treat `tag_fusion.py` as protected.
- Keep helpers deterministic and covered by AI service tests.

## Tests

```bash
python -m unittest discover ai-service/tests
```

## Change Log

| Version | Time | Change |
| --- | --- | --- |
| v1.0.0 | 2026-05-31 | Rewrote README with compact utility ownership and protected-file rule. |
