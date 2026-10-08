# Handoff Report

## 1. Observation

During the investigation of the `design-asset-manager` codebase, the following locations and contents were observed:

### A. Action Plan Projection
* In `src/main/services/ai-runtime/platform-ai-branch-status.projector.ts`, `createPlatformAiBranchStatus` evaluates platform-specific capabilities and models:
  ```ts
  export function createPlatformAiBranchStatus(input: PlatformAiBranchStatusProjectorInput): PlatformAiBranchStatusResponse {
    const platformBranch = input.platformBranch;
    // ... maps lanes ...
    // ... computes workflow status ...
  }
  ```
* In `src/renderer/routes/AiConsolePage.tsx`:
  ```tsx
  const onAction = (kind: PlatformAiActionPlanKind) => {
    if (kind === 'open_model_management') {
      props.setActiveTab('models')
      return
    }
    if (kind === 'open_runtime_management') {
      props.setActiveTab('runtime')
      return
    }
    // ...
  }
  ```

### B. MPS Caching Gap
* In `src/main/ipc/ai-runtime.ipc.ts`:
  * ONNX probe caching is implemented via `latestOnnxModelLoadProbe` and `ONNX_MODEL_LOAD_EVIDENCE_TTL_MS = 5 * 60 * 1000` (5 minutes).
  * The MPS execution probe is registered as `CHANNEL_AI_RUNTIME_PROBE_PYTHON_MPS_EXECUTION` but lacks any caching variable or TTL check:
    ```ts
    ipcMain.handle(CHANNEL_AI_RUNTIME_PROBE_PYTHON_MPS_EXECUTION, async () => {
      try {
        const result = await aiClientService.probePythonMpsExecution()
        return success(result)
      } catch (err) {
        // ...
      }
    })
    ```

### C. Qwen3-VL Path & Incomplete Download Checks
* In `src/main/services/llama-runtime/llama-runtime-local-models.ts` (lines 7–21):
  ```ts
  export function getDownloadedArtifactState(filePath: string): 'missing' | 'downloading' | 'downloaded' {
    if (!filePath || !fs.existsSync(filePath)) {
      return 'missing'
    }

    if (fs.existsSync(`${filePath}.aria2`)) {
      return 'downloading'
    }

    try {
      return fs.statSync(filePath).size > 0 ? 'downloaded' : 'missing'
    } catch {
      return 'missing'
    }
  }
  ```

### D. MLX Experimental Route
* MLX capability is defined in `src/shared/constants/macos-ai-runtime.constants.ts` (line 70) as `planned`, and checked in Python via `_probe_mlx()` in `ai-service/core/macos_ai_capabilities.py` (lines 145–158) by trying to import `mlx`. No actual MLX inference worker exists.

### E. Windows Parity Gap
* The python service has `macos_ai_capabilities.py` but has no Windows capability probe, nor direct endpoints for CUDA status check/execution probes.

### F. Test Execution
* Runs of `npm run typecheck`, `npm run test-python-unittest`, and `npm run ci:test-runtime-safety` all succeeded without errors.

---

## 2. Logic Chain

1. **Mapping Actions (R1)**: Since `PlatformAiMissingRequirement` defines missing requirements like `runtime_dependency`, `model_artifact`, and `runtime_service`, and these align directly with UI tabs for packages, models, and servers respectively, we can map them to setup tasks (`install_dependencies`, `download_model_artifact`, `start_runtime`) that invoke the corresponding IPC flows. The UI tab switching logic in `AiConsolePage.tsx` confirms that clicking these plans routes the user to the correct view.
2. **MPS Cache Expiration (R2)**: Since the ONNX probe has a 5-minute TTL cache via `getFreshOnnxModelLoadProbe()` in `ai-runtime.ipc.ts`, establishing parity requires implementing an identical helper `getFreshPythonMpsExecutionProbe()` checking a cached `latestPythonMpsExecutionProbe` against a 5-minute TTL (`5 * 60 * 1000`).
3. **Download State Detection (R2)**: Because `getDownloadedArtifactState` checks for the presence of `filePath + '.aria2'`, we can safely identify incomplete downloads. The model download only marks as complete when both the GGUF file and its corresponding `mmproj` (vision project) files exist and have no active `.aria2` lockfiles.
4. **MLX Cleanup (R2)**: Since MLX is currently a non-functional placeholder and the product path relies on llama.cpp Metal, the MLX route can be cleanly removed by deleting references across the 13 locations listed in the `analysis.md` report.
5. **Windows Parity (R2)**: As there is currently no Windows capability probe in the Python service, establishing parity requires copying the pattern of `macos_ai_capabilities.py` into a new `windows_ai_capabilities.py` that checks for CUDA toolkit, DirectML ORT provider, and `torch.cuda.is_available()`.

---

## 3. Caveats

* The investigation assumed standard Windows setups would run on CUDA-compatible Nvidia hardware. Alternative platforms (e.g., AMD ROCm or pure Intel CPU setups on Windows) were not fully explored for Windows parity.
* We did not run actual physical CUDA/DirectML probes since the investigation is executing on a macOS machine.

---

## 4. Conclusion

* **R1**: Platform AI Action plans are dynamically projected. Missing requirements map clearly to setup tasks which trigger specific IPC remediation handlers.
* **R2**:
  * Python MPS execution probe lacks caching; a 5-minute TTL cache should be implemented in `ai-runtime.ipc.ts` to match the ONNX probe.
  * Incomplete downloads are identified by checking for `*.aria2` files.
  * MLX is a planned placeholder and should be removed using the 13-point cleanup roadmap.
  * Windows parity can be achieved by introducing `windows_ai_capabilities.py` and its corresponding IPC channels.
* **R3**: The test suite is fully functional and all 94 Python tests + 18 TypeScript test suites pass.

---

## 5. Verification Method

* Run the TypeScript verification test suite:
  ```bash
  npm run ci:test-runtime-safety
  ```
* Run the Python test suite:
  ```bash
  npm run test-python-unittest
  ```
* Inspect `src/main/services/llama-runtime/llama-runtime-local-models.ts` and `src/main/ipc/ai-runtime.ipc.ts` to confirm the file check logic and TTL cache implementation details.
