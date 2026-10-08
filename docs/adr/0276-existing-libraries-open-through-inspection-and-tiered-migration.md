# Existing Libraries Open Through Inspection And Tiered Migration

Library Start performs a read-only **Library Open Inspection** before any existing library receives normal write access. It validates the Library Root and control manifest, lineage and local-instance identity, schema/application compatibility, authoritative object integrity, required filesystem capabilities, ADR 0291 Managed Original Path Headroom, unfinished journals, and **Exclusive Library Lock** state without scanning referenced sources, rebuilding caches, migrating data, or creating a replacement database. A fully compatible library opens directly; offline additional referenced sources remain explicit availability state and do not block the rest of the library.

ADR 0282 adds the Managed Originals Directory Binding and its root-relative path, ordinary-directory type, boundary, collision, and owned-file consistency to this inspection. A missing, substituted, linked, non-empty-unbound, or otherwise unproven target blocks managed writes without creating a replacement `Originals` directory or importing unknown files. Changing a valid established binding is a Material Library Migration, not a device-local reconnect or metadata-only upgrade.

ADR 0283 distinguishes a boundary-level failure from an individual managed original changed outside the application. A safely bound directory with an item-level missing, moved, invalid, or ambiguous file keeps unrelated library operations available while that item enters Managed Original Recovery. A mismatch in the binding, authoritative inventory, lock, or transaction evidence still blocks managed writes or enters Library Recovery Mode rather than being downgraded to an item warning.

ADR 0279 Reconnect Registered Library may update only the device-local location pointer after this inspection proves the same Local Library Instance. That pointer update is not a Material Library Migration. Selecting a different instance, or any operation that rewrites library-stored paths, ownership, source relationships, or Library Control Directory layout, cannot use reconnect to bypass ADR 0003. Switcher availability checks may project a migration/recovery state but never run those writes in the background.

Inspection also checks whether the same Local Library Instance Identity is already bound to another independently addressable control root. It collapses locations only when filesystem/control-boundary evidence proves they are aliases of the same physical library. Otherwise ADR 0279 Library Instance Identity Collision blocks registration, federation, reconnect, and writable activation until a separately confirmed copy-adoption flow safely assigns one selected copy a new instance identity; path equality, lineage equality, or an apparently idle lock is insufficient.

ADR 0277 may perform a narrower read-only eligibility inspection for a non-active Registered Library before federated search. That inspection can approve a stable compatible search snapshot but cannot acquire write ownership, run an upgrade, repair authoritative state, rebuild an index, create missing library state, or reinterpret a library that this application version cannot safely read.

ADR 0458 adds unfinished Batch Text Edit Operation Records and Batch Text
Terminal Markers to inspection. Opening the same Local Library Instance on
another device may expose its aggregate Paused/terminal state, but absence of
the initiating device's protected Undo journal cannot be repaired by copying
library state or treated as authority to Resume, Undo or clear that journal.
Other compatible library work remains available under the exact operation's
conflict guards.

ADR 0477 separately requires inspection of every Library-Bound Missing
Initialization Operation's record integrity, operation-schema compatibility,
core field-type/validation support and last settled owner checkpoint. Only the
same exact Local Library Instance with complete supported evidence may expose
explicit cross-device Resume, terminalization or successful-effect Undo; an
unsupported, missing or ambiguous record grants no inferred operation
authority.

An older supported metadata-only schema may upgrade automatically only after a verified **Pre-Migration Recovery Snapshot**, a deterministic migration plan, one atomic transaction, post-migration integrity checks, and proven rollback. This lane cannot change stored paths, source relationships, Original Asset ownership, Library Control Directory layout, or source bytes. Any such change is a **Material Library Migration** governed by ADR 0003: it shows a dry run, affected classes and bytes, required space, rollback plan, and explicit confirmation before mutation. Missing or corrupt Preview Cache, Analysis Proxy Cache, or ANN Search Index data never escalates into a material migration and is rebuilt under its own policy.

A library produced by a newer unsupported application version never receives downgrade writes. Library Start directs the user to a compatible application update and may offer a bounded read-only view only when an exact version adapter proves that doing so cannot reinterpret or mutate data; otherwise inspection remains non-opening. An active Exclusive Library Lock is not force-cleared. A possibly stale lock becomes recoverable only when process/lease, transaction journal, filesystem, and database evidence prove that no writer remains and reconciliation can establish one authoritative boundary; elapsed time alone is insufficient.

Authoritative corruption, ambiguous interrupted writes, failed rollback, or an unprovable migration boundary enters **Library Recovery Mode**. Recovery Mode never creates an empty library over the selected root, silently drops tables, accepts partial migration as success, or rewrites referenced originals. It exposes only evidence-supported actions such as restoring a verified backup/snapshot into staging, retrying a proven-safe reconciliation, rebuilding declared derivatives, or exporting path-free diagnostics; normal writes resume only after a complete integrity and compatibility inspection succeeds.

The current implementation opens one application-global SQLite path, creates it when absent, and performs a mix of startup table creation and dynamic column/table migrations, including operations outside one encompassing migration transaction whose failures may be logged while startup continues. It has no portable manifest/version classifier, per-library Exclusive Library Lock, Pre-Migration Recovery Snapshot gate, newer-schema read-only adapter, or Library Recovery Mode. This ADR records target architecture only and opens, migrates, repairs, or reads no runtime library or user asset and changes no public IPC, schema, or AI Worker API.
