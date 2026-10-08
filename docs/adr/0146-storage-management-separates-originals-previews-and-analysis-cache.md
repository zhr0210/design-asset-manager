# Storage Management Separates Originals Previews and Analysis Cache

Storage accounting separates Original Asset Storage, Required Preview Storage, Analysis Proxy Cache, ADR 0277 Offline Library Catalogs, immutable Model Artifact Storage, evictable Model Derived Runtime Cache, ADR 0183 Canonical Embedding Results, rebuildable ANN Search Indexes, ADR 0191 managed Runtime Package active/rollback storage and ADR 0222 Verified Managed Package Copy storage. Model/runtime artifacts and derived caches may occupy separate managed roots/volumes, but remain separate ownership classes and are never merged behind one generic cache total or delete action. The Storage Management surface reports current usage, availability, logical/shared physical size, rollback/pending/keep pins and reclaimable bytes where applicable without exposing private paths. Library database and analysis-result usage may appear as an additional informational breakdown, but tags, OCR, descriptions, canonical embeddings, jobs, and provenance remain result data governed by ADR 0143 rather than Analysis Proxy Cache.

Original Asset Storage contains library-owned activated Candidate Artifacts and Managed Asset original bytes as ordinary files in ADR 0281 Managed Originals Directory under the user-selected Library Root. It is user-visible but never placed in application installation, application data, cache, temporary, runtime, model, plugin, or producer storage and has no automatic cleanup, transcoding, size-based eviction, TTL, or LRU policy. Application removal, plugin uninstall, settings reset, cache clearing, and Forget Library Registration do not touch it. Referenced Asset source bytes remain user-owned and are never counted as library-reclaimable storage or targeted by a library cleanup action, although Storage Management may report their assessed source size and availability separately. Admission continues to use the dynamic Storage Safety Reserve from ADR 0120. Candidate rejection/expiration and Asset Trash or Permanent Asset Delete follow their explicit lifecycle decisions; the storage panel cannot bypass recovery windows or turn a cache-cleaning action into original deletion.

ADR 0339 applies that reserve to Copy Into Library planning and continuation. A proven whole-scope shortfall blocks initial confirmation, while a later shortfall pauses only remaining item admissions and preserves committed Candidates. Storage Management may expose independently authorized cleanup or migration routes, but the copy workflow itself never deletes originals, required previews, caches or another storage class, and it never converts the batch to Reference in Place.

ADR 0343 keeps Compound Original recovery staging and Superseded Compound Directory Residue within separately disclosed Original Asset Storage/recovery accounting rather than any cache class. A full Compound Directory Rebuild projects complete duplicate and staging bytes and must preserve Storage Safety Reserve before confirmation. Neither generic Storage Management nor storage pressure may delete residue; only its explicit entry-specific review may request operating-system trash for freshly proven superseded members.

ADR 0298 Device Trash Restore Handles are small device-local recovery authority, not Preview Cache, Analysis Proxy Cache, Offline Library Catalog or generic temporary data. Cache cleaning, storage-pressure eviction, settings reset, Library Switch and ordinary restart never remove them. Only their explicit recovery lifecycle or Clear Local Restore Handles may do so, and neither action changes operating-system trash contents.

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

Required Preview Storage contains the persistent overview baseline and On-Demand Render Manifest inside the library's authoritative storage boundary plus a separately accounted evictable Preview Cache under ADR 0147 and ADR 0149. It does not contain permanent full-source-dimension sRGB and P3 images by default. The overview and manifest remain persistent during normal use and enter ADR 0185 Full Library Backup, while Opportunistic Quick Previews and requested high-detail sRGB/P3 tiles are bounded, pinned while visible, TTL/LRU/regeneration-cost evictable and excluded by default. Under ADR 0275, an In-Place Reference Library keeps required overview/manifest data in Library Control Directory while the high-churn Preview Cache defaults to device-local storage outside the adopted source tree. Preview Cache is not Analysis Proxy Cache and is not touched by Clean Analysis Cache Now. Superseded generations and orphan media may be reclaimed only after active-generation, rollback, job-pin, and owning-asset checks; Permanent Asset Delete removes the owning asset's previews and tiles without deleting a referenced original.

