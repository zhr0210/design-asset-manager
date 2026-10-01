# Concurrent Metadata Conflicts Use Field-Aware Resolution

Concurrent metadata batch actions should resolve conflicts by field type rather
than using silent Last Writer Wins everywhere. Additive metadata such as tags
and Collection Membership should use Additive Metadata Merge when safe. Single
value fields such as rating, caption, title, or explicit target collection
should enter Conflict Review Required when concurrent writes disagree, unless a
field is explicitly defined as low-risk, reversible, and safe to auto-merge.
This keeps low-risk metadata concurrency useful without silently discarding
user intent.

ADR 0417 Custom Field Types enter the same field-aware boundary. Their exact
scalar, option-set and future conversion/merge rules require explicit dependent
policy; type existence alone never authorizes silent Last Writer Wins, option
union or value coercion.

ADR 0426 applies this boundary to Custom Field Migration. A relevant source or
target change after confirmed preview skips only that owner into migration
conflict review; the migration task never overwrites the newer value or retries
the stale planned conversion as if no conflict occurred.

ADR 0465 applies the same boundary to every Stale Custom Field Edit Draft,
including ADR 0454 Text and ADR 0462 Number specializations. A draft bound to an
older value or definition revision cannot auto-commit on field exit or
overwrite the current value; it retains both intents for contextual field-aware
review.

ADR 0466 applies this boundary both before multi-draft resolution begins and
inside each per-owner transaction. Complete preflight prevents a known blocker
from producing any commit, while drift after earlier owner groups commit yields
a truthful partial result and retains the failed or unstarted drafts instead of
overwriting, rolling back proven earlier owners or silently skipping them.

ADR 0465 applies it again when the newest manual Custom Field Edit Undo Step no
longer matches the current owner, field, rule or value revision. Undo/Redo
cannot use a session snapshot as Last Writer Wins authority or fall through to
an older step; it enters contextual review or becomes unavailable.

ADR 0467 applies that rule to every delta in a Compound Custom Field Edit Undo
Step. One ineligible field blocks the complete same-owner Undo/Redo transaction;
conflict review may explain every affected field but cannot partially replay,
split or silently shrink the compound step.

ADR 0468 keeps the resulting unavailable newest step as the stack boundary.
Read-only recheck cannot treat equal values or names as restored revision
evidence; only exact renewed eligibility re-enables Undo, while explicit
whole-step removal changes no metadata and alone permits the next older entry
to become newest.

ADR 0457 Batch Text Edit likewise skips any owner whose field or definition
drifts after review. Only homogeneous Text edit conflicts with the same action
and available resolution choices may enter ADR 0100 batch conflict resolution.

ADR 0479 never treats a Missing-initialization conflict as a retryable transient
failure. Present state, lifecycle or schema drift preserves the newer authority
and requires conflict review or a new frozen plan rather than replaying the old
assignment.

ADR 0359 applies the same field-aware distinction when an explicit Original
Metadata Writeback encounters a different value already stored in the source
file. Those source-byte conflicts are never Last Writer Wins: scalar fields
default to keeping the original value, while keywords recommend a reviewed
additive result without fuzzy or translated merging.
