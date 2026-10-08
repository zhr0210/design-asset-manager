# Library Start Contracts and Tracer Limits

Read this local detail only when changing Library Start, its Manifest/filesystem
inspection, or Exclusive Library Lock behavior. The composition remains isolated
from production startup; every inspection result says `writeAuthority: not-issued`.

## Library Start Inspection Tracer (AL-02)

`library-start.ts` defines one path-free `LibraryStart.inspect()` Interface.
The Main-only `createLibraryStartTracer()` binds one selected inspection scope
to a read-only observation Adapter and issues its opaque candidate reference.
That reference is an in-process object identity, not a Capture Candidate,
serialized IPC token, Library Identity or writable Session. The constructor is
not exported by the Module barrel; only Interface types are exported there.

Callers submit `inspect-candidate` with that exact issued reference, or report
`selection-cancelled`. Forged/cross-instance references and extra positive
compatibility, ownership or lock flags are rejected before observation.
Cancellation reads nothing. Each inspection reads fresh Adapter evidence and
returns an immutable, bounded candidate/state/reason projection with
`writeAuthority: not-issued`; there is no activation or Session result.

The memory Adapter supplies either a one-field `kind` record (`missing`,
`unavailable`, `not-assessed` or `legacy`), or `portable` plus four closed-set
assessments: compatibility, integrity, filesystem and lock. These are trusted
Main Adapter fixture observations, never caller evidence or disk qualification.
Portable classification reports known blockers first: unavailable storage,
unsupported compatibility, recovery, unsupported filesystem, then busy lock.
Only when every assessment is known can it report read-only storage or
compatible inspection eligibility. Missing evidence never implies creation;
only the explicit `missing` observation produces `creation-required`.

Plain own data fields are snapshotted without invoking getters. Malformed
requests/observations, unknown scopes and Adapter exceptions produce fixed
reasons; no Adapter text, paths, SQL, handles or arbitrary metadata is returned.
The candidate is not a cached qualification or authorization for a later write.

`npm run test-library-start-inspection` exercises this Interface using separate
compatible/legacy memory Adapters, other outcomes, invalid inputs, exceptions,
fresh observations and immutable projections. This is a **Validated Tracer**,
not production Library Start: no filesystem/manifest read, database open,
lock acquisition, migration, creation, adoption, Session issuance, picker,
IPC/Preload/Renderer or startup wiring is implemented. AL-01 still guards that
absence of production composition. AL-06 below composes temporary-root read
inspection; production activation remains later work under ADRs 0276 and 0482.

### Portable Library Manifest Tracer (AL-03)

`library-manifest.tracer.ts` is an internal Main-only Adapter behind the same
`LibraryStart.inspect()` Interface. It reads generated in-memory bytes from an
injected read-only Adapter; it is not exported by the Module barrel and opens
no file, database, lock or Session.

Manifest v1 is compact BOM-free canonical UTF-8 JSON, at most 16 KiB. The
source must be an ordinary fixed `Uint8Array`; shared buffers and expandos are
rejected before snapshotting. The
decoded root has exactly: `format`, `manifestSchemaVersion`,
`libraryIdentity`, `controlStore`, `applicationCompatibility` and
`managedOriginals`. JSON object key order is not semantic, but whitespace,
duplicate keys, non-minimal numeric/escape spellings, accessors, inheritance,
symbols and extra fields are rejected rather than normalized or coerced.

Supported declarations are:

- format `design-asset-library`, Manifest schema 1 and control-store schema 1;
- distinct case-sensitive ASCII opaque lineage, local-instance and
  control-store identities (1–128 characters; no path/URI punctuation);
- integer application compatibility levels where minimum reader is at least 1,
  not newer than this reader's level 1, and writer is not older than minimum;
- one NFC, `/`-separated, non-hidden Managed Originals root-relative binding,
  bounded to 240 UTF-8 bytes, eight segments and 120 scalar values per segment.

The binding rejects absolute/home/URI/drive/traversal forms, backslashes,
control or Windows-illegal characters, trailing dot/space, Windows device
names and cache/runtime/model/plugin role segments. This is lexical declaration
validation only. Physical containment, symlink/reparse/mount boundaries,
emptiness, case folding, collisions, ownership and platform capability remain
later filesystem evidence under ADR 0282.

