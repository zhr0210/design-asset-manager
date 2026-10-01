# Library Lifecycle

Active Library description updates optionally accept an expected previous caption
and compare it in the same SQLite UPDATE. This protects concurrent native-card edits
without changing schema or legacy two-argument caller behavior. Empty descriptions
can be saved deliberately. UI transitions notify the Main-owned asset card to revoke
its old Library generation before opening or closing a Library.

Main-process Module for binding one inspected and exclusively locked Active
Library to its authoritative SQLite connection and storage roles.

## Current Interface

`createActiveLibrarySession()` accepts one composition input and returns a
small Interface:

- `inspect()` returns a path-free identity, generation, and writable state.
- `createActiveLibraryCaptureWorkflow()` composes the existing path-free
  `prepare / dispatch / inspect` Capture Interface from that indivisible
  binding. Its caller cannot inject Capture storage and SQLite separately, and
  no generic callback can return or retain the raw binding outside the Session.

Construction and every operation boundary fail closed when the live lock lease
is lost, replaced, or belongs to a different Library generation. The same
boundary rejects a closed/read-only database, a database outside Library
Control Directory or inside disposable staging/preview storage, and storage
roles that overlap or escape their owners. Errors are fixed and path-free.
The lock Adapter's `runWhileHeld()` contract brackets each complete async
operation, so a Library Switch must wait for in-flight work to settle before
releasing or replacing that lease.

Path-bearing Capture inputs cross only the named, trusted main-process System
Preview Adapter Seam. They are not renderer/public output and the Adapter must
not retain them as independent write authority. The raw Library binding and
SQLite connection never cross that Seam.

## Production boundary

`src/main/index.ts` now creates one Active Library Host and registers its
path-free open/create, Capture, Asset/Tag, preview and Trash IPC surface. The
Host opens only a selected, inspected Library, holds the production-qualified
macOS exclusive lease, owns its private SQLite connection, and drains work
before close or application quit. Site and Download records remain in separate
App storage. Legacy migration remains outside this composition.

The Electron end-to-end test uses the production Host, Main IPC, formal Preload
and complete Renderer with only directory selection, App Settings and bounded
Model Workspace dependencies injected. It creates generated PNG/JPEG/WebP
fixtures below the OS temporary directory and blocks HTTP(S); this evidence does
not cover a real user Library, Windows volume qualification or packaged builds.

## Library Start Tracers

The existing path-free `LibraryStart.inspect()` Interface now has separate
memory, Manifest, filesystem and coherent temporary-library inspection
Adapters. The newest composition binds the same physical Root/Control/Managed
roles and generation across bounded read-only SQLite, journal and lock-storage
observations; it never creates a Session or acquires normal write ownership.
Unknown qualification or lock state cannot produce compatible eligibility.

AL-05 separately proves a real macOS temporary-root Exclusive Library Lock.
Its read-only storage inspection is not an idle-lock observation or permission
to acquire. Production startup, real-volume/platform qualification, populated
library adapters and writable activation remain outside these Tracers.

See [Library Start contracts and limits](LIBRARY-START.md) when changing these
Adapters. Focused entries include `test-library-creation-planner`,
`test-library-open-inspection` and `test-exclusive-library-lock`;
`test-library-start-foundation` reruns all
predecessor checks. The detailed contract is kept local rather than requiring
ordinary Trash/Capture tasks to load every inspection detail.

## Asset Trash Tracer

The in-memory and SQLite Asset Trash Implementations share the stable,
path-free `prepare / dispatch / inspect` Interface. The SQLite tracer owns
exactly two additive tables on its injected connection:

- `asset_lifecycle` stores only explicit ownership, Active/Trash state,
  revision plus an internal monotonic sequence for ABA-safe compare-and-swap,
  and transition timestamps.
- `asset_trash_plans` stores durable plans, relationship digests, and an
  immutable versioned completion result for replay after Restore or restart.

