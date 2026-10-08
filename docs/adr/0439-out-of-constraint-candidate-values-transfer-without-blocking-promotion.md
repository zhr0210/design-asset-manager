# Out-Of-Constraint Candidate Values Transfer Without Blocking Promotion

Custom fields are optional retrieval metadata, so a retained value that only violates a newer rule must not turn Candidate Promotion into mandatory cleanup. **Promotion Custom Field Revalidation** synchronously checks each current Candidate value against the current definition identity, type and validation-rule revision immediately before the Promotion transaction, regardless of ADR 0438 background revalidation coverage.

Conforming values transfer normally. An Out-of-Constraint Custom Field Value also transfers unchanged to the new Design Asset with its visible validation marker and current rule evidence. This is ADR 0416 transactional owner reassociation, not the new-value copying prohibited by ADR 0438: the Promoted Candidate does not retain another current copy. Promotion Sheet discloses the affected field count as a non-blocking warning, but Promotion never drops, clamps, converts, repairs or requires removal of the value; an archived-but-existing compatible definition likewise remains transferable under its inactive lifecycle.

Only a definition that is permanently missing, an incompatible definition/type identity, or a relevant value/definition change between revalidation and atomic commit creates a blocking field-aware Promotion conflict. Unresolved AI suggestions continue their ADR 0419 handoff and remain blocked from acceptance when out of constraint. Undo Promote restores the exact transferred value and its validation evidence to the Candidate through the bounded Promotion Snapshot, then evaluates its live marker against the current rule revision so a later rule change is neither ignored nor mistaken for a value edit.

An ADR 0445 Duplicate Text Value Finding is neither a validation failure nor a
relevant field conflict. Promotion may change which current owners appear in a
dynamic duplicate group, but never blocks, merges or rewrites the transferred
value on that basis.
ADR 0447 requires that reassociation and its duplicate projection generation to
show one current owner, never both Candidate and Design Asset occurrences.