A valid v1 Manifest returns `manifest-compatible-evidence-pending`, never
`compatible`; filesystem and lock evidence are still absent. Newer Manifest,
control-store or minimum application levels return unsupported. Malformed,
ambiguous or unsafe present Manifests require recovery. An absent Manifest is
creation-required only when the in-memory source explicitly says the target is
empty and has no legacy evidence; non-empty/unknown scopes stay legacy or not
assessed. No payload, identity or binding path leaves the Interface, and input
bytes are never rewritten.

`npm run test-library-manifest-inspection` covers valid, missing, legacy,
newer, malformed, hostile-byte, identity and binding cases through the existing
Library Start Interface. It proves declaration semantics only, not a real
Manifest, Library Root or writable authority.

### Read-only Filesystem Observation Tracer (AL-04)

`library-filesystem.tracer.ts` is a Main-only Adapter behind the same
`LibraryStart.inspect()` Interface. Its trusted constructor receives exactly
three internal locators: selected Library Root, Library Control Directory and
Managed Originals Directory. The file imports only `lstat` and `realpath`; it
does not call `readdir`, permission/access checks or any create/write/open/
rename/remove operation. Referenced sources and unrelated descendants are not
examined.

Each selected role and its Root-relative component chain must remain ordinary
directories, free of links/junctions, strict resolved descendants, mutually
distinct and non-overlapping under portable NFC/case folding. Both roles stay
on the selected Root device; resolved device/inode aliases are rejected.
Device/inode/mode/birth identity plus canonical
real paths are compared before and after the asynchronous qualification lookup;
replacement, escape or ambiguity fails closed. Missing/unreadable roles are
unavailable and no missing directory is created.

The qualification Adapter receives only current platform and an opaque
selected-scope identity derived from Root filesystem metadata, never a path.
A `qualified` memory fixture must match that exact scope and provide bounded
component/complete-path limits plus explicit atomic-replace and durable-commit
evidence. It must also carry independent mount-boundary qualification because
ordinary `lstat`/`realpath` cannot identify every same-device bind mount. OS
name, drive label, permission bits and successful stat do not
prove these capabilities. Unsupported evidence blocks; missing, malformed or
partial evidence remains not assessed. No disposable write probe is part of
this Adapter and fixture qualification does not qualify a real volume.

Current Control/Managed role paths are checked against ADR 0291's 200-byte /
200-UTF-16 Root-relative budget, reported component/complete-path limits and,
on Windows, the current canonical 240-UTF-16 absolute limit. This does not
preflight later final/staging/rollback Asset paths; each allocation still needs
its own full measurement.

Even a stable role layout with a matching memory qualification returns
`filesystem-observed-evidence-pending`, never `compatible`. Manifest and real
Exclusive Lock evidence remain separate. Outward results contain no paths,
scope identity, measurements or raw errors and always say
`writeAuthority: not-issued`.

`npm run test-library-filesystem-inspection` uses only generated task-owned
temporary roots. It compares relative fixture shape before/after success and
static failures, proves unrelated links are ignored, and simulates external
replacement solely inside the injected test actor. This is local read-only
tracer evidence, not macOS/Windows/removable/network filesystem qualification.

### Exclusive Library Lock Tracer (AL-05)

`exclusive-library-lock.tracer.ts` binds an explicitly initialized temporary
Library Control Directory and exact opaque Library/generation identities. It
is available by direct Main-only import, not the Module barrel or production
composition. Its two-entry Interface separates `inspect()` from `acquire()`:

- `inspect()` opens the existing lock store read-only and returns only
  `storage-valid` or `storage-invalid`. Valid storage is not an idle lock or
  permission to write; this inspection can succeed while another holder owns it.
- `acquire()` first holds a real read-only transaction, then obtains a
  zero-timeout SQLite `BEGIN IMMEDIATE` transaction on the separate lock store,
  returning an acquired capability, typed `busy`, or `invalid`. It never locks
  the authoritative Asset database, so that database remains usable by the
  matching Session while the lease is held.

