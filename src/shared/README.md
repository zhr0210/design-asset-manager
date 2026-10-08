# Shared Contracts

Shared TypeScript types, constants, and IPC contracts used by main, preload, and renderer.

## Reading scope

This README is the current module entry point. Use nearby source and tests to
verify behavior; guidance alone does not prove implementation.
For future contract decisions, select the relevant canonical ADR through
[the decision router](../../docs/adr/README.md).
[Historical change log](../../docs/history/shared-readme-changelog.md) is
traceability, not evidence of current delivery. History is not startup reading.

## Entry Folders

- `contracts/asset-card.contract.ts`: path-free native card identity, window-token actions,
  session draft synchronization and metadata notifications. `asset-description-draft.workflow.ts`
  preserves later input when older saves finish and updates clean drafts from committed metadata.
- `types/`: shared data shapes.
- `constants/`: shared enum-like values.
- `contracts/`: IPC request and response contracts.
- `workflows/`: shared product workflow planners.
- `index.ts`: public barrel.
- `desktop-viewport-policy.ts`: shared Electron window and renderer desktop shell viewport policy.

## Rules

- Keep shared types runtime-free.
- Do not change exported contract names without updating every caller.
- Model Library Workspace IPC is limited to the exact `summarize` and
  `configure-storage` intent channels. Requests contain no path, default path,
  locator, bookmark, full Storage Identity or caller-supplied verified flags.
