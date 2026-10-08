# Batch Attention Badges Track Unresolved Results

Activity Attention Badge should count only Unresolved Batch Results, not every
Batch Activity Record. Fully successful low-risk batch actions should not
create attention badges, and Hard Delete should enter Batch Result History
without persistent attention by default. A result becomes Resolved Batch Result
after the user opens its detail, completes retry or recovery, explicitly skips
remaining work, or uses Dismiss Batch Result. This keeps failed, skipped, and
excluded outcomes visible without turning history into notification noise.

ADR 0392 applies the same rule to Export Activity: only remaining unresolved
placement/conflict/recovery attention contributes to its badge, while successful
or merely retained history does not.
