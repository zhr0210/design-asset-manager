# Platform AI Integration — Quality & Adversarial Review Report

## Review Summary

**Verdict**: **APPROVE**

The worker agent's changes for Platform AI Integration successfully implement all required behavior:
1. **Dynamic UI Wiring**: Properly projected and wired in `AiConsolePage.tsx` and the shared platform workflow, correctly routing click triggers to preload IPC handlers, and handling planned capabilities.
2. **Completeness of OpenAI-compatible visual routes**: Real endpoints are integrated in `JoyCaption` and `Qwen-VL` utilizing Python's `urllib.request` library, and they fail closed cleanly by raising `MockInferenceBlockedError` in strict mode if execution fails or is not enabled.
3. **Robustness of Strict Mode**: All cooperative taggers and OPUS-MT translation block mock outputs under strict mode, raising `MockInferenceBlockedError`. When translation throws an error, the `TagLocalizationService` falls back gracefully to title-cased English names with `"localized_by": "fallback"`.
4. **Caching Verification**: MPS/ONNX/Llama capability checks are cached with a 5-minute TTL (`ONNX_MODEL_LOAD_EVIDENCE_TTL_MS = 5 * 60 * 1000` and `LLAMA_MULTIMODAL_EVIDENCE_TTL_MS = 5 * 60 * 1000`).
5. **Validation Integrity**: Verified that all checks (`npm run typecheck`, `npm run build`, and `python3 -m unittest discover ai-service/tests`) pass successfully.

---

## Quality Review Findings

### [Minor] Finding 1: Base64 Encoding Memory Usage for JoyCaption/Qwen-VL
- **What**: During prompt generation and VLM visual analysis, visual inputs are read into memory and base64-encoded entirely as raw strings.
- **Where**: `ai-service/models/joycaption.py:20-23` and `ai-service/models/qwen_vl.py:46-49`.
- **Why**: Loading large high-resolution images entirely into memory as base64 string payloads might consume significant RAM when processing concurrent requests.
- **Suggestion**: Consider downscaling/resizing images or streaming them directly to save memory under high concurrency. Since the current desktop app environment has limited concurrency, this is low risk.

---

## Verified Claims

- **Claim 1**: All 123 Python unit tests pass cleanly.
  - *Verified via*: `python3 -m unittest discover ai-service/tests`
  - *Result*: **PASS** (123 tests ran in 3.493s, returning `OK`).
- **Claim 2**: TypeScript files typecheck and the production build completes successfully.
  - *Verified via*: `npm run typecheck` and `npm run build`
  - *Result*: **PASS** (zero compilation errors, Electron-Vite builds successfully).
- **Claim 3**: OPUS-MT blocks mock fallback in strict mode and falls back to title-cased English tag names.
  - *Verified via*: `test_tag_localization_service_fallback_on_blocked_translation` and checking lines 126-135 / 226-236 in `ai-service/services/tag_localization_service.py`.
  - *Result*: **PASS** (raises `MockInferenceBlockedError` during translation and returns title-cased fallback tag name with `"localized_by": "fallback"`).
- **Claim 4**: MPS/ONNX/Llama checks are cached with a 5-minute TTL.
  - *Verified via*: Inspecting `src/main/ipc/ai-runtime.ipc.ts` and `src/main/services/ai-runtime/llama-multimodal-evidence.store.ts`.
  - *Result*: **PASS** (correctly checks `Date.now() - checkedAt <= 300000` before reusing cached probes).

---

## Coverage Gaps

- **Remote Windows Parity Testing** — risk level: **LOW** — recommendation: **accept risk**
  - While Windows CUDA and ONNX workflows are verified on the remote host `DESKTOP-3573AOS` as noted in the task status log, the current execution was run locally on a Mac. Local macOS tests passed, and shared contracts ensure cross-platform compatibility.

---

## Unverified Items

- **Real remote API credentials / actual external model endpoint behavior**
  - *Reason not verified*: Under network-restricted `CODE_ONLY` mode, external calls are prohibited. Real API connections fail closed, triggering the fallback/strict mock block behavior which was successfully verified via local mock blocks.

---

# Adversarial Challenge Report

## Challenge Summary

**Overall risk assessment**: **LOW**

The strict mode implementation is robust, utilizing multiple layers of checks (environment variables + path inspection) to ensure mock outputs do not leak into production. Real visual paths fail closed cleanly.

---

## Challenges

### [Low] Challenge 1: Environment Variable Spoofing
- **Assumption challenged**: Production detection assumes environment variables or path layout are immutable.
- **Attack scenario**: A user setting `DESIGN_ASSET_MANAGER_ALLOW_MOCK_AI=1` in production would bypass the strict mode block, allowing mock fallbacks.
- **Blast radius**: Low. Bypassing strict mode only returns local mock design labels/captions, which is a fallback capability.
- **Mitigation**: The app properly documents this environment variable as a developer override and keeps it disabled by default in compiled builds.

---

## Stress Test Results

- **Scenario 1: strict mode activated via PRODUCTION env var**
  - *Expected behavior*: `is_strict_real_ai()` returns `True`, blocking any mock output.
  - *Actual behavior*: Returns `True`, raises `MockInferenceBlockedError` as expected.
  - *Result*: **PASS**
- **Scenario 2: Helsinki-NLP/opus-mt-en-zh loading failure**
  - *Expected behavior*: Raises `MockInferenceBlockedError` when `is_strict_real_ai()` is enabled.
  - *Actual behavior*: Correctly throws `MockInferenceBlockedError` and does not fall back to mock translation.
  - *Result*: **PASS**

---

## Unchallenged Areas

- **FastAPI / Electron concurrency load** — *reason not challenged*: The application is designed as a single-user local desktop application, making high-concurrency stress testing out of scope.
