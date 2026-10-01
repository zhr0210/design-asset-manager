# Missing Initialization Result Retry And Undo Share One Terminal Window

The first proven terminal reconciliation of a Missing Custom Field
Initialization Operation starts one **Missing Initialization Action Window**
using ADR 0087's user-configurable Reviewed Batch Action duration, defaulting to
30 days. Active, Paused or outcome-ambiguous operations do not start or lose
reconciliation authority through this clock. Unlike Custom Field Migration,
initialization has no required source-lifecycle disposition, so opening or
acknowledging the result is not a prerequisite for the deadline.

The terminal result detail, ADR 0479 Retry-Eligible failure evidence, successful
effect evidence for Undo, ADR 0480 direction and every executable Retry/Undo
action share the same original deadline. Manual retry, retry success, Undo
admission, partial Undo, result viewing, acknowledgement, application restart,
Library Switch or opening the exact instance on another compatible device does
not restart or extend it. A retry success joins the remaining Undo set only for
the time still left. The library-bound operation stores one authoritative
deadline so no device receives a fresh local window.

At the deadline, trusted execution admits no new Retry or Undo owner group. An
owner group already inside an atomic forward or reverse commit finishes or
rolls back at its normal boundary; later selected groups do not start. Required
outcome reconciliation may retain only the protected authority needed to prove
that in-flight group, but the action window remains expired and authorizes no
new mutation. As soon as that outcome is proven, executable owner/effect/failure
detail expires against the original deadline rather than receiving an
extension.

After terminal reconciliation and while no Retry, Undo or ambiguous outcome is
in flight, the user may confirm **Clear Missing Initialization Result And End
Actions**. Review discloses the currently Retry-Eligible count, still-current
Undo-eligible count, conflicts/exclusions and Forward Recovery Open or Missing
Initialization Undo Direction. Confirmation closes every remaining action and
deletes the same detailed authority that normal expiry would remove. It never
sets a field to Missing, retries an assignment, changes a current value,
resolves a conflict or creates a new window.

Normal expiry or confirmed early clearing removes owner identities, field and
assignment detail, per-owner outcomes, effect evidence, retry attempt detail
and executable intent. Current Custom Field Values remain authoritative. At
most an ADR 0087 value-free Pruned Batch Detail remains with the first terminal
time, scope and owner-class counts, aggregate forward/retry/Undo outcome
classes, and expired-versus-cleared disposition. It is not Resume, Retry, Undo,
Redo, backup, sync, search, plugin or reconstruction authority.
