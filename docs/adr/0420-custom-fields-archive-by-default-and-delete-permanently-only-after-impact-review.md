# Custom Fields Archive By Default And Delete Permanently Only After Impact Review

Removing a library-owned Custom Field Definition must not make its existing metadata disappear through an ordinary cleanup action. The normal **Archive Custom Field** action therefore makes the definition inactive and restorable while retaining its definition, Candidate/Design Asset values and unresolved AI suggestions as portable library state.

An archived field accepts no new manual values or AI Value Suggestions and is hidden from ordinary Candidate/Design Asset Inspectors, search-condition creation and filter panels. It remains available in a dedicated archived-field management surface, stays in Full Library Backup and may be restored with the same definition identity and retained data.

ADR 0422 allows an archived display name to be reused but requires explicit name-conflict resolution before restoration can make two active definitions ambiguous.

**Permanent Delete Custom Field** is a separate high-risk action. Before confirmation, a trusted host-owned **Custom Field Deletion Impact Review** reports the affected Asset Candidate count, Design Asset count, current Custom Field Value count and unresolved suggestion count. Only the confirmed permanent-delete transaction removes the definition, all of its values and suggestions, and its active lexical/structured search projections; it never deletes an owner asset, original, unrelated metadata or analysis result.

ADR 0421 preserves Saved Search, User Smart Filter and Import Mapping Preset references by stable definition identity and owns their archived/missing repair behavior; this deletion lifecycle grants no silent name matching, criterion removal or cascading deletion.

An ADR 0447 Duplicate Text Value Finding follows that dependency lifecycle.
Archive removes the field from ordinary grouping and leaves a saved finding
inactive until the same identity is restored; it never scans retained hidden
values through another same-name field.

ADR 0432 separately governs the archive, permanent deletion and merge of one Select option without treating option removal as deletion of its owning Custom Field Definition.
