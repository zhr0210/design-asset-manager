# Handoff Report — Platform AI Integration Verification

## 1. Observation

We directly observed and verified the following files, behaviors, and outputs:

### 1.1 Caching and TTL Constants
- In `src/main/ipc/ai-runtime.ipc.ts` (lines 141-142):
  ```typescript
  const latestOnnxModelLoadProbes: Partial<Record<AiRuntimeOnnxModelLoadProbeResponse['modelFamily'], AiRuntimeOnnxModelLoadProbeResponse>> = {}
  const ONNX_MODEL_LOAD_EVIDENCE_TTL_MS = 5 * 60 * 1000
  ```
- In `src/main/services/ai-runtime/llama-multimodal-evidence.store.ts` (lines 3-4):
  ```typescript
  const LLAMA_MULTIMODAL_EVIDENCE_TTL_MS = 5 * 60 * 1000
  let latestLlamaMultimodalProbe: LlamaServerTestResult | null = null
  ```

### 1.2 Strict Mode and Mock Prevention Policy
- In `ai-service/core/mock_policy.py` (lines 8-9):
  ```python
  class MockInferenceBlockedError(RuntimeError):
      """Raised when a model would return simulated output in strict-real-AI mode."""
  ```
- In `ai-service/app.py` (lines 112-116):
  ```python
  if is_strict_real_ai():
      raise HTTPException(
          status_code=501,
          detail="Python PromptWorker mock path is disabled in production. Use the Qwen3-VL Llama/OpenAI-compatible prompt route."
      )
  ```

### 1.3 Test execution results
- Running python unit tests via command `python3 -m unittest discover ai-service/tests` returned:
  ```
  Ran 123 tests in 3.436s
  OK
  ```
- Running Node TS tests via `node scripts/run-ts-test.mjs scripts/platform-ai-cache.test.ts` returned:
  ```
  Running Platform AI Cache & TTL verification tests...
  Platform AI Cache & TTL verification tests PASSED!
  ```
- Running full frontend / backend tests via `npm run ci:governance` succeeded cleanly.

---

## 2. Logic Chain

1. **Test Coverage & Discoverability**: By running the full `npm run ci:governance` suite and the discover command for python unittests, we confirmed that all 123 Python unit tests and TS/JS contract/hygiene test suites run and pass in their entirety.
2. **Strict Mode Blocking Verification**: We wrote and ran `ai-service/tests/test_challenger_strict_endpoints.py`. Under `DESIGN_ASSET_MANAGER_STRICT_REAL_AI=1`, the FastAPI TestClient verified that the endpoints `/ai/prompt/generate` and `/ai/analysis/generate` return a `501 Not Implemented` response and prevent simulated background worker runs.
3. **Translation Fallback Robustness**: When translation models are not loaded and the mock path is restricted, the translation throws `MockInferenceBlockedError`. Our test confirmed that `TagLocalizationService` catches this exception, prevents application crash, and returns the capitalized English word as a safe fallback with `localized_by: "fallback"` and `needs_review: True` (e.g. for tag "completely unseen tag name").
4. **Cache TTL Correctness**: We wrote and ran `scripts/platform-ai-cache.test.ts`. By mocking the `checkedAt` timestamp, we proved that `getFreshLlamaMultimodalProbe()` returns the cached result when queries are within the 5-minute limit, and correctly expires (returning `null`) when the query is 6 minutes or more after creation.

---

## 3. Caveats

- **Persistent VRAM state**: Tests run in clean environments. During live application runtime under VRAM constraints, if multiple heavy models are loaded in memory concurrently, performance may degrade or crash (though `ModelManager` implements keep-alive and mutual exclusion eviction, which are separately covered in unit tests).
- **Physical GPU availability**: The real PyTorch CUDA device and CoreML graph execution could not be verified on the local test runner due to hardware limitations (running macOS arm64/Apple Silicon without NVIDIA CUDA GPUs). However, CPU and mock-prevention paths were fully exercised.

---

## 4. Conclusion

The Platform AI integration implementation is **Empirically Correct** and robust against simulated outputs. Caching logic successfully enforces the 5-minute TTL boundary. Endpoints and services conform fully to the strict-real-AI requirement by blocking mock pathways and employing safe fallback behaviors.

---

## 5. Verification Method

To independently verify these conclusions, execute the following commands in the workspace root directory:

```bash
# 1. Run all Python unit tests (including the new strict-mode endpoints/fallbacks verification)
python3 -m unittest discover ai-service/tests

# 2. Run the platform cache verification tests
node scripts/run-ts-test.mjs scripts/platform-ai-cache.test.ts

# 3. Run full JS/TS governance test suite
npm run ci:governance
```
