# Custom Field Values Belong Only To Candidates And Design Assets

Custom fields must support metadata entry during capture/import review without turning every searchable library object into a generic record database. ADR 0415 Custom Field Definitions therefore accept values from exactly two owner classes: Asset Candidates and Design Assets.

Candidate values are optional authoritative candidate metadata and participate in Candidate Review filtering/search under the same definition/type rules as Design Asset values. **Custom Field Value Transfer** moves current conforming values and ADR 0439 preserved Out-of-Constraint values to the newly created Design Asset inside Candidate Promotion's transaction and Promotion Link boundary. The Promoted Candidate retains only the lightweight trace and bounded Promotion Snapshot needed by existing history/Undo Promote semantics; it does not remain a second current owner of the transferred values.

ADR 0447 Duplicate Text Evaluation Scope may compare current values from both
allowed owner classes. Promotion/Undo changes the counted owner atomically;
history evidence never becomes another comparison occurrence.

Promotion synchronously revalidates every current value against the current definition identity, type and rule revision. A value that merely fails a restrictive current rule transfers unchanged with its Out-of-Constraint marker and does not block Promotion; a permanently missing definition, incompatible identity/type or relevant concurrent change follows field-aware conflict review rather than silently dropping, coercing or duplicating the value. Short-lived Undo Promote restores the exact values and bounded validation evidence with the Candidate under the existing Promotion Reversal boundary, then evaluates live validity against the current rule; after that window, Candidate History does not retain a second copy of current values.

Collection Groups, Asset Collections, Asset Sources, Tags, Smart Filters and other searchable objects do not carry Custom Field Values. Their own names, descriptions, relationships, criteria and lifecycle remain authoritative. This avoids a universal entity-property system while preserving structured metadata where users actually manage source candidates and confirmed assets.

An ADR 0465 Custom Field Edit Draft, including ADR 0454 Text and ADR 0462
Number specializations, is not a third value-bearing owner or current Custom
Field Value. It remains non-authoritative until a revision-current commit
succeeds for its exact Candidate or Design Asset owner.

ADR 0465 device-local recovery does not change that ownership boundary. A
Recovered Custom Field Edit Draft, including ADR 0455 recovered Text, is still
uncommitted and cannot participate in search, filtering, export, Promotion or
backup before a normal commit.

ADR 0465 Custom Field Edit Undo Steps, including ADR 0456 Text steps, are
likewise not Custom Field Values or value history. Only a successful
revision-guarded Undo/Redo commit changes the one current value owned by the
exact Candidate or Design Asset.

ADR 0466 preserves the same owner boundary when several drafts resolve
together: fields for one Candidate or Design Asset commit atomically, while
different owners never become one global value transaction. A partial
cross-owner result changes only owner groups whose commits are proven.

ADR 0467 preserves that boundary during Undo/Redo. A compound manual step may
restore several typed fields for one exact owner atomically, but never combines
Candidates or Design Assets into one undo transaction or creates another
value-bearing owner.

ADR 0468 Remove Undo Step changes only the session stack. It neither changes
the Candidate or Design Asset's current values nor creates a value revision,
history owner, recovery record or portable deletion.

ADR 0457 Batch Text Edit Plan remains operation intent, not another value
owner. Each successful item changes only the exact selected Candidate's or
Design Asset's one current field value.

ADR 0458 Batch Text Edit Operation Records and device-local Batch Text Undo
Journals remain operational/recovery evidence, not additional value owners or
Custom Field Value history. Only a proven forward or Undo commit changes the
one current value.

ADR 0474 may initialize any core type only when a new value-owning Candidate or
non-Promotion Design Asset is authoritatively created. Promotion always
transfers the Candidate's exact typed value or Missing state and never treats
the new Design Asset identity as authority to apply a default again. ADR 0473
specializes that rule for Boolean.

ADR 0476 may initialize existing Missing values only on an explicit frozen set
of these same Candidate and Design Asset owners. Its batch plan, checkpoints
and Undo evidence remain operation authority rather than additional value
owners or a universal Custom Field Value history.

ADR 0478 narrows those classes to current Active Candidates and non-deleted
Design Assets in one active library. Promoted/history/cleanup/Trash records are
not current initialization owners, while original-file unavailability alone
does not remove an otherwise active Design Asset's library-metadata ownership.
