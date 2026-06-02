# Current Task

## Goal

Continue the Windows / macOS cross-platform adaptation plan through Phase 15. Current completed checkpoint: Phase 15A, final validation complete.

## Boundaries

- Do not download models, runtime packages, CUDA installers, Python dependencies, or other external artifacts.
- Do not start a real AI Worker, llama server, OCR worker, or real external inference service.
- Do not migrate user files, delete user files, rewrite database path fields, or inspect real asset library / runtime database contents.
- Do not change IPC channel names, database schema semantics, AI Worker HTTP API, or other public contracts.
- Do not include real local user paths, real asset paths, secrets, or private data in docs or reports.

## Current Status

- Phase 11C old AI Client to AI Runtime adapter is complete.
- Phase 12A OCR dependency governance is complete.
- Phase 12B llama-runtime governance is complete.
- Phase 13A database path design preflight is complete.
- Phase 13B database path migration plan is complete.
- Phase 14A asset library path governance is complete.
- Phase 14B download path governance is complete.
- Phase 14C thumbnail / normalized image path governance is complete.
- Phase 15A release flow governance is complete.

## Recently Completed

### Phase 11C: Old AI Client Adapter

- Added AI client runtime adapter with mock, external HTTP, and Python Worker bridge shapes.
- Added grey switch planning and old-chain fallback.
- Added `.codeindex/ai-client-runtime-adapter.json`, docs, and focused test.

### Phase 12A: OCR Dependency Governance

- Added OCR governance plan and doctor check plan.
- Moved OCR debug logging to managed debug log path resolution with home path redaction.
- Kept OCR installers deferred and explicit; no dependency install was run.
- Added `.codeindex/ocr-dependency-governance.json`, docs, and focused test.

### Phase 12B: llama-runtime Governance

- Added external-inference-first llama-runtime governance.
- Added macOS llama.app and Windows llama.cpp adapter design boundaries.
- Kept downloads, installs, and local service launch disabled in governance.
- Added `.codeindex/llama-runtime-governance.json`, docs, and focused test.

### Phase 13A / 13B: Database Path Design

- Added `pathRootId` design, library-relative helper, legacy absolute fallback, and dry-run remap report.
- Added migration plan gates for backup, dry-run, sample DB test, rollback, user confirmation, no auto-migration, and old path fallback.
- No schema or runtime database data was changed.

### Phase 14A / 14B / 14C: Late Path Governance

- Added asset-library path report shape, missing-file report shape, and remap suggestion shape.
- Added download filename policy, Windows illegal character handling, duplicate strategy, and dry-run save path plan.
- Added thumbnail and normalized image managed-cache path abstraction with legacy fallback.
- No asset files, download queue rows, thumbnails, or normalized files were moved, deleted, regenerated, or updated.

### Phase 15A: Release Flow Governance

- Added release packaging governance plan.
- Added manually triggered release packaging dry-run workflow covering Windows NSIS and macOS dmg on x64 / arm64.
- Reserved signing, notarization, optional macOS universal packaging, and auto-update for later phases.
- Publishing remains disabled.

## Validation Plan

```bash
npm.cmd run test-ai-client-runtime-adapter
npm.cmd run test-ocr-dependency-governance
npm.cmd run test-llama-runtime-governance
npm.cmd run test-database-path-design
npm.cmd run test-database-path-migration-plan
npm.cmd run test-path-governance-late-phases
npm.cmd run test-release-flow-governance
npm.cmd run ci:governance
npm.cmd run typecheck
npm.cmd run build
<bundled-python> scripts/check-docs-sync.py
```

Doctor `overallStatus = WARNING` remains acceptable in CI-safe mode when no check reports `error`.

## Result

- Implementation is complete through Phase 15A.
- Final validation is complete.
- No model, runtime package, CUDA installer, Python dependency, OCR dependency, or external artifact was downloaded.
- No real AI Worker, llama server, OCR worker, or external inference service was started.
- No runtime database contents, user asset library contents, or private asset paths were inspected.
- No schema migration, database path rewrite, file move, file delete, thumbnail regeneration, normalized image regeneration, publish, signing, notarization, or auto-update action was run.

## Validation Result

```bash
npm.cmd run ci:governance
npm.cmd run typecheck
npm.cmd run build
<bundled-python> scripts/check-docs-sync.py
```

All commands above passed.

`npm.cmd run ci:governance` completed with `Doctor CI WARNING`: Python runtime not detected by the app doctor, default AI Worker port / health endpoint unreachable, and one or more managed paths not writable. The CI-safe doctor wrapper accepted the report because no doctor check returned `error`.

`npm.cmd run build` passed with existing Vite dynamic import warnings.

## Packaging Smoke Result

Additional packaging validation was run after Phase 15A:

