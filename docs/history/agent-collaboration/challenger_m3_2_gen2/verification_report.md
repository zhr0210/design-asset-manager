# Platform AI Verification Report

**Date**: 2026-06-08
**Agent**: challenger_2_gen2 (teamwork_preview_challenger)

---

## 1. Executive Summary

This report documents the empirical verification of the TypeScript, React, and Electron main process components for the Platform AI integration, specifically targeting:
- **R1 (Platform AI Action Plan Dynamic UI Wiring)**: Enabling/disabling buttons dynamically based on branch status, missing components, and action plan rules.
- **R4 (Real AI Evidence Validation)**: 5-minute TTL caching of resolved capability probes in the Electron main process to avoid invoking slow Python backend and Llama server probes.
- **IPC Invocation Flow**: Correct mapping between preload API bindings and the Electron main process handlers.
- **JS/TS Unit & Integration Tests**: Verification of all test scripts defined in the package configurations.

All verification steps passed successfully, demonstrating high robustness, consistent platform branch rendering, and proper caching isolation.

---

## 2. 5-Minute TTL Caching Verification (R4)

To prevent performance degradation from repeatedly scanning capability states (e.g., executing slow Python subprocesses or hitting the Llama local endpoints on every page render/refresh), the Electron main process implements a **5-minute (300,000ms) Time-To-Live (TTL) cache** for resolved capability evidence.

### Cache Stores & Eviction Logic
1. **Llama Multimodal Probe Cache**:
   - Location: `src/main/services/ai-runtime/llama-multimodal-evidence.store.ts`
   - Cache Constant: `const LLAMA_MULTIMODAL_EVIDENCE_TTL_MS = 5 * 60 * 1000`
   - Retrieval Function:
     ```typescript
     export function getFreshLlamaMultimodalProbe(now = Date.now()): LlamaMultimodalServerProbeResponse | null {
       if (!latestLlamaMultimodalProbe) return null
       const checkedAt = Date.parse(latestLlamaMultimodalProbe.checkedAt)
       if (!Number.isFinite(checkedAt) || now - checkedAt > LLAMA_MULTIMODAL_EVIDENCE_TTL_MS) return null
       return latestLlamaMultimodalProbe
     }
     ```
   - *Impact*: In-memory cache is read when compiling branch status evidence via `collectModelReadinessEvidence()`, avoiding slow HTTP probing of the llama.cpp server.

2. **ONNX Model Load Cache**:
   - Location: `src/main/ipc/ai-runtime.ipc.ts`
   - Cache Constant: `const ONNX_MODEL_LOAD_EVIDENCE_TTL_MS = 5 * 60 * 1000`
   - Retrieval Function:
     ```typescript
     function getFreshOnnxModelLoadProbes(): AiRuntimeOnnxModelLoadProbeResponse[] {
       return Object.values(latestOnnxModelLoadProbes).filter((probe): probe is AiRuntimeOnnxModelLoadProbeResponse => {
         const checkedAt = Date.parse(probe.checkedAt)
         return Number.isFinite(checkedAt) && Date.now() - checkedAt <= ONNX_MODEL_LOAD_EVIDENCE_TTL_MS
       })
     }
     ```
   - *Impact*: Read from local memory when checking status. The expensive `aiClientService.probeOnnxModelLoad` Python worker HTTP call is bypassed for 5 minutes post-probe.

### Caching Verification via Tests
The TTL eviction logic is explicitly tested and verified in `scripts/llama-runtime-server-probe.test.ts`:
- Mocking a GGUF model capability response cached at a baseline timestamp.
- Asserting that reading the cache at `baseline + 1 minute` returns the cached status (`visionOk: true`).
- Asserting that reading the cache at `baseline + 6 minutes` returns `null` (evicted).
- Verification test execution:
  ```bash
  $ npm run test-llama-runtime-server-probe
  llama-runtime-server-probe passed
  ```

---

## 3. Dynamic UI Action Buttons Verification (R1)

### Status-Driven Actions
In `src/renderer/routes/AiConsolePage.tsx`, the action plan UI panel `PlatformAiBranchStatusPanel` derives its action plan layout dynamically from the workflow status payload:
- **Action plan generator**: `createPlatformAiActionPlan(workflow)` in `src/shared/workflows/platform-ai-action-plan.workflow.ts`.
- **States mapping**:
  - `planned_capability`: Button disabled (label: `尚未实现`).
  - `real_model_path`: Button disabled (label: `真实模型路径已就绪`).
  - `unavailable`: Button disabled (label: `当前平台不支持此分支`).
  - Missing `model_artifact`: Button enabled (label: `下载模型`, triggers `open_model_management`).
  - Missing `backend_configuration`: Button enabled (label: `配置推理服务`, triggers `open_backend_management`).
  - Missing `runtime_dependency` / `runtime_service`: Button enabled (label: `安装依赖`, triggers `open_runtime_management`).

