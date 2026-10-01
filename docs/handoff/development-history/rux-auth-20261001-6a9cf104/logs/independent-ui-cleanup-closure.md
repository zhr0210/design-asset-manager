# Independent UI / cleanup limited closure — 2026-10-01

Decision: SOURCE_SCOPE_PASS for reviewed migration closure; FIVE_SOURCE_DELETIONS_PASS for the five ledger entries only. This is not a full R00–R08 acceptance, not an independent test rerun, not Computer Use, and not real subscription validation. Computer Use: PENDING / NOT_RUN_BY_REVIEWER. Real account: NOT_RUN. Source after-graph completeness: PENDING (PRODUCTION-GRAPH-AFTER.json not yet present at this read).

## Closed findings

1. Settings has one AI 与模型 card and one management link. The former duplicate AI form block is removed. ModelRootDir state/value preservation remains in the existing settings save; UI no longer suggests this legacy preference controls an actual new model installation. Ordinary Settings does not mount a connection CRUD or disabled Doctor/runtime panel.
2. PiConnectionsPanel no longer writes aiTaskModels or presents three direct task assignment buttons. Its sole task action links to appPath(ai-task-models); TaskModelSettings owns task defaults persistence. Connection CRUD remains only in the actually mounted Pi editor.
3. Settings footer now says 路径偏好已同步; disabled legacy collection fields have explicit nonconsumption disclosure.
4. Renderer README now leads with current AiWorkspace/Pi/Task ownership and explicitly labels subsequent legacy mounts/polling descriptions historical, so they are not current delivery claims. A future documentation compaction can move that history, but this is not a source blocker.
5. REMOVAL-PROOF.md, COVERAGE-MIGRATION.json, and FEATURE-MIGRATION-MATRIX.md exist. The feature matrix lists old field/surface, new owner, consumer boundary and restriction, including preserved templates, OCR environment, disabled runtime/Doctor and generated acceptance. No stored data was deleted or forcibly migrated.

## Five source deletion proof rechecked

For each of AssetDeepAnalysisPanel.tsx, BulkActionDock.tsx, library-labels.ts, useActivePromptModel.ts, usePromptReverse.ts:
- Current path is absent.
- run/before/<path> exists and SHA256 equals DELETION-LEDGER.beforeSha256.
- Current focused search across src/scripts/.codeindex/package.json/electron.vite.config.ts finds no executable symbol/full-path reference.
- No test depended on these five modules; old Grid/Sidebar/tag tests and production protection consumers are retained. No schema, credentials, model resources, source mutation, data authority, or compatibility tombstone was removed.
- Applicable replacement paths remain LibraryCanvas selectionbar/BulkActionModal/shared asset-tagging projection and VisualAiPanel/current controllers.

Initial independent review found their production and script/dynamic literal root reachability empty. Packaging still includes compiled out plus package.json, with only ai-service and pi-runtime extraResources. This reviewer did not run packaging or recalculate a complete graph here.

## Protected references

D16–D27 (12 approved prototype/golden source candidates) all still exist and their SHA256 matches the initial independent source audit. Preview launchers/CSS and synthetic fixture consumers remain. No approved visual baseline was replaced to claim parity. Other 22 undeleted candidates remain subject to the previous per-item evidence, not blanket deletability.

## Retained limits / follow-up

- The reviewed source does not call legacy console disabled status/GPU/install APIs on the default AI surface. Scoped background and account progress timers remain current owned timers, separately from retired Worker console polling.
- doctor-panel-contract.test.ts still has historic positive Settings Doctor mount assertions; model-artifact-readiness-display.test.ts and ai-runtime-status-workflow.test.ts still read old AiConsole source. These files were not run by this reviewer. They need migration or precise retained NOT_RUN/known stale-source limitation in final evidence; this report does not certify all legacy tests green.
- COVERAGE-MIGRATION.json is a mapping/disclosure, not executable proof. Main-reported startup/Pi/acceptance UI tests remain INTEGRATION; none can substitute for Computer Use.
- Real account, real private library, externally sent materials and paid inference were not performed by this reviewer.
- This signature is bounded to the source hashes below. New edits require appropriate focused review, without repeating unrelated tests. Git/WIP/index preservation is Main-owned verification; I did not modify or stage them.

## Signature source hashes

- `src/renderer/routes/Settings.tsx`: `7c22d9f0739ad1fad1a05b178842eba3cffca0fdda8813cb03f31d12069352aa`
- `src/renderer/routes/AiWorkspace.tsx`: `387a970fd233ff8ba052dc0dd739f691bf6681b43ee9cb2184a20bb2fd86ff19`
- `src/renderer/routes/AiConsolePage.tsx`: `8cf5d2f4c4505fd34155577f68cd3157e8526dedbfba2d897603c15f4b4a2caa`
- `src/renderer/components/asset/PiConnectionsPanel.tsx`: `f3ac3ae2ee3e807077d4dd314fcb811fc72ff356472f1e9012227604760b52ee`
- `src/renderer/components/asset/TaskModelSettings.tsx`: `d3e68620de36c0d9fab77a1e842b7e83959b34c865cb3bd16c1af9ad4f13dc5c`
- `src/renderer/README.md`: `21ebc01987a3f3ed721c21b1696a75b39b84c3999bb84a95fd3b15bd83b0b71b`
- `DELETION-LEDGER.json`: `8ef74b627d642ad12c02f178783ea1da46fab3be19c1e7dfc9d2b04ead1c8e8b`
