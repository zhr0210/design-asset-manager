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
- Keep reusable runtime lane labels and runtime-kind matching in shared lane metadata; leave platform topology tables responsible for genuine lane membership and primary-lane differences, then resolve lane definitions through one shared resolver.
- Keep branch-to-OS support checks table-driven so the projector exposes real platform support without scattering branch conditionals.
- Keep Platform AI branch runtime provider registration descriptor-driven; concrete metadata keys and profile rules belong in descriptors, not duplicated provider blocks or resolver functions.
- Keep Python Worker auto-start platform support in one allowlist so adding or removing OS support does not scatter bootstrap conditionals.
- Keep runtime profile default, hardware-hint selection, and recommendation reason copy in ordered metadata/rule tables; do not hand-code Windows/macOS profile branches in resolver flow.
- Keep platform profile detection mappings in metadata rules; reserve direct platform checks in the detector for normalized OS capability booleans.
- Keep Llama runtime accelerator defaults in metadata rules; reserve direct platform checks in Llama modules for artifact selection, paths, process names, and native installer adapters.
- Keep read-only Llama governance adapter selection descriptor-driven; platform conditionals belong in concrete runtime adapters, not the governance plan flow.
- Keep managed OCR/Python venv executable paths descriptor-driven; leave Python interpreter discovery and installer processes in their platform adapters.
- Keep Llama server executable, force-stop, chmod, and zip extraction process metadata descriptor-driven; do not scatter process branches through installer flow.
- Keep Llama hardware detection dispatch descriptor-driven; leave actual OS probes in macOS, Windows, and generic hardware adapters.
- Keep Electron app lifecycle policy descriptor-driven; platform-specific AppUserModelId and quit-on-close behavior belong in startup policy metadata, not inline entry-point branches.

## Tests

```bash
npm run typecheck
npm run build
```

## Change Log

| Version | Time | Change |
| --- | --- | --- |
| v1.2.8 | 2026-06-13 | Moved Llama chmod and zip extraction process policy to descriptors while preserving installer behavior. |
| v1.2.7 | 2026-06-13 | Moved Electron app lifecycle policy to descriptors while preserving Windows AppUserModelId and macOS quit behavior. |
| v1.2.6 | 2026-06-13 | Moved Llama hardware detection dispatch to descriptors while preserving platform probe behavior. |
| v1.2.5 | 2026-06-13 | Moved Llama server executable and force-stop process metadata to descriptors while preserving start/stop behavior. |
| v1.2.4 | 2026-06-13 | Moved managed OCR/Python venv executable path selection to descriptors while preserving interpreter discovery. |
| v1.2.3 | 2026-06-13 | Moved read-only Llama governance platform adapter selection to descriptors while preserving adapter output. |
| v1.2.2 | 2026-06-13 | Moved no-GPU Llama accelerator default selection to metadata while preserving Windows Vulkan and cross-platform CPU fallback. |
| v1.2.1 | 2026-06-13 | Moved runtime profile recommendation reason copy to metadata while preserving recommendations. |
| v1.2.0 | 2026-06-13 | Split Platform AI branch workflow topology from shared runtime-lane resolution while preserving lane membership. |
| v1.1.9 | 2026-06-13 | Moved Platform AI branch provider profile selection into descriptor rules while preserving runtime ids and profile mapping. |
| v1.1.8 | 2026-06-13 | Moved platform profile detection mappings to metadata rules while preserving OS capability booleans. |
| v1.1.7 | 2026-06-13 | Moved runtime profile default and hardware-hint selection to ordered metadata rules. |
| v1.1.6 | 2026-06-13 | Moved Python Worker auto-start platform support to one allowlist while preserving macOS/Windows behavior. |
| v1.1.5 | 2026-06-13 | Moved Platform AI branch runtime provider registration to descriptors while preserving runtime ids, profile rules, and metadata keys. |
| v1.1.4 | 2026-06-13 | Mapped Platform AI branches to real OS platform names through branch metadata. |
| v1.1.3 | 2026-06-12 | Reused shared Python and Llama accelerator lane families for model-readiness projection. |
| v1.1.2 | 2026-06-12 | Centralized Platform AI runtime lane labels and runtime-kind matching while preserving platform topology. |
| v1.1.1 | 2026-06-12 | Separated shared Platform AI workflow metadata from macOS/Windows runtime lane definitions. |
| v1.1.0 | 2026-06-04 | Added shared Windows/macOS orchestration and Platform AI Branch Status projector rules. |
| v1.0.0 | 2026-05-31 | Rewrote README and documented main-process ownership and extension boundary. |
