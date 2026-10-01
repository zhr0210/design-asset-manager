# Registered Library Switcher Is Device Local And Non Destructive

A **Library Registration** is created on the current device only after Library Start successfully creates, adopts, opens, or restores a library and establishes its Portable Library Lineage Identity and Local Library Instance Identity. The application does not scan disks automatically for libraries. The registration keeps the selected location reference, last use, pin/order preferences, bounded Offline Library Catalog and recent-result thumbnail state, and the latest observed switcher status outside portable library state, Full Library Backup, merge, and synchronization.

The Registered Library Switcher may show current, available, offline, busy, migration-required, recovery-required, or incompatible state from bounded read-only checks. It cannot repair, migrate, force-unlock, create replacement state, or claim that an unavailable library is empty. Missing or disconnected entries remain registered so the user can understand why cross-library coverage changed and can explicitly reconnect or forget them.

**Reconnect Registered Library** accepts a newly selected location only after ADR 0276 Library Open Inspection proves it is the same physical Local Library Instance. Reuse of a path by another volume, or a restored sibling with the same lineage but a different Local Library Instance Identity, is an identity mismatch rather than a silent rebind. The user may register that verified instance separately or retain/forget the missing registration. Multiple locations collapse only when filesystem/control-boundary evidence proves they are aliases of one physical root; identity, path, or lineage equality alone is insufficient.

A raw folder copy may reproduce the same Local Library Instance Identity at two independently addressable roots. This is **Library Instance Identity Collision**, not an alias and not proof of synchronization. Neither root is merged, rebound, federated, or granted writable activation through the colliding registration. Resolution requires a separately confirmed copy-adoption flow that performs complete inspection, obtains exclusive ownership of the selected copy, assigns it a new Local Library Instance Identity transactionally, invalidates copied device projections, and validates the result; the switcher never chooses an “original” or rewrites identity automatically.

ADR 0477 does not let a copied Library-Bound Missing Initialization Operation
bypass this collision. Cross-device Resume, terminalization and Undo remain
blocked until one exact physical instance is proven; copy adoption gives the
adopted copy a new identity but does not transfer or replay the old instance's
active operation authority.

**Forget Library Registration** requires confirmation and removes only this device's registration, Offline Library Catalog, recent-result thumbnails, pin/order state, and non-authoritative switcher/presentation preferences owned solely by that registration. It never deletes or edits Library Root, Library Control Directory, database, Candidate or Managed Asset original, referenced source, metadata, backup, library-scoped acknowledgement, Library-Bound Work checkpoint, Candidate Intake state, Transfer Checkpoint, or retained acquisition staging. ADR 0298 adds one explicit choice when Device Trash Restore Handles exist: retain them as inactive Dormant Trash Restore Handles or clear only those local handles, never the associated operating-system trash items or portable deletion state. ADR 0299 makes **Keep Local Restore Handles** the default and recommended choice; clearing remains an explicit privacy decision after the loss of one-click restoration is disclosed. Transfer Destination Replacement Receipts govern displaced external files rather than Design Assets, so ADR 0308 retains them as active Local File Recovery by default and permits receipt-scoped recovery even after the originating registration is forgotten. Forgetting an active library first follows ADR 0278 Library Quiescence and releases its Exclusive Library Lock; if no other library becomes active, the app returns to Library Start.

ADR 0465 applies the same explicit recovery-versus-privacy boundary to
Protected Custom Field Draft Recovery Journal records, including ADR 0455 Text
records. Forget displays a path-free affected count and recommends Keep by
default; Clear removes only the selected encrypted device-local drafts and
never changes committed Custom Field Values or the physical library.

ADR 0458 applies it to Batch Text Undo Journals without allowing an unfinished
operation to lose its only local Undo evidence inside Forget. The confirmation
shows path-free active/Paused and terminal-Undo counts and defaults to Keep
Batch Text Recovery as inactive Dormant Batch Text Recovery. Clearing requires
the user to Cancel Remaining before Forget so the operation is terminal, then
uses the counted Clear Batch Text Edit Result And End Undo action. Neither
choice edits committed values, transfers a journal or keeps the registration.

A forgotten library immediately leaves new Cross-Library Search federation. An existing Ephemeral Search Session may retain a non-actionable unregistered placeholder for sequence stability, but it cannot read cleared offline projections or activate that occurrence without a new verified registration. Physical library deletion is a separate high-risk workflow and is not offered by the ordinary switcher or represented by “从本设备移除”.

The current implementation has one editable settings-level library path, one application-global SQLite connection, and no library registry, instance-identity deduplication, switcher, Offline Library Catalog, reconnect verification, or non-destructive forget workflow. This ADR records target architecture only and registers, forgets, opens, reads, or deletes no runtime library, user asset, database, cache, or backup and changes no public IPC, schema, or AI Worker API.
