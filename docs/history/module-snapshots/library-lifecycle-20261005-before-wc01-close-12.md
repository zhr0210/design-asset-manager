2026-10-04 当前 WC01 release / source-loader 边界：当前源码首次 rename EBUSY 已复现，受控 PROCESS/PSS 诊断只描述对应观察时点。完整 SQLite snapshot 与后续合法 source 事务分离；readonly Buffer/attribute、有限 hash 和 pathname loader 不取得任意 writer 或区间不可变资格，完整 source match 继续拒绝已观察变化。两条 authority 策略均为 Target Architecture。正式 Adapter 未接，productionQualified/restoreAllowed=false。实际验证、身份和缺口见 [CURRENT-STATE](../../../docs/handoff/CURRENT-STATE.md)、[本批交接](../../../docs/handoff/WINDOWS-BACKUP-BOUNDARY-20261004.md)及 [威胁边界](../../../docs/platform/WINDOWS-BACKUP-THREAT-BOUNDARY.md)。

历史 2026-10-04 WC01 metadata / FSCTL：受控合成矩阵区分提前阻止、后续检测和实际反例。私有 named VFS source/journal 及 legacy actual MAIN evidence 拒绝 sparse/compressed；actual MAIN I/O 前重验当前 delegated handle。sharing 不阻止所有 attributes/FSCTL，既有 source byte writer、cached SQL、DLL load 后变更、managed target metadata 反例保留；三次立即 rename EBUSY 原失败与重跑并列，release timing/owner UNKNOWN。正式 Adapter 未接，生产 Windows 仍写入前拒绝，productionQualified/restoreAllowed=false。该批限定98PASS/1FAIL与缺口见 [历史交接](../../../docs/handoff/WINDOWS-BACKUP-METADATA-20261004.md)。

历史 2026-10-04 WC01 safe-load / journal pathname：隔离首加载使用 trusted OS guardian、Host duplicate handles 与本地 same-handle 核验；命名 VFS 在源 SQL 前资格检查，以 FILE_CREATE 和 retained journal handle 执行写入/同步/删除。正式 Host 不打开全局 URI、不接 Adapter；生产 Windows 仍写入前拒绝，productionQualified/restoreAllowed=false。完整 metadata/FSCTL、依赖闭包、准备进程原子资源门、分发和断电资格尚缺。旧批验证与身份见 [本批交接](../../../docs/handoff/WINDOWS-BACKUP-PATH-20261004.md)。

历史 2026-10-04 WC01 helper / VFS / commit proof：合成 helper 原子出生入限额 Job，完整 startup/tail kernel 峰值与 UNKNOWN 占账；当前 SQLite main VFS file object 在 serialize 前绑定并重验；私有 recordCommit 在同一 DDL/业务事务写 settled journal，readonly 当前源独立回读 recorded-commit。没有新增公共 schema/IPC 或正式 Adapter。生产 Windows 仍写入前拒绝，restoreAllowed/productionQualified=false；pathname load/source journal 资格、硬 RSS、断电与分发包仍未闭合。当前身份与验证见 [CURRENT-STATE](../../../docs/handoff/CURRENT-STATE.md)及 [本批交接](../../../docs/handoff/WINDOWS-BACKUP-PROOF-20261004.md)。

以下 source/recovery 记录为上一批历史，不能作为本批身份或完整资格：

历史 2026-10-04 WC01 备份源/恢复续批：retained source 的完整64位identity/hash/NTFS同卷空间证据与connection重验；bound status的逐组件同句柄只读核对；预编译helper的Job commit限额与target完整退出后kernel峰值。仅私有Validated Tracer；生产Windows仍写入前拒绝。launcher启动/终态全RSS、SQLite VFS来源身份与事务提交恢复证明当时仍缺。历史身份与CU见 [本批交接](../../../docs/handoff/WINDOWS-BACKUP-RECOVERY-20261004.md)。

以下生命周期记录为上一批历史：

历史 2026-10-04 WC01 备份生命周期续批：同句柄完整 SQLite 验证、真实 OS/共享 hold RAM permit、private finish/actual close、分段状态/flush/中断重启及内容 retrieval 已在合成范围覆盖。生产 Windows 仍在写入前拒绝。当前 build/CU/资格与限制统一见 [CURRENT-STATE](../../../docs/handoff/CURRENT-STATE.md)及 [本批交接](../../../docs/handoff/WINDOWS-BACKUP-LIFECYCLE-20261004.md)。

