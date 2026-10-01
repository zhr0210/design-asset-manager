# Multi-Selection Uses Batch Inspector

When users select multiple Design Assets or Asset Candidates, the right-side
inspector should switch to Batch Inspector instead of continuing to show the
last focused item as though it were the action target. The Batch Inspector
should show the selected count, current Batch Action Scope, Shared Metadata
Summary, Mixed Value states, and a Batch Action Bar with only batch-safe
actions. Candidate batch actions should continue to expose Eligible Selection
and Excluded Selection Item counts so the user can see exactly what will be
affected before running an action.

ADR 0457 gives Text fields explicit All Missing, Same Value and Mixed Value
summaries and a No Change default. Set, Clear, Prefix, Suffix and Exact Literal
Replacement open a reviewed plan rather than editing the last focused owner.
