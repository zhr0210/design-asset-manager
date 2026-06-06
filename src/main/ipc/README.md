# Main IPC

IPC handlers expose main-process services to the preload bridge and renderer.

## Entry Files

- `asset.ipc.ts`: asset library operations.
- `asset-tag.ipc.ts` and `tag.ipc.ts`: tag workflows.
- `download.ipc.ts`: download queue.
- `settings.ipc.ts`: app settings.
- `ai-client.ipc.ts`, `ai-worker.ipc.ts`, `ai-model.ipc.ts`: AI controls.
- `ai-runtime.ipc.ts`: AI Runtime controls and Platform AI Branch Status projection channels.
- `color-palette.ipc.ts`, `ocr*.ipc.ts`: analysis helpers.

## Rules

- Do not rename IPC channels without updating preload and shared contracts.
- Keep validation close to the handler.
- Use dedicated AI Runtime channels for Platform AI Branch Status; do not overload raw capability probe channels with product workflow status.
- Explicit AI Runtime load probes must use registered model identities rather than renderer-provided paths, return sanitized evidence, and require a user action.
- Explicit runtime execution probes must use fixed synthetic inputs and remain distinct from model-load evidence.
- AI Client handlers must use shared channel constants and request/response types rather than string literals or inline payload types.

## Tests

```bash
npm run typecheck
npm run build
```

## Change Log

| Version | Time | Change |
| --- | --- | --- |
| v1.3.4 | 2026-06-06 | Added the user-initiated fixed-tensor Python MPS execution probe channel. |
| v1.3.3 | 2026-06-06 | Added the user-initiated, registered-model-only WD Tagger ONNX load probe channel. |
| v1.3.2 | 2026-06-06 | Adopted the shared AI Client channel and request/response contract across handlers and preload. |
| v1.3.1 | 2026-06-04 | Added Platform AI Branch Status channel guidance for `ai-runtime:get-macos-ai-branch-status` and `ai-runtime:get-windows-ai-branch-status`. |
| v1.3.0 | 2026-06-04 | Documented dedicated Platform AI Branch Status IPC rule for Windows/macOS shared response shape. |
| v1.2.1 | 2026-05-31 | Added settings folder picker IPC for external model storage selection. |
| v1.2.0 | 2026-05-31 | Added Llama runtime installer IPC for hardware detection, install progress, server control, and tests. |
| v1.1.0 | 2026-05-31 | Added AI backend IPC handlers for external backend settings, health checks, and model lists. |
| v1.0.0 | 2026-05-31 | Rewrote README as compact IPC ownership and channel-safety notes. |
