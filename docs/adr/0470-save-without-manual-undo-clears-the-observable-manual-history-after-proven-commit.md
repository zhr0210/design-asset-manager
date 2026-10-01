# Save Without Manual Undo Clears The Observable Manual History After Proven Commit

An authoritative manual save that creates no Undo entry cannot leave older
entries apparently reachable, because the next Undo would silently skip the
newest change and act on an earlier state. **Save Without Manual Undo** therefore
creates a **Manual Undo History Boundary** for the active library session. Its
trusted pre-commit confirmation states both that the prospective save cannot be
undone and that a successful save will end every currently retained manual Undo
and Redo opportunity. It shows only aggregate Undo/Redo entry counts and
estimated retained memory, not previous/current values or other private
content.

The confirmation changes nothing by itself. Return To Editing preserves all
drafts and the complete stack. A failed or unproven commit also preserves the
pre-existing stack. Only after the exact owner transaction is authoritatively
proven committed does trusted finalization clear every older manual Undo and
Redo entry as one indivisible in-memory transition, before the application
exposes commit success or accepts another manual Undo/Redo command. No durable
barrier entry remains, no later shortcut may cross the boundary, and cleared
evidence cannot be reconstructed by raising the ADR 0469 budget.
ADR 0471 critical-pressure reclamation may also remove older complete entries,
but it neither creates nor crosses a Manual Undo History Boundary.

For an ADR 0466 multi-owner resolution, complete zero-write preflight shows the
boundary consequence at each exact owner position in the frozen execution
order. A proven no-Undo owner clears manual history accumulated before it,
including recordable owner steps committed earlier in the same plan. Later
recordable owners start a new chronological manual stack after that boundary.
If execution stops before a reviewed no-Undo owner commits, that owner's
boundary never occurs; if it stops afterward, the truthful partial result
reflects the already-applied boundary and any later proven entries. Evidence or
order drift invalidates the reviewed plan instead of moving the boundary.

This rule owns only ADR 0465 manual Custom Field Edit Undo/Redo for the active
library session. It does not clear, consume, cross or otherwise change the
operation-scoped Undo and recovery contracts for batch, AI, import, migration,
conflict or Promotion work. The boundary creates no portable history, Batch
Activity item, plugin event, private log or telemetry payload.
