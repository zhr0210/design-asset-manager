# Shared Contracts

Shared TypeScript types, constants, and IPC contracts used by main, preload, and renderer.

## Entry Folders

- `types/`: shared data shapes.
- `constants/`: shared enum-like values.
- `contracts/`: IPC request and response contracts.
- `workflows/`: shared product workflow planners.
- `index.ts`: public barrel.

## Rules

- Keep shared types runtime-free.
- Do not change exported contract names without updating every caller.
- Platform AI Branch Status contracts must keep one response shape for Windows and macOS; platform differences belong in runtime-lane evidence.
- Platform AI Branch Status panel copy, Chinese workflow titles/summaries, status tones, primary-lane flags, evidence summaries, missing summaries, and display-only action labels belong in shared workflow projection; renderer panels should not reinterpret business status or localize it independently.
- Platform AI route overview titles, descriptions, priorities, dependency action labels, diagnostic tile labels, runtime-lane captions, macOS-only diagnostic visibility, and Windows runtime-lane summaries belong in shared workflow projection.
- Platform AI Branch Status channel-response selection belongs in shared workflow code and may only rank `workflow/status/evidence/missing/runtimeLanes`; display-only `title/summary/nextAction` must not affect selection.
- Platform AI Action Plan projection maps status and missing requirements to existing model, runtime, backend, or manual-refresh UI operations. Renderer code executes the projected command but must not infer the destination from labels or evidence text.
- Explicit model-load probes may promote only the workflow/runtime lane they actually verified. Probe responses must be path-free, time-bounded evidence and must not imply that adjacent OCR or embedding routes passed.
- OCR real evidence uses one shared generated-image response shape. Promotion requires a finite result with at least one detected text box; dependency or artifact gaps remain missing requirements.
- Runtime readiness must not suppress model dependency/artifact missing requirements; only a real model path may hide gaps from unused alternative lanes.
- `aiRuntime:probeOcrRealEvidence` is an additive, user-triggered operation shared by Windows and macOS; it does not alter the Platform AI Branch Status response shape.
- MPS/CUDA fixed-tensor execution is runtime evidence only. It may prove `runtime_probe_ready`, but cannot promote any workflow to `real_model_path`.
- Runtime execution probes prove only that a runtime/device can execute fixed synthetic work; they must remain separate from real-model load or inference evidence.
- Model Artifact Readiness vocabulary describes dependency/artifact/load evidence only; it must not expose local model paths or private cache locations.
- Model Artifact Readiness display projection owns active prompt-model readiness, model-row source/status/action labels, cooperative model readiness details, download progress, and GGUF/mmproj artifact tile labels; renderer model lists should not branch on artifact or Worker readiness states locally.
- Worker cooperative-model readiness input uses one shared snapshot contract across main-process evidence mapping and renderer row projection; model rows should consume the combined shared row display rather than composing readiness, download, and action state independently.
- Model artifact evidence may project to multiple platform runtime-lane IDs for the same shared workflow; branch projectors consume only their own lanes so macOS MPS/Metal and Windows CUDA remain platform details rather than separate product workflows.
- AI task polling should use shared terminal/success/failure classification for `synced`, `completed`, and `failed` instead of hard-coded renderer checks.
- AI Client IPC channels, request payloads, Worker-shaped responses, queue stats, and task-sync events must use `contracts/ai-client.contract.ts` across main, preload, and service boundaries.
- AI queue display summaries and row labels should use shared projection so overview and runtime panels show the same queue vocabulary.
- Download queue status labels, row metadata, file-size labels, progress labels, progress tones, search-result action labels, active counts, and topbar/sidebar download indicators should use shared projection rather than route-local status checks.
- AI runtime compatibility and Llama runtime display states should use shared projection so Settings and AI Console share the same status vocabulary.
- Llama service health is runtime evidence only. `real_model_path` requires a fresh successful text plus generated-image inference probe through GGUF/mmproj.
- macOS/Windows AI capability matrix title, description, status labels, and badge classes should use shared AI Runtime Status projection rather than component-local platform copy or status maps.
- Shared AI capability matrix renderer inputs should use the platform-neutral Worker probe-with-runtime-versions shape, not macOS/Windows concrete probe result unions or renderer-local cross-platform probe types.
- AI runtime capability status, capability rows, Worker capability probes, Worker lane probes, and Worker probe result envelopes should live in platform-neutral runtime types; macOS/Windows runtime type files may add platform-specific lane IDs, metadata, and device details only.
- AI Runtime panel runtime/health badges, icon semantics, health-result copy, and summary counts should use shared AI Runtime Status projection rather than renderer-local status maps or filters.
- AI Runtime panel platform-specific branch titles, Worker probe titles, CUDA/MPS compatibility copy, fixed-tensor execution copy, and default probe failure messages should use shared AI Runtime Status projection rather than renderer-local platform ternaries.
- Platform AI default branch fallback should use `DEFAULT_PLATFORM_AI_BRANCH` from shared AI Runtime Status projection so renderer entry points and shared projectors do not hand-write default branch policy.
- Platform AI runtime metadata constants should use shared capability, current-platform, fallback-status, and lane-status helpers; concrete macOS/Windows constant files should keep lane topology and platform runtime labels only.
- Worker probe connection headers should use the platform-neutral Worker probe envelope and branch-keyed connection marker metadata; shared workflow code should not compare concrete OS marker strings directly. Platform-specific probe displays may add MPS/CUDA/ONNX route tiles. A missing probe is evidence-insufficient (`尚未探测`), not fallback, planned, or failure.
- Platform AI branch runtime metadata selection should use branch-keyed descriptors for metadata keys and markers; renderer/shared workflow callers should not hand-roll macOS/Windows branch lookup order.
- AI Console overview status cards should use shared display projection for GPU risk and model readiness vocabulary.
- Prompt Reverse panel state labels and action suggestions should use shared projection so GGUF/Llama and native routes share one renderer-ready vocabulary.
- Asset Tagging Workflow pipeline defaults, category/model options, scan-state display, model selection toggles, task submission projection, confirmed tag chips, suggestion review items, pending suggestion projection, and tag type/color options belong in shared workflow planners, not renderer panels.
- Asset tag chip source, status, confidence, visibility, and pending opacity display should use shared projection rather than local chip-level status checks.
- Tag Manager list filtering, sorting, category labels, parent labels, alias display, and usage-count tone should use shared projection rather than route-local table rules.
- Tag Manager AI compute banner status, detail copy, and indicator tone should use shared projection rather than route-local Worker/GPU checks.
- Tag picker search, grouping, suggestion labels, usage badges, and merge-option labels should use shared projection rather than tag-component-local matching rules.
- Library tag sidebar groups, shortcut filter states, and active query chip labels should use shared projection rather than library-component-local query parsing.
- Asset card/detail/original-viewer/caption metadata labels, tag preview overflow, file-size labels, image spec labels, zoom labels, caption source labels, and dashboard recent-asset summaries should use shared projection rather than renderer-local formatting.
- Visual Analysis Snapshot mappers should hide palette payload version drift, image/theme display summaries, OCR/text-box/readability summaries, text-color panel state rules, swatch role/copy/tooltip formatting, and panel metadata labels from renderer panels.
- Persisted Visual Analysis palette inputs may retain unknown extension fields for backward compatibility, but snapshot workflow code must narrow them from `unknown` and expose typed renderer-ready output instead of propagating `any`.
- Doctor and Path Governance panels should use shared display projection for status labels, badge classes, check labels, platform labels, report dates, details fallback, managed-path summary, and path masking rather than renderer-local dictionaries.
- Settings Migration panels and plans should use shared display projection for status badge styling/labels, plan/report status resolution, plan summary key-value labels, backup list formatting, and list empty labels rather than component-local status maps or size formatters.

