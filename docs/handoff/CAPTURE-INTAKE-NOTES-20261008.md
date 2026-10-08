# Capture Intake

## F large selections (2026-10-08)

Copy-plan preparation uses at most eight source checks concurrently, preserving
selection order and review of every item. It no longer opens/hash-checks all
selected files at once. The public PNG prepare regression measured eight
checks for 256 selections; source change checks and confirmed dispatch remain
at the existing boundary.

The production Host imported 9834 filename copies of three approved public
contents into a recoverable copy with 166 inherited records, reaching 10000.
This is actual copy/preview/SQLite load evidence with a dialog test seam, not
10000 independent quality samples or Browser intake acceptance. Current scope
is in [F state](../../../docs/handoff/CURRENT-STATE.md); the generated-only
statement below retains the earlier evidence boundary.

Windows disables Sharp's file-handle cache for required previews so owned
files can be replaced and removed after processing. The production Library
regression uses generated PNG/JPEG/WebP and checks import, reopen and unchanged
source bytes (`npm run test-windows-library-production`).

Core main-process Module for the reviewed **Copy Into Library** path. The same
workflow is now composed by the production Active Library Host and exposed by
the Library UI through path-free prepare/confirm/inspect calls. Generated
temporary fixtures remain the only end-to-end data evidence.

## Interface

Callers use one path-free `AddAssetsWorkflow` Interface:

- `prepare()` invokes an injected local-file selection Adapter and returns a
  read-only Copy Plan.
- `dispatch({ kind: 'confirm-plan', planReceipt })` confirms that exact plan
  and starts the Capture Gateway.
- `inspect({ batchIdentity })` returns the authoritative batch projection.

Renderer code must not provide source or library paths, allocate Candidate or
Asset identities, write Asset state, or copy files. The Capture Gateway owns
Capture Request Identity, Candidate lifecycle, required-preview gating, Quick
Promote, Design Asset Identity, and Promotion Link.

## Implemented Tracer

- Explicit ordinary-file selection with PNG, JPEG, and WebP signature routing.
- Path-free, plan-unique scope labels plus byte/capability estimates; planning reads source
  evidence but creates no managed directories, Candidate records, previews,
  or copies.
- One injected Active Library Context instead of process-global storage.
- One accepted Capture Request Identity and item-local Canonical Capture
  Envelope per item, with source/locator/method/metadata-intent conflict
  detection and idempotent replay independent of sibling batch items.
- Attempt-owned staging, SHA-256 copy verification, managed-root and symlink
  containment, and atomic no-replace publication into Managed Originals.
- Explicit persistence semantics in the Adapter: Candidate Intake,
  Candidate Activation, System Preview Ready plus transactional Promotion, and
  batch completion. Candidate Promotion leaves a historical promoted Candidate
  Record rather than active Capture Inbox work.
- An additive SQLite Adapter persists Capture Requests and ordered batch
  membership, Candidate lifecycle/evidence, and Promotion Links. Promotion
  atomically creates a read-compatible existing `assets` row, changes the
  Candidate to promoted history, and inserts its Promotion Link. Batch state is
  derived from its ordered request items; this tracer does not add a parallel
  batch or Asset projection.
- SQLite schema installation is additive and performs no existing-Asset
  migration, ownership inference, or backfill. The Adapter installs it only on
  its injected connection; it is deliberately not registered into the current
  process-global application database because target authority belongs to the
  active Library Control Directory. The in-memory Adapter remains isolated
  test persistence behind the same Seam.
- Required System Preview evidence must match the Candidate source generation
  and detected format, and its real grid-thumbnail file must remain inside
  independent Required Preview Storage rather than reuse Managed Originals.
  The outward projection retains only its opaque ref.

## Deliberately Not Implemented Yet

- Electron IPC, preload, renderer sheet, or runtime composition of the SQLite
  Adapter into the user-visible Add Assets path, including inspected/locked
  opening of the active Library Control Directory database.
- Production preview decoding and artifact storage.
- Partial batch failure, preview-failure feedback, cancellation, retry, or
  restart reconciliation.
- Folder recursion, Reference in Place, Compound Originals, video, Web Capture
  migration, storage-reserve planning, or optional AI analysis.
- Migration or ownership inference for existing Assets.
- Asset Trash / Permanent Delete semantics for Promotion history. Existing
  hard-delete wiring must not consume these new rows until that lifecycle is
  implemented; the Promotion Link deliberately fails closed instead of being
  silently erased.

These are follow-up tracers. A replay of an accepted non-terminal request
returns its current durable state; it does not silently retry or create new
identities.

## Verification

```bash
npm run test-capture-intake-workflow
npm run test-capture-intake-sqlite-persistence
npm run typecheck
```

The SQLite test uses the repository Electron Node launcher declared in
`package.json`. Do not rebuild native dependencies merely because the shell
Node ABI differs from Electron's; no ABI switch is needed for these commands.

The focused tests use generated bytes, temporary directories, and a temporary
SQLite database only. They prove zero-write planning, source preservation, one
verified Promotion, replay without duplication, no replacement of an occupied
destination, rejection of a managed-directory symlink escape, restart-visible
Promotion state, and rollback of Asset/Candidate/Promotion Link state as one
transaction.

`createSharpSystemPreviewAdapter()` is the Main-only production preview seam
used by the first Active Library Host checkpoint. It decodes only the committed
Managed Original, applies orientation and bounded resizing with Sharp, writes a
same-format PNG/JPEG/WebP derivative using no-replace creation, and returns only
an opaque preview reference plus verified evidence to the Capture Gateway.

## Explicit recovery mode

Normal `start`/Copy Plan replay still returns the durable snapshot without resuming work.
The Main-only `resumeAccepted` option is used by the held owned-download recovery flow.
It requires the original admission tuple to replay exactly, resumes only incomplete items,
verifies retained staging and any existing Original, and never overwrites a conflicting
Original. Recovery publication uses frozen verified bytes, and Original bytes are rechecked
before Promotion. Preview recovery can reuse a deterministic identity only when its existing
file matches the freshly generated bytes. This is not an automatic recovery scan or a
permission to revisit arbitrary external source paths.
