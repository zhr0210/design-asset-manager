# Duplicate Text Finding Sessions Refresh Explicitly and Never Mutate in Place

Following ADR 0181's stable-generation principle, ADR 0445 findings are dynamic across evaluations, but each opened **Duplicate Text Finding Session** binds one complete query plan, lifecycle scope, comparison-key policy and current-owner projection generation. Later edits, imports, Candidate Promotion or Undo, deletion and restoration may expose Results Available to Refresh, yet cannot insert, remove, regroup, reorder or replace rows and counts inside the active session. The header keeps the frozen session totals distinct from the complete newer generation's prospective totals or added/removed counts; it never mixes evidence from two generations.

The ADR 0447 Duplicate Text Comparison Panel remains read-only. Editing opens the occurrence's normal Candidate or Design Asset Inspector, and a successful commit marks the session refreshable without optimistically removing the row, closing its group or mutating its displayed original form. Any later action reached from a frozen row must revalidate the owner's current identity and lifecycle before mutation; stale session membership grants no operation authority.

Explicit refresh atomically replaces the session with one complete newest generation and follows ADR 0081 result-set selection rules. Closing and later reopening a saved User Smart Filter evaluates a fresh generation; the filter persists its criteria, exact field dependency and comparison mode under ADR 0041, never duplicate memberships or a durable result snapshot. This preserves stable inspection while ensuring deliberate refresh sees current library state.

ADR 0449 permits session-only group collapse without changing this frozen
generation and prohibits persistent ignored/resolved result state. Only an
explicit saved filter criterion may narrow a later evaluation.

ADR 0452 applies the same complete-generation and explicit-refresh boundary to
Distinct Text Value Browser pages and counts, without making that browser a
Duplicate Text Finding Session or storing either result snapshot.