Current Tag, Collection Membership, Asset Source, Original, Candidate, and
Promotion Link authority is not copied into the lifecycle table. A synchronous
read-only, path-free relationship projection reads through the exact injected
connection inside the Adapter transaction (or returns an immutable
transaction-stable projection). Planning binds its binary-canonical digest and
changes no lifecycle state. Missing lifecycle authority fails closed and is
never inferred from legacy Asset columns. `ON DELETE RESTRICT` prevents the
current hard-delete shape from bypassing a governed Asset. An immediately
repeated Restore with the prior Trash revision replays the current restored
snapshot rather than misreporting a lost successful response as a conflict.

Internal routing keeps future AI changes local: the Adapter owns transaction
orchestration, `sqlite-asset-trash.schema.ts` owns the exact two-table shape and
fail-closed schema inspection, and `asset-trash-record-codec.ts` owns canonical
relationship encoding, versioned records, integrity checks, and projection.

The SQLite factory is intentionally available only by direct Adapter import,
not from the Module barrel. It initializes only the provided temporary test
connection and is not a production write entry. Neither Implementation is
called by the existing `assets:delete` channel. Active Library composition,
runtime schema migration, Trash-aware reads, IPC/UI switching, legacy
provisioning, Permanent Delete, and filesystem deletion require later approved
slices.

The current application-global database remains untouched. New Capture Intake
must not be composed against it: production composition requires an inspected
Library Control Directory connection represented by this Module.

## Active Library Host (first Main checkpoint)

`createActiveLibraryHost()` is a Main-only composition factory. Its returned
Interface keeps the inspected root/control/storage roles, the private SQLite
connection, the `libraryIdentity`/`generation`, and the real exclusive lease
inside the closure. Callers submit path-free creation, Capture, Tag and Asset
Trash intent and receive projections; no raw connection or generic database
callback is exposed.

Creation planning delegates to the read-only `createLibraryCreationPlannerTracer()`
and creates no directories. Confirmation revalidates the receipt, materializes a
new empty Library, installs the existing control/Capture/Trash schemas, and
opens it through `createLibraryOpenInspectionTracer()` plus a real lock lease.
Capture uses the Main-only Sharp System Preview Adapter, which writes a
format-matching PNG/JPEG/WebP preview with no-replace semantics in Required
Preview Storage. The first checkpoint has no AI task tables, Worker startup,
queue sync or palette scanner.

The Host uses the dedicated Asset Trash workflow for `prepare`/`dispatch`/
`inspect`; it does not consume the legacy `assets:delete` channel. Closing
quiesces admission, drains operations and releases the lease before closing the
private connection. Existing-user migration, IPC/Preload wiring and App-level
Site/Download composition are later checkpoints.

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

## Optional visual evidence and downloaded images (2026-09-12)

The production Host now owns additive v2 AI evidence storage and format-checked downloaded
image Capture under its held lease. New libraries remain v1; explicit AI confirmation enables v2, while confirmed persistent
downloads enable v3 and confirmed image variant saves enable v4. Opening validates exact
v1/v2/v3/v4; old readers cannot open newer schemas. Manual captions
are protected; suggestions require explicit confirmation. The Main-only download adapter
uses owned staging and deterministic Capture identities. See [Visual AI](../visual-ai/README.md)
and [Managed download](../managed-download/README.md) for current behavior and limitations.


## Host implementation structure (2026-09-12)

`active-library-host.ts` owns Library selection, lifetime and the held connection. New Library
materialization, bootstrap lock, schema validation and ownership-aware rollback now live in
`library-materialization.internal.ts`; internal layout names share one definition. Existing
creation/open/rollback behavior and public contracts are preserved.

`owned-image-intake.ts` owns the common format/staging/Capture sequence used by downloads
and reviewed image variants. It receives the exact binding only inside the Host lease.
`saveImageVariant` rechecks source identity/revision/preview and records a recipe in existing
image_metadata_json; no schema upgrade is needed. See [image tools](../image-tools/README.md).

## Active Library tag metadata (2026-09-13)

