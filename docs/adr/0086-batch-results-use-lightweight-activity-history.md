# Batch Results Use Lightweight Activity History

Batch result history should use lightweight Batch Activity Records rather than
a full Audit Trail. Fully successful low-risk actions may remain Ephemeral
Feedback or a recent activity summary. Results with failed, skipped, or
excluded items, Hard Delete, and Reviewed Batch Actions should enter Batch
Result History so users can later understand what happened. These records
should preserve result counts and necessary reasons, but should not become
long-lived snapshots of private file content.

ADR 0392 applies this lightweight model to resolved Asset Export while keeping
active/paused/conflict/recovery operational authority outside ordinary activity
expiry and keeping destination-replacement receipts in Local File Recovery.
ADR 0403 applies the same separation to a Recovery Staging Release Batch:
its lightweight result history never becomes startup-recovery evidence,
affected-work authority or another staging-release authorization.

ADR 0458 applies it to Batch Text Edit. Active plan/member checkpoints remain
separate operational authority, exact previous Text remains device-local Undo
evidence, and the terminal Batch Text Edit Result retains only aggregate counts
and reason classes in ordinary Batch Result History.

ADR 0476 applies the same split to Missing Custom Field Initialization. Active
frozen values/checkpoints/effects remain protected library-bound operation
authority; terminal activity retains aggregate outcomes and reason classes,
not the private assignment values or complete owner list.

ADR 0481 lets the complete terminal Missing-initialization detail and executable
Retry/Undo evidence share one bounded action window. Expiry or explicit early
clearing leaves at most value-free aggregate Pruned Batch Detail and never
changes current Custom Field Values.
