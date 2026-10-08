# Existing Missing Custom Field Values Initialize Through A Reviewed Frozen Batch

Applying defaults or common metadata to existing owners is a value-writing
operation, not a schema edit. **Missing Custom Field Initialization Plan** is
therefore a Reviewed Batch Action over an explicit current selection, one
complete generation of the current stable filter result, or an explicit
library-wide scope. It may include one or more active Custom Field Definitions.
For each selected field the user chooses the exact current Static Custom Field
Default snapshot or supplies one exact type-valid assignment; no field silently
inherits a default merely because it exists.

Before confirmation, trusted planning freezes the exact Candidate/Design Asset
owner identities, scope generation, selected fields, assignment source and
typed values, definition/default/rule/option revisions and every base value
revision. Review reports per field and owner type: eligible Missing assignments,
present-value exclusions, Out-of-Constraint present-value exclusions, unchanged
owners, validation failures and current conflicts, plus bounded representative
results without claiming renderer materialization of the complete plan. A
disabled, Suspended or Ineligible default is unavailable as an assignment
source, but the user may supply another currently valid explicit value.

Only a field proven Missing at planning and commit time is writable. Present
conforming or Out-of-Constraint values are excluded and never cleared,
normalized, merged or overwritten. Every selected eligible field for one owner
forms one atomic owner group: immediately before commit, trusted execution
revalidates the owner lifecycle, every field identity/type/rule/option revision,
each exact Missing base revision and every frozen assignment. One drifted member
makes the complete owner group Conflict and writes none of it. Different owners
commit independently in frozen order, so later conflict, failure, exclusion,
pause or cancellation preserves earlier proven owner commits and produces a
truthful partial result rather than a false library-wide transaction.

The operation uses ADR 0096 ordinary batch-operation conflict guards, not the
schema-maintenance lane. Large plans are durable, checkpointed and resumable at
owner boundaries. Pause admits no next owner after the current owner commits or
rolls back; Cancel Remaining affects only unstarted owners. Unexpected exit or
Library Switch checkpoints and leaves the operation Paused rather than
auto-resuming. Resume revalidates the exact library instance and frozen plan.
New owners or owners entering the filter after confirmation never join the
operation.

Any definition, validation, option or selected-default revision change before
confirmation invalidates the complete plan and requires fresh planning. After
confirmation, the frozen typed assignments never change to follow a newer
default; affected owner groups instead revalidate and become Conflict when
current rules or identities no longer permit the assignment. Plugins, AI and
import mappings cannot alter the frozen scope or plan after user confirmation.

The library-bound active operation record stores only the protected
operation-authority detail needed to resume: frozen assignments, opaque owner/
field identities, base revisions, checkpoints and commit-effect markers. It is
excluded from Full Library Backup, search, export, Offline Library Catalog,
plugins, logs, telemetry and ordinary long-term history. Terminal compaction
produces an ADR 0086 lightweight result with aggregate outcome/reason classes.

Operation-scoped Undo covers proven successful owner groups only and never
creates ADR 0465 manual Undo entries. Because every previous state was proven
Missing, Undo needs no previous value payload: it revalidates each exact current
effect/revision and clears all fields from that owner group back to Missing in
one transaction or none. Drifted groups are excluded or conflicted without
overwrite, and other successful groups may still undo. The terminal result,
effect evidence and Undo eligibility share the ordinary Reviewed Batch Action
retention window; clearing or expiry ends Undo without changing current values.
ADR 0477 binds active recovery and effect authority to the exact Local Library
Instance, permits explicit continuation from another compatible exclusive
device, and requires remaining work to become terminal before Undo can begin.
ADR 0478 limits every scope form to current live value owners in one active
library, treats source-byte availability as independent from metadata
eligibility, and never follows lifecycle transitions to a replacement owner.
ADR 0479 permits only manual, evidence-proven retry of transient uncommitted
owner groups while the complete original frozen plan remains current; every
other failure requires review, recovery or a new plan.
ADR 0480 keeps that forward recovery open only until trusted Undo admission
durably closes all remaining Retry authority before the first reverse commit.
ADR 0481 starts one shared default-30-day result, Retry and Undo window at first
terminal reconciliation and never extends it through later actions or devices.
