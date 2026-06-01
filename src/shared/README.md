# Shared Contracts

Shared TypeScript types, constants, and IPC contracts used by main, preload, and renderer.

## Entry Folders

- `types/`: shared data shapes.
- `constants/`: shared enum-like values.
- `contracts/`: IPC request and response contracts.
- `index.ts`: public barrel.

## Rules

- Keep shared types runtime-free.
- Do not change exported contract names without updating every caller.

## Tests

```bash
npm run typecheck
npm run build
```

## Change Log

| Version | Time | Change |
| --- | --- | --- |
| v1.2.3 | 2026-05-31 | Added persisted custom prompt reverse template settings and shared default prompt template constants. |
| v1.2.2 | 2026-05-31 | Added optional official release date metadata to native and GGUF AI model types for AI Console version display. |
| v1.2.1 | 2026-05-31 | Extended Llama installer plan types with Qwen3-VL candidate and mmproj metadata. |
| v1.2.0 | 2026-05-31 | Added shared Llama runtime installer types and IPC contracts. |
| v1.1.0 | 2026-05-31 | Added shared external AI backend types and IPC contracts. |
| v1.0.0 | 2026-05-31 | Rewrote README with compact shared contract rules and change log. |
