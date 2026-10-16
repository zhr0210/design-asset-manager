# 自定义字段与迁移：详细能力契约

本文承接原ADR中的细节，保留所有原数字、例外、状态和相互约束；[来源映射](../../checkpoints/documentation-rebuild-20261015/adr-migration.json)逐段核对。**有效要求不是当前交付声明，也不是本轮实施队列。** 现行已批准产品/设计在其明确替代范围内优先；不凭实现缺失判决定无效。

当前系统从[organization](../../subsystems/organization.md)进入；当前实际能力/版本见[CURRENT-STATE](../../handoff/CURRENT-STATE.md)，交互与视觉分别归[交互目录](../../design/README.md)/[DESIGN](../../../DESIGN.md)。详细条款按下面独立主题定位，不全量装入每次上下文。

## 主题导航

- [0425 · Every Custom Field Type Pair Has A Validated Direct Migration Path](#adr-0425)
- [0426 · Custom Field Migration Commits Per Owner And Resumes From Durable Checkpoints](#adr-0426)
- [0427 · Partially Migrated Custom Fields Remain Queryable With Explicit Coverage](#adr-0427)
- [0428 · Custom Field Conversion Presets Store Portable Rules Without Execution Authority](#adr-0428)
- [0429 · Custom Field Migration Results And Undo Share A Reviewed Retention Window](#adr-0429)
- [0430 · Custom Field Schema Maintenance Uses One Cooperative Library Lane](#adr-0430)
- [0431 · Custom Field Schema Maintenance Has Fixed Cross-Platform Responsiveness Acceptance](#adr-0431)
- [0434 · Large Select-Option Changes Run As Resumable Maintenance Tasks With Risk-Specific Undo](#adr-0434)

<a id="adr-0425"></a>

## 0425 · Every Custom Field Type Pair Has A Validated Direct Migration Path

决定来源：[0425-every-custom-field-type-pair-has-a-validated-direct-migration-path.md](../../adr/0425-every-custom-field-type-pair-has-a-validated-direct-migration-path.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0425-p001"></a>

Complete Custom Field planning cannot leave unusual but legitimate schema changes blocked merely because they lack a universal semantic conversion. The **Complete Custom Field Conversion Matrix** therefore covers all 56 directed source-to-different-target pairs among ADR 0417's eight types. Every pair resolves through an ADR 0424 lossless conversion, an explicitly selected rule-governed conversion, or **Manual Custom Field Conversion Mapping**.

<a id="0425-p002"></a>

Manual mapping is a host-validated migration tool for pairs or remaining values that have no adequate general rule. It supports structured batch conditions, **Distinct-Value Mapping** from a source value to a valid target value, and **Per-Item Conversion Override** when identical source values legitimately need different results. Every proposed target value must conform to the target Custom Field Definition before it can enter the ADR 0423 migration preview or commit set; Number targets additionally require ADR 0435 exact-domain and range validation without implicit rounding, DateTime targets require ADR 0436 explicit state/zone evidence and ADR 0437 whole-second-through-nanosecond precision without hidden normalization, and Text targets require ADR 0440 NFC-preserved content within the active grapheme limit without silent truncation. ADR 0441 keeps zero-length Text outside the target value set as Missing and preserves non-empty whitespace-only Text as a visible present target; ADR 0442 blocks unsafe controls while retaining warned valid invisible formatting; ADR 0443 validates present targets against the active grapheme minimum and portable pattern.

<a id="0425-p003"></a>

Manual mapping never mutates the source value, executes plugin/user code, creates a Formula field, or converts through Text or another hidden intermediate type. Values without a confirmed valid target remain Unconvertible Custom Field Values on the source field; completeness means every type pair has a safe user-controlled path, not that every source value is guessed or forced to convert.

<a id="0425-p004"></a>

This ADR fixes complete pair coverage. ADR 0426 owns large-set execution, cancellation, concurrency, result review and undo. ADR 0428 owns reusable rule and explicit Distinct-Value Mapping intent without persisting per-item overrides or execution authority. The built-in lossless/rule catalogs for each pair remain dependent decisions rather than reasons to omit a type pair from the target architecture.

<a id="adr-0426"></a>

## 0426 · Custom Field Migration Commits Per Owner And Resumes From Durable Checkpoints

决定来源：[0426-custom-field-migration-commits-per-owner-and-resumes-from-durable-checkpoints.md](../../adr/0426-custom-field-migration-commits-per-owner-and-resumes-from-durable-checkpoints.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0426-p001"></a>

A Custom Field Type Migration may cover 100,000 assets and must not hold one library-wide transaction or lose proven work after pause, cancellation or restart. A confirmed plan therefore runs as a durable library-bound **Custom Field Migration Task**, and each Candidate or Design Asset reaches a separate atomic **Custom Field Migration Item Commit** that persists its validated target value when one exists and its truthful durable outcome together.

<a id="0426-p002"></a>

Pause and cancellation take effect at item boundaries: the current bounded item finishes or rolls back, already committed items remain, and no later item starts. Restart reconciliation classifies every item as committed or pending before resuming so an interruption never duplicates a target value or treats an uncertain item as successful. ADR 0278 may checkpoint the task at the same boundary for Library Switch rather than cancelling it.

<a id="0426-p003"></a>

The source field remains active while the task is incomplete. The target field exposes **Custom Field Migration In Progress** with current committed, failed, conflict, unconvertible and remaining counts rather than appearing complete. If either item's relevant source evidence or target value changed after the confirmed preview, that item is skipped into **Custom Field Migration Conflict Review** under ADR 0097; migration never overwrites the newer value or silently reapplies an obsolete rule.

<a id="0426-p004"></a>

After every requested item has a terminal outcome, a Custom Field Migration Result shows converted, retained-unconvertible, conflict and failed items before any source-field lifecycle change. ADR 0420 archive is the recommended disposition, but it occurs only after explicit result confirmation; cancellation, interruption or partial execution never archives the source field automatically.

<a id="0426-p005"></a>

**Undo Custom Field Migration** removes only migration-created target values that are still unchanged and restores the source field's prior active/archive state subject to ADR 0422 name-conflict review. Later-edited target values and unrelated user values are excluded and reported rather than overwritten or deleted. Undo never permanently deletes the target definition, guesses how to reverse a lossy conversion, or reverts other metadata changes.

<a id="0426-p006"></a>

This ADR owns execution, progress, cancellation, restart reconciliation, concurrent-item conflict handling and bounded undo. ADR 0427 owns target-field search and filter behavior during partial coverage. ADR 0428 keeps reusable conversion intent separate from the task's frozen reviewed plan and execution authority. ADR 0429 owns result acknowledgement, retention and Undo expiry. ADR 0430 owns the shared schema-maintenance queue order, cooperative admission, write serialization and performance-profile boundaries.

<a id="adr-0427"></a>

## 0427 · Partially Migrated Custom Fields Remain Queryable With Explicit Coverage

决定来源：[0427-partially-migrated-custom-fields-remain-queryable-with-explicit-coverage.md](../../adr/0427-partially-migrated-custom-fields-remain-queryable-with-explicit-coverage.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0427-p001"></a>

Waiting for a large Custom Field Type Migration to finish would hide already committed work, while mixing source and target identities would make apparently complete queries return invented results. A target Custom Field Definition is therefore searchable and filterable from the start of its ADR 0426 task, even before the first target value is committed, but every Inspector, criterion/facet and result surface involving it exposes **Partial Custom Field Migration Coverage** while any requested migration item remains non-terminal.

<a id="0427-p002"></a>

Search and filter evaluation uses only durable values committed to the target definition. It never infers a missing target value from the source field, executes the conversion rule at query time, merges the two field identities, or counts previewed/pending values as matches. The coverage state shows committed target-value owners together with current failed, conflict, unconvertible and remaining counts so a syntactically valid query cannot appear complete by omission.

<a id="0427-p003"></a>

A Saved Search or User Smart Filter may be created, saved and executed against the target during migration. Its criterion keeps the exact target Custom Field Dependency Reference under ADR 0421; partial coverage is durable execution state, not a mutation of the saved criteria or identity. When every requested migration item reaches a terminal outcome, the live coverage state clears automatically without rewriting the query, while ADR 0426 Custom Field Migration Result discloses retained-unconvertible, conflict and failed items for its ADR 0429 retention lifecycle.

<a id="0427-p004"></a>

This ADR does not add Custom Field criteria to a cross-library or Offline Library Catalog projection. Any future projection that supports them must preserve the same committed-target-only semantics and must not claim complete coverage without durable migration-state evidence.

<a id="adr-0428"></a>

## 0428 · Custom Field Conversion Presets Store Portable Rules Without Execution Authority

决定来源：[0428-custom-field-conversion-presets-store-portable-rules-without-execution-authority.md](../../adr/0428-custom-field-conversion-presets-store-portable-rules-without-execution-authority.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0428-p001"></a>

Repeated Custom Field Type Migrations should not require rebuilding the same explicit interpretation rules, but replaying a prior migration plan would carry stale field identities, values and consent. A **Custom Field Conversion Preset** is therefore named library-owned portable content for exactly one source/target Custom Field Type pair, included in Full Library Backup and restore, that stores reusable semantic conversion intent without granting execution authority.

<a id="0428-p002"></a>

A preset may retain the explicitly selected date format, timezone or offset assignment, number precision and rounding, Boolean interpretation, Text/URL handling and other host-defined ADR 0424 rules applicable to its type pair. It includes Distinct-Value Mappings only when the user explicitly selects those mappings for the preset; unselected mappings are stripped. It never stores source or target Custom Field Definition identity, Candidate or Design Asset selection, Per-Item Conversion Override, current value, preview example/count, source-generation evidence, unresolved-item decision, source-field archive choice, task/result/undo state, plugin or executable code, filesystem/network authority, or confirmation from the migration that produced it.

<a id="0428-p003"></a>

Applying a preset requires currently selected source and target definitions of its declared types and always creates a fresh Custom Field Type Migration Preview under ADRs 0423–0425. The host revalidates current source values, target constraints/options, every retained Distinct-Value Mapping and all affected/convertible/unconvertible counts. A preset mapping whose target is missing, invalid or ambiguous under the current definition remains unresolved for explicit repair; the application never matches a target option approximately, derives locale/timezone from the current device, runs a fallback parser, downloads a capability, or starts migration automatically.

<a id="0428-p004"></a>

Once the user confirms a migration, ADR 0426 Custom Field Migration Task owns a frozen snapshot of the reviewed current rules and mappings rather than a live reference to the preset. Later preset rename, edit or deletion cannot alter, pause, resume, retry, undo or reinterpret any active or completed task. Saving, applying or possessing a preset never authorizes source-field archive, schema mutation, AI execution or another library's write ownership.

<a id="adr-0429"></a>

## 0429 · Custom Field Migration Results And Undo Share A Reviewed Retention Window

决定来源：[0429-custom-field-migration-results-and-undo-share-a-reviewed-retention-window.md](../../adr/0429-custom-field-migration-results-and-undo-share-a-reviewed-retention-window.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0429-p001"></a>

A Custom Field Type Migration may change 100,000 owners, so expiring its result before the user has reviewed the outcome would hide the only safe rollback entry, while retaining item evidence forever would turn activity history into metadata version history. Every ADR 0426 Custom Field Migration Result is therefore an ADR 0086 Reviewed Batch Action whose complete result and **Custom Field Migration Undo Window** share the ADR 0087 user-configurable retention period, defaulting to 30 days.

<a id="0429-p002"></a>

The retention clock does not start merely because the task becomes terminal or the result is opened. It starts only after **Custom Field Migration Result Acknowledgement**: the user reviews the terminal counts and explicitly chooses either Archive Source Field or Keep Source Field Active. Before acknowledgement, the complete result and Undo entry do not expire; failed, conflict and retained-unconvertible attention follows ADRs 0090 and 0093 until repaired or explicitly acknowledged rather than disappearing through time alone.

<a id="0429-p003"></a>

During the window, Undo Custom Field Migration remains bounded by ADR 0426. A later edit to a migration-created target value excludes only that value from Undo and does not extend or restart the shared deadline; excluded and still-eligible counts are recalculated before confirmation. After acknowledgement, the user may adjust the retention deadline. Clearing the complete result early is unavailable before acknowledgement and then requires a distinct **Clear Migration Result And End Undo** confirmation that discloses the remaining eligible Undo count; it removes no Custom Field Definition or Value and cannot be reversed into a new Undo window.

<a id="0429-p004"></a>

At normal expiry or confirmed early clearing, item references, reason snapshots, mappings and Undo evidence are deleted. The record becomes ADR 0087 **Pruned Batch Detail** containing only time, source/target type pair, aggregate terminal counts and final source-field disposition, without Custom Field Values, per-item outcomes or executable conversion intent. Expiry never archives or deletes either field, changes a value, resolves a conflict, removes an ADR 0421 dependency, or prevents a future separately reviewed migration.

<a id="adr-0430"></a>

## 0430 · Custom Field Schema Maintenance Uses One Cooperative Library Lane

决定来源：[0430-custom-field-migrations-use-one-cooperative-library-maintenance-lane.md](../../adr/0430-custom-field-migrations-use-one-cooperative-library-maintenance-lane.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0430-p001"></a>

Running several large Custom Field Type Migrations, Select-option maintenance operations or constraint revalidations against the same library could amplify database contention and stale-preview conflicts, while draining one task without yielding would make ordinary asset work feel blocked. Each library therefore owns one **Custom Field Schema Maintenance Lane**: at most one confirmed Custom Field Schema Maintenance Task is Running. Every target-value write remains a serialized ADR 0426 Custom Field Migration Item Commit; ADR 0434 serializes each option-maintenance owner or dependency commit through the same lane, and ADR 0438 admits progressive validation outcomes through it, even when bounded preparation runs in parallel ahead of those commit boundaries.

<a id="0430-p002"></a>

After each item commits or rolls back, the lane yields admission to interactive Custom Field edits and other foreground database work, while search, requested preview and workspace interaction receive resource priority. Pause, permitted cancellation, Library Switch, memory/thermal/power pressure, responsiveness reduction and task reordering affect only future item admission; an already admitted item finishes or rolls back at its bounded atomic boundary and is never force-interrupted. Before each commit, current task-specific evidence is revalidated under ADR 0426, ADR 0434 or ADR 0438, so parallel preparation cannot turn stale work into an overwrite or validate against an obsolete rule. ADR 0434's no-cancel boundary for a destructive option deletion overrides the lane's ordinary cancellation behavior.

<a id="0430-p003"></a>

Confirmed Custom Field Schema Maintenance Tasks join one durable per-library queue in confirmation order. Users may pause or resume a task and reorder only tasks that have not started; they cannot move a queued task ahead by interrupting the current item. Every task is revalidated when it reaches the lane. A stale definition, option, rule, owner value or dependency returns that task to a fresh preview or explicit blocked state rather than silently adapting its frozen plan. ADR 0438 constraint work is always bound to the exact active rule revision, so a later rule change replaces rather than mutates its plan. A user-paused task remains paused, while an ADR 0278 switch-paused task resumes only under that ADR's same-library reconciliation.

<a id="0430-p004"></a>

**Pause Custom Field Schema Maintenance Task** affects only the selected task. Its current item finishes or rolls back, the task becomes ineligible without losing its durable queue position, and the next eligible queued task may use the lane. Resume makes that task eligible at its retained position but never preempts a task or item already Running. **Pause All Custom Field Schema Maintenance** is a separate lane-wide admission stop: after the current item settles, no maintenance task starts another item. Application Status Center uses this lane-wide action; Resume Eligible Custom Field Maintenance reopens the lane without resuming any task that the user paused individually.

<a id="0430-p005"></a>

A device-local **Custom Field Maintenance Performance Profile** stores separate foreground and background admission choices. Energy Saver, Balanced and Full Speed are available in both contexts, Balanced is the default, and background also permits Pause. Background-profile Pause is a contextual admission gate only: returning to foreground automatically reapplies the foreground profile, while user-paused tasks and Pause All Custom Field Schema Maintenance remain paused until their corresponding explicit Resume action. The profile limits bounded preparation and future admission only; it is not a promised CPU percentage, database batch size, completion time or permission to bypass safety. When no competing work exists, the active task may use all capacity currently proven safe within the selected profile. Interactive demand or hard resource pressure always reduces or stops new work before profile preference.

<a id="0430-p006"></a>

Background continuation requires the normal discoverable application process and projects aggregate Running, Queued, Paused, Waiting and Needs Attention state through ADR 0174 Application Status Center; it installs no daemon or login helper and never outlives explicit Quit. ADR 0431 fixes responsiveness acceptance, profile capacity ratios, memory headroom and representative 100,000-owner validation without changing this ADR's queue or write-serialization boundary.

<a id="adr-0431"></a>

## 0431 · Custom Field Schema Maintenance Has Fixed Cross-Platform Responsiveness Acceptance

决定来源：[0431-custom-field-migration-has-fixed-cross-platform-responsiveness-acceptance.md](../../adr/0431-custom-field-migration-has-fixed-cross-platform-responsiveness-acceptance.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0431-p001"></a>

A cooperative schema-maintenance scheduler is not sufficient if its profiles can still make a 100,000-owner library unresponsive. **Custom Field Maintenance Responsiveness Guard** is therefore a fixed cross-platform release acceptance contract, not a configurable quality level: interaction-to-visible-response latency is at most 100 ms p95 and 250 ms p99, Asset Library grid frame time is at most 33 ms p95, no UI freeze exceeds 500 ms, and Pause feedback becomes visibly acknowledged within 200 ms without claiming that an admitted item has already stopped.

<a id="0431-p002"></a>

**Custom Field Maintenance Safe Capacity** is the current host-proven upper bound on parallel task-appropriate preparation units after memory, database, thermal, power and interaction evidence; it never increases ADR 0430's one serialized item-write lane. Energy Saver admits at most 25% of that capacity, Balanced at most 50%, and Full Speed at most 100%, rounded down but at least one preparation unit when the profile is not Pause and one unit remains safe. Energy Saver preserves at least 40% physical-memory headroom, Balanced at least 30%, and Full Speed preserves the device-local **Custom Field Maintenance Memory Reserve**, default 20% with a validated 10%–50% range. Operating-system pressure and hard correctness guards may always admit less or nothing.

<a id="0431-p003"></a>

The reserve uses the shared synchronized percentage input and slider UI but changes future admission only. It cannot increase write concurrency, weaken target validation, allow stale-value overwrite, hide unresolved items or reinterpret a conversion rule. Background work uses reduced process and disk-I/O priority, while background-profile Pause admits zero new work until foreground return; user task/lane pauses retain ADR 0430's distinct explicit-resume semantics.

<a id="0431-p004"></a>

Formal release builds validate controlled non-private 100,000-owner libraries on the same macOS Apple M1/16 GB/SSD and documented approximately 2020-class four-core/eight-thread Windows x64/16 GB/SSD profiles used by ADR 0410. These **Custom Field Maintenance Performance Reference Devices** are evidence fixtures, not installation gates, Minimum Supported System Requirements or completion-time promises. Validation covers high-count lossless conversion, rule/manual mapping with conflicts and unconvertible values, Select-option merge, permanent option deletion, restrictive constraint revalidation with mixed outcomes, and maintenance under repeated grid scrolling, search/filter changes, preview requests and interactive field edits; it never reads user assets or runtime library data.

<a id="0431-p005"></a>

Missing any responsiveness target for three consecutive one-second windows reduces future preparation admission and, when needed, delays the next item admission. Capacity restores by at most one step only after every target and resource guard remains healthy for 15 consecutive seconds. Immediate memory, database, thermal, power or storage danger bypasses these windows and stops new admission at once. No reduction force-interrupts an ADR 0426, ADR 0434 or ADR 0438 item commit, rolls back proven completed items, or changes the task's validated result.

<a id="0431-p006"></a>

A release failing this acceptance must optimize or reduce throughput. It cannot shrink the 100,000-owner fixture, remove difficult conversion paths, disable representative concurrent interaction, weaken validation, conceal unfinished work, raise the reference-device class, or reinterpret the benchmark as unsupported hardware merely to pass.

<a id="adr-0434"></a>

## 0434 · Large Select-Option Changes Run As Resumable Maintenance Tasks With Risk-Specific Undo

决定来源：[0434-large-select-option-changes-run-as-resumable-maintenance-tasks-with-risk-specific-undo.md](../../adr/0434-large-select-option-changes-run-as-resumable-maintenance-tasks-with-risk-specific-undo.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0434-p001"></a>

A Select-option merge or permanent deletion may touch 100,000 owners and must neither monopolize the library nor pretend to be one reversible schema edit. Each confirmed plan therefore becomes a durable library-bound **Custom Field Option Maintenance Task** in ADR 0430's single **Custom Field Schema Maintenance Lane**, shared with type migrations under ADR 0431 responsiveness and resource guards. Current values and unresolved suggestions commit atomically per Candidate or Design Asset, dependency changes commit atomically per dependent object, and all commits serialize through the lane. Pause and Library Switch stop future admission at these boundaries; restart reconciles committed and pending work, and changed evidence becomes a visible conflict or failure rather than an overwrite.

<a id="0434-p002"></a>

Custom Field Option Merge may be cancelled at an item boundary, leaving completed replacements truthfully reported. Its terminal result is an ADR 0086 Reviewed Batch Action whose complete detail and **Custom Field Option Merge Undo Window** share a user-configurable 30-day default beginning only after explicit result review and confirmation of the source option's resulting lifecycle. **Undo Custom Field Option Merge** restores only unchanged merge effects—including exact Single/Multi Select membership, unresolved-suggestion identity and compatible dependency references—and excludes later-edited or conflicting objects. It restores the source lifecycle only when ADR 0433 permits it, never deletes the target option or rolls back unrelated metadata; early result clearing ends Undo and expiry leaves only value-free aggregate detail under ADRs 0087 and 0429.

<a id="0434-p003"></a>

Permanent Delete Custom Field Select Option remains cancellable only until its first destructive item commit. Confirmation immediately blocks new manual, AI and import assignment to the option; after destruction starts, the task may be paused and resumed but cannot be cancelled or undone, and every completed removal remains authoritative. The option stays visibly **Custom Field Option Deletion In Progress** while remaining durable values continue to query by their exact identity with partial-coverage disclosure. Conflicts or failures block finalization. Only after no value or suggestion retains the identity and every required dependency placeholder is durably committed may the option definition and search projection be deleted. Its terminal action follows ADR 0087 Hard Delete retention with a user-configurable 90-day-default irreversible summary; result-history expiry never clears an unfinished task, conflict or missing-reference repair need.
