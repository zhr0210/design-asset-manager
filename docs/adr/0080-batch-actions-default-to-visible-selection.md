# Batch Actions Default to Visible Selection

Candidate Batch Action flows should default to Visible Selection so users do
not accidentally act on candidates hidden by Capture Batch, Smart Filter,
status filter, search, or page changes. Changing those scopes should clear the
normal selection. Cross-Filter Selection may exist later, but it must be an
explicit mode that continuously shows its cross-scope count and risk, rather
than an implicit persistent selection.

ADR 0457 Batch Text Edit Plan freezes this visible selection and every base
value revision before confirmation. Later scope changes cannot add hidden
owners or reinterpret the reviewed action.

ADR 0478 applies the same visible-selection boundary to Missing initialization
while admitting only selected current owners from the active library. Visible
history, Asset Trash and other-library occurrences remain disclosed lifecycle
or library exclusions rather than hidden write targets.
