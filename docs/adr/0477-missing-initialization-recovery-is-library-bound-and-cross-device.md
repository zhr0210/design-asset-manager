# Missing Initialization Recovery Is Library-Bound And Cross-Device

A confirmed Missing Custom Field Initialization Plan is a
**Library-Bound Missing Initialization Operation** attached to one exact Local
Library Instance, not to the device that confirmed it. Its frozen plan,
owner-boundary checkpoints, successful-effect markers and remaining-work state
are the complete recovery authority because ADR 0476 proves every writable
prior state was Missing; unlike ADR 0458 Batch Text Edit, no device-local prior
value journal is required. This exception applies only to Missing
initialization and does not make other batch operations cross-device.

Opening or reconnecting the same Local Library Instance on another compatible
device never auto-resumes the operation. ADR 0276 Library Open Inspection must
first prove the exact instance, operation-record integrity, supported operation
schema, all involved core field types and validation semantics, and the last
settled owner checkpoint. ADR 0278 must then establish exclusive write
ownership with no other admitted writer. Only a trusted operation surface may
offer explicit **Resume**, **Cancel Remaining**, or **Undo Completed** actions;
each action freshly revalidates the library, frozen plan, current owner/field
identities, rules, options, revisions and effect evidence before mutation.
ADR 0478 owner-lifecycle eligibility is part of that revalidation; recovery
never follows a Promotion Link or restores/substitutes an owner that left the
frozen live scope.

Resume continues the original frozen owner order without adding or substituting
owners. Cancel Remaining settles the current owner boundary and makes every
unstarted owner terminal without changing successful values. Undo Completed is
available directly only after the operation is terminal. If work remains, the
single explicit consequence is **Cancel Remaining And Undo Completed**: trusted
execution must first prove that no later owner can still be admitted and
terminalize all remaining work, then it may clear still-current successful
owner groups atomically back to Missing. If that terminal boundary cannot be
proven, Undo cannot start. An operation can therefore never undo completed
effects and later resume its old remaining scope.

A compatible device may perform that Undo because the library-bound effect
identity, result revision and proven prior-Missing state are sufficient. Each
owner group still succeeds as a whole or conflicts without overwrite; later
edits remain authoritative. No device exports, transfers, reconstructs or
guesses previous values, and no manual Custom Field Undo entry is created.

Authority follows only the same exact Local Library Instance, including a
verified relocation of that physical instance. It does not follow a copied
root, sibling restore, Offline Library Catalog, merge/sync payload or Full
Library Backup. A raw copy that duplicates the instance identity is blocked by
ADR 0279 Library Instance Identity Collision rather than choosing a copy on
which to continue. Because active operation detail is excluded from backup, a
restored backup may contain committed current values but cannot Resume, Cancel
or Undo the omitted operation.

A missing, corrupt, incomplete, ambiguous or unsupported operation record
authorizes no guessed repair. Inspection keeps the affected recovery surface
read-only or incompatible while preserving committed current values as
authoritative; unrelated compatible library work may continue only when its
conflict and write-ownership guards remain satisfied. Operation detail remains
protected library state excluded from search, export, backup, offline
projection, plugins, logs, telemetry and ordinary long-term history; other
devices receive only bounded aggregate status until the trusted operation view
has established authority.

ADR 0479 permits a compatible exclusive device to retry a proven transient,
uncommitted terminal owner group from that same library-bound authority. Missing
or ambiguous effect evidence remains recovery, never inferred Retry authority.
ADR 0480 makes the forward-versus-Undo direction transition part of that same
library-bound authority so another device cannot reopen Retry after reversal
has begun.
ADR 0481 likewise stores one original terminal action deadline in the exact
instance; changing device never restarts or extends it.
