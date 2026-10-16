# 手工编辑撤销与内存：详细能力契约

本文承接原ADR中的细节，保留所有原数字、例外、状态和相互约束；[来源映射](../../checkpoints/documentation-rebuild-20261015/adr-migration.json)逐段核对。**有效要求不是当前交付声明，也不是本轮实施队列。** 现行已批准产品/设计在其明确替代范围内优先；不凭实现缺失判决定无效。

当前系统从[organization](../../subsystems/library-lifecycle.md#organization)进入；当前实际能力/版本见[CURRENT-STATE](../../handoff/CURRENT-STATE.md)，交互与视觉分别归[交互目录](../../design/README.md)/[DESIGN](../../../DESIGN.md)。详细条款按下面独立主题定位，不全量装入每次上下文。

## 主题导航

- [0466 · Unsaved Custom Field Resolution Preflights All Drafts And Commits Atomically Per Owner](#adr-0466)
- [0467 · Atomic Multi-Field Owner Commits Use One Compound Manual Undo Step](#adr-0467)
- [0468 · Unavailable Manual Undo Stays Blocking Until Revalidated Or Explicitly Removed](#adr-0468)
- [0469 · Manual Custom Field Undo Uses Adjustable Count And Memory Budgets](#adr-0469)
- [0470 · Save Without Manual Undo Clears The Observable Manual History After Proven Commit](#adr-0470)
- [0471 · Critical Memory Pressure May Reclaim Complete Manual Undo Entries As A Last Resort](#adr-0471)

<a id="adr-0466"></a>

## 0466 · Unsaved Custom Field Resolution Preflights All Drafts And Commits Atomically Per Owner

决定来源：[0466-unsaved-custom-field-resolution-preflights-all-drafts-and-commits-atomically-per-owner.md](../../adr/0466-unsaved-custom-field-resolution-preflights-all-drafts-and-commits-atomically-per-owner.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0466-p001"></a>

ADR 0465 may place more than one typed Custom Field Edit Draft behind one
context transition. The Unsaved Custom Field Changes Gate therefore creates an
ephemeral reviewed **Custom Field Draft Resolution Plan** bound to the exact
library, requested transition, ordered affected owners and fields, draft types,
current validation states, base value/definition/rule revisions and an explicit
Save or Discard disposition for every draft. The application may show draft
content only inside this trusted review surface; notifications and aggregate
status remain content-free.

<a id="0466-p002"></a>

Save All is available only when every affected draft has a unique, current and
type-valid commit result. It never saves the valid subset while silently
leaving Invalid, Ambiguous, Stale or otherwise unresolved drafts behind. The
user must fix each blocker or explicitly change that draft's disposition to
Discard. Fix or Stay preserves every draft and returns focus to the first
blocking field in review order. Per-draft Discard is always explicit. Discard
All requires a second loss-of-work confirmation when more than one draft is
affected or any draft came from protected recovery; the confirmation uses
counts, types and owner scope without reproducing private values.

<a id="0466-p003"></a>

Confirmation sends the complete plan to trusted validation. Before any write
or discard, the application re-resolves every owner and field and re-runs each
selected Save through its current type parser, definition, constraints and
base revisions. If any selected Save fails this complete preflight, no owner
transaction starts and no draft is discarded; the gate refreshes the blocking
evidence. A renderer-valid projection is never commit authority.

<a id="0466-p004"></a>

After complete preflight, selected Save drafts are grouped by Candidate or
Design Asset owner. Every owner group commits all of its selected fields in one
transaction or none of them. Owner groups execute sequentially in the exact
order frozen by the reviewed plan; fields inside an owner use the frozen
Inspector definition order with stable field identity as a tie-breaker. Each
owner transaction repeats current identity, rule and revision checks so drift
cannot use the earlier preflight as Last Writer Wins authority.

<a id="0466-p005"></a>

The application does not promise one transaction across multiple owners. If an
unexpected failure or new drift occurs after earlier owner groups commit, those
proven commits remain authoritative, the failed and unstarted groups retain
their drafts, and the gate shows a truthful **Custom Field Draft Resolution
Result** with resolved, failed and remaining owner/field counts plus contextual
reasons. An explicit Discard is applied only when its owner group reaches its
resolution boundary and, when that owner also has Save drafts, only after that
owner's Save transaction succeeds. This prevents one owner from becoming
half-resolved merely because another owner failed.

<a id="0466-p006"></a>

The requested navigation, preview movement, Library Switch, Inspector close or
clean quit proceeds only after every affected draft is resolved. Partial
completion keeps the transition blocked and returns Fix/Stay to the first
remaining blocker. Successfully saved or discarded recovered drafts remove
only their matching protected records after the corresponding owner boundary
is proven; retained drafts keep their records.

<a id="0466-p007"></a>

This transition-scoped resolution is not a Reviewed Batch Action, creates no
Batch Activity record and has no durable result history. It does not change the
operation-scoped Undo contracts of batch, AI, import, migration, conflict or
Promotion work. ADR 0467 gives each successfully committed multi-field owner
group one indivisible compound manual Undo step and orders cross-owner steps by
their actual proven commits; discarded, failed and unstarted groups create no
step. ADR 0469 requires every oversized prospective owner step to resolve its
memory-limit choice during this ADR's complete preflight before any owner
transaction starts. ADR 0470 also binds each reviewed Save Without Manual Undo
boundary to this plan's frozen owner order so execution cannot silently move
which earlier manual entries it clears.

<a id="adr-0467"></a>

## 0467 · Atomic Multi-Field Owner Commits Use One Compound Manual Undo Step

决定来源：[0467-atomic-multi-field-owner-commits-use-one-compound-manual-undo-step.md](../../adr/0467-atomic-multi-field-owner-commits-use-one-compound-manual-undo-step.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0467-p001"></a>

ADR 0466 commits every selected Save field for one Candidate or Design Asset in
one atomic transaction. That transaction therefore creates exactly one
**Compound Custom Field Edit Undo Step**, not one independently reversible step
per field. The compound step remains bound to one library and one owner and
contains the frozen ordered field identities and types plus each field's exact
previous value-or-Missing state, committed typed value and resulting revision.
It enters the same ADR 0465 session-only Custom Field Edit Undo Stack and is not
a Batch Undo record or durable value history.

<a id="0467-p002"></a>

A single-field manual commit continues to create one ordinary Custom Field Edit
Undo Step. A successfully committed multi-field owner group creates its
compound step only after the complete transaction is proven committed.
Explicitly discarded drafts contribute no delta; an owner group containing only
discards creates no step. In ADR 0466 cross-owner execution, every successfully
committed owner contributes one ordinary or compound step in actual commit
order. Failed and unstarted owners contribute none, so global Undo reverses the
last proven owner commit first even after a partial resolution result.

<a id="0467-p003"></a>

When the compound step is newest and no active draft owns the shortcut, Undo
identifies the owner and affected field count/types before execution. Trusted
validation re-resolves the owner, every field definition, current validation
rules and every committed revision. Only if all deltas remain eligible does one
transaction restore all previous value-or-Missing states and create the
corresponding authoritative revisions. Drift, missing identity, incompatible
rules or any other ineligible delta makes the entire compound step unavailable
or routes the complete group to ADR 0097 field-aware review. Undo never restores
only the eligible fields, splits the step, skips a field or falls through to an
older stack entry.

<a id="0467-p004"></a>

Redo is likewise group-atomic. It is available only while every exact
Undo-produced revision remains current and the redo branch has not been
replaced by a later manual commit. One transaction restores every committed
typed value or none. A subsequent drift blocks the complete Redo rather than
replaying a subset.

<a id="0467-p005"></a>

A compound step containing Text and another type is one cross-type stack entry,
not parallel Text and non-Text steps. A type-filtered history projection may
show that the compound step contains a type, but it cannot offer type-only Undo.
The memory guard expires or removes the complete compound step and never splits
its deltas. ADR 0468 provides the only explicit path for removing a
drift-blocked newest compound step and removes it as a whole. Exact stack
memory/count limits and oversized-step preflight follow ADR 0469.

<a id="adr-0468"></a>

## 0468 · Unavailable Manual Undo Stays Blocking Until Revalidated Or Explicitly Removed

决定来源：[0468-unavailable-manual-undo-stays-blocking-until-revalidated-or-explicitly-removed.md](../../adr/0468-unavailable-manual-undo-stays-blocking-until-revalidated-or-explicitly-removed.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0468-p001"></a>

The chronological ADR 0465 Custom Field Edit Undo Stack must not silently change
meaning when its newest step becomes ineligible. A failed eligibility check
therefore marks that exact ordinary or compound entry as an **Unavailable
Custom Field Edit Undo Step** and opens contextual **Unavailable Undo Step
Review**. The review identifies the owner, single/compound scope, affected field
count and types, and typed blocking reasons. It does not execute another stack
entry, mutate metadata, reopen a draft or expose values in notifications.

<a id="0468-p002"></a>

Keep is the default. The unavailable step remains the newest stack entry and
continues to block older Undo rather than acting as permission for automatic
fallthrough, skip-once or best-effort partial replay. Relevant owner,
definition, rule, value-revision or availability evidence may trigger a silent
read-only eligibility recheck without opening UI or executing Undo. A recheck
uses exact identities and revisions, never name matching or value-equality
substitution. If the step becomes eligible, its ordinary Undo action becomes
available again; it is never applied automatically.

<a id="0468-p003"></a>

The review also offers explicit **Remove Undo Step** for the unavailable newest
entry. One confirmation discloses permanent loss of that complete Undo
opportunity and any Redo branch owned by it. Trusted confirmation first repeats
the eligibility check. If the step is eligible again, removal does not proceed
and the review refreshes to the available state. Otherwise removal deletes only
that entire in-memory stack entry and its Redo state; it changes no Custom Field
Value or revision, recovery journal, portable metadata, activity/history record,
log, notification or plugin-visible state.

<a id="0468-p004"></a>

After proven removal, the next older entry becomes newest but is neither
prevalidated nor executed until the user invokes Undo again. Removal itself
creates no Undo/Redo step and cannot be undone. An ADR 0467 compound entry is
removed as a whole; the review cannot remove one field delta or create separate
type-specific steps. There is no Remove All Unavailable, skip just this time,
remembered auto-remove, timeout removal or background cleanup based on drift.

<a id="0468-p005"></a>

This explicit path does not make the stack durable. ADR 0278 Library Switch and
normal application exit still clear the complete session-only stack under ADR
0465, including unavailable entries, without changing values. Independent
oldest-step eviction follows ADR 0469 count/byte limits and may remove an
unavailable entry only when it is the complete oldest entry selected by normal
capacity policy, not merely because it drifted. ADR 0470's explicitly reviewed
Save Without Manual Undo boundary is a separate chronological reset, not an
Unavailable Undo Step Review clear-all action. ADR 0471 may also reclaim that
complete entry as part of last-resort oldest-first critical-pressure eviction;
Unavailable status grants no memory pin.

<a id="adr-0469"></a>

## 0469 · Manual Custom Field Undo Uses Adjustable Count And Memory Budgets

决定来源：[0469-manual-custom-field-undo-uses-adjustable-count-and-memory-budgets.md](../../adr/0469-manual-custom-field-undo-uses-adjustable-count-and-memory-budgets.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0469-p001"></a>

The ADR 0465 session-only stack needs predictable usefulness without becoming
unbounded application memory. Each device therefore has a **Custom Field Edit
Undo Budget** with two simultaneous maximums: 200 complete steps and 64 MiB of
estimated retained memory by default. Advanced Settings may adjust the integer
step maximum from 20 through 1,000 and the memory maximum from 8 through 256
MiB. Each setting uses one synchronized exact numeric input and slider with its
unit, range and integer step; invalid typed input remains visible and cannot be
applied or silently clamped. These settings are device-local and grant no
portable-library retention.

<a id="0469-p002"></a>

The trusted main process conservatively estimates each ordinary or ADR 0467
compound step's complete retained in-memory payload, including exact typed
before/after values, identities, revisions and collection overhead. The
projection is an estimate rather than a promise about total process heap. A new
step that fits by itself may be admitted only after the required capacity and
whole-step eviction set are known. After the authoritative commit succeeds, the
step enters newest position and complete oldest entries are evicted until both
configured maximums are satisfied. Count and bytes never split, truncate or
partially retain a compound entry.

<a id="0469-p003"></a>

ADR 0468 Unavailable status does not pin memory. An unavailable entry may be
evicted when it becomes the oldest entry required to satisfy a count or byte
maximum, and an open review refreshes truthfully if that occurs. Capacity
eviction changes no value, revision, recovery record or history and creates no
Remove Undo Step decision. The UI may report only the number of expired Undo
opportunities and resulting current count/estimated bytes; it never exposes
their values through a toast, notification, log or telemetry.

<a id="0469-p004"></a>

Lowering either setting applies to the current active-library session only
after a review shows the number of complete oldest steps and estimated bytes
that would be lost. Cancellation preserves the current budget and stack.
Confirmed reduction evicts exactly the projected whole entries, then rechecks
the resulting totals; raising a limit never reconstructs previously evicted
evidence. Normal new-step eviction under an already accepted budget needs no
per-commit confirmation because the configured maximum is the user's standing
retention choice.

<a id="0469-p005"></a>

If one prospective ordinary or compound step exceeds the current byte maximum
by itself, no existing-entry eviction can make it admissible. Before any value
write or draft discard, trusted preflight opens an **Oversized Manual Undo
Review** showing the owner scope, single/compound field count and types,
estimated step MiB and current limit without reproducing private values. It
offers Increase Undo Memory Limit when the required whole-MiB setting is within
the 256 MiB maximum, Return To Editing with every draft preserved, or an
explicit Save Without Manual Undo choice. If the estimate exceeds 256 MiB,
increase is unavailable rather than silently exceeding the supported range.

<a id="0469-p006"></a>

ADR 0466 resolves every oversized owner group during complete zero-write
preflight before cross-owner execution starts. The reviewed choice is bound to
that exact owner group and estimate; evidence or size drift invalidates it.
Save Without Manual Undo creates no ordinary or compound stack entry and never
splits the group, spills typed values to disk, reuses protected draft recovery
as Undo, or waits until after commit to disclose the loss. ADR 0470 makes its
successful unrecorded commit a reviewed Manual Undo History Boundary: no stack
is cleared before proven success, and proven success clears the observable
older manual Undo/Redo timeline rather than allowing silent fallthrough.

<a id="0469-p007"></a>

ADR 0471 separately permits last-resort whole-entry reclamation below these
normal maximums only from fresh, platform-qualified Critical memory-pressure
evidence after safer disposable resources are insufficient. A configured
maximum remains a cap rather than a guaranteed reservation.

<a id="adr-0470"></a>

## 0470 · Save Without Manual Undo Clears The Observable Manual History After Proven Commit

决定来源：[0470-save-without-manual-undo-clears-the-observable-manual-history-after-proven-commit.md](../../adr/0470-save-without-manual-undo-clears-the-observable-manual-history-after-proven-commit.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0470-p001"></a>

An authoritative manual save that creates no Undo entry cannot leave older
entries apparently reachable, because the next Undo would silently skip the
newest change and act on an earlier state. **Save Without Manual Undo** therefore
creates a **Manual Undo History Boundary** for the active library session. Its
trusted pre-commit confirmation states both that the prospective save cannot be
undone and that a successful save will end every currently retained manual Undo
and Redo opportunity. It shows only aggregate Undo/Redo entry counts and
estimated retained memory, not previous/current values or other private
content.

<a id="0470-p002"></a>

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

<a id="0470-p003"></a>

For an ADR 0466 multi-owner resolution, complete zero-write preflight shows the
boundary consequence at each exact owner position in the frozen execution
order. A proven no-Undo owner clears manual history accumulated before it,
including recordable owner steps committed earlier in the same plan. Later
recordable owners start a new chronological manual stack after that boundary.
If execution stops before a reviewed no-Undo owner commits, that owner's
boundary never occurs; if it stops afterward, the truthful partial result
reflects the already-applied boundary and any later proven entries. Evidence or
order drift invalidates the reviewed plan instead of moving the boundary.

<a id="0470-p004"></a>

This rule owns only ADR 0465 manual Custom Field Edit Undo/Redo for the active
library session. It does not clear, consume, cross or otherwise change the
operation-scoped Undo and recovery contracts for batch, AI, import, migration,
conflict or Promotion work. The boundary creates no portable history, Batch
Activity item, plugin event, private log or telemetry payload.

<a id="adr-0471"></a>

## 0471 · Critical Memory Pressure May Reclaim Complete Manual Undo Entries As A Last Resort

决定来源：[0471-critical-memory-pressure-may-reclaim-complete-manual-undo-entries-as-a-last-resort.md](../../adr/0471-critical-memory-pressure-may-reclaim-complete-manual-undo-entries-as-a-last-resort.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0471-p001"></a>

The ADR 0469 device setting is a normal retention maximum, not authority to
endanger application or operating-system responsiveness. **Critical-Pressure
Manual Undo Reclamation** is therefore a trusted-host last resort. Ordinary or
warning memory pressure first stops affected background admission and requests
safe release of unpinned idle models, rebuildable preview/cache state and other
disposable application memory. It does not reduce the manual stack while those
measures are sufficient.

<a id="0471-p002"></a>

Reclamation below the configured Undo budget is permitted only when fresh,
platform-qualified operating-system evidence says memory pressure is Critical
and the preceding safe releases have not cleared that state. Unsupported,
stale, Unknown or merely estimated pressure is never upgraded to Critical.
Renderer state, a plugin, an ordinary allocation estimate or a user-facing
performance profile cannot invoke this authority. The coordinator must not
interrupt an authoritative metadata transaction, discard a current draft or
its protected recovery, delete an original/result, or corrupt a worker merely
to reclaim Undo memory.

<a id="0471-p003"></a>

When the last resort is necessary, the trusted host evicts the oldest complete
manual history entries in bounded batches and refreshes pressure evidence after
each batch. It stops immediately when pressure is no longer Critical or the
stack is empty. Evicting an entry removes that entry's complete Undo and Redo
evidence together; an ADR 0467 compound entry is never split, and ADR 0468
Unavailable status never pins it. There is no hidden minimum beneath which the
configured 20-step/8-MiB lower settings become a safety guarantee, no disk
spill, and no conversion of protected draft recovery into Undo.

<a id="0471-p004"></a>

No blocking confirmation is required during a proven critical-pressure event
because waiting would weaken the safety action. The active application surface
instead reports a content-free session aggregate: how many complete manual
opportunities expired for system memory safety, the retained entry count and
estimated retained bytes. It sends no operating-system notification and stores
no values, paths or per-entry detail in activity, portable history, logs,
telemetry or plugins. Expired evidence cannot be reconstructed after pressure
clears or after the user raises the configured budget.
