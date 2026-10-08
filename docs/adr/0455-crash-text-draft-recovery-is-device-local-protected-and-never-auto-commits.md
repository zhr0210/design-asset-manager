# Crash Text Draft Recovery Is Device-Local, Protected, And Never Auto-Commits

An unexpected process or device termination may lose a valuable ADR 0454 Text
Edit Draft, but uncommitted metadata must not enter portable library state.
Crash recovery is therefore enabled by default through the
**Protected Text Draft Recovery Journal** record class inside ADR 0465's
device-local Protected Custom Field Draft Recovery Journal, owned by the
trusted main process. After input-method composition ends and the draft remains
stable through a short write debounce, the journal atomically replaces the
latest recoverable snapshot bound to the exact Portable Library Lineage
Identity, Local Library Instance Identity, owner, Custom Field Definition and
base value/definition revisions. The active composition buffer is never
journaled, so the most recent unsettled keystrokes remain best-effort rather
than guaranteed crash recovery.

The complete journal payload is encrypted through the operating system's
protected facility on macOS or Windows. There is no plaintext fallback: if
protected storage is unavailable, the live draft remains memory-only and the
editor discloses that crash recovery is unavailable. Journal content, field
labels and owner metadata never enter Library Control Directory, portable
SQLite, Full Library Backup, Offline Library Catalog, search, export,
merge/sync, plugin APIs, logs, telemetry, notifications or crash reports. The
journal is protected recovery state rather than cache and is not removed by a
TTL, LRU, storage-pressure cleanup or ordinary settings reset.

After an unclean termination, activating the same verified Local Library
Instance exposes only a non-blocking recovered-draft count and contextual
**Recovered Text Edit Draft** markers; it never opens an owner, changes
selection or commits automatically. Opening the exact field rechecks current
owner, definition, validation and value revisions. A current record returns as
a pending Text Edit Draft, while changed evidence returns as a Stale Text Edit
Draft under ADR 0097. Missing or unavailable exact identities are never matched
by name or recreated; the protected record remains reviewable by count and may
be explicitly discarded or retried after the owning lifecycle is repaired.

Successful commit or explicit discard removes only that recovered record.
Settings exposes path-free per-library counts and an explicit clear action with
loss-of-recovery warning. ADR 0279 Forget Library Registration displays the
affected count and defaults to the recommended Keep choice; Clear is a separate
privacy choice that deletes only the selected protected drafts. Keeping them
does not retain the registration, open the library or make drafts portable.
Normal close and quit still require ADR 0454 Save, Discard or Stay and cannot
use the recovery journal as silent permission to exit with unsaved work.

ADR 0465 Custom Field Edit Undo Steps, including ADR 0456 Text Edit Undo Steps,
never enter this recovery journal. After an unclean termination, committed
values remain authoritative and only qualifying uncommitted drafts may
reappear.

ADR 0458 Batch Text Undo Journal is a separate protected record class with its
own batch operation identity, retention and storage preflight. Draft recovery
and Batch Undo never share records, retention authority or automatic cleanup.

Under ADR 0461, only writing-assistance content the user has actually applied
and that now belongs to the Text Edit Draft may enter this journal. Provider
requests, responses, issue ranges, checked tokens, language state and
replacement provenance are not separately recoverable records.

Number and later typed drafts may reuse the protected journal infrastructure
under ADR 0465, but they do not inherit this Text record schema, eligibility
rules or payload semantics.