以下原生目标和 EXLOCK 段为上一批历史，其中“当前”仅归原批：

历史 2026-10-04 原生目标续批：单组件 NtCreateFile/no-reparse + SQLite 镜像候选已进入合成资格验证；真实 lease/维护模块正常、取消、DDL 回滚与测试 RAM 拒绝有独立覆盖。Buffer journal=memory 仍被生产 inspector 拒绝；生产 Windows 备份继续拒绝，未接入原生 helper。协议、限制与当前交接见 [目标协议](../../../docs/platform/WINDOWS-BACKUP-TARGET-PROTOCOL.md)及 [本批交接](../../../docs/handoff/WINDOWS-NATIVE-BACKUP-20261004.md)。

以下2026-10-04 EXLOCK记录属于历史：

2026-10-04 Windows NTFS续批：EXLOCK候选已被合成对抗反证。Electron30.5.1/Node20.16.0/libuv1.46.0下，FILE_WRITE_ATTRIBUTES句柄可在独占句柄持有期间把空目录改成junction；Windows NOFOLLOW为0。目录sync及rename拒绝不能证明安全publisher。生产备份与Host维护源码均未改，仍在写备份/DDL前拒绝 TAG_INTENT_BACKUP_UNSUPPORTED；普通写入和关开继续可用。新增4项反例回归，前轮撤回publisher不恢复。当前证据与Desktop结果见 [本批交接](../../../docs/handoff/WINDOWS-BACKUP-20261004.md)，前轮记录见 [历史纵切](../../../docs/handoff/WINDOWS-QUALIFICATION-20261003.md)。


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

Windows x64 now qualifies the actual containing volume as fixed, writable NTFS
through `local-volume-qualification.ts`. The shared read-only inspection and
exclusive SQLite lease admit Windows while retaining recovery-sidecar refusal
and physical identity checks. `test-windows-library-production` exercises the
production composition with generated PNG/JPEG/WebP, reopen, lock contention and
WAL refusal. This is isolated backend evidence; native UI and installed-package
acceptance remain separate. macOS continues to use its existing volume adapter.

`src/main/index.ts` now creates one Active Library Host and registers its
path-free open/create, Capture, Asset/Tag, preview and Trash IPC surface. The
Host opens only a selected, inspected Library, holds the production-qualified
macOS or qualified Windows exclusive lease, owns its private SQLite connection, and drains work
before close or application quit. Site and Download records remain in separate
App storage. Legacy migration remains outside this composition.

The Electron end-to-end test uses the production Host, Main IPC, formal Preload
and complete Renderer with only directory selection, App Settings and bounded
Model Workspace dependencies injected. It creates generated PNG/JPEG/WebP
fixtures below the OS temporary directory and blocks HTTP(S); this evidence does
not cover a real user Library, Windows volume qualification or packaged builds.

## Library-Bound Work quiescence

Main delegates Library-cycle coordination to
[`createLibraryQuiescence()`](../library-quiescence.ts). Its three-entry Interface is
`onAuthorityWillChange()`, `onAuthorityDidChange()` and `drainForShutdown()`.
The Module reads current participants lazily, including after async checkpoints;
each owner retains its execution, process, storage and permission state. It has no
runtime dependency on Library construction or SQLite. IPC continues to serialize
the before/operation/finally-after cycle in `active-library.ipc.ts`.

Authority changes confirm draft discard, hold visual admission, invalidate or
suspend owners, drain work windows and managed downloads, then hold Host business
admission before the existing fail-fast `Promise.all` of owner drains. Completion
releases that cycle's two holds and restores work under the existing ready/idle
conditions. App-scoped connections, Acceptance and OCR environment selection resume
while shutdown is idle, including after a failed open or closing the Library.
OCR recognition still validates its active Library scope, and OCR's own resume guard
preserves pending drains, preparation and unconfirmed processes. A failed ready-session
check keeps OCR suspended until a successful authority cycle. The
ready visual/tag resume calls and best-effort tag-recovery flush retain their
existing conditions and order.

