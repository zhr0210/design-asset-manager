# Worker Instructions: Platform AI Integration Tasks

You are the Worker Agent. Your task is to implement the requirements for Platform AI Integration on macOS.

## Working Directory
`<DAM_WORKSPACE>/`

## R1. Platform AI Action Plan Dynamic UI Wiring
- **Files**:
  - `src/renderer/routes/AiConsolePage.tsx`
  - `src/shared/workflows/platform-ai-action-plan.workflow.ts`
- **Requirements**:
  - Update `createPlatformAiActionPlan` in `platform-ai-action-plan.workflow.ts` to return labels like `"下载模型"` or `"安装依赖"` when actions are needed.
  - Map action buttons on cards (e.g. `"下载模型"`, `"安装依赖"`) in `AiConsolePage.tsx` (using `onAction`) to delegate to appropriate installers or pages.
  - Use preload IPC handlers such as `window.electronAPI.llamaRuntimeStartInstall` for prompt reverse gaps, `window.electronAPI.ocrInstallEasyOcr` or `window.electronAPI.macosAiInstallDeps` for dependencies.
  - Disable buttons for `尚未实现` (`planned_capability` status).
  - Ensure UI cards for AI status display active buttons (e.g. `"下载模型"`, `"安装依赖"`) instead of display-only warning text when actions are needed.

## R2. JoyCaption & Deep Visual Analysis Realization
- **Files**:
  - `ai-service/workers/prompt_worker.py`
  - `ai-service/workers/analysis_worker.py`
  - `ai-service/models/joycaption.py`
  - `ai-service/models/qwen_vl.py`
  - `ai-service/app.py`
- **Requirements**:
  - Replace the pure mock endpoints/functions in the Python worker for Prompt Reverse (`JoyCaption`) and Deep Analysis (`Qwen-VL`) with routes to local Llama (OpenAI-compatible) backends.
  - If no real local/external backend is configured, or in strict mode (`DESIGN_ASSET_MANAGER_STRICT_REAL_AI=1`), fail cleanly and throw proper errors (such as `MockInferenceBlockedError` or returning HTTP 501 / error logs) instead of returning templated mock logs.

## R3. Fail-Closed Tagging & Translation Fallbacks
- **Files**:
  - `ai-service/core/mock_policy.py`
  - `ai-service/services/tag_localization_service.py`
  - `ai-service/models/ram_tagger.py`, `ai-service/models/florence2_tagger.py`, `ai-service/models/clip_design_classifier.py`, `ai-service/models/wd_tagger.py` (and similar files)
- **Requirements**:
  - Block silent mock fallbacks in cooperative taggers (`RAM++`, `Florence-2`, `CLIP`, `WD Tagger`) and translation (`OPUS-MT`) under strict mode (`DESIGN_ASSET_MANAGER_STRICT_REAL_AI=1`).
  - Raise `MockInferenceBlockedError` when mock inference is blocked.
  - For translation failures (OPUS-MT), catch the failure, and fallback to title-cased English names with `"localized_by": "fallback"`.
  - Implement a structured model state machine (`not_downloaded`, `downloaded`, `dependency_missing`, `load_failed`, `loaded_real`) for cooperative models to track availability before running inference.

## R4. Real AI Evidence Validation (macOS)
- **Files**:
  - `src/main/services/ai-runtime/llama-multimodal-evidence.store.ts`
  - `src/main/ipc/ai-runtime.ipc.ts`
- **Requirements**:
  - Verify that MPS, ONNX, and Llama GGUF/mmproj checks cache correctly with a 5-minute TTL (`5 * 60 * 1000` ms).
  - Ensure compatibility checking runs real light-weight tensor and model load checks where needed.

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Verification
- Ensure `npm run typecheck` passes without errors.
- Ensure `npm run build` compiles successfully.
- Run Python unittests: `python -m unittest discover ai-service/tests`
- Run other relevant test files to verify.
- Update `TASK.md` when starting and after completing the work.
