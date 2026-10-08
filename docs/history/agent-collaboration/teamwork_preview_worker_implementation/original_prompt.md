## 2026-06-05T12:40:25Z

You are the Implementer Agent. Your working directory is `<DAM_WORKSPACE>/.agents/teamwork_preview_worker_implementation`.

Please implement:
1. Route A: Asset Library and Download Path Governance:
   - Expose/integrate `createAssetLibraryPathGovernanceReport` and `createDownloadPathDryRunPlan` into the Electron main process.
   - Create a new IPC file `src/main/ipc/path-governance.ipc.ts` that registers two IPC handlers:
     * `assets:path-governance-report`: reads all assets from SQLite and calls `createAssetLibraryPathGovernanceReport` on the records.
     * `downloads:get-path-plan`: takes `requestedFilename` from the caller, reads `libraryPath` from `SettingsService.getInstance().getSettings()`, resolves the target folder (safely expanding `~` if needed), lists existing files in that folder if it exists, and returns the dry-run path plan by calling `createDownloadPathDryRunPlan`.
   - Register this new IPC function inside `setupIpcHandlers()` of `src/main/index.ts`.
   - Expose these handlers in `src/preload/index.ts` under `electronAPI`:
     * `getAssetLibraryPathGovernanceReport: () => ipcRenderer.invoke('assets:path-governance-report')`
     * `getDownloadPathPlan: (requestedFilename: string) => ipcRenderer.invoke('downloads:get-path-plan', requestedFilename)`
   - Update `src/renderer/stores/download.store.ts` inside `enqueueDownload` so that it calls `window.electronAPI.getDownloadPathPlan` to sanitize and deduplicate the filename and get the correct save path, instead of using local mock sanitization. Make sure to fallback gracefully to existing local logic if the IPC is missing or fails.

2. Route B: AI Worker Mock and Planned Capability Remediation:
   - Update `ai-service/core/mock_policy.py` so that `is_strict_real_ai()` auto-detects packaged or production configurations (e.g. when `DESIGN_ASSET_MANAGER_STRICT_REAL_AI == "1"`, or when `NODE_ENV == "production"`, or when `PRODUCTION == "1"`, or when running from a packaged bundle containing `Contents/Resources` or `app.asar`).
   - Update `ai-service/core/gpu_monitor.py` under the Apple Silicon MPS section to show process-level VRAM/telemetry:
     * Retrieve process RSS by calling `ps -o rss= -p <pid>`.
     * Retrieve PyTorch MPS memory usage by calling `torch.mps.current_allocated_memory()` and `torch.mps.driver_allocated_memory()` if torch.backends.mps is available.
     * Calculate used memory as the maximum of driver allocated memory and process RSS, and compute the rest of the return values dynamically instead of using static 25% estimates.

3. Verification:
   - Run existing unit/contract tests to verify that they pass:
     * `node scripts/run-ts-test.mjs scripts/path-governance-late-phases.test.ts`
     * `python3 -m unittest discover -s ai-service/tests`
   - Run typechecks and builds (`npm run typecheck`, `npm run build`) to ensure the Electron app compiles successfully.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Please write a detailed summary of changes to `<DAM_WORKSPACE>/.agents/teamwork_preview_worker_implementation/changes.md` and complete a handoff report at `<DAM_WORKSPACE>/.agents/teamwork_preview_worker_implementation/handoff.md`. Communicate back when done.
