# AI Client Helpers

Internal helpers for `ai-client.service.ts`.

## Entry Files

- `queue-stats.ts`: reads local AI task queue counts for model status UI.
- `ai-result-sync.projector.ts`: normalizes Worker lifecycle and completion payloads.
- `ai-task-lifecycle-sync.sink.ts`: applies lifecycle plans to task records and non-completion asset status columns.
- `ai-tag-suggestion-sync.sink.ts`: persists projected suggestions and pending asset-tag relations.

## Rules

- Keep Electron Poller behavior in `ai-client.service.ts`.
- Helpers must not change AI Worker API paths or database status semantics.
- Keep completed asset-result transactions in the polling facade; reuse the lifecycle sink for task completion records and non-completion status transitions.
- Service entry points return the shared AI Client IPC response shapes; preserve Worker snake_case fields at this boundary.

## Tests

```bash
npm run typecheck
npm run build
```

## Change Log

| Version | Time | Change |
| --- | --- | --- |
| v1.3.0 | 2026-06-06 | Typed AI Client service entry points and task-sync notifications with the shared IPC contract. |
| v1.2.0 | 2026-06-05 | Added legacy asynchronous prompt lifecycle/completion sync without overwriting asset captions. |
| v1.1.0 | 2026-06-05 | Added shared task lifecycle persistence for tagging and analysis polling. |
| v1.0.0 | 2026-05-31 | Extracted AI queue stats helper from the AI client service. |
