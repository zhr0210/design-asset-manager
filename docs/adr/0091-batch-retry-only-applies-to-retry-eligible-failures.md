# Batch Retry Only Applies to Retry Eligible Failures

Batch Retry should be available only for Retry Eligible Failure items whose
Batch Failure Reason is clearly transient and safe to rerun. Manual Recovery
Required items should expose their specific Failure Recovery Action instead of
being included in Batch Retry. Retry outcomes should use Retry Result Merge to
update the original Batch Activity Record and Unresolved Batch Result with
retry count and latest retry time, rather than creating disconnected history.
The app should not run automatic retry loops by default because repeated writes
could duplicate work or hide unresolved recovery needs.

ADR 0403 Complete Remaining Recovery Staging Release is manual recovery rather
than Batch Retry. Its Recovery Staging Release Result Merge updates the original
batch item as Released After Reconciliation while preserving the interruption;
it creates no disconnected record and consumes/increments no retry attempt.
A failed Recovery Staging Completion Attempt also remains manual recovery in the
same item. A later Try Complete Remaining Staging Release Again requires fresh
proof and confirmation and never enters Batch Retry or an automatic loop.

ADR 0479 applies Batch Retry to Missing initialization only after terminal
reconciliation proves a transient, wholly uncommitted owner group whose exact
frozen plan is still current. Retry may target an explicit selected subset of
eligible groups and merges into the original result; there is no automatic or
catch-all action over conflicts, exclusions, ambiguous outcomes or drift.

ADR 0480 ends that result's Missing-initialization retry eligibility when
trusted Undo direction admission commits. Retry success before that boundary
joins the Undo-eligible successful-effect set; Undo failure after it cannot
reopen forward Batch Retry.
