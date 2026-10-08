# Main Process

Electron main process for windows, IPC registration, local files, SQLite-backed services, local asset operations and independent downloads.

## Reading scope

This README is the current module entry point. Use nearby source and tests to
verify behavior; guidance alone does not prove implementation.
[Future ADR reference](ADR-REFERENCE.md) contains preserved planned constraints;
read only the relevant entries after selecting their canonical ADRs.
[Historical change log](../../docs/history/main-readme-changelog.md) is
traceability, not evidence of current delivery. Neither is startup reading.

Desktop Shell routing starts with the narrow shared lifecycle Interface in
`../shared/workflows/electron-app-lifecycle.workflow.ts`, then the matching
navigation or viewport policy and focused tests. The `index.ts#createWindow`
locator remains the formal wiring entry: inspect its affected call chain before
changing Main window or startup behavior. Symbol locators still budget the full
file; a deferred composition root is not evidence that its wiring was checked.

## Entry Files

- `index.ts`: app bootstrap and IPC setup.
- `external-connected-library/`: independent Eagle projection, Journal,
  conflict, cache and edit-staging Module. Production starts unconfigured and
  never probes Eagle until a reviewed pairing exists.
- `legacy-readonly-workspace/`: explicit legacy DAM discovery with a read-only
  SQLite connection; never joins the Active Library writer.
- `ipc/`: IPC handlers.
- `services/`: business services.
- `capture-intake/`: path-free Add Assets Workflow and Main-owned Capture
  Gateway used by the Active Library Host. The production macOS path now binds
  inspected/locked Library storage, SQLite Promotion, Sharp previews, narrow
  IPC/Preload channels, and the Library review UI.
- `model-library/`: metadata admission, generated-byte verified storage,
  root authority and Registry Validated Tracers behind a small Interface.
  See [its local evidence](model-library/README.md); production installation
  remains unconnected.
- `model-library-workspace/`: live bounded Model Library product composition,
  release-bundled catalog-only projection and Main-owned storage-location
  review. The current release bundle is absent, so the live page fails closed;
  generated Catalog and temporary-root flows remain Validated Tracer evidence.
- `db/`: SQLite connection and schema.

## Rules

- `index.ts` owns separate App storage and Active Library storage. Asset, Tag,
  Capture, preview and Trash operations route through the inspected and locked
  Active Library Host; disabled AI, migration and permanent-delete channels
  must not fall back to the App database.

