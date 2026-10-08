# Batch Conflict Resolution Requires Homogeneous Conflict Sets

Batch Conflict Resolution should be available only for a Homogeneous Conflict
Set where field type, conflict reason, and available Conflict Resolution
Choices match. Heterogeneous Conflict Sets should be grouped for review rather
than handled through one shared choice, because applying one resolution across
different fields could silently overwrite user intent. Before execution, the
app should show Resolution Preview, and the result should still support
short-lived Conflict Resolution Undo.

ADR 0457 conflict rows may group only when they share the same Text field,
planned action/parameters, drift reason and available current-rule resolution.
Different transformations or validation failures remain separate review groups.
