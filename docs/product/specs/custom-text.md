# 文本字段、检索与编辑：详细能力契约

本文承接原ADR中的细节，保留所有原数字、例外、状态和相互约束；[来源映射](../../checkpoints/documentation-rebuild-20261015/adr-migration.json)逐段核对。**有效要求不是当前交付声明，也不是本轮实施队列。** 现行已批准产品/设计在其明确替代范围内优先；不凭实现缺失判决定无效。

当前系统从[organization](../../subsystems/library-lifecycle.md#organization)进入；当前实际能力/版本见[CURRENT-STATE](../../handoff/CURRENT-STATE.md)，交互与视觉分别归[交互目录](../../design/README.md)/[DESIGN](../../../DESIGN.md)。详细条款按下面独立主题定位，不全量装入每次上下文。

## 主题导航

- [0446 · Duplicate Text Comparison Keys Are Versioned Derived Evidence](#adr-0446)
- [0447 · Duplicate Text Findings Span Live Owner Types With Explicit Lifecycle Scope](#adr-0447)
- [0448 · Duplicate Text Finding Sessions Refresh Explicitly and Never Mutate in Place](#adr-0448)
- [0449 · Duplicate Text Findings Have No Resolution or Suppression Lifecycle](#adr-0449)
- [0450 · Text Custom Field Filters Use Complete Explicit Operator Semantics](#adr-0450)
- [0451 · Text Custom Field Sorting Is Versioned Natural or Exact and Keeps Missing Last](#adr-0451)
- [0452 · Distinct Text Value Browsing Is On Demand, Generation Bound, and Never Schema](#adr-0452)
- [0453 · Text Editor Presentation Is Portable, Reversible, And Content-Neutral](#adr-0453)
- [0454 · Text Edit Drafts Are Revision-Bound And Commit Only At Defined Boundaries](#adr-0454)
- [0456 · Manual Text Edit Undo Is Layered, Revision-Guarded, And Session-Only](#adr-0456)
- [0457 · Batch Text Editing Uses Reviewed Frozen Plans And Per-Owner Commits](#adr-0457)

<a id="adr-0446"></a>

## 0446 · Duplicate Text Comparison Keys Are Versioned Derived Evidence

决定来源：[0446-duplicate-text-comparison-keys-are-versioned-derived-evidence.md](../../adr/0446-duplicate-text-comparison-keys-are-versioned-derived-evidence.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0446-p001"></a>

ADR 0445 duplicate discovery needs deterministic grouping without treating a comparison transform as stored metadata. **Exact Duplicate Text Comparison** uses the authoritative NFC scalar sequence unchanged. **Case-Insensitive Duplicate Text Comparison** applies locale-independent Unicode full case folding and then NFC, but does not trim, collapse whitespace, remove diacritics or discard valid formatting; it is deliberately distinct from ADR 0444 pattern matching's simple fold and from ADR 0433 name comparison's additional edge trimming.

<a id="0446-p002"></a>

**Normalized Duplicate Text Comparison** applies the pinned Unicode version's `NFKC_Casefold`, including its standard compatibility and default-ignorable handling, then maps each maximal Unicode White_Space run to one U+0020 and removes leading/trailing U+0020. It adds no diacritic or punctuation stripping beyond that standard transform. Thus compatibility forms, casing and spacing may group while distinct accents or ordinary punctuation remain distinct. A whitespace-only or default-ignorable-only present value may produce an empty **Duplicate Text Comparison Key** and group with another present empty-key value, but Missing remains excluded.

<a id="0446-p003"></a>

Every key carries its comparison-policy and Unicode-data versions, is rebuildable, and never replaces, repairs or hides the original value. Duplicate groups show their selected mode and original distinct forms, including invisible-character evidence when relevant; ADR 0447 binds grouping to the explicit owner/lifecycle scope and one current-owner projection generation. A version upgrade requires reviewed library-schema migration with groups-added, groups-split and membership-changed impact before rebuilding keys; it changes no value, validation status, saved-filter identity, asset identity or Promotion outcome and never enters ADR 0438 constraint revalidation.

<a id="0446-p004"></a>

ADR 0450 reuses these three whole-value transform semantics and version
boundaries for ordinary Text Filter Comparison Modes, but not this derived-key
identity or duplicate-group projection. Equality and substring filtering remain
ordinary hard constraints and create no Duplicate Text Value Finding.

<a id="0446-p005"></a>

ADR 0452 may group Distinct Text Value Browser entries by those same transforms
and versions while showing original forms and counts. The grouping remains
read-only query projection and never promotes a comparison key into schema,
stored Text or a Select option.

<a id="adr-0447"></a>

## 0447 · Duplicate Text Findings Span Live Owner Types With Explicit Lifecycle Scope

决定来源：[0447-duplicate-text-findings-span-live-owner-types-with-explicit-lifecycle-scope.md](../../adr/0447-duplicate-text-findings-span-live-owner-types-with-explicit-lifecycle-scope.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0447-p001"></a>

A library-wide ADR 0445 Duplicate Text Value Finding must reveal a pending Candidate value that already occurs on a confirmed asset without collapsing their lifecycles. Its default **Duplicate Text Evaluation Scope** contains Active Candidates and non-deleted Design Assets for the exact field. All explicit query, collection and lifecycle criteria apply before grouping, and only keys with at least two current in-scope owners produce a finding. An explicit object-type criterion restricts comparison to that type; deleted Design Assets participate only with Include Deleted; Promoted Candidate Records and other Candidate History never participate. Out-of-Constraint current values remain included, while Missing remains excluded.

<a id="0447-p002"></a>

ADR 0045 still renders Candidate and Design Asset occurrences in separate Smart Filter Result Groups with their native selection and actions. Every row shows the complete duplicate-group count plus Candidate and Design Asset subtotals, and may open one read-only **Duplicate Text Comparison Panel** containing all current in-scope original forms and validation/lifecycle markers. Empty type groups follow ADR 0046, while the comparison panel grants no cross-lifecycle batch, merge, edit or identity authority.

<a id="0447-p003"></a>

Candidate Promotion and Undo Promote reassociate the current value between owner identities inside the existing atomic transaction. One query/projection generation therefore contains either the Active Candidate occurrence or the resulting Design Asset occurrence, never both; a lagging derived projection is marked stale and refreshed rather than double-counted. Archiving the field follows ADR 0420 and makes the dependent finding inactive until the same definition returns, instead of continuing to group hidden values.

<a id="0447-p004"></a>

ADR 0448 keeps that complete one-owner generation stable inside an opened
Duplicate Text Finding Session. A newer generation is disclosed separately and
adopted only through explicit refresh, never spliced into the comparison panel
or native owner groups.

<a id="adr-0448"></a>

## 0448 · Duplicate Text Finding Sessions Refresh Explicitly and Never Mutate in Place

决定来源：[0448-duplicate-text-finding-sessions-refresh-explicitly-and-never-mutate-in-place.md](../../adr/0448-duplicate-text-finding-sessions-refresh-explicitly-and-never-mutate-in-place.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0448-p001"></a>

Following ADR 0181's stable-generation principle, ADR 0445 findings are dynamic across evaluations, but each opened **Duplicate Text Finding Session** binds one complete query plan, lifecycle scope, comparison-key policy and current-owner projection generation. Later edits, imports, Candidate Promotion or Undo, deletion and restoration may expose Results Available to Refresh, yet cannot insert, remove, regroup, reorder or replace rows and counts inside the active session. The header keeps the frozen session totals distinct from the complete newer generation's prospective totals or added/removed counts; it never mixes evidence from two generations.

<a id="0448-p002"></a>

The ADR 0447 Duplicate Text Comparison Panel remains read-only. Editing opens the occurrence's normal Candidate or Design Asset Inspector, and a successful commit marks the session refreshable without optimistically removing the row, closing its group or mutating its displayed original form. Any later action reached from a frozen row must revalidate the owner's current identity and lifecycle before mutation; stale session membership grants no operation authority.

<a id="0448-p003"></a>

Explicit refresh atomically replaces the session with one complete newest generation and follows ADR 0081 result-set selection rules. Closing and later reopening a saved User Smart Filter evaluates a fresh generation; the filter persists its criteria, exact field dependency and comparison mode under ADR 0041, never duplicate memberships or a durable result snapshot. This preserves stable inspection while ensuring deliberate refresh sees current library state.

<a id="0448-p004"></a>

ADR 0449 permits session-only group collapse without changing this frozen
generation and prohibits persistent ignored/resolved result state. Only an
explicit saved filter criterion may narrow a later evaluation.

<a id="0448-p005"></a>

ADR 0452 applies the same complete-generation and explicit-refresh boundary to
Distinct Text Value Browser pages and counts, without making that browser a
Duplicate Text Finding Session or storing either result snapshot.

<a id="adr-0449"></a>

## 0449 · Duplicate Text Findings Have No Resolution or Suppression Lifecycle

决定来源：[0449-duplicate-text-findings-have-no-resolution-or-suppression-lifecycle.md](../../adr/0449-duplicate-text-findings-have-no-resolution-or-suppression-lifecycle.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0449-p001"></a>

An ADR 0445 Duplicate Text Value Finding is query evidence, not a Review Signal or attention queue. A matching group, comparison key or owner therefore has no persistent resolved, dismissed, snoozed, acknowledged, expected-duplicate or ignored state; the application creates no attention badge, Review History entry or portable suppression table for it. ADR 0051 continues to govern actual Review Signals, including content-oriented duplicate review, but does not apply merely because Text values share a comparison key.

<a id="0449-p002"></a>

The user may collapse a group only as presentation state inside the current ADR 0448 Duplicate Text Finding Session. Collapse does not change membership, totals or filter truth, is not saved or backed up, and ends with that session. This avoids letting an accepted repetition silently hide future owners that later enter the same dynamic group.

<a id="0449-p003"></a>

A User Smart Filter may instead be explicitly edited under ADR 0047 to add ADR 0450 ordinary visible Text conditions or owner, collection and lifecycle criteria. ADR 0447 applies those declared criteria before duplicate grouping; no result-row action secretly creates an exclusion, and the criteria remain inspectable and removable like every other saved filter condition. A group leaves the result only after explicit refresh evaluates fewer than two matching in-scope owners.

<a id="adr-0450"></a>

## 0450 · Text Custom Field Filters Use Complete Explicit Operator Semantics

决定来源：[0450-text-custom-field-filters-use-complete-explicit-operator-semantics.md](../../adr/0450-text-custom-field-filters-use-complete-explicit-operator-semantics.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0450-p001"></a>

Text Custom Fields need structured retrieval beyond lexical search without inheriting database null behavior, operating-system collation or hidden cleanup. Their Advanced Filter catalog therefore provides Is Present, Is Missing and Is Whitespace-Only; Equals/Does Not Equal, Contains/Does Not Contain, Starts With/Does Not Start With and Ends With/Does Not End With; extended-grapheme Length equality, inequality, ordering and inclusive range; Matches/Does Not Match Portable Pattern; validation state Conforming, Out-of-Constraint or Unknown; and ADR 0445 Duplicate Text Value Finding. These conditions compose through ADR 0040 and bind the exact Custom Field Definition identity under ADR 0421.

<a id="0450-p002"></a>

Every ordinary comparison condition explicitly stores a **Text Filter Comparison Mode** of Exact, Case-Insensitive or Normalized plus its policy/Unicode version. It applies the corresponding ADR 0446 whole-value transform independently to the authoritative value and user operand before equality, containment, prefix or suffix evaluation, but creates no Duplicate Text Comparison Key or stored-value rewrite. A zero-length operand is invalid and routes the user to Is Missing; a non-empty whitespace-only operand remains intentional, and Normalized mode may derive an empty comparison form that still matches only present values. Pattern conditions instead store ADR 0443 Entire Value/Contains mode and ADR 0444 portable options and never inherit the ordinary comparison mode.

<a id="0450-p003"></a>

Every content, pattern, length and validation-state operator evaluates present values only. Negative operators do not make Missing match by absence; the user must explicitly compose Or Is Missing. Whitespace-only Text remains present, length uses ADR 0440's authoritative extended-grapheme count before comparison transforms, and Missing has neither length nor validation outcome. During ADR 0438 partial revalidation, Conforming and Out-of-Constraint use only completed current-rule outcomes, Unknown is independently selectable, and every validity-specific result discloses Partial Custom Field Constraint Validation Coverage rather than guessing. Saved filters preserve operators, operands, modes, options and version identities, never ambient locale or current display formatting.

<a id="0450-p004"></a>

ADR 0451 Text Custom Field Sort Modes are a separate ordering contract.
Exact/Case-Insensitive/Normalized filter comparison does not define row order,
and a Natural sort's language-aware collation never changes filter equality.

<a id="0450-p005"></a>

ADR 0452 can create these ordinary Equals and presence conditions from an
on-demand distinct-value projection. It does not add an implicit In operator,
persist a value facet or give a selected comparison group schema authority.

<a id="adr-0451"></a>

## 0451 · Text Custom Field Sorting Is Versioned Natural or Exact and Keeps Missing Last

决定来源：[0451-text-custom-field-sorting-is-versioned-natural-or-exact-and-keeps-missing-last.md](../../adr/0451-text-custom-field-sorting-is-versioned-natural-or-exact-and-keeps-missing-last.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0451-p001"></a>

Text Custom Fields support ascending and descending **Text Custom Field Sort** with an explicit **Text Custom Field Sort Mode** of Natural or Exact Unicode. Natural is the default and uses numeric-aware, versioned Unicode collation tailored by one canonical stored language tag, so `Project 2` precedes `Project 10` in ascending order while case, diacritics and punctuation remain later ordering distinctions rather than discarded equality. Creating a Natural sort visibly proposes the current interface language, lets the user choose another supported language or the root collation, and freezes the resolved language/tailoring plus Unicode/collation-data versions; another device or later interface-language change never substitutes its operating-system collator.

<a id="0451-p002"></a>

Exact Unicode compares the authoritative ADR 0440 NFC scalar sequence without locale, numeric segmentation or ADR 0450 comparison transforms. For Natural ties, the requested direction also applies to the authoritative NFC scalar sequence; any remaining equal-value tie uses opaque stable owner identity in fixed ascending order. Missing is always placed last in both directions instead of flooding the top of a descending view. Whitespace-only Text remains a present sortable value, and Conforming, Out-of-Constraint or Unknown validation status never changes value order.

<a id="0451-p003"></a>

Temporary and saved sorts retain the exact field identity, direction, mode and relevant language/version evidence. A Saved Search or User Smart Filter therefore follows ADR 0421 when that field is archived, deleted or remapped and never falls back to a same-name field or unrelated sort. Sort changes remain presentation-only under ADR 0081 when membership is unchanged; ADR 0181 result generations freeze their ordering, and a newer value/index generation is adopted only through that surface's normal explicit refresh. An unavailable or upgraded collation policy requires an explicit compatible selection or reviewed policy migration rather than silent reinterpretation.

<a id="0451-p004"></a>

ADR 0452 uses an explicit Natural or Exact Unicode mode to order browser
entries, with the same stable tie and version rules, but that session-only
display order is not automatically copied into the resulting asset filter.

<a id="adr-0452"></a>

## 0452 · Distinct Text Value Browsing Is On Demand, Generation Bound, and Never Schema

决定来源：[0452-distinct-text-value-browsing-is-on-demand-generation-bound-and-never-schema.md](../../adr/0452-distinct-text-value-browsing-is-on-demand-generation-bound-and-never-schema.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0452-p001"></a>

A high-cardinality Text Custom Field may have nearly one value per owner, so opening Advanced Filter Panel must not enumerate or render a complete automatic facet. The user explicitly opens a **Distinct Text Value Browser** bound to one exact field identity, current pre-selection query/lifecycle scope, ADR 0450 Text Filter Comparison Mode and policy version, and one complete owner/projection generation. The host supplies bounded cursor pages while the renderer virtualizes loaded entries; there is no total-result cap and no renderer-side full-list materialization. Entry search narrows this browser under its selected comparison mode rather than invoking asset lexical search. Later value or scope changes expose Results Available to Refresh but never splice entries, counts or page boundaries into the active browser generation.

<a id="0452-p002"></a>

Exact mode gives each authoritative NFC sequence one entry. Case-Insensitive and Normalized modes group by their ADR 0446 transforms, show the total current-owner count and expand every distinct original form with its own count and invisible-format evidence. Missing is excluded from distinct entries and shown as a separate mutually exclusive owner count. Whitespace-Only is a separately labelled, non-additive subset count because those present values also remain selectable distinct entries; a Normalized empty comparison form remains present and never absorbs Missing. Entries use an explicit ADR 0451 Natural or Exact Unicode display order with stable ties.

<a id="0452-p003"></a>

Selecting one entry creates a visible ADR 0450 Equals condition with the selected original operand and current comparison mode; selecting multiple entries creates an explicit Or group of those conditions. Selecting the Missing or Whitespace-Only summary creates its corresponding presence condition. The browser never creates Select options, changes Custom Field Type, writes schema, stores derived comparison keys as values or turns Text into an enum. Search text, pages, expanded variants, counts and the browser generation remain session state; only the resulting ordinary conditions persist if the user explicitly saves the filter, and reopening computes current values rather than restoring a browser snapshot.

<a id="adr-0453"></a>

## 0453 · Text Editor Presentation Is Portable, Reversible, And Content-Neutral

决定来源：[0453-text-editor-presentation-is-portable-reversible-and-content-neutral.md](../../adr/0453-text-editor-presentation-is-portable-reversible-and-content-neutral.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0453-p001"></a>

A Text Custom Field Definition stores one portable **Default Text Editor
Presentation**: Compact or Expanded, defaulting to Compact. This preference is
definition-owned display metadata, not a Custom Field Type, validation rule or
value transformation. Changing it takes effect immediately without an impact
preview, migration, constraint revalidation or search-index rewrite. The
current Inspector may use **Temporary Text Editor Expansion** for one field and
owner; that session state never changes the definition's default.

<a id="0453-p002"></a>

Both presentations accept and preserve the complete ADR 0440 Text value,
including every allowed line break. Compact may visually summarize a
multiline value only when it clearly marks that more content exists and offers
full-value access. Editing an existing multiline value, inserting a line break
or pasting multiline content expands the editor before commit. Compact never
flattens, trims, rejects or truncates content merely to maintain its preferred
height, and it never implies a distinct single-line Text type.

<a id="0453-p003"></a>

Expanded provides a vertically resizable editor within ADR 0023 Inspector
guardrails. It shows a live authoritative grapheme count with the applicable
minimum, current count and maximum under ADRs 0440 and 0443, preserves the
current draft while resizing, exposes ADR 0442 invisible-format reveal, and
shows ADR 0441 whitespace-only warning without rewriting the value. Temporary
expansion and its current height are Inspector view state rather than portable
field metadata. ADR 0454 owns commit, blur, cancellation and input-method
composition behavior; crash/forced-termination draft recovery remains a
separate interaction decision.

<a id="0453-p004"></a>

ADR 0460 never copies a Compact summary, ellipsis, line clamp or invisible
character label. Native selection Copy/Cut requires the real editor, while Copy
Full Text resolves the complete draft or authoritative value independently of
presentation.

<a id="adr-0454"></a>

## 0454 · Text Edit Drafts Are Revision-Bound And Commit Only At Defined Boundaries

决定来源：[0454-text-edit-drafts-are-revision-bound-and-commit-only-at-defined-boundaries.md](../../adr/0454-text-edit-drafts-are-revision-bound-and-commit-only-at-defined-boundaries.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0454-p001"></a>

Editing a Text Custom Field creates a non-authoritative **Text Edit Draft**, the
Text specialization of ADR 0465 Custom Field Edit Draft. It is bound to the
exact library, Candidate or Design Asset owner, Custom Field Definition and
base Custom Field Value revision. Typing, validation feedback and input-method
composition do not change the authoritative value or its search, filter, sort,
export or duplicate projections before commit. While an IME composition is
active, Enter and Escape belong to the input method and cannot commit or cancel
the field; normal validation and field shortcuts resume only after composition
ends.

<a id="0454-p002"></a>

Explicit Save always attempts commit. Outside IME composition, Compact Enter
commits, while Shift+Enter inserts a line break and invokes ADR 0453 Temporary
Text Editor Expansion. Expanded Enter inserts a line break, while
Command/Ctrl+Enter commits. Deliberately moving by pointer or keyboard to
another editable field in the same Inspector also attempts to commit a
currently valid, revision-current draft for efficient metadata entry.
Operating-system window blur, application deactivation and incidental focus
loss never commit; they preserve the visible draft.

<a id="0454-p003"></a>

A validation failure remains an inline pending draft and leaves the
authoritative value unchanged. If the bound value or definition revision has
changed, the draft becomes a **Stale Text Edit Draft** and follows ADR 0097
field-aware conflict review rather than Last Writer Wins. Changing the selected
owner or result scope, switching library or route, closing the Inspector, and
cleanly quitting with any pending draft invokes ADR 0465's contextual
**Unsaved Custom Field Changes Gate** offering Save, Discard and Stay. Its Text
projection is the **Unsaved Text Changes Gate**; the transition cannot complete
while a requested Save remains invalid or unresolved. Discard removes only the
draft, Stay preserves the editing context, and Escape outside IME composition
cancels the active uncommitted draft and reveals the current authoritative
value. No navigation or focus change silently discards or overwrites text.
ADR 0455 owns the Text record class inside protected device-local draft
recovery without changing these normal commit and navigation boundaries.
ADR 0466 governs a Text draft when it joins other typed drafts behind the same
gate: no valid subset is silently saved, and all selected fields for one owner
commit atomically after complete preflight.

<a id="0454-p004"></a>

ADR 0456 gives an active editor's draft-local Undo/Redo priority over ADR
0465's shared Custom Field Edit Undo Stack and makes each successful manual
Text commit one typed session-level Undo step.

<a id="0454-p005"></a>

ADR 0459 paste and text drop modify only this draft through explicit plain
Unicode transfer input. Neither gesture commits, resolves a stale revision,
bypasses validation or turns a file/image/asset drop into metadata.

<a id="0454-p006"></a>

ADR 0460 Copy reads only the selected or explicitly requested complete draft
without committing it. Cut removes the selected range only after clipboard
write succeeds, remains a draft edit and cannot resolve staleness or bypass the
Unsaved Custom Field Changes Gate.

<a id="0454-p007"></a>

ADR 0461 writing diagnostics never mutate this draft by themselves. A
user-applied proposal or explicitly enabled automatic input substitution is an
ordinary draft-local range edit after IME ownership ends; neither local nor
external assistance commits, resolves staleness or authorizes navigation.

<a id="adr-0456"></a>

## 0456 · Manual Text Edit Undo Is Layered, Revision-Guarded, And Session-Only

决定来源：[0456-manual-text-edit-undo-is-layered-revision-guarded-and-session-only.md](../../adr/0456-manual-text-edit-undo-is-layered-revision-guarded-and-session-only.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0456-p001"></a>

Text editing specializes ADR 0465's two Undo layers. While a Text editor owns an
active ADR 0454 Text Edit Draft, Command/Ctrl+Z and the platform redo shortcut
modify only that draft; input-method composition retains first keyboard
ownership and draft Undo never writes a Custom Field Value or consumes the
committed-edit stack. One successful manual Text commit—whether explicit,
field-exit, value clear or whitespace-only save—creates exactly one
**Text Edit Undo Step**, a Text-typed Custom Field Edit Undo Step, not one step
per keystroke.

<a id="0456-p002"></a>

When no Custom Field Edit Draft owns the shortcut, global Undo targets the
newest typed step in the current active library session's shared chronological
stack and identifies its owner, field and type before execution. A Text step
retains the exact previous value-or-Missing state, committed Text and resulting
revision only in memory. Undo rechecks that the owner, definition, active
validation rules and committed revision are still current; if so, it creates a
new authoritative revision restoring the previous state. Changed ownership,
lifecycle, definition, validation or value evidence enters ADR 0097
field-aware review or makes the newest step unavailable rather than
overwriting, auto-unarchiving, recreating, name-matching or falling through to
an older step. ADR 0468 keeps it blocking by default and permits advancement
only after exact eligibility returns or the user confirms removal of the whole
entry.

<a id="0456-p003"></a>

A successful Undo enables Redo only while the exact Undo-produced revision
remains current and no later manual commit has replaced that redo branch. Redo
performs the same current-rule and revision checks and creates another normal
revision. The **Text Edit Undo Stack** is only the Text-filtered view of ADR
0465's memory-bounded, device- and active-library-session-only
**Custom Field Edit Undo Stack**, never a parallel global stack. Library Switch
and application exit clear the shared stack without changing committed values.
ADR 0469 count/byte eviction removes only complete oldest Undo opportunities
and must be represented truthfully. The stack never enters ADR 0455 recovery,
portable library state, backup, history, search, logs, telemetry or plugins. AI
acceptance, metadata import, migration, batch operations, conflict resolution
and Promotion retain their own operation-scoped Undo contracts and never join
this stack.

<a id="0456-p004"></a>

ADR 0457 Batch Text Edit therefore creates one operation-scoped result and
possible Batch Undo, never one Text Edit Undo Step per successful owner. ADR
0458 keeps its exact previous values in a separate protected device-local
journal with a terminal-result retention window; that durable batch recovery
does not make the shared manual Custom Field Edit Undo Stack persistent.

<a id="0456-p005"></a>

ADR 0460 successful Cut contributes only to the active editor's native
draft-local Undo/Redo history. Copy contributes no Undo step, and neither action
creates or consumes a committed Text Edit Undo Step before a later successful
commit.

<a id="0456-p006"></a>

ADR 0461 user-applied writing proposals and explicitly enabled automatic input
substitutions likewise contribute only to draft-local Undo/Redo. Diagnostics
and unapplied proposals contribute no step; only a later successful manual
commit creates one Text Edit Undo Step for the complete draft.

<a id="0456-p007"></a>

Under ADR 0467, a Text field saved inside an atomic multi-field owner group is
one typed delta in a Compound Custom Field Edit Undo Step rather than an
independent Text Edit Undo Step. The Text-filtered projection may identify the
compound entry, but Undo/Redo cannot extract or replay only its Text delta.

<a id="adr-0457"></a>

## 0457 · Batch Text Editing Uses Reviewed Frozen Plans And Per-Owner Commits

决定来源：[0457-batch-text-editing-uses-reviewed-frozen-plans-and-per-owner-commits.md](../../adr/0457-batch-text-editing-uses-reviewed-frozen-plans-and-per-owner-commits.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0457-p001"></a>

Multi-selection Text editing is always a Reviewed Batch Action because replacing
or transforming Mixed Value metadata across many owners is not equivalent to
one low-risk field edit. Batch Inspector shows All Missing, Same Value or Mixed
Value with present/Missing and eligible/excluded counts and defaults to No
Change. Its core action catalog is Set One Present Value, Clear Values, Add
Prefix, Add Suffix and **Exact Literal Text Replacement**. Set with zero-length
input routes visibly to Clear rather than disguising removal as a value.
Prefix, suffix and replacement default to present values only; **Treat Missing
Text As Empty** is a separate explicit option whose newly derived empty result
still remains Missing under ADR 0441.

<a id="0457-p002"></a>

Exact Literal Text Replacement is case-sensitive over authoritative NFC Text,
replaces every non-overlapping match from left to right and rejects an empty
find operand. It never inherits ADR 0450 comparison modes, ADR 0443 Portable
Text Pattern syntax, locale folding, regular expressions, trimming or invisible
cleanup. No batch action concatenates Mixed Values, guesses a merge, collapses
whitespace or normalizes beyond ADR 0440 NFC. Prefix, suffix and replacement
parameters are canonicalized before preview, while every resulting value
preserves all untouched whitespace, line breaks and valid invisible formatting.

<a id="0457-p003"></a>

Before confirmation, a **Batch Text Edit Plan** freezes the ADR 0080 selection
scope, exact owner/field identities, action and parameters, Treat Missing
choice, definition/rule revision and each owner's base value revision. The
review shows mutually exclusive Changed, Unchanged, Invalid, Conflict/Drift and
other Excluded counts plus bounded representative before/after examples without
implying complete renderer materialization. Existing Out-of-Constraint is a
labelled non-additive current-value subset across those outcomes. Every
proposed present value passes ADRs 0440–0444 NFC, grapheme, character-safety,
minimum and pattern validation; a new invalid value is excluded rather than
committed as Out of Constraint, clamped or truncated.

<a id="0457-p004"></a>

Execution follows ADRs 0094 and 0096: each owner revalidates current identity,
lifecycle, definition, rules and base value immediately before one atomic
commit, while the batch is not one global transaction. Already committed items
remain successful when a later owner is unchanged, invalid, conflicting,
failed, excluded or cancelled. Revision drift enters ADR 0097 field-aware
conflict review without overwrite, and cancellation stops only not-yet-started
owners at item boundaries. Selection remains visible and Batch Inspector
refreshes from persisted results under ADRs 0084 and 0085.

<a id="0457-p005"></a>

The Batch Text Edit Result and any Batch Undo are operation-scoped and never add
per-owner steps to ADR 0465 Custom Field Edit Undo Stack. ADR 0458 keeps the resumable
operation record library-bound without previous Text, stages exact Undo
evidence only in an operating-system-protected device-local journal, pauses
rather than auto-resuming after interruption and starts the shared result/Undo
retention window only when the operation becomes terminal.

<a id="0457-p006"></a>

ADR 0459 applies the same explicit plain Unicode paste/drop contract to Set,
Prefix, Suffix and replacement parameter editors. Clipboard or drag input
cannot bypass canonicalization, preview validation or frozen-plan creation and
never supplies files, images or asset relationships as implicit parameters.
