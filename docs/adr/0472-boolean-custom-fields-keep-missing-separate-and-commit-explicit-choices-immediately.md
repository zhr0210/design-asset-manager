# Boolean Custom Fields Keep Missing Separate And Commit Explicit Choices Immediately

A Boolean Custom Field has exactly two present typed values, True and False.
**Boolean Custom Field State** is the user-visible distinction among present
True, present False and Missing, but Missing remains absence of a value rather
than a third Boolean value. Storage, import, export, filtering, migration,
conflict and Undo must never coerce Missing to False, infer a value from an
unchecked control or fabricate an implicit default. ADR 0473 separately permits
an explicitly enabled portable True/False definition default for future new
owners only; it does not change this state model.

The Inspector offers three explicit localized choices with identical semantics:
Not Set, Yes and No. The ordinary presentation is one accessible three-choice
segmented/radio control; constrained width may use an accessible dropdown
without changing value meaning or commit behavior. It does not use a two-state
switch, an indeterminate checkbox, repeated-click-to-clear behavior or
presentation labels as stored values. Choosing the already authoritative state
is a no-op.

Choosing another state is an immediate manual commit request, not a durable
Custom Field Edit Draft. The trusted host revalidates the exact library, owner,
field identity, Boolean type, rules and base value revision before writing
True, False or Clear-to-Missing. The renderer may show a bounded Pending state
for that exact field but cannot optimistically declare the value authoritative.
A stale, invalid, unavailable or failed request retains the prior state,
creates no Undo step or recovery record and surfaces the applicable contextual
reason instead of Last Writer Wins.

Every proven changed-state commit creates one ordinary ADR 0465 typed manual
Undo step with the exact previous Boolean value-or-Missing state. It follows the
same stack, budget, unavailability, history-boundary and critical-pressure rules
as other manual Custom Field commits. Batch changes, AI Value Suggestion
acceptance, import, migration, conflict resolution and Promotion retain their
separate operation contracts; this direct Inspector interaction neither creates
a Batch Activity item nor bypasses their review and provenance rules.
