# Analysis: Platform AI and Real AI Evidence Mapping

This analysis documents the codebase investigation for Platform AI action plan execution, Real AI evidence/model route verification (specifically macOS MPS/ONNX probes, Qwen3-VL paths, MLX route deprecation, and Windows parity), and QA/automated validation.

---

## R1. Platform AI Action Plan Execution

### 1. Action Projection in `platform-ai-branch-status.projector.ts`
The projector maps the status of workflow lanes and model readiness to calculate a final unified action plan.
* **File Location**: `src/main/services/ai-runtime/platform-ai-branch-status.projector.ts`
* **Mechanics**:
  1. The entry point `createPlatformAiBranchStatus` takes the current platform (e.g., `'macos'`, `'windows'`), the list of registered runtimes, and the mapped model readiness list.
  2. It evaluates each workflow defined in `WORKFLOWS` (lines 40–90) for the matching platform branch.
  3. For each workflow, it iterates through its runtime lanes in priority order, resolving the status of the lane (whether the runtime is running, stopped, or disabled) and the readiness of required models.
  4. It determines the `status` of the workflow (e.g., `ready`, `evidence_insufficient`, `dependency_missing`, `optional`, `unavailable`).
  5. Finally, it uses `selectPlatformAiActionPlan` (imported from `src/shared/workflows/platform-ai-action-plan.workflow.ts`) to produce a single actionable `actionPlan` for the workflow.

### 2. Mapping Missing Requirements to Setup Tasks
The missing requirement mapping bridges the gap between static evidence diagnostics and actionable UI interactions:
* **Missing Types**: `runtime_dependency`, `model_artifact`, and `runtime_service`.
* **Proposed Setup Task Mapping**:
  * **`runtime_dependency`** (e.g., missing PyTorch, ONNX Runtime, or DirectML): Maps to **`install_dependencies`**. This triggers the package bootstrap mechanism (e.g., using python virtual environment pip installers or husky dependency check tools).
  * **`model_artifact`** (e.g., missing GGUF/mmproj weights, or model files): Maps to **`download_model_artifact`**. This calls the Electron IPC handler for download progression (`AiModelDownloadService.startDownload()`).
  * **`runtime_service`** (e.g., stopped llama-server process): Maps to **`start_runtime`**. This triggers the runner process management (e.g., `LlamaRuntimeInstallService.startServer()`).

### 3. Renderer UI Consumption and Routing
* **UI Components**: `src/renderer/routes/AiConsolePage.tsx` and `src/renderer/components/settings/AiRuntimePanel.tsx`.
* **Action Consumption**:
  In `PlatformAiBranchStatusPanel` (inside `AiConsolePage.tsx`), the page renders the projected `workflow.actionPlan`. If a workflow has an action plan (e.g., action label is shown), clicking the button triggers `onAction(workflow.actionPlan.kind)` where:
  * `open_model_management` dynamically switches the active tab of the settings console to `'models'` (`props.setActiveTab('models')`).
  * `open_runtime_management` switches the active tab to `'runtime'` (`props.setActiveTab('runtime')`).
  * `open_backend_management` switches the active tab to `'services'` (`props.setActiveTab('services')`).
  This allows the UI to dynamically adjust routing and guide the user directly to the remediation pane based on the specific evidence gap detected.

---

## R2. Real AI Evidence & Model Route Verification

### 1. macOS MPS/ONNX Probe Caching and TTL
* **ONNX Load Probe**:
  * **Execution**: Executed by calling the FastAPI endpoint `/ai/model/onnx-load-probe`, which triggers `probe_registered_onnx_model_load` in `ai-service/core/onnx_model_load_probe.py`.
  * **Caching & TTL**: Implemented in `src/main/ipc/ai-runtime.ipc.ts` (lines 48–60) using a module-level variable `latestOnnxModelLoadProbe` and constant `ONNX_MODEL_LOAD_EVIDENCE_TTL_MS = 5 * 60 * 1000` (5 minutes). `getFreshOnnxModelLoadProbe()` returns the cached result if the difference between `Date.now()` and `Date.parse(checkedAt)` is under 5 minutes.
