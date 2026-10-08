# Reversible Candidate Actions Use Undo, Irreversible Actions Use Confirmation

Reject Candidate should execute without a pre-action confirmation because it is
recoverable through Capture Cleanup History and the Recoverable Window; it
should instead show a Candidate Undo Toast after the action. Hard Delete should
require a Candidate Confirmation Dialog because it is irreversible. Batch
destructive candidate actions should show the affected candidate count, with
batch rejection using undo after execution and batch hard delete requiring
explicit confirmation before execution.
