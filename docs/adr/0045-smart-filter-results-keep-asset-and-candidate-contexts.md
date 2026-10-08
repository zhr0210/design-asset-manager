# Smart Filter Results Keep Asset and Candidate Contexts

When a Smart Filter returns both confirmed design assets and asset candidates,
the results should be separated into Smart Filter Result Groups rather than
merged into one grid. Design asset results should use Asset Grid selection and
Asset Inspector actions, while asset candidate results should use Candidate
Review Page semantics and candidate promotion or rejection workflows.

This lets one saved filter span the library without collapsing distinct object
lifecycles. It also prevents candidate-only actions from appearing as if they
apply to confirmed design assets.

ADR 0447 may compute one Duplicate Text Value Finding across both live owner
types, but still renders occurrences in these separate result groups. Rows show
cross-group counts and open one read-only comparison panel; actions remain in
their native Candidate or Design Asset context.

ADR 0448 keeps those groups, rows and counts bound to one opened result
generation. Editing an occurrence opens its normal owner Inspector and marks
new results available; it never turns the comparison panel into an editor or
silently mutates the group being inspected.