### Disabled Button States in UI Panels
1. **AiConsolePage (Cockpit & Action Plan)**:
   - Action Button:
     ```tsx
     <button type="button" disabled={!workflow.actionPlan.enabled} onClick={...}>
     ```
     Dynamically disables interaction when the action plan is placeholder or unavailable.
   - GGUF Llama Install:
     ```tsx
     <MiniButton tone="primary" onClick={props.startLlamaInstall} disabled={!props.llamaPlan || props.loading['llama-install'] || installInProgress}>
     ```
     Prevents starting an install without a valid plan, or if installation/busy status is true.

2. **Settings (AiRuntimePanel)**:
   - Location: `src/renderer/components/settings/AiRuntimePanel.tsx`
   - Tensor validation buttons (MPS validation, ONNX load validation):
     ```tsx
     <PanelButton onClick={runPythonMpsExecutionProbe} disabled={probingPythonMps} ...>
     <PanelButton onClick={() => runOnnxModelLoadProbe('clip')} disabled={probingClipOnnx} ...>
     ```
     Prevents parallel execution during network/IPC busy states.
   - Active runtime control:
     ```tsx
     <RuntimeButton onClick={onSelect} disabled={busy || active} ...>设为当前</RuntimeButton>
     ```
     Disables selection if already selected (`active`) or during transition/status checking (`busy`).

---

## 4. IPC Invocation Flow Verification

All frontend buttons fire the correct preload Electron APIs, which cleanly map to registered main process IPC handlers:

1. **macOS Dependency Installation**:
   - UI Trigger: Clicking "安装 macOS AI 依赖" or the corresponding action plan button invokes `window.electronAPI.macosAiInstallDeps()`.
   - Preload API: `macosAiInstallDeps: () => ipcRenderer.invoke('macos-ai:install-deps')`
   - Main Process Handler:
     ```typescript
     ipcMain.handle('macos-ai:install-deps', async (event) => { ... })
     ```
     Invokes `ensureMacOSAiPythonRuntime()` and spawns `install_macos_ai_deps.py` under the virtual environment.

2. **OCR EasyOCR Installation**:
   - UI Trigger: Action plan button for `ocr_text_box` invokes `window.electronAPI.ocrInstallEasyOcr()`.
   - Preload API: `ocrInstallEasyOcr: () => ipcRenderer.invoke(CHANNEL_OCR_INSTALL_EASYOCR)`
   - Main Process Handler:
     ```typescript
     ipcMain.handle(CHANNEL_OCR_INSTALL_EASYOCR, async (event) => { ... })
     ```
     Invokes `OcrDependencyService.getInstance().installEasyOcr(event.sender)`.

3. **Llama Runtime Installer**:
   - UI Trigger: Clicking "开始安装" under the Llama panel invokes `window.electronAPI.llamaRuntimeStartInstall({ plan })`.
   - Preload API: `llamaRuntimeStartInstall: (request) => ipcRenderer.invoke(CHANNEL_LLAMA_RUNTIME_START_INSTALL, request)`
   - Main Process Handler:
     ```typescript
     ipcMain.handle(CHANNEL_LLAMA_RUNTIME_START_INSTALL, async (event, request) => { ... })
     ```
     Invokes `LlamaRuntimeInstallService.getInstance().startInstall(request.plan, event.sender)`.

---

## 5. Test Execution Log & Results

All unit, contract, and workflow status display tests were executed and passed successfully.

| Command | Target | Status | Notes |
|---|---|---|---|
| `npm run typecheck` | TypeScript Compiler | **PASSED** | Zero errors. |
| `npm run build` | Webpack build (main & renderer) | **PASSED** | Clean production compilation. |
| `npm run test-platform-ai-branch-status-display` | `scripts/platform-ai-branch-status-display.test.ts` | **PASSED** | Verified correct dynamic layout projection from branch status states. |
| `npm run test-macos-ai-runtime` | `scripts/macos-ai-runtime.test.ts` | **PASSED** | Verified structural compatibility metadata properties. |
| `npm run test-ai-console-macos-branch` | `scripts/ai-console-macos-branch.test.ts` | **PASSED** | Verified AI Console view projections. |
| `npm run test-llama-runtime-server-probe` | `scripts/llama-runtime-server-probe.test.ts` | **PASSED** | Verified 5-minute TTL caching and vision probe response shapes. |
| `npm run test-ai-runtime` | `scripts/ai-runtime-manager.test.ts` | **PASSED** | Verified main process runtime lifecycle states. |

### Verification Script Output Example:
```bash
> design-asset-manager@1.0.0 test-llama-runtime-server-probe
> node scripts/run-ts-test.mjs scripts/llama-runtime-server-probe.test.ts

llama-runtime-server-probe passed
```

---
**Status**: All components verified and fully compliant with project contracts.
