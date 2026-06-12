# Main Process

Electron main process for windows, IPC registration, local files, SQLite-backed services, and browser capture.

## Entry Files

- `index.ts`: app bootstrap and IPC setup.
- `ipc/`: IPC handlers.
- `services/`: business services.
- `db/`: SQLite connection and schema.
- `extensions/photoshow/`: bundled third-party browser helper assets; do not inspect `unpacked/` by default.

## Rules

- Keep shared product workflow orchestration in main-process modules where possible; use platform adapters only for real OS/runtime differences.
- Platform AI Branch Status projectors may read existing status/probe/settings state, but must not start runtimes, install dependencies, download models, or inspect user assets.
- Keep shared Platform AI workflow titles and summaries separate from platform-specific runtime lane topology.
- Keep reusable runtime lane labels and runtime-kind matching in shared lane metadata; leave platform tables responsible for genuine topology and primary-lane differences.
- Keep branch-to-OS support checks table-driven so the projector exposes real platform support without scattering branch conditionals.
- Keep Platform AI branch runtime provider registration descriptor-driven; concrete metadata keys and profile rules belong in descriptors, not duplicated provider blocks.

## Tests

```bash
npm run typecheck
npm run build
```

## Change Log

| Version | Time | Change |
| --- | --- | --- |
| v1.1.5 | 2026-06-13 | Moved Platform AI branch runtime provider registration to descriptors while preserving runtime ids, profile rules, and metadata keys. |
| v1.1.4 | 2026-06-13 | Mapped Platform AI branches to real OS platform names through branch metadata. |
| v1.1.3 | 2026-06-12 | Reused shared Python and Llama accelerator lane families for model-readiness projection. |
| v1.1.2 | 2026-06-12 | Centralized Platform AI runtime lane labels and runtime-kind matching while preserving platform topology. |
| v1.1.1 | 2026-06-12 | Separated shared Platform AI workflow metadata from macOS/Windows runtime lane definitions. |
| v1.1.0 | 2026-06-04 | Added shared Windows/macOS orchestration and Platform AI Branch Status projector rules. |
| v1.0.0 | 2026-05-31 | Rewrote README and documented main-process ownership and extension boundary. |