Analysis Proxy Cache contains only reproducible intermediate model inputs from ADR 0137. Its default Auto Budget is computed from the cache volume's capacity and currently available space while preserving Storage Safety Reserve; the calculation and policy version are observable, and no automatic target is allowed to consume protected reserve. The target shrinks under disk pressure and evicts unpinned entries using TTL, LRU, and regeneration-cost evidence. Exact policy constants may evolve without changing class ownership, but the current effective byte target, current usage, and next cleanup reason remain visible.

Preview Cache, Analysis Proxy Cache, temporary exports, and other high-churn reproducible derivatives default to an application-managed device-local cache outside an In-Place Reference Library. A user may explicitly co-locate declared rebuildable cache classes in Library Control Directory only after reviewing estimated bytes, write load, synchronization implications, and Storage Safety Reserve; co-location never turns cache into authoritative backup content or grants authority over referenced originals. Unsupported, read-only, or durability/locking-unproven roots instead use a safe library location plus an ordinary referenced source, still without copying the source files.

Offline Library Catalogs are a separate device-local rebuildable storage class. They retain only the bounded basic lexical projection declared by ADR 0277; they contain no original bytes, complete preview set, OCR text, descriptions, canonical embeddings, ANN index, AI result body, source path, or query history. Recently used result thumbnails occupy a separately reported TTL/LRU byte budget and never expand into a default full-library thumbnail copy. Catalog use and bytes are visible per Registered Library, can be disabled or cleared without changing that library, and remain subordinate to an aggregate byte budget and Storage Safety Reserve; eviction reports reduced offline-search coverage rather than implying that authoritative metadata was deleted.

Users may keep Auto Budget or set an explicit cache byte limit and TTL. A user limit is still subordinate to Storage Safety Reserve and active-job pins. Lowering a limit schedules safe eviction rather than cancelling active analysis. Clean Analysis Cache Now removes only unpinned proxy entries, reports reclaimed and still-pinned bytes, and leaves originals, required previews, Model Blob Store artifacts, Model Derived Runtime Cache, current or retained analysis results, canonical embeddings, ANN search indexes, user metadata, and active jobs untouched. Model-derived cleanup is a separate action that removes only unpinned reproducible runtime derivatives, never installed manifest/blob references. ADR 0183 owns a separate derived-index rebuild/clear action. Clearing any reproducible class states which later work or index rebuild will be required.

Analysis cache reclamation runs after one-use work, when the budget or TTL is exceeded, under low-disk pressure, during startup orphan reconciliation, and periodically as a backstop. Cleanup is item-atomic and content-addressed so shared proxies are deleted only when no active reference remains. Storage accounting reconciles database records and managed files after interrupted cleanup without scanning or modifying user-controlled source locations.

ADR 0223 Awaiting Install Decision copies use their explicit seven-day retention and final-day warning, while Kept Verified Package Copy Pins are excluded from that expiry and generic automatic cache cleaning. Clean Analysis Cache, Preview Cache eviction and Model Derived cleanup cannot remove either package-copy class; package storage actions must use package owner accounting and report physically reclaimable bytes.

ADR 0224 grants one 24-hour missed-warning grace before pending-copy cleanup when no usable in-app warning projection occurred during the original final day. Storage pressure may surface or block new work but cannot bypass an owed grace or repurpose a generic cache cleaner to release the owner early.

ADR 0225 Unpin Kept Package Copy atomically replaces the Keep pin with a new seven-day pending-decision owner; it is not a delete or an immediately reclaimable cache event. Package bytes remain owned throughout the transition and shared physical bytes remain while any installed, rollback, transaction or other-copy owner exists. Immediate reclamation requires the separate reviewed Delete Managed Download Copy action.

ADR 0226 requires a fresh per-volume Keep Pin Admission before a pending package owner can become a new indefinite Keep pin. Admission accounts for only physical bytes newly protected by that owner, blocks when the transition would create or enlarge a Storage Safety Reserve shortfall, and reports the exact release requirement without automatically deleting an existing pin or another storage class.

ADR 0227 Clean Up And Keep may place only the target pending package under one current-window active-operation hold for at most 30 elapsed minutes while the user resolves that shortfall. The hold defers its owner cleanup without changing the original deadline, creating a Keep owner or authorizing any listed deletion; each storage action retains its own confirmation and owner accounting.

ADR 0228 gives all such holds in one retention episode a single cumulative 30-minute budget. Re-entry, restart, another window or repeated admission failure can use only the remaining allowance and cannot turn Storage Management into an indefinite package pin; exhausted budget changes no other cleanup or owner-safety gate.

