# llama-runtime Governance

Phase 12B adds a read-only governance plan for llama-runtime. It does not download models, install llama.cpp, install llama.app, or start a local llama service.

## Adapter Direction

| Adapter | Platform | Priority | Boundary |
| --- | --- | --- | --- |
| External OpenAI-compatible endpoint | All | First | User configured; manual health check only. |
| llama.app | macOS | Second | Treat as an already-running local external endpoint. |
| llama.cpp | Windows | Third | Existing installer/start behavior stays behind explicit user action. |

## Governance Rules

- `externalInferencePreferred: true`
- `autoDownload: false`
- `autoInstall: false`
- `autoStart: false`
- health checks are user initiated only
- local adapters must not replace the external HTTP runtime boundary

## Remaining Risks

The existing llama-runtime install service can still download runtime packages and models, update settings, and launch a local llama server when explicitly invoked. This phase records those risks and keeps new governance code side-effect free.

## Next Step

Phase 13A should prepare database path design with `pathRootId`, relative path helpers, legacy absolute path fallback, and dry-run remap planning without schema or data migration.
