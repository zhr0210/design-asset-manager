# Adversarial Review & Challenge Report — Platform AI Integration Verification

## Challenge Summary

**Overall risk assessment**: LOW

All verification checks confirm that the Platform AI integration matches structural, functional, and safety constraints. We have successfully:
1. Executed all 123 Python unit tests and all TS/JS governance and contract tests with a 100% pass rate.
2. Verified that when `DESIGN_ASSET_MANAGER_STRICT_REAL_AI=1` is set, the Python service actively blocks mock inference outputs, raises `MockInferenceBlockedError` for offline model loading, blocks mock endpoint generation routes, and gracefully handles localization translation fallbacks.
3. Verified the 5-minute TTL cache logic for both Llama multimodal probes and ONNX model-load probes, ensuring subsequent checks resolve from memory within 5 minutes.

---

## Challenges

### [Low] Challenge 1: Local In-Memory Cache Persistence Across Main Process Restarts

- **Assumption challenged**: The cache for `latestOnnxModelLoadProbes` and `latestLlamaMultimodalProbe` in the Electron main process is persistent during operational sync.
- **Attack scenario**: If the Electron main process crashes or restarts (which can happen under intense VRAM pressure or GPU memory thrashing), the in-memory cache is lost. Probes will fall back to cold-start evaluations, which can cause lag or temporary status degradation to `证据不足` or `依赖缺失` on the first user action.
- **Blast radius**: Low. The frontend will trigger a background capability check when needed, reverting back to a correct state, but user-visible latency will spike during the cold-start check.
- **Mitigation**: Persist validated model capabilities/probes in the local SQLite configuration database with the timestamp, so cache survival is immune to process crashes/restarts.

### [Low] Challenge 2: Network Restriction Mock Failures under Strict Mode

- **Assumption challenged**: A developer has downloaded all necessary weights before launching the application in strict mode.
- **Attack scenario**: If any weight file is corrupted or incomplete (e.g., in-progress download or partial segment), the PyTorch or ONNX loaders will fail to initialize. In strict mode, mock fallbacks are blocked, so the tagging or translation workflow will immediately throw `MockInferenceBlockedError`, halting operations.
- **Blast radius**: Medium. User tagging tasks will fail with terminal error states in the SQLite task queue.
- **Mitigation**: Gracefully handle initialization failures by prompting the user to resume downloads in the UI instead of throwing terminal backend errors that halt the tag queue execution.

---

## Stress Test Results

### 1. Endpoint Mock Blocking under Strict Mode
- **Scenario**: Send a post request to `/ai/prompt/generate` with `DESIGN_ASSET_MANAGER_STRICT_REAL_AI=1`.
- **Expected behavior**: Returns HTTP 501 with detail: `"Python PromptWorker mock path is disabled in production. Use the Qwen3-VL Llama/OpenAI-compatible prompt route."`
- **Actual behavior**: Returned HTTP 501 exactly as expected.
- **Result**: PASS

### 2. Analysis Blocking under Strict Mode
- **Scenario**: Send a post request to `/ai/analysis/generate` with `DESIGN_ASSET_MANAGER_STRICT_REAL_AI=1`.
- **Expected behavior**: Returns HTTP 501 with detail: `"Python AnalysisWorker mock path is disabled in production. Use a real VLM analysis backend."`
- **Actual behavior**: Returned HTTP 501 exactly as expected.
- **Result**: PASS

### 3. Pydantic Request Body Validation
- **Scenario**: Post an invalid/empty body to `/ai/tag/enqueue` under strict mode.
- **Expected behavior**: FastAPI returns HTTP 422 validation error.
- **Actual behavior**: Returned HTTP 422.
- **Result**: PASS

### 4. Cache Expiration TTL (Llama Multimodal Probe)
- **Scenario**: Query `getFreshLlamaMultimodalProbe()` after exactly 6 minutes.
- **Expected behavior**: Returns `null` (expired).
- **Actual behavior**: Returned `null`.
- **Result**: PASS

### 5. Cache Retrieval TTL (Llama Multimodal Probe)
- **Scenario**: Query `getFreshLlamaMultimodalProbe()` after exactly 4 minutes.
- **Expected behavior**: Returns the cached `LlamaServerTestResult`.
- **Actual behavior**: Returned the cached result successfully.
- **Result**: PASS

### 6. Translation Service Fallback in Strict Mode
- **Scenario**: Localize an unseen tag name when the real Helsinki-NLP translation model is missing under strict mode.
- **Expected behavior**: Mock translation is blocked, causing `MockInferenceBlockedError` in `TranslationService`. `TagLocalizationService` catches this, returns capitalized English word, sets `localized_by` to `"fallback"`, and sets `needs_review` to `True`.
- **Actual behavior**: Returned localized tag as `"Completely Unseen Tag Name"` with `localized_by: "fallback"` and `needs_review: true`.
- **Result**: PASS

---

## Unchallenged Areas

- **Platform-Specific Entitlements & DMG Packaging Code** — Out of scope for this runtime/caching review.
- **Packaged Native CUDA Executions** — Insufficient context / CUDA GPU hardware not available on this macOS host.
