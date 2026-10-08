# Renderer current ownership (RUX 2026-10-01)

Formal Desktop and Browser workspaces now share this React tree and the named
Shared Client installed by `main.tsx`. Desktop IPC and loopback HTTP/SSE enter
the same Local DAM Host; routes use `getWorkspaceClient()` rather than a second
browser UI or the retired `electronAPI` alias. Native card/work-window surfaces
keep their narrow roles. See [Host boundaries and validation](../main/local-host/README.md).
Recovered drafts keep their original save baseline; Settings and editors require
explicit comparison/adoption on conflict. Global review and connection status
coordinate all active clients without giving Renderer file or database authority.
Settings mount/event refreshes wait for the current required calibration read
before issuing their own fresh read. A later required read or save still invalidates
older receipts; failed calibration continues to block Browser writes.
File selection replies, errors and busy state belong to the current picker
generation. A cancelled or replaced picker cannot close, overwrite or unlock
a newer selection when its reply arrives late.
Backend service, Pi connection and task-default editors compare the current saved
configuration before adopting it as a new CAS baseline. Adoption retains the visible
form; deleted services can be copied without credentials or validation proof.
Read ordering spans saves: an earlier list/settings/status reply cannot restore an
older saved form, and superseded required calibration rejects while still mounted.
Ordinary refreshes wait for the valid required read. Pi consumes each initial
connection navigation intent once, so refreshing cannot replace another draft.
Actual-component checks use synthetic Clients and forbid provider/auth/probe calls;
they do not establish real model or account availability.

Asset Workspace presentation lifetime (2026-10-02) is owned by the Renderer-private
`asset-workspace-session.internal.ts`. AppShell retains one instance through its
private context; the Client Adapter connects existing stores and draft owners.
Library and Controls express inspect/ready-refresh/authority-change intents;
Shell and Library use fixed event kinds. The Module owns adoption, revocation,
latest inspection checks and native-card return checks before navigation.
Renderer lifetime is never Main generation or write authority. Route detach
invalidates its pending inspection without revoking drafts or Shell card returns.
The View Store has a separate private draft epoch, so same-scope reopen rejects
old queued work and late receipts while retaining serial synchronization/retry.
Tests: `test-asset-workspace-session`, `test-library-view-draft-lifetime` and
`test-asset-library-keyboard` (formal Shell/Library with synthetic bridge).
For user-facing changes, follow the [UI/UX acceptance workflow](../../docs/agents/ui-ux-acceptance.md).
Record Main data-chain tests, Browser Computer Use and Desktop/native Computer Use separately
in the task evidence; TASK.md links the results. Use the browser-first routing and fallback
rules in AGENTS.md, and recheck affected user paths after fixes.

App navigation is owned by shared app-navigation.workflow. AiWorkspace provides one connections
editor, task defaults, local models/OCR, background permission, and advanced diagnostics.
AiConsolePage is a thin historical export; its platform/GPU/legacy Worker polling is retired.
Settings does not mount a second backend editor or disabled Doctor/path migration panels.
PiConnectionsPanel owns connection CRUD and explicit account actions; task defaults write only
in TaskModelSettings. Main owns account lifecycle/persistence and source trust.

Historical section below is retained for component traceability; references to removed default
mounts or legacy runtime polling are not current delivery claims.

# Renderer

React UI for library browsing, download history, settings, tags, AI console, and asset inspection.

`Library` now composes the formal minimal `components/library/canvas/` surface:
current Active Library reads, bottom lexical search/tag filtering, controlled previews,
side Inspector and a hard-cut focus gallery with zoom/pan. The route refuses unverified
Library readiness and clears its UI authority on transitions. No production module
imports the prototype fixtures, SVG demos or browser-local notebook stores.
`library-view.store` still synchronizes generation-scoped session drafts with Main;
`AssetCardWindow` and its narrow Preload remain the single native-card path.
`WorkspaceModes` records older mode UI; the new Library route no longer renders its
full-screen blur transition. Notes/palettes/multi-Work-Set persistence remain later work.
Settings is organized into appearance, Library, AI/models, capture/download,
shortcuts and maintenance. `AiBackendSettingsPanel` provides real configuration
CRUD and explicit GET-only model service probes; inference remains separate.

The Apple-inspired glass workspace UI system lives in `styles/design-system.css` and
`components/ui/WorkspacePrimitives.tsx`. `AppShell` provides persistent workspace
navigation and a stable content frame; the local collection keeps navigation,
search and Inspector positions predictable. Reference analysis, tokens and
interaction rules are in `docs/design/WORKSPACE-UI-SYSTEM.md`; the standalone
`docs/design/UI-SYSTEM.html` is a visual specification, not a product settings page.
`components/ui/WorkspaceMotion.tsx` owns route entrances, exiting-panel input isolation
and keyboard segmented controls. Routes unmount immediately; only control panels
retain a short inert exit. See `docs/design/WORKSPACE-MOTION.md`. Settings separates
appearance, storage drafts and explicit maintenance; AI settings and site creation
use the shared focus sheet. TagManager supports create/rename/color, alias and parent editing via existing Active Library
bridges; each alias/parent action saves explicitly, errors preserve drafts, and missing
Library authority disables creation. Merge/delete remain unavailable until identity retention
and recovery are implemented. Alias search is explained separately from confirmed tag labels.

