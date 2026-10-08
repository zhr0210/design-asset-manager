# Analysis Report: AI Platform Integration & Fail-Closed Investigation (macOS)

This document presents the detailed findings and implementation design plan for wiring the Platform AI branch status to the UI, realizing real visual analysis, enforcing fail-closed policies, and verifying evidence cache TTL logic on macOS.

---

## 1. Platform AI Action Plan Dynamic UI Wiring (R1)

The system displays the readiness state of AI workflows dynamically in the **Run Console** using the `PlatformAiBranchStatusPanel` component. This panel maps state labels (`依赖缺失`, `证据不足`, `尚未实现`) to actionable next steps via the **Platform AI Action Plan** system.

### UI & Component Layout
- **Target File**: `src/renderer/routes/AiConsolePage.tsx`
- **Panel Component**: `PlatformAiBranchStatusPanel` (defined at line 1933 in `AiConsolePage.tsx`) rendering the active `PlatformAiBranchStatusResponse`.
- **Workflow State Display**: Uses `projectPlatformAiBranchStatusDisplay` (imported from `src/shared/workflows/platform-ai-branch-status.workflow.ts`) to transform raw model readiness and runtime state into human-readable details:
  - **Tone mapping**: `good` for active/ready states, `warn`/`bad` for failures/unsupported platforms, `muted` for insufficient evidence.
  - **Label mapping**: maps status to labels:
    - `evidence_insufficient` → `证据不足`
    - `runtime_probe_ready` → `运行时探测就绪`
    - `ready_to_load` → `可尝试加载`
    - `real_model_path` → `真实模型路径`
    - `dependency_missing` (from model readiness) → `依赖缺失`

### Action Plan Generation & UI Navigation
- **Workflow Logic**: `createPlatformAiActionPlan(workflow)` inside `src/shared/workflows/platform-ai-action-plan.workflow.ts` parses missing requirements and computes the next actionable plan:
  - If `workflow.status === 'real_model_path'` → `kind: 'none'` (Already prepared).
  - If `missing.kind === 'model_artifact'` → `kind: 'open_model_management'` (Label: `管理模型制品`).
  - If `missing.kind === 'backend_configuration'` → `kind: 'open_backend_management'` (Label: `配置推理服务`).
  - If `missing.kind === 'runtime_dependency' || missing.kind === 'runtime_service'` → `kind: 'open_runtime_management'` (Label: `检查运行时与依赖`).
  - Otherwise → `kind: 'refresh_evidence'` (Label: `重新收集状态证据`).
- **UI Event Handling**: Clicking the action button triggers `onAction(kind)` in `AiConsolePage.tsx` (lines 1835-1852):
  ```typescript
  onAction={(kind) => {
    if (kind === 'refresh_evidence') {
      props.onRefreshEvidence()
      return
    }
    if (kind === 'open_model_management') {
      props.setActiveTab('models')
      return
    }
    if (kind === 'open_runtime_management') {
      props.setActiveTab('runtime')
      return
    }
    if (kind === 'open_backend_management') {
      props.setActiveTab('services')
      return
    }
  }}
  ```
- **Llama Setup Trigger**: Under the `models` tab, triggering GGUF setup maps to `startLlamaInstall()` (lines 1259-1300), which fetches the recommended plan and invokes:
  ```typescript
  const status = await api.llamaRuntimeStartInstall({ plan })
  ```

---

## 2. JoyCaption & Deep Visual Analysis Realization (R2)

The prompt reverse (`JoyCaption`) and deep design sweep (`Qwen2.5-VL`) workflows are coordinated by the Electron main process via distinct providers and execute on the Python FastAPI AI Worker.

### Main and Preload Architecture
- **Preload API**: `src/preload/index.ts` exposes:
  - `window.electronAPI.generatePrompt(assetId, filePath)`
  - `window.electronAPI.generateAnalysis(assetId, filePath)`
- **Electron Main Routing**:
  - `generatePrompt` maps to `AiClientService.generatePrompt` which calls `/ai/prompt/generate` on the Python FastAPI service.
  - `generateAnalysis` maps to `AiClientService.generateAnalysis` which calls `/ai/analysis/generate` on the Python FastAPI service.
- **Provider Subprocesses**:
  - For Qwen3-VL/JoyCaption (when local inference is enabled), `AiWorkerManager` uses the `Qwen3VlPromptProvider` (`src/main/services/ai-worker/providers/qwen3vl-prompt.provider.ts`) to spawn python worker script `qwen3vl_prompt_worker.py`.
  - For OpenAI-compatible endpoints (lm-studio / Ollama), the `OpenAiCompatibleProvider` (`src/main/services/ai-worker/providers/openai-compatible.provider.ts`) routes inference to the external HTTP URL configured in the UI.

### Python Worker Implementation & Mock Logic
- **Task Entry Points**:
  - `/ai/prompt/generate` is handled in `ai-service/app.py` and invokes `task_queue.enqueue(task_type="prompt_reverse", ...)` running `reverse_prompt_worker` in background.
  - `/ai/analysis/generate` is handled in `ai-service/app.py` and invokes `task_queue.enqueue(task_type="deep_analysis", ...)` running `deep_analysis_worker` in background.
