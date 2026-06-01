# AI Client Helpers

Internal helpers for `ai-client.service.ts`.

## Entry Files

- `queue-stats.ts`: reads local AI task queue counts for model status UI.

## Rules

- Keep Electron Poller behavior in `ai-client.service.ts`.
- Helpers must not change AI Worker API paths or database status semantics.

## Tests

```bash
npm run typecheck
npm run build
```

## Change Log

| Version | Time | Change |
| --- | --- | --- |
| v1.0.0 | 2026-05-31 | Extracted AI queue stats helper from the AI client service. |
