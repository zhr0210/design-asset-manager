# 布尔与缺失字段初始化：详细能力契约

本文承接原ADR中的细节，保留所有原数字、例外、状态和相互约束；[来源映射](../../checkpoints/documentation-rebuild-20261015/adr-migration.json)逐段核对。**有效要求不是当前交付声明，也不是本轮实施队列。** 现行已批准产品/设计在其明确替代范围内优先；不凭实现缺失判决定无效。

当前系统从[organization](../../subsystems/organization.md)进入；当前实际能力/版本见[CURRENT-STATE](../../handoff/CURRENT-STATE.md)，交互与视觉分别归[交互目录](../../design/README.md)/[DESIGN](../../../DESIGN.md)。详细条款按下面独立主题定位，不全量装入每次上下文。

## 主题导航

- [0478 · Missing Initialization Scope Freezes Current Live Value Owners](#adr-0478)
- [0479 · Missing Initialization Retries Only Proven Transient Uncommitted Failures](#adr-0479)
- [0480 · Missing Initialization Undo Closes Forward Retry Before Reversal](#adr-0480)
- [0481 · Missing Initialization Result Retry And Undo Share One Terminal Window](#adr-0481)

<a id="adr-0478"></a>

## 0478 · Missing Initialization Scope Freezes Current Live Value Owners

决定来源：[0478-missing-initialization-scope-freezes-current-live-value-owners.md](../../adr/0478-missing-initialization-scope-freezes-current-live-value-owners.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0478-p001"></a>

A Missing Custom Field Initialization Plan writes only one active Local Library
Instance and freezes a **Missing Initialization Owner Scope** from one of three
explicit sources. Current Selection uses the selected current owner identities
from the active result set; a Stable Filter uses one complete, immutable result
generation evaluated inside the active library; Library-Wide enumerates every
current Active Candidate and every non-deleted Design Asset in that library at
planning time. Candidate and Design Asset owners may coexist in one scope and
remain separately counted. A cross-library result surface never creates one
cross-library write plan, activates another library or schedules a later write;
the user must activate each library and create a separate plan there.

<a id="0478-p002"></a>

Only current value owners can enter the frozen operation. Promoted Candidate
Records, Candidate History, rejected or expired records in Capture Cleanup
History, hard-deleted records and Design Assets in Asset Trash are lifecycle
exclusions even when a search explicitly uses Include Deleted or the user
selects their visible placeholders. Review shows those exclusions instead of
silently dropping them or treating historical evidence as current metadata.
The user must restore the Candidate or Design Asset and create a fresh plan if
it should receive a value.

<a id="0478-p003"></a>

Original-file availability is not owner lifecycle. An otherwise active Design
Asset remains eligible when a referenced source, managed original, volume or
other source-byte dependency is offline, missing or under its normal recovery
state because Custom Field Values are authoritative library metadata. Source
availability alone neither excludes the owner nor creates a conflict; an
unproven owner identity, non-writable library boundary or owner-specific
authoritative conflict still blocks that owner under its existing recovery
contract.

<a id="0478-p004"></a>

Before confirmation, any owner-lifecycle or result-generation change that
would alter the reviewed membership invalidates the plan and requires a fresh
scope preview. Confirmation freezes exact identities and revisions. A later
Promotion, Reject, cleanup, Asset Trash transition, permanent deletion or other
loss of current editable-owner status makes only that frozen owner group
Conflict or Excluded at execution or Undo. Execution never follows a Promotion
Link, substitutes the resulting Design Asset, restores a deleted object, writes
history, or admits a newly created, restored or newly matching owner.

<a id="adr-0479"></a>

## 0479 · Missing Initialization Retries Only Proven Transient Uncommitted Failures

决定来源：[0479-missing-initialization-retries-only-proven-transient-uncommitted-failures.md](../../adr/0479-missing-initialization-retries-only-proven-transient-uncommitted-failures.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0479-p001"></a>

A failed Missing initialization owner group is retryable only when trusted
reconciliation proves both that no field in the atomic group committed and that
the failure was transient rather than a plan, identity, lifecycle, validation,
storage-authority or revision conflict. **Retry Missing Initialization
Failure** is an explicit manual action over one or more user-selected
Retry-Eligible owner groups; the product offers no automatic retry loop and no
undifferentiated Retry All that can absorb conflicts, exclusions or unknown
outcomes.

<a id="0479-p002"></a>

Immediately before each retry, trusted execution revalidates the exact Local
Library Instance, operation and failure-effect evidence, owner lifecycle, every
field identity/type/rule/option/default revision, frozen assignment and the
exact still-Missing base state for the complete original owner group. The group
retries with the original frozen values and commits all fields atomically or
none. Any Present field, owner/lifecycle change, definition or rule drift,
incompatible operation evidence, ambiguous prior outcome or other mismatch
reclassifies the complete group as Conflict, Excluded or Manual Recovery
Required without a write. Retry never shrinks the group, follows Promotion,
uses a newer default, overwrites a value or turns current equality into revision
authority.

<a id="0479-p003"></a>

Retry becomes available only from a terminal reconciled operation result.
Paused or unstarted owners remain Resume or Cancel Remaining work, not failed
retry members. A device that did not initiate the operation may retry after ADR
0477 proves the same exact library-bound authority and exclusive ownership;
there is no device-local previous-value dependency to transfer or reconstruct.
An infrastructure interruption whose write outcome is not yet proven enters
normal operation reconciliation and cannot be labelled transient merely to
unlock Retry.

<a id="0479-p004"></a>

ADR 0092's existing per-owner limit of three attempts applies inside the same
Unresolved Batch Result, with no simultaneous retry for one owner group. Users
may select any explicit subset of currently Retry-Eligible groups after
reviewing counts and reason classes, but cannot select ineligible rows through
a catch-all action. Each outcome merges into the original result under ADR
0091, preserving attempt count and latest outcome rather than creating a new
batch history entry or reopening the frozen scope. Exhaustion, conflict,
exclusion, acknowledgement or later repair never resets the old count; changed
intent or repaired non-transient state requires a newly reviewed Missing
Initialization Plan.

<a id="0479-p005"></a>

ADR 0480 closes every remaining Retry-Eligible group when trusted Undo
admission commits the result's reverse direction. A partial or failed Undo never
reopens this ADR's forward retry authority.
ADR 0481 additionally ends all not-yet-admitted Retry at the operation's
original shared action deadline without resetting that deadline after an
attempt.

<a id="adr-0480"></a>

## 0480 · Missing Initialization Undo Closes Forward Retry Before Reversal

决定来源：[0480-missing-initialization-undo-closes-forward-retry-before-reversal.md](../../adr/0480-missing-initialization-undo-closes-forward-retry-before-reversal.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0480-p001"></a>

A terminal Missing initialization result begins **Forward Recovery Open**:
proven successful owner groups remain potentially Undo-eligible while ADR 0479
Retry-Eligible failures may still continue the original frozen intent. Retry
and Undo never execute concurrently. While a retry is in flight, Undo admission
waits for that owner group to settle; every retry success joins the same
successful-effect set that a later Undo Completed may revalidate and clear.

<a id="0480-p002"></a>

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

<a id="0480-p003"></a>

ADR 0477 Cancel Remaining And Undo Completed uses the same ordering: remaining
forward owners become terminal, all resulting or pre-existing retry eligibility
closes, and only then may Undo start. There is no force-cancellation of an
in-flight owner write and no interval in which the old plan can both retry a
failure and undo a success.

<a id="0480-p004"></a>

Undo continues to revalidate and commit successful owner groups independently.
A later edit, lifecycle change, unavailable owner, transient Undo failure or
other drift may leave some effects unchanged and produce a truthful partial
Undo result, but it never reopens old forward Retry authority, replays the
frozen assignment or changes the direction back. Failed and never-attempted
forward groups remain untouched. Any later desire to assign values again
requires a newly reviewed Missing Custom Field Initialization Plan; Redo is not
manufactured from the closed operation.

<a id="0480-p005"></a>

The direction transition and aggregate state are library-bound operation
authority under ADR 0477, so another compatible exclusive device observes and
continues the same direction rather than maintaining a device-local toggle.
Terminal history records that forward retry was closed and the aggregate Undo
outcome without retaining private assignments or creating manual Custom Field
Undo entries.

<a id="0480-p006"></a>

ADR 0481 bounds both directions by one deadline from first terminal
reconciliation. Undo admission and partial reversal receive only the remaining
window and never restart it.

<a id="adr-0481"></a>

## 0481 · Missing Initialization Result Retry And Undo Share One Terminal Window

决定来源：[0481-missing-initialization-result-retry-and-undo-share-one-terminal-window.md](../../adr/0481-missing-initialization-result-retry-and-undo-share-one-terminal-window.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0481-p001"></a>

The first proven terminal reconciliation of a Missing Custom Field
Initialization Operation starts one **Missing Initialization Action Window**
using ADR 0087's user-configurable Reviewed Batch Action duration, defaulting to
30 days. Active, Paused or outcome-ambiguous operations do not start or lose
reconciliation authority through this clock. Unlike Custom Field Migration,
initialization has no required source-lifecycle disposition, so opening or
acknowledging the result is not a prerequisite for the deadline.

<a id="0481-p002"></a>

The terminal result detail, ADR 0479 Retry-Eligible failure evidence, successful
effect evidence for Undo, ADR 0480 direction and every executable Retry/Undo
action share the same original deadline. Manual retry, retry success, Undo
admission, partial Undo, result viewing, acknowledgement, application restart,
Library Switch or opening the exact instance on another compatible device does
not restart or extend it. A retry success joins the remaining Undo set only for
the time still left. The library-bound operation stores one authoritative
deadline so no device receives a fresh local window.

<a id="0481-p003"></a>

At the deadline, trusted execution admits no new Retry or Undo owner group. An
owner group already inside an atomic forward or reverse commit finishes or
rolls back at its normal boundary; later selected groups do not start. Required
outcome reconciliation may retain only the protected authority needed to prove
that in-flight group, but the action window remains expired and authorizes no
new mutation. As soon as that outcome is proven, executable owner/effect/failure
detail expires against the original deadline rather than receiving an
extension.

<a id="0481-p004"></a>

After terminal reconciliation and while no Retry, Undo or ambiguous outcome is
in flight, the user may confirm **Clear Missing Initialization Result And End
Actions**. Review discloses the currently Retry-Eligible count, still-current
Undo-eligible count, conflicts/exclusions and Forward Recovery Open or Missing
Initialization Undo Direction. Confirmation closes every remaining action and
deletes the same detailed authority that normal expiry would remove. It never
sets a field to Missing, retries an assignment, changes a current value,
resolves a conflict or creates a new window.

<a id="0481-p005"></a>

Normal expiry or confirmed early clearing removes owner identities, field and
assignment detail, per-owner outcomes, effect evidence, retry attempt detail
and executable intent. Current Custom Field Values remain authoritative. At
most an ADR 0087 value-free Pruned Batch Detail remains with the first terminal
time, scope and owner-class counts, aggregate forward/retry/Undo outcome
classes, and expired-versus-cleared disposition. It is not Resume, Retry, Undo,
Redo, backup, sync, search, plugin or reconstruction authority.
