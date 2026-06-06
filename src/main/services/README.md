# Main Services

Business services for local assets, browser capture, tags, settings, downloads, colors, OCR, and AI polling.

## Entry Files

- `asset.service.ts`: asset persistence and file preparation.
- `browser-view.manager.ts`: browser view orchestration.
- `browser-preview-injection.ts`: injected browser preview script.
- `color-palette.service.ts`: color palette facade.
- `ai-client.service.ts`: Electron-side AI polling facade.
- `ai-client/ai-result-sync.projector.ts`: pure projection rules for Worker task results before SQLite sync.
- `ai-client/ai-task-lifecycle-sync.sink.ts`: shared persistence for projected task completion records plus active, failed, and cancelled task/asset lifecycle state.
- `ai-client/ai-tag-suggestion-sync.sink.ts`: shared sink for projected AI tag suggestions into `tag_suggestions`, `tags`, and pending `asset_tags`.
- `tag*.service.ts`: tag and suggestion services.
- `settings.service.ts`: settings persistence.
- `ai-runtime/platform-ai-branch-status.projector.ts`: workflow-first Windows/macOS AI branch status projection.
- `ai-runtime/model-artifact-readiness.mapper.ts`: maps existing cooperative/Llama artifact state into shared readiness evidence without scanning model caches.

## Rules

- Keep public service methods stable.
- Split helper logic into small local modules before changing behavior.
- Do not change database schema or AI polling semantics from this folder.
- Keep Platform AI Branch Status projection in main-process services; renderer should consume projected workflow status instead of recomputing probe/readiness meaning.
- Model Artifact Readiness mappers should accept existing service state and avoid exposing local filesystem paths in projected evidence.
- Worker model status mapping should use the shared cooperative readiness snapshot contract instead of declaring a main-process-only approximation.
- Readiness mappers should emit platform-specific lane variants for shared model evidence when both macOS and Windows can consume the artifact; do not hard-code MPS/Metal lanes as universal.
- Keep AI Worker result shape normalization in projector helpers before writing Queue Sync and Asset Library state.
- Completed tagging and analysis results should be projected into normalized caption/OCR/dimension/JSON/text-block/tag-suggestion plans before SQLite transactions interpret them.
- Worker task lifecycle aliases (`running`/`processing`) and terminal-result eligibility should be classified once in the result projector before polling branches choose SQLite actions.
- Worker lifecycle-to-local task/asset status, sync status, cancellation behavior, and default error messages should come from a pure sync action plan; non-completion SQL execution should reuse the lifecycle sink.
- Reuse the AI tag suggestion sink when multiple Worker workflows produce pending tag suggestions.

## Tests

```bash
npm run typecheck
npm run build
```

## Change Log

| Version | Time | Change |
| --- | --- | --- |
| v1.4.10 | 2026-06-06 | Replaced synthetic Python Worker process tracking with real child-process lifecycle management, bounded logs, shutdown cleanup, and a cold-start capability-probe budget. |
| v1.4.9 | 2026-06-05 | Added Windows CUDA/Llama lane variants to shared model artifact readiness evidence. |
| v1.4.8 | 2026-06-05 | Reused the shared Worker cooperative readiness snapshot contract in Model Artifact Readiness mapping. |
| v1.4.7 | 2026-06-05 | Added one lifecycle sink for tagging/analysis task completion records and non-completion status persistence. |
| v1.4.6 | 2026-06-05 | Added pure lifecycle-to-SQLite action plans for tagging and analysis result sync. |
| v1.4.5 | 2026-06-05 | Added shared Worker task lifecycle classification and removed the dead Prompt polling copy. |
| v1.4.4 | 2026-06-05 | Extended Electron AI Result Sync projection to completed tagging and analysis asset-update plans. |
| v1.4.3 | 2026-06-04 | Added shared AI tag suggestion sync sink for Electron AI Result Sync. |
| v1.4.2 | 2026-06-04 | Added Electron AI Result Sync projector boundary for Worker task result normalization. |
| v1.4.1 | 2026-06-04 | Added Model Artifact Readiness mapper guidance for feeding shared branch-status evidence without exposing local paths. |
| v1.4.0 | 2026-06-04 | Added Platform AI Branch Status projector entry for shared Windows/macOS workflow status. |
| v1.3.9 | 2026-06-04 | Documented main-process ownership of Platform AI Branch Status projection. |
| v1.3.8 | 2026-05-31 | Stopped reporting mock GPU telemetry when the Python AI Worker is offline so AI Console safety checks treat unavailable telemetry as unknown instead of real. |
| v1.3.7 | 2026-05-31 | Optimized download performance by routing runtime package downloads to a shared, persistent directory and implementing pre-download checks to verify and reuse existing files via SHA256 hashes or size match. |
| v1.3.6 | 2026-05-31 | Fixed a critical regex asset matching bug by adding ^ anchors, preventing cudart-llama zip assets from being incorrectly matched as the main llama runtime. |
| v1.3.5 | 2026-05-31 | Throttled Electron IPC progress emissions to 300ms intervals and enriched progress messages with real-time download speed, percentage, and size details to avoid UI sluggishness. |
| v1.3.4 | 2026-05-31 | Fixed Llama runtime extraction failures caused by unquoted space-containing paths in PowerShell commands, and resolved garbled installer error messages by setting console output encoding to UTF-8. |
| v1.3.3 | 2026-05-31 | Routed native AI model, Python model caches, and Llama runtime/model downloads through the user-configurable model storage directory. |
| v1.3.2 | 2026-05-31 | Expanded Llama installer Qwen3-VL choices to include official Q4_K_M, Q8_0, and F16 quantization options per size. |
| v1.3.1 | 2026-05-31 | Limited Llama installer model choices to Qwen3-VL GGUF candidates with mmproj support. |
| v1.3.0 | 2026-05-31 | Added Llama runtime installer service for hardware-based llama.cpp package and GGUF setup. |
| v1.2.0 | 2026-05-31 | Added settings-backed external AI backend services for OpenAI-compatible and llama providers. |
| v1.1.0 | 2026-05-31 | Added browser preview injection split note. |
| v1.0.0 | 2026-05-31 | Rewrote README with compact service ownership and change-log rules. |
