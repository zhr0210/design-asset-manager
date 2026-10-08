# Handoff Report

## 1. Observation

- **TypeScript Typecheck & Build**:
  - `npm run typecheck` completed successfully with exit code 0 and no output.
  - `npm run build` completed successfully with exit code 0, building both the Electron main/preload bundles and the React renderer production bundle.
- **TypeScript Path Governance Tests**:
  - Running `node scripts/run-ts-test.mjs scripts/path-governance-late-phases.test.ts` (via npm script `npm run test-path-governance-late-phases`) passed cleanly with exit code 0.
- **Python Runtime version**:
  - System Python version is 3.9 (specifically `Python 3.9.6`).
- **Python capabilities check failure**:
  - Running capabilities test `python3 -m unittest ai-service/tests/test_macos_ai_capabilities.py` outputted:
    ```
    FAIL: test_apple_silicon_full_probe_shape (ai-service.tests.test_macos_ai_capabilities.TestMacOSAiCapabilities)
    ----------------------------------------------------------------------
    Traceback (most recent call last):
      File "<DAM_WORKSPACE>/ai-service/tests/test_macos_ai_capabilities.py", line 61, in test_apple_silicon_full_probe_shape
        self.assertTrue(result["mlx"]["available"])
    AssertionError: False is not true
    ```
- **ModelManager PEP 604 Type union runtime error**:
  - Importing `ModelManager` on Python 3.9 (e.g. running `python3 -c "import sys; sys.path.insert(0, 'ai-service'); from core.model_manager import ModelManager"`) failed with:
    ```
    Traceback (most recent call last):
      File "<string>", line 1, in <module>
      File "<DAM_WORKSPACE>/ai-service/core/model_manager.py", line 23, in <module>
        class ModelManager:
      File "<DAM_WORKSPACE>/ai-service/core/model_manager.py", line 24, in ModelManager
        _executor: concurrent.futures.ThreadPoolExecutor | None = None
    TypeError: unsupported operand type(s) for |: 'type' and 'NoneType'
    ```

## 2. Logic Chain

- **Route A correctness**:
  - Static type checking (`npm run typecheck`) and compilation/bundle check (`npm run build`) pass cleanly, showing no type conflicts or bundle errors on Route A's preload and shared types interfaces.
  - Path governance rules successfully evaluate as verified by the silent pass of `path-governance-late-phases.test.ts`.
- **Route B capability mock mismatch**:
  - In `ai-service/core/macos_ai_capabilities.py`, `_probe_mlx` attempts to import `"mlx"` via `import_module("mlx")`.
  - In `ai-service/tests/test_macos_ai_capabilities.py` line 45, the fake import map provides `"mlx.core": mlx` but does not map `"mlx"`.
  - Thus, the capabilities probe throws `ModuleNotFoundError` for `"mlx"`, setting its availability status to `False`, failing the test's `self.assertTrue(result["mlx"]["available"])` assertion at line 61.
- **Route B Python 3.9 syntax crash**:
  - `ai-service/core/model_manager.py` uses the `|` PEP 604 syntax for type union (e.g. `_executor: concurrent.futures.ThreadPoolExecutor | None = None` at line 24).
  - At runtime, Python 3.9 evaluates type annotations immediately and does not support the `|` operator for types.
  - No `from __future__ import annotations` directive is present at the beginning of `ai-service/core/model_manager.py` to defer evaluation.
  - Therefore, any module that imports `ModelManager` (including 6 unit test files) crashes at import time with a `TypeError`.

## 3. Caveats

- **No physical weight downloads**: Since the environment restricts network access to local code and resources (`CODE_ONLY` network mode), we could not test downloads or actual inference runs of Hugging Face weights (e.g. Florence-2, RAM++, CLIP, WD14). Verification of those modules was limited to capability status checks and mock-fallback execution.

## 4. Conclusion

- **Route A**: Fully correct, compile-clean, and governance-compliant.
- **Route B**: Blocked under macOS default CLI Python environments (v3.9.x) due to the fatal type union syntax evaluation crash in `ModelManager`. Additionally, the capability unit tests contain a mock mismatch bug for MLX module resolution.

## 5. Verification Method

To independently reproduce the verification results, execute the following commands in the project workspace root:

1. **Verify Route A Typecheck & Build**:
   ```bash
   npm run typecheck
   npm run build
   ```
2. **Verify TypeScript Path Governance Unit Tests**:
   ```bash
   npm run test-path-governance-late-phases
   ```
3. **Verify MLX Capabilities Test Failure**:
   ```bash
   python3 -m unittest ai-service/tests/test_macos_ai_capabilities.py
   ```
4. **Verify ModelManager Import Crash under Python 3.9**:
   ```bash
   python3 -c "import sys; sys.path.insert(0, 'ai-service'); from core.model_manager import ModelManager"
   ```
