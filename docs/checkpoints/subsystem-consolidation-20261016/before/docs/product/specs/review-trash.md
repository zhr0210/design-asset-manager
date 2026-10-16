# 筛选、审查与回收站：详细能力契约

本文承接原ADR中的细节，保留所有原数字、例外、状态和相互约束；[来源映射](../../checkpoints/documentation-rebuild-20261015/adr-migration.json)逐段核对。**有效要求不是当前交付声明，也不是本轮实施队列。** 现行已批准产品/设计在其明确替代范围内优先；不凭实现缺失判决定无效。

当前系统从[library-lifecycle](../../subsystems/library-lifecycle.md)进入；当前实际能力/版本见[CURRENT-STATE](../../handoff/CURRENT-STATE.md)，交互与视觉分别归[交互目录](../../design/README.md)/[DESIGN](../../../DESIGN.md)。详细条款按下面独立主题定位，不全量装入每次上下文。

## 主题导航

- [0044 · Default System Smart Filters Cover Review and Recency](#adr-0044)
- [0046 · Smart Filter Results Hide Empty Groups](#adr-0046)
- [0049 · Smart Filter Counts Match Filter Ownership](#adr-0049)
- [0050 · System Smart Filters Default to Unresolved Review Signals](#adr-0050)
- [0053 · Retention Extension Supports Single and Batch Actions](#adr-0053)
- [0056 · Recovered Candidate Indicator Fades After Seven Days](#adr-0056)
- [0057 · Capture Cleanup History Shows Minimal Recovery Fields](#adr-0057)
- [0062 · Candidate Promotion Feedback Keeps Review Context](#adr-0062)
- [0070 · Asset Trash Is a Library Utility Entry](#adr-0070)
- [0076 · Candidate Cards Show One Primary State Badge](#adr-0076)

<a id="adr-0044"></a>

## 0044 · Default System Smart Filters Cover Review and Recency

决定来源：[0044-default-system-smart-filters-cover-review-and-recency.md](../../adr/0044-default-system-smart-filters-cover-review-and-recency.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0044-p001"></a>

The default System Smart Filters should include suspected duplicates, tag
suggestions awaiting confirmation, candidates nearing expiration, and recent
captures. Suspected duplicates, pending tag suggestions, and expiration are
review-focused System Smart Filters with unresolved Review Signal semantics.
Recent Captures is an informational system-provided dynamic view with Match
Count semantics; recency is not unresolved work and does not create an
attention badge.

<a id="0044-p002"></a>

ADR 0413 removes Unsorted membership from default review work. Users can browse
the protected collection directly or explicitly save an ordinary User Smart
Filter for that scope, but the application does not create an Unfiled System
Smart Filter, unresolved signal or attention count merely because an asset has
no more specific collection.

<a id="adr-0046"></a>

## 0046 · Smart Filter Results Hide Empty Groups

决定来源：[0046-smart-filter-results-hide-empty-groups.md](../../adr/0046-smart-filter-results-hide-empty-groups.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0046-p001"></a>

Smart Filter result pages should render only Smart Filter Result Groups that
currently contain matches. Empty asset or candidate groups should not occupy
the main results surface, because the primary task is scanning actionable
matches.

<a id="0046-p002"></a>

When a hidden group has zero matches, the filter details surface should still
explain that there are currently no matching design assets or no matching asset
candidates. This keeps the main grid focused while preserving enough feedback
to understand the full filter scope.

<a id="0046-p003"></a>

Under ADR 0447, hiding an empty owner-type result group does not remove its zero
subtotal from Duplicate Text filter details or imply that the comparison was
restricted to the visible type.

<a id="adr-0049"></a>

## 0049 · Smart Filter Counts Match Filter Ownership

决定来源：[0049-smart-filter-counts-match-filter-ownership.md](../../adr/0049-smart-filter-counts-match-filter-ownership.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0049-p001"></a>

Review-focused System Smart Filter count badges should show Review Signal
Count: the number of unresolved review signals that still need attention. They
should not show the full Match Count when that would make resolved matches look
like active work. An informational system-provided view such as Recent Captures
uses Match Count and never presents that count as attention.

<a id="0049-p002"></a>

User Smart Filter count badges should show Match Count by default, because
user-created filters are saved views rather than product-owned review queues.
This keeps system numbers aligned with work pressure while keeping user filter
numbers aligned with query scope.

<a id="adr-0050"></a>

## 0050 · System Smart Filters Default to Unresolved Review Signals

决定来源：[0050-system-smart-filters-default-to-unresolved-review-signals.md](../../adr/0050-system-smart-filters-default-to-unresolved-review-signals.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0050-p001"></a>

Review-focused System Smart Filter result pages should default to unresolved
Review Signals. Resolved Review Signals should leave the main review result
surface so those filters behave like clearable review queues rather than
permanent search pages. Informational system-provided views such as Recent
Captures are ordinary dynamic result views and are not governed by this
unresolved-only default.

<a id="0050-p002"></a>

Resolved signals should remain available through filter details, a show
resolved mode, or Review History. This lets users clear duplicate review, tag
confirmation, and expiration queues without losing traceability for
past decisions.

<a id="adr-0053"></a>

## 0053 · Retention Extension Supports Single and Batch Actions

决定来源：[0053-retention-extension-supports-single-and-batch-actions.md](../../adr/0053-retention-extension-supports-single-and-batch-actions.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0053-p001"></a>

Retention Extension should be available for both a single asset candidate and a
Candidate Batch Action. The default extension choices should be 7 days, 30
days, and a custom date, with batch extension showing the number of candidates
that will be affected before confirmation.

<a id="0053-p002"></a>

Extending retention keeps candidates in Capture Inbox and does not promote them
into the Asset Library. This gives users relief during large capture sessions
without turning candidate storage into implicit library admission or a silent
permanent archive.

<a id="adr-0056"></a>

## 0056 · Recovered Candidate Indicator Fades After Seven Days

决定来源：[0056-recovered-candidate-indicator-fades-after-seven-days.md](../../adr/0056-recovered-candidate-indicator-fades-after-seven-days.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0056-p001"></a>

Recovered Candidates should show a prominent Recovered State Indicator for the
first 7 days after Candidate Restore, then move that status into candidate
details and history. The indicator should explain why the candidate returned to
Capture Inbox without making restored candidates feel permanently exceptional.

<a id="0056-p002"></a>

Asset Source and Capture Batch records should remain permanently attached to
the candidate. This keeps source traceability and capture provenance stable
while letting the temporary recovery emphasis fade from the main review
surface.

<a id="adr-0057"></a>

## 0057 · Capture Cleanup History Shows Minimal Recovery Fields

决定来源：[0057-capture-cleanup-history-shows-minimal-recovery-fields.md](../../adr/0057-capture-cleanup-history-shows-minimal-recovery-fields.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0057-p001"></a>

Capture Cleanup History should show only the fields needed to understand and
act on recoverable cleaned candidates: thumbnail, source, Cleanup Reason,
cleanup time, Recoverable Until, and restore or Hard Delete actions.

<a id="0057-p002"></a>

This keeps cleanup history focused on recovery instead of becoming a broad
audit surface. Users can see why a candidate was cleaned, when the safety net
ends, and what action remains available without scanning unrelated metadata.

<a id="adr-0062"></a>

## 0062 · Candidate Promotion Feedback Keeps Review Context

决定来源：[0062-candidate-promotion-feedback-keeps-review-context.md](../../adr/0062-candidate-promotion-feedback-keeps-review-context.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0062-p001"></a>

After single or batch Candidate Promotion, the app should keep the user in the
Candidate Review Page by default, remove promoted candidate cards from the
active review set, update Capture Inbox counts, and show Promotion Feedback.
Promotion Feedback should include Reveal in Library and a short-lived Undo
Promote action. Batch promotion should report the promoted count and target
Asset Collection without automatically navigating away from the review flow.

<a id="0062-p002"></a>

This preserves high-throughput candidate review while still giving users a
clear way to verify where promoted assets landed and correct accidental
promotion.

<a id="adr-0070"></a>

## 0070 · Asset Trash Is a Library Utility Entry

决定来源：[0070-asset-trash-is-a-library-utility-entry.md](../../adr/0070-asset-trash-is-a-library-utility-entry.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0070-p001"></a>

Asset Trash should appear as a Library Utility Entry at the bottom of
Workspace Navigation rather than inside the Asset Collection tree or hidden in
settings. When non-empty, it should show a quiet Trash Count instead of an
urgent error-style badge. Trash Surface should use an asset-grid-style browsing
layout with an inspector for deleted asset details, making Asset Restore and
Permanent Asset Delete the primary actions while keeping deleted assets
separate from normal collection browsing.

<a id="adr-0076"></a>

## 0076 · Candidate Cards Show One Primary State Badge

决定来源：[0076-candidate-cards-show-one-primary-state-badge.md](../../adr/0076-candidate-cards-show-one-primary-state-badge.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0076-p001"></a>

Candidate cards should show one primary Candidate State Badge instead of
stacking every state and review reason on the grid. State Priority should put
Required Review and blocking review risks first, then source states such as
Recovered Candidate, Reopened Candidate, or Superseded Candidate, and then
Retention Warning. The Asset Inspector should show the full Review Reason list
so the grid stays scannable while details remain complete.
