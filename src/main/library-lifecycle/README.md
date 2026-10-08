# Library Lifecycle

## F measured scope (2026-10-08)

Selected-store inspection now permits a main database up to 512 MiB using file
metadata and the existing read-only SQLite checks. It never loads that entire
file into a Buffer. Manifest (16 KiB), lock/control (16 MiB), identity,
sidecar, lease and pre/post stamp protections remain. A real 10000-record
Managed copy with a 28.9 MB main database reopened; the old 16 MiB shared guard
had incorrectly quarantined it. Above 512 MiB is still refused.

This reader bound does not expand schema-backup qualification. The current
Windows native maintenance image cap is 4 MiB with the sealed runtime and
resource budget. Real public v1/v13/v14 small-library copies upgraded to v15,
and their readable pre-upgrade backups were restored on separate engineering
copies. Large old-schema upgrades and UI restoration remain unverified.
The 1 MiB statement in the historical evidence section below describes its
earlier candidate, not today's budget. Browser/Native acceptance is separate
from these internal checks; see [current F state](../../../docs/handoff/CURRENT-STATE.md).

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
is supplied only by trusted Main composition and is not exposed by the Library barrel.

`test-host-schema-maintenance` uses generated images and temporary SQLite
Libraries to exercise faults, lease/scope/cancellation changes during backup,
admission/drain/close ordering, OCR epochs and real Host calls on explicitly
prebuilt supported profiles. Its synthetic backup/lease Adapter does not certify
production backup qualification or real-library migration. Windows now uses the
[fixed native Runtime](../platform/windows-backup-native/README.md) through its
private production Adapter; Darwin/APFS qualification remains unchanged.
Formal Windows generated-data checks are `windows-backup-production.test.ts`.
Native user-path and backend evidence stay separate in `TASK.md`.

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


## Current evidence and history

Windows production schema maintenance is qualified only on the checked local NTFS/x64 profile, exact SQLite/native/bundle bytes, actual lease and shared resource ledger, with initial images at most 1 MiB. Six existing intents retain Host transaction authority and wait for physical settlement; UNKNOWN keeps its charge and quarantines the Host. Missing/drifted bundles and other profiles refuse, and restore remains disabled. [Current evidence](../../../docs/handoff/WC01-CLOSE-12-20261005.md) separates backend acceptance from UI/package acceptance. B2/86-method migration remains an unadopted target design.

The previous README, including dated implementation checkpoints and module capabilities, is preserved as an [exact-byte historical snapshot](../../../docs/history/module-snapshots/library-lifecycle-20261005-before-wc01-close-12.md) (31550 bytes, SHA256 6706d14235697c1db618c479fb5ce4d83c2138f491a69f635b438b7e1c6dfe99). Relative references inside that snapshot use the original module directory as their base. The snapshot is traceable context, not a current capability or execution claim; the active Interface, production constraints and relevant ADRs remain authoritative.
