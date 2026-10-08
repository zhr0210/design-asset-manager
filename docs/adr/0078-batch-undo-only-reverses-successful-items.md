# Batch Undo Only Reverses Successful Items

Partial Batch Action results should be reported as a Mixed Batch Result with
successful, skipped, failed, and excluded counts. Batch Undo should be available
only for the candidates that actually succeeded in the Candidate Batch Action,
using a Batch Operation Snapshot to reverse those per-item outcomes. Skipped,
failed, and excluded items should not participate in Batch Undo because the
batch action did not change their candidate state.

ADR 0476 applies this rule to Missing Custom Field Initialization. A successful
atomic owner group may clear back to its proven prior Missing states only while
all exact committed effects remain current; failed, excluded, unstarted or
drifted owner groups are never manufactured into Undo work.

ADR 0480 includes successful ADR 0479 retries in that successful-effect set.
Before the first Undo commit it closes all remaining forward retry authority;
partial Undo changes neither failed owners nor that closed direction.
