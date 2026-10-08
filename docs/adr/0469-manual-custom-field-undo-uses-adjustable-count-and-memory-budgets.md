# Manual Custom Field Undo Uses Adjustable Count And Memory Budgets

The ADR 0465 session-only stack needs predictable usefulness without becoming
unbounded application memory. Each device therefore has a **Custom Field Edit
Undo Budget** with two simultaneous maximums: 200 complete steps and 64 MiB of
estimated retained memory by default. Advanced Settings may adjust the integer
step maximum from 20 through 1,000 and the memory maximum from 8 through 256
MiB. Each setting uses one synchronized exact numeric input and slider with its
unit, range and integer step; invalid typed input remains visible and cannot be
applied or silently clamped. These settings are device-local and grant no
portable-library retention.

The trusted main process conservatively estimates each ordinary or ADR 0467
compound step's complete retained in-memory payload, including exact typed
before/after values, identities, revisions and collection overhead. The
projection is an estimate rather than a promise about total process heap. A new
step that fits by itself may be admitted only after the required capacity and
whole-step eviction set are known. After the authoritative commit succeeds, the
step enters newest position and complete oldest entries are evicted until both
configured maximums are satisfied. Count and bytes never split, truncate or
partially retain a compound entry.

ADR 0468 Unavailable status does not pin memory. An unavailable entry may be
evicted when it becomes the oldest entry required to satisfy a count or byte
maximum, and an open review refreshes truthfully if that occurs. Capacity
eviction changes no value, revision, recovery record or history and creates no
Remove Undo Step decision. The UI may report only the number of expired Undo
opportunities and resulting current count/estimated bytes; it never exposes
their values through a toast, notification, log or telemetry.

Lowering either setting applies to the current active-library session only
after a review shows the number of complete oldest steps and estimated bytes
that would be lost. Cancellation preserves the current budget and stack.
Confirmed reduction evicts exactly the projected whole entries, then rechecks
the resulting totals; raising a limit never reconstructs previously evicted
evidence. Normal new-step eviction under an already accepted budget needs no
per-commit confirmation because the configured maximum is the user's standing
retention choice.

If one prospective ordinary or compound step exceeds the current byte maximum
by itself, no existing-entry eviction can make it admissible. Before any value
write or draft discard, trusted preflight opens an **Oversized Manual Undo
Review** showing the owner scope, single/compound field count and types,
estimated step MiB and current limit without reproducing private values. It
offers Increase Undo Memory Limit when the required whole-MiB setting is within
the 256 MiB maximum, Return To Editing with every draft preserved, or an
explicit Save Without Manual Undo choice. If the estimate exceeds 256 MiB,
increase is unavailable rather than silently exceeding the supported range.

ADR 0466 resolves every oversized owner group during complete zero-write
preflight before cross-owner execution starts. The reviewed choice is bound to
that exact owner group and estimate; evidence or size drift invalidates it.
Save Without Manual Undo creates no ordinary or compound stack entry and never
splits the group, spills typed values to disk, reuses protected draft recovery
as Undo, or waits until after commit to disclose the loss. ADR 0470 makes its
successful unrecorded commit a reviewed Manual Undo History Boundary: no stack
is cleared before proven success, and proven success clears the observable
older manual Undo/Redo timeline rather than allowing silent fallthrough.

ADR 0471 separately permits last-resort whole-entry reclamation below these
normal maximums only from fresh, platform-qualified Critical memory-pressure
evidence after safer disposable resources are insufficient. A configured
maximum remains a cap rather than a guaranteed reservation.
