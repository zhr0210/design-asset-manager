# Context: Phase 16, Phase 15B, and Model Downloader

## Core Files to Inspect/Modify
- Path Governance:
  - `src/main/path-migration/media-path-governance.ts`
  - `src/main/path-migration/database-path-migration-plan.ts`
  - `src/main/ipc/path-governance.ipc.ts`
  - `scripts/path-governance-late-phases.test.ts`
- Packaging & Smoke Test:
  - `package.json`
  - `electron-builder.yml` or the build configuration in `package.json`
  - `.github/workflows/release-packaging-dry-run.yml`
  - `scripts/release-flow-governance.test.ts`
  - `scripts/package-smoke.test.ts` or `scripts/package-smoke.mjs`
- Model Downloader:
  - `ai-service/tools/download_cooperative_hf_model.py`
  - `ai-service/tools/download_hf_model.py`
