# Duplicate Text Findings Span Live Owner Types With Explicit Lifecycle Scope

A library-wide ADR 0445 Duplicate Text Value Finding must reveal a pending Candidate value that already occurs on a confirmed asset without collapsing their lifecycles. Its default **Duplicate Text Evaluation Scope** contains Active Candidates and non-deleted Design Assets for the exact field. All explicit query, collection and lifecycle criteria apply before grouping, and only keys with at least two current in-scope owners produce a finding. An explicit object-type criterion restricts comparison to that type; deleted Design Assets participate only with Include Deleted; Promoted Candidate Records and other Candidate History never participate. Out-of-Constraint current values remain included, while Missing remains excluded.

ADR 0045 still renders Candidate and Design Asset occurrences in separate Smart Filter Result Groups with their native selection and actions. Every row shows the complete duplicate-group count plus Candidate and Design Asset subtotals, and may open one read-only **Duplicate Text Comparison Panel** containing all current in-scope original forms and validation/lifecycle markers. Empty type groups follow ADR 0046, while the comparison panel grants no cross-lifecycle batch, merge, edit or identity authority.

Candidate Promotion and Undo Promote reassociate the current value between owner identities inside the existing atomic transaction. One query/projection generation therefore contains either the Active Candidate occurrence or the resulting Design Asset occurrence, never both; a lagging derived projection is marked stale and refreshed rather than double-counted. Archiving the field follows ADR 0420 and makes the dependent finding inactive until the same definition returns, instead of continuing to group hidden values.

ADR 0448 keeps that complete one-owner generation stable inside an opened
Duplicate Text Finding Session. A newer generation is disclosed separately and
adopted only through explicit refresh, never spliced into the comparison panel
or native owner groups.
