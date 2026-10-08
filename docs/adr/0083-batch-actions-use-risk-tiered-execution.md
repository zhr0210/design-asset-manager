# Batch Actions Use Risk-Tiered Execution

Candidate Batch Actions should not all use the same confirmation pattern.
Lower-risk actions such as adding tags, assigning collections, or extending
retention may run as Direct Batch Actions with short-lived feedback or Batch
Undo. Confirm to Library should become a Reviewed Batch Action when the
selection includes Required Review, Mixed Value fields, or Excluded Selection
Items. Reject Candidate should show affected counts and rely on undo after
execution, while Hard Delete must always use a Batch Confirmation Sheet because
it is irreversible.

ADR 0457 classifies every multi-owner Text replacement or transformation as a
Reviewed Batch Action, including apparently uniform selections, because current
rules and base revisions can still differ per owner.
