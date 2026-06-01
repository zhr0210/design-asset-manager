# Current Task

## Goal

Phase 7A: cross-platform managed path governance pilot.

## Boundaries

- Add read-only managed path audit tooling for app-managed logs/cache/temp/config/runtime/database/models/downloads metadata.
- Enhance Doctor path and permission checks with managed path audit summaries.
- Keep Settings defaults metadata sourced from `path-resolver`.
- Do not modify database schema or migrations.
- Do not modify asset file paths, thumbnails, download task paths, asset import logic, or download queue behavior.
- Do not move, delete, or migrate user files.
- Do not change `libraryPath`, `downloadPath`, or `modelRootDir` behavior.
- Do not start real AI Worker, OCR, llama-runtime, external inference services, or runtime installers.
- Do not access real network, download models, or download runtime packages.
- Do not modify preload, Renderer pages, or Settings UI.

## Current Status

- Phase 6E is complete and committed: `8efc536 feat: add readonly settings migration panel`.
- Phase 7A implementation is in progress.

## Plan

1. Add `src/main/platform/managed-path-audit.types.ts`.
2. Add `src/main/platform/managed-path-audit.ts`.
3. Enhance `src/main/doctor/checks/path.check.ts` with audit summary.
4. Enhance `src/main/doctor/checks/permission.check.ts` with audit summary while keeping writes limited to controlled probe directories.
5. Add `scripts/managed-path-audit.test.ts`.
6. Add `test-managed-path-audit` to `package.json`.
7. Run the Phase 7A validation matrix.

## Validation Plan

```bash
npm.cmd run test-platform
npm.cmd run test-doctor
npm.cmd run test-doctor-service
npm.cmd run test-doctor-ipc
npm.cmd run test-doctor-panel
npm.cmd run test-bootstrap
npm.cmd run test-runtime-registry
npm.cmd run test-bootstrap-manager
npm.cmd run test-runtime-profile
npm.cmd run test-runtime-package
npm.cmd run test-bootstrap-package-plan
npm.cmd run test-ai-runtime
npm.cmd run test-external-http-runtime
npm.cmd run test-python-worker-runtime
npm.cmd run test-ai-runtime-settings
npm.cmd run test-ai-runtime-ipc
npm.cmd run test-ai-runtime-panel
npm.cmd run test-settings-compatibility
npm.cmd run test-settings-service-defaults
npm.cmd run test-settings-migration
npm.cmd run test-settings-migration-ipc
npm.cmd run test-settings-migration-panel
npm.cmd run test-managed-path-audit
npm.cmd run doctor
npm.cmd run typecheck
npm.cmd run build
```

Doctor `overallStatus = WARNING` is acceptable when the only cause is the AI Worker default port / health endpoint being unreachable.
