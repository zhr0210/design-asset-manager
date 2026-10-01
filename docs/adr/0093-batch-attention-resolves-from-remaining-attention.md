# Batch Attention Resolves from Remaining Attention

Activity Attention Badge should be calculated from Remaining Attention Count,
not from whether the user merely opened Batch Result Detail. Retry success,
manual recovery, explicit skip, Dismiss Batch Result, or User Acknowledgement
can create Recovery Completion and reduce the count. When the count reaches
zero, Auto Resolve Rule should mark the Unresolved Batch Result as Resolved
Batch Result. Opening details alone may mark the result as viewed, but should
not clear attention because the user may still need to act on failed, skipped,
or excluded items.

For an ADR 0403 Recovery Staging Release Batch, Complete has no result-level
attention. Staging Release Reconciliation Required, Excluded After Evidence
Change and Release Failed items contribute until retry/recovery resolves them,
explicit User Acknowledgement follows review, or Dismiss Batch Result clears the
batch-history reminder. ADR 0403 Released After Reconciliation reduces both the
batch Remaining Attention Count and that item's separate Startup Recovery
Attention because current evidence has resolved its staging ambiguity. Result-
only acknowledgement/dismissal still clears neither affected-work evidence nor
isolation.

For ADR 0429 Custom Field Migration Result, opening detail never acknowledges
the result or starts retention. Explicit acknowledgement includes a reviewed
Archive Source Field or Keep Source Field Active choice; it may acknowledge
retained exceptions without claiming they were converted or repaired.

Under ADR 0479, a successful Missing initialization retry resolves that owner
group's retry attention through the original result merge. Conflict,
ineligibility or exhaustion changes the reason and available recovery but does
not clear attention merely because Retry is no longer available; explicit
review or acknowledgement remains required.
