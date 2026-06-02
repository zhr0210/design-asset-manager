# AI Client Runtime Adapter

Phase 11C adds a planning adapter between the old AI Client chain and the AI Runtime abstraction.

## Current Old Chain

`src/main/services/ai-client.service.ts` still owns:

- Python Worker HTTP calls;
- SQLite task writes;
- background polling;
- renderer notifications;
- old-chain fallback behavior.

Phase 11C does not change that file.

## Adapter Boundary

`src/main/services/ai-client/ai-runtime-adapter.ts` adds plan-only bridges:

- mock bridge;
- external HTTP bridge;
- Python Worker bridge.

The adapter requires a grey switch before choosing AI Runtime. If the switch is disabled or the bridge is incompatible, the plan keeps `fallbackToOldChain: true`.

## Safety Boundaries

This phase does not:

- call `fetch`;
- read or write SQLite;
- start a runtime;
- run prompt inference;
- save settings;
- modify IPC contracts.

## Next Step

Phase 12A should audit and govern OCR dependencies before any installer work.