```bash
npm.cmd run dist:win
npx.cmd electron-builder --win --config.electronDist=node_modules/electron/dist --config.electronVersion=30.5.1
```

Result:

- A Windows `win-unpacked` package was generated.
- A Windows NSIS installer was generated under `dist-packages`.
- The installer blockmap was generated.
- The installer is unsigned, as expected for the current reserved-signing phase.
- The first `dist:win` attempt failed because app-builder tried to download Electron through an invalid proxy path.
- The successful retry used the local Electron distribution and cleared proxy variables for the electron-builder process.
- `win-unpacked` launch smoke passed when started normally and kept running for 8 seconds before the test process was stopped.

Known remaining installation validation gap:

- No controllable VM, Windows Sandbox, Docker, VirtualBox, or VMware command-line entry was available in this environment.
- The NSIS installer was not executed on the host because doing so could write current-user installation and uninstall metadata.
- Electron itself exits with a breakpoint when `USERPROFILE` is replaced with a synthetic temporary profile, so full isolated host install testing needs a real VM/sandbox or an application-level test userData override.

## Current Verification Addendum

Windows Sandbox has been enabled and the machine has been rebooted. Next validation target:

- Regenerate or reuse the package smoke sandbox staging under the approved external work root.
- Launch Windows Sandbox with the generated `.wsb` profile.
- Run the sandbox smoke script inside the sandbox.
- Record whether the packaged app launches from `win-unpacked`, whether installer metadata can be inspected, and whether any installer execution remains manually gated.

Current blocker:

- Windows Sandbox repeatedly reports a lost connection before package smoke validation can be observed.
- Diagnose host Sandbox / Hyper-V / remote session readiness first; do not execute the NSIS installer on the host.

Diagnosis update:

- Sandbox report was written successfully from inside the mapped sandbox folder.
- The report shows installer presence, unpacked executable presence, unpacked launch, and installer hash checks passed; installer signature remains warning because the installer is unsigned.
- Host Hyper-V / container services stayed running and the Sandbox VM process stayed alive.
- RDP client logs show repeated graphics-session disconnects, including hardware framebuffer use followed by disconnect reason `3`, then a software-framebuffer reconnect ending with component `slint` error `0x904` and disconnect reason `2308`.
- Treat the visible "lost connection" as a Windows Sandbox remote display/session issue, not as evidence that the package smoke failed.
- Updated package smoke sandbox generation to disable Sandbox vGPU and add a 15-second startup delay before running the logon smoke script.
- Regenerated the approved external sandbox staging and verified the generated `.wsb` and PowerShell script contain the mitigation.

Repeat Sandbox Validation Result:

- Relaunched Windows Sandbox with the regenerated `.wsb` profile.
- Removed the previous generated sandbox report before launch to prove the next report was from the new run.
- A new sandbox report was written after launch.
- New sandbox report checks: installer present passed, unpacked executable present passed, unpacked launch passed, installer hash passed, installer signature warning because the installer is unsigned.
- Sandbox processes remained running after report generation.
- RDP client logs still showed a graphics-session disconnect reason `3`, so the UI connection remains flaky even though the validation script completed successfully.

GitHub macOS Packaging Follow-up:

- User requested packaging a macOS installer and uploading it to GitHub.
- Local environment is Windows and cannot reliably build a macOS DMG locally.
- No GitHub remote is configured for this repository and `gh` CLI is unavailable, so this environment cannot directly upload to GitHub yet.
- Added a manual GitHub Actions workflow to build unsigned macOS DMG artifacts on `macos-latest` for `x64` and `arm64` and upload them as Actions artifacts.
- Added static workflow coverage for the macOS artifact workflow and included it in `ci:governance`.

GitHub macOS Packaging Validation:

```bash
npm.cmd run test-macos-package-artifact-workflow
npm.cmd run test-release-flow-governance
npm.cmd run test-electron-packaging-scripts
```

All commands above passed.

Installer UX Follow-up:

