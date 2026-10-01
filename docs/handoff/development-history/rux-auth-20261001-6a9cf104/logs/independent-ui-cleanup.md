# Independent UI / cleanup source audit — R04–R06

Status: CHANGES_REQUESTED for source/document completeness at this read point. No independent tests, no Computer Use, no real authentication. CU=NOT_RUN_BY_REVIEWER; real account=NOT_RUN. No secrets, user library, model, runtime databases inspected. Main is the sole business writer.

## Verified positive findings

- Five deleted paths (D01/D05/D08/D12/D13) are actually absent. Every saved before file under this run/before/<path> exists and its SHA256 matches DELETION-LEDGER. No executable symbol/full-path reference remains in src/scripts/.codeindex/package.json/electron.vite config. Historical references remain appropriately unchanged.
- No deleted item had data/schema/public tombstone ownership. Replacements are VisualAiPanel/controllers; LibraryCanvas selectionbar + retained BulkActionModal; shared asset-tagging projection. Current store/IPC authority not retired by these deletions.
- D16–D27 all exist, and their SHA256 matches the initial independent audit. DESIGN approved prototype source/golden reference is protected; preview launchers, CSS and fixture consumers retained. No runtime package/dependencies/model resources cropped.
- AiConsolePage is a thin export of AiWorkspace with no legacy timer or disabled Worker/GPU calls. AiWorkspace mounts only one PiConnectionsPanel on connection route, separate task, model/OCR, background, diagnostics surfaces. Engineering acceptance is inside /ai/diagnostics details.
- Ordinary Settings no longer mounts AiBackendSettingsPanel, DoctorPanel, AiRuntimePanel, RuntimePackagePanel. The old editor source remains unreachable; no second production connection CRUD found. Historical source/test references are not production reachability proof.
- Current background 5s timers belong to explicitly mounted BackgroundAnalysisPanel/BackgroundOcrPanel, not legacy disabled console. Login polling remains the active, cancellable stage projection. AuthActivity is a global nonsecret activity projection; no attempt cancel on Pi editor unmount.
- Settings marks concurrency/delayInterval/saveOriginalUrl/autoThumbnail legacy-only and disables controls. Save still preserves these values; it does not pretend to control managed intake/download. Path preferences state they do not migrate/switch current library.

## Findings requiring response

1. **P2 repeated AI Settings card.** Settings form section already displays AI 与模型, model library, directory preference and Manage connections link. A second section immediately after the form repeats AI 与模型 / 管理 AI 连接与账号. Remove the duplicate while keeping the original field and route. This is not a second CRUD but violates the unified visible entry goal.
2. **P2 task assignment has two UI writers.** TaskModelSettings has task defaults via settingsSave(aiTaskModels); PiConnectionsPanel still has three direct “用于…” assignment buttons using the same save. Move these into the task page or make them explicit shortcuts opening its one editing surface. Do not delete stored assignments. (Plan goal: tasks own their surface; current matrix says task defaults in TaskModelSettings.)
3. **P2 live renderer README overstates retired behavior.** src/renderer/README.md:15 claims old AiBackendSettingsPanel owns actual configuration; line 69 still claims AiConsolePage owns GPU history and five-second console polling. Update to current AiWorkspace, one Connections editor, and scoped background/auth diagnostics. Keep history separately.
4. **Proof delivery incomplete at this read point.** DELETION-LEDGER exists, but REMOVAL-PROOF.md, PRODUCTION-GRAPH-AFTER.json, COVERAGE-MIGRATION.json are absent. FEATURE-MIGRATION-MATRIX is one paragraph and SETTINGS-CONSUMERS has categories, not the required field/caller/IPC/new owner/retained-only matrix. Add exact mappings and result scope; cannot call complete merely because source has fewer lines.
5. **Test contract follow-up.** doctor-panel-contract.test.ts still asserts DoctorPanel Settings import/mount; model-artifact-readiness-display.test.ts and ai-runtime-status-workflow.test.ts read old AiConsole source. Migrate source-contract assertions to the actually effective surfaces while preserving current protection/negative case IDs, or declare these not run/failing. No tests were executed by this reviewer, so this is detected source mismatch, not a claimed test failure.
6. **Small copy refinement.** Settings footer “路径与采集偏好已同步” is now misleading for disabled nonconsumed collection fields; prefer path/preference wording consistent with the disclosure. This is low risk, not permission gate.

## Unfinished candidates are intentionally preserved

Old Sidebar/Topbar have download source-contract test consumers; WaterfallGrid still directly participates in keyboard/loading tests; tag dialogs/sidebar/toolbar have source read tests; two in-memory adapters are test consumers; approved prototypes need full reference/launcher/CSS/fixture path migration before moving. Their preservation is safer than deleting negative coverage or approved goldens. The ledger should list all remaining 22 items individually as KEEP_PENDING_EVIDENCE/MOVE_TEST_ONLY/ARCHIVE_REFERENCE, not only one catch-all string, so Remote can audit the actual boundary.

## Limits / production graph scope

Initial AST import/export/literal import/require scan and focused current grep are source evidence only. Package build.files includes out/**/* and package.json; renderer source candidates are not extraResources (which is ai-service and pi-runtime). Do not infer installed application readiness from this. The producer must complete build/reference checks and actual CU evidence separately, including no library, existing/generated library, dirty editor, login deny/timeout/return flows. Real browser login is user-assisted later; zero real material/network inference was performed by this reviewer.

## Reviewed source snapshot (SHA256)

- `src/renderer/routes/Settings.tsx`: `dd916e0b4ffface2acfafe070a56008fe4250444a78a785c1251cf39d01f878b`
- `src/renderer/routes/AiWorkspace.tsx`: `387a970fd233ff8ba052dc0dd739f691bf6681b43ee9cb2184a20bb2fd86ff19`
- `src/renderer/routes/AiConsolePage.tsx`: `8cf5d2f4c4505fd34155577f68cd3157e8526dedbfba2d897603c15f4b4a2caa`
- `src/renderer/components/asset/PiConnectionsPanel.tsx`: `7c8a781c5d20718d8aa1a8eef01e90a6020f58ea1b4675da6497e52b060fc72c`
- `src/renderer/components/asset/TaskModelSettings.tsx`: `d3e68620de36c0d9fab77a1e842b7e83959b34c865cb3bd16c1af9ad4f13dc5c`
- `src/renderer/components/asset/OcrEnvironmentSettings.tsx`: `5b9bb407e241c6cb503f5e6841ac54d823713e6e22145e0d3d172b5ae9dfd403`
- `src/renderer/README.md`: `9b384afd2cc63ab283930de3dd5fc5e77b3c62bb90edcc313f3862d2e15c89a1`
- `package.json`: `4cc3a8b04c127e935b1e11d601f1a7fad8d959b00116089ad6797ce3b6bb6885`
- `electron.vite.config.ts`: `f2da6c9b32f6942a5535fa6e8a137c5384b06ae5eb445a5c5a9a3d79e8c5aa15`
