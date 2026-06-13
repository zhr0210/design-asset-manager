# llama-runtime Governance

Phase 12B adds a read-only governance plan for llama-runtime. It does not download models, install llama.cpp, install llama.app, or start a local llama service.

## Adapter Direction

| Adapter | Platform | Priority | Boundary |
| --- | --- | --- | --- |
| External OpenAI-compatible endpoint | All | First | User configured; manual health check only. |
| llama.app | macOS | Second | Treat as an already-running local external endpoint. |
| llama.cpp | Windows | Third | Existing installer/start behavior stays behind explicit user action. |

The platform-local adapters are selected through `LLAMA_RUNTIME_PLATFORM_ADAPTERS`.
Adding or removing a read-only platform adapter should update that descriptor
table instead of adding platform conditionals to the plan flow.

Server executable and force-stop process metadata are selected through
`LLAMA_SERVER_PROCESS_ADAPTERS`. Keep executable names, missing-executable copy,
and Windows task cleanup there; keep install, download, and launch actions
explicitly user-triggered.

## Governance Rules

- `externalInferencePreferred: true`
- `autoDownload: false`
- `autoInstall: false`
- `autoStart: false`
- health checks are user initiated only
- local adapters must not replace the external HTTP runtime boundary

## Remaining Risks

The existing llama-runtime install service can still download runtime packages and models, update settings, and launch a local llama server when explicitly invoked. This phase records those risks and keeps new governance code side-effect free.

The existing user-triggered `llama-runtime:test-server` operation now performs both a text completion and a generated in-memory image request. It does not read user assets or persist the generated image. A successful image response is retained for five minutes as GGUF/mmproj real-inference evidence; service health alone is not real-model evidence.

## Next Step

Phase 13A should prepare database path design with `pathRootId`, relative path helpers, legacy absolute path fallback, and dry-run remap planning without schema or data migration.
