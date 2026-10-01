# Post-Batch Selection Follows Batch Result

Candidate Batch Actions should leave selection and focus based on what actually
happened. Lower-risk metadata actions such as adding tags, assigning
collections, or extending retention should keep the Visible Selection and
refresh Batch Inspector. Confirm to Library and Reject Candidate should remove
successful items from the active selection while keeping skipped, failed, and
excluded items selected with their reasons visible. Hard Delete should clear
deleted items from selection, move Result Focus to the next visible candidate,
show Batch Result Feedback, and never offer Batch Undo.

ADR 0457 Batch Text Edit keeps the selected owners visible and refreshes Batch
Inspector after execution. Changed, unchanged, invalid, conflict, failed and
excluded outcomes remain inspectable without silently narrowing the selection.
