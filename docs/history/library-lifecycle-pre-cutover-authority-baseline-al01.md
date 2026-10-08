# Library Lifecycle Pre-cutover Authority Baseline (AL-01)

Preserved from the AL-01 section of
[Library Lifecycle README](../../src/main/library-lifecycle/README.md) on 2026-10-02.
The original text below records the pre-cutover inventory and guard design;
its descriptions of the then-current composition are historical. Guard constraints
remain applicable to covered changes. This move changes no schema, public contract,
ownership, safety, qualification requirement, runtime behavior, or authorization.

## Pre-cutover Authority Baseline (AL-01)

`npm run test-asset-authority-baseline` is a development-only source policy in
`scripts/asset-authority-baseline.ts`. Its two entries read repository source
text and check an in-memory source snapshot; neither imports runtime Modules
nor opens a database. It is registered in governance and the Capture/Trash
context test profiles.

The current chain remains Main startup → `registerAssetIpc()` → `AssetService`
→ `getDatabase()`. Preload forwards the legacy save/delete calls; the Renderer
Asset Store supplies save data. The download store now blocks execution and
cannot call `addAsset()`; its former simulated producer has been removed.
Delete still removes Asset/tag rows, not Original bytes; it is not Asset Trash.

The executable `LEGACY_DATABASE_INVENTORY` distinguishes:

- Asset/Tag writes, caption/AI/palette writes and their injected sync sink.
- Asset reads versus delegated legacy path migration. Its rollback still
  rebinds the process-global connection; it is not used by Active Library.
- Application-scoped Site configuration and Download Task persistence, which
  do not own Candidate Promotion or prove completed downloads.

The older `AiTaskService` file is not in the current rooted dependency graph;
its presence alone does not make it an approved live writer. Capture, Session,
Trash and future Library Start implementations may exist disconnected, while
runtime-capable imports/re-exports through Main, Preload or Renderer are
rejected. Type-only references do not activate them. The small save/delete
seams and current writer inventory require explicit review when they change.

Negative tests alter source snapshots only: premature direct/transitive
wiring, schema initialization on the global connection, replaced/duplicate
delete handlers, Renderer promotion claims, missing dependencies and new
writers must fail without changing production files.

The graph and consumer inventory share import/re-export/literal-`require`
classification. Asset channels are checked across Main and Preload, including
literal constants and imported constant aliases; extra channels, duplicate
registration and factory aliases are rejected. The legacy save DTO stays
bounded, and schema-qualified Asset SQL still counts as a write.
Unresolved direct IPC registration/invocation names (including unsupported
namespace/barrel constants) require review and fail closed, rather than being
omitted from the channel inventory.
The four existing non-Asset AI descriptor registrations and one Model Library
bridge delegation are retained as exact, counted opaque call shapes, not
whole-file exemptions or proof of their transitive runtime behavior.

This is conservative static dependency and literal-SQL evidence, not a
JavaScript sandbox, complete data-flow analysis, real filesystem qualification
or a proof of single-writer locking. Computed module loading (including the
existing native-dependency diagnostic), generated SQL and external package
internals are outside this source policy; behavioral evidence and code review
remain necessary.

**Replacement point:** the approved authority cutover now routes the live
composition, bridge and supported writers through the inspected/locked Active
Library chain and verified-copy/Trash-aware behavior tests. The source-policy
guard remains and checks that unsupported legacy writers stay disabled.
AL-01 changes no schema, public contract, storage, runtime behavior or user data.
AL labels and GitHub #5 identify historical implementation context, not the
current development queue. Select the next scope from the latest user request
and current evidence; preserve the authority constraints when doing so.
