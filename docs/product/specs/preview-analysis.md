# 预览、颜色与分析证据：详细能力契约

本文承接原ADR中的细节，保留所有原数字、例外、状态和相互约束；[来源映射](../../checkpoints/documentation-rebuild-20261015/adr-migration.json)逐段核对。**有效要求不是当前交付声明，也不是本轮实施队列。** 现行已批准产品/设计在其明确替代范围内优先；不凭实现缺失判决定无效。

当前系统从[ai-analysis](../../subsystems/ai-system.md#requests)进入；当前实际能力/版本见[CURRENT-STATE](../../handoff/CURRENT-STATE.md)，交互与视觉分别归[交互目录](../../design/README.md)/[DESIGN](../../../DESIGN.md)。详细条款按下面独立主题定位，不全量装入每次上下文。

## 主题导航

- [0132 · Screen Previews Use Explicit Relative Colorimetric Policy](#adr-0132)
- [0134 · Display Gamut Selection Follows The Preview Region](#adr-0134)
- [0146 · Storage Management Separates Originals Previews and Analysis Cache](#adr-0146)
- [0148 · Asset Preview Progressively Reveals Current Viewport Tiles](#adr-0148)
- [0149 · Quick Preview Is Opportunistic and Evictable](#adr-0149)

<a id="adr-0132"></a>

## 0132 · Screen Previews Use Explicit Relative Colorimetric Policy

决定来源：[0132-screen-previews-use-explicit-relative-colorimetric-policy.md](../../adr/0132-screen-previews-use-explicit-relative-colorimetric-policy.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0132-p001"></a>

Ordinary color-managed screen previews use an explicit Preview Rendering Policy of ICC media-relative colorimetric intent with Black Point Compensation enabled. The same selected policy applies when rendering tagged P3 and sRGB overview, quick-preview, or tile variants so destination choice and lazy rendering do not silently change reproduction style. This is application rendering policy, not Authoritative Color Evidence and not a claim about the original creator's intent.

<a id="0132-p002"></a>

The application must not switch rendering intent from image content, format, filename, category, pixel appearance, or the ICC profile header alone. A user may explicitly select perceptual intent when gamut compression and pictorial tonal continuity are preferred. ICC-absolute colorimetric is restricted to an explicit future soft-proof workflow, and saturation intent requires an explicit graphics-oriented choice; neither becomes an automatic ordinary-preview fallback.

<a id="0132-p003"></a>

Each Color Derivation Generation records the selected rendering intent and Black Point Compensation state alongside its source and destination profile references. Changing either setting invalidates the affected color-dependent derived media and creates a new atomic generation. If the requested intent or transform cannot be validated, the backend exposes the failure and retains the last valid generation or clearly labeled Unmanaged Structural Preview when available; it does not silently substitute another intent or activate partial output.

<a id="0132-p004"></a>

Rendering Intent Override scope and persistence are governed by ADR 0133; the product policy is not replaced by a mutable library-wide user default.

<a id="adr-0134"></a>

## 0134 · Display Gamut Selection Follows The Preview Region

决定来源：[0134-display-gamut-selection-follows-the-preview-region.md](../../adr/0134-display-gamut-selection-follows-the-preview-region.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0134-p001"></a>

Display Gamut Selection is runtime routing to a validated preview destination and never rewrites the original when a window moves. Under ADR 0147, an existing compatible tile may be reused or the requested visible tile may be lazily rendered for the selected destination. The target display is determined from the screen-space intersection of the visible preview region, not the primary display, cursor position, or window origin. A display becomes Preview-Dominant Display only when it contains a clear majority of that preview region; an even or indeterminate split selects sRGB Preview Variant output.

<a id="0134-p002"></a>

P3 selection requires corroborating Output Gamut Evidence from both the main-process display color-space report and renderer output capability for the Preview-Dominant Display. Unknown, unavailable, contradictory, virtual-display, remote-session, or otherwise unverified evidence selects sRGB. The implementation normalizes platform-specific evidence behind one shared capability state rather than exposing macOS and Windows as different product semantics.

<a id="0134-p003"></a>

Window move, resize, display add/remove, and relevant display-capability changes trigger reevaluation with settling debounce and Gamut Selection Hysteresis so boundary movement does not alternate destinations or cause unnecessary tile renders. A verified dominant P3 display selects P3 Preview Variant output; otherwise sRGB Preview Variant output remains active. Asset Inspector exposes the selected destination gamut, Preview-Dominant Display evidence summary, cache/render state, and fallback reason without displaying private device identifiers or raw local profile paths.

<a id="adr-0146"></a>

## 0146 · Storage Management Separates Originals Previews and Analysis Cache

决定来源：[0146-storage-management-separates-originals-previews-and-analysis-cache.md](../../adr/0146-storage-management-separates-originals-previews-and-analysis-cache.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0146-p001"></a>

Storage accounting separates Original Asset Storage, Required Preview Storage, Analysis Proxy Cache, ADR 0277 Offline Library Catalogs, immutable Model Artifact Storage, evictable Model Derived Runtime Cache, ADR 0183 Canonical Embedding Results, rebuildable ANN Search Indexes, ADR 0191 managed Runtime Package active/rollback storage and ADR 0222 Verified Managed Package Copy storage. Model/runtime artifacts and derived caches may occupy separate managed roots/volumes, but remain separate ownership classes and are never merged behind one generic cache total or delete action. The Storage Management surface reports current usage, availability, logical/shared physical size, rollback/pending/keep pins and reclaimable bytes where applicable without exposing private paths. Library database and analysis-result usage may appear as an additional informational breakdown, but tags, OCR, descriptions, canonical embeddings, jobs, and provenance remain result data governed by ADR 0143 rather than Analysis Proxy Cache.

<a id="0146-p002"></a>

Original Asset Storage contains library-owned activated Candidate Artifacts and Managed Asset original bytes as ordinary files in ADR 0281 Managed Originals Directory under the user-selected Library Root. It is user-visible but never placed in application installation, application data, cache, temporary, runtime, model, plugin, or producer storage and has no automatic cleanup, transcoding, size-based eviction, TTL, or LRU policy. Application removal, plugin uninstall, settings reset, cache clearing, and Forget Library Registration do not touch it. Referenced Asset source bytes remain user-owned and are never counted as library-reclaimable storage or targeted by a library cleanup action, although Storage Management may report their assessed source size and availability separately. Admission continues to use the dynamic Storage Safety Reserve from ADR 0120. Candidate rejection/expiration and Asset Trash or Permanent Asset Delete follow their explicit lifecycle decisions; the storage panel cannot bypass recovery windows or turn a cache-cleaning action into original deletion.

<a id="0146-p003"></a>

ADR 0339 applies that reserve to Copy Into Library planning and continuation. A proven whole-scope shortfall blocks initial confirmation, while a later shortfall pauses only remaining item admissions and preserves committed Candidates. Storage Management may expose independently authorized cleanup or migration routes, but the copy workflow itself never deletes originals, required previews, caches or another storage class, and it never converts the batch to Reference in Place.

<a id="0146-p004"></a>

ADR 0343 keeps Compound Original recovery staging and Superseded Compound Directory Residue within separately disclosed Original Asset Storage/recovery accounting rather than any cache class. A full Compound Directory Rebuild projects complete duplicate and staging bytes and must preserve Storage Safety Reserve before confirmation. Neither generic Storage Management nor storage pressure may delete residue; only its explicit entry-specific review may request operating-system trash for freshly proven superseded members.

<a id="0146-p005"></a>

ADR 0298 Device Trash Restore Handles are small device-local recovery authority, not Preview Cache, Analysis Proxy Cache, Offline Library Catalog or generic temporary data. Cache cleaning, storage-pressure eviction, settings reset, Library Switch and ordinary restart never remove them. Only their explicit recovery lifecycle or Clear Local Restore Handles may do so, and neither action changes operating-system trash contents.

<a id="0146-p006"></a>

ADR 0458 Batch Text Undo Journal is a separate device-local protected recovery
class, not Preview Cache, Analysis Proxy Cache or generic temporary data.
Preflight estimates its Changed-scope demand against Storage Safety Reserve;
cache cleaning and storage pressure cannot remove active reconciliation
evidence or silently shorten the terminal Undo window. Its exact values and
item detail disappear only through the governed terminal expiry or explicit
Clear Batch Text Edit Result And End Undo action, or through the separately
confirmed ADR 0299 product-controlled removal of local application recovery
state. Out-of-band application-data removal has no retention guarantee and
grants no library-write authority.

<a id="0146-p007"></a>

Required Preview Storage contains the persistent overview baseline and On-Demand Render Manifest inside the library's authoritative storage boundary plus a separately accounted evictable Preview Cache under ADR 0147 and ADR 0149. It does not contain permanent full-source-dimension sRGB and P3 images by default. The overview and manifest remain persistent during normal use and enter ADR 0185 Full Library Backup, while Opportunistic Quick Previews and requested high-detail sRGB/P3 tiles are bounded, pinned while visible, TTL/LRU/regeneration-cost evictable and excluded by default. Under ADR 0275, an In-Place Reference Library keeps required overview/manifest data in Library Control Directory while the high-churn Preview Cache defaults to device-local storage outside the adopted source tree. Preview Cache is not Analysis Proxy Cache and is not touched by Clean Analysis Cache Now. Superseded generations and orphan media may be reclaimed only after active-generation, rollback, job-pin, and owning-asset checks; Permanent Asset Delete removes the owning asset's previews and tiles without deleting a referenced original.

<a id="0146-p008"></a>

Analysis Proxy Cache contains only reproducible intermediate model inputs from ADR 0137. Its default Auto Budget is computed from the cache volume's capacity and currently available space while preserving Storage Safety Reserve; the calculation and policy version are observable, and no automatic target is allowed to consume protected reserve. The target shrinks under disk pressure and evicts unpinned entries using TTL, LRU, and regeneration-cost evidence. Exact policy constants may evolve without changing class ownership, but the current effective byte target, current usage, and next cleanup reason remain visible.

<a id="0146-p009"></a>

Preview Cache, Analysis Proxy Cache, temporary exports, and other high-churn reproducible derivatives default to an application-managed device-local cache outside an In-Place Reference Library. A user may explicitly co-locate declared rebuildable cache classes in Library Control Directory only after reviewing estimated bytes, write load, synchronization implications, and Storage Safety Reserve; co-location never turns cache into authoritative backup content or grants authority over referenced originals. Unsupported, read-only, or durability/locking-unproven roots instead use a safe library location plus an ordinary referenced source, still without copying the source files.

<a id="0146-p010"></a>

Offline Library Catalogs are a separate device-local rebuildable storage class. They retain only the bounded basic lexical projection declared by ADR 0277; they contain no original bytes, complete preview set, OCR text, descriptions, canonical embeddings, ANN index, AI result body, source path, or query history. Recently used result thumbnails occupy a separately reported TTL/LRU byte budget and never expand into a default full-library thumbnail copy. Catalog use and bytes are visible per Registered Library, can be disabled or cleared without changing that library, and remain subordinate to an aggregate byte budget and Storage Safety Reserve; eviction reports reduced offline-search coverage rather than implying that authoritative metadata was deleted.

<a id="0146-p011"></a>

Users may keep Auto Budget or set an explicit cache byte limit and TTL. A user limit is still subordinate to Storage Safety Reserve and active-job pins. Lowering a limit schedules safe eviction rather than cancelling active analysis. Clean Analysis Cache Now removes only unpinned proxy entries, reports reclaimed and still-pinned bytes, and leaves originals, required previews, Model Blob Store artifacts, Model Derived Runtime Cache, current or retained analysis results, canonical embeddings, ANN search indexes, user metadata, and active jobs untouched. Model-derived cleanup is a separate action that removes only unpinned reproducible runtime derivatives, never installed manifest/blob references. ADR 0183 owns a separate derived-index rebuild/clear action. Clearing any reproducible class states which later work or index rebuild will be required.

<a id="0146-p012"></a>

Analysis cache reclamation runs after one-use work, when the budget or TTL is exceeded, under low-disk pressure, during startup orphan reconciliation, and periodically as a backstop. Cleanup is item-atomic and content-addressed so shared proxies are deleted only when no active reference remains. Storage accounting reconciles database records and managed files after interrupted cleanup without scanning or modifying user-controlled source locations.

<a id="0146-p013"></a>

ADR 0223 Awaiting Install Decision copies use their explicit seven-day retention and final-day warning, while Kept Verified Package Copy Pins are excluded from that expiry and generic automatic cache cleaning. Clean Analysis Cache, Preview Cache eviction and Model Derived cleanup cannot remove either package-copy class; package storage actions must use package owner accounting and report physically reclaimable bytes.

<a id="0146-p014"></a>

ADR 0224 grants one 24-hour missed-warning grace before pending-copy cleanup when no usable in-app warning projection occurred during the original final day. Storage pressure may surface or block new work but cannot bypass an owed grace or repurpose a generic cache cleaner to release the owner early.

<a id="0146-p015"></a>

ADR 0225 Unpin Kept Package Copy atomically replaces the Keep pin with a new seven-day pending-decision owner; it is not a delete or an immediately reclaimable cache event. Package bytes remain owned throughout the transition and shared physical bytes remain while any installed, rollback, transaction or other-copy owner exists. Immediate reclamation requires the separate reviewed Delete Managed Download Copy action.

<a id="0146-p016"></a>

ADR 0226 requires a fresh per-volume Keep Pin Admission before a pending package owner can become a new indefinite Keep pin. Admission accounts for only physical bytes newly protected by that owner, blocks when the transition would create or enlarge a Storage Safety Reserve shortfall, and reports the exact release requirement without automatically deleting an existing pin or another storage class.

<a id="0146-p017"></a>

ADR 0227 Clean Up And Keep may place only the target pending package under one current-window active-operation hold for at most 30 elapsed minutes while the user resolves that shortfall. The hold defers its owner cleanup without changing the original deadline, creating a Keep owner or authorizing any listed deletion; each storage action retains its own confirmation and owner accounting.

<a id="0146-p018"></a>

ADR 0228 gives all such holds in one retention episode a single cumulative 30-minute budget. Re-entry, restart, another window or repeated admission failure can use only the remaining allowance and cannot turn Storage Management into an indefinite package pin; exhausted budget changes no other cleanup or owner-safety gate.

<a id="0146-p019"></a>

ADR 0229 permits only one active storage-resolution hold per stable affected physical volume. Same-volume roots, windows and application processes share that slot, while distinct volumes may proceed independently under their own reserve and budget; busy requests consume no budget and never auto-queue or start in the background.

<a id="0146-p020"></a>

ADR 0230 permits an irreversible user-selected batch of eligible managed package-copy references with no default selection. Projected and actual reclamation use the combined owner-graph physical delta per volume rather than summed logical sizes; every item is revalidated and removed atomically, mixed results remain explicit and successful cleanup never auto-creates the requested Keep pin.

<a id="0146-p021"></a>

ADR 0231 initially orders managed-copy candidates by standalone physical reclamation without calling that order a deletion recommendation. Once destructive selection begins, automatic row order freezes while owner-aware marginal values update in place; row margins are non-additive and the per-volume combined footer remains the only authoritative projected reclaim total.

<a id="0146-p022"></a>

ADR 0232 compares that footer with Keep Pin Storage Shortfall per physical volume and shows Not Yet Covered, Covered or Covered With Excess without auto-stopping selection, choosing a minimum subset, deleting copies or retrying Keep. Excess on one volume cannot offset another volume's remaining deficit.

<a id="0146-p023"></a>

ADR 0233 allows a user-confirmed Not Yet Covered selection to delete its currently eligible managed-copy references as a partial cleanup step. Confirmation shows the projected remaining shortfall, each later batch requires fresh selection/review, mixed results return to the list and no “delete until enough” intent or automatic Keep is inferred.

<a id="0146-p024"></a>

ADR 0234 may replace an expiring interactive cleanup pin with one non-renewable, transaction-bound drain only when a batch was already accepted and running. It protects the target until that batch terminates or for at most five additional elapsed minutes, permits no new scope/action, retains the volume slot, and never changes the selected deletion transaction's own owner-safe pins.

<a id="0146-p025"></a>

ADR 0235 may atomically replace a drain with one non-renewable, maximum-60-second Post-Cleanup Keep Decision Hold only when its terminal result is freshly Covered and acknowledged in the same usable renderer. It exposes one freshly checked Keep Now request, no new cleanup authority, budget or automatic Keep, and otherwise returns the target to its original retention evaluation.

<a id="0146-p026"></a>

ADR 0236 makes Keep Now open a compact final confirmation showing exact target, owner-aware newly protected/shared bytes and projected remaining Storage Safety Reserve. Opening or cancelling it consumes no attempt and never pauses the ADR 0235 deadline; only a host-accepted final confirmation consumes the one request and triggers fresh admission.

<a id="0146-p027"></a>

ADR 0237 allows the final owner-aware byte values to differ from that confirmation without another prompt when the same target, pending owner, content integrity and affected volumes remain authoritative and the fresh atomic snapshot still preserves every Storage Safety Reserve. Success reports committed actual values; unsafe or identity-changing drift fails with no Keep.

<a id="0146-p028"></a>

ADR 0238 atomically converts a final Keep request accepted before the 60-second deadline into one non-renewable maximum-five-second Keep Commit In Flight transaction. It retains the target and volume slot only for fresh admission and the local owner transition, permits no cancellation or other action, and rolls back an uncommitted timeout without restoring the decision opportunity.

<a id="0146-p029"></a>

ADR 0239 reconciles an interrupted Keep commit before expiry cleanup or another target action, preserving the durable Keep owner when committed and otherwise the original pending owner/deadlines. Storage Management shows one path-free recovered outcome until one usable viewing opportunity or 24 elapsed hours, without pinning the pending copy, retrying Keep or becoming activity history.

<a id="0146-p030"></a>

ADR 0240 classifies an unprovable interrupted Keep as Recovery Protected / Reclaimability Not Assessable and blocks automatic deletion or owner mutation only for that copy. Bounded local recheck/repair may clear malformed reconciliation metadata only after authoritative owner evidence proves Kept or Pending; the state occupies no volume slot and never guesses, retries or contacts the network.

<a id="0146-p031"></a>

ADR 0241 permits one advanced deletion escape only when a fresh complete scan independently proves no installed, rollback, transaction or other managed owner needs the recovery-protected copy. Exact package-name confirmation and final generation revalidation are required; the action is single-target, irreversible, excluded from batch/automatic cleanup and never offers Force Keep or Force Install.

<a id="0146-p032"></a>

ADR 0242 keeps that deletion disabled whenever a real owner is found and shows only path-free owner categories with links to their normal package, rollback, transaction or managed-copy lifecycle. Recovery UI cannot uninstall, cancel, unpin, release rollback or force-remove an owner, and every owner change invalidates the prior scan.

<a id="0146-p033"></a>

ADR 0243 leaves the target in Recovery Owner Changed after any such invalidation. Returning from owner management never scans or deletes automatically: the user must explicitly run a new complete scan, obtain fresh no-owner evidence and retype the package name in a new confirmation with no remembered destructive intent.

<a id="0146-p034"></a>

ADR 0244 limits each completed no-owner proof to five elapsed minutes from its host commit. Confirmation interaction never refreshes it; expiry before host acceptance clears typed input, disables deletion and requires another explicit complete scan while the recovery safety gate remains.

<a id="0146-p035"></a>

ADR 0245 atomically converts a timely host-accepted advanced delete into one non-cancellable, maximum-five-second reference-removal transaction. Later scan-proof expiry does not cancel the accepted request; durable reference removal makes the delete decision terminal, while physical managed-byte cleanup may finish afterward or enter Physical Reclaim Pending without repeating user intent.

<a id="0146-p036"></a>

ADR 0246 reconciles an interrupted recovery-protected reference removal once at next startup without retrying it. A proven commit remains Deleted and continues only physical cleanup; a proven non-commit restores Protected state. One path-free explanatory result lasts until one usable Storage Management viewing opportunity or 24 hours.

<a id="0146-p037"></a>

ADR 0247 places only an unprovable interrupted-delete target behind a neutral Recovery Delete Reconciliation Safety Gate. It blocks owner mutation and physical reclamation without asserting that the reference exists or was deleted; bounded local recheck/repair may clear the gate only after authoritative evidence proves the atomic outcome.

<a id="0146-p038"></a>

ADR 0248 permits a new Finalize Unassessable Recovery Delete only after explicit local repair remains unresolved, a fresh complete scan proves no declared owner, target/volume/byte identity is stable and the user retypes the exact package name. Its new authorization atomically normalizes all ambiguous target reference/gate/journal state into terminal deletion before separate physical cleanup.

<a id="0146-p039"></a>

ADR 0249 converts timely host acceptance of that finalization into one non-cancellable, maximum-five-second normalization transaction. Later scan expiry does not cancel it; timeout or new owner/identity drift before commit preserves the neutral gate and consumes the attempt, while a committed terminal state proceeds separately to physical cleanup or Physical Reclaim Pending.

<a id="0146-p040"></a>

ADR 0250 reconciles an interrupted finalization before any target action. A proven commit remains terminally Deleted; a proven non-commit restores only the ADR 0247 neutral gate; an unprovable boundary also reasserts that gate without changing references or bytes. Only proven outcomes receive one path-free result until one usable viewing or 24 hours.

<a id="0146-p041"></a>

ADR 0251 permits another manually initiated finalization without a permanent attempt cap or hidden cooldown, but only after the latest ADR 0247 recheck/repair and the entire ADR 0248 scan/confirmation flow are repeated. Exactly one review/transaction may be active per target, no action retries automatically and only the latest path-free failure class is retained.

<a id="0146-p042"></a>

ADR 0252 allows Physical Reclaim Pending to retry only already-authorized physical cleanup at commit, startup, stable-volume remount, bounded active-app backoff or explicit user request. Every attempt rechecks current owners and exact volume/byte identity, coalesces per target and pauses on owner/unassessable evidence without expiring or repeating delete intent.

<a id="0146-p043"></a>

ADR 0253 sets transient no-progress retries to 1 minute, 5 minutes, 30 minutes and then at most once per 6 hours while the app can run them. Startup, remount and manual triggers may request one immediate coalesced check; partial progress or authoritative state change resets the ladder, while owner/evidence/volume pauses create no catch-up backlog.

<a id="0146-p044"></a>

ADR 0254 atomically clears Physical Reclaim Pending, backoff and failure state only after every scoped object is authoritatively removed or already absent. One path-free result reports actual Removed Now versus Already Absent outcomes until one usable viewing or 24 hours, without notifications/history or pruning terminal deletion evidence.

<a id="0146-p045"></a>

ADR 0255 also completes the deleted target's reclaim responsibility when every physically remaining object is authoritatively retained by another owner and no unowned failed object remains. Completed As Shared clears only that target's scheduler, reports shared bytes as zero freed and leaves future last-owner cleanup to that owner's own transaction.

<a id="0146-p046"></a>

ADR 0256 prunes the minimal terminal package-copy deletion evidence only after the reclaim result is viewed/expired, every dependent journal/gate/pending/owner transition is closed and a later clean startup check reconfirms absence and owner consistency. No permanent tombstone remains; a future acquisition creates a new managed-copy identity while shared current owners remain untouched.

<a id="0146-p047"></a>

ADR 0257 presents multiple completions from the same startup/scheduler generation as one per-volume summary with target counts, actual reclaimed, already-absent and shared-retained values. Each constituent keeps its own viewing/24-hour expiry and ADR 0256 closure; later results never extend older ones.

<a id="0146-p048"></a>

ADR 0258 keeps a large completion summary uncapped while lazily exposing exactly 50 path-free target rows per page. Its authoritative header totals and acknowledges every member in the exact frozen snapshot without requiring page traversal; stable alphabetical identity order freezes for the current surface session, then expired/acknowledged members are removed and later projections recompute totals and pages.

<a id="0146-p049"></a>

ADR 0259 defaults every completion summary to collapsed regardless of size or outcome and permits expansion only through an explicit user disclosure. Disclosure, current page and scroll position survive only within the current Storage Management surface session; leaving resets the next projection to collapsed page one without changing header acknowledgement or constituent expiry.

<a id="0146-p050"></a>

ADR 0260 gives that collapsed header two fixed complete metric lines: completion label, total targets and actual reclaimed bytes first, then Removed Now, Already Absent, Mixed and Completed As Shared target counts plus shared-retained bytes. Zero values remain explicitly visible, all four class counts must equal the total and package/publisher/target identities remain in expanded details only.

<a id="0146-p051"></a>

ADR 0261 formats Storage Management byte totals with 1024-based `B/KiB/MiB/GiB/TiB`, one decimal below 10 and whole values thereafter, while exposing exact locale-grouped bytes through hover/focus and accessible text. Counts use locale grouping without abbreviation, invalid evidence never becomes zero and existing non-storage formatters are not silently changed.

<a id="0146-p052"></a>

ADR 0262 identifies each completion summary with the current path-free OS volume display name resolved only at render time, or a stable current-session Unavailable Volume ordinal when resolution fails. No path/device/serial/UUID/hash is displayed or persisted; the opaque volume identity alone binds aggregation and acknowledgement.

<a id="0146-p053"></a>

ADR 0263 appends localized current-session ordinals only when distinct represented available volumes have the same normalized display name. Assignments remain stable without renumbering for that surface session, expose no identifier/capacity/filesystem/hardware evidence and are recomputed rather than persisted for a later session.

<a id="0146-p054"></a>

ADR 0264 orders transient completion-summary cards by each frozen snapshot's latest authoritative constituent completion instant, newest first. Equal instants use disambiguated locale-collated volume label then hidden opaque volume/generation tie-breakers; the current session preserves surviving relative order and never prioritizes bytes, target count or outcome class.

<a id="0146-p055"></a>

ADR 0265 shows that same latest completion instant at the end of the summary's first line. Current-day values use localized short time, older values add month/day, and hover/focus/accessibility expose full date, seconds, time zone and UTC offset; no relative age/countdown or localized-string persistence affects ordering or expiry.

<a id="0146-p056"></a>

ADR 0266 shows each expanded target's own completion instant after its outcome class using the same localized/full time formats. The row maximum must equal the header/order instant, while alphabetical row order, 50-item page boundaries, acknowledgement and expiry remain unchanged and no additional time evidence is retained.

<a id="0146-p057"></a>

ADR 0267 then shows per-target Actual Reclaimed and Shared Retained bytes, including explicit zeros, using the same IEC/exact-byte formatter. Full-snapshot row sums must equal the two header totals; loaded pages never produce totals, and no absent-history/logical/projected/owner-share size is displayed or inferred.

<a id="0146-p058"></a>

ADR 0268 makes the four header outcome counts keyboard-accessible single-select detail filters over the full frozen snapshot. Filtered rows keep 50-item alphabetical paging; switching resets page/top, current state survives only collapse/re-expand in the same surface session, and header totals/member acknowledgement/expiry never become filtered.

<a id="0146-p059"></a>

ADR 0269 hides page navigation when the current filtered result fits 50 rows and otherwise uses fixed First/Previous/direct-page/Next/Last controls. Invalid direct input is never clamped and sends no request; a successful bound page response alone changes rows and scrolls the detail region to its top, while page state remains session-only.

<a id="0146-p060"></a>

ADR 0270 permits low-priority prefetch of the valid adjacent pages only while a reclaim summary remains expanded. Each summary/current-filter window holds at most previous/current/next in renderer memory, recenters after navigation, clears the old filter immediately and survives collapse only within the current surface session; it never writes a page response to persistent storage.

<a id="0146-p061"></a>

ADR 0271 keeps the committed reclaim-detail page visible while an uncached user-requested page loads. The detail region becomes programmatically busy and pagination actions pause; success swaps the whole page and scrolls top, while failure restores controls and shows a path-free inline Retry without blank pages, full-detail skeletons or global notifications.

<a id="0146-p062"></a>

ADR 0272 performs no automatic retry after a demand-page failure. Its explicit Retry is single-flight, has no fixed attempt cap, cooldown or exponential backoff, and repeated failures replace the same inline state without counters, escalation, durable records or permanent lockout.

<a id="0146-p063"></a>

ADR 0273 gives each initial demand-page load and manual retry a separate 10-second monotonic deadline from renderer dispatch. Timeout restores controls and inline retry while permanently expiring that request token; late responses cannot update rows or cache, and transport cancellation is best-effort only.

<a id="0146-p064"></a>

ADR 0274 restores keyboard-triggered navigation to its initiating paginator control, or the current-page input when that control becomes boundary-disabled, while pointer actions never force focus. Polite loading/success messages and immediate path-free failure alerts announce outcomes without auto-focusing rows or the initial Retry action; prefetch remains silent.

<a id="adr-0148"></a>

## 0148 · Asset Preview Progressively Reveals Current Viewport Tiles

决定来源：[0148-asset-preview-progressively-reveals-current-viewport-tiles.md](../../adr/0148-asset-preview-progressively-reveals-current-viewport-tiles.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0148-p001"></a>

Asset Preview displays the validated persistent overview immediately and never waits on professional-format full-detail decode before presenting the preview surface. The overview remains spatially aligned at the current pan, zoom, page, artboard, or frame while detail tiles arrive. A lower-resolution compatible tile may replace the overview first, followed by the target-resolution tile, without changing viewport geometry, introducing a white flash, or blocking controls and Asset Inspector.

<a id="0148-p002"></a>

Every visible-state change creates a Preview Viewport Generation containing asset and visual-unit identity, viewport region, zoom or target pixel density, destination gamut, color/render generation, and window display evidence. Tile requests carry that generation. The scheduler prioritizes visible tiles nearest the viewport center, then remaining visible edges, then a small adjacent prefetch ring only while resources are eligible. Structured-asset navigation thumbnails follow ADR 0150's visible-unit and adjacent-range policy. Neither path expands background prefetch into a complete pyramid or all-unit thumbnail set.

<a id="0148-p003"></a>

Pan, zoom, page/artboard/frame change, asset navigation, window resize, or Display Gamut Selection change supersedes the prior generation. Unstarted obsolete requests are cancelled. Work already inside a non-cancellable decoder boundary may finish and enter Preview Tile Cache if still valid, but its result cannot paint into the newer viewport. Renderer application checks generation and tile identity atomically so stale sRGB/P3, scale, unit, or region output cannot overwrite the current view.

<a id="0148-p004"></a>

Visible tiles and the overview are pinned only while needed by the active preview. Closing or navigating releases pins and allows normal Preview Tile Cache eviction. Rapid interaction favors responsiveness and coarse continuity over completing abandoned high-resolution work. Foreground preview requests take priority over background prefetch and automatic AI detail analysis while still respecting worker memory, process, time, and concurrency limits.

<a id="0148-p005"></a>

Tile failure is localized. The overview or last compatible lower-resolution tile remains visible, the failed region shows a quiet retry state, and cause-aware retry is available without restarting successful regions. Transient worker or resource failure may retry; deterministic decoder, composition, color, or output-validation failure becomes Preview Detail Degraded with worker and generation evidence and is treated as a Preview Broker capability defect. It never crashes the renderer, replaces the full preview with a blank surface, relabels color output, or rewrites the original.

<a id="0148-p006"></a>

Progress and errors are contextual rather than full-screen. Asset Inspector may show current overview/detail/gamut state and a retry action, while ordinary pan, zoom, close, navigation, metadata review, and non-conflicting app work remain available. Accessibility status announces loading or failed detail without repeatedly announcing every tile.

<a id="adr-0149"></a>

## 0149 · Quick Preview Is Opportunistic and Evictable

决定来源：[0149-quick-preview-is-opportunistic-and-evictable.md](../../adr/0149-quick-preview-is-opportunistic-and-evictable.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0149-p001"></a>

An approximately 2048-pixel Quick Preview is not generated as a separate import-time render requirement. Preview Broker may admit an Opportunistic Quick Preview only when the original contains a validated embedded representation of suitable resolution and composition, or when the already-required overview or render-manifest preflight has produced a suitable raster with negligible additional decode and composition work. The broker does not launch a second professional-format render merely to populate this layer.

<a id="0149-p002"></a>

Embedded data is eligible only after signature and decode validation, source/aspect/dimension and visual-unit consistency checks, composition freshness evidence when the format exposes it, alpha validation, color-evidence handling, and output limits pass. A stale, undersized, mismatched, malformed, or color-ambiguous embedded image may still contribute explicit fidelity evidence but cannot become Quick Preview merely because it opens. RAW camera previews and PSD composites follow their format-specific validation rules.

<a id="0149-p003"></a>

The quick result uses the ordinary color and alpha policy and defaults to one sRGB display form when authoritative transformation is available; Unprofiled Color remains explicitly unmanaged. It is never expanded into both permanent sRGB and P3 files. Verified P3 output continues through on-demand tiles, while a compatible embedded wide-gamut quick source may be transformed only if doing so remains within the already-active bounded operation and records its destination.

<a id="0149-p004"></a>

Opportunistic Quick Preview is an evictable Preview Cache entry, not persistent Required Preview Baseline. Its key includes original content, embedded or working-raster provenance, capability/decoder version, visual unit, composition and color generation, rendering policy, alpha recipe, destination, and dimensions. It shares preview-cache budgeting, TTL, LRU, active-view pinning, regeneration-cost evidence, disk-pressure response, and orphan reconciliation with detail tiles, while remaining separate from Analysis Proxy Cache.

<a id="0149-p005"></a>

System Preview Ready depends only on the validated persistent overview plus required On-Demand Render Manifest under ADR 0147; Quick Preview absence, eviction, or failed opportunistic admission is non-blocking. Asset Preview falls back from any cached Quick Preview to the aligned persistent overview and then progressively reveals detail tiles under ADR 0148. Eviction does not schedule regeneration, and a later open recreates Quick Preview only if the same opportunistic conditions arise.
