# Batch Result Feedback Is Proportional to Complexity

Batch Result Feedback should match the complexity and risk of the result. A
fully successful low-risk Direct Batch Action may use only Candidate Undo Toast.
Any result with skipped, failed, or excluded items should show Inline Batch
Result with a visible reason summary and Batch Result Detail available for
inspection. Reviewed Batch Actions should return to Batch Inspector with their
result visible, while Hard Delete should show an irreversible Inline Batch
Result and never expose an undo entry.

ADR 0457 therefore returns Batch Text Edit to Batch Inspector with persisted
outcome counts and direct conflict/failure detail. A fully successful edit still
shows its reviewed result rather than collapsing into a generic one-line toast.
