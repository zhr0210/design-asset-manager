# Asset Export Pause Cancel And Retry Stop Before Publication

Asset Export exposes **Pause Asset Export** and **Cancel Remaining Asset Export**
as different user intents. Both durably stop dispatch of new ADR 0387 Asset
Export Commit Units, but pause preserves safely resumable work while cancel ends
the uncommitted remainder. Neither action reverses, removes, repeats or hides a
successfully published user-owned output, and neither turns a progressively
committed Export Set into a batch rollback transaction.

Pause is observed by an in-progress placement only at a proven safe checkpoint
before final-path publication begins. A checkpoint-bound source copy may stop
with its exact attempt-owned staging retained; a non-resumable encoder may stop
only after its process/output is reconciled and any invalid incomplete staging
is safely removed. The task reports retained staging bytes and destination
capacity impact. **Resume Asset Export** is always explicit and first
revalidates the current source generation, recipe/capability, staging,
destination, conflict decisions, permissions, capacity and paths; it never
publishes merely because bytes survived a pause.

Cancel marks every unstarted placement cancelled and asks current
pre-publication work to stop at the same safe checkpoint. It removes only exact
staging proven to belong to that cancelled attempt. Failed or unprovable staging
cleanup becomes operation-scoped attention rather than a claimed cancellation.
A placement already published remains successful. A placement whose atomic
publication call has begun must settle into proven success, failure or
publication reconciliation, while ADR 0386 replacement that has begun moving
an occupant to operating-system trash must settle through replacement recovery.
Cancellation cannot dismiss either boundary or restore/replace files by guess.

Application exit, crash, forced termination, destination disconnection and
restart do not silently resume copying or encoding. Startup first reconciles
every checkpoint, staging artifact and possibly published final path. Safe
unfinished work returns as paused with an explicit Resume or Cancel choice;
ambiguous publication/replacement remains recovery-required. A publication
proven completed during interruption is recorded as success, not repeated, and
an accepted pre-exit cancel request remains durable so queued work is not later
dispatched. Reconciliation does not block the application or every export:
ADR 0402 Startup Reconciliation Isolation holds only placements that share the
unresolved source, destination path or physical-volume publication boundary.
Disjoint libraries, sources, destinations and volume boundaries remain usable.
Unresolved evidence makes the owning visual recovery surface available through
ADR 0402 Review Startup Recovery but does not open it automatically. It never
causes an automatic re-encode, copy, publication, replacement, restore or
deletion. Closing or deferring review preserves the exact source, destination
and volume-boundary isolation. Reconnection of the same proven destination
volume may trigger a read-only recheck, but not automatic export continuation.
While that volume or another required evidence source is unavailable, the
placement is Waiting For Recovery Evidence. Its checkpoint, receipts and only
the staging required to reconcile publication/replacement remain operational
recovery state rather than cache and are accounted in Storage Management.
Release Safely Rebuildable Recovery Staging is available only when fresh proof
establishes that the exact placement staging is unpublished, attempt-owned,
outside replacement and no longer needed for outcome reconciliation. It removes
only that staging, keeps the checkpoint/receipt, marks the placement Safely
Paused Without Staging and requires explicit resume to re-encode or recopy from
the beginning after full current-evidence preflight. Any ambiguity disables it.
A Recovery Staging Release Batch may include independently eligible placements
from one or more export tasks, but each placement repeats this proof and commits
its staging release independently. One changed placement is excluded without
releasing it, rolling back earlier releases or stopping unrelated eligible
placements.
Cancel Remaining Recovery Staging Releases stops new placement-release dispatch
without cancelling or resuming the underlying export. A current removal settles
or becomes reconciliation-required; unstarted placements retain their staging,
checkpoint and recovery state as Cancelled Before Release. Restart reconciles
only a possibly in-flight removal and never resumes the batch.
For compound or multi-file placement staging, the release journal preserves the
opaque expected-member set and per-member outcomes. Restart classifies proven
all-absent as Released, proven wholly intact/unchanged as Release Failed, and a
mixed or unassessable set as Staging Release Reconciliation Required. Complete
Remaining Recovery Staging Release may remove only freshly proven safe remaining
members; no partial staging resumes encoding/copying and no absent member is
reconstructed.
Multiple such placements may appear in one filterable/sortable Staging Release
Reconciliation View, but every Complete Remaining action is item-scoped and
separately confirmed. The view has no multi-select or Select All. A placement
re-proven wholly intact becomes Release Failed and may join a later ordinary
batch only through new explicit selection.
Complete Remaining Staging Release Review shows the exact path-free remaining
member count, proven bytes and full re-encode/recopy consequence for one
placement. It uses one explicit confirmation without typed-name/password
challenge, then repeats complete evidence validation. Drift removes no member,
refreshes the placement reason and consumes the confirmation.
Success merges Released After Reconciliation into the original batch item,
preserves the interruption, records the placement Safely Paused Without Staging
and adds only proven reclaimed bytes. It resolves that placement's startup and
batch attention without creating a new history record, notification or retry
attempt.
If completion fails, the same placement records one path-free Recovery Staging
Completion Attempt with time, outcome, current member counts/bytes and typed
reason. It remains reconciliation-required or waiting. Try Complete Remaining
Staging Release Again appears only after fresh read-only proof and requires a
new confirmation; attempts are visible and manually unbounded but never enter
Batch/Asset Export retry budgets and never start automatically.

