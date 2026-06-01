# Main Services

Business services for local assets, browser capture, tags, settings, downloads, colors, OCR, and AI polling.

## Entry Files

- `asset.service.ts`: asset persistence and file preparation.
- `browser-view.manager.ts`: browser view orchestration.
- `browser-preview-injection.ts`: injected browser preview script.
- `color-palette.service.ts`: color palette facade.
- `ai-client.service.ts`: Electron-side AI polling facade.
- `tag*.service.ts`: tag and suggestion services.
- `settings.service.ts`: settings persistence.

## Rules

- Keep public service methods stable.
- Split helper logic into small local modules before changing behavior.
- Do not change database schema or AI polling semantics from this folder.

## Tests

```bash
npm run typecheck
npm run build
```

## Change Log

| Version | Time | Change |
| --- | --- | --- |
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
