# Renderer

React UI for library browsing, downloading, settings, tags, AI console, and asset inspection.

## Entry Files

- `main.tsx`: React bootstrap.
- `App.tsx`: route shell.
- `routes/`: page-level screens.
- `components/`: reusable UI.
- `stores/`: Zustand state.
- `hooks/`: renderer hooks.

## Rules

- Keep route files thin; move repeated UI into components.
- Keep stores focused on state and IPC calls.
- Preserve existing preload API usage.
- Renderer should display Platform AI Branch Status projection from main process, not recompute Runtime Probe or Model Readiness meaning.
- Renderer should use shared Platform AI Branch Status candidate selection for macOS/Windows channel responses instead of inspecting workflow statuses locally.
- Renderer AI route overview should use shared branch-aware display projection; macOS dependency actions and MPS diagnostics must not render for Windows or an unknown branch.
- Renderer cooperative model rows should consume the shared Worker readiness snapshot and combined row projection instead of redeclaring Worker payload fields or composing artifact state locally.
- Renderer AI runtime panels should consume shared status display projection for macOS capability matrix labels and badge classes instead of defining local status maps.
- Renderer AI runtime cards should consume shared runtime/health badge, icon-semantic, health-result, and summary projections instead of filtering or labeling runtime states locally.
- Renderer macOS probe summaries should consume shared connection and route-tile projection so missing probe evidence renders as `尚未探测` instead of a capability conclusion.
- Renderer download pages and shell indicators should consume shared Download Status projections instead of formatting row metadata or status copy locally.
- Renderer tag panels should consume the shared Asset Tagging Workflow plan instead of owning category-to-model pipeline defaults.
- Renderer visual-analysis panels should consume shared snapshots instead of branching on stored palette payload versions, image/theme payload fields, OCR/text-box/readability fields, or text-color status codes.

## Tests

```bash
npm run typecheck
npm run build
```

## Change Log

| Version | Time | Change |
| --- | --- | --- |
| v1.4.9 | 2026-06-06 | Added a manual CLIP/SigLIP real Embedding action and shared evidence display in AI Runtime management. |
| v1.4.8 | 2026-06-05 | Renamed the real asset-tagging action and left submission normalization in Electron main. |
| v1.4.7 | 2026-06-05 | Unified cooperative Worker readiness input and model-row composition through shared contracts. |
| v1.4.6 | 2026-06-05 | Made AI Console route overview branch-aware and removed macOS-only diagnostics/actions from Windows and unknown branch states. |
| v1.4.5 | 2026-06-05 | Routed macOS/Windows Platform AI Branch Status response selection through shared workflow logic. |
| v1.4.4 | 2026-06-05 | Routed macOS Worker probe connection and route tiles through shared evidence-aware projection. |
| v1.4.3 | 2026-06-05 | Routed AI Runtime card status, health results, icon semantics, and summary counts through shared workflow projection. |
| v1.4.2 | 2026-06-05 | Routed MacOSAiCapabilityMatrix status labels and badge classes through shared workflow projection. |
| v1.4.1 | 2026-06-04 | Added renderer rule for shared Download Status row metadata and status projection. |
| v1.4.0 | 2026-06-04 | Moved Color Palette image/theme display fields behind the shared Visual Analysis Snapshot. |
| v1.3.9 | 2026-06-04 | Added renderer rule for consuming Visual Analysis OCR/text-box/readability summary from the shared snapshot. |
| v1.3.8 | 2026-06-04 | Moved text-color panel state and swatch display fields behind the shared Visual Analysis Snapshot. |
| v1.3.7 | 2026-06-04 | Routed Color Palette panel through the shared Visual Analysis Snapshot mapper. |
| v1.3.6 | 2026-06-04 | Moved AI smart-tagging category pipeline defaults to the shared Asset Tagging Workflow planner. |
| v1.3.5 | 2026-06-04 | Added renderer rule for consuming Platform AI Branch Status projection instead of recomputing branch status. |
| v1.3.4 | 2026-05-31 | Added custom prompt reverse templates in AI Console and a custom reverse action in the asset prompt panel. |
| v1.3.3 | 2026-05-31 | Added a front-end reverse-prompt system panel and scrollable current-model prompt preview in AI Console. |
| v1.3.2 | 2026-05-31 | Reworked AI Console into a runtime cockpit with distinct overview, expandable Qwen3-VL installed versions, inference-service naming, and in-model memory policy controls. |
| v1.3.1 | 2026-05-31 | Changed AI Console settings into a default-closed floating overlay and hardened the desktop shell, sidebar, and topbar against narrow-window layout collapse. |
| v1.3.0 | 2026-05-31 | Promoted AI Console into a core AI workspace, moved AI-specific settings out of system preferences, refreshed AI/library interaction entry points, and cleaned navigation/topbar Chinese labels. |
| v1.2.3 | 2026-05-31 | Added settings control for external AI model and Llama runtime storage directories. |
| v1.2.2 | 2026-05-31 | Expanded Llama installer dropdown to show multiple Qwen3-VL quantization options per model size. |
| v1.2.1 | 2026-05-31 | Added Qwen3-VL model selection dropdown to the Llama installer wizard. |
| v1.2.0 | 2026-05-31 | Added settings-page Llama local service installation wizard. |
| v1.1.0 | 2026-05-31 | Added settings UI controls for external OpenAI-compatible and llama AI backends. |
| v1.0.0 | 2026-05-31 | Rewrote README with compact renderer ownership and maintenance rules. |
