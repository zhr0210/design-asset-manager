# Platform Shared Architecture Roadmap

Design Asset Manager should keep one Shared Product Surface and one shared main-application architecture across Windows and macOS. Platform branches are allowed only where OS capabilities, AI inference runtimes, packaging/native dependency handling, path/process adapters, or other non-shareable constraints make a shared implementation misleading.

This roadmap records the refactor order for lowering dual-platform maintenance cost. It does not authorize database schema changes, AI Worker HTTP shape changes, model downloads, runtime launches, or user data inspection.

## Priority Order

| Priority | Deepening candidate | Intended seam | First slice |
| --- | --- | --- | --- |
| 1 | Platform AI Branch Status | Dedicated AI Runtime IPC channels returning one shared Platform AI Branch Status shape. | Add shared status types, `ai-runtime:get-macos-ai-branch-status`, `ai-runtime:get-windows-ai-branch-status`, preload methods, and a main-process projector skeleton with focused contract tests. Keep AI Console on its current data sources until the contract is stable. |
| 2 | AI Model Artifact Readiness | One readiness vocabulary for dependencies, artifact shape, loaded-real evidence, and missing requirements. | Extract shared readiness types and map cooperative model plus Llama artifact states into the Platform AI Branch Status evidence/missing shape. |
| 3 | Electron AI Result Sync | Electron-owned projection from AI Worker task results into Asset Library state. | Split task result projection rules out of `AiClientService` while preserving existing Queue Sync and IPC behavior. |
| 4 | Asset Tagging Workflow | One workflow module for Asset Category routing, Tag Fusion plan, AI Tag Task submission, and Tag Suggestion projection. | Move category-to-model pipeline and pending Tag Suggestion projection out of renderer panels into a shared workflow interface. |
| 5 | Visual Analysis Snapshot | Stable renderer-ready projection for Color Palette, Text Box, OCR Text, Text Color Analysis, and Readability Score. | Add a snapshot mapper that hides stored payload version drift from `ColorPalettePanel`. |
| 6 | Platform AI Action Plan | Shared mapping from workflow evidence gaps to existing user-initiated UI operations. | Route model artifacts to Models, runtime dependencies/services to Runtime, backend configuration to Services, and unresolved evidence to manual refresh. |
| 7 | Real AI Evidence Closure | Real load or inference evidence for supported MPS/ONNX and GGUF/mmproj routes, plus a clear MLX decision and Windows parity validation. | Replace evidence-insufficient states one route at a time without changing the shared workflow shape. |

## Design Rules

- Default to shared contracts, shared renderer modules, and shared main-process workflow modules.
- Keep platform differences inside adapters, runtime-lane evidence, packaging/native dependency plans, or path/process helpers.
- Do not fork product UI only because the underlying runtime differs.
- Do not present Runtime Probe evidence as a Real Model Path.
- Treat unknown evidence as insufficient information, not failure.
- Keep status `nextAction` display-only. `PlatformAiActionPlan` owns executable UI routing, while execution remains in existing operation IPC handlers and requires explicit user actions.
- First-version status projectors may read existing in-memory state, settings, cached status, and side-effect-light status/probe methods aggressively, but they must not start runtimes, install dependencies, download models, inspect user assets, or trigger non-user-initiated external network checks.
- Explicit real-load evidence is user-initiated, path-free, scoped to one registered model route, and expires from the main-process evidence cache after five minutes.

## Non-Goals

- No database schema rewrite.
- No AI Worker HTTP contract rewrite.
- No one-shot rewrite of AI Console or Asset Inspector.
- No automatic model downloads, dependency installation, runtime launch, or external network probe.
- No collapse of Windows and macOS inference runtimes into one universal AI stack.

## Validation Focus

- Shared type and IPC contract tests for both platform branch status channels.
- Renderer tests that consume one response shape for Windows and macOS.
- Projector tests that prove workflow status is shared while runtime-lane evidence can differ by platform.
- Focused docs-sync and privacy checks after each slice.