* **Python MPS Execution Probe**:
  * **Execution**: Executed by calling the FastAPI endpoint `/ai/model/python-mps/execution-probe`, which triggers a fixed tensor sum-of-squares calculation in `ai-service/core/mps_execution_probe.py`.
  * **Gap**: Currently, the Python MPS Execution probe results are **NOT** cached on the Electron side. Each invocation of `CHANNEL_AI_RUNTIME_PROBE_PYTHON_MPS_EXECUTION` directly hits the Python service, and `collectModelReadinessEvidence` does not consume it dynamically.
  * **Proposed Fix**: Add a 5-minute cache variable `latestPythonMpsExecutionProbe` and `PYTHON_MPS_EXECUTION_EVIDENCE_TTL_MS = 5 * 60 * 1000` to `src/main/ipc/ai-runtime.ipc.ts`. Use a `getFreshPythonMpsExecutionProbe()` check, and map it into `collectModelReadinessEvidence` using a mapper in `model-artifact-readiness.mapper.ts`.

### 2. Qwen3-VL GGUF/mmproj Path & Download Verification
* **File Check Locations**: `src/main/ipc/llama-runtime.ipc.ts` (lines 73–100) and `src/main/services/llama-runtime/llama-runtime-local-models.ts` (lines 7–21).
* **Checking Mechanism**:
  1. The app constructs the paths to the GGUF model and its companion `mmproj` (vision projector) file.
  2. It passes both paths to `getDownloadedArtifactState()`.
  3. `getDownloadedArtifactState(filePath)` verifies:
     * If the file does not exist, return `'missing'`.
     * If a companion file ending in `.aria2` exists (e.g. `filePath.aria2`), it signifies that an active aria2 download is incomplete; it returns `'downloading'`.
     * If the file exists and its size (from `fs.statSync(filePath).size`) is greater than 0, it returns `'downloaded'`.
     * Otherwise, it returns `'missing'`.
  4. Both files must return `'downloaded'` for the UI/plan to treat the model as ready. If either is `'downloading'`, `isDownloading` is set to `true`.

### 3. MLX Route Deprecation Roadmap
* **Status**: MLX support is currently a "planned" experimental placeholder with no actual Python inference code in `ai-service`.
* **Deprecation Strategy**: To cleanly deprecate and remove all MLX traces, delete or clean up the following 13 locations:
  1. **`src/main/runtime/profiles/macos-apple-silicon.profile.ts`**:
     * Line 6: Remove MLX from the profile description.
     * Line 10: Remove `'mlx'` from `capabilities`.
     * Line 15: Remove `'mlx-runtime'` and `'qwen3-vl-mlx'` from `optionalPackages`.
  2. **`src/main/services/ai-runtime/platform-ai-branch-status.projector.ts`**:
     * Line 47: Remove "MLX" reference from summary description.
     * Line 51: Remove `{ lane: 'mlx', label: 'MLX', runtimeKinds: ['python-worker'] }`.
  3. **`src/renderer/components/settings/AiRuntimePanel.tsx`**:
     * Line 537: Remove "MLX" from the diagnostic description label.
  4. **`src/renderer/components/settings/MacOSAiCapabilityMatrix.tsx`**:
     * Line 18: Remove the `/ MLX ...` version header template.
     * Also remove the table cell/row mapping for the MLX capability.
  5. **`src/renderer/routes/AiConsolePage.tsx`**:
     * Line 1869: Remove `<RuntimeTile label="MLX" ... />`.
  6. **`src/shared/constants/macos-ai-runtime.constants.ts`**:
     * Line 66: Remove "MLX" from the workflow description.
     * Line 70: Remove `capability('llama.qwen3-vl-mlx', 'Qwen3-VL MLX', ...)` definition.
     * Line 86: Remove "MLX" reference from comments.
  7. **`src/shared/types/macos-ai-runtime.types.ts`**:
     * Line 84: Remove the `mlx` capability field from the `MacOSAiWorkerProbeResult` interface definition.
  8. **`src/shared/types/runtime-profile.types.ts`**:
     * Line 24: Remove `'mlx'` from the `RuntimeProfileCapability` union type.
  9. **`src/shared/workflows/ai-runtime-status.workflow.ts`**:
     * Line 92: Remove `mlx` from `MacOSAiWorkerProbeDisplay`.
     * Line 342: Remove `mlx: unchecked` default tile display.
     * Line 373–376: Remove `mlx` mapping parsing logic from capabilities probe result.
  10. **`src/shared/workflows/platform-ai-branch-status.workflow.ts`**:
      * Line 151: Remove `Qwen3-VL MLX` from the priority text label.
  11. **`ai-service/core/macos_ai_capabilities.py`**:
      * Lines 145–158: Delete `_probe_mlx()` function.
      * Line 214: Delete `mlx_probe = _probe_mlx(import_module)`.
      * Line 261: Delete the Qwen3-VL MLX capability list entry.
      * Line 276: Remove `"mlx": mlx_probe` from the returned capability dictionary.
  12. **`ai-service/tests/test_macos_ai_capabilities.py`**:
      * Lines 30, 45, 61, 67, 88: Remove assertion checks and mock configurations related to MLX.
  13. **`ai-service/tools/install_macos_ai_deps.py`**:
      * Line 35: Remove `"mlx"` from the dependency packages list.

