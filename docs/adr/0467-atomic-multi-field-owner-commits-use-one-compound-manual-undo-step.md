# Atomic Multi-Field Owner Commits Use One Compound Manual Undo Step

ADR 0466 commits every selected Save field for one Candidate or Design Asset in
one atomic transaction. That transaction therefore creates exactly one
**Compound Custom Field Edit Undo Step**, not one independently reversible step
per field. The compound step remains bound to one library and one owner and
contains the frozen ordered field identities and types plus each field's exact
previous value-or-Missing state, committed typed value and resulting revision.
It enters the same ADR 0465 session-only Custom Field Edit Undo Stack and is not
a Batch Undo record or durable value history.

A single-field manual commit continues to create one ordinary Custom Field Edit
Undo Step. A successfully committed multi-field owner group creates its
compound step only after the complete transaction is proven committed.
Explicitly discarded drafts contribute no delta; an owner group containing only
discards creates no step. In ADR 0466 cross-owner execution, every successfully
committed owner contributes one ordinary or compound step in actual commit
order. Failed and unstarted owners contribute none, so global Undo reverses the
last proven owner commit first even after a partial resolution result.

When the compound step is newest and no active draft owns the shortcut, Undo
identifies the owner and affected field count/types before execution. Trusted
validation re-resolves the owner, every field definition, current validation
rules and every committed revision. Only if all deltas remain eligible does one
transaction restore all previous value-or-Missing states and create the
corresponding authoritative revisions. Drift, missing identity, incompatible
rules or any other ineligible delta makes the entire compound step unavailable
or routes the complete group to ADR 0097 field-aware review. Undo never restores
only the eligible fields, splits the step, skips a field or falls through to an
older stack entry.

Redo is likewise group-atomic. It is available only while every exact
Undo-produced revision remains current and the redo branch has not been
replaced by a later manual commit. One transaction restores every committed
typed value or none. A subsequent drift blocks the complete Redo rather than
replaying a subset.

A compound step containing Text and another type is one cross-type stack entry,
not parallel Text and non-Text steps. A type-filtered history projection may
show that the compound step contains a type, but it cannot offer type-only Undo.
The memory guard expires or removes the complete compound step and never splits
its deltas. ADR 0468 provides the only explicit path for removing a
drift-blocked newest compound step and removes it as a whole. Exact stack
memory/count limits and oversized-step preflight follow ADR 0469.
