# Handoff Report

## 1. Observation

- **Project Tests Output**:
  - Command: `npm run typecheck`
    Result: Clean type-checking of all renderer, preload, main process files without errors.
  - Command: `npm run build`
    Result: Clean webpack build of main and renderer bundles without compile-time errors.
  - Command: `npm run test-platform-ai-branch-status-display`
    Result: Passed without errors.
  - Command: `npm run test-macos-ai-runtime`
    Result: Passed without errors.
  - Command: `npm run test-ai-console-macos-branch`
    Result: Passed without errors.
  - Command: `npm run test-llama-runtime-server-probe`
    Result:
    ```
    > design-asset-manager@1.0.0 test-llama-runtime-server-probe
    > node scripts/run-ts-test.mjs scripts/llama-runtime-server-probe.test.ts

    llama-runtime-server-probe passed
    ```
  - Command: `npm run test-ai-runtime`
    Result: Passed without errors.

- **Caching Code Locations**:
  - `src/main/services/ai-runtime/llama-multimodal-evidence.store.ts`:
    - Constant: `const LLAMA_MULTIMODAL_EVIDENCE_TTL_MS = 5 * 60 * 1000`
    - Caching logic:
      ```typescript
      export function getFreshLlamaMultimodalProbe(now = Date.now()): LlamaMultimodalServerProbeResponse | null {
        if (!latestLlamaMultimodalProbe) return null
        const checkedAt = Date.parse(latestLlamaMultimodalProbe.checkedAt)
        if (!Number.isFinite(checkedAt) || now - checkedAt > LLAMA_MULTIMODAL_EVIDENCE_TTL_MS) return null
        return latestLlamaMultimodalProbe
      }
      ```
  - `src/main/ipc/ai-runtime.ipc.ts`:
    - Constant: `const ONNX_MODEL_LOAD_EVIDENCE_TTL_MS = 5 * 60 * 1000`
    - Caching logic:
      ```typescript
      function getFreshOnnxModelLoadProbes(): AiRuntimeOnnxModelLoadProbeResponse[] {
        return Object.values(latestOnnxModelLoadProbes).filter((probe): probe is AiRuntimeOnnxModelLoadProbeResponse => {
          const checkedAt = Date.parse(probe.checkedAt)
          return Number.isFinite(checkedAt) && Date.now() - checkedAt <= ONNX_MODEL_LOAD_EVIDENCE_TTL_MS
        })
      }
      ```

- **Dynamic UI Control**:
  - In `src/shared/workflows/platform-ai-action-plan.workflow.ts`:
    - Returns `enabled: false` and label for `planned_capability`, `real_model_path`, and `unavailable`.
    - Returns `enabled: true` and actionable label (e.g. `'安装依赖'`) for missing runtime dependencies.
  - In `src/renderer/routes/AiConsolePage.tsx`:
    - Cockpit Action Button:
      ```tsx
      disabled={!workflow.actionPlan.enabled}
      ```
    - GGUF Llama Installer button:
      ```tsx
      disabled={!props.llamaPlan || props.loading['llama-install'] || installInProgress}
      ```
  - In `src/renderer/components/settings/AiRuntimePanel.tsx`:
    - Action buttons:
      ```tsx
      <PanelButton onClick={runPythonMpsExecutionProbe} disabled={probingPythonMps} ...>
      <RuntimeButton onClick={onSelect} disabled={busy || active} ...>设为当前</RuntimeButton>
      ```

- **IPC API Mappings**:
  - Preload `src/preload/index.ts`:
    - `macosAiInstallDeps: () => ipcRenderer.invoke('macos-ai:install-deps')`
    - `ocrInstallEasyOcr: () => ipcRenderer.invoke(CHANNEL_OCR_INSTALL_EASYOCR)`
    - `llamaRuntimeStartInstall: (request) => ipcRenderer.invoke(CHANNEL_LLAMA_RUNTIME_START_INSTALL, request)`
  - Main Process Handlers:
    - `'macos-ai:install-deps'` in `src/main/ipc/ai-worker.ipc.ts`
    - `CHANNEL_OCR_INSTALL_EASYOCR` in `src/main/ipc/ocr.ipc.ts`
    - `CHANNEL_LLAMA_RUNTIME_START_INSTALL` in `src/main/ipc/llama-runtime.ipc.ts`

---

## 2. Logic Chain

1. **TTL Caching Validation**:
   - The memory stores read from local arrays/records (`latestOnnxModelLoadProbes` and `latestLlamaMultimodalProbe`).
   - Eviction checks compare the current timestamp against the probe's `checkedAt` timestamp.
   - If the difference exceeds `5 * 60 * 1000` ms (5 minutes), `getFresh*` returns `null`, forcing a fresh probe on subsequent scans. Otherwise, it returns the cached result, which avoids invoking slow Python or local HTTP server probes.
   - Therefore, the 5-minute TTL caching of capability probes is correctly implemented and works as expected.

2. **UI Button State Validation**:
   - `workflow.actionPlan.enabled` determines the `disabled` prop of action buttons.
   - The `createPlatformAiActionPlan` function explicitly controls `enabled` based on the status (enabled only for actionable missing items like download or dependency install).
   - This ensures buttons are dynamically enabled/disabled in the Cockpit/Console based on specific capability requirements.

3. **IPC Invocation Validation**:
   - UI buttons invoke the functions defined on `window.electronAPI`.
   - The preload script maps these properties directly to standard `ipcRenderer.invoke` calls.
   - Main process `ipcMain.handle` registers listeners on matching channels to route requests to backend service managers (e.g. `LlamaRuntimeInstallService` and `OcrDependencyService`).
   - This completes the clean, end-to-end frontend-to-backend wiring.

---

## 3. Caveats

- Operating System: macOS. Hardware-specific execution lanes (like Windows CUDA setup) were verified via static analysis, type checking, and unit test suites, but actual Windows execution was not natively run.
- External dependencies (like `pip install` commands) are mocked in unit tests to prevent network access during verification.

---

## 4. Conclusion

The Platform AI integration implementation is fully compliant with specifications. All dynamic action buttons are correctly disabled/enabled based on capability states, caching avoids redundant backend probe queries for exactly 5 minutes, and IPC flows are properly wired end-to-end.

---

## 5. Verification Method

To verify the test suite:
```bash
npm run typecheck
npm run build
npm run test-platform-ai-branch-status-display
npm run test-macos-ai-runtime
npm run test-ai-console-macos-branch
npm run test-llama-runtime-server-probe
npm run test-ai-runtime
```

Inspect these files:
- Cache settings: `src/main/ipc/ai-runtime.ipc.ts` and `src/main/services/ai-runtime/llama-multimodal-evidence.store.ts`
- Preload API bindings: `src/preload/index.ts`
- Page components: `src/renderer/routes/AiConsolePage.tsx` and `src/renderer/components/settings/AiRuntimePanel.tsx`
