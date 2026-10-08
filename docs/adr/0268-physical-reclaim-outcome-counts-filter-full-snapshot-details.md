# Physical Reclaim Outcome Counts Filter Full-Snapshot Details

ADR 0260's four second-line outcome counts are explicit, keyboard-accessible **Physical Reclaim Outcome Filters** for expanded details. Exactly one of Removed Now, Already Absent, Mixed or Completed As Shared may be active at a time. Every newly projected summary defaults to **All**, and the header metrics always continue to describe the complete frozen ADR 0258 member snapshot.

Activating a nonzero outcome count asks the host for that class across the entire exact generation, stable volume and member-set digest, not just currently loaded rows. The resulting rows retain ADR 0258's stable alphabetical package-identity order and use lazy pages of exactly 50 except the final page. Filtered total and page count come from the host's full-snapshot class membership.

The complete target-count control in the first line clears the active filter. Activating the already-selected outcome count also returns to All. A zero-count outcome remains visibly labeled with zero but is disabled and cannot create an empty filtered view. Visual selected/disabled states and accessible names expose the same semantics without relying only on color.

Changing or clearing a filter resets the detail view to page one at the top and immediately discards ADR 0270 pages belonging to the old filter. The current filter, current filtered page and scroll position survive collapse and re-expansion of that same summary only within the current usable Storage Management surface session. Leaving Storage Management, closing/losing the renderer session or restarting the host discards them; a later projection begins at All, page one, top.

Filtering is a detail projection only. It never changes header target/outcome counts, Actual Reclaimed or Shared Retained totals, Latest Completed time, ADR 0264 card order, the immutable member-set digest, one-viewing acknowledgement or any constituent expiry/ADR 0256 closure. One usable complete header still acknowledges every snapshot member even when details show only one class.

The filter request is bound to the exact opaque summary generation, stable-volume identity, member-set digest, outcome class and page index. A stale, partial or mismatched response cannot replace the current detail page or alter result state. It may be retried as a read-only page request without creating another viewing opportunity.

There is no multi-select, byte-range filter, largest-first sort, package search, hidden zero-result state or persistent saved filter. ADR 0269 hides pagination when the current filtered total fits one page and otherwise provides fixed First/Previous/direct-jump/Next/Last controls without changing this filter or the header. Filter state and page requests create no settings, database row, filesystem cache, Full Library Backup, export/merge/sync record, Activity History, telemetry or support payload.

The current project has no Physical Reclaim Completion Summary or outcome-filter request. This ADR changes documentation only: it filters/pages/acknowledges no real result, reads no user asset, runtime database, package/cache/model/private state and changes no public IPC/schema/AI Worker API. ADR 0269 defines concrete unbounded-result navigation and invalid-page handling.
