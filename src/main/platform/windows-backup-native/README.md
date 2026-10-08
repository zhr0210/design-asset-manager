# Windows schema backup native Runtime

This Main-private port keeps the existing Host, Library lease and SQLite
transaction authority. `runtime.ts` consumes a fixed offline bundle; it never
compiles, downloads or installs at runtime. The caller obtains its real memory
permit before `loadWindowsBackupRuntime` and retains it through helper/Job exit,
pending writes and every known source/supervisor handle close.

`scripts/build-windows-backup-runtime.mjs` uses the already installed x64
MSVC/Windows SDK and .NET compiler. Each invocation creates a new complete
version directory; failed builds never publish generated pins. The minimal
`build/windows-backup-runtime/package` tree contains only the current manifest
and four artifacts. Previous generated package trees are retained separately.
The generated `source-identity.ts` selects the exact directory and manifest;
the runtime does not trust a mutable `current.json` as an authorization source.

The actual MAIN extension binds the SQLite file object to retained no-reparse
component handles. Initial snapshots/private images are at most 1 MiB. The
mutable source's native lifetime limit is 5 MiB, matching the initial 1 MiB
plus the existing 4 MiB DDL growth bound; this does not enlarge snapshot
eligibility. Source/metadata/hash/space checks detect changes and refuse.
They do not isolate arbitrary same-principal writers or writable mappings.

The packaged launcher starts inside an atomic native Job before its first CLR
instruction; the target inherits the bounded hierarchy. Private commit limits
are 128 MiB/process and 256 MiB/Job. RSS is observed high-water evidence, not a
hard RSS limit. Named control/operation inputs come only from trusted Main.
Backup/status creation and I/O use single-component `NtCreateFile` with
`OBJ_DONT_REPARSE`, retained handles, same-handle flush/readback and exclusive
operation creation. Protocol 1 status separates backing, target verification
and Main's commit declaration; it grants no restore permission.

Abort rejects pending logical source requests without releasing physical
resources. A held target receives the existing graceful cancellation command
first; five seconds without actual exit escalates to Job termination. Timeout
and protocol failure terminate directly. Five seconds after termination is requested, an
unconfirmed process returns `WindowsBackupPhysicalExitUnconfirmedError` with
the actual release promise; the exact observer and accounting continue.
Unknown native close is poisoned, never retried using an old numeric handle.
This includes CNG hash/provider cleanup in both source evidence and artifact
verification. If an initial source pin fails and its cleanup cannot be
confirmed, the thrown error retains an unresolved physical release promise;
it cannot become an ordinary preparation failure that releases the permit.

Before formal maintenance DDL, Main reserves a new zero-byte
`library.sqlite-journal` relative to the retained source parent. Every existing
journal, WAL or SHM sidecar refuses qualification. The guard permits read/write
sharing but denies delete sharing. Inside the existing authority transaction,
the binding writes the current `user_version` value unchanged to open SQLite's
actual journal, then verifies its win32 handle overlaps the same regular,
single-link reserved object before closing the guard. Only this journal's
copied I/O method table observes the original win32 `xClose` return; an unknown
or unobserved close poisons the binding. Shared VFS tables remain untouched.

Cancellation before that handoff deletes only the unchanged empty reservation,
after checking the source SHA, closing the guard, reopening the retained
parent's exact component with DELETE access and rechecking file identity,
creation time and link count. A substituted or nonempty journal is never
deleted by cleanup. The public rollback hook runs after journal finalization,
so it is not used to hand off the guard. Once handed off, SQLite owns journal
finalization; this port performs no later journal pathname deletion.

Artifact loading uses the same trusted application-bundle boundary as the
existing SQLite addon, with exact deployed-byte and Runtime identity checks.
It does not claim atomic hostile same-principal loader isolation. There are no
production fault modes, arbitrary handle-closing actions, compiler actions,
SQL actions, model/provider grants, or restoration actions at this port.

Applicable isolated checks: `scripts/windows-backup-native-runtime.test.ts`
and `scripts/windows-backup-source-settlement.test.ts` under the repository
Electron Node runner. Product maintenance verification
belongs to the formal Adapter's callers, not to this native port alone.
