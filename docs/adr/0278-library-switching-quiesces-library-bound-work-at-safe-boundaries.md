# Library Switching Quiesces Library-Bound Work At Safe Boundaries

A **Library Switch** preserves one active writable Local Library Instance by moving the outgoing library through **Library Quiescence** before releasing its Exclusive Library Lock. The application first performs every safe read-only availability, identity and compatibility preflight it can on the target so an obviously unavailable target does not pause useful work. It then stops new Library-Bound Work admissions and requires every admitted owner to declare an item, Analysis Unit, snapshot or transaction boundary at which its current write can commit, roll back, or persist a durable resumable checkpoint.

Checkpointable import, Progressive Reference Indexing, analysis, preview/index build and batch work pause at their nearest declared safe boundary. They preserve completed units, remaining scope, generation and typed waiting reason, release file/proxy/database pins not needed by the checkpoint, and never become cancelled, deleted, failed or successful merely because the user switches libraries. Work explicitly paused by the user remains user-paused; switch-paused eligible work resumes only when the same Local Library Instance becomes active again and fresh source, preference, capability and generation reconciliation still admits it.

Under ADR 0430, the Custom Field Migration Maintenance Lane stops admitting new items during Library Quiescence, lets its current item commit or roll back, and preserves the queued order and user-paused state. Same-library resumption revalidates the task before the next item is admitted.

ADR 0465 resolves pending Custom Field Edit Drafts before Library Switch can
proceed. After Save or Discard permits the transition, it clears the outgoing
library's session-only Custom Field Edit Undo Stack rather than checkpointing,
transferring or later resuming it; committed Custom Field Values are unchanged.
ADR 0466 requires every multi-draft owner group to resolve before switch
quiescence advances; a partial result keeps the outgoing library active and
retains failed or unstarted drafts. ADR 0467 compound steps clear only as whole
stack entries and are never split, checkpointed or transferred. Keeping an ADR
0468 unavailable step does not make it survive the outgoing session or block
the already-confirmed whole-stack clearing after draft resolution.

ADR 0458 Batch Text Edit reaches the next per-owner boundary, persists its
operation checkpoint and pauses remaining owners before the outgoing lock is
released. Its protected Undo journal stays on the initiating device; returning
to the exact library may resume only after operation, journal and live revision
evidence reconcile.

ADR 0477 Missing initialization also checkpoints at the next owner boundary,
but its frozen plan and prior-Missing effect evidence belong to the exact Local
Library Instance rather than the initiating device. A compatible device may
explicitly continue only after complete Library Open Inspection and exclusive
ownership; it never auto-resumes, and Undo first terminalizes all remaining
work so the old plan cannot later resume.

An owner already inside a non-interruptible atomic commit, migration, restore, backup-snapshot boundary or other rollback-governed write must finish that bounded unit or prove rollback before the switch can release write ownership. The switch surface reports the owning operation and whether it is finishing or rolling back, but provides no force-unlock, process kill, timeout-as-success or silent cancellation. Owner-specific Cancel remains available only when that owner's existing contract can safely roll back; inability to prove a terminal boundary keeps the current library active or enters its normal recovery contract rather than pretending to be quiescent.

Read-only search and inspection do not block switching. Application-scoped model, runtime, capability-pack or plugin downloads may continue only when they hold no outgoing-library path, database, source, preview, result or transaction pin and their completion commits no state into that library. A web capture, import download or other acquisition targeting the outgoing library remains Library-Bound Work even when its network transfer is performed by an application service.

After Library Quiescence, the application checkpoints device-local workspace state, releases the outgoing Exclusive Library Lock, performs the complete ADR 0276 target inspection, obtains the target's write ownership and re-resolves the requested object identity before exposing writable actions. It never holds normal write ownership for both libraries. If target activation loses a race or fails after outgoing release, it first attempts evidence-safe reacquisition and restoration of the outgoing library; otherwise it returns to Library Start or the applicable Library Recovery Mode without creating an empty replacement or writing through an ambiguous owner.

The initiating Ephemeral Search Session remains stable through pause, wait and successful activation. Returning to the prior library restores its workspace checkpoint and reconciles switch-paused work; manually paused/cancelled state remains unchanged, stale work is superseded under its owner policy, and completed results are never discarded or recommitted. Cancelling a switch before write ownership is released restores outgoing admissions and reverses only switch-induced pauses at their safe boundaries.

Forgetting the active Library Registration uses the same quiescence and lock-release boundary before ADR 0279 removes device-local registration state. It never treats registration removal as permission to cancel work, delete library content, or release an unproven writer.

The current implementation owns one application-global SQLite connection and library path, and its services do not expose per-library write ownership, Library-Bound Work classification, admission quiescence, switch checkpoints or target activation rollback. This ADR records target architecture only and pauses, resumes, opens or writes no runtime task, database, user asset, model or cache and changes no public IPC, schema or AI Worker API.
