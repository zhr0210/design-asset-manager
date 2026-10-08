# Safe Stop And Quit Uses One Bounded Deadline And Exact Startup Reconciliation

Unbounded shutdown can freeze application exit, while an immediate forced exit can leave publication, replacement, or recovery work ambiguous. The application therefore treats graceful quit and later reconciliation as one evidence-preserving lifecycle boundary rather than promising that every queued task will finish.

If any subsystem has work in flight, Quit presents one path-free aggregate confirmation with **Safe Stop And Quit** as the recommended action, plus Open Design Asset Manager and Cancel. It offers neither Force Quit nor Finish All Then Quit. Acceptance starts one application-wide maximum normal deadline of 30 seconds, stops new admission across all subsystems, and projects aggregate Safely Quitting status through the ADR 0174 Application Status Center.

ADR 0465 Unsaved Custom Field Changes Gate runs before Safe Stop And Quit may
begin. Protected Custom Field Draft Recovery, including ADR 0455 Text recovery,
cannot substitute for Save, Discard or Stay during a normal close or quit; only
an actually unclean termination invokes recovered draft handling on the next
launch.
Under ADR 0466, Safe Stop And Quit does not begin after a partial multi-draft
resolution. The gate remains open until every affected draft is saved or
explicitly discarded.

Within that single deadline, interruptible work reaches its governed atomic boundary, commits only complete evidence, checkpoints durable state, and shuts down managed child processes. At the deadline, children that the application is permitted to terminate are terminated and the host exits. Safely incomplete work becomes Paused or Waiting; any unit that may have crossed a publication, replacement, or recovery boundary becomes **Startup Reconciliation Required**. Partial output is never reported as complete. Operating-system shutdown, logout, and update restart apply the same policy best-effort within whatever shorter time is available.

The next launch remains usable after normal host initialization. **Startup Reconciliation Isolation** blocks only new or resumed work sharing the unresolved unit's exact source, destination, physical-volume publication boundary, or governed runtime. Unaffected libraries and non-conflicting work remain eligible. Background reconciliation may record only evidence-proven completion or a proven safe Paused/Waiting state; ambiguity routes to the owning operation's recovery surface and never authorizes automatic rerun, overwrite, restore, deletion, or a manufactured terminal result.

Startup opens no modal and performs no automatic navigation. Application Status Center and the owning task expose aggregate Startup Recovery Attention and an explicit **Review Startup Recovery** route. Evidence-Proven Complete and Safely Paused outcomes are read-only; an Ambiguous item exposes only freshly validated actions owned by that operation. Deferring review changes presentation only and preserves exact isolation, evidence, and attention. A relevant evidence change may trigger a bounded read-only recheck but no destructive action or automatic continuation.

Unavailable exact evidence produces **Waiting For Recovery Evidence**, not failure or resolution. Minimal journals, receipts, and operation-owned staging required to determine the outcome are **Startup Recovery Evidence**, not cache: TTL, LRU, storage pressure, settings reset, and activity-history expiry cannot remove them. Replaceable previews, analysis proxies, and reproducible inputs do not inherit that retention. Evidence is released only after a proven terminal or safely paused state, or through the owning operation's separately governed recovery flow.

ADR 0458 Batch Text Edit checkpoints at its per-owner boundary. On restart it
reconciles operation effect markers with the protected device-local Undo
journal, keeps remaining work Paused and requires an explicit Resume, Cancel
Remaining or evidence-qualified Undo Completed choice rather than automatically
continuing metadata writes.

ADR 0168 supplies durable AI intent reconciliation, ADR 0388 applies these boundaries to Asset Export, ADR 0403 governs safe release of rebuildable recovery staging, and ADR 0401 governs the minimal terminal markers and anti-replay evidence that may remain after visible activity history expires. This ADR defines target lifecycle semantics; it does not claim the current Electron lifecycle already implements them.