### 4. Windows CUDA/ONNX/Llama Parity Validation
* **Current Gap**: The Python worker lacks any Windows-specific capability probe equivalents. There is no `/ai/runtime/windows-capabilities` endpoint, nor check for python-cuda/DirectML ONNX backends in the FastAPI router.
* **Proposed Parity Strategy**:
  1. **New Python Checkers**:
     * Write `ai-service/core/python_cuda_compat.py`: Checks for `torch.cuda.is_available()`, device names, and CUDA toolkit capabilities.
     * Write `ai-service/core/cuda_execution_probe.py`: Runs a synthetic tensor matrix multiplication on `device="cuda"` to confirm active acceleration.
     * Write `ai-service/core/windows_ai_capabilities.py`: Probes CUDA/DirectML runtime lanes (e.g. `CUDAExecutionProvider` or `DmlExecutionProvider` in `onnxruntime.get_available_providers()`).
  2. **FastAPI Routes (`ai-service/app.py`)**:
     * Expose `/ai/runtime/windows-capabilities`, `/ai/model/python-cuda/status`, and `/ai/model/python-cuda/execution-probe`.
  3. **Electron Main & IPC (`src/main/ipc/ai-runtime.ipc.ts`)**:
     * Bind IPC channels (`CHANNEL_AI_RUNTIME_GET_WINDOWS_AI_BRANCH_STATUS`) to query these endpoints.
     * Incorporate Windows execution probe caching with a 5-minute TTL.
     * In `collectModelReadinessEvidence`, return Windows CUDA model readiness states based on these checks.

---

## R3. QA & Automated Validation

### 1. Test Files Mapping
The following files are verified to be the principal tests for AI runtime status, capabilities, and download management:
* **TypeScript Tests** (`scripts/` folder):
  * `ai-runtime-manager.test.ts`: Lifecycle of runtimes and configurations.
  * `ai-runtime-ipc-contract.test.ts`: Electron IPC routing logic.
  * `macos-ai-runtime.test.ts`: Metal and macOS-specific runtime setup.
  * `ai-console-macos-branch.test.ts`: Tests renderer page interactions with the macOS platform AI branch.
  * `platform-ai-branch-status-display.test.ts`: Display projector calculations.
  * `llama-runtime-local-models.test.ts`: GGUF/mmproj exists and aria2 download state check.
* **Python Tests** (`ai-service/tests/` folder):
  * `test_macos_ai_capabilities.py`: Module import probing and lane mappings.
  * `test_python_mps_compat.py`: PyTorch MPS backend checks.
  * `test_mps_execution_probe.py`: MPS tensor execution result checks.
  * `test_onnx_model_load_probe.py`: ONNX Session creation checks.
  * `test_model_downloads.py`: HF downloader segmented/resume validation.

### 2. Baseline Health Results
* `npm run typecheck`: Passed successfully.
* `npm run test-python-unittest`: Passed successfully (all 94 tests in 3.5s).
* `npm run ci:test-runtime-safety`: Passed successfully (all 18 test groups).