- Manual sandbox install check found the NSIS installer could be installed but did not allow choosing an installation path.
- Updated Windows NSIS config to use an assisted installer and allow changing the installation directory.
- Explicitly set the Windows executable / NSIS installation folder name to `Design Asset Manager`, so selecting a parent directory resolves to a `Design Asset Manager` subfolder.
- Added focused packaging audit coverage for the NSIS path-selection behavior.
- Rebuilt the Windows installer with local Electron distribution; builder confirmed `oneClick=false`.
- Refreshed the approved external Sandbox smoke staging with the rebuilt installer.
- New installer SHA256: `B62D5E9CD0AF6D67E392B03D1004FC1847AEC217EB56B8361A4F6C6FB63DF39E`.
- Follow-up clarified that selecting a parent directory should install into a newly created `Design Asset Manager` subfolder.
- Explicit Windows executable name config now fixes the NSIS installation folder name to `Design Asset Manager`.
- Rebuilt and refreshed Sandbox staging again; `win-unpacked` contains `Design Asset Manager.exe`.
- Latest installer SHA256: `80F1BAB8E72053FC3731937ECAF6FDE9B02C86AD5B19794966ED04851D008AEC`.
- User screenshot showed the directory page still displaying the selected parent directory, which made the final install location ambiguous.
- Added a custom NSIS include and confirmation page that normalizes `$INSTDIR` to the `Design Asset Manager` subfolder and displays the final path before installation starts.
- First custom NSIS attempt failed compilation because `MUI_HEADER_TEXT` was not available in the include context; removed the unsupported macro.
- Second custom NSIS attempt failed while building the uninstaller because install-only custom page functions were unreferenced; wrapped custom install page code in `!ifndef BUILD_UNINSTALLER`.
- Rebuilt the Windows installer successfully with the custom NSIS confirmation page.
- Latest installer SHA256 after custom NSIS page: `ED83A8C3A2F84494B5A595C3D7A617B274775BCBC28CF389202CBDFC2B3921B5`.
- The previous Sandbox shared directory installer was locked by an open installer/Sandbox mapping, so the latest smoke staging was written to `G:\codex\DesignAssetManagerPackageSmokeFinal`.
- Added a `--sandbox-install` package smoke mode to run the NSIS installer only inside Windows Sandbox and verify that choosing a parent directory installs into the `Design Asset Manager` subfolder.
- Added `customInit` normalization so silent install with `/D=<parent>` follows the same subfolder rule as the assisted installer UI.
- Rebuilt the Windows installer successfully after adding install E2E support.
- Ran Windows Sandbox install E2E with `--sandbox-install`; the sandbox report confirmed installer exit code 0, `install-parent\Design Asset Manager` exists, and the installed executable exists under that normalized subfolder.
- Latest installer SHA256 after Sandbox install E2E: `1674E0A699C2DE136A16C04FF3E006DC7C84666905606CE7A031071CEC155B49`.

Installer UX Validation:

```bash
npm.cmd run test-electron-packaging-audit
npm.cmd run test-native-dependency-packaging
npm.cmd run build
npx.cmd electron-builder --win --config.electronDist=node_modules/electron/dist --config.electronVersion=30.5.1
node scripts/package-smoke.mjs --sandbox --work-root=G:\codex\DesignAssetManagerPackageSmoke
npm.cmd run test-package-smoke
```

## GitHub / main Branch Handoff

User requested merging the current cross-platform adaptation branch into `main` and uploading the source code to GitHub for macOS review and future dual-platform development.

Execution plan:

- Commit the current source, workflow, documentation, and governance changes on the adaptation branch.
- Merge the adaptation branch into `main`.
- Upload to GitHub only after a repository remote and GitHub authentication are available.

Current GitHub blocker:

- No GitHub remote is configured for this local repository.
- `gh` CLI is not available in the local shell.
- The local GitHub skill is installed, but no callable GitHub connector tool is currently exposed in this session.

Packaging artifact handling:

- Keep local generated packaging outputs (`dist-packages/`, `dist-temp/`) out of source commits.
- Track `build/installer.nsh` because it is required by the Windows NSIS installer configuration.

Local merge result:

- Committed the adaptation branch changes as `ac21c56 feat: add cross-platform packaging governance`.
- Merged `codex/platform-windows-macos-adaptation` into `main` as `e8c6328 merge: cross-platform packaging governance`.
- `main` is clean locally after the merge.
- GitHub upload still needs a target repository remote or explicit `owner/repo` plus an available write path.

## AI Console / Llama Runtime / Doctor Follow-up

- Moved the Llama local inference service out of the narrow right rail and into the lower full-width area of the AI Console service page.
- Added an `AI 运行时管理` tab at the same level as `总览`, `模型`, `推理服务`, `反推提示词`, and `日志`; the panel is no longer shown in Settings.
- Localized the AI Runtime Manager visible UI and removed the misleading mock-only copy.
- Implemented cross-platform Llama runtime planning/start support by selecting macOS/Linux runtime packages, extracting non-Windows packages with `unzip`, and discovering `llama-server` recursively instead of only `llama-server.exe`.
- Hardened ZIP path safety checks so Windows absolute paths are rejected even when tests run on macOS.
- Expanded the Settings System Doctor panel with Chinese labels, per-check rerun controls, and safe repair actions for AI Worker/ports, Python, Node, native dependencies, and managed path permissions.

Validation:

```bash
npm run test-ai-runtime-panel
npm run test-settings-migration-panel
npm run test-doctor-panel
npm run typecheck
npm run build
```

`npm run test-llama-runtime-installer` requires binding a temporary `127.0.0.1` mock HTTP server. It passed planner assertions up to the sandbox listener boundary, but the current sandbox rejected local listening without escalation.
