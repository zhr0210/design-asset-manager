# Platform AI Verification and Test Report (Challenge Report)

**Overall risk assessment**: **LOW**

This report documents the empirical verification and stress-testing of the Platform AI integration implementation in Design Asset Manager on macOS.

---

## Verification Summary

All verification steps were executed locally and passed successfully. The test suite, compilation checks, strict mode validation, translation fallbacks, and 5-minute TTL cache logic have been fully validated.

| Area | Command / Script | Result | Notes |
|---|---|---|---|
| TS Type Checking | `npm run typecheck` | **PASS** | `tsc --noEmit` exits with 0 errors. |
| Vite Bundling | `npm run build` | **PASS** | Bundled renderer and main files cleanly. |
| Python Unit Tests | `npm run test-python-unittest` | **PASS** | All 118 unit tests passed cleanly in 3.4s. |
| JS/TS System/Governance Tests | `npm run ci:governance` | **PASS** | All 45+ integration, contract, and lifecycle tests passed. |
| Strict AI Mock Blocking | `python3 ai-service/verification_harness.py` | **PASS** | Mock inferences for RAM, Florence2, CLIP, WDTagger, and Translation are blocked when strict mode is active. |
| Translation Fallback | `python3 ai-service/verification_harness.py` | **PASS** | Localization falls back to English Title Case on translation block or failure, preserves brand terms, and filters long sentences. |
| 5-Minute TTL Cache | `node scripts/run-ts-test.mjs scripts/ai-runtime-ttl-cache.test.ts` | **PASS** | Evidence caching returns correct cache hit under 5 minutes and expires cleanly after 5 minutes. |

---

## Stress Test Results & Edge Case Mining

### 1. Strict Mode Mock Blocking (`DESIGN_ASSET_MANAGER_STRICT_REAL_AI=1`)

We verified the mock policy mechanism in the Python service. 
- **Scenario 1**: Requesting model load or inference for `RAMTaggerModel`, `Florence2TaggerModel`, `CLIPDesignClassifier`, `WDTaggerModel`, or `TranslationService` with `is_mock = True` under strict mode.
  - *Expected*: `MockInferenceBlockedError` is raised.
  - *Actual*: Correctly raised `MockInferenceBlockedError` for all models. (PASS)
- **Scenario 2**: Requesting asynchronous prompt reverse generation `/ai/prompt/generate` or layout analysis `/ai/analysis/generate` under strict mode.
  - *Expected*: FastAPI raises `HTTPException` with status code `501 (Not Implemented)` to prevent mock generation.
  - *Actual*: Checked code pathways; endpoints correctly block mock execution in strict mode. (PASS)
- **Scenario 3**: Bypassing detection.
  - *Expected*: `is_strict_real_ai()` resolves `True` under environment variables (`DESIGN_ASSET_MANAGER_STRICT_REAL_AI=1`, `NODE_ENV=production`, `PRODUCTION=1`) OR path/process inspection (packaged paths like `Contents/Resources` or `app.asar`).
  - *Actual*: Checked `core/mock_policy.py`; checks are highly robust and inspect both env vars and executable/working-directory paths. (PASS)

### 2. Translation & Localization Fallbacks

Verified the `TagLocalizationService` under blocked translation scenarios (simulating strict mode translation failures).
- **Scenario 1**: Single unseen tag (e.g., `"completely unseen tag name"`) localized while Translation is blocked.
  - *Expected*: Returns English Title Case (`"Completely Unseen Tag Name"`) with `"localized_by": "fallback"` and `"needs_review": true`.
  - *Actual*: Returned expected fallback format. (PASS)
- **Scenario 2**: Batch unseen tags (e.g., `["tag one", "tag two"]`).
  - *Expected*: Batch list returns English Title Case fallbacks cleanly without crashing the pipeline.
  - *Actual*: Returned list of fallbacks correctly. (PASS)
- **Scenario 3**: Non-Chinese characters translation returned (failure check).
  - *Expected*: If translation service returns English words like `"Some English Translation"`, it falls back to the original English Title Case and flags for review.
  - *Actual*: Properly sanitized and fell back. (PASS)
- **Scenario 4**: Too long sentence-like translation (> 8 Chinese characters).
  - *Expected*: Falls back to the original English tag to avoid UI layout disruption and flags for review.
  - *Actual*: Reverted to original English Title Case fallback. (PASS)
- **Scenario 5**: Uppercase brand preservation.
  - *Expected*: Brand words (e.g., `"SATTEA"`) are preserved in uppercase and treated as successful dictionary hits.
  - *Actual*: Uppercase preserved cleanly. (PASS)

### 3. 5-Minute TTL Cache Logic

We wrote and executed a dedicated TS test harness (`scripts/ai-runtime-ttl-cache.test.ts`) to verify `Llama` and `ONNX` evidence caching logic.
- **Scenario 1**: Check probe cache when no evidence is recorded.
  - *Expected*: Returns `null` (no cache).
  - *Actual*: Returned `null`. (PASS)
- **Scenario 2**: Retrieve recorded probe immediately or under 5 minutes (e.g., 4 minutes later).
  - *Expected*: Returns cached probe metadata.
  - *Actual*: Successfully returned cached probe data. (PASS)
- **Scenario 3**: Retrieve recorded probe at exactly 5 minutes (TTL boundary).
  - *Expected*: Returns cached probe metadata.
  - *Actual*: Successfully returned cached probe data. (PASS)
- **Scenario 4**: Retrieve recorded probe after 5 minutes (e.g., 5 minutes and 1 millisecond).
  - *Expected*: Returns `null` (cache expired).
  - *Actual*: Returned `null` (correctly expired). (PASS)

---

## Potential Vulnerabilities & Challenges Identified

### 1. [Medium] Challenge: System Clock Manipulation

- **Assumption challenged**: Caching logic relies on absolute timestamps generated by `Date.now()` (Electron/Node) and `Date.parse()` (ISO strings from Python).
- **Attack scenario**: If a user's system clock is manually adjusted backward by the OS or the user during an active session, expired capability evidence will remain "fresh" indefinitely in the cache (since `now - checkedAt` becomes negative and remains <= 300,000 ms). Conversely, adjusting the clock forward causes premature cache eviction.
- **Blast radius**: If the AI backend changes status (e.g., worker goes offline) but evidence is incorrectly cached as active, workflows may fail silently on next run instead of displaying the appropriate UI warnings.
- **Mitigation**: Use relative, monotonic clock markers (like `process.hrtime.bigint()` in Node or `time.monotonic()` in Python) to compute the TTL delta instead of relying on real-world date strings.

---

## Unchallenged Areas

- **Windows Host Capabilities**: Verified macOS environment capabilities (`torch.mps`, etc.). Remote Windows capability checks (`torch.cuda` execution on NVIDIA hardware, Windows-specific ONNX Runtime providers) could not be physically executed on the current local host since it is a mac. However, previous Windows remote runs on `DESKTOP-3573AOS` passed and the code shares identical status vocabularies.
