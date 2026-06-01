# Main IPC

IPC handlers expose main-process services to the preload bridge and renderer.

## Entry Files

- `asset.ipc.ts`: asset library operations.
- `asset-tag.ipc.ts` and `tag.ipc.ts`: tag workflows.
- `download.ipc.ts`: download queue.
- `settings.ipc.ts`: app settings.
- `ai-client.ipc.ts`, `ai-worker.ipc.ts`, `ai-model.ipc.ts`: AI controls.
- `color-palette.ipc.ts`, `ocr*.ipc.ts`: analysis helpers.

## Rules

- Do not rename IPC channels without updating preload and shared contracts.
- Keep validation close to the handler.

## Tests

```bash
npm run typecheck
npm run build
```

## Change Log

| Version | Time | Change |
| --- | --- | --- |
| v1.2.1 | 2026-05-31 | Added settings folder picker IPC for external model storage selection. |
| v1.2.0 | 2026-05-31 | Added Llama runtime installer IPC for hardware detection, install progress, server control, and tests. |
| v1.1.0 | 2026-05-31 | Added AI backend IPC handlers for external backend settings, health checks, and model lists. |
| v1.0.0 | 2026-05-31 | Rewrote README as compact IPC ownership and channel-safety notes. |
