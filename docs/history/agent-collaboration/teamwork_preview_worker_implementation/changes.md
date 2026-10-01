# Summary of Changes

## Route A: Asset Library and Download Path Governance

1. **New IPC Registrar (`src/main/ipc/path-governance.ipc.ts`)**
   - Added handler `assets:path-governance-report` which reads all assets from SQLite and maps them to `AssetLibraryPathSample` objects before passing to `createAssetLibraryPathGovernanceReport`.
   - Added handler `downloads:get-path-plan` which gets the `requestedFilename`, resolves the library directory from `SettingsService` (expanding `~` if present to the home directory), reads the directory contents, and calls `createDownloadPathDryRunPlan`.

2. **Main Application Registration (`src/main/index.ts`)**
   - Imported `registerPathGovernanceIpc` from `./ipc/path-governance.ipc`.
   - Called `registerPathGovernanceIpc()` inside `setupIpcHandlers()`.

3. **Preload Exposing (`src/preload/index.ts`)**
   - Exposed `getAssetLibraryPathGovernanceReport` via `ipcRenderer.invoke('assets:path-governance-report')`.
   - Exposed `getDownloadPathPlan` via `ipcRenderer.invoke('downloads:get-path-plan', requestedFilename)`.

4. **Renderer Download Enqueue Integration (`src/renderer/stores/download.store.ts`)**
   - Modified `enqueueDownload` method to invoke `window.electronAPI.getDownloadPathPlan` to sanitize and deduplicate filename/path dynamically.
   - Built a fallback strategy that gracefully uses the original local mock logic if the preload API method is missing or if the IPC execution throws an error.

---

## Route B: AI Worker Mock and Planned Capability Remediation

1. **Auto-Detection in Mock Policy (`ai-service/core/mock_policy.py`)**
   - Expanded `is_strict_real_ai()` to auto-detect production or packaged states.
   - Checks if environment variables `DESIGN_ASSET_MANAGER_STRICT_REAL_AI == "1"`, `NODE_ENV == "production"`, or `PRODUCTION == "1"` are set.
   - Inspects `__file__`, `sys.executable`, `sys.argv[0]`, and the current working directory for presence of `"Contents/Resources"` or `"app.asar"`.

2. **Apple Silicon MPS VRAM Telemetry (`ai-service/core/gpu_monitor.py`)**
   - Replaced static 25% estimates in macOS Apple Silicon section with live telemetry.
   - Runs `ps -o rss= -p <pid>` using the current process ID to read process RSS.
   - Invokes `torch.mps.current_allocated_memory()` and `torch.mps.driver_allocated_memory()` if MPS support is available in PyTorch.
   - Calculates used memory as the maximum of driver allocated memory and process RSS, converting the bytes to megabytes.
   - Computes free VRAM and overall utilization percentage dynamically.
