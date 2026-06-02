# External HTTP Manual Health Check

Phase 11A adds a manual health-check boundary for external inference runtimes.

## Supported Runtimes

- Ollama
- LM Studio
- llama.app
- custom HTTP runtime

## Manual Access Rule

The checker requires `userInitiated: true`. If the request is not explicitly user-triggered, it returns a warning and does not call the HTTP client.

The implementation accepts an injected `ExternalHttpClient`. Tests use `MockAiRuntimeHttpClient`; no real network request is made in CI.

## Safety Boundaries

This phase does not:

- automatically contact external inference endpoints;
- start Ollama, LM Studio, llama.app, a custom server, or the Python Worker;
- save settings;
- write the runtime registry;
- run prompt inference.

## Next Step

Phase 11B should add a controlled real Python Worker launch pilot with explicit process runner boundaries, configurable port, healthcheck, stop/cleanup, and crash log planning.