Closing the last window is not application exit only when ADR 0409 Continue
Asset Export After Closing The Window is enabled and the normal platform
lifecycle retains a discoverable host process. ADR 0402 Safe Stop And Quit
always stops new admission, brings active work to the safe boundary defined
above and terminates the host within the shared 30-second maximum after
required checkpoint/reconciliation handling; no export worker continues as a
daemon or independent service. At that deadline, an unstarted or proven safely
incomplete placement persists as Paused or Waiting, while a placement whose
publication or replacement outcome is uncertain becomes Startup Reconciliation
Required. Neither state is falsely reported as success or cancellation.

**Asset Export Automatic Retry** applies only to a classified transient source
read, exact-copy, encoder-process, attempt-owned staging write or complete-
verification I/O failure before publication. One placement receives at most
two automatic retries after its initial attempt, for three total attempts, with
bounded increasing delay. Every attempt proves unchanged Design Asset and
Source Content Generation, export mode/recipe, capability/encoder identity,
destination boundary, final-name plan and staging ownership. Waiting, pause,
restart reconciliation or resuming one unchanged verified checkpoint does not
consume or reset the retry budget.

Automatic-retry backoff is a non-running **Waiting For Automatic Retry** state.
It retains no Physical Volume File Lane or Media Processing Resource Gate
admission and never blocks otherwise eligible placements, including later ADR
0397 variants. When the delay expires, the placement first revalidates the
required evidence and then rejoins admission at its frozen Compatible Export
Variant Priority; it does not preempt or interrupt a commit unit that is already
running. A task-wide Pause or Cancel Remaining request still governs the
waiting placement and cannot be bypassed by expiry of its retry delay.

An Original Asset Export may resume a proven copy checkpoint without trusting
unverified trailing bytes. A Compatible Export retry never appends to or
publishes an incomplete/invalid encoder result: it removes only the failed
attempt's proven staging and regenerates the complete placement before full
validation. A deterministic encoder rejection, repeatedly reproducible invalid
output or capability-declared unsupported transformation is not classified as
transient merely to obtain more attempts. Compound and other multi-file
placements retry/reconcile as one complete placement, never per member.

Destination conflict, permission denial, insufficient capacity, unavailable
volume, source/recipe/capability/encoder drift, deterministic encoding failure,
invalid output, cancellation, publication, replacement, operating-system
trash, restore, recovery or any ambiguous operation that may already have
changed a user path never retries automatically. These outcomes pause, fail,
return to current review or enter recovery under their own truthful state. In
particular, no retry automatically repeats a destructive replacement choice or
generates a new unique name after the reviewed name becomes occupied.

**Retry Asset Export Placements** is an explicit result action for user-selected
failed or cancelled placements that remain outside conflict/recovery and are
currently safe to try. It performs a fresh plan and destination preflight,
preserves all earlier attempt/cancellation history and merges the new outcome
into the same task result. Changed source, recipe, output name, placement,
capability or destination returns to review rather than executing stale intent.
Successful placements are excluded and never regenerated; unresolved conflict
or recovery placements must resolve their existing state before becoming
ordinary retry candidates. Manual retry does not reset the exhausted automatic-
retry budget. After successful fresh preflight, the selected retry placements
are preferred over the same task's ordinary unstarted placements. This is a
task-local waiting preference only: it never interrupts running work, crosses a
publication or recovery boundary, bypasses current lane/resource admission, or
elevates the entire task ahead of another confirmed Asset Export task.

ADR 0389 separately defines reviewed unique-suffix derivation. Exact
physical-volume and media scheduling follows ADR 0390. Export Set root cleanup
follows ADR 0391; activity/result/receipt retention follows ADR 0392. The current
application has no complete Asset Export pause, cancellation, retry or resume
coordinator. This ADR records target architecture only and creates, reads,
copies, renders, exports, stages, writes, publishes, retries, rewrites,
replaces, trashes, restores, renames, moves, deletes or changes no runtime/user
file, credential, sidecar, directory, database, cache, backup, metadata value,
analysis result, source relationship, public IPC, database schema or AI Worker
API.
