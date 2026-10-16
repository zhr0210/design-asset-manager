# 工作台与导航：详细能力契约

本文承接原ADR中的细节，保留所有原数字、例外、状态和相互约束；[来源映射](../../checkpoints/documentation-rebuild-20261015/adr-migration.json)逐段核对。**有效要求不是当前交付声明，也不是本轮实施队列。** 现行已批准产品/设计在其明确替代范围内优先；不凭实现缺失判决定无效。

当前系统从[asset-workspace](../../subsystems/gui-shell.md#asset-workspace)进入；当前实际能力/版本见[CURRENT-STATE](../../handoff/CURRENT-STATE.md)，交互与视觉分别归[交互目录](../../design/README.md)/[DESIGN](../../../DESIGN.md)。详细条款按下面独立主题定位，不全量装入每次上下文。

## 主题导航

- [0021 · Asset Grid Defaults to Masonry with Uniform Option](#adr-0021)
- [0023 · Asset Inspector Is Resizable and Responsive](#adr-0023)
- [0024 · Asset Grid Uses Desktop Selection Semantics](#adr-0024)
- [0025 · Asset Preview Stays Contextual](#adr-0025)
- [0027 · Candidate Review Page Uses a Candidate Grid](#adr-0027)
- [0029 · Candidate Expiration Is Non-Interruptive](#adr-0029)
- [0030 · Web Capture Success Keeps Source Context](#adr-0030)
- [0035 · Workspace Navigation Supports Rail and Panel](#adr-0035)
- [0036 · Workspace Toolbar Is Contextual](#adr-0036)
- [0038 · Global Search Results Are Grouped By Library Object Type](#adr-0038)

<a id="adr-0021"></a>

## 0021 · Asset Grid Defaults to Masonry with Uniform Option

决定来源：[0021-asset-grid-defaults-to-masonry-with-uniform-option.md](../../adr/0021-asset-grid-defaults-to-masonry-with-uniform-option.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0021-p001"></a>

Asset Grid should default to Masonry Grid so varied design references,
posters, screenshots, product images, illustrations, and long-form captures
can be scanned densely while preserving their visual proportions. Uniform Grid
should remain available as a first-class switch for cases where direct
comparison matters more than aspect-ratio fidelity.

<a id="0021-p002"></a>

This balances high-volume browsing with design-review precision.
Masonry Grid supports rapid inspiration scanning, while Uniform Grid supports
UI screenshots, icons, component references, and other asset sets where equal
tile rhythm makes differences easier to see.

<a id="adr-0023"></a>

## 0023 · Asset Inspector Is Resizable and Responsive

决定来源：[0023-asset-inspector-is-resizable-and-responsive.md](../../adr/0023-asset-inspector-is-resizable-and-responsive.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0023-p001"></a>

The persistent right-side Asset Inspector should default visible on desktop,
while remaining resizable and collapsible. The user's inspector width and
collapsed state should be remembered for the workspace so repeated asset review
feels stable across selection changes and app sessions.

<a id="0023-p002"></a>

The inspector must have layout guardrails: minimum and maximum widths should
protect the Asset Grid's scanning area, resizing should reflow grid columns
without overlapping asset cards, and collapsing the inspector should preserve
the current asset selection. On narrow windows, the inspector should become a
right-side drawer or bottom detail layer for the selected asset instead of
permanently consuming grid space.

<a id="0023-p003"></a>

ADR 0453 Expanded Text editors may resize vertically only within the available
Inspector or responsive detail-layer bounds. Resizing must not create
horizontal overflow, hide the field's validation evidence or turn the current
editor height into portable Custom Field Definition metadata.

<a id="0023-p004"></a>

This keeps high-density always-available detail inspection on desktop without
making the Asset Grid feel cramped, unstable, or visually overloaded.

<a id="adr-0024"></a>

## 0024 · Asset Grid Uses Desktop Selection Semantics

决定来源：[0024-asset-grid-uses-desktop-selection-semantics.md](../../adr/0024-asset-grid-uses-desktop-selection-semantics.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0024-p001"></a>

Asset Grid should follow desktop library semantics for selection and preview:
single-click selects an asset and updates the right-side Asset Inspector,
double-click opens Asset Preview, Space opens or closes quick preview, and
multi-select changes the inspector into Batch Inspector mode.

<a id="0024-p002"></a>

Multi-selection should preserve the grid as the primary context. The Batch
Inspector should show aggregate information, shared metadata, mixed-value
states, batch tag actions, batch collection membership actions, and applicable
asset actions without forcing users into a separate modal workflow.

<a id="0024-p003"></a>

This matches Finder-like expectations for high-volume asset browsing:
selection is lightweight, preview is fast, and batch work remains adjacent to
the grid instead of replacing it.

<a id="adr-0025"></a>

## 0025 · Asset Preview Stays Contextual

决定来源：[0025-asset-preview-stays-contextual.md](../../adr/0025-asset-preview-stays-contextual.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0025-p001"></a>

Asset Preview should open as a contextual quick-preview layer over the Asset
Grid, not as a separate page or replacement workspace. Double-click or Space
opens it, Esc closes it, arrow keys move through neighboring assets, and the
preview supports zooming and panning while preserving the current grid
selection and right-side Asset Inspector context.

<a id="0025-p002"></a>

When an ADR 0465 Custom Field Edit Draft has focus, keyboard ownership is
contextual: an active IME consumes its own Enter or Escape first; otherwise the
typed editor's Escape behavior resolves the active uncommitted draft before it
may close Asset Preview. Asset previous/next navigation invokes the Unsaved
Custom Field Changes Gate when required and never treats preview navigation as
permission to discard a draft. ADR 0466 keeps previous/next movement blocked
after any partial multi-draft resolution and returns focus to the first
remaining blocker.

<a id="0025-p003"></a>

This keeps high-volume review fast in the Finder style: users can
inspect details at a larger size without losing their place in the Asset Grid,
without hiding the inspector workflow, and without paying a navigation cost for
each previewed asset.

<a id="0025-p004"></a>

Compare View is the transient multi-asset form of this preview context. It may
start from Search Focus View, Asset Grid selection, or an Asset Collection and
keeps two to four assets visible at once. A larger selection remains available
through a candidate strip rather than shrinking every item into one viewport.
Each pane uses the same validated preview path and begins with independent pan
and zoom; synchronized zoom is an explicit option only when the selected visual
units are compatible. The comparison surface may expose differences in
dimensions, format, color state, tags, source, and analysis results and keeps
each asset's external open, drag, copy, and export actions available.

<a id="0025-p005"></a>

Compare View is Ephemeral Search Session or current-workspace presentation
state according to its source. It owns no asset, Collection Membership, Smart
Filter, saved result, or Collection Board arrangement, and closing it restores
the originating selection and workspace context.

<a id="0025-p006"></a>

ADR 0405 governs device-local external-open preferences, source-exact Original
Handoff, and the rule that preview media never substitutes for an unavailable
current original. Those actions remain available from contextual preview, but
their source-fidelity and compound-set semantics are independent of preview UI.

<a id="0025-p007"></a>

ADR 0406 governs validated material original changes: the Design Asset identity
is preserved, Source Content Generation advances, user-authored organization
remains attached, and generation-bound derived evidence becomes stale. That
content lifecycle applies equally when a change is observed from contextual
preview or elsewhere.

<a id="0025-p008"></a>

Under ADR 0148, professional-format detail is progressively revealed over the
persistent overview. Pan, zoom, asset navigation, and metadata review remain
interactive while current-viewport tiles load or a failed region retries.

<a id="adr-0027"></a>

## 0027 · Candidate Review Page Uses a Candidate Grid

决定来源：[0027-candidate-review-page-uses-candidate-grid.md](../../adr/0027-candidate-review-page-uses-candidate-grid.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0027-p001"></a>

Candidate Review Page should default to a Candidate Grid with status filters,
Capture Batch grouping, and batch actions, rather than a plain download list.
Users should be able to filter pending candidates, candidates with Duplicate
Signals, candidates with Tag Suggestions awaiting confirmation, and rejected
candidates.

<a id="0027-p002"></a>

Selecting one candidate should update the right-side Asset Inspector; selecting
multiple candidates should switch the right side to Batch Inspector mode. This
keeps capture review visually close to the Asset Grid model while giving
capture-specific workflows enough structure for source batches, confirmation,
rejection, tag review, duplicate handling, and batch organization.

<a id="adr-0029"></a>

## 0029 · Candidate Expiration Is Non-Interruptive

决定来源：[0029-candidate-expiration-is-non-interruptive.md](../../adr/0029-candidate-expiration-is-non-interruptive.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0029-p001"></a>

Asset candidates nearing expiration should show a Retention Warning in the
Candidate Review Page and the right-side Asset Inspector, including remaining
days before cleanup. Users should be able to extend retention, delete
immediately, or restore rejected candidates to pending review from both single
candidate and batch contexts.

<a id="0029-p002"></a>

The app should not show interruptive expiration notifications by default. The
dedicated Capture Inbox entry should carry a count badge for candidates that
need attention, keeping cleanup visible without disrupting normal asset
browsing or review work.

<a id="adr-0030"></a>

## 0030 · Web Capture Success Keeps Source Context

**适用范围：本节保留已退休网页采集的来源上下文；不得恢复嵌入式网页/网站登录入口。仅未来明确获批producer的来源保持语义可按适用范围借鉴。**

决定来源：[0030-web-capture-success-keeps-source-context.md](../../adr/0030-web-capture-success-keeps-source-context.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0030-p001"></a>

Successful web capture should not navigate the user into Candidate Review Page
by default. The Web Capture Entry should stay in the current source context,
show Capture Feedback with a source-to-Capture Inbox entry motion, and update
the Capture Inbox entry badge so users can continue collecting without
interruption.

<a id="0030-p002"></a>

Candidate review remains an intentional workspace switch through the dedicated
left-side Capture Inbox entry. This preserves ADR 0413 Search-First
Organization: collection can continue without interruption, while acquisition
validation and optional later review remain visible and reachable.

<a id="adr-0035"></a>

## 0035 · Workspace Navigation Supports Rail and Panel

**适用范围：导航形式须以当前已批准工作台/全窗口设置交互为准；旧分区/菜单条款在其被明确替代范围仅作来源，不恢复已退休菜单。**

决定来源：[0035-workspace-navigation-supports-rail-and-panel.md](../../adr/0035-workspace-navigation-supports-rail-and-panel.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0035-p001"></a>

Workspace Navigation should support two coordinated forms: a compact
Navigation Rail and an expanded Navigation Panel. Desktop should default to the
expanded panel, while narrow windows or user collapse should keep the rail
visible with icons, active state, and badges.

<a id="0035-p002"></a>

Hover or click can temporarily reveal the Navigation Panel from the rail, and a
user-pinned expanded state should be remembered. Collapsing navigation must not
hide important review counts: Capture Inbox, Smart Filters, referenced-source
offline/missing/exception attention, and other attention-bearing entries should
keep aggregate badge visibility in the rail without exposing private source
names or paths.

<a id="0035-p003"></a>

This preserves high information density when space allows while keeping
the Asset Grid wide enough for visual scanning when the user or viewport needs
more room.

<a id="adr-0036"></a>

## 0036 · Workspace Toolbar Is Contextual

决定来源：[0036-workspace-toolbar-is-contextual.md](../../adr/0036-workspace-toolbar-is-contextual.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0036-p001"></a>

Workspace Toolbar should serve the currently active workspace rather than act
as a global command dumping ground. Asset Grid toolbar controls should focus on
search, view mode, sorting, filtering, and thumbnail size; when a Sources
Section selection applies Source Scope, that scope remains visibly labeled with
a clear-scope action instead of becoming a hidden filter. Candidate Review Page
toolbar controls should focus on Capture Batch filters, Candidate Status
filters, Batch Promotion, and rejection actions; Web Capture Entry toolbar
controls should focus on URL navigation, back and forward navigation, and
capture controls.

<a id="0036-p002"></a>

This keeps each workspace operationally dense without making the top of the app
feel like a mixed global menu. Global navigation stays in Workspace Navigation,
while toolbar actions stay close to the content they modify.

<a id="0036-p003"></a>

When sorting by a Text Custom Field, ADR 0451 keeps the chosen field, direction,
Natural/Exact mode and any Natural language visible from the sort control
rather than hiding them behind the current operating-system locale.

<a id="adr-0038"></a>

## 0038 · Global Search Results Are Grouped By Library Object Type

决定来源：[0038-cross-library-search-results-are-grouped.md](../../adr/0038-cross-library-search-results-are-grouped.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0038-p001"></a>

Search Palette searches **Searchable Library Objects** and groups results by
their object type: Design Assets, Asset Candidates, Asset Collections, Tags,
Asset Sources, and Smart Filters including Saved Searches. Current-Library
Global Search applies those groups to the active library; Cross-Library Search
federates the same groups across eligible Registered Libraries and visibly
preserves each result's library identity and availability. Each Search Result
Group should show a small set of high-relevance results by default, with a way
to expand or drill into the full group when needed.

<a id="0038-p002"></a>

Object type is the default top-level organization. Every row keeps a visible
library and availability badge. Users can filter to selected Registered
Libraries or explicitly change the presentation to group by library, but
library-first grouping is not the default and neither operation activates a
library. ADR 0404 owns Cross-Library Rank Fusion and its prohibition on comparing
incompatible raw scores.

<a id="0038-p003"></a>

Within one content-bearing Search Result Group, independently owned objects
with verified byte-identical current Source Content Generations may fold into
one **Exact-Content Result Cluster** to prevent repeated identical rows. The
cluster visibly reports its occurrence count and represented Registered
Libraries, expands to every independent result, and requires a concrete
occurrence before an original, edit, metadata, navigation, or handoff action.
Each occurrence keeps its own object identity, library instance, tags,
collections, source, lifecycle, availability, rank evidence, and action state.
Copies that share Portable Library Lineage Identity remain distinct Local
Library Instances and are not treated as synchronized.

<a id="0038-p004"></a>

Clustering is presentation only, can be disabled to show every occurrence, and
creates no durable object, shared metadata, Duplicate Signal decision, merge,
deletion, or preferred copy. Filename equality, visual similarity, perceptual
hash proximity, ordinary Duplicate Signal, or incomplete/stale content evidence
never qualifies. An offline occurrence always remains separate because its
catalog cannot prove current external bytes; only reconnection, current-content
verification, and an explicit search refresh can make it eligible. Cluster
membership freezes with the Ephemeral Search Session's participating snapshots
and changes only after explicit refresh.

<a id="0038-p005"></a>

Object visibility remains owned by its normal lifecycle rather than by search.
ADR 0069 hides deleted Design Assets unless Include Deleted is explicit, and
candidate results retain Candidate Identity and Candidate Review semantics
instead of becoming Design Assets. Import/analysis tasks, queue entries, error
records and maintenance state may contribute status or filters to their owning
object but are not independent Search Result Groups. Models, plugins, settings,
and application commands are outside library-object search.

<a id="0038-p006"></a>

Search results should be keyboard-first: arrow keys move selection, Space
opens or closes quick preview for an eligible asset result, and Enter closes
the palette and opens a Search Focus View appropriate to the result object and
its library state. Selection or inspection of a non-active-library result stays
read-only; an action requiring target-library activation follows ADR 0277. The
focus view is transient and retains the search result context; it does not
create a collection, Smart Filter, or durable search record.

<a id="0038-p007"></a>

An asset Search Focus View shows every Collection Membership. Reveal in
Collection changes navigation context only after the user selects the target
when more than one membership exists; search never invents a primary
collection. Leaving the focus view restores the prior collection, filters,
sort, scroll position, and selection.

<a id="0038-p008"></a>

The Search Focus View keeps the originating Ephemeral Search Session and lets
the user move backward or forward through the same asset Search Result Group.
Crossing a loaded boundary fetches the next stable page on demand rather than
loading the complete result set. Returning to Search Palette restores its
query, selected group, result position, and selected item. Background index or
metadata changes may expose Results Available to Refresh but never insert,
remove, or reorder the active comparison sequence; only explicit refresh
adopts a newer query-plan/index generation. Cross-library pagination binds the
participating library snapshots and rank-fusion policy version for that same
session so a late or refreshed library cannot silently reorder an active page
or alter an Exact-Content Result Cluster.

<a id="0038-p009"></a>

Command/Ctrl+Enter explicitly opens an eligible asset original under ADR
0405's device-local External Open Preference and operating-system fallback; it
does not create a second workspace context. Escape closes the palette without
changing the prior workspace state. A referenced original that is unavailable
routes the external-open action to relink recovery instead of failing silently.
This keeps global search fast without flattening unlike objects into one
confusing list or launching a heavyweight external application on ordinary
Enter.
