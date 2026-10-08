# Asset Export Admission Uses Non-Preemptive Task Fair Rotation

Multiple confirmed export tasks can compete for the same bounded lanes and media resources. Draining one task completely can starve later tasks, while newest-first or manual priority invites unstable completion promises. Admission therefore uses stable task fairness without interrupting work already in a commit boundary.

**Asset Export Task Fair Rotation** is a stable non-preemptive ring. A newly confirmed task joins the tail. After one commit unit is admitted from an eligible task, the next admission opportunity starts from the next eligible task. A task-internal variant or manual-retry preference chooses that task's candidate only after the task receives its turn. Running, publication, and recovery units are never preempted.

A paused, retry-delayed, conflict/recovery-blocked, or resource/volume-waiting task does not hold the rotation head and accumulates no banked turns. It remains in the ring for reconsideration when evidence changes. When only one task is eligible, it may fill all currently proven safe capacity. Disjoint-volume concurrency may admit several tasks, and each new admission advances fairness independently. Version one exposes Pause/Resume but no manual task ordering or priority slider.

A confirmed ADR 0397 task freezes **Compatible Export Variant Priority**. Within its own turn, otherwise equally eligible units prefer the earlier variant, but lanes, resource gates, pressure, and safe intermediate reuse can change actual dispatch or completion order. The UI keeps reviewed priority visible and explains waiting reasons rather than presenting observed completion order as a guarantee.

Automatic-retry delay reserves no lane, resource slot, or queue head. After delay and current-evidence validation, the placement returns at its original frozen variant priority. Explicit Retry Asset Export Placements gives freshly preflighted selected placements preference over ordinary unstarted placements only inside the same task; it grants no cross-task priority and never preempts active work.

ADR 0390 owns physical-volume lanes, the Media Processing Resource Gate, and safe shared intermediates. ADR 0408 can reduce safe admission below the fair scheduler's available turns but cannot silently change the ring or create priority through resource pressure.