ADR 0229 permits only one active storage-resolution hold per stable affected physical volume. Same-volume roots, windows and application processes share that slot, while distinct volumes may proceed independently under their own reserve and budget; busy requests consume no budget and never auto-queue or start in the background.

ADR 0230 permits an irreversible user-selected batch of eligible managed package-copy references with no default selection. Projected and actual reclamation use the combined owner-graph physical delta per volume rather than summed logical sizes; every item is revalidated and removed atomically, mixed results remain explicit and successful cleanup never auto-creates the requested Keep pin.

ADR 0231 initially orders managed-copy candidates by standalone physical reclamation without calling that order a deletion recommendation. Once destructive selection begins, automatic row order freezes while owner-aware marginal values update in place; row margins are non-additive and the per-volume combined footer remains the only authoritative projected reclaim total.

ADR 0232 compares that footer with Keep Pin Storage Shortfall per physical volume and shows Not Yet Covered, Covered or Covered With Excess without auto-stopping selection, choosing a minimum subset, deleting copies or retrying Keep. Excess on one volume cannot offset another volume's remaining deficit.

ADR 0233 allows a user-confirmed Not Yet Covered selection to delete its currently eligible managed-copy references as a partial cleanup step. Confirmation shows the projected remaining shortfall, each later batch requires fresh selection/review, mixed results return to the list and no “delete until enough” intent or automatic Keep is inferred.

ADR 0234 may replace an expiring interactive cleanup pin with one non-renewable, transaction-bound drain only when a batch was already accepted and running. It protects the target until that batch terminates or for at most five additional elapsed minutes, permits no new scope/action, retains the volume slot, and never changes the selected deletion transaction's own owner-safe pins.

ADR 0235 may atomically replace a drain with one non-renewable, maximum-60-second Post-Cleanup Keep Decision Hold only when its terminal result is freshly Covered and acknowledged in the same usable renderer. It exposes one freshly checked Keep Now request, no new cleanup authority, budget or automatic Keep, and otherwise returns the target to its original retention evaluation.

ADR 0236 makes Keep Now open a compact final confirmation showing exact target, owner-aware newly protected/shared bytes and projected remaining Storage Safety Reserve. Opening or cancelling it consumes no attempt and never pauses the ADR 0235 deadline; only a host-accepted final confirmation consumes the one request and triggers fresh admission.

ADR 0237 allows the final owner-aware byte values to differ from that confirmation without another prompt when the same target, pending owner, content integrity and affected volumes remain authoritative and the fresh atomic snapshot still preserves every Storage Safety Reserve. Success reports committed actual values; unsafe or identity-changing drift fails with no Keep.

ADR 0238 atomically converts a final Keep request accepted before the 60-second deadline into one non-renewable maximum-five-second Keep Commit In Flight transaction. It retains the target and volume slot only for fresh admission and the local owner transition, permits no cancellation or other action, and rolls back an uncommitted timeout without restoring the decision opportunity.

ADR 0239 reconciles an interrupted Keep commit before expiry cleanup or another target action, preserving the durable Keep owner when committed and otherwise the original pending owner/deadlines. Storage Management shows one path-free recovered outcome until one usable viewing opportunity or 24 elapsed hours, without pinning the pending copy, retrying Keep or becoming activity history.

ADR 0240 classifies an unprovable interrupted Keep as Recovery Protected / Reclaimability Not Assessable and blocks automatic deletion or owner mutation only for that copy. Bounded local recheck/repair may clear malformed reconciliation metadata only after authoritative owner evidence proves Kept or Pending; the state occupies no volume slot and never guesses, retries or contacts the network.

ADR 0241 permits one advanced deletion escape only when a fresh complete scan independently proves no installed, rollback, transaction or other managed owner needs the recovery-protected copy. Exact package-name confirmation and final generation revalidation are required; the action is single-target, irreversible, excluded from batch/automatic cleanup and never offers Force Keep or Force Install.

ADR 0242 keeps that deletion disabled whenever a real owner is found and shows only path-free owner categories with links to their normal package, rollback, transaction or managed-copy lifecycle. Recovery UI cannot uninstall, cancel, unpin, release rollback or force-remove an owner, and every owner change invalidates the prior scan.

ADR 0243 leaves the target in Recovery Owner Changed after any such invalidation. Returning from owner management never scans or deletes automatically: the user must explicitly run a new complete scan, obtain fresh no-owner evidence and retype the package name in a new confirmation with no remembered destructive intent.