- Keep shared product workflow orchestration in main-process modules where possible; use platform adapters only for real OS/runtime differences.
- Keep Copy Into Library behind `capture-intake`'s `prepare / dispatch /
  inspect` Interface. Renderer and producers cannot choose managed paths,
  create Candidate/Asset identity, copy originals, or write Promotion state.
- Treat both in-memory/SQLite Capture persistence and injected Preview Adapters
  as tracer Implementations, not production evidence. Do not bypass Candidate
  Activation or System Preview Ready when adding SQLite, IPC, or UI Adapters.
- Historical in-memory Model Library fixtures used an `installed` postcondition;
  it never proved real installation. The transactional tracer now reports
  `verified-stored` for generated fixtures, not Installed, Model Readiness,
  activation or production composition.
- Treat signed Catalog admission as metadata eligibility only. Its sequence
  floor is process-local; it does not verify real artifact bytes, persist trust
  state or prove storage, compatibility, readiness or activation.
- Keep the production Model Library Workspace limited to `summarize` and
  `configureStorage`. Never expose a path, full Storage Identity, Registry
  fingerprint/session, publisher signature or model digest to Renderer. The
  workspace must not read `modelRootDir`, reuse Settings folder selection, or
  gain network/download/import/install/activation/Runtime authority.
- Pin the Official Catalog Publisher public key independently from the bundled
  signed metadata. A bundle cannot nominate its own signer, and absence of
  either release input must fail closed.
- Keep the public-only Official Model Catalog release input shared by runtime
  composition and signed-candidate admission. Release evidence may expose only
  catalog identity, sequence and aggregate counts; it must never sign, read
  signing secrets, use network access or authorize model payload transfer.
- Keep Official Model Catalog preparation separate from the checked-in release
  input. It may validate explicit public JSON and exclusively create a
  candidate, but it must never overwrite the formal input, read signing
  secrets, sign metadata, contact a source or inspect model bytes.
- Keep AI Runtime IPC host platform, architecture, and home-dir reads inside the AI Runtime host-context helper; IPC handlers should consume that snapshot instead of reading Node globals directly.
- Platform AI Branch Status projectors may read existing status/probe/settings state, but must not start runtimes, install dependencies, download models, or inspect user assets.
- Keep shared Platform AI workflow titles and summaries separate from platform-specific runtime lane topology.
- Keep reusable runtime lane labels and runtime-kind matching in shared lane metadata; leave platform topology tables responsible for genuine lane membership and primary-lane differences, then resolve lane definitions through one shared resolver.
- Keep branch-to-OS support checks in shared Platform AI runtime metadata so the projector consumes branch/platform semantics without local OS maps.
- Keep Platform AI branch runtime provider registration descriptor-driven; concrete metadata keys and profile rules belong in descriptors, not duplicated provider blocks or resolver functions.
- Keep Python Worker auto-start support and runtime app-data root selection in one bootstrap platform adapter so adding or removing OS support does not scatter bootstrap conditionals.
- Keep runtime profile default, hardware-hint selection, and recommendation reason copy in ordered metadata/rule tables; hardware rules should use descriptor fields, not hand-coded Windows/macOS profile branches in resolver flow.
- Keep Doctor command selection for npm and Python launchers in one platform-name resolver; individual checks should execute commands and shape results, not maintain separate Windows/macOS command tables or pass platform booleans.
- Keep platform profile detection mappings in metadata rules; reserve direct platform checks in the detector for normalized OS capability booleans.
- Keep Llama runtime accelerator defaults and package pattern selection in metadata rules with one matcher; reserve direct platform checks in Llama modules for artifact selection, paths, process names, and native installer adapters.
- Keep read-only Llama governance adapter selection descriptor-driven; platform conditionals belong in concrete runtime adapters, not the governance plan flow.
- Keep Llama runtime host platform, architecture, CPU, and memory reads inside the host-context helper; installer and planner flow should consume the context instead of reading Node globals directly.
- Keep OCR/Python managed venv executable paths and base interpreter discovery descriptor-driven; leave actual Windows search and macOS Homebrew probing inside platform adapters.
- Keep explicit OCR evidence execution in main process, offline and timeout-bounded. Cache only path-free generated-image results for five minutes before projecting them into shared workflow status.
- Expose OCR evidence only through the user-triggered `aiRuntime:probeOcrRealEvidence` channel; the operation must not read user assets, install dependencies, or enable model downloads.
- Keep Llama server executable, force-stop, chmod, and zip extraction process metadata descriptor-driven; do not scatter process branches through installer flow.
- Keep Llama hardware detection dispatch descriptor-driven; leave actual OS probes in macOS, Windows, and generic hardware adapters.
- Keep Electron app lifecycle policy descriptor-driven; platform-specific AppUserModelId and quit-on-close behavior belong in startup policy metadata, not inline entry-point branches.
- Keep packaged Python service sources read-only at runtime by disabling bytecode writes before any Python child process can inherit the main-process environment.
- Keep executable Runtime Package transactions inside `FileSystemRuntimePackageExecutor`; callers receive path-free progress while checksum, staging, extraction, promotion, registry commit, and rollback stay local to the module.
- Keep release promotion behind `evaluateReleaseCandidate`; shared candidate stages own workflow truth while Windows and macOS trust checks remain platform gates.

## Tests

Native asset cards are composed through `asset-card/` and a dedicated sandboxed
Preload. Library transitions revoke the window; Main owns cross-window session
drafts and controlled preview identities. See [Asset Card](asset-card/README.md).
The five `ai-backend:*` configuration/probe channels now use the injected App
Settings service and the trusted application frame. Config CRUD does not contact
a provider; explicit health/model-list actions use the configured provider's model
list endpoint. This does not restore image inference or model installation.

Native file/folder dialogs use the registered main window through
`platform/native-open-dialog.ts`. The presenter restores/focuses the owner and
serializes requests; missing owners fail without opening a detached panel.
`test-native-open-dialog` covers ownership and cancellation sequencing. Native
macOS selection still requires a real packaged-app check, since synthetic
Library E2E replaces selectors and cannot prove native panel usability.

```bash
npm run typecheck
npm run build
```

Embedded browsing, site login, external source search and page extraction have been retired.
Their IPC registrations, browser preload and PhotoShow helper are removed. Main window UI,
Library ownership, AI, image tools and download execution are retained. See
[scope and consequences](../../docs/product/WEB-COLLECTION-RETIREMENT-20260913.md).