`active-library-tag-metadata.ts` owns tag names, colors, aliases and parent relationships
on the exact Host-held connection. The Host keeps lease, scope and shutdown ownership.
Existing alias/parent IPC methods now use this module instead of the global TagService.
Alias row/JSON updates and parent row/relation updates are transactional; missing parents,
self-parenting and cycles are refused. Aliases preserve spelling and are search keys,
not extra confirmed tags. Parent relationships do not implicitly tag Assets.

Lists count distinct active Assets, excluding Trash. Confirmed Asset aliases are projected
for lexical search with explicit alias evidence. No database schema upgrade is needed.
The existing tag merge/delete channels remain disabled: merging needs ADR 0179 stable
redirects and bounded undo, and must not reactivate the old delete-source implementation.

`npm run test-active-library-tags` covers persistence, rejected cycles, alias normalization,
transaction rollback and trusted sender boundaries using generated images and temporary
Libraries. Real user Libraries and multilingual concept migration are outside this evidence.

受管图片入库在dispatch失败后检查该批Capture的持久记录：已受理时返回
library-recovery-required，保留原件/staging/记录并禁止普通下载重试。这不代表
已经实现部分Capture恢复，也不将缺少完整Promotion的任务标记为成功。

## Explicit owned download recovery (2026-09-13)

Host now owns `recoverDownloadedImage` on its exact held connection. It verifies the
persisted request/candidate/Original/Promotion identities, digest and owned file evidence
before enabling internal `resumeAccepted` Capture execution. Only the existing live
job's retry action can select this path after a user-facing recovery confirmation.
No extra IPC channel, data schema, network request or external source read is introduced.

Recovery can finish missing publication, activation, preview, Promotion or metadata;
ordinary replay is unchanged. Already published Originals are not overwritten, conflicting
or missing evidence remains unresolved, and Trash never becomes active through recovery.
A deterministic recovery preview is reused only after byte verification. User edits remain
when an already finalized result is revisited. Verified-owned-file reads share one platform
adapter with image tools, retaining bounded reads and file/directory identity checks.

## Persistent downloads (2026-09-13)

The Main-only `downloadJournal` port serializes checkpoint reads/writes and local recovery
inside the held lease. v3 migration includes v2 evidence tables without granting AI consent.
The Host drains begun journal operations before release; the application first drains the
download controller. URI/name authority comes from the immutable Library journal, never App
history. See [Managed download](../managed-download/README.md) for review, quota and recovery.

## Unified intake recovery and v4 (2026-09-13)

The Library recovery panel lists accepted, incomplete Copy requests and recorded image variants.
A reviewed receipt binds the exact Host Binding and record fingerprint. Ordinary Copy uses
verified published Originals or explicitly reselected, matching frozen source bytes; variant
recovery uses its immutable v4 intent and retained output, including metadata finalization.
Source files, edits, conflicts and Trash are preserved. Capture, variant and download writes
share the Host mutation sequence; only one bounded recovery review is retained.

First confirmed variant save adds the v4 intent table/trigger, after staging is written and
verified. Copy recovery does not upgrade the Library. Known v1–v4 remain supported without
automatic repair. See [scope and validation](../../../docs/product/INTAKE-RECOVERY-SPACE-MANAGEMENT-20260913.md).

## Scoped metadata reads (2026-09-13)

`active-library-asset-queries.ts` owns the shared Active Asset projection. Main-only
`readAssetContext(ids)` returns only the selected active Assets (up to the existing 500-item
card navigation bound), their confirmed tags/aliases and current OCR, plus schema version.
AI, image tools and native cards no longer materialize the whole Library for each item.
No new IPC or schema is introduced. Results are matched by identity; caller navigation order
remains authoritative. `listAssets` and existing search behavior remain available.

`test-scoped-asset-reads` compares projections using 10,001 synthetic metadata rows and proves
that unrelated malformed tag metadata is not touched by a selected-asset read. This is not
real-library performance evidence. Current real-data validation status is recorded in TASK.

## Asset Notebooks (v5)

asset-notebook.ts runs on the existing held connection. Scoped read/save preserve originals and Trash
relationships. Explicit first-save confirmation enables v5 transactionally; reopen schema validation accepts
v1–v5, and other versioned subsystems keep v5. See ADR 0487 and the notebook product specification.

