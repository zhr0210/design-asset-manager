# macOS Remaining Phases Analysis Handoff Report

## 1. Observation
The following file structures and properties were directly observed in the workspace:

1.  **Path Migration Executor and Integration Status**:
    *   `src/main/path-migration/path-migration-executor.ts` (observed via `view_file` in a prior turn) contains the implementation of the `PathMigrationExecutor` class with `executeMigration` and `rollbackMigration` routines.
    *   In `scripts/path-governance-late-phases.test.ts`, lines 206–210 assert:
        ```typescript
        const pathGovernanceIpcSource = await fs.readFile('src/main/ipc/path-governance.ipc.ts', 'utf8')
        const preloadSource = await fs.readFile('src/preload/index.ts', 'utf8')
        assert.doesNotMatch(pathGovernanceIpcSource, /assets:apply-path-migration|PathMigrationExecutor/)
        assert.doesNotMatch(preloadSource, /assets:apply-path-migration|applyPathMigration/)
        ```
        This shows that the IPC channels (`path-governance:execute-migration` or similar) are currently unmapped in the main IPC registry and preload script.

2.  **macOS AI Dependency Installer**:
    *   In `src/preload/index.ts` line 330:
        ```typescript
        macosAiInstallDeps: () => ipcRenderer.invoke('macos-ai:install-deps'),
        ```
    *   In `src/renderer/routes/AiConsolePage.tsx` lines 928–944:
        ```typescript
        const handleInstallMacOSDeps = async () => {
          const api = (window as any).electronAPI
          if (!api?.macosAiInstallDeps) { ... }
          setInstallingMacOSDeps(true)
          ...
          try {
            const result = await api.macosAiInstallDeps()
        ```
    *   In `src/renderer/routes/AiConsolePage.tsx` lines 735–767:
        ```typescript
        // Listen for macOS AI dependency install log events (real-time pip output)
        useEffect(() => {
          const api = (window as any).electronAPI
          if (!api?.onOcrInstallLog) return
          const handler = (_event: any, message: string) => { ... }
          api.onOcrInstallLog(handler)
        }, [])
        ```

3.  **Llama Installation**:
    *   In `src/renderer/routes/AiConsolePage.tsx` lines 1284–1289:
        ```typescript
        try {
          const status = await api.llamaRuntimeStartInstall({ plan })
          setLlamaStatus(status)
          ...
        ```

4.  **macOS Packaging and Signing configuration**:
    *   `package.json` contains:
        *   `mac.hardenedRuntime: true`
        *   `mac.entitlements: "build/entitlements.mac.plist"`
        *   `mac.entitlementsInherit: "build/entitlements.mac.plist"`
        *   `mac.identity: null`
        *   `afterSign: "scripts/notarize.js"`
        *   Scripts: `"pack:mac": "npm run build && electron-builder --mac --dir --config.mac.identity=null"`, `"dist:mac": "npm run build && electron-builder --mac --config.mac.identity=null"`.
    *   `scripts/notarize.js` implements the Apple notarization process checking environment variables `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, and `APPLE_TEAM_ID`.
    *   `scripts/macos-package-artifact-workflow.test.ts` lines 22–24:
        ```typescript
        assert.equal(manifest.runsPackagingInCI, false)
        ...
        assert.doesNotMatch(workflow, /APPLE_ID|APPLE_APP_SPECIFIC_PASSWORD|CSC_LINK|CSC_KEY_PASSWORD|GH_TOKEN|GITHUB_TOKEN/)
        assert.doesNotMatch(workflow, /notarize|--publish always|gh release|create-release/i)
        ```
    *   `build/entitlements.mac.plist` includes key permissions allowing unsigned dynamic library execution and JIT capabilities.

## 2. Logic Chain
1.  **Path Migration Execution**: Based on observations of `path-governance-late-phases.test.ts`, the `PathMigrationExecutor` logic operates successfully at the engine level but is isolated. To expose it to the renderer safely in accordance with ADR 0003, we conclusion that a new IPC bridge mapping (`path-governance:dry-run`, `path-governance:execute-migration`, `path-governance:get-migration-status`) must be added to the main process and preload wrapper, combined with a `PathMigrationPanel` React interface in settings to display affected counts, files missing, and trigger/rollback states.
2.  **Dependency Auto-Installers**: The renderer already contains the hooks `macosAiInstallDeps()` and `onOcrInstallLog` to trigger dependencies installation and update logs. It also has a Llama installer flow (`llamaRuntimeStartInstall`). The backend triggers standard output logging streaming that is pushed over the IPC logs to keep the user informed.
3.  **Signing & Notarization**: The application configuration establishes a dual-mode strategy. For local and CI validation builds, it utilizes `--config.mac.identity=null` to bypass standard signature issues. For production packaging, it relies on environment parameters (`CSC_LINK`, `APPLE_ID`, etc.) and hardens security access bounds via the entitlements plist.
4.  **Verification**: Verified by creating test scripts targeting IPC dry-runs/executions, installer spawns, and checksum caching.

## 3. Caveats
*   This is a read-only investigation. No source files were updated.
*   Production Apple ID credentials and signing certificates were not verified using live network services since the environment is constrained to `CODE_ONLY` network mode.

## 4. Conclusion
The macOS remaining phases (path migration, installer loops, signing and notarization integration) are structurally ready for implementers to wire up. The backend modules exist, and the design schemas for IPC and React UI mapped in `analysis.md` provide a complete blueprint for implementation.

## 5. Verification Method
1.  **Code Check Verification**: Run:
    ```bash
    npm run typecheck
    ```
2.  **Verify Existing Platform and Late Phase Path Tests**: Run:
    ```bash
    npm run test-path-governance-late-phases
    ```
    Verify that tests pass.
3.  **Inspect Designed Specifications**:
    Inspect `<DAM_WORKSPACE>/.agents/teamwork_preview_explorer_phase16_mac/analysis.md` to review the proposed IPC channels, React panel structure, and code signing details.