Shutdown owns separate admission holds, drains all account work and closes the
Host after owner drains. A Library cycle only suspends/drains inference, allowing
Main-owned OAuth to continue; shutdown cancels uncommitted attempts and waits for
committed persistence. A fulfilled drain does not newly guarantee physical process
exit: owners still account for UNKNOWN outcomes and resource settlement. Native
draft confirmation, connected runtime/App storage shutdown and final quit stay in
the Main composition.

`test-library-quiescence` exercises the real Interface with generated participants;
OCR, account and Acceptance lifecycle tests use it with their actual controllers.
No public IPC, schema or ownership semantics change. Existing rejection of open
with a bound Host, retired sessions and destroyed work windows is unchanged; this
refactor does not add automatic window restoration or a one-step Library Switch.
Platform-qualified visual codec/tag backup and native user-path evidence remain
separate validation concerns; the current run's results are recorded in `TASK.md`.

## Host-private schema maintenance

[`host-schema-maintenance.internal.ts`](host-schema-maintenance.internal.ts) owns
the five maintenance families: tag intent/batch, tag execution enablement, tag
rejection with upgrade permission, background analysis configuration and
background OCR configuration. Its six fixed intent methods are composed only
inside the Host; the public Host Interface, IPC and schema versions are unchanged.
Ordinary tag confirmation and rejection without upgrade permission still use the
existing short transaction path.

The Module queues on the Host lifecycle, refuses existing business holds, closes
ordinary and coordination admission, drains the `allSettled` in-flight snapshot,
then executes inside the actual `runWhileHeld` lease. Version-dependent backup,
growth cap, transaction, schema assertions and domain-specific hook order stay
with the domain writes. Non-completed leases and pragma restoration failures
quarantine the Host; a committed write with uncertain acknowledgement remains
committed. Maintenance releases only its own admission gate. The Host still owns
the binding, connection, lease, lifecycle queue, business holds and claims.

OCR revokes its in-memory grant synchronously before queueing and checks its epoch
again before granting. Tag intent/batch replay validates current scope and content
before its existing-receipt lookup, which precedes stale-schema rejection. Test
hooks remain lazily read. The storage Adapter Seam is private to this Module and
is not accepted by public Host dependencies or exposed by the Library barrel.

`test-host-schema-maintenance` uses generated images and temporary SQLite
Libraries to exercise faults, lease/scope/cancellation changes during backup,
admission/drain/close ordering, OCR epochs and real Host calls on explicitly
prebuilt supported profiles. Its synthetic backup/lease Adapter does not certify
production backup qualification or real-library migration. The production
Darwin/APFS/native backup qualification remains unchanged, including refusal on
Windows. Native user-path and backend evidence are recorded separately in
`TASK.md`.

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

`npm run test-asset-authority-baseline` remains a development-only source guard
in `scripts/asset-authority-baseline.ts`. Its two entries inspect repository
source snapshots without importing runtime Modules or opening a database.
The approved cutover routes supported writers through the inspected and
exclusively locked Active Library; unsupported legacy writers remain disabled.
Changes to save/delete seams or the writer inventory still require explicit review.

The guard's inventory, channel checks and failure cases retain their constraints
in the [preserved AL-01 baseline](../../../docs/history/library-lifecycle-pre-cutover-authority-baseline-al01.md).
Read that record when changing the guard or its covered call chain. It records
the pre-cutover composition, not current runtime authority or a development queue.
Its conservative source evidence does not prove filesystem qualification,
complete data flow or single-writer locking; behavioral checks and code review
remain necessary. Original ownership, qualified storage and held-lease boundaries
continue to follow the current Interface and production boundary above.

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

## WC01 Windows backup lifecycle qualification (2026-10-04)

Main-private serialized snapshots validate the exact control/data schema, identity, generation, settled journal and foreign keys against the native same-handle readback SHA. File-backed opening retains its DELETE/readonly/transaction gates. Host maintenance awaits optional private backup finish under the actual lease/admission, including committed-but-unacknowledged and settings restoration failure. Windows production preparation still refuses before writes; the native implementation remains a synthetic tracer. See [current handoff](../../../docs/handoff/WINDOWS-BACKUP-LIFECYCLE-20261004.md).