The reserved `exclusive-library-lock.sqlite` is initialized only by generated
test fixtures. Application/schema markers, the exact singleton identity table,
DELETE journal mode, regular-file shape and canonical node identities are
checked. Missing/invalid state is not created or repaired, and any journal/WAL/
SHM sidecar blocks inspection/acquisition without recovery or deletion. Aliased
locators resolve to the same physical lock store, not a second lease namespace.

Before any pager read, the readonly connection sets `locking_mode=EXCLUSIVE`:
on the qualified macOS POSIX test host this refuses WAL's required write lock
before WAL/SHM can be opened, while DELETE-mode reads retain only SHARED
evidence. Acquisition holds that read transaction across asynchronous node
revalidation and writer acquisition. Under SQLite's
[rollback locking protocol](https://www.sqlite.org/lockingv3.html), recovery
needs EXCLUSIVE, so it cannot race through this retained SHARED guard. WAL is
never converted or adopted. Other platforms are rejected before opening storage,
not inferred safe from macOS behavior.

An acquired capability contains the existing `ExclusiveLibraryLockLease` plus
idempotent asynchronous `release()`. Release immediately stops new
`runWhileHeld()` admissions, keeps physical `held` evidence until every admitted
operation settles (including the Session's final authority check), then marks
the old lease `lost` and closes the OS-backed transaction. A release call inside
admitted work requests revocation but rejects with a fixed self-wait error;
an outside call awaits the same drain. Async-context tracking prevents an
awaited in-guard call from deadlocking on itself. A failed close rejects with
fixed path-free text; it never pretends release succeeded.
Operation results/errors remain the caller's responsibility; the lock adds no
path, PID, SQL, connection or native handle to its outcomes.

`npm run test-exclusive-library-lock` uses real independent processes and
task-owned roots to prove contention through canonical/aliased locators,
ordinary and abrupt-process release, identity/generation rejection, immutable
constructor binding, old-Session invalidation, asynchronous drain and bounded
reentrant self-wait rejection. A real child writer interrupted during acquisition
cannot commit through the read guard; its journal is not recovered or deleted.
Generated malformed, WAL and recovery-sidecar fixtures remain unchanged. The
relevant decisions are [ADR 0276](../../../docs/adr/0276-existing-libraries-open-through-inspection-and-tiered-migration.md)
and [ADR 0278](../../../docs/adr/0278-library-switching-quiesces-library-bound-work-at-safe-boundaries.md).

This is current-host macOS tracer evidence only. Windows, removable/network
filesystems, hostile concurrent filesystem replacement, copied-instance
collision resolution and production filesystem qualification remain unproven.
No PID/clock heuristic, lock stealing, recovery, Library creation, migration,
Switch coordinator or startup/IPC wiring is introduced.

### Coherent Library Open Inspection Tracer (AL-06)

`createLibraryOpenInspectionTracer()` in `library-open-inspection.tracer.ts`
composes the existing one-entry `LibraryStart.inspect()` Interface over one
Main-bound Root/Control pair. It reuses AL-03 declaration validation and AL-04
physical-role/qualification rules through narrow internal facts. Those helpers
and the composed constructor remain outside the Module barrel and startup.

Generated Control Directory fixtures contain `library.manifest.json` (at most
16 KiB), `library.sqlite` (at most 16 MiB) and AL-05 lock storage. The inspection
control-store format has exactly two tables: one identity/generation/binding
record and a bounded operation-journal relation. Missing/malformed schema or
pending/ambiguous journals require recovery; a newer declared schema is
unsupported. This is an empty-library fixture format, not the production Asset
schema or a migration. It reads no Asset/Original rows or referenced source tree.

SQLite reads use `readonly-library-database.internal.ts`, shared with AL-05:
readonly/fileMustExist, a retained read transaction, and only connection-local
read protection before the first pager read. No writable journal-mode setting,
schema setup, automatic recovery, replacement database or normal writer lease
is used. Existing journal/WAL/SHM state is rejected without cleanup. The qualified
macOS-only behavior is not inferred for other hosts, which remain not assessed.

The retained database snapshot must agree with the Manifest's lineage, local
instance, control-store identity and Managed Originals binding. Before return,
inspection rechecks Manifest content and file stamps, all selected directory
nodes, database/lock-file bindings and the database generation. Changed or
inconsistent evidence cannot be combined into success.

A trusted read-only Main qualification Adapter receives only opaque scope and
inspection identities plus Library/generation values. Its filesystem/access/
lock observations must match that exact inspection. `storage-valid` from AL-05
is never interpreted as an idle lock; real lock-state qualification remains a
separate Adapter, and positive available/volume evidence here is a generated
fixture. Known busy remains busy even when filesystem qualification is unknown.
Unknown evidence cannot yield compatible; compatible still returns
`writeAuthority: not-issued`, not a Session or activation permission.

Only when the selected Control Directory is absent may the Tracer inspect the
known `design_asset_manager.db` filename inside the selected Root. It recognizes
the existing legacy Asset/Tag schema surface without reading rows or consulting
the application-global database location. It does not run `quick_check` or
qualify any legacy Asset/Tag row; the later migration inventory must assess
those rows independently. A recognized legacy library requires reviewed
migration; an unknown empty target stays not assessed. A known root-level
legacy database alongside any Control Directory, even a complete valid portable
one, requires recovery. The same exclusion is rechecked before return so late
legacy evidence cannot pass. No missing directory is created.

`npm run test-library-open-inspection` checks coherent, blocked, changed-target,
legacy, symlink, bounded-file, journal/WAL and request-admission cases with
before/after fixture snapshots. Real independent-process contenders prove the
inspection neither acquires nor steals the writer lease. This remains a
Validated Tracer: production startup, populated-library inventory/operation
adapters, copied-instance collision reconciliation, hostile filesystem ABA,
platform/volume qualification and writable activation are not delivered here.

### Read-only New Library Creation Planning (AL-07)

`library-creation-planner.ts` defines one Main-only `prepare / inspect`
Interface. Its factory binds one selected target privately; outward requests
contain no path or capability claims. A missing direct child of an existing
ordinary parent, or an explicitly selected empty ordinary directory, may
produce an immutable review. Existing content of any kind, links, unsafe or
unavailable targets and an over-budget parent namespace block without opening
file content, adopting state or creating anything. Every lexical ancestor is
also observed as an ordinary directory; a symlink, junction or reparse-point
ancestor cannot be followed into another namespace.

A dedicated injected target-platform Adapter owns host filename policy and
read/write/search access observation; the ancestor/namespace orchestration does
not branch on the ambient operating system. The qualification Adapter supplies
scope/target generations, a distinct opaque access-subject identity, the
existing filesystem qualification profile, access/lock qualification and
explicit required/free/reserve bytes. Missing targets bind access evidence to
their parent; existing empty targets bind it to the target itself. Every field
is strict, scoped evidence. An explicit negative access observation (including
missing directory search access) blocks early, while stat, positive permission
bits, platform names and `storage-valid` still do not imply writability or
exclusive-lock support. Available bytes are a fresh observation, not a space
reservation; requirements and qualification generation remain bound to the
receipt.

Manifest v1 proposal encoding reuses the same decoder/Managed Originals
binding policy. Path planning reuses AL-04 limits for Control/Managed roles,
required metadata paths and the ADR 0290 minimum baseline managed-image path;
none of those paths is allocated. Ill-formed Unicode, unsafe bindings and
insufficient complete-path headroom remain blocked.

Reviews contain only proposed opaque identities, role/consequence enums,
explicit no-collision projections for the selected namespace and planned
roles, and bounded capacity numbers. Any detected collision blocks rather than
producing a confirmable review. Reviews carry `writeAuthority: not-issued` and
no confirmation method. `inspect()` rechecks target and qualification evidence
without regenerating identities. New preparation or selection cancellation
revokes the old review; AL-08 must still recheck and own every actual write,
staging, publication and rollback boundary.

`npm run test-library-creation-planner` proves missing/empty target
reviews, immutability, no-write snapshots, non-empty/linked/unavailable target
rejection, strict qualification/capacity handling, Manifest binding reuse and
minimum path headroom. It also proves no-collision review projection, obvious
read-only/no-search target and parent rejection, linked-ancestor rejection,
injected Windows/macOS policy and access-subject scoping, free-byte refresh
without identity drift, requirement/qualification/target invalidation,
non-revivable receipts, forged and cross-planner rejection, cancellation during
qualification, latest-only concurrent preparation, constructor binding and the
bounded parent namespace.
