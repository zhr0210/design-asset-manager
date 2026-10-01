# Duplicate Text Values Are Filter Findings Not Uniqueness Constraints

Text metadata such as client codes or asset references may benefit from duplicate discovery, but library-wide uniqueness would turn optional organization into a transactional admission rule across Candidates, Design Assets, Promotion, concurrent writes and lifecycle scopes. Core Text Custom Fields therefore have no unique-value constraint. An equal value never blocks manual save, AI acceptance, import, migration or Candidate Promotion; creates no Out-of-Constraint state, Required Review or attention badge; and never causes automatic clearing, suffixing, merge or identity consolidation.

Advanced Filters instead provide a dynamic **Duplicate Text Value Finding** for one exact Custom Field Definition and current query/lifecycle scope. The user explicitly selects a **Duplicate Text Comparison Mode** of Exact, Case-Insensitive or Normalized; ADR 0446 defines their portable versioned derived keys without changing stored Text, while ADR 0447 defines the cross-owner lifecycle scope and separate result presentation. Results group every current in-scope Candidate/Design Asset occurrence that shares a key, remain advisory and can be saved as an ADR 0041 User Smart Filter under ADR 0042's library-wide default. Missing values do not form a duplicate group, while whitespace-only present values participate normally.

“Dynamic” means that a new evaluation reflects current state, not that rows
mutate while being inspected. ADR 0448 binds each opened finding session to one
complete generation until explicit refresh and makes saved filters recompute on
their next open. ADR 0449 gives those query results no hidden resolution,
suppression or Review Signal lifecycle; reusable narrowing is expressed only as
visible filter criteria.

This finding is not ADR 0014's content-oriented Duplicate Signal and supplies no asset-identity, source-equivalence or deletion evidence. Cross-library discovery never infers field equivalence from names or claims global uniqueness; if compatible field evidence is explicitly available in a future cross-library query, matching occurrences remain library-labelled advisory results only.
