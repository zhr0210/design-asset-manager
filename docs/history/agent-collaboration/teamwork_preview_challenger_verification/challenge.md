## Challenge Summary

**Overall risk assessment**: CRITICAL (due to Python 3.9 type union runtime crashes in `ModelManager` and mock capabilities import mismatch)

## Challenges

### [Critical] Python 3.9 Runtime Type Compatibility Crash in ModelManager

- **Assumption challenged**: The codebase assumes a Python 3.10+ execution environment for the Python AI service, or assumes that PEP 604 type unions (`A | B`) are supported at runtime in older environments without delayed evaluation.
- **Attack scenario**: When starting the AI service or running unit tests (e.g. `test_cooperative_tagger.py`, `test_ram_tagger.py`, `test_ai_worker.py`, `test_florence2_tagger.py`, `test_translation_service.py`, and `test_pipeline_defaults.py`) in environments with the default macOS CLI runtime (`Python 3.9.6`), the interpreter triggers a fatal `TypeError` during import:
  ```
  File "<DAM_WORKSPACE>/ai-service/core/model_manager.py", line 24, in ModelManager
      _executor: concurrent.futures.ThreadPoolExecutor | None = None
  TypeError: unsupported operand type(s) for |: 'type' and 'NoneType'
  ```
- **Blast radius**: The entire Python FastAPI AI Worker fails to start on macOS machines running default system Python (3.9.x). This blocks 6 out of the 13 python unit test files.
- **Mitigation**: Add `from __future__ import annotations` as the first line of `ai-service/core/model_manager.py` to delay type annotation evaluation, or refactor the union types to use `typing.Union` / `typing.Optional`.

### [Medium] MLX Mock Import Mismatch in test_macos_ai_capabilities.py

- **Assumption challenged**: The capabilities probe unit tests assume the mock capability mapping maps `"mlx.core"`, whereas the implementation code attempts to import `"mlx"`.
- **Attack scenario**: `test_apple_silicon_full_probe_shape` fails during assertions:
  ```
  FAIL: test_apple_silicon_full_probe_shape (ai-service.tests.test_macos_ai_capabilities.TestMacOSAiCapabilities)
  ----------------------------------------------------------------------
  Traceback (most recent call last):
    File "<DAM_WORKSPACE>/ai-service/tests/test_macos_ai_capabilities.py", line 61, in test_apple_silicon_full_probe_shape
      self.assertTrue(result["mlx"]["available"])
  AssertionError: False is not true
  ```
  This happens because `probe_macos_ai_capabilities` in `core/macos_ai_capabilities.py` performs `_try_import("mlx", import_module)`, but the test provides a fake import dictionary mapping only `"mlx.core"`.
- **Blast radius**: The capabilities test suite fails consistently.
- **Mitigation**: Update the fake import map in `test_macos_ai_capabilities.py` to map `"mlx"` to the mock, or update the capability probe code to fall back to `"mlx.core"` if `"mlx"` is not importable.

## Stress Test Results

| Scenario / Command | Expected Behavior | Actual Behavior | Pass / Fail |
|---|---|---|---|
| `npm run typecheck` | TypeScript compiler completes without type errors | Exit code 0, no type errors | **PASS** |
| `npm run build` | Application builds cleanly (main, preload, renderer) | Exit code 0, build succeeds, dynamic import warnings reported | **PASS** |
| `node scripts/run-ts-test.mjs scripts/path-governance-late-phases.test.ts` (path-governance) | TypeScript path governance assertions verify | Exit code 0, clean silent pass | **PASS** |
| `python3 -m unittest ai-service/tests/test_python_mps_compat.py` | PyTorch MPS compatibility checks verify | Exit code 0, tests pass | **PASS** |
| `python3 -m unittest ai-service/tests/test_clip_siglip_onnx_compat.py` | CLIP/SigLIP ONNX compatibility checks verify | Exit code 0, tests pass | **PASS** |
| `python3 -m unittest ai-service/tests/test_florence_semantic_router.py` | Florence-2 semantic routing rules verify | Exit code 0, tests pass | **PASS** |
| `python3 -m unittest ai-service/tests/test_ocr_tag_extractor.py` | OCR tag extraction and sanitization verify | Exit code 0, tests pass | **PASS** |
| `python3 -m unittest ai-service/tests/test_tag_localization_service.py` | Tag localization translations verify | Exit code 0, tests pass | **PASS** |
| `python3 -m unittest ai-service/tests/test_macos_ai_capabilities.py` | macOS capabilities probe verifies | Exit code 1, `test_apple_silicon_full_probe_shape` fails on MLX assertion | **FAIL** |
| `python3 -m unittest ai-service/tests/test_cooperative_tagger.py` | Cooperative model routing & fusion tests run | Crashes at import-time due to PEP 604 union syntax in `model_manager.py` | **CRASH** |
| `python3 -m unittest ai-service/tests/test_ram_tagger.py` | RAM tagger mock/real checks run | Crashes at import-time due to PEP 604 union syntax in `model_manager.py` | **CRASH** |
| `python3 -m unittest ai-service/tests/test_ai_worker.py` | AI worker task queue loops verify | Crashes at import-time due to PEP 604 union syntax in `model_manager.py` | **CRASH** |
| `python3 -m unittest ai-service/tests/test_florence2_tagger.py` | Florence-2 tagger mock/real checks run | Crashes at import-time due to PEP 604 union syntax in `model_manager.py` | **CRASH** |
| `python3 -m unittest ai-service/tests/test_translation_service.py` | Translation service mock/real checks run | Crashes at import-time due to PEP 604 union syntax in `model_manager.py` | **CRASH** |
| `python3 -m unittest ai-service/tests/test_pipeline_defaults.py` | Tag pipeline defaults verify | Crashes at import-time due to PEP 604 union syntax in `model_manager.py` | **CRASH** |

## Unchallenged Areas

- **Real model weight loading**: Physical model weight binaries for RAM++, Florence-2, CLIP/SigLIP, and WD14 were not loaded because the environment operates in `CODE_ONLY` network mode, preventing downloading of real assets from Hugging Face. Unit tests were evaluated under mock fallbacks.
