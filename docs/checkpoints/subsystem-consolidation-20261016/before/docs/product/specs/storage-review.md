# 存储清理结果与可访问导航：详细能力契约

本文承接原ADR中的细节，保留所有原数字、例外、状态和相互约束；[来源映射](../../checkpoints/documentation-rebuild-20261015/adr-migration.json)逐段核对。**有效要求不是当前交付声明，也不是本轮实施队列。** 现行已批准产品/设计在其明确替代范围内优先；不凭实现缺失判决定无效。

当前系统从[model-library](../../subsystems/model-library.md)进入；当前实际能力/版本见[CURRENT-STATE](../../handoff/CURRENT-STATE.md)，交互与视觉分别归[交互目录](../../design/README.md)/[DESIGN](../../../DESIGN.md)。详细条款按下面独立主题定位，不全量装入每次上下文。

## 主题导航

- [0256 · Terminal Package-Copy Deletion Evidence Is Pruned After Result And Startup Closure](#adr-0256)
- [0257 · Physical Reclaim Completions Aggregate By Volume With Independent Expiry](#adr-0257)
- [0258 · Large Physical Reclaim Summaries Use Fifty-Item Lazy Pages With Header Acknowledgement](#adr-0258)
- [0259 · Physical Reclaim Completion Summaries Default To Collapsed Session-Only Disclosure](#adr-0259)
- [0260 · Physical Reclaim Summary Headers Use Two Fixed Complete Metric Lines](#adr-0260)
- [0261 · Storage Byte Displays Use Localized IEC Units With Exact Byte Values](#adr-0261)
- [0262 · Physical Reclaim Summaries Use Ephemeral Path-Free Volume Labels](#adr-0262)
- [0263 · Duplicate Volume Display Names Use Session-Only Ordinals](#adr-0263)
- [0264 · Physical Reclaim Summary Cards Sort By Latest Completion Time](#adr-0264)
- [0265 · Physical Reclaim Summary Headers Show Localized Latest Completion Time](#adr-0265)
- [0266 · Physical Reclaim Detail Rows Show Individual Completion Times](#adr-0266)
- [0267 · Physical Reclaim Detail Rows Show Actual Reclaimed And Shared-Retained Bytes](#adr-0267)
- [0268 · Physical Reclaim Outcome Counts Filter Full-Snapshot Details](#adr-0268)
- [0269 · Physical Reclaim Details Use Bounded Direct-Jump Pagination Controls](#adr-0269)
- [0270 · Physical Reclaim Page Prefetch Uses a Three-Page Session Memory Cache](#adr-0270)
- [0271 · Physical Reclaim Demand Page Loads Preserve Current Rows With Inline Retry](#adr-0271)
- [0272 · Physical Reclaim Demand Page Retry Is Manual Single-Flight Without Attempt Limits](#adr-0272)
- [0273 · Physical Reclaim Demand Page Loads Have a Ten-Second Monotonic Deadline](#adr-0273)
- [0274 · Physical Reclaim Page Navigation Restores Keyboard Focus And Announces Outcomes](#adr-0274)

<a id="adr-0256"></a>

## 0256 · Terminal Package-Copy Deletion Evidence Is Pruned After Result And Startup Closure

决定来源：[0256-terminal-package-copy-deletion-evidence-is-pruned-after-result-and-startup-closure.md](../../adr/0256-terminal-package-copy-deletion-evidence-is-pruned-after-result-and-startup-closure.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0256-p001"></a>

Minimal **Terminal Package-Copy Deletion Evidence** created by ADR 0245 or ADR 0249 is not a permanent deletion history. After ADR 0254 Physical Reclaim Completed or ADR 0255 Physical Reclaim Completed As Shared, it becomes eligible for pruning only when the completion result has been acknowledged/left or reached its 24-hour expiry and no active transaction, recovery result, safety gate, Physical Reclaim Pending/backoff/lease, owner transition or idempotency dependency still references the deleted target.

<a id="0256-p002"></a>

ADR 0257 summary projection may acknowledge several constituent results at once, but it does not merge this eligibility. Each target independently closes its result and later startup evidence; one blocked or newer target cannot retain or prune another target's terminal record.

<a id="0256-p003"></a>

ADR 0258 permits one usable acknowledgement of an authoritative large-summary header snapshot to satisfy result closure for all constituents in that snapshot, including unloaded detail pages. Paging through rows is not a closure prerequisite; every target still retains its independent dependency and later clean-startup closure checks.

<a id="0256-p004"></a>

Eligibility also requires one successful **Deletion Evidence Closure Check** during a later clean host startup after physical completion. The check must prove from current authoritative owner generations that the deleted target reference and all recovery gates remain absent, no interrupted transaction can still reconcile against the evidence and current managed-object ownership is internally consistent. Missing, corrupt, contradictory or unassessable evidence retains the terminal record rather than guessing closure.

<a id="0256-p005"></a>

After both gates pass, the host atomically prunes the target's terminal deletion evidence and obsolete per-target reconciliation journal. It writes no long-lived tombstone, deletion Activity History or per-target pruning marker. If the pruning transaction is interrupted, atomicity leaves either the complete evidence or the complete pruned state; a later startup may safely repeat the closure check without deleting package bytes or owner references.

<a id="0256-p006"></a>

For ADR 0255 Completed As Shared, pruning removes only the deleted target's evidence. Every current owner/reference and shared managed-byte object remains unchanged and continues under its own lifecycle. Its later last-owner transition owns any physical cleanup and never needs the pruned target's authorization.

<a id="0256-p007"></a>

A later verified download, reacquisition or import of the same package creates a new Verified Managed Package Copy identity, owner/decision state and current install/Keep/delete review. It inherits no old scan, confirmation, authorization, failure, result or deletion state. Existing currently owned verified content may still be safely deduplicated under fresh owner accounting, but physical byte reuse never reuses the old managed-copy identity.

<a id="0256-p008"></a>

Closure checking is local, bounded and silent. It creates no startup modal, notification, badge, user action, network request, support report or telemetry. Until eligible, the minimal evidence remains device-local and path-free; after pruning, no per-target record remains in Full Library Backup, export/merge/sync, telemetry, publisher feedback or support logs.

<a id="0256-p009"></a>

Before pruning, the record contains only opaque target, terminal transaction, owner-generation and completion identities plus dependency/closure classes. It contains no path, payload, package-name confirmation, credentials, user content or attention history. The current project has no Verified Managed Package Copy deletion journal, physical-reclaim completion or startup closure compactor. This ADR changes documentation only: it checks/prunes/reacquires no real record or bytes, reads no runtime database/package/cache/model/asset/private state and changes no public IPC/schema/AI Worker API.

<a id="adr-0257"></a>

## 0257 · Physical Reclaim Completions Aggregate By Volume With Independent Expiry

决定来源：[0257-physical-reclaim-completions-aggregate-by-volume-with-independent-expiry.md](../../adr/0257-physical-reclaim-completions-aggregate-by-volume-with-independent-expiry.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0257-p001"></a>

When one host startup reconciliation generation or one physical-reclaim scheduler dispatch generation completes more than one target, Storage Management presents a **Physical Reclaim Completion Summary** instead of stacking one ADR 0254 result card per target. Results aggregate only within that exact generation and stable physical volume. Cross-volume bytes and results from later generations remain separate.

<a id="0257-p002"></a>

Each volume summary shows completed-target count, actual physical bytes reclaimed and ADR 0260's mutually exclusive Removed Now, Already Absent, Mixed and Completed As Shared target counts plus ADR 0255 Shared Bytes Retained By Other Owners. Shared and Already Absent values contribute zero newly freed storage. Under ADR 0259 the summary defaults to collapsed and expands only on explicit user disclosure into path-free package/publisher/target identities with each target's corresponding outcome class, ADR 0266 individual completion time and ADR 0267 Actual Reclaimed/Shared Retained bytes; ADR 0268 may filter those details by one complete-snapshot outcome class without filtering the header. It exposes no managed path or owner evidence payload.

<a id="0257-p003"></a>

Aggregation is presentation-only. Every constituent Physical Reclaim Completed Result retains its own completion time, one-usable-viewing acknowledgement and 24-hour hard expiry. A later target cannot join an older generation's summary, restart an acknowledged result, extend another target's deadline or delay ADR 0256 closure merely because their physical volume matches.

<a id="0257-p004"></a>

ADR 0264 orders multiple summary cards by each frozen snapshot's latest constituent completion time, not by volume, bytes or outcome. Ordering does not merge snapshots or alter any constituent completion time or expiry.

<a id="0257-p005"></a>

When a usable renderer acknowledges projection of a summary, that viewing opportunity acknowledges every constituent result currently included in the rendered summary projection. ADR 0258 defines a large summary's authoritative header member snapshot as the complete rendered projection even when its 50-row detail pages remain lazy. The card remains stable for that surface session. After the user dismisses/leaves, acknowledged constituents are pruned; on a later view, the summary is recomputed only from still-unacknowledged and unexpired results. A result not included in the rendered projection keeps its own viewing opportunity until its 24-hour deadline.

<a id="0257-p006"></a>

Each constituent acknowledgement independently satisfies only that target's ADR 0256 result-closure prerequisite. Summary totals do not become a replacement terminal record and do not authorize deletion, retry, owner mutation or evidence pruning. If one target's closure check remains blocked, other targets may still close normally.

<a id="0257-p007"></a>

The summary creates no startup modal, OS notification, badge-driven urgency, Activity History entry or long-lived aggregation record. Its retained state contains only an opaque dispatch/startup generation, stable-volume identity, constituent opaque target/result identities, counts, actual byte totals and path-free product identity/class fields. ADR 0262 may resolve the current OS volume display name ephemerally for the local header without retaining it. The state contains no paths, payload, credentials, user content, owner details or attention history and is excluded from Full Library Backup, export/merge/sync, telemetry, publisher feedback and support logs.

### 当时实施上下文（来源，非当前状态）

以下句子记录原文写作时的执行/交付范围，不否定当前实现，不授予新操作权限。

<a id="0257-p008"></a>

The current project has no Physical Reclaim Pending scheduler, completion-result projection or per-volume result aggregation. This ADR changes documentation only: it aggregates/acknowledges/prunes no real result or bytes, reads no runtime database/package/cache/model/asset/private state and changes no public IPC/schema/AI Worker API. ADR 0258 defines uncapped large-summary paging, stable ordering and header-level acknowledgement without changing constituent lifetimes.

<a id="adr-0258"></a>

## 0258 · Large Physical Reclaim Summaries Use Fifty-Item Lazy Pages With Header Acknowledgement

决定来源：[0258-large-physical-reclaim-summaries-use-fifty-item-lazy-pages-with-header-acknowledgement.md](../../adr/0258-large-physical-reclaim-summaries-use-fifty-item-lazy-pages-with-header-acknowledgement.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0258-p001"></a>

An ADR 0257 Physical Reclaim Completion Summary with at most 50 constituent targets may render all path-free details in one page. A summary with more than 50 targets uses **Physical Reclaim Summary Paging**: detail rows load lazily in pages of exactly 50, except the final page. ADR 0268 applies the same page size after host-side full-snapshot outcome filtering. There is no total-result cap, and an unexpired constituent result is never truncated, discarded or hidden merely because the summary is large.

<a id="0258-p002"></a>

The summary header is an authoritative host projection over every current constituent in that exact startup/scheduler generation and stable volume, not a client-side sum of loaded rows. ADR 0260 always shows the full current target count and actual reclaimed bytes, followed by the mutually exclusive Removed Now, Already Absent, Mixed and Completed As Shared target counts plus Shared Bytes Retained By Other Owners. Page count is derived from the same member snapshot, while unloaded pages remain optional explanatory detail.

<a id="0258-p003"></a>

One usable renderer acknowledgement of that exact header snapshot acknowledges every constituent represented by it, including targets whose detail pages were never materialized. The user does not need to open or page through all rows to consume the safety result because the header already exposes the complete aggregate outcome. ADR 0262's human-readable or generic volume label is presentation only; acknowledgement remains bound to the opaque stable-volume identity. The acknowledgement covers no later result, other generation or other volume, and cached DOM, a stale snapshot or a partial response cannot consume a viewing opportunity.

<a id="0258-p004"></a>

This refines ADR 0257's rendered-projection rule: every member committed into the immutable header member-set digest is included in the projection even when its row remains lazy. The host accepts acknowledgement only for the exact opaque summary generation, stable volume and member-set digest it projected. Page loading, expansion, scrolling and row visibility create no separate acknowledgement requirement.

<a id="0258-p005"></a>

Rows use a stable alphabetical package-identity order: normalized displayed package name, publisher identity, version/target identity and finally opaque target/result identity as the deterministic tie-breaker. Display collation is Unicode-aware within the current application locale. The order and member set freeze for the current Storage Management surface session so page boundaries cannot move underneath the user; a later surface session or locale change may create a new projection without changing any underlying result state.

<a id="0258-p006"></a>

Every constituent retains its independent 24-hour hard expiry. The current visible session may remain visually stable as ADR 0257 requires, but expired or acknowledged results are removed from persistent result state. On dismissal, leaving the surface, reopening it or creating the next projection, the host recomputes header totals and page count from only still-unacknowledged, unexpired constituents. A later completion starts a later-generation projection and cannot join, restart or extend the frozen snapshot.

<a id="0258-p007"></a>

Lazy pages expose only the path-free product identity and outcome-class fields permitted by ADR 0257, ADR 0266's already-retained per-result completion instant and ADR 0267's Actual Reclaimed/Shared Retained raw byte integers. Paging/filtering creates no persistent expansion, filter, page, scroll or browse history and no notification, Activity History, telemetry or support record. ADR 0259 defaults every summary to collapsed and permits disclosure/filter/page/scroll position only as ephemeral state for the current Storage Management surface session. Retained host projection state is limited to opaque volume/generation/member identities, the member-set digest, aggregate/per-result counts and bytes, completion instants and ordering keys.

### 当时实施上下文（来源，非当前状态）

以下句子记录原文写作时的执行/交付范围，不否定当前实现，不授予新操作权限。

<a id="0258-p008"></a>

The current project has no Physical Reclaim Pending scheduler, completion summary or lazy result paging. This ADR changes documentation only: it projects/acknowledges/expires no real result, reads no runtime database/package/cache/model/asset/private state and changes no public IPC/schema/AI Worker API. ADR 0259 defines the default collapsed, session-only disclosure behavior without changing header acknowledgement or paging limits; ADR 0269 defines the hidden-at-one-page First/Previous/direct-jump/Next/Last controls, and ADR 0270 bounds opportunistic prefetch to a three-page renderer-memory window.

<a id="adr-0259"></a>

## 0259 · Physical Reclaim Completion Summaries Default To Collapsed Session-Only Disclosure

决定来源：[0259-physical-reclaim-completion-summaries-default-to-collapsed-session-only-disclosure.md](../../adr/0259-physical-reclaim-completion-summaries-default-to-collapsed-session-only-disclosure.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0259-p001"></a>

Every newly projected ADR 0257 Physical Reclaim Completion Summary initially renders **collapsed**. The authoritative header remains fully visible using ADR 0260's two fixed complete metric lines, while the path-free target rows and ADR 0258 paging controls stay behind one explicit disclosure action. This default applies equally to small and large summaries.

<a id="0259-p002"></a>

The system never auto-expands a summary because of target count, actual reclaimed bytes, Already Absent or Mixed outcomes, Completed As Shared constituents, shared-retained bytes, zero newly freed storage or any other result class. Those values remain visible through the complete header projection; expansion is optional explanation and not an attention, safety, acknowledgement or ADR 0256 closure gate.

<a id="0259-p003"></a>

A usable collapsed header still qualifies as the ADR 0258 authoritative all-member projection. Its exact header acknowledgement may consume every represented constituent's viewing opportunity without the user opening details, changing pages or scrolling. Expanding or collapsing does not create another acknowledgement, extend a result's 24-hour deadline or change the frozen member snapshot.

<a id="0259-p004"></a>

Only an explicit user disclosure action expands the target details. For a particular summary during the current usable Storage Management surface session, the renderer may retain its expanded/collapsed state, ADR 0268 outcome filter, ADR 0269 valid selected page and detail-scroll position. Collapsing and reopening that same summary in the same session restores its filter, current page and position so inspection is not needlessly restarted; invalid page-input editing text and validation are discarded. ADR 0270 may also retain the exact three-page memory window through collapse, while collapse stops new prefetch work.

<a id="0259-p005"></a>

Leaving Storage Management, closing its window, losing the renderer session or restarting the host discards all disclosure state and every ADR 0270 page window. A later visit begins collapsed on page one at the top, using whatever recomputed still-unacknowledged/unexpired projection ADR 0258 permits. A newly projected summary or different generation/volume also begins collapsed and inherits no state by package, publisher or volume identity.

<a id="0259-p006"></a>

Disclosure state is ephemeral renderer presentation state. It is not written to the host result record, settings, database, filesystem, Full Library Backup, export/merge/sync, Activity History, telemetry, publisher feedback or support logs. The application records no row visibility, dwell time, page traversal or proof of reading.

### 当时实施上下文（来源，非当前状态）

以下句子记录原文写作时的执行/交付范围，不否定当前实现，不授予新操作权限。

<a id="0259-p007"></a>

The current project has no Physical Reclaim Completion Summary or disclosure state. This ADR changes documentation only: it expands/acknowledges/expires no real result, reads no runtime database/package/cache/model/asset/private state and changes no public IPC/schema/AI Worker API. ADR 0260 defines the collapsed header's fixed two-line metric structure without changing this disclosure behavior.

<a id="adr-0260"></a>

## 0260 · Physical Reclaim Summary Headers Use Two Fixed Complete Metric Lines

决定来源：[0260-physical-reclaim-summary-headers-use-two-fixed-complete-metric-lines.md](../../adr/0260-physical-reclaim-summary-headers-use-two-fixed-complete-metric-lines.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0260-p001"></a>

The collapsed ADR 0259 Physical Reclaim Completion Summary header uses two fixed logical information lines in a stable order. The first line shows the Physical Reclaim Completed outcome label, ADR 0262's ephemeral path-free volume label, the complete target count in the ADR 0258 member snapshot, the actual physical bytes reclaimed by that snapshot and ADR 0265's localized Latest Completed time.

<a id="0260-p002"></a>

The second line always shows four mutually exclusive target outcome counts in this order: Removed Now, Already Absent, Mixed and Completed As Shared. ADR 0268 makes the counts single-select full-snapshot detail filters without changing their complete-header values. The line then shows Shared Bytes Retained By Other Owners. The four target counts must sum exactly to the first line's complete target count; actual reclaimed bytes may come from Removed Now and the removed portion of Mixed, while Already Absent and shared-retained bytes contribute zero newly freed storage.

<a id="0260-p003"></a>

Every field remains present when its value is zero. The header displays an explicit numeric zero, including ADR 0261's `0 B` representation for byte fields, rather than omitting the label, moving another metric into its place or replacing zero with a dash, blank or success-only shorthand. This keeps different summaries directly comparable and prevents absence from being mistaken for unavailable evidence.

<a id="0260-p004"></a>

The authoritative host snapshot supplies every count and byte total. The renderer does not derive totals from loaded detail rows. ADR 0267 additionally requires the full-snapshot sums of per-row Actual Reclaimed and Shared Retained bytes to equal their respective header totals. If any required metric is missing, non-finite, negative, inconsistent with the member set or fails a count/byte invariant, the projection is not a usable complete header and cannot consume the ADR 0258 acknowledgement; it must not guess, hide the field or silently coerce unavailable evidence to zero.

<a id="0260-p005"></a>

Package name, publisher, version, target identity and per-target class remain exclusively in the explicitly expanded details. Apart from ADR 0262's current OS volume display name or generic unavailable-volume label, the collapsed header contains no first/representative package, path, device identifier, owner identity or sampled row. Responsive or accessibility presentation may reflow the two logical lines while preserving field order, labels and every value; it cannot remove a metric from the accessible projection.

<a id="0260-p006"></a>

The header structure creates no setting, personalization, persistent layout state, Activity History, telemetry or support payload. Its values have the same one-viewing/24-hour constituent lifetimes and session-stable snapshot as ADRs 0257–0259.

### 当时实施上下文（来源，非当前状态）

以下句子记录原文写作时的执行/交付范围，不否定当前实现，不授予新操作权限。

<a id="0260-p007"></a>

The current project has no Physical Reclaim Completion Summary header. This ADR changes documentation only: it formats/acknowledges/reclaims no real result or bytes, reads no runtime database/package/cache/model/asset/private state and changes no public IPC/schema/AI Worker API. ADR 0261 defines exact byte units, rounding and localized numeric formatting without changing the header fields.

<a id="adr-0261"></a>

## 0261 · Storage Byte Displays Use Localized IEC Units With Exact Byte Values

决定来源：[0261-storage-byte-displays-use-localized-iec-units-with-exact-byte-values.md](../../adr/0261-storage-byte-displays-use-localized-iec-units-with-exact-byte-values.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0261-p001"></a>

Storage Management uses one **Storage Byte Display** rule for ADR 0260 Physical Reclaim Completion Summary values and later storage-facing byte totals. Authoritative byte counts remain non-negative integers. Zero renders as `0 B`; positive values use a 1024 base with the technically accurate unit symbols `B`, `KiB`, `MiB`, `GiB` and `TiB`.

<a id="0261-p002"></a>

The compact value selects the largest unit whose unrounded magnitude is at least one, capped at `TiB`. Raw-byte values remain whole integers. A scaled value below 10 uses one fractional digit; a scaled value of 10 or more uses no fractional digits. If rounding would display `1024` of one scaled unit, presentation carries into the next unit instead of showing a boundary value such as `1024 MiB`.

<a id="0261-p003"></a>

A positive byte count must never render as numeric zero. Compact rounding is presentation only and never replaces the authoritative integer used for aggregation, acknowledgement, storage accounting, safety-reserve checks or result closure. ADR 0260 invalid, negative, non-finite, fractional or unavailable evidence remains unusable rather than being coerced to `0 B`.

<a id="0261-p004"></a>

Every compact byte value exposes the exact integer byte count with current-locale grouping in its hover/focus description and accessible text. The exact text localizes its number separators and the word for bytes, while the IEC symbols remain stable technical symbols. The compact and exact representations come from the same raw integer and cannot be separately supplied by the renderer.

<a id="0261-p005"></a>

Target and outcome counts use the current application locale's integer grouping, never compact `K`/`M` abbreviations, fractional values or inferred zeros. Localized display strings are not persisted: result state retains only raw counts and raw byte integers, and changing locale re-renders the same snapshot without changing its identity, acknowledgement or expiry.

<a id="0261-p006"></a>

The same formatter applies to header and ADR 0267 detail-row Actual Reclaimed bytes and Shared Bytes Retained By Other Owners so zero and nonzero quantities remain directly comparable. It does not add a user-selectable unit preference or silently redefine package sizes, GPU memory, download progress, asset metadata or other existing screens; those currently inconsistent formatters require separate reviewed migration if they later adopt this storage rule.

### 当时实施上下文（来源，非当前状态）

以下句子记录原文写作时的执行/交付范围，不否定当前实现，不授予新操作权限。

<a id="0261-p007"></a>

The current project has no Physical Reclaim Completion Summary or shared Storage Management byte formatter. This ADR changes documentation only: it reads/formats/reclaims no real result or bytes, accesses no runtime database/package/cache/model/asset/private state, modifies none of the existing formatter code and changes no public IPC/schema/AI Worker API. ADR 0262 defines the path-free, render-time display identity of the physical volume without changing numeric formatting.

<a id="adr-0262"></a>

## 0262 · Physical Reclaim Summaries Use Ephemeral Path-Free Volume Labels

决定来源：[0262-physical-reclaim-summaries-use-ephemeral-path-free-volume-labels.md](../../adr/0262-physical-reclaim-summaries-use-ephemeral-path-free-volume-labels.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0262-p001"></a>

The first logical line of an ADR 0260 Physical Reclaim Completion Summary identifies its physical volume after the completion outcome label and before target count and actual reclaimed bytes. When the stable opaque volume identity currently resolves to an available mounted volume, the renderer shows the operating system's current human-readable volume display name as plain text.

<a id="0262-p002"></a>

The display name is resolved only for the current usable Storage Management projection. It is not copied into the completion result, header member snapshot, database, filesystem, settings, Full Library Backup, export/merge/sync, Activity History, telemetry, publisher feedback or support logs. A rename may change a later projection's label but cannot change the opaque volume identity, aggregate membership, acknowledgement or result expiry.

<a id="0262-p003"></a>

If the volume is unavailable, unmounted, unnamed or cannot be safely resolved, the header uses a localized generic label such as **Unavailable Volume 1**. Ordinals are allocated deterministically from opaque volume identities for the current Storage Management surface session, remain stable within that session and are discarded when the session ends. They are presentation labels only and are never used for aggregation or acknowledgement.

<a id="0262-p004"></a>

The visible label never contains or derives a mount path, managed path, device node, hardware serial number, filesystem UUID, stable volume identifier, digest, hash or suffix of any such identifier. The underlying opaque stable-volume identity remains host-only and binds the exact volume, generation and ADR 0258 member-set digest. Label resolution failure therefore does not make an otherwise complete header unusable and never permits name-based merging.

<a id="0262-p005"></a>

Volume names are treated as untrusted display text: they are text-escaped, whitespace-bounded and never interpreted as markup, a path, command, URL or owner identity. The same path-free label is included in the accessible header description. It does not expose package identity or alter ADR 0260's fixed metric order.

<a id="0262-p006"></a>

The label creates no persistent alias, volume history, device inventory or cross-session ordinal. ADR 0263 appends session-only ordinals only when distinct currently represented available volumes expose the same normalized human-readable display name; it reveals no device evidence and leaves unique names unchanged.

### 当时实施上下文（来源，非当前状态）

以下句子记录原文写作时的执行/交付范围，不否定当前实现，不授予新操作权限。

<a id="0262-p007"></a>

The current project has no Physical Reclaim Completion Summary or volume-label projection. This ADR changes documentation only: it resolves/displays no real volume, reads no user asset, runtime database, package/cache/model/private state and changes no public IPC/schema/AI Worker API.

<a id="adr-0263"></a>

## 0263 · Duplicate Volume Display Names Use Session-Only Ordinals

决定来源：[0263-duplicate-volume-display-names-use-session-only-ordinals.md](../../adr/0263-duplicate-volume-display-names-use-session-only-ordinals.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0263-p001"></a>

When two or more distinct opaque physical-volume identities represented on the current Storage Management surface resolve through ADR 0262 to the same available human-readable display name, every member of that collision group receives a localized parenthesized ordinal, such as **Design Volume (1)** and **Design Volume (2)**. A name represented by only one distinct volume identity receives no suffix.

<a id="0263-p002"></a>

Collision comparison uses the text-escaped visible name after Unicode canonical normalization and leading/trailing whitespace normalization. Otherwise the operating system's display text remains unchanged; distinct case or other visibly distinct characters do not create a collision group. Multiple summary generations for the same opaque physical volume share one display label and one ordinal rather than being counted as different volumes.

<a id="0263-p003"></a>

Ordinals are assigned deterministically from the host-only opaque volume identities in the collision group. The visible number is not derived from, and exposes no substring, encoding, ordering hint, hash or checksum of, the underlying identifier. The ordinal has no meaning outside disambiguating currently visible equal names and never participates in aggregation, member-set identity or acknowledgement.

<a id="0263-p004"></a>

Once assigned, a volume's ordinal remains stable for the current Storage Management surface session. If a newly projected summary introduces the first same-name collision, all affected visible labels gain their assigned suffix once. If another card expires, is acknowledged or disappears, remaining labels keep their suffixes and are not renumbered or stripped until the session ends. A later session recomputes collision groups and ordinals from its own visible summaries.

<a id="0263-p005"></a>

ADR 0262 unavailable-volume labels already use their separate current-session ordinal namespace and do not join available-name collision groups. Both the visual label and accessible header description use the same disambiguated text.

<a id="0263-p006"></a>

The application does not use capacity, free space, filesystem type, internal/external class, connection bus, device model, hardware identifier, mount path or other device evidence to disambiguate equal names. The suffix mapping is renderer-session presentation state only and creates no stored alias, preference, volume history, database row, backup/export/sync field, Activity History, telemetry or support payload.

### 当时实施上下文（来源，非当前状态）

以下句子记录原文写作时的执行/交付范围，不否定当前实现，不授予新操作权限。

<a id="0263-p007"></a>

The current project has no Physical Reclaim Completion Summary or duplicate-volume label resolver. This ADR changes documentation only: it compares/displays no real volume name, reads no user asset, runtime database, package/cache/model/private state and changes no public IPC/schema/AI Worker API. ADR 0264 uses a disambiguated label only as a completion-time tie-breaker and never infers primary card order from these ordinals.

<a id="adr-0264"></a>

## 0264 · Physical Reclaim Summary Cards Sort By Latest Completion Time

决定来源：[0264-physical-reclaim-summary-cards-sort-by-latest-completion-time.md](../../adr/0264-physical-reclaim-summary-cards-sort-by-latest-completion-time.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0264-p001"></a>

Physical Reclaim Completion Summary cards are transient completion results, not a persistent volume inventory. Their primary order is therefore the authoritative **Latest Constituent Completion Time** of each immutable ADR 0258 summary snapshot, descending so the most recently completed snapshot appears first.

<a id="0264-p002"></a>

The sort timestamp is the maximum completion instant among the snapshot's constituent ADR 0254 results. It compares normalized UTC instants, never localized display strings, renderer receipt time, acknowledgement time, expiry time, volume mount time or generation identifier. A constituent without a valid authoritative completion instant cannot form a valid one-viewing/24-hour result or enter a usable summary.

<a id="0264-p003"></a>

If two snapshots have the same latest completion instant, their next key is the current ADR 0262/0263 disambiguated volume label under the application locale's deterministic display collation. Remaining ties use host-only opaque stable-volume identity and then opaque startup/scheduler generation identity. Those final keys affect order only and are never rendered, logged or exposed as suffixes.

<a id="0264-p004"></a>

When a usable Storage Management surface session begins, the relative order of its projected cards freezes. A newly arriving summary is inserted at the position determined by the same keys without re-sorting the existing cards against changed labels; an expired, acknowledged or removed card simply closes its visual gap while all surviving cards retain their relative order. A volume rename, first duplicate-name suffix, mount-state change or locale change may update permitted presentation but does not move an existing card during that session. A later session computes a fresh order.

<a id="0264-p005"></a>

Actual reclaimed bytes, shared-retained bytes, target count, Removed Now, Already Absent, Mixed, Completed As Shared, expansion state, selected page and remaining expiry never affect order. The application exposes no “largest reclaim first,” attention-priority or result-class sort, and it does not treat ordering as a deletion recommendation, severity judgment or proof of reading.

<a id="0264-p006"></a>

Card order is ephemeral renderer projection state. It is not persisted as a preference, result field, database row, Full Library Backup, export/merge/sync record, Activity History, telemetry or support payload and changes no constituent acknowledgement or expiry.

### 当时实施上下文（来源，非当前状态）

以下句子记录原文写作时的执行/交付范围，不否定当前实现，不授予新操作权限。

<a id="0264-p007"></a>

The current project has no Physical Reclaim Completion Summary card list. This ADR changes documentation only: it sorts/acknowledges/expires no real result, reads no user asset, runtime database, package/cache/model/private state and changes no public IPC/schema/AI Worker API. ADR 0265 displays this exact latest completion instant in the summary header without deriving order from localized text.

<a id="adr-0265"></a>

## 0265 · Physical Reclaim Summary Headers Show Localized Latest Completion Time

决定来源：[0265-physical-reclaim-summary-headers-show-localized-latest-completion-time.md](../../adr/0265-physical-reclaim-summary-headers-show-localized-latest-completion-time.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0265-p001"></a>

The first logical line of an ADR 0260 Physical Reclaim Completion Summary ends with a labeled **Latest Completed** value. It uses the exact same Latest Constituent Completion Time UTC instant that ADR 0264 uses as the card's primary sort key, so the visible explanation and actual newest-first order cannot refer to different events.

<a id="0265-p002"></a>

At render time, the instant is formatted in the application's current locale and current system time zone. When it falls on the renderer's current local calendar date, the compact label shows localized short time. Otherwise it shows localized month, day and short time. It never displays an unlabeled timestamp that could be mistaken for the summary's creation, projection, acknowledgement or expiry time.

<a id="0265-p003"></a>

Hover, keyboard focus and accessible text expose the complete localized year, month, day, time through seconds, time-zone name and numeric UTC offset. Compact and full forms are derived from the same authoritative instant; neither can be supplied independently or parsed back into result state.

<a id="0265-p004"></a>

The header never uses a live relative phrase such as “just now,” “minutes ago” or “yesterday,” and it shows no age or expiry countdown. A local midnight boundary, locale change or time-zone change may reformat the compact/full text and local-date classification, but it cannot move the card during the current session, modify the underlying UTC instant, restart acknowledgement or extend/shorten any constituent's host-owned 24-hour expiry.

<a id="0265-p005"></a>

The application may refresh the label at a local calendar-day boundary or ordinary rerender, but it creates no periodic minute-level timer, attention animation or proof-of-reading signal. System-clock or time-zone display drift affects presentation only; ordering and expiry continue from authoritative host instants and elapsed-time rules rather than the rendered string.

<a id="0265-p006"></a>

No localized timestamp string, time-zone label or display refresh is persisted to settings, result state, database, filesystem, Full Library Backup, export/merge/sync, Activity History, telemetry or support logs. The completion instants already required by ADRs 0254 and 0257 remain the only retained time evidence.

### 当时实施上下文（来源，非当前状态）

以下句子记录原文写作时的执行/交付范围，不否定当前实现，不授予新操作权限。

<a id="0265-p007"></a>

The current project has no Physical Reclaim Completion Summary header or latest-completion formatter. This ADR changes documentation only: it formats/sorts/expires no real result, reads no user asset, runtime database, package/cache/model/private state and changes no public IPC/schema/AI Worker API. ADR 0266 reuses this format for each expanded target's own completion instant without changing the header time.

<a id="adr-0266"></a>

## 0266 · Physical Reclaim Detail Rows Show Individual Completion Times

决定来源：[0266-physical-reclaim-detail-rows-show-individual-completion-times.md](../../adr/0266-physical-reclaim-detail-rows-show-individual-completion-times.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0266-p001"></a>

Every explicitly expanded Physical Reclaim Completion Summary detail row shows a labeled **Completed** value immediately after that target's Removed Now, Already Absent, Mixed or Completed As Shared outcome class. The value is the authoritative completion instant of that exact constituent ADR 0254 result, not the summary projection time, page-load time, acknowledgement time or expiry deadline.

<a id="0266-p002"></a>

Row timestamps reuse ADR 0265's formatting without variation: a completion on the renderer's current local calendar date shows localized short time; another date shows localized month, day and short time. Hover, keyboard focus and accessible text expose the full localized year, month, day, time through seconds, time-zone name and numeric UTC offset.

<a id="0266-p003"></a>

The maximum of all constituent row completion instants must equal the header's Latest Completed instant and ADR 0264 primary card-order key. A lazy ADR 0258 detail page is bound to the same opaque generation, stable volume and member-set digest as its header; stale or mismatched row-time evidence cannot be substituted, parsed from localized text or used to rewrite the acknowledged snapshot.

<a id="0266-p004"></a>

Completion time is explanatory only. Rows remain in ADR 0258's stable alphabetical package-identity order and are never sorted, paged, promoted, highlighted or auto-scrolled by time. Midnight, locale and time-zone changes may reformat visible timestamps but cannot move a row, change a page boundary, create another acknowledgement or affect any independent 24-hour expiry.

<a id="0266-p005"></a>

Row timestamps use no relative-age phrase, expiry countdown, minute-level refresh timer or attention animation. They reuse the completion instants already retained for result lifetime and summary ordering, creating no additional durable time field, localized-string cache, row-view history or proof-of-reading signal.

<a id="0266-p006"></a>

The detail response remains path-free. Completion time adds no path, device identifier, owner evidence, payload or user content and is excluded from settings, Full Library Backup, export/merge/sync, Activity History, telemetry, publisher feedback and support logs together with the rest of the ephemeral summary projection.

### 当时实施上下文（来源，非当前状态）

以下句子记录原文写作时的执行/交付范围，不否定当前实现，不授予新操作权限。

<a id="0266-p007"></a>

The current project has no Physical Reclaim Completion Summary details or row-time formatter. This ADR changes documentation only: it loads/formats/sorts no real result, reads no user asset, runtime database, package/cache/model/private state and changes no public IPC/schema/AI Worker API. ADR 0267 places Actual Reclaimed and Shared Retained byte fields after this completion time without changing time semantics.

<a id="adr-0267"></a>

## 0267 · Physical Reclaim Detail Rows Show Actual Reclaimed And Shared-Retained Bytes

决定来源：[0267-physical-reclaim-detail-rows-show-actual-reclaimed-and-shared-retained-bytes.md](../../adr/0267-physical-reclaim-detail-rows-show-actual-reclaimed-and-shared-retained-bytes.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0267-p001"></a>

Every explicitly expanded Physical Reclaim Completion Summary detail row shows two labeled byte fields after ADR 0266's individual completion time: **Actual Reclaimed** and **Shared Retained**. Both are authoritative non-negative integer byte counts from that exact constituent result and both remain visible when zero.

<a id="0267-p002"></a>

The two fields reuse ADR 0261 Storage Byte Display compact IEC units, exact hover/focus byte integers and accessible text without a row-specific formatter. Compact rounding never replaces the raw integers used for validation. Missing, negative, fractional, non-finite or otherwise unassessable row evidence is not coerced to `0 B`.

<a id="0267-p003"></a>

Across every constituent in the frozen ADR 0258 member snapshot, including all unloaded lazy pages, the sum of row Actual Reclaimed values must equal the header's authoritative actual reclaimed byte total. The sum of row Shared Retained values must independently equal the header's Shared Bytes Retained By Other Owners total. The host validates both invariants from the full snapshot; the renderer never computes either header total from currently loaded pages.

<a id="0267-p004"></a>

An Already Absent-only target shows `0 B` Actual Reclaimed and `0 B` Shared Retained because it freed no bytes in the completing episode. Removed Now and Mixed targets report only bytes actually reclaimed. A Completed As Shared target reports the bytes still retained by other owners separately and may also report actual bytes reclaimed earlier in its mixed completion episode; shared bytes never contribute to Actual Reclaimed.

<a id="0267-p005"></a>

The row does not display or derive an already-absent historical size, logical/apparent package size, projected cleanup size, estimated reclaimability, allocation estimate or per-owner share. Existing completion evidence needed to prove object absence remains host-only and is never relabeled as storage freed. Owner categories, identities and byte apportionment remain outside the result projection.

<a id="0267-p006"></a>

Row bytes do not affect ADR 0258 alphabetical order, page membership, ADR 0264 card ordering, disclosure, acknowledgement or expiry. There is no largest-first row sort, byte filter, progress bar, comparison badge or recommendation based on either value.

### 当时实施上下文（来源，非当前状态）

以下句子记录原文写作时的执行/交付范围，不否定当前实现，不授予新操作权限。

<a id="0267-p007"></a>

The current project has no Physical Reclaim Completion Summary details or row-byte projection. This ADR changes documentation only: it totals/formats/reclaims no real bytes, reads no user asset, runtime database, package/cache/model/private state and changes no public IPC/schema/AI Worker API. ADR 0268 filters full-snapshot details only by outcome class and never by these byte values.

<a id="adr-0268"></a>

## 0268 · Physical Reclaim Outcome Counts Filter Full-Snapshot Details

决定来源：[0268-physical-reclaim-outcome-counts-filter-full-snapshot-details.md](../../adr/0268-physical-reclaim-outcome-counts-filter-full-snapshot-details.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0268-p001"></a>

ADR 0260's four second-line outcome counts are explicit, keyboard-accessible **Physical Reclaim Outcome Filters** for expanded details. Exactly one of Removed Now, Already Absent, Mixed or Completed As Shared may be active at a time. Every newly projected summary defaults to **All**, and the header metrics always continue to describe the complete frozen ADR 0258 member snapshot.

<a id="0268-p002"></a>

Activating a nonzero outcome count asks the host for that class across the entire exact generation, stable volume and member-set digest, not just currently loaded rows. The resulting rows retain ADR 0258's stable alphabetical package-identity order and use lazy pages of exactly 50 except the final page. Filtered total and page count come from the host's full-snapshot class membership.

<a id="0268-p003"></a>

The complete target-count control in the first line clears the active filter. Activating the already-selected outcome count also returns to All. A zero-count outcome remains visibly labeled with zero but is disabled and cannot create an empty filtered view. Visual selected/disabled states and accessible names expose the same semantics without relying only on color.

<a id="0268-p004"></a>

Changing or clearing a filter resets the detail view to page one at the top and immediately discards ADR 0270 pages belonging to the old filter. The current filter, current filtered page and scroll position survive collapse and re-expansion of that same summary only within the current usable Storage Management surface session. Leaving Storage Management, closing/losing the renderer session or restarting the host discards them; a later projection begins at All, page one, top.

<a id="0268-p005"></a>

Filtering is a detail projection only. It never changes header target/outcome counts, Actual Reclaimed or Shared Retained totals, Latest Completed time, ADR 0264 card order, the immutable member-set digest, one-viewing acknowledgement or any constituent expiry/ADR 0256 closure. One usable complete header still acknowledges every snapshot member even when details show only one class.

<a id="0268-p006"></a>

The filter request is bound to the exact opaque summary generation, stable-volume identity, member-set digest, outcome class and page index. A stale, partial or mismatched response cannot replace the current detail page or alter result state. It may be retried as a read-only page request without creating another viewing opportunity.

<a id="0268-p007"></a>

There is no multi-select, byte-range filter, largest-first sort, package search, hidden zero-result state or persistent saved filter. ADR 0269 hides pagination when the current filtered total fits one page and otherwise provides fixed First/Previous/direct-jump/Next/Last controls without changing this filter or the header. Filter state and page requests create no settings, database row, filesystem cache, Full Library Backup, export/merge/sync record, Activity History, telemetry or support payload.

### 当时实施上下文（来源，非当前状态）

以下句子记录原文写作时的执行/交付范围，不否定当前实现，不授予新操作权限。

<a id="0268-p008"></a>

The current project has no Physical Reclaim Completion Summary or outcome-filter request. This ADR changes documentation only: it filters/pages/acknowledges no real result, reads no user asset, runtime database, package/cache/model/private state and changes no public IPC/schema/AI Worker API. ADR 0269 defines concrete unbounded-result navigation and invalid-page handling.

<a id="adr-0269"></a>

## 0269 · Physical Reclaim Details Use Bounded Direct-Jump Pagination Controls

决定来源：[0269-physical-reclaim-details-use-bounded-direct-jump-pagination-controls.md](../../adr/0269-physical-reclaim-details-use-bounded-direct-jump-pagination-controls.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0269-p001"></a>

An expanded ADR 0257 Physical Reclaim Completion Summary shows a **Physical Reclaim Page Navigation** bar only when the current ADR 0268 All/outcome-filter result contains more than 50 targets. A result with at most 50 targets fits ADR 0258's single page and hides the entire bar; pagination chrome never appears merely because the unfiltered snapshot is larger.

<a id="0269-p002"></a>

The bar has one fixed logical order: First, Previous, a labeled current-page integer input, a localized total such as “of 23 pages”, Next and Last. Every control has a keyboard-accessible name and focus state. First and Previous are disabled on page one; Next and Last are disabled on the final page. Disabled state is never communicated by color alone.

<a id="0269-p003"></a>

The host derives total pages as the ceiling of the exact filtered target count divided by 50. A user submits a direct page value with Enter or an explicit submit action. An integer from 1 through the current total requests that page directly; submitting the already-current page is a no-op. Focus loss alone does not navigate.

<a id="0269-p004"></a>

Empty, non-integer, fractional, negative, zero and greater-than-total values are invalid. Invalid submission sends no page request, does not clamp, wrap or change the current page, and shows a localized inline validation message programmatically associated with the input. Correcting the value clears the validation. Invalid input is transient editing text, not selected-page state.

<a id="0269-p005"></a>

First, Previous, valid direct jump, Next and Last all use the same bound read-only page request. Only a successful response matching the exact opaque summary generation, stable-volume identity, member-set digest, selected outcome filter and requested page may replace the detail rows. A stale, partial, failed or mismatched response leaves the current page intact. ADR 0271 keeps those current rows visible during a cache-miss demand load and exposes failure through path-free inline retry. After a successful page change, the detail region scrolls to its top without moving the summary card; ADR 0274 restores a keyboard focus origin separately and announces the committed outcome.

<a id="0269-p006"></a>

Page navigation affects details only. It never changes the complete header metrics, immutable snapshot membership, acknowledgement, constituent expiry, ADR 0256 closure or card ordering. The selected page remains ADR 0259 session-only disclosure state: it may survive collapse and re-expansion of the same summary, but leaving Storage Management, renderer-session loss or host restart resets a later projection to page one. Invalid editing text and validation are never retained through collapse.

<a id="0269-p007"></a>

There is no infinite scroll, Load More action, exhaustive run of numbered page buttons, URL/deep link, browse history or persistent last-page preference. Page input and navigation create no database row, filesystem cache, Full Library Backup, export/merge/sync record, Activity History, telemetry or support payload.

### 当时实施上下文（来源，非当前状态）

以下句子记录原文写作时的执行/交付范围，不否定当前实现，不授予新操作权限。

<a id="0269-p008"></a>

The current project has no Physical Reclaim Completion Summary or page-navigation request. This ADR changes documentation only: it requests/renders/acknowledges no real result, reads no user asset, runtime database, package/cache/model/private state and changes no public IPC/schema/AI Worker API. ADR 0270 permits low-priority adjacent-page prefetch within a maximum-three-page session-memory window without changing these controls, and ADR 0274 defines keyboard focus restoration plus accessible status announcements.

<a id="adr-0270"></a>

## 0270 · Physical Reclaim Page Prefetch Uses a Three-Page Session Memory Cache

决定来源：[0270-physical-reclaim-page-prefetch-uses-three-page-session-memory-cache.md](../../adr/0270-physical-reclaim-page-prefetch-uses-three-page-session-memory-cache.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0270-p001"></a>

Each expanded ADR 0257 Physical Reclaim Completion Summary may use one **Physical Reclaim Page Window** for its currently selected ADR 0268 All/outcome filter. The window exists only in renderer memory for the current usable Storage Management surface session and contains at most the successfully rendered current page, its valid immediately previous page and its valid immediately next page: no more than three 50-row responses.

<a id="0270-p002"></a>

After an exact current page has rendered successfully, the summary is still expanded and no user-demand page request is waiting, the renderer may issue low-priority prefetches for either missing adjacent page. User navigation, filtering, collapse, leaving the surface and memory-pressure handling always take priority. Prefetch is opportunistic, never required for a usable header or detail page and never delays an explicit page request.

<a id="0270-p003"></a>

Every cached or prefetched page is keyed by the exact opaque summary generation, stable-volume identity, immutable member-set digest, selected outcome filter and page index. Only a complete successful response matching all keys enters the window. A duplicate in-flight or already-cached page is not requested again; stale, partial, failed or mismatched responses are discarded and cannot replace visible rows or populate the cache.

<a id="0270-p004"></a>

When navigation successfully makes another page current, the window recenters on that page and evicts every response outside its new immediately previous/current/immediately next range. A valid direct jump therefore does not retain the intervening pages. ADR 0269 navigation may use an exact cached adjacent page immediately; a cache miss follows the normal bound host request and never falls back to a page from another filter, summary or snapshot.

<a id="0270-p005"></a>

Changing or clearing the ADR 0268 filter immediately discards every page from the old filter before requesting page one for the new filter. Collapsing a summary stops new prefetch work but may retain its exact three-page window so same-session re-expansion can restore inspection. A new summary generation, volume identity, member digest or renderer session cannot inherit any previous window.

<a id="0270-p006"></a>

Leaving Storage Management, closing or losing the renderer session, restarting the host, or receiving memory-pressure cleanup clears the relevant page windows. Memory pressure may drop prefetched pages first or clear all cached page responses; it never changes authoritative host result state, acknowledgement or expiry. The currently painted rows may remain visible until ordinary navigation or surface teardown, but their discarded response is no longer reusable as a cache hit.

<a id="0270-p007"></a>

Prefetch failure is silent: it creates no error banner, retry prompt, badge or notification and does not alter the current page. A later explicit navigation to that page performs ADR 0271's ordinary user-demand load with stable current rows and visible inline retry on failure. Cache hit, miss, eviction and prefetch activity create no Activity History, telemetry, support payload or proof of viewing.

<a id="0270-p008"></a>

No Physical Reclaim page response is written to SQLite, another database, the filesystem, browser storage, settings, Full Library Backup, export/merge/sync state or any long-lived cache. The cache holds only the path-free detail projection already permitted by ADR 0258 and does not acknowledge results, extend a 24-hour expiry, change ADR 0256 closure or create a public browse history.

### 当时实施上下文（来源，非当前状态）

以下句子记录原文写作时的执行/交付范围，不否定当前实现，不授予新操作权限。

<a id="0270-p009"></a>

The current project has no Physical Reclaim Completion Summary, page prefetch or renderer page window. This ADR changes documentation only: it fetches/caches/evicts no real result, reads no user asset, runtime database, package/cache/model/private state and changes no public IPC/schema/AI Worker API. ADR 0271 defines user-demand loading, visible failure and retry without changing this prefetch policy.

<a id="adr-0271"></a>

## 0271 · Physical Reclaim Demand Page Loads Preserve Current Rows With Inline Retry

决定来源：[0271-physical-reclaim-demand-page-loads-preserve-current-rows-with-inline-retry.md](../../adr/0271-physical-reclaim-demand-page-loads-preserve-current-rows-with-inline-retry.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0271-p001"></a>

When an ADR 0269 page action targets an exact ADR 0270 cache hit, the renderer may commit that page immediately. When the target is not cached, the renderer starts one **Physical Reclaim Demand Page Load** while continuing to display the complete currently committed page. The existing rows are never cleared, replaced with an empty panel or covered by a full-detail skeleton merely because another page is loading.

<a id="0271-p002"></a>

During that demand load, the detail region exposes a programmatic busy state and the pagination area shows a localized status such as “Loading page 7”. ADR 0274 makes this an atomic polite announcement and later announces only an exact committed success or immediate failure. The status identifies the requested page separately from the still-current page so visual and assistive-technology users are not told that navigation already succeeded. The current-page input and selected-page state remain on the committed page until a matching response succeeds.

<a id="0271-p003"></a>

First, Previous, direct-page input/submission, Next and Last are temporarily disabled while the demand load is active. Their busy/disabled state is keyboard accessible and not communicated by color alone. Summary disclosure and ADR 0268 filtering retain their existing semantics; if collapse, filter change, leaving the surface or another request identity invalidates the pending load, any later response is stale and cannot update the page.

<a id="0271-p004"></a>

Only a complete successful response matching the exact requested generation, stable-volume identity, member-set digest, selected outcome filter and page index commits navigation. The renderer then replaces the rows atomically, updates the current-page control, clears the busy/loading state, recenters the ADR 0270 page window and scrolls the detail region to its top as ADR 0269 requires. There is no intermediate partially populated page.

<a id="0271-p005"></a>

If the user-demand request fails, reaches ADR 0273's 10-second monotonic deadline or returns stale, partial or mismatched data, the committed page and its scroll position remain intact. Pagination actions are restored, the busy status clears and a localized path-free inline error appears beside the pagination controls with an explicit Retry action for that same requested page. The error does not expose an endpoint, path, identifier, stack trace or private package detail.

<a id="0271-p006"></a>

Retry is another bound read-only demand request and cannot acknowledge a result, change its expiry or mutate host result state. ADR 0272 makes it explicit, manual, single-flight and available without a fixed attempt cap or automatic backoff. A later successful retry performs the same atomic page replacement; changing page/filter, collapsing the summary or leaving the surface clears an obsolete error. ADR 0270 prefetch failures remain silent and never use this visible user-demand error.

<a id="0271-p007"></a>

Demand loading and failure use no modal, toast, OS notification, global error banner, Activity History, telemetry or support record. They never remove or obscure the complete summary header, and a loading/error state is not evidence that the next page was viewed or acknowledged. ADR 0274 restores keyboard-origin focus without automatically focusing rows or the initial Retry action.

### 当时实施上下文（来源，非当前状态）

以下句子记录原文写作时的执行/交付范围，不否定当前实现，不授予新操作权限。

<a id="0271-p008"></a>

The current project has no Physical Reclaim Completion Summary or demand-page loading state. This ADR changes documentation only: it requests/retries/renders no real result, reads no user asset, runtime database, package/cache/model/private state and changes no public IPC/schema/AI Worker API. ADR 0272 defines manual retry and repeated-failure behavior; ADR 0273 expires each demand request after 10 monotonic seconds and rejects late responses.

<a id="adr-0272"></a>

## 0272 · Physical Reclaim Demand Page Retry Is Manual Single-Flight Without Attempt Limits

决定来源：[0272-physical-reclaim-demand-page-retry-is-manual-single-flight-without-attempt-limits.md](../../adr/0272-physical-reclaim-demand-page-retry-is-manual-single-flight-without-attempt-limits.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0272-p001"></a>

After an ADR 0271 Physical Reclaim Demand Page Load fails, the application performs no automatic application-level retry. The committed rows remain visible and the path-free inline error offers the only **Physical Reclaim Manual Page Retry** action. A transient-looking error, repeated failure or continued expansion never starts a hidden request on the user's behalf.

<a id="0272-p002"></a>

Retry targets the same requested page and is bound again to the exact current summary generation, stable-volume identity, member-set digest and selected ADR 0268 outcome filter. If that identity/filter/page is no longer current or valid, the renderer clears the obsolete error and sends no retry. A retry cannot reuse a response from another filter, summary, generation or page.

<a id="0272-p003"></a>

Only one user-demand request for that summary and requested page may be in flight. Activating Retry starts that request and disables the Retry action together with ADR 0271's page-changing controls until it resolves. Repeated activation, keyboard repeat or duplicate UI events cannot enqueue or overlap additional requests. Other independent summaries retain their own isolated state.

<a id="0272-p004"></a>

A failed retry or ADR 0273 timeout restores the same inline error and immediately makes Retry available again. There is no fixed attempt limit, exponential backoff, cooldown, increasing delay, attempt counter or permanent lockout. Failures replace the existing inline state instead of stacking messages; the user may stop, change page/filter, collapse the summary or leave Storage Management at any time.

<a id="0272-p005"></a>

A successful retry atomically commits the exact whole page under ADR 0271, clears the error and recenters the ADR 0270 three-page window. Changing page/filter, collapsing, leaving the surface or invalidating the snapshot clears the obsolete error and any attempt-local state. No retry count, failure sequence or last-attempt time survives that state change or renderer session.

<a id="0272-p006"></a>

Repeated failure never escalates to a toast, modal, global banner, OS notification, Activity History, telemetry, support payload or diagnostic record. It does not change the complete summary header, member acknowledgement, constituent expiry, ADR 0256 closure, card order or any authoritative host state.

### 当时实施上下文（来源，非当前状态）

以下句子记录原文写作时的执行/交付范围，不否定当前实现，不授予新操作权限。

<a id="0272-p007"></a>

The current project has no Physical Reclaim Completion Summary or manual page retry. This ADR changes documentation only: it retries/counts/locks no real request, reads no user asset, runtime database, package/cache/model/private state and changes no public IPC/schema/AI Worker API. ADR 0273 gives every initial demand load and manual retry its own 10-second monotonic deadline.

<a id="adr-0273"></a>

## 0273 · Physical Reclaim Demand Page Loads Have a Ten-Second Monotonic Deadline

决定来源：[0273-physical-reclaim-demand-page-loads-have-a-ten-second-monotonic-deadline.md](../../adr/0273-physical-reclaim-demand-page-loads-have-a-ten-second-monotonic-deadline.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0273-p001"></a>

Every uncached ADR 0271 Physical Reclaim Demand Page Load, including each explicit ADR 0272 manual retry, receives its own **Physical Reclaim Demand Page Deadline** of 10 seconds. The interval starts when the renderer dispatches that exact bound request and uses elapsed monotonic time rather than wall-clock, time-zone or localized calendar time.

<a id="0273-p002"></a>

A complete matching response may commit only while its request is still active before the deadline transition. Once 10 elapsed seconds are reached, the renderer marks that request token expired, clears the programmatic busy/loading state, restores page-changing controls and shows a localized path-free “Page load timed out” inline error with the same manual Retry action. ADR 0274 immediately announces that timeout and restores any still-valid keyboard focus origin without auto-focusing the initial Retry. The committed page and scroll position remain unchanged.

<a id="0273-p003"></a>

An expired request is permanently stale even if its underlying work later completes successfully. A late response cannot replace rows, change selected page, enter the ADR 0270 three-page window, satisfy a later retry or alter the inline timeout state. Each Retry creates a new request token and a new independent 10-second deadline; it never revives the expired request.

<a id="0273-p004"></a>

If the renderer/host transport supports scoped cancellation, timeout may best-effort cancel only that expired read request. Cancellation success is not required for the UI timeout to finish. When cancellation is unavailable or races with completion, the host may finish its local read, but the renderer safely ignores the response through the expired token and exact request identity.

<a id="0273-p005"></a>

Success, ordinary failure, filter/page change, summary collapse, snapshot invalidation, leaving Storage Management or renderer-session loss ends the active deadline early and prevents its timer from producing a later error. If the application is suspended while a request is active and resumes after the monotonic deadline, it applies timeout before accepting any queued response.

<a id="0273-p006"></a>

The 10-second boundary is presentation/request-liveness policy, not a claim that host result state failed or that deletion/reclaim work was retried. Timeout does not acknowledge the summary, change any constituent expiry, affect ADR 0256 closure, record a page view or clear a valid current-page cache entry.

<a id="0273-p007"></a>

Deadline, expiry token and timeout error are ephemeral renderer state. They create no settings, database/filesystem/browser-storage value, Full Library Backup, export/merge/sync state, Activity History, telemetry, support payload, notification or durable performance record.

### 当时实施上下文（来源，非当前状态）

以下句子记录原文写作时的执行/交付范围，不否定当前实现，不授予新操作权限。

<a id="0273-p008"></a>

The current project has no Physical Reclaim Completion Summary or demand-page deadline. This ADR changes documentation only: it starts/expires/cancels no real request, reads no user asset, runtime database, package/cache/model/private state and changes no public IPC/schema/AI Worker API. ADR 0274 defines post-navigation focus and assistive-technology loading/completion announcements.

<a id="adr-0274"></a>

## 0274 · Physical Reclaim Page Navigation Restores Keyboard Focus And Announces Outcomes

决定来源：[0274-physical-reclaim-page-navigation-restores-keyboard-focus-and-announces-outcomes.md](../../adr/0274-physical-reclaim-page-navigation-restores-keyboard-focus-and-announces-outcomes.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0274-p001"></a>

When keyboard or assistive-technology activation starts an ADR 0269 page action, the renderer records the initiating pagination control as the **Physical Reclaim Page Navigation Focus Origin**. ADR 0271 may temporarily disable that control during a demand load, but a matching completion, ordinary failure or ADR 0273 timeout resolves focus against the recorded origin only if the same summary, filter and expanded detail projection still exists.

<a id="0274-p002"></a>

After resolution, focus returns to the initiating control when it is still rendered and enabled. If a successful navigation reaches a boundary that disables that origin, such as Next on the final page or Previous on page one, focus moves to the always-labeled current-page input instead. A direct-page submission therefore returns to its input, and a manual ADR 0272 retry may return to Retry after another failure because Retry was that attempt's explicit origin.

<a id="0274-p003"></a>

Pointer activation receives no programmatic focus movement. The browser's ordinary pointer-focus behavior may remain, but the renderer never forces focus to the clicked button, current-page input, first detail row, summary header or status message. Successful navigation still scrolls the detail region to its top under ADR 0269; scrolling and focus are separate behaviors.

<a id="0274-p004"></a>

Loading uses one visible atomic polite status, such as “Loading page 7”, and announces it once for a user-demand cache miss. Successful cached or demand navigation uses the same polite live region to announce a localized result such as “Page 7 of 23 loaded; 50 items on this page.” The item value is the committed row count for that page, not the complete filtered-result count, and the total-page value comes from the exact host projection.

<a id="0274-p005"></a>

Ordinary failure and timeout use one immediate assistive-technology alert associated with the inline pagination error. The alert identifies the requested page and says it could not load or timed out without endpoint, path, identifier, package/private detail or diagnostic code. The newly shown Retry action enters the normal Tab order after the error and is not automatically focused for the initial failure.

<a id="0274-p006"></a>

If filter change, collapse, leaving Storage Management, renderer-session loss or snapshot invalidation makes the pending request obsolete, the renderer neither restores focus into removed/obsolete controls nor announces a false success or failure. Focus stays wherever the user subsequently placed it. ADR 0270 prefetch, cache fill/eviction and discarded stale responses never move focus or produce live-region output.

<a id="0274-p007"></a>

Focus-origin and live-message state are ephemeral renderer presentation state. They create no settings, database/filesystem/browser-storage value, Full Library Backup, export/merge/sync state, Activity History, telemetry, support payload, notification or evidence that any detail row was read.

### 当时实施上下文（来源，非当前状态）

以下句子记录原文写作时的执行/交付范围，不否定当前实现，不授予新操作权限。

<a id="0274-p008"></a>

The current project has no Physical Reclaim Completion Summary or navigation-focus policy. This ADR changes documentation only: it moves no real focus, announces no private result, reads no user asset, runtime database, package/cache/model/private state and changes no public IPC/schema/AI Worker API. Pagination placement and sticky scrolling behavior are defined separately rather than assumed here.