- **Mock Generation**:
  - **JoyCaption (Prompt Reverse)**: `ai-service/models/joycaption.py` generates dummy captions:
    ```python
    # Under mock policy:
    caption = "A beautiful design asset featuring abstract geometric elements and modern color palette..."
    ```
  - **Qwen-VL (Deep Analysis)**: `ai-service/models/qwen_vl.py` produces mockup design sweeps:
    ```python
    # Under mock policy:
    result = {
        "text_boxes": [{"text": "Sample Title", "box_2d": [100, 100, 200, 300]}],
        "layout_analysis": "The layout is well-structured...",
        "design_style": "Minimalist"
    }
    ```
- **Real Local/External Integration**:
  - If a real local service or OpenAI-compatible backend is selected, it routes requests using the settings configured in the base URL settings (e.g. `http://127.0.0.1:11434/v1` for Ollama).

---

## 3. Fail-Closed Tagging & Translation Fallbacks (R3)

To ensure the production environment does not silently degrade to mock behavior or mask backend failures, the system implements a strict fail-closed policy.

### Strict Real AI Guard
- **Source File**: `ai-service/core/mock_policy.py`
- **Execution Mechanism**:
  ```python
  def is_strict_real_ai() -> bool:
      return os.environ.get("DESIGN_ASSET_MANAGER_STRICT_REAL_AI") == "1"

  def guard_mock_inference(model_name: str) -> None:
      if is_strict_real_ai():
          raise MockInferenceBlockedError(
              f"Mock inference for '{model_name}' is blocked under strict real AI mode."
          )
  ```
- **Tagger Mock Blocker**: If `DESIGN_ASSET_MANAGER_STRICT_REAL_AI` is set, `guard_mock_inference()` throws a `MockInferenceBlockedError` inside the mock routes of `ram_tagger.py`, `florence2_tagger.py`, `clip_design_classifier.py`, and `wd_tagger.py`.

### Translation Fallback Strategy
- **Translation Service**: OPUS-MT (`opus-mt-en-zh`) is handled by `TranslationService` in `ai-service/services/translation_service.py`.
- **Exception Capture & Localization Preservation**:
  - In `TagLocalizationService` (`ai-service/services/tag_localization_service.py`), batch translation failure (including `MockInferenceBlockedError` raised under strict mode when translation weights are missing) is caught safely inside `localize_tags_batch()`:
    ```python
    try:
        translated_texts = t_service.translate_batch(to_translate_texts, source_lang="en", target_lang="zh")
    except Exception as e:
        print(f"[TagLocalizationService] Batch model translation failure: {e}")
        # Mark remaining queued items as fallback title-cased English names
        for orig_idx in to_translate_indices:
            orig_raw = tag_names[orig_idx]
            results[orig_idx] = {
                "tag_name": orig_raw.title(),
                "raw_value": orig_raw,
                "localized_by": "fallback",
                "needs_review": True
            }
    ```
  - This ensures tag processing remains functional (preserving structure, falling back to original English names title-cased, and setting `localized_by: "fallback"`) without masking the translation engine failure.

### Model State Machine Tracking
Each model is tracked and exposes its lifecycle state through the `/ai/model/status` response:
- `loaded`: Boolean indicating if the model weights are loaded into VRAM.
- `is_mock`: Boolean indicating if the model is currently running in mock mode.
- `readiness`: Object detailing model suitability:
  - `state`: `'not_downloaded' | 'downloaded' | 'dependency_missing' | 'load_failed' | 'loaded_real'`
  - `missing_files`: Array of missing weights paths.
  - `missing_dependencies`: Array of missing system/Python packages.

---

## 4. Real AI Evidence Validation (macOS) (R4)

To prevent repetitive high-cost probing of large models or file checks on disk, capability status and evidence checks are cached with a **5-minute TTL**.

### Evidence Probing
- **Source File**: `ai-service/core/macos_ai_capabilities.py`
- **Probe Strategy**: Evaluates Torch MPS compatibility, ONNX Runtime Execution Providers (`CoreMLExecutionProvider`, `CPUExecutionProvider`), and package imports without loading model weights into memory.

### Caching Logic & TTL
The 5-minute TTL caching of evidence checks is implemented in the Electron main process:
1. **Llama Server Multimodal Evidence**:
   - **Target File**: `src/main/services/ai-runtime/llama-multimodal-evidence.store.ts`
   - **TTL Setting**: `const LLAMA_MULTIMODAL_EVIDENCE_TTL_MS = 5 * 60 * 1000` (5 minutes).
   - **Usage**: Probes of multimodal vision capabilities on the local Llama server are cached; `getFreshLlamaMultimodalProbe()` invalidates the cache once `Date.now() - checkedAt > TTL`.
2. **ONNX Model Load Probes**:
   - **Target File**: `src/main/ipc/ai-runtime.ipc.ts`
   - **TTL Setting**: `const ONNX_MODEL_LOAD_EVIDENCE_TTL_MS = 5 * 60 * 1000` (5 minutes).
   - **Usage**: ONNX model loading status queries (like `wd_tagger` and `clip`) are cached in `latestOnnxModelLoadProbes`; `getFreshOnnxModelLoadProbes()` filters out expired records.
