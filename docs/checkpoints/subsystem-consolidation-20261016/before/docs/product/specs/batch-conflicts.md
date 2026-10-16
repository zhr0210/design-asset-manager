# 批量操作与冲突：详细能力契约

本文承接原ADR中的细节，保留所有原数字、例外、状态和相互约束；[来源映射](../../checkpoints/documentation-rebuild-20261015/adr-migration.json)逐段核对。**有效要求不是当前交付声明，也不是本轮实施队列。** 现行已批准产品/设计在其明确替代范围内优先；不凭实现缺失判决定无效。

当前系统从[organization](../../subsystems/organization.md)进入；当前实际能力/版本见[CURRENT-STATE](../../handoff/CURRENT-STATE.md)，交互与视觉分别归[交互目录](../../design/README.md)/[DESIGN](../../../DESIGN.md)。详细条款按下面独立主题定位，不全量装入每次上下文。

## 主题导航

- [0081 · Selection Persists Only Within the Same Result Set](#adr-0081)
- [0084 · Post-Batch Selection Follows Batch Result](#adr-0084)
- [0085 · Batch Result Feedback Is Proportional to Complexity](#adr-0085)
- [0087 · Batch Activity Retention Is Tiered by Importance](#adr-0087)
- [0089 · Batch Result History Entry Points Stay Contextual](#adr-0089)
- [0092 · Batch Retry Uses Attempt Limits](#adr-0092)
- [0095 · Batch Progress Is Lightweight and Contextual](#adr-0095)
- [0098 · Metadata Conflict Review Stays Contextual](#adr-0098)
- [0104 · Library Conflict Counts Confirm After Persistence](#adr-0104)

<a id="adr-0081"></a>

## 0081 · Selection Persists Only Within the Same Result Set

决定来源：[0081-selection-persists-only-within-the-same-result-set.md](../../adr/0081-selection-persists-only-within-the-same-result-set.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0081-p001"></a>

Candidate selection should persist through presentation-only changes such as
sort order, view mode, and thumbnail size when the same result set remains in
view. Scope changes such as Capture Batch, Smart Filter, status filter, search,
page, or route changes are Selection Clearing Events because keeping hidden
selection would make Candidate Batch Action scope ambiguous. When a large
Visible Selection is cleared, the app may offer short-lived Selection Recovery,
but that recovery is separate from Batch Undo and disappears before any batch
operation runs.

<a id="0081-p002"></a>

ADR 0448 explicit refresh replaces a Duplicate Text Finding Session's complete
result generation and is therefore a result-set change rather than a
presentation-only update. Frozen pre-refresh selection cannot silently become
selection over newly grouped or newly eligible owners.

<a id="0081-p003"></a>

ADR 0451 switching Text Custom Field sort direction, mode or explicit Natural
language reorders the same result identities and therefore preserves selection
and focus. A separate filter, scope or explicit newer-generation refresh still
follows the existing result-set boundary.

<a id="0081-p004"></a>

Under ADR 0465, a requested selection or result-set change first resolves any
pending Custom Field Edit Draft through its Unsaved Custom Field Changes Gate.
Selection clearing executes only after the user saves or discards; Stay
preserves the current selection and editing context. Under ADR 0466, a
cross-owner partial result does not clear or advance selection while any draft
remains unresolved.

<a id="0081-p005"></a>

ADR 0478 requires a fresh Missing initialization preview when an owner
lifecycle or result-generation change alters the reviewed scope before
confirmation. After confirmation the frozen operation ignores later selection
changes and never admits new, restored or newly matching owners.

<a id="adr-0084"></a>

## 0084 · Post-Batch Selection Follows Batch Result

决定来源：[0084-post-batch-selection-follows-batch-result.md](../../adr/0084-post-batch-selection-follows-batch-result.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0084-p001"></a>

Candidate Batch Actions should leave selection and focus based on what actually
happened. Lower-risk metadata actions such as adding tags, assigning
collections, or extending retention should keep the Visible Selection and
refresh Batch Inspector. Confirm to Library and Reject Candidate should remove
successful items from the active selection while keeping skipped, failed, and
excluded items selected with their reasons visible. Hard Delete should clear
deleted items from selection, move Result Focus to the next visible candidate,
show Batch Result Feedback, and never offer Batch Undo.

<a id="0084-p002"></a>

ADR 0457 Batch Text Edit keeps the selected owners visible and refreshes Batch
Inspector after execution. Changed, unchanged, invalid, conflict, failed and
excluded outcomes remain inspectable without silently narrowing the selection.

<a id="adr-0085"></a>

## 0085 · Batch Result Feedback Is Proportional to Complexity

决定来源：[0085-batch-result-feedback-is-proportional-to-complexity.md](../../adr/0085-batch-result-feedback-is-proportional-to-complexity.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0085-p001"></a>

Batch Result Feedback should match the complexity and risk of the result. A
fully successful low-risk Direct Batch Action may use only Candidate Undo Toast.
Any result with skipped, failed, or excluded items should show Inline Batch
Result with a visible reason summary and Batch Result Detail available for
inspection. Reviewed Batch Actions should return to Batch Inspector with their
result visible, while Hard Delete should show an irreversible Inline Batch
Result and never expose an undo entry.

<a id="0085-p002"></a>

ADR 0457 therefore returns Batch Text Edit to Batch Inspector with persisted
outcome counts and direct conflict/failure detail. A fully successful edit still
shows its reviewed result rather than collapsing into a generic one-line toast.

<a id="adr-0087"></a>

## 0087 · Batch Activity Retention Is Tiered by Importance

决定来源：[0087-batch-activity-retention-is-tiered-by-importance.md](../../adr/0087-batch-activity-retention-is-tiered-by-importance.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0087-p001"></a>

Batch Activity Retention should be tiered by result importance. Fully
successful low-risk Direct Batch Actions should stay in Recent Activity Summary
for 7 days by default. Important Batch Records for failed, skipped, excluded,
Reviewed Batch Action, and non-Hard Delete high-risk results should remain in
Batch Result History for 30 days by default. Hard Delete should retain only an
irreversible action summary for 90 days by default, without private file
content snapshots. Users may adjust these durations, and older records may
become Pruned Batch Detail instead of remaining fully expanded forever.

<a id="0087-p002"></a>

ADR 0392 gives fully successful non-replacing Asset Export 7-day recent
activity and failed/skipped/cancelled/partial/replacing terminal export 30-day
history by default. Neither duration starts while operational attention remains
and neither governs external-file recovery receipts.

<a id="0087-p003"></a>

ADR 0403 classifies every Recovery Staging Release Batch as a Reviewed Batch
Action and retains its lightweight result for 30 days by default, including a
Complete result. That duration never expires or releases the distinct affected-
work recovery authority, evidence, attention or isolation. When the record
expires, its visible attempt timeline, reason summaries and statistics are
deleted. ADR 0401 governs any lifecycle-bound Recovery Staging Terminal Marker
or anti-replay tombstone; neither is Batch Activity history or a reason to
extend the visible retention period.

<a id="0087-p004"></a>

ADR 0429 classifies every Custom Field Migration Result as a Reviewed Batch
Action with the same user-configurable 30-day default, but starts that result
and Undo window only after explicit result acknowledgement and source-field
disposition. Early result clearing explicitly ends Undo, and expiry leaves only
value-free Pruned Batch Detail.

<a id="0087-p005"></a>

ADR 0434 applies the same acknowledgement-gated 30-day-default complete-result
and Undo window to Custom Field Option Merge. Permanent Delete Custom Field
Select Option instead follows Hard Delete retention: it has no Undo and keeps a
user-configurable 90-day-default irreversible summary without private value or
per-owner snapshots. Neither expiry ends unfinished operational state.

<a id="0087-p006"></a>

ADR 0458 classifies Batch Text Edit as a Reviewed Batch Action with a
user-configurable 30-day-default terminal-result and device-local Undo window.
Its clock starts when execution becomes terminal, not while active or Paused;
unfinished reconciliation evidence cannot expire. Early clearing discloses the
remaining eligible Undo count and ends both detailed result and Undo, while
normal expiry leaves at most value-free Pruned Batch Detail. A value-free ADR
0458 Batch Text Terminal Marker may outlive that visible history only until the
initiating device acknowledges the original terminal deadline and disposes of
its local journal; it is operational anti-replay evidence, not retained
activity.

<a id="0087-p007"></a>

ADR 0481 applies the same default 30-day Reviewed Batch Action duration to one
Missing-initialization result, Retry and Undo window starting at first terminal
reconciliation without acknowledgement gating. Retry, Undo, viewing and device
change do not extend it; an in-flight atomic group may settle without admitting
later work or receiving a new deadline.

<a id="adr-0089"></a>

## 0089 · Batch Result History Entry Points Stay Contextual

决定来源：[0089-batch-result-history-entry-points-stay-contextual.md](../../adr/0089-batch-result-history-entry-points-stay-contextual.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0089-p001"></a>

Batch Result History should be findable without turning the Asset Workspace
into a log center. The primary Batch Result Entry Point should live in Capture
Inbox Activity Panel. Batch Inspector should show the most recent result
immediately after execution, and individual candidates or deleted placeholders
may expose Candidate History Link and Inspector History Section for related
history. The Asset Workspace should not keep a persistent global batch history
button by default, preserving the browsing surface while keeping failed,
skipped, excluded, and irreversible results recoverable from their natural
workflow contexts.

<a id="0089-p002"></a>

ADR 0392 gives Asset Export its immediate completion page and contextual Export
Activity inside Asset Workspace. Local File Recovery stays separate because it
contains recovery authority rather than ordinary result history.

<a id="adr-0092"></a>

## 0092 · Batch Retry Uses Attempt Limits

决定来源：[0092-batch-retry-uses-attempt-limits.md](../../adr/0092-batch-retry-uses-attempt-limits.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0092-p001"></a>

Each Retry Eligible Failure should have a Retry Attempt Limit of 3 attempts by
default inside the same Unresolved Batch Result. Retry In Flight should disable
additional retry actions for the same item or batch until the attempt finishes.
After the limit is reached, the item becomes Retry Exhausted Failure and
follows Manual Escalation through opening details, changing target collection,
fixing permissions, skipping, or recapturing. Changing the target or recapturing
starts a new recovery path rather than silently resetting the old retry count.

<a id="0092-p002"></a>

ADR 0403 Recovery Staging Completion Attempt is not a Retry Eligible Failure or
Batch Retry. Its manual count has no arbitrary limit because every later attempt
requires new read-only eligibility proof and explicit confirmation; this does
not permit automatic retry, duplicate in-flight attempts or reuse of consent.

<a id="0092-p003"></a>

ADR 0479 uses this existing three-attempt per-owner limit for each
Retry-Eligible Missing initialization group in the same result. Replanning,
acknowledgement, conflict or exclusion never resets that result's count, and a
new plan is required when intent or non-transient state changes.

<a id="adr-0095"></a>

## 0095 · Batch Progress Is Lightweight and Contextual

决定来源：[0095-batch-progress-is-lightweight-and-contextual.md](../../adr/0095-batch-progress-is-lightweight-and-contextual.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0095-p001"></a>

Batch Operation In Flight should expose progress without blocking the user's
workspace. Capture Inbox Activity Panel should show Batch Progress Summary.
Currently visible candidate cards or details may show Item Progress State, while
navigation away from the active review surface should keep a Background
Progress Indicator available. Completion Transition should turn progress into
Inline Batch Result for complex outcomes or Candidate Undo Toast for fully
successful low-risk actions. The app should not use a blocking full-screen
progress modal by default.

<a id="0095-p002"></a>

ADR 0458 projects Batch Text Edit recovery from its durable operation record.
After interruption, the contextual surface shows proven completed and remaining
counts plus Resume, Cancel Remaining and Undo Completed only when the current
device holds the required protected evidence; it never exposes previous Text in
global progress or notifications.

<a id="adr-0098"></a>

## 0098 · Metadata Conflict Review Stays Contextual

决定来源：[0098-metadata-conflict-review-stays-contextual.md](../../adr/0098-metadata-conflict-review-stays-contextual.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0098-p001"></a>

Conflict Review Required should be discoverable from Batch Inspector result
areas and Capture Inbox Activity Panel rather than forced through interruptive
popups. Related candidate cards, candidate details, or batch results should
show Conflict Badge. Users should enter Conflict Review Surface from Batch
Result Detail to choose a Conflict Resolution Choice. Resolved conflicts should
write a lightweight Conflict History Note without storing content snapshots or
full private metadata dumps.

<a id="adr-0104"></a>

## 0104 · Library Conflict Counts Confirm After Persistence

决定来源：[0104-library-conflict-counts-confirm-after-persistence.md](../../adr/0104-library-conflict-counts-confirm-after-persistence.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0104-p001"></a>

Library Conflict Smart Filter count updates should balance responsive local feedback with trustworthy global navigation state. After Carryover Resolution, the current surface may use an Optimistic Count Update with pending state, but global navigation and Smart Filter badge counts should use Confirmed Count Update only after the resolution write is persisted. If persistence fails or the temporary count disagrees with stored conflict state, Count Reconciliation should restore the unresolved count and show the unresolved reason instead of silently hiding the conflict.