`ConnectedLibrariesPage.tsx` identifies Eagle as the single Original authority
and exposes reviewed connection, progressive indexing, offline queue, Journal,
field/file conflicts, Trash/Restore and cleanup candidates. Synthetic evidence
is visibly labelled and does not imply real Eagle access. New Assets can remain
in retained staging while Eagle is offline and release only after verified add.
`LegacyLibraryPage`
is a separate read-only recovery surface and never offers migration or write.
The current download entry reports execution unavailable; no transfer or
Library success can be inferred from a historical task record.

## Reading scope

This README is the current module entry point. Use nearby source and tests to
verify behavior; guidance alone does not prove implementation.
[Future ADR reference](ADR-REFERENCE.md) contains preserved planned constraints;
read only the relevant entries after selecting their canonical ADRs.
[Historical change log](../../docs/history/renderer-readme-changelog.md) is
traceability, not evidence of current delivery. Neither is startup reading.

## Entry Files

- `main.tsx`: React bootstrap.
- `App.tsx`: route shell.
- `routes/`: page-level screens.
- `routes/ModelLibraryPage.tsx`: dedicated fail-closed Model Library surface;
  it consumes the Renderer-internal Workspace Module and never reads paths or
  legacy model settings.
- `components/`: reusable UI.
- `stores/`: Zustand state.
- `hooks/`: renderer hooks.

## Rules

- Keep route files thin; move repeated UI into components.
- Keep stores focused on state and IPC calls.
- Preserve existing preload API usage.
- AI Console status aggregation belongs to the Renderer-internal `AiConsoleStatusModule`: the production Adapter maps the existing Electron bridge, while `AiConsolePage` owns React state application, loading, manual feedback, GPU history, and the five-second polling cadence. Tests use the in-memory Adapter; this boundary does not expand public IPC.
- AI Console and the Asset Inspector treat registry or directory presence as unverified local evidence. They do not describe it as installed or ready; AI Console does not offer legacy model download, install or delete actions while the verified Model Artifact Installer is absent.
- Model Library product state belongs to the Renderer-internal
  `ModelLibraryWorkspaceModule`. The page may review/confirm only the two
  Main-owned storage-location intents; AI Console receives only counts,
  cached attention state and a shared-navigation link to Model Library, never
  configuration authority or an automatic storage probe. The page renders
  every configured Root condition distinctly; only `available` uses a success
  treatment.
- Renderer should display Platform AI Branch Status projection from main process, not recompute Runtime Probe or Model Readiness meaning.
- Renderer should use shared Platform AI Branch Status candidate selection for macOS/Windows channel responses instead of inspecting workflow statuses locally.
- Renderer AI route overview should use shared branch-aware display projection; macOS dependency actions and MPS diagnostics must not render for Windows or an unknown branch.
- Renderer cooperative model rows should consume the shared Worker readiness snapshot and combined row projection instead of redeclaring Worker payload fields or composing artifact state locally.
- Renderer AI runtime panels should consume shared status display projection for macOS capability matrix labels and badge classes instead of defining local status maps.
- Renderer AI runtime consumers should use the local Platform AI Runtime request adapter to select existing macOS/Windows capability, Python status, and execution-probe preload methods.
- Keep Platform AI Runtime request selection table-driven in the local adapter; the adapter may point to concrete macOS/Windows preload methods, but route and panel code should not branch on those methods directly.
- Renderer shared AI capability matrices should use platform-neutral component names; platform-specific route details belong in shared projection or probe evidence.
- Renderer AI runtime cards should consume shared runtime/health badge, icon-semantic, health-result, and summary projections instead of filtering or labeling runtime states locally.
- Renderer macOS probe summaries should consume shared connection and route-tile projection so missing probe evidence renders as `尚未探测` instead of a capability conclusion.
- Renderer download pages and shell/menu indicators should consume shared Download Status projections instead of formatting row metadata or status copy locally.
- Renderer tag panels should consume the shared Asset Tagging Workflow plan instead of owning category-to-model pipeline defaults.
- Renderer visual-analysis panels should consume shared snapshots instead of branching on stored palette payload versions, image/theme payload fields, OCR/text-box/readability fields, or text-color status codes.
- Renderer shell route paths, menu entries, Asset Workspace home route and topbar visibility should consume shared App Navigation workflow metadata instead of local route/title maps.
- Renderer UI motion should use Motion for React for product interaction animation. Remotion and React Bits may guide timing and interaction patterns, but should not be added as runtime dependencies for shell/download feedback.
- Renderer UI polish follows `docs/design/WORKSPACE-UI-SYSTEM.md` and its production CSS tokens: Apple-inspired glass navigation, sharp asset content, stable sidebar, managed Quick Look, focused task sheets and accessible keyboard return. `DESIGN.md` retains domain and permission constraints; its legacy visual palette is superseded by this system.
- Bounded precise numeric App Settings should pair one exact numeric input with a synchronized slider, sharing value, unit, minimum, maximum and step; invalid typed values stay visible with an inline error and cannot be applied rather than being silently clamped.
- Renderer AI Console runtime dependency install handlers should consume shared overview workflow copy for toast/log/result summaries while keeping the existing platform-specific preload method call explicit.
- Renderer AI Console text-box provider state should consume shared product provider normalization instead of mapping legacy `mock` locally.

## Tests

```bash
npm run typecheck
npm run build
```

2026-09-13: `/browser`, `/sites` and external `/search` routes are retired and fall back to
the local Library. The workbench has no embedded web view. Local asset search, direct-image
downloads, AI and image tools retain their existing routes and behavior. Navigation/menu
state is ordinary React UI; browser-specific native visibility and injection animation code
is removed. Unmounted historical prototypes are retained for reference only.