ADR 0244 limits each completed no-owner proof to five elapsed minutes from its host commit. Confirmation interaction never refreshes it; expiry before host acceptance clears typed input, disables deletion and requires another explicit complete scan while the recovery safety gate remains.

ADR 0245 atomically converts a timely host-accepted advanced delete into one non-cancellable, maximum-five-second reference-removal transaction. Later scan-proof expiry does not cancel the accepted request; durable reference removal makes the delete decision terminal, while physical managed-byte cleanup may finish afterward or enter Physical Reclaim Pending without repeating user intent.

ADR 0246 reconciles an interrupted recovery-protected reference removal once at next startup without retrying it. A proven commit remains Deleted and continues only physical cleanup; a proven non-commit restores Protected state. One path-free explanatory result lasts until one usable Storage Management viewing opportunity or 24 hours.

ADR 0247 places only an unprovable interrupted-delete target behind a neutral Recovery Delete Reconciliation Safety Gate. It blocks owner mutation and physical reclamation without asserting that the reference exists or was deleted; bounded local recheck/repair may clear the gate only after authoritative evidence proves the atomic outcome.

ADR 0248 permits a new Finalize Unassessable Recovery Delete only after explicit local repair remains unresolved, a fresh complete scan proves no declared owner, target/volume/byte identity is stable and the user retypes the exact package name. Its new authorization atomically normalizes all ambiguous target reference/gate/journal state into terminal deletion before separate physical cleanup.

ADR 0249 converts timely host acceptance of that finalization into one non-cancellable, maximum-five-second normalization transaction. Later scan expiry does not cancel it; timeout or new owner/identity drift before commit preserves the neutral gate and consumes the attempt, while a committed terminal state proceeds separately to physical cleanup or Physical Reclaim Pending.

ADR 0250 reconciles an interrupted finalization before any target action. A proven commit remains terminally Deleted; a proven non-commit restores only the ADR 0247 neutral gate; an unprovable boundary also reasserts that gate without changing references or bytes. Only proven outcomes receive one path-free result until one usable viewing or 24 hours.

ADR 0251 permits another manually initiated finalization without a permanent attempt cap or hidden cooldown, but only after the latest ADR 0247 recheck/repair and the entire ADR 0248 scan/confirmation flow are repeated. Exactly one review/transaction may be active per target, no action retries automatically and only the latest path-free failure class is retained.

ADR 0252 allows Physical Reclaim Pending to retry only already-authorized physical cleanup at commit, startup, stable-volume remount, bounded active-app backoff or explicit user request. Every attempt rechecks current owners and exact volume/byte identity, coalesces per target and pauses on owner/unassessable evidence without expiring or repeating delete intent.

ADR 0253 sets transient no-progress retries to 1 minute, 5 minutes, 30 minutes and then at most once per 6 hours while the app can run them. Startup, remount and manual triggers may request one immediate coalesced check; partial progress or authoritative state change resets the ladder, while owner/evidence/volume pauses create no catch-up backlog.

ADR 0254 atomically clears Physical Reclaim Pending, backoff and failure state only after every scoped object is authoritatively removed or already absent. One path-free result reports actual Removed Now versus Already Absent outcomes until one usable viewing or 24 hours, without notifications/history or pruning terminal deletion evidence.

ADR 0255 also completes the deleted target's reclaim responsibility when every physically remaining object is authoritatively retained by another owner and no unowned failed object remains. Completed As Shared clears only that target's scheduler, reports shared bytes as zero freed and leaves future last-owner cleanup to that owner's own transaction.

ADR 0256 prunes the minimal terminal package-copy deletion evidence only after the reclaim result is viewed/expired, every dependent journal/gate/pending/owner transition is closed and a later clean startup check reconfirms absence and owner consistency. No permanent tombstone remains; a future acquisition creates a new managed-copy identity while shared current owners remain untouched.

ADR 0257 presents multiple completions from the same startup/scheduler generation as one per-volume summary with target counts, actual reclaimed, already-absent and shared-retained values. Each constituent keeps its own viewing/24-hour expiry and ADR 0256 closure; later results never extend older ones.

ADR 0258 keeps a large completion summary uncapped while lazily exposing exactly 50 path-free target rows per page. Its authoritative header totals and acknowledges every member in the exact frozen snapshot without requiring page traversal; stable alphabetical identity order freezes for the current surface session, then expired/acknowledged members are removed and later projections recompute totals and pages.

