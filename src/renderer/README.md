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

## Tests

```bash
npm run typecheck
npm run build
```

## Change Log

| Version | Time | Change |
| --- | --- | --- |
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
