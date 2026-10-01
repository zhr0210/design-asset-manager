# Batch Activity Retention Is Tiered by Importance

Batch Activity Retention should be tiered by result importance. Fully
successful low-risk Direct Batch Actions should stay in Recent Activity Summary
for 7 days by default. Important Batch Records for failed, skipped, excluded,
Reviewed Batch Action, and non-Hard Delete high-risk results should remain in
Batch Result History for 30 days by default. Hard Delete should retain only an
irreversible action summary for 90 days by default, without private file
content snapshots. Users may adjust these durations, and older records may
become Pruned Batch Detail instead of remaining fully expanded forever.

ADR 0392 gives fully successful non-replacing Asset Export 7-day recent
activity and failed/skipped/cancelled/partial/replacing terminal export 30-day
history by default. Neither duration starts while operational attention remains
and neither governs external-file recovery receipts.

ADR 0403 classifies every Recovery Staging Release Batch as a Reviewed Batch
Action and retains its lightweight result for 30 days by default, including a
Complete result. That duration never expires or releases the distinct affected-
work recovery authority, evidence, attention or isolation. When the record
expires, its visible attempt timeline, reason summaries and statistics are
deleted. ADR 0401 governs any lifecycle-bound Recovery Staging Terminal Marker
or anti-replay tombstone; neither is Batch Activity history or a reason to
extend the visible retention period.

ADR 0429 classifies every Custom Field Migration Result as a Reviewed Batch
Action with the same user-configurable 30-day default, but starts that result
and Undo window only after explicit result acknowledgement and source-field
disposition. Early result clearing explicitly ends Undo, and expiry leaves only
value-free Pruned Batch Detail.

ADR 0434 applies the same acknowledgement-gated 30-day-default complete-result
and Undo window to Custom Field Option Merge. Permanent Delete Custom Field
Select Option instead follows Hard Delete retention: it has no Undo and keeps a
user-configurable 90-day-default irreversible summary without private value or
per-owner snapshots. Neither expiry ends unfinished operational state.

ADR 0458 classifies Batch Text Edit as a Reviewed Batch Action with a
user-configurable 30-day-default terminal-result and device-local Undo window.
Its clock starts when execution becomes terminal, not while active or Paused;
unfinished reconciliation evidence cannot expire. Early clearing discloses the
remaining eligible Undo count and ends both detailed result and Undo, while
normal expiry leaves at most value-free Pruned Batch Detail. A value-free ADR
0458 Batch Text Terminal Marker may outlive that visible history only until the
initiating device acknowledges the original terminal deadline and disposes of
its local journal; it is operational anti-replay evidence, not retained
activity.

ADR 0481 applies the same default 30-day Reviewed Batch Action duration to one
Missing-initialization result, Retry and Undo window starting at first terminal
reconciliation without acknowledgement gating. Retry, Undo, viewing and device
change do not extend it; an in-flight atomic group may settle without admitting
later work or receiving a new deadline.
