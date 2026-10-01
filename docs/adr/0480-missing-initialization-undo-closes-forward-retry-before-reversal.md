# Missing Initialization Undo Closes Forward Retry Before Reversal

A terminal Missing initialization result begins **Forward Recovery Open**:
proven successful owner groups remain potentially Undo-eligible while ADR 0479
Retry-Eligible failures may still continue the original frozen intent. Retry
and Undo never execute concurrently. While a retry is in flight, Undo admission
waits for that owner group to settle; every retry success joins the same
successful-effect set that a later Undo Completed may revalidate and clear.

Undo Completed is an explicit irreversible direction change for that result,
not another action that coexists with forward recovery. Its review discloses
the still-current successful-group count, the currently Retry-Eligible count
that will be abandoned, conflicts and exclusions. Trusted preflight must prove
the terminal operation, exact Local Library Instance, exclusive ownership,
complete effect evidence and at least the authority needed to start reversal.
If preflight fails, Forward Recovery Open remains unchanged. On confirmed
admission, one durable **Missing Initialization Undo Direction** transition
first closes every remaining Retry Missing Initialization Failure authority and
then permits the first clear-to-Missing owner commit.

ADR 0477 Cancel Remaining And Undo Completed uses the same ordering: remaining
forward owners become terminal, all resulting or pre-existing retry eligibility
closes, and only then may Undo start. There is no force-cancellation of an
in-flight owner write and no interval in which the old plan can both retry a
failure and undo a success.

Undo continues to revalidate and commit successful owner groups independently.
A later edit, lifecycle change, unavailable owner, transient Undo failure or
other drift may leave some effects unchanged and produce a truthful partial
Undo result, but it never reopens old forward Retry authority, replays the
frozen assignment or changes the direction back. Failed and never-attempted
forward groups remain untouched. Any later desire to assign values again
requires a newly reviewed Missing Custom Field Initialization Plan; Redo is not
manufactured from the closed operation.

The direction transition and aggregate state are library-bound operation
authority under ADR 0477, so another compatible exclusive device observes and
continues the same direction rather than maintaining a device-local toggle.
Terminal history records that forward retry was closed and the aggregate Undo
outcome without retaining private assignments or creating manual Custom Field
Undo entries.

ADR 0481 bounds both directions by one deadline from first terminal
reconciliation. Undo admission and partial reversal receive only the remaining
window and never restart it.
