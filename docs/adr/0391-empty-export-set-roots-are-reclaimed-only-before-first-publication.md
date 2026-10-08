# Empty Export Set Roots Are Reclaimed Only Before First Publication

When ADR 0384 plans a multi-file Asset Export, the application may exclusively
create one empty **Provisional Export Set Directory** under the reviewed parent
after confirmation. It is a task-bound container, not yet the user-owned Export
Set Directory described by the glossary, and its creation is not export success.
It contains no application manifest, source path, library metadata or hidden
claim that would make an empty folder appear to be a completed export.

The provisional directory crosses the **Export Set Ownership Boundary** when
the first ADR 0387 Asset Export Commit Unit is proven published anywhere inside
it. At that instant it becomes an ordinary user-owned **Export Set Directory**.
No later failure, cancellation, retry exhaustion, result expiry, cache cleanup,
settings reset, application uninstall or observation that it is currently empty
returns it to application ownership or authorizes automatic deletion.

Collection hierarchy and dedicated asset subdirectories are created lazily.
The publisher does not precreate the complete reviewed tree. A missing directory
chain is prepared only as part of the affected placement's publication plan so
the complete child result and required new branch appear together through the
safe destination semantics from ADR 0387. A Compound or multi-file asset still
publishes only as its complete directory, and speculative empty collection or
asset directories are never created merely to show future progress.

After Cancel Remaining Asset Export or a task state in which every placement is
terminal without success, the application may make one **Empty Export Set Root
Reclaim** attempt only when all of the following are proven: no placement ever
crossed the ownership boundary; no staging, paused/resumable checkpoint,
publication/replacement recovery or unresolved destructive obligation remains;
the exact directory identity is the one exclusively created for this task; its
reviewed parent and path have not been redirected or replaced; and the directory
is currently empty under safe non-following inspection.

Any file, subdirectory, link, package, filesystem metadata entry visible as a
child, user/external modification, changed directory identity, inaccessible
state or ambiguous emptiness preserves the directory. Reclaim never recursively
deletes, follows indirection, removes an unknown child, cleans a parent, or
guesses that a similarly named folder is task-owned. A directory that existed
before the task, including an empty directory explicitly adopted through ADR
0386 review, is never provisional and is never eligible for this action.

If the one reclaim attempt succeeds, a later manual retry may freshly recreate
a new provisional root only after the destination and complete plan are reviewed
again. If removal fails or cannot be proven, the task reports **Empty Export Set
Directory Retained** with a Reveal action and performs no automatic retry loop,
startup deletion, background cleanup or pressure-driven reclamation. This
non-destructive residue does not change placement outcomes or become
publication/replacement recovery.

Single-file Save As has no Export Set root and is unaffected. Asset Export
Staging remains separately operation-owned under ADR 0387 and cannot be placed
inside, mistaken for or retained by a user-owned Export Set Directory merely to
avoid its stricter reconciliation rules. ADR 0392 activity/result/receipt
retention cannot extend cleanup authority across the ownership boundary.

The current application has no complete Asset Export root planner, ownership
boundary or safe empty-root receipt. This ADR records target architecture only
and creates, inspects, reclaims, reads, copies, renders, exports, stages, writes,
publishes, retries, rewrites, replaces, trashes, restores, renames, moves,
deletes or changes no runtime/user file, credential, sidecar, directory,
database, cache, model, backup, metadata value, analysis result, source
relationship, public IPC, database schema or AI Worker API.