ADR 0259 defaults every completion summary to collapsed regardless of size or outcome and permits expansion only through an explicit user disclosure. Disclosure, current page and scroll position survive only within the current Storage Management surface session; leaving resets the next projection to collapsed page one without changing header acknowledgement or constituent expiry.

ADR 0260 gives that collapsed header two fixed complete metric lines: completion label, total targets and actual reclaimed bytes first, then Removed Now, Already Absent, Mixed and Completed As Shared target counts plus shared-retained bytes. Zero values remain explicitly visible, all four class counts must equal the total and package/publisher/target identities remain in expanded details only.

ADR 0261 formats Storage Management byte totals with 1024-based `B/KiB/MiB/GiB/TiB`, one decimal below 10 and whole values thereafter, while exposing exact locale-grouped bytes through hover/focus and accessible text. Counts use locale grouping without abbreviation, invalid evidence never becomes zero and existing non-storage formatters are not silently changed.

ADR 0262 identifies each completion summary with the current path-free OS volume display name resolved only at render time, or a stable current-session Unavailable Volume ordinal when resolution fails. No path/device/serial/UUID/hash is displayed or persisted; the opaque volume identity alone binds aggregation and acknowledgement.

ADR 0263 appends localized current-session ordinals only when distinct represented available volumes have the same normalized display name. Assignments remain stable without renumbering for that surface session, expose no identifier/capacity/filesystem/hardware evidence and are recomputed rather than persisted for a later session.

ADR 0264 orders transient completion-summary cards by each frozen snapshot's latest authoritative constituent completion instant, newest first. Equal instants use disambiguated locale-collated volume label then hidden opaque volume/generation tie-breakers; the current session preserves surviving relative order and never prioritizes bytes, target count or outcome class.

ADR 0265 shows that same latest completion instant at the end of the summary's first line. Current-day values use localized short time, older values add month/day, and hover/focus/accessibility expose full date, seconds, time zone and UTC offset; no relative age/countdown or localized-string persistence affects ordering or expiry.

ADR 0266 shows each expanded target's own completion instant after its outcome class using the same localized/full time formats. The row maximum must equal the header/order instant, while alphabetical row order, 50-item page boundaries, acknowledgement and expiry remain unchanged and no additional time evidence is retained.

ADR 0267 then shows per-target Actual Reclaimed and Shared Retained bytes, including explicit zeros, using the same IEC/exact-byte formatter. Full-snapshot row sums must equal the two header totals; loaded pages never produce totals, and no absent-history/logical/projected/owner-share size is displayed or inferred.

ADR 0268 makes the four header outcome counts keyboard-accessible single-select detail filters over the full frozen snapshot. Filtered rows keep 50-item alphabetical paging; switching resets page/top, current state survives only collapse/re-expand in the same surface session, and header totals/member acknowledgement/expiry never become filtered.

ADR 0269 hides page navigation when the current filtered result fits 50 rows and otherwise uses fixed First/Previous/direct-page/Next/Last controls. Invalid direct input is never clamped and sends no request; a successful bound page response alone changes rows and scrolls the detail region to its top, while page state remains session-only.

ADR 0270 permits low-priority prefetch of the valid adjacent pages only while a reclaim summary remains expanded. Each summary/current-filter window holds at most previous/current/next in renderer memory, recenters after navigation, clears the old filter immediately and survives collapse only within the current surface session; it never writes a page response to persistent storage.

ADR 0271 keeps the committed reclaim-detail page visible while an uncached user-requested page loads. The detail region becomes programmatically busy and pagination actions pause; success swaps the whole page and scrolls top, while failure restores controls and shows a path-free inline Retry without blank pages, full-detail skeletons or global notifications.

ADR 0272 performs no automatic retry after a demand-page failure. Its explicit Retry is single-flight, has no fixed attempt cap, cooldown or exponential backoff, and repeated failures replace the same inline state without counters, escalation, durable records or permanent lockout.

ADR 0273 gives each initial demand-page load and manual retry a separate 10-second monotonic deadline from renderer dispatch. Timeout restores controls and inline retry while permanently expiring that request token; late responses cannot update rows or cache, and transport cancellation is best-effort only.

ADR 0274 restores keyboard-triggered navigation to its initiating paginator control, or the current-page input when that control becomes boundary-disabled, while pointer actions never force focus. Polite loading/success messages and immediate path-free failure alerts announce outcomes without auto-focusing rows or the initial Retry action; prefetch remains silent.
