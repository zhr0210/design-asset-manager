# Platform Shared Architecture Roadmap

Design Asset Manager keeps one Shared Product Surface and one shared
main-application architecture across Windows and macOS. Platform branches are
allowed only for real OS, runtime, native dependency, packaging, path, or
process differences.

## Completed Foundation

| Priority | Deepening candidate | Status |
| --- | --- | --- |
| 1 | Platform AI Branch Status | Complete: dedicated macOS/Windows IPC channels return one shared response shape. |
| 2 | AI Model Artifact Readiness | Complete: shared dependency, artifact, load, inference, evidence, and missing vocabulary. |
| 3 | Electron AI Result Sync | Complete: Electron owns task-result projection and local persistence. |
| 4 | Asset Tagging Workflow | Complete: shared routing, Tag Fusion planning, task submission, and Tag Suggestion projection. |
| 5 | Visual Analysis Snapshot | Complete: renderer-ready projection hides stored payload drift. |
| 6 | Product AI Truthfulness Closure | Complete: product execution fails closed instead of returning simulated AI output. |
| 7 | Platform AI Action Plan | Complete: evidence gaps route to existing Models, Runtime, Services, or refresh operations. |
| 8 | Real AI Evidence Closure Phase 2 | Complete: supported CUDA, MPS, ONNX, and GGUF/mmproj routes have scoped evidence; OCR gaps remain explicit. |
| 9 | AI Runtime Bootstrap | Complete: one main-process Module assembles both platform branch Providers, cache roots, profiles, and Worker autostart from explicit host facts. |

Completion means the shared architecture and evidence contracts are closed. It
does not mean every optional model dependency or model artifact is installed.
Unknown or missing evidence remains evidence-insufficient rather than failure.

## Next Horizon

| Order | Deepening candidate | Status |
| --- | --- | --- |
| 1 | Runtime Package Executor | Complete for explicitly selected local/bundled packages with verification, safe extraction, atomic promotion, registry commit, and rollback. |
| 2 | Runtime Package Product Flow | Complete for approved polling-only v1: shared contract, main-owned native dialog/session, preload, Chinese UI, and path-free tests. Progress events and cancellation require a later contract. |
| 3 | Release Flow | Signed-candidate workflow, Release Update Metadata, and trust-evidence Modules are implemented; real credential runs and per-release publishing approval remain. |

OCR dependency or model acquisition is a separate product decision. It must
not block the shared Runtime Package Executor, and it remains subject to
explicit approval before any download or installation.

## Design Rules

- Default to shared contracts, renderer modules, and main-process workflow
  modules.
- Keep platform differences inside adapters and runtime-lane evidence.
- Two concrete platform behaviors justify a seam; speculative variation does
  not.
- Do not present Runtime Probe evidence as a Real Model Path.
- Keep status `nextAction` display-only; existing user-triggered operations own
  execution.
- Runtime package execution must not imply runtime start or model inference.
- Publishing, signing, notarization, remote download, and user-data mutation
  require separate explicit gates.

## Validation Focus

- Interface-level tests shared by in-memory and filesystem adapters.
- Generated archives covering traversal, checksum mismatch, partial failure,
  rollback, retry, and cancellation.
- Windows/macOS path and executable adaptation tests.
- Electron/Playwright progress and recovery checks without real model
  downloads.
- Package Smoke before any release artifact is promoted.