## Tests

```bash
npm run typecheck
npm run build
```

## Change Log

| Version | Time | Change |
| --- | --- | --- |
| v1.8.8 | 2026-06-14 | Preserved model dependency and artifact gaps when a workflow has runtime evidence but no real model path. |
| v1.8.7 | 2026-06-14 | Added the shared explicit OCR real-evidence IPC contract and Chinese display projection. |
| v1.8.24 | 2026-06-13 | Moved Worker probe connection recognition to branch-keyed marker metadata without changing probe semantics. |
| v1.8.23 | 2026-06-13 | Moved Platform AI runtime lane-status policy into shared constants while preserving concrete lane topology. |
| v1.8.22 | 2026-06-13 | Moved Platform AI runtime metadata capability and fallback-status helpers into shared constants while preserving concrete lane topology. |
| v1.8.21 | 2026-06-13 | Moved Platform AI default branch fallback to `DEFAULT_PLATFORM_AI_BRANCH` for shared projectors and renderer initial state. |
| v1.8.20 | 2026-06-13 | Moved Doctor platform label display to shared metadata while preserving macOS label and raw platform fallback. |
| v1.8.19 | 2026-06-13 | Moved Platform AI branch runtime metadata selection to branch-keyed descriptors and locked the current-branch priority order in shared workflow tests. |
| v1.8.18 | 2026-06-12 | Normalized Worker diagnostics selection through one branch resolver and branch-indexed probe map. |
| v1.8.17 | 2026-06-12 | Centralized macOS/Windows Worker probe connection and accelerator reads in branch-keyed accessors. |
| v1.8.16 | 2026-06-12 | Moved the macOS-specific Platform AI runtime-install command into branch-keyed action metadata. |
| v1.8.15 | 2026-06-12 | Added a platform-neutral Platform AI runtime lane ID type for shared main-process metadata and readiness routes. |
| v1.8.14 | 2026-06-12 | Moved shared Worker probe header projection from macOS/Windows concrete probe unions to the platform-neutral Worker probe envelope. |
| v1.8.13 | 2026-06-12 | Added a platform-neutral Worker probe-with-runtime-versions type for shared AI capability matrix inputs. |
| v1.8.12 | 2026-06-12 | Moved the shared AI capability matrix prop type from macOS/Windows concrete probe unions to a platform-neutral Worker probe envelope plus minimal runtime version fields. |
| v1.8.11 | 2026-06-12 | Added a platform-neutral Worker probe result base type so macOS/Windows runtime probes share one envelope while keeping device details platform-specific. |
| v1.8.10 | 2026-06-11 | Added platform-neutral AI runtime lane and branch metadata base types for macOS/Windows runtime definitions. |
| v1.8.9 | 2026-06-11 | Extracted platform-neutral AI runtime capability/probe types so Windows runtime types no longer depend on macOS runtime types. |
| v1.8.8 | 2026-06-11 | Renamed the reusable AI capability matrix renderer component to `PlatformAiCapabilityMatrix` while keeping shared projection ownership unchanged. |
| v1.8.7 | 2026-06-11 | Moved Platform AI route overview dependency labels, diagnostic tile labels, and runtime-lane captions into shared workflow projection. |
| v1.8.6 | 2026-06-11 | Moved AI capability matrix title and description into shared AI Runtime Status projection. |
| v1.8.5 | 2026-06-11 | Moved AI Runtime panel platform-specific copy and display selection into shared workflow projection for Windows/macOS parity. |
| v1.8.4 | 2026-06-11 | Moved Platform AI Action Plan UI command routing into shared workflow code so renderer actions no longer infer destinations from workflow/kind pairs. |
| v1.8.3 | 2026-06-06 | Extended ONNX probe contracts with CLIP image/text embedding operation, finite-result, and dimension evidence. |
| v1.8.2 | 2026-06-06 | Added shared MPS real-execution probe contract and display projection without promoting model workflow readiness. |
| v1.8.1 | 2026-06-06 | Added path-free, time-bounded WD Tagger ONNX real-load evidence for the AI Tag workflow. |
| v1.8.0 | 2026-06-06 | Added shared executable Platform AI Action Plan projection for model, runtime, backend, and evidence-refresh UI operations. |
| v1.7.9 | 2026-06-06 | Wired the AI Client IPC contract through main, preload, service responses, queue stats, and task-sync events. |
| v1.7.8 | 2026-06-05 | Allowed shared model artifact evidence to target both macOS and Windows runtime lanes without splitting workflows. |
| v1.7.7 | 2026-06-05 | Unified Worker cooperative readiness types and combined model-row projection across main and renderer. |
| v1.7.6 | 2026-06-05 | Added branch-aware AI route overview projection so Windows does not render macOS-only diagnostics or actions. |
| v1.7.5 | 2026-06-05 | Replaced Visual Analysis Snapshot payload and renderer `any` boundaries with typed legacy/modern palette inputs and guarded normalization. |
| v1.7.4 | 2026-06-05 | Completed Chinese Platform AI Branch Status panel and workflow display projection without changing business selection fields. |
| v1.7.3 | 2026-06-05 | Reused the shared custom-tag color default in AssetTagPanel quick creation. |
| v1.7.2 | 2026-06-05 | Moved AI Console active-model readiness and model-row artifact source/status/action projection into the shared readiness workflow. |
| v1.7.1 | 2026-06-05 | Added shared Settings Migration display projection for panel status, plan summary, backup list, and empty labels, and moved compatibility types into shared layer. |
| v1.7.0 | 2026-06-05 | Added shared Doctor and Path Governance display projection for settings panels. |
| v1.6.9 | 2026-06-05 | Moved settings panel local display helpers (INFO_LABELS, displayValue, actionLabel) and macOS branch metadata helpers to shared workflow. |
| v1.6.8 | 2026-06-05 | Moved TagEditDialog local PRESET_COLORS and TAG_TYPES plus TagChip local type-to-color class mapping into shared Asset Tagging Workflow type/color options. |
| v1.6.7 | 2026-06-05 | Moved remaining renderer-local ColorPalettePanel formatting (OCR count, box ratio, metadata, and background source labels) to shared projection. |
| v1.6.6 | 2026-06-05 | Added typed Visual Analysis swatch role, copy-value, contrast, confidence, and text-box display projection. |
| v1.6.5 | 2026-06-05 | Added shared Asset Tagging panel scan-state, category-option, and model-toggle projection. |
| v1.6.4 | 2026-06-05 | Added shared Platform AI Branch Status candidate selection based only on business status and evidence fields. |
| v1.6.3 | 2026-06-05 | Added shared macOS Worker probe connection and route-tile projection with evidence-insufficient unchecked states. |
| v1.6.2 | 2026-06-05 | Added shared AI Runtime panel status, health-result, icon-semantic, and summary-count projection. |
| v1.6.1 | 2026-06-05 | Moved PlatformAiCapabilityMatrix status labels and badge classes into shared AI Runtime Status projection. |
| v1.6.0 | 2026-06-05 | Extended Model Artifact Readiness display projection to Smoke GGUF and Vision mmproj artifact tile labels. |
| v1.5.9 | 2026-06-04 | Extended Model Artifact Readiness display projection to cooperative model download progress visibility, labels, and clamped percentages. |
| v1.5.8 | 2026-06-04 | Extended shared Asset Display projection to caption text, source labels, restore/regenerate copy, and updated-at labels. |
| v1.5.7 | 2026-06-04 | Extended shared Download Status projection to queue-row metadata, file-size labels, and progress labels. |
| v1.5.6 | 2026-06-04 | Extended shared Asset Display projection to original image viewer metadata, preview source, zoom labels, and fit-toggle copy. |
| v1.5.5 | 2026-06-04 | Added shared Asset Display projection for library cards, dashboard recent assets, tag overflow, file-size labels, dates, and detail specs. |
| v1.5.4 | 2026-06-04 | Added shared Library tag sidebar and active filter-chip projection for query labels, shortcut states, and usage groups. |
| v1.5.3 | 2026-06-04 | Added shared Asset Tag picker/input projection for selection groups, suggestions, usage badges, and merge option labels. |
| v1.5.2 | 2026-06-04 | Added shared Download Status projection for queue rows, search actions, dashboard counts, sidebar badge, and topbar indicator. |
| v1.5.1 | 2026-06-04 | Added shared Asset Tagging compute banner projection for Tag Manager Worker/GPU status copy and indicator tone. |
| v1.5.0 | 2026-06-04 | Added shared Tag Manager list projection for filtering, sorting, category labels, parent labels, aliases, and usage-count display. |
| v1.4.9 | 2026-06-04 | Added shared Asset Tag chip display projection for source labels, confidence, pending/rejected state, and tooltip status. |
| v1.4.8 | 2026-06-04 | Added shared AI Console overview display projection for GPU risk and model-readiness status cards. |
| v1.4.7 | 2026-06-04 | Added shared AI runtime compatibility and Llama runtime display projection for Settings and AI Console. |
| v1.4.6 | 2026-06-04 | Added shared Prompt Reverse panel state projection for loading, error, result, ready, and configuration-needed display. |
| v1.4.5 | 2026-06-04 | Added shared AI queue status display projection for overview cards and queue preview rows. |
| v1.4.4 | 2026-06-04 | Added shared AI task status classifier for renderer polling terminal/success/failure rules. |
| v1.4.3 | 2026-06-04 | Added shared Model Artifact Readiness display projection for cooperative model readiness labels, tones, and details. |
| v1.4.2 | 2026-06-04 | Added shared Platform AI Branch Status display projection for AI Console status labels, tones, lane badges, evidence, and missing summaries. |
| v1.4.1 | 2026-06-04 | Added Visual Analysis image/theme display projection for theme pills, dominant color, and image swatches. |
| v1.4.0 | 2026-06-04 | Added Visual Analysis OCR/text-box/readability summary projection without exposing full OCR text in panel UI. |
| v1.3.9 | 2026-06-04 | Extended Visual Analysis Snapshot with text-color panel state, skip/failure messages, warnings, and foreground swatch display fields. |
| v1.3.8 | 2026-06-04 | Added shared confirmed Asset Tag chip projection for dedupe, active names, and search query targets. |
| v1.3.7 | 2026-06-04 | Added shared Asset Tagging suggestion review item projection for confidence labels and review actions. |
| v1.3.6 | 2026-06-04 | Added shared Asset Tagging task submission projection for model-list cleanup and task model names. |
| v1.3.5 | 2026-06-04 | Added shared pending Tag Suggestion projection for Asset Tagging Workflow. |
| v1.3.4 | 2026-06-04 | Added shared Visual Analysis Snapshot mapper for renderer-ready palette and text-color projection. |
| v1.3.3 | 2026-06-04 | Added shared Asset Tagging Workflow planner for category-to-model pipeline defaults. |
| v1.3.2 | 2026-06-04 | Added shared Model Artifact Readiness vocabulary for Platform AI Branch Status evidence and missing requirements. |
| v1.3.1 | 2026-06-04 | Added shared Platform AI Branch Status types and dedicated AI Runtime IPC contract entries. |
| v1.3.0 | 2026-06-04 | Documented shared Platform AI Branch Status response-shape rule for Windows/macOS. |
| v1.2.3 | 2026-05-31 | Added persisted custom prompt reverse template settings and shared default prompt template constants. |
| v1.2.2 | 2026-05-31 | Added optional official release date metadata to native and GGUF AI model types for AI Console version display. |
| v1.2.1 | 2026-05-31 | Extended Llama installer plan types with Qwen3-VL candidate and mmproj metadata. |
| v1.2.0 | 2026-05-31 | Added shared Llama runtime installer types and IPC contracts. |
| v1.1.0 | 2026-05-31 | Added shared external AI backend types and IPC contracts. |
| v1.0.0 | 2026-05-31 | Rewrote README with compact shared contract rules and change log. |