## Library Organization (v6)

Ordinary/palette folders use library-organization.ts and a normalized v6 schema on the same held connection.
Read does not upgrade; the first explicitly confirmed command does. Membership/Trash/source protection,
whole-organization optimistic revisions and binding-session checks are separate from rendering. The bounded
measure-preview-colors routine only analyzes host-issued previews. Existing v1–v5 readers and upgrade helpers
accept v6 without downgrading. See ADR 0488 and LIBRARY-ORGANIZATION-20260919.md.

## Work Sets (v7)

Work-set values and ordered member references are independent of originals and library organization.
`work-sets.ts` persists per-set revisions and per-device window layouts under the existing held connection.
The first confirmed work-set save enables v7. Native content Save can include a layout in the same
transaction; passive geometry writes do not alter content. All prior schema-aware readers retain v7.
See ADR 0489 and `docs/product/WORK-SETS-20260920.md`.


## Dedicated OCR (v8)

The OCR module owns independent evidence and current corrections on the held library connection.
Confirmed successful OCR saves upgrade v1–v7 transactionally; reads and failures do not upgrade. Exact-schema
inspection now accepts v8, and earlier notebook/organization/workset/download/AI helpers retain v8 without
downgrading. A valid empty OCR result suppresses visual-model text guesses. Corrections survive same-preview
recognition; source/session/revision conflicts retain prior content. See ADR 0490 and the RapidOCR evaluation record.

## C02B persistent intent boundary (2026-09-27)

Managed exact profiles now include v9. readTagIntentContext/readTagIntents never upgrade. saveTagIntent is a private lifecycle maintenance lane with ordinary admission closed before drain, actual lease checks, verified backup and atomic migration/insert. See [independent-tags](../independent-tags/README.md) for qualified-build limitations and tests. New library initialization stays v1. No real-library migration has been performed.

## C03 execution boundary (acceptance pending)

Managed exact profiles now include v10. Explicit execution activation alone adds five execution tables and seeds current tag provenance. Host claim/sent/commit/finish/read boundaries use live session/lease and a process-local capability registry; current-scope duplicate receipts do not need a new compute permit. Evidence/current/job/receipt/Outbox are atomic, and a legacy historical-only commit cannot regain tag authority. holdBusinessAdmission uses independent cycle tokens; ordinary new operations stop, with only fixed finish-attempt records and session inspection admitted for close coordination. Main remains the only authority writer. All v10 migrations performed so far were generated temporary fixtures.

### Independent tag user choices (C04)

Known Managed profiles now include11. The first explicitly reviewed rejection adds only content/family-scoped immutable suppression through the existing backup, lease and maintenance protocol. `decideTag` binds the current notebook session and canonical evidence; manual confirmation uses existing relations without forced upgrade. Profile10+ refuses the old sessionless `confirmVisualAiTag` entry. Current readers apply rejection rules in bulk, preserving manual facts and inference history. v11 does not change new-library creation (v1), intent activation (v9) or execution activation (v10); frozen v10 readers refuse v11. Testing remains restricted to generated temporary libraries.

### Bounded tag batch persistence (C05)

`saveTagBatch` reuses v9 header/items in one inspected, lease-held transaction. All1–8 source tuples and the Host session are revalidated before any effect. The private intent persistence lane is shared with the original single-item method, retaining its backup/upgrade/rollback and payload compatibility. Normal batch deduplication orders matching requests by actual generation; force replay with the same requestId is idempotent. It neither adds a schema version nor writes real-library data during tests.

### Tag recovery authority (C06)

Before publishing an opened Host as ready, fixed profile10+ orphan reconciliation runs under the acquired lease. It records NOT_SENT as paused and sent work as outcome-unknown, preserving effects and generations. Known schema and sidecar gates run first; no hot-journal repair is attempted. `readTagEffectReceipt` requires the current Host session and active asset, then independently checks whether its historical effect is still canonical. `readTagRecovery` is bounded metadata, with Main-related versus card-contained batch selection. The private shutdown finish path permits only pause/unknown classification while business admission is suspended; quiescing/closed stays inaccessible.
