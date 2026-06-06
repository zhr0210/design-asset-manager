# Project: Design Asset Manager - Route A & Route B

## Architecture
Design Asset Manager is an Electron + React app with an SQLite database and a Python FastAPI AI worker.
- Electron main-process services: `src/main/`
- React frontend: `src/renderer/`
- Preload: `src/preload/`
- AI Worker: `ai-service/`

This project involves:
- **Route A: Asset Library Path Governance** (Phase 14A & Phase 14B) in the main-process path-migration service.
- **Route B: AI Worker Mock & Planned Capability Remediation** in the Python AI worker and main-process GPU telemetry/polling code.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Exploration | Codebase investigation and mapping files | None | DONE |
| 2 | Route A: Library Path Governance | Dry-run library check report and download path governance | M1 | DONE |
| 3 | Route B: AI Worker Mock Remediation | Prompt/Analysis mock endpoints replacement/removal, fail closed model wrappers | M1 | DONE |
| 4 | Route B: Telemetry & GPU Memory | macOS process-level Metal/MPS memory reporting | M1 | DONE |
| 5 | E2E and Unit Verification | Run all tests and verify all requirements | M2, M3, M4 | DONE |
| 6 | Phase 14C: Media Path Governance | Thumbnail and normalized image path abstractions | M5 | DONE |
| 7 | Phase 15A: Release Flow Governance | Windows and macOS packaging dry-run workflow planning | M6 | DONE |
| 8 | Phase 16: Path Governance Execution | Dormant migration executor; product activation requires explicit user approval | M6 | AWAITING APPROVAL |
| 9 | Phase 15B: Packaging & Downloader R3 | macOS entitlements, notarize hook, sandboxed smoke test, and parallel resume downloader | M7 | DONE |

## Interface Contracts
- Path checking dry-run returns structured reports without writing/moving files.
- Strictly respect boundaries: `autoMoveFiles: false`, `autoDeleteFiles: false`, `autoUpdateFilePath: false`.
- Mock prompt/analysis workers must return errors or fail closed in strict real AI mode.
- GPU telemetry exposes true process-level memory usage for MPS on macOS.
