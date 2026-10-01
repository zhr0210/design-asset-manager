# Physical Reclaim Summary Cards Sort By Latest Completion Time

Physical Reclaim Completion Summary cards are transient completion results, not a persistent volume inventory. Their primary order is therefore the authoritative **Latest Constituent Completion Time** of each immutable ADR 0258 summary snapshot, descending so the most recently completed snapshot appears first.

The sort timestamp is the maximum completion instant among the snapshot's constituent ADR 0254 results. It compares normalized UTC instants, never localized display strings, renderer receipt time, acknowledgement time, expiry time, volume mount time or generation identifier. A constituent without a valid authoritative completion instant cannot form a valid one-viewing/24-hour result or enter a usable summary.

If two snapshots have the same latest completion instant, their next key is the current ADR 0262/0263 disambiguated volume label under the application locale's deterministic display collation. Remaining ties use host-only opaque stable-volume identity and then opaque startup/scheduler generation identity. Those final keys affect order only and are never rendered, logged or exposed as suffixes.

When a usable Storage Management surface session begins, the relative order of its projected cards freezes. A newly arriving summary is inserted at the position determined by the same keys without re-sorting the existing cards against changed labels; an expired, acknowledged or removed card simply closes its visual gap while all surviving cards retain their relative order. A volume rename, first duplicate-name suffix, mount-state change or locale change may update permitted presentation but does not move an existing card during that session. A later session computes a fresh order.

Actual reclaimed bytes, shared-retained bytes, target count, Removed Now, Already Absent, Mixed, Completed As Shared, expansion state, selected page and remaining expiry never affect order. The application exposes no “largest reclaim first,” attention-priority or result-class sort, and it does not treat ordering as a deletion recommendation, severity judgment or proof of reading.

Card order is ephemeral renderer projection state. It is not persisted as a preference, result field, database row, Full Library Backup, export/merge/sync record, Activity History, telemetry or support payload and changes no constituent acknowledgement or expiry.

The current project has no Physical Reclaim Completion Summary card list. This ADR changes documentation only: it sorts/acknowledges/expires no real result, reads no user asset, runtime database, package/cache/model/private state and changes no public IPC/schema/AI Worker API. ADR 0265 displays this exact latest completion instant in the summary header without deriving order from localized text.