- Platform AI Branch Status contracts must keep one response shape for Windows and macOS; platform differences belong in runtime-lane evidence.
- Platform AI Branch Status panel copy, Chinese workflow titles/summaries, status tones, primary-lane flags, evidence summaries, missing summaries, and display-only action labels belong in shared workflow projection; renderer panels should not reinterpret business status or localize it independently.
- Platform AI route overview titles, descriptions, priorities, dependency action labels/actions/icons, diagnostic tile labels, runtime-lane captions, macOS-only diagnostic visibility, and Windows runtime-lane summaries belong in shared workflow projection.
- The macOS route overview dependency button should show install only when runtime dependency evidence is missing; once dependencies are available, it becomes a detect/refresh action and must not call the install IPC.
- Platform AI Branch Status channel-response selection belongs in shared workflow code and may only rank `workflow/status/evidence/missing/runtimeLanes`; display-only `title/summary/nextAction` must not affect selection.
- Platform AI Action Plan projection maps status and missing requirements to existing model, runtime, backend, or manual-refresh UI operations. Renderer code executes the projected command but must not infer the destination from labels or evidence text.
- Explicit model-load probes may promote only the workflow/runtime lane they actually verified. Probe responses must be path-free, time-bounded evidence and must not imply that adjacent OCR or embedding routes passed.
- OCR real evidence uses one shared generated-image response shape. Promotion requires a finite result with at least one detected text box; dependency or artifact gaps remain missing requirements.
- Runtime readiness must not suppress model dependency/artifact missing requirements; only a real model path may hide gaps from unused alternative lanes.
- Missing requirements and display-only next actions prioritize the workflow's primary runtime lane before alternative-lane gaps.
- `aiRuntime:probeOcrRealEvidence` is an additive, user-triggered operation shared by Windows and macOS; it does not alter the Platform AI Branch Status response shape.
- MPS/CUDA fixed-tensor execution is runtime evidence only. It may prove `runtime_probe_ready`, but cannot promote any workflow to `real_model_path`.
- Runtime execution probes prove only that a runtime/device can execute fixed synthetic work; they must remain separate from real-model load or inference evidence.
- Model Artifact Readiness vocabulary describes dependency/artifact/load evidence only; it must not expose local model paths or private cache locations.
- Model Artifact Readiness display projection owns active prompt-model readiness, model-row source/status/action labels, cooperative model readiness details, download progress, and GGUF/mmproj artifact tile labels; renderer model lists should not branch on artifact or Worker readiness states locally.
- Filesystem presence, a legacy downloaded flag or Worker `ready_to_load` state projects only unverified local evidence. Only explicit `loaded_real` or equivalent bounded runtime evidence may promote the current execution state; neither proves a verified install transaction.
- Prompt Reverse projection must call filesystem presence local evidence, never readiness. It may offer an explicit attempt that can produce runtime evidence, but the pre-run state remains unverified.
- Worker cooperative-model readiness input uses one shared snapshot contract across main-process evidence mapping and renderer row projection; model rows should consume the combined shared row display rather than composing readiness, download, and action state independently.
- Model artifact evidence may project to multiple platform runtime-lane IDs for the same shared workflow; branch projectors consume only their own lanes so macOS MPS/Metal and Windows CUDA remain platform details rather than separate product workflows.
- AI task polling should use shared terminal/success/failure classification for `synced`, `completed`, and `failed` instead of hard-coded renderer checks.
- AI Client IPC channels, request payloads, Worker-shaped responses, queue stats, and task-sync events must use `contracts/ai-client.contract.ts` across main, preload, and service boundaries.
- AI queue display summaries and row labels should use shared projection so overview and runtime panels show the same queue vocabulary.
- Download queue status labels, row metadata, file-size labels, progress labels, progress tones, search-result action labels, active counts, and shell/menu download indicators should use shared projection rather than route-local status checks.
- AI runtime compatibility, incompatible-status metadata, and Llama runtime display states should use shared projection so Settings and AI Console share the same status vocabulary.
- Llama service health is runtime evidence only. `real_model_path` requires a fresh successful text plus generated-image inference probe through GGUF/mmproj.
- macOS/Windows AI capability matrix title, description, status labels, and badge classes should use shared AI Runtime Status projection rather than component-local platform copy or status maps.
- Shared AI capability matrix renderer inputs should use the platform-neutral Worker probe-with-runtime-versions shape, not macOS/Windows concrete probe result unions or renderer-local cross-platform probe types.
- AI runtime capability status, capability rows, Worker capability probes, Worker lane probes, and Worker probe result envelopes should live in platform-neutral runtime types; macOS/Windows runtime type files may add platform-specific lane IDs, metadata, and device details only.
- AI Runtime panel runtime/health badges, icon semantics, health-result copy, and summary counts should use shared AI Runtime Status projection rather than renderer-local status maps or filters.
- AI Runtime panel platform-specific branch titles, Worker probe titles, CUDA/MPS compatibility copy, fixed-tensor execution copy, and default probe failure messages should use shared AI Runtime Status projection rather than renderer-local platform ternaries.
- Platform AI default branch fallback should use `DEFAULT_PLATFORM_AI_BRANCH` from shared AI Runtime Status projection so renderer entry points and shared projectors do not hand-write default branch policy.
- Platform AI runtime metadata constants should use shared capability, current-platform, fallback-status, and lane-status helpers; concrete macOS/Windows constant files should keep lane topology and platform runtime labels only.
- Platform AI branch-to-OS mapping belongs in shared runtime metadata helpers; main-process projectors should consume the helper rather than owning branch/platform maps.
- Worker probe connection headers should use the platform-neutral Worker probe envelope and branch-keyed connection marker metadata; shared workflow code should not compare concrete OS marker strings directly. Platform-specific probe displays may add MPS/CUDA/ONNX route tiles. A missing probe is evidence-insufficient (`尚未探测`), not fallback, planned, or failure.
- Platform AI branch runtime metadata selection should use branch-keyed descriptors for metadata keys and markers; renderer/shared workflow callers should not hand-roll macOS/Windows branch lookup order.
- Platform AI branch status workflow cards should use shared display metadata for action button visibility and icon intent; renderer panels should not branch on workflow status or action-plan kind to decide card controls.
- AI Console overview status cards should use shared display projection for GPU risk, service-health labels, and model readiness vocabulary.
- AI Console runtime dependency install toast/log copy and result summaries should use shared display projection; renderer handlers may call existing platform-specific preload methods but should not format package failures, durations, or managed-runtime labels locally.
- Prompt Reverse panel state labels and action suggestions should use shared projection so GGUF/Llama and native routes share one renderer-ready vocabulary.
- Asset Tagging Workflow pipeline defaults, category/model options, scan-state display, model selection toggles, task submission projection, confirmed tag chips, suggestion review items, pending suggestion projection, and tag type/color options belong in shared workflow planners, not renderer panels.
- Asset tag chip source, status, confidence, visibility, and pending opacity display should use shared projection rather than local chip-level status checks.
- Tag Manager list filtering, sorting, category labels, parent labels, alias display, and usage-count tone should use shared projection rather than route-local table rules.
- Tag Manager AI compute banner status, detail copy, and indicator tone should use shared projection rather than route-local Worker/GPU checks.
- Tag picker search, grouping, suggestion labels, usage badges, and merge-option labels should use shared projection rather than tag-component-local matching rules.
- Library tag sidebar groups, shortcut filter states, and active query chip labels should use shared projection rather than library-component-local query parsing.
- Asset card/detail/original-viewer/caption metadata labels, tag preview overflow, file-size labels, image spec labels, zoom labels, caption source labels, and dashboard recent-asset summaries should use shared projection rather than renderer-local formatting.
- Asset Workspace lexical matching, hard source constraint, stable ordering, lexical-only capability state, bounded Search Match Explanation, and mixed pending-tag disclosure should use `asset-discovery.workflow.ts`; renderer routes must not reimplement rank or expose an internal numeric score.
- Visual Analysis Snapshot mappers should hide palette payload version drift, image/theme display summaries, OCR/text-box/readability summaries, text-color panel state rules, swatch role/copy/tooltip formatting, and panel metadata labels from renderer panels.
- Visual Analysis Snapshot text-color skip reason copy should stay table-driven inside the shared workflow so renderer panels and persisted payload variants do not branch on skip codes.
- Persisted Visual Analysis palette inputs may retain unknown extension fields for backward compatibility, but snapshot workflow code must narrow them from `unknown` and expose typed renderer-ready output instead of propagating `any`.
- Doctor and Path Governance panels should use shared display projection for status labels, badge classes, check labels, platform labels, report dates, details fallback, managed-path summary, and path masking rather than renderer-local dictionaries.
- Settings Migration panels and plans should use shared display projection for status badge styling/labels, plan/report status resolution, plan summary key-value labels, backup list formatting, and list empty labels rather than component-local status maps or size formatters.
- Product text-box provider normalization should use `text-box-provider.workflow.ts` so main-process settings loading/saving and AI Console state treat legacy `mock` as `none` through one shared rule.
- OCR dependency selected-provider availability should use `ocr-dependency.workflow.ts`; main-process environment checks should build provider evidence and let shared projection decide `selectedProviderAvailable`.
- Text-box provider execution planning should use descriptor metadata in `text-box-provider.workflow.ts` so product provider, execution provider, unavailable skip reason, availability reader, and mock marker policy stay shared.
- Electron BrowserWindow defaults and the renderer desktop shell minimum viewport should use `DESKTOP_VIEWPORT_POLICY` rather than main/renderer-local hard-coded window sizes.
- App route path, menu placement, Asset Workspace home route and topbar-visibility policy should use `app-navigation.workflow.ts` rather than renderer-local route tables.
- Electron app lifecycle policy should use `electron-app-lifecycle.workflow.ts` so Windows AppUserModelId and macOS quit-on-close behavior stay in one shared policy.

## Tests

```bash
npm run typecheck
npm run build
```

2026-09-13: web routes and browser-only interaction/geometry contracts are removed. Local
Asset Discovery and independent download contracts remain. Historic `browser_page_title`
and source fields in stored data retain compatibility; they are not executable web features.
