# AI Utils

Shared Python helpers for preprocessing, tag cleanup, translation, localization, and prompt formatting.

## Entry Files

- `image_preprocess.py`: image preparation.
- `tag_cleaner.py`, `tag_source_normalizer.py`, `tag_fusion.py`: tag cleanup and fusion.
- `translation_service` helpers and dictionaries: translation support.
- `ocr_tag_extractor.py`: OCR tag extraction helper.

## Rules

- 可在获批目标内修改tag_fusion.py；保持标签归一/融合契约、人工确认优先与调用方兼容，运行相关行为回归，不设文件级禁改。
- Keep helpers deterministic and covered by AI service tests.

## Tests

```bash
python -m unittest discover ai-service/tests
```

## Change Log

| Version | Time | Change |
| --- | --- | --- |
| v1.0.0 | 2026-05-31 | Rewrote README with compact utility ownership and protected-file rule. |
