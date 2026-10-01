# Progress Ledger

**Last visited**: 2026-06-06T00:44:15+08:00

## Steps
- [x] Fix ReferenceError and database connection handling in PathMigrationExecutor tests
- [x] Implement IPC handler `assets:apply-path-migration` in `src/main/ipc/path-governance.ipc.ts`
- [x] Create Apple Hardened Runtime entitlements file `build/entitlements.mac.plist`
- [x] Create Apple Notarization afterSign script hook `scripts/notarize.js`
- [x] Update `package.json` with entitlements/notarize configuration
- [x] Update `.github/workflows/release-packaging-dry-run.yml` with secrets placeholders
- [x] Implement/Upgrade cross-platform packaging smoke test in `scripts/package-smoke.mjs`
- [x] Optimize Model Downloader: switch mirror endpoints via `--mirror` CLI flag
- [x] Optimize Model Downloader: implement chunked download and Range-based resume-on-failure
- [x] Optimize Model Downloader: implement parallel multi-channel segmented downloading for files >15MB
- [x] Implement Python unit/integration tests in `ai-service/tests/test_model_downloads.py`
- [x] Run CI typecheck, build, python tests, and ci:governance verification
