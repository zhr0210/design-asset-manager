# Batch Operations Lock Scope While Allowing Navigation

Candidate Batch Actions should create a Scope Snapshot as soon as execution
starts, locking the candidate identities, action type, target collection,
parameters, and Batch Action Scope independently from later filter, search,
page, or workspace changes. Navigation During Batch should remain allowed, with
Capture Inbox Activity Panel showing Batch Operation In Flight and visible
cards showing pending state when relevant. Cancellation Boundary should allow
only unstarted queued work to be cancelled; already-started or written items
must finish into Mixed Batch Result, Batch Result Feedback, and the appropriate
recovery flow.

ADR 0457 adds the exact Custom Field Definition, Text action/parameters,
Treat Missing option, rule revision and per-owner base value revisions to the
Scope Snapshot. Navigation may continue after execution starts, while
cancellation stops only owners whose atomic item has not begun.

ADR 0458 makes that active scope a durable Batch Text Edit Operation Record
until terminal reconciliation. An interruption pauses remaining owners at item
boundaries instead of rebuilding scope from the current selection or
automatically resuming writes.
