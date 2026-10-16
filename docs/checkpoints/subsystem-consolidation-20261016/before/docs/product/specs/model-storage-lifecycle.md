# 模型存储与清理恢复：详细能力契约

本文承接原ADR中的细节，保留所有原数字、例外、状态和相互约束；[来源映射](../../checkpoints/documentation-rebuild-20261015/adr-migration.json)逐段核对。**有效要求不是当前交付声明，也不是本轮实施队列。** 现行已批准产品/设计在其明确替代范围内优先；不凭实现缺失判决定无效。

当前系统从[model-library](../../subsystems/model-library.md)进入；当前实际能力/版本见[CURRENT-STATE](../../handoff/CURRENT-STATE.md)，交互与视觉分别归[交互目录](../../design/README.md)/[DESIGN](../../../DESIGN.md)。详细条款按下面独立主题定位，不全量装入每次上下文。

## 主题导航

- [0223 · Awaiting Package Decisions Expire After Seven Days And Explicit Keep Pins Them](#adr-0223)
- [0224 · Missed Pending Package Warnings Receive One 24-Hour Grace](#adr-0224)
- [0225 · Unpinning A Kept Package Copy Starts A New Pending Decision Cycle](#adr-0225)
- [0226 · New Keep Pins Must Preserve The Storage Safety Reserve](#adr-0226)
- [0227 · Storage Resolution Holds Pending Package Cleanup For At Most Thirty Minutes](#adr-0227)
- [0228 · Storage Resolution Holds Share One Cumulative Thirty-Minute Episode Budget](#adr-0228)
- [0229 · Only One Storage Resolution Hold May Be Active Per Volume](#adr-0229)
- [0230 · Managed Package Copy Batch Delete Is User Selected And Owner Aware](#adr-0230)
- [0231 · Managed Copy Cleanup Sorting Freezes During Selection](#adr-0231)
- [0232 · Shortfall Coverage Does Not Auto Stop Selection Or Keep The Target](#adr-0232)
- [0233 · Not Yet Covered Selections May Execute As Explicit Partial Cleanup](#adr-0233)
- [0234 · Running Batch Cleanup Gets One Five Minute Terminal Drain](#adr-0234)
- [0235 · Covered Drain Results Get One Sixty-Second Explicit Keep Decision](#adr-0235)
- [0236 · Post-Cleanup Keep Now Uses A Live Compact Final Confirmation](#adr-0236)
- [0237 · Safe Final Keep Recheck Accepts Nonblocking Byte Drift](#adr-0237)
- [0238 · On-Time Final Keep Requests Get One Five-Second Commit Transaction](#adr-0238)
- [0239 · Interrupted Keep Commits Reconcile Once And Show A Twenty-Four-Hour Result](#adr-0239)
- [0240 · Unassessable Keep Recovery Protects Only The Affected Copy](#adr-0240)
- [0241 · Unrecoverable Keep State Allows Only Owner-Proven Advanced Delete](#adr-0241)
- [0242 · Blocking Managed Owners Route To Their Normal Lifecycle](#adr-0242)
- [0243 · Owner Changes Require A New Explicit Recovery Delete Scan And Confirmation](#adr-0243)
- [0244 · Recovery Delete Owner Scan Proof Expires After Five Minutes](#adr-0244)
- [0245 · On-Time Recovery Delete Gets One Five-Second Reference Removal Transaction](#adr-0245)
- [0246 · Interrupted Recovery Delete Reconciles Once And Shows A Twenty-Four-Hour Result](#adr-0246)
- [0247 · Unassessable Recovery Delete Reconciliation Protects Only The Affected Copy](#adr-0247)
- [0248 · Unassessable Recovery Delete Uses A Fresh Owner-Proven Finalization](#adr-0248)
- [0249 · On-Time Unassessable Delete Finalization Gets One Five-Second Normalization Transaction](#adr-0249)
- [0250 · Interrupted Unassessable Delete Finalization Reconciles Once And Restores Neutral Safety](#adr-0250)
- [0251 · Unassessable Delete Finalization Allows New Fully Gated Manual Attempts](#adr-0251)
- [0252 · Physical Reclaim Pending Retries Owner-Safe Cleanup Without Repeating Delete Intent](#adr-0252)
- [0253 · Physical Reclaim Retries At One Five Thirty Minutes Then Six-Hour Intervals](#adr-0253)
- [0254 · Physical Reclaim Completion Clears Pending State And Shows One Twenty-Four-Hour Result](#adr-0254)
- [0255 · Physical Reclaim Completes As Shared When Other Owners Retain All Remaining Bytes](#adr-0255)

<a id="adr-0223"></a>

## 0223 · Awaiting Package Decisions Expire After Seven Days And Explicit Keep Pins Them

决定来源：[0223-awaiting-package-decisions-expire-after-seven-days-and-explicit-keep-pins-them.md](../../adr/0223-awaiting-package-decisions-expire-after-seven-days-and-explicit-keep-pins-them.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0223-p001"></a>

An ADR 0222 Verified Managed Package Copy enters **Pending Package Decision Retention** when complete verification commits it as Awaiting Install Decision. Its default retention is seven elapsed days from that verified commit, not seven launches, seven app-active days or the short Runtime Package selection-session TTL. The deadline concerns only the app-owned pending-copy reference; it is not package validity, a license window, signed `validUntil` or trust freshness.

<a id="0223-p002"></a>

The final 24 hours become **Pending Package Decision Warning**. The relevant Model Library, Extension Library or AI Runtime package/activity surface shows the exact managed package identity, remaining time, logical/shared/reclaimable bytes and Install Now, Keep For Later and Delete actions. Workspace navigation may show one aggregate pending-decision count, but there is no repeated toast, modal interruption, operating-system notification, forced navigation, background wake or per-clock-tick message. The state is visible only while the application is active.

<a id="0223-p003"></a>

At the seven-day deadline, an unchosen, unpinned and inactive Awaiting Install Decision reference becomes reclaimable. Host cleanup removes that reference and deletes underlying immutable bytes only when ADR 0222 owner accounting proves no installed package, rollback set, active transfer/install, kept copy or other declared owner still needs them. It reports actual physical bytes reclaimed, which may be zero or partial for shared content. Cleanup never touches an External User-Owned Package, installed/extracted content, trust statements, results, user assets or another cache class.

<a id="0223-p004"></a>

An active review, copy operation, integrity check, install/transfer transaction or other declared pin prevents deletion at the deadline and is never cancelled for retention. ADR 0227 defines one such pin for an explicit Clean Up And Keep workflow: it lasts only while the current renderer workflow is usable and no more than 30 elapsed minutes, without moving this deadline. ADR 0228 further limits all re-entries in this retention episode to one cumulative 30-minute budget. ADR 0234 may replace that pin only for an already accepted non-terminal deletion batch and only until its terminal result or five additional elapsed minutes, with no new actions. When that result is freshly Covered, ADR 0235 may atomically continue only into one renderer-acknowledged maximum-60-second decision hold exposing one explicit Keep Now request; it neither moves this deadline nor adds cleanup budget. A final request host-accepted before that decision deadline may atomically continue under ADR 0238's maximum-five-second transaction pin solely to complete or roll back fresh admission and owner commit. When any pin ends, the host reevaluates the expired pending reference at a safe boundary. Choosing Install or Keep before cleanup atomically changes ownership first; choosing Delete uses the explicit ADR 0222 path. Automatic expiry has no Asset Trash or recoverable library record because the bytes are app-owned reacquirable package data, but failure to remove them remains visible as managed storage rather than broadening cleanup.

<a id="0223-p005"></a>

If ADR 0238 is interrupted, ADR 0239 reconciles the durable owner generation before this expiry cleanup acts on that target. A proven committed Keep ends the episode; a proven uncommitted result restores no time and leaves these original deadlines authoritative. Its maximum-24-hour explanatory result does not pin the copy or delay cleanup.

<a id="0223-p006"></a>

If that outcome cannot be proven, ADR 0240 applies a Keep Recovery Safety Gate to only the ambiguous copy before cleanup. It is neither pending-time extension nor a Keep owner: automatic deletion and owner mutation remain blocked until bounded local reconciliation proves Kept or Pending, while unrelated copies and volumes continue normally.

<a id="0223-p007"></a>

After ADR 0226 Keep Pin Admission succeeds, Keep Verified Copy For Later converts the pending reference into a user-controlled **Kept Verified Package Copy Pin**, clears its seven-day deadline/warning and excludes it from Pending Package Decision cleanup and generic automatic package-cache eviction. If admission is blocked, the existing pending episode continues without reset or inferred cleanup. A committed pinned copy continues to count in logical/physical/shared/reclaimable Storage Management totals and remains manually deletable. Low-disk pressure may explain its impact and offer reviewed Install/Delete/unpin actions, but it does not silently release an explicit Keep pin or cancel an active owner.

<a id="0223-p008"></a>

Revocation, suspension, Install Window Ended, incompatibility or changed license/dependency state disables later Install as already governed but neither silently deletes nor unpins a kept copy. Signed recovery/replacement also does not transfer the pin. Installing may consume/reclassify the managed bytes under installed/rollback owner accounting. Explicit Delete follows ADR 0222 immediate-delete intent, while ADR 0225 unpin atomically replaces the Keep pin with a new Awaiting Install Decision owner and full seven-day retention episode rather than deleting the copy.

<a id="0223-p009"></a>

Retention uses a host-owned elapsed-time assessment persisted with verified-commit time, deadline, last observation and decision state. Timezone, locale and daylight-saving changes affect display only. It requires no network or ADR 0208 Trusted Current Time solely to clean app-owned reacquirable bytes. A significant wall-clock rollback/forward anomaly pauses automatic deletion and shows a path-free Retention Time Not Assessable reason rather than shortening the promised window or poisoning future deadlines; a stable later host assessment resumes the same record without user time editing.

<a id="0223-p010"></a>

Explicit Quit leaves no helper, service, scheduled wake or operating-system timer. If the deadline passes while the application is closed, no cleanup or warning runs until a later active session. ADR 0224 grants one 24-hour grace before cleanup when no usable in-app warning projection occurred during the entire original final-day window; a copy that already had such an opportunity receives no automatic extension merely because the app later closed.

<a id="0223-p011"></a>

Pending/kept state, deadlines and pins are device-local package-manager metadata excluded from Full Library Backup, library export/merge/sync and asset counts. Public state exposes opaque package identity, lifecycle class, localized deadline/remaining class and storage counts without paths, former external-file evidence or credentials. Warning/cleanup creates no telemetry, publisher feedback, package-specific OS notification or durable external-selection history.

### 当时实施上下文（来源，非当前状态）

以下句子记录原文写作时的执行/交付范围，不否定当前实现，不授予新操作权限。

<a id="0223-p012"></a>

The current project has only a ten-minute in-memory local Runtime Package selection TTL. It has no Verified Managed Package Copy registry, seven-day pending-decision retention, final-day warning, explicit Keep pin, package-copy owner cleanup, anomaly-safe retention assessment or package-storage projection. This ADR changes documentation only: it starts no timer/service, reads/deletes no package/cache/private state, sends no notification and changes no public IPC/schema/AI Worker API.

<a id="adr-0224"></a>

## 0224 · Missed Pending Package Warnings Receive One 24-Hour Grace

决定来源：[0224-missed-pending-package-warnings-receive-one-24-hour-grace.md](../../adr/0224-missed-pending-package-warnings-receive-one-24-hour-grace.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0224-p001"></a>

If an ADR 0223 Awaiting Install Decision copy reaches its seven-day deadline without any **Pending Package Warning Opportunity** during the entire final 24-hour warning window, the host must not clean it on the next launch. Before owner cleanup runs, the first later usable app session grants that retention episode one **Missed Pending Package Warning Grace** lasting 24 elapsed hours.

<a id="0224-p002"></a>

A warning opportunity exists only when at least one normal main application window is usable and the renderer acknowledges that the Pending Package Decision Warning or its accessible aggregate navigation badge has been projected from current host state. A helper/background process, hidden startup task, updater, main-process creation alone, `ready-to-show` without renderer projection, a launch that crashes before usable UI, or an operating-system wake does not count. The app records opportunity, not whether the user opened, read, clicked or acknowledged a package card; it does not create attention tracking.

<a id="0224-p003"></a>

When the warning was successfully projected at least once during the original final 24 hours, the promised opportunity was available and no missed-warning grace is added merely because the user did not navigate to details. At the ordinary deadline, owner-safe cleanup may proceed under ADR 0223. The aggregate badge and package surface remain non-modal and in-app-only; this rule does not add an OS notification to prove delivery.

<a id="0224-p004"></a>

When grace is required, the host commits `graceGrantedAt`, a 24-hour `graceDeadline` and a consumed marker before any expired-copy deletion. The package surface explains that the app was not available to present the original warning, shows the new deadline, storage impact and Install/Keep/Delete actions, and retains the original verified-commit/seven-day deadline for explanation. Granting grace does not refresh package trust, extend a signed install window, restore compatibility or make Install available when another gate blocks it.

<a id="0224-p005"></a>

The 24 hours are elapsed time from the first usable post-deadline projection, not 24 app-active hours. Closing or quitting after that projection does not pause or restart grace, and no helper wakes the application. If the grace deadline passes while closed, the next usable session may perform owner-safe cleanup without another extension because a real warning opportunity was already projected when grace began. Active review/copy/check/install/transfer pins still defer physical removal to a safe terminal boundary.

<a id="0224-p006"></a>

ADR 0227 Pending Package Storage Resolution Hold is another bounded active-operation pin, not a grace. Its at-most-30-minute cleanup workflow may visibly provide an ordinary warning opportunity, but the original/grace deadlines keep elapsing and the hold cannot grant, pause, reset or duplicate this 24-hour extension.

<a id="0224-p007"></a>

Each Pending Package Decision Retention episode receives at most one missed-warning grace. Restart, reopen, route changes, warning dismissal, catalog refresh, network/timezone changes, clock rollback, digest recheck or sharing the same physical blob cannot reset or duplicate it. ADR 0223 Retention Time Not Assessable pauses the grace/cleanup decision on a significant clock anomaly; it does not clear the consumed marker or manufacture another 24 hours after assessment recovers.

<a id="0224-p008"></a>

Install, Keep or explicit Delete atomically ends the pending/grace episode before cleanup. A later separately confirmed reacquisition may create a new Verified Managed Package Copy decision episode even when content-addressed bytes deduplicate, but the old episode's grace evidence is never transplanted or used to infer user attention. ADR 0225 gives a later explicit unpin its own new seven-day episode and one independently scoped missed-warning grace without reusing prior episode evidence.

<a id="0224-p009"></a>

Low-disk pressure cannot bypass an owed grace or silently release an explicit Keep pin. It may block new downloads/installs, surface actual reclaimable bytes and offer reviewed Delete/Keep/Install actions. At grace expiry, cleanup still drops only the pending owner and physically unshared/unpinned application bytes; it never reaches an External User-Owned Package, installed/rollback content, trust/results or another storage class.

<a id="0224-p010"></a>

Opportunity/grace state is minimal device-local package-manager metadata: retention episode identity, opportunity observed flag/time, grace granted/deadline/consumed state and path-free reason. It is excluded from Full Library Backup, export/merge/sync, telemetry, publisher feedback, support logs and OS notifications. UI receives only opaque package identity, lifecycle/deadline/remaining class and storage counts, not former external-file evidence or a record of user viewing behavior.

### 当时实施上下文（来源，非当前状态）

以下句子记录原文写作时的执行/交付范围，不否定当前实现，不授予新操作权限。

<a id="0224-p011"></a>

The current project has a main-window `ready-to-show` event but no renderer-acknowledged warning projection, Verified Managed Package Copy retention ledger, missed-opportunity assessment, one-time grace state or pre-cleanup ordering. This ADR changes documentation only: it starts no window/timer/helper, grants/expires no real copy, reads/deletes no package/private state, sends no notification and changes no public IPC/schema/AI Worker API.

<a id="adr-0225"></a>

## 0225 · Unpinning A Kept Package Copy Starts A New Pending Decision Cycle

决定来源：[0225-unpinning-a-kept-package-copy-starts-a-new-pending-decision-cycle.md](../../adr/0225-unpinning-a-kept-package-copy-starts-a-new-pending-decision-cycle.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0225-p001"></a>

The explicit **Unpin Kept Package Copy** action, presented to users as Stop Keeping For Later, does not delete a Kept Verified Package Copy. Before confirmation, its review shows the exact managed package identity, current install eligibility, logical/shared/reclaimable bytes and that a new seven-day Pending Package Decision Retention episode will begin. A user seeking immediate space reclamation must instead choose the separate ADR 0222 Delete Managed Download Copy action.

<a id="0225-p002"></a>

On confirmed unpin, the host atomically replaces the Kept Verified Package Copy Pin with a new Awaiting Install Decision owner. The content-addressed bytes must never become temporarily unowned between those changes, and no automatic cleanup or physical deletion runs in the same ownership transaction. If the ownership commit cannot complete durably, the Keep pin remains authoritative and the UI reports that unpin did not finish.

<a id="0225-p003"></a>

The new retention episode starts when that atomic transition commits, not at the original download, verification, Keep or prior pending deadline. It receives a full seven elapsed days under ADR 0223, including its own final 24-hour Pending Package Decision Warning. Earlier episode deadlines, warning opportunities and missed-warning grace timestamps do not shorten or extend the new episode.

<a id="0225-p004"></a>

ADR 0224 applies independently to the new episode. If it has no usable Pending Package Warning Opportunity during its final day, the first later usable projection grants that episode one 24-hour Missed Pending Package Warning Grace. The old episode's consumed marker is not reused, while restart, route changes or repeated projection within the current episode still cannot create another grace.

<a id="0225-p005"></a>

The new episode also receives its own ADR 0228 cumulative 30-minute Pending Package Storage Resolution Budget. Any budget consumed by the episode that ended at Keep is not restored or transferred; deduplicated physical bytes do not merge decision-episode budget state.

<a id="0225-p006"></a>

After unpin, the copy again exposes Install Now, Keep Verified Copy For Later and Delete Managed Download Copy. Choosing Keep atomically ends the pending episode and restores a Keep pin only after ADR 0226 Keep Pin Admission succeeds; a blocked attempt leaves the current episode unchanged. A later explicit unpin may start another new episode. This repeatability follows deliberate user decisions rather than a hidden timer refresh, automatic snooze, application restart or low-disk policy.

<a id="0225-p007"></a>

Revocation, suspension, Install Window Ended, incompatibility or changed license/dependency state may disable Install but does not prevent the user from keeping or deleting the managed copy. Unpin never refreshes trust, extends a signed install window, changes package identity, reacquires bytes or makes an ineligible package executable.

<a id="0225-p008"></a>

An active review, integrity check, transfer, install, copy or other declared transaction prevents an unsafe owner transition. The host either commits the unpin in the same durable owner journal at a safe boundary or leaves the Keep pin unchanged until that boundary; it never cancels active work merely to start retention. Installed, rollback, other-copy and transaction owners remain independent, so shared physical bytes stay present while any owner still needs them.

<a id="0225-p009"></a>

At the new episode's deadline or one-time grace deadline, ADR 0223 owner-safe cleanup may release only its pending reference. Explicit Delete remains the only immediate-delete intent and still reports actual physical reclamation, which may be zero or partial for shared bytes. Generic Analysis Proxy, Preview, derived-model or low-disk cleanup cannot reinterpret either unpin or expiry as authority over another storage class.

<a id="0225-p010"></a>

ADR 0223 elapsed-time and Retention Time Not Assessable rules govern the new episode. Unpin creates no background helper, scheduled wake or OS notification. Current episode identity, timestamps, warning opportunity and grace state remain minimal device-local package-manager metadata excluded from backup, export/merge/sync, telemetry, publisher feedback and support logs; completed episode state may be pruned once no owner-safety decision needs it and never becomes user-attention history.

### 当时实施上下文（来源，非当前状态）

以下句子记录原文写作时的执行/交付范围，不否定当前实现，不授予新操作权限。

<a id="0225-p011"></a>

The current project has no Verified Managed Package Copy registry, Keep/unpin action, durable owner journal, repeated retention-episode state or atomic pin-to-pending transition. This ADR changes documentation only: it unpins/deletes/retains no real package, reads no package/cache/private state, starts no timer/helper, sends no notification and changes no public IPC/schema/AI Worker API.

<a id="adr-0226"></a>

## 0226 · New Keep Pins Must Preserve The Storage Safety Reserve

决定来源：[0226-new-keep-pins-must-preserve-the-storage-safety-reserve.md](../../adr/0226-new-keep-pins-must-preserve-the-storage-safety-reserve.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0226-p001"></a>

Converting an Awaiting Install Decision copy into a Kept Verified Package Copy requires **Keep Pin Admission**. Keep normally writes no new package blob, but it changes owner semantics: physical bytes that could later become reclaimable through ADR 0223 expiry become protected by an indefinite user-controlled pin. The host therefore evaluates that newly protected physical commitment against the affected volume's dynamic Storage Safety Reserve before changing ownership.

<a id="0226-p002"></a>

Admission uses a fresh per-volume snapshot at confirmation. It considers current physical availability, the effective reserve, already-authorized in-flight writes, safely reclaimable bytes under their own automatic policies, and the package bytes that would cease to be reclaimable because of this new owner. Logical package size is not treated as physical impact: content-addressed bytes already protected by installed, rollback, transaction or other-copy owners do not become newly protected again, and free space on another volume cannot offset the affected volume.

<a id="0226-p003"></a>

ADR 0229 uses the same stable affected-volume identity to serialize Clean Up And Keep protection. A busy volume slot blocks only the temporary cleanup hold before ADR 0228 budget is consumed; it is not storage admission success/failure, does not reserve free bytes and never permits one volume to satisfy another's shortfall.

<a id="0226-p004"></a>

If the new pin would create or enlarge a reserve shortfall, Keep is blocked before the owner transition. The Awaiting Install Decision owner, deadline, warning/grace evidence and package bytes remain unchanged; the host does not infer Delete, Install, unpin another copy, generic cache cleanup or consent to reclaim anything. A blocked attempt also does not reset or extend the pending episode. ADR 0227 may defer cleanup through an explicitly entered current-window Clean Up And Keep workflow for at most 30 elapsed minutes, while leaving every deadline unchanged.

<a id="0226-p005"></a>

ADR 0235 may expose one explicit Keep Now request after an ADR 0234 drain produces a freshly Covered result in a usable acknowledged renderer. That result reserves no space: the request still runs this complete admission against fresh owner and volume evidence, and failure ends the one decision opportunity without retry or extension.

<a id="0226-p006"></a>

ADR 0236 requires its compact final confirmation to show the exact target, current per-volume newly protected physical bytes, shared/already-protected bytes and projected remaining reserve. Those displayed values explain impact but reserve nothing; only the host-accepted final confirmation consumes the ADR 0235 attempt and runs this fresh admission.

<a id="0226-p007"></a>

ADR 0237 treats the final atomic admission evidence as authoritative even when its byte values differ from the confirmation snapshot. If the same target/episode, pending owner, content integrity and affected-volume identities remain valid and every volume still preserves reserve, Keep commits without reconfirmation and reports final actual values; otherwise it fails before owner transition.

<a id="0226-p008"></a>

The blocked review shows the exact package identity, affected storage volume in path-free form, current availability, effective Storage Safety Reserve, newly protected physical bytes and **Keep Pin Storage Shortfall**: the physical bytes that must be released on that volume before this pin can commit. It distinguishes logical, shared, already-protected and actually reclaimable bytes so a deduplicated package is not presented as if deleting its full logical size would solve the deficit.

<a id="0226-p009"></a>

The review may list application-managed Verified Managed Package Copies on the affected volume whose separate Delete Managed Download Copy action currently has positive physically reclaimable bytes. Existing kept copies may appear as user-chosen deletion candidates, but none is selected, unpinned or deleted automatically. Installed packages, Last Known Good Runtime owners, active transactions, External User-Owned Packages, original assets, required previews, results, trust state and other storage classes are not relabelled as deletable package copies; any separate cache or rollback action keeps its own policy and confirmation.

<a id="0226-p010"></a>

ADR 0230 allows the user to select multiple eligible managed-copy rows, initially selecting none. Its combined reclaim projection is the affected volume's owner-aware physical delta, not summed logical sizes; the result refreshes this shortfall but never retries or grants Keep automatically.

<a id="0226-p011"></a>

ADR 0231 sorts the initial candidate view by independent physical reclamation only as a stable storage-impact aid, never as a value recommendation. Selection freezes automatic row movement and keeps this shortfall comparison bound to the combined per-volume projection rather than adding row margins.

<a id="0226-p012"></a>

ADR 0232 projects whether the selected combined deletion set covers this shortfall on every affected volume and separately shows projected excess. Coverage is information only: it neither chooses/deletes a subset nor retries this admission automatically.

<a id="0226-p013"></a>

ADR 0233 permits an explicitly confirmed partial batch even while this shortfall remains Not Yet Covered. Its confirmation states the projected per-volume remainder, and every result refreshes admission evidence without converting partial deletion into authority to Keep.

<a id="0226-p014"></a>

Existing Kept Verified Package Copy Pins remain authoritative even when later external writes, volume changes or other admitted work reduce free space. Low-disk pressure may show their storage impact and explicit Delete/Unpin actions, but it never retroactively invalidates admission, silently releases a pin or ranks user intent below automatic cleanup. This ADR constrains creation of a new Keep owner, not continued ownership of an already committed one.

<a id="0226-p015"></a>

After the user explicitly releases enough storage, Keep is retried as a new admission against a fresh snapshot. The host does not reserve success based on stale displayed numbers; shared-owner changes, concurrent work and filesystem availability are rechecked in the same durable transaction that replaces the pending owner with the Keep pin. Under ADR 0237, changed numbers do not block a still-safe identical transition, while a failed check or owner-commit race leaves the pending owner authoritative and refreshes the required-release explanation.

<a id="0226-p016"></a>

Storage candidate identity, availability, reserve, newly protected bytes and shortfall are minimal device-local operational state. Renderer projections use opaque package/volume identities and byte counts without managed paths, external-file evidence or credentials. Admission and blocked attempts are excluded from Full Library Backup, export/merge/sync, telemetry, publisher feedback and support logs and create no OS notification or background service.

<a id="0226-p017"></a>

The current Runtime Package plan exposes manifest size and the executor validates, hashes, extracts, promotes and registers directly. It has no free-space adapter, Storage Safety Reserve calculation, Verified Managed Package Copy owner registry, Keep Pin Admission, per-volume reclaimability projection or deletion-candidate surface. This ADR changes documentation only: it probes no real volume, pins/deletes no package, reads no package/cache/private state and changes no public IPC/schema/AI Worker API.

<a id="adr-0227"></a>

## 0227 · Storage Resolution Holds Pending Package Cleanup For At Most Thirty Minutes

决定来源：[0227-storage-resolution-holds-pending-package-cleanup-for-at-most-thirty-minutes.md](../../adr/0227-storage-resolution-holds-pending-package-cleanup-for-at-most-thirty-minutes.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0227-p001"></a>

When ADR 0226 blocks Keep Pin Admission for insufficient storage, the user may explicitly choose **Clean Up And Keep** for that exact Awaiting Install Decision copy. Entering this reviewed storage workflow creates a temporary **Pending Package Storage Resolution Hold**. Merely seeing the shortfall, opening general Storage Management, application startup or low-disk pressure creates no hold automatically.

<a id="0227-p002"></a>

The hold is an active-operation pin bound to the pending package identity, its current retention episode, one usable main window and the renderer workflow instance. It does not convert the owner into a Kept Verified Package Copy, reserve future admission success, change Keep Pin Storage Shortfall or authorize deletion. The renderer must acknowledge that the exact cleanup workflow is projected, while the host owns the hold and a bounded liveness lease; no mouse, keyboard, focus-history or view-duration tracking is used.

<a id="0227-p003"></a>

ADR 0229 additionally requires the workflow to own the one Storage Resolution Volume Slot for every affected physical volume. Same-volume targets cannot hold cleanup protection concurrently across windows or processes; distinct-volume workflows remain independent. Slot acquisition precedes ADR 0228 budget charging, and a busy request creates neither hold nor budget use.

<a id="0227-p004"></a>

The hold remains valid only while that main window and renderer workflow are usable. Closing or hiding the window, dismissing or navigating away from the workflow, renderer disconnect/crash, Explicit Quit or an unrenewed host lease ends it. Ordinary window occlusion is not user-attention evidence, but a destroyed, minimized or non-interactive workflow cannot keep the hold alive in the background.

<a id="0227-p005"></a>

One active hold lasts no more than 30 elapsed minutes from its host-committed start. Its countdown is not 30 minutes of interaction or foreground activity and cannot pause for sleep, clock/timezone changes, network loss or a stalled renderer. The host applies a monotonic bounded duration and a conservative wall-time ceiling so a clock anomaly cannot lengthen it; ADR 0223 Retention Time Not Assessable may still pause the later cleanup decision but does not extend this operational cap.

<a id="0227-p006"></a>

The hold defers owner cleanup only. The original seven-day deadline and any ADR 0224 grace deadline continue to elapse unchanged, and the UI shows both the original retention state and remaining hold time. It does not reset Pending Package Decision Retention, add a warning opportunity by itself, grant another Missed Pending Package Warning Grace or change package trust/window/compatibility.

<a id="0227-p007"></a>

If the cleanup workflow visibly projects the existing final-day warning or grace state in a usable renderer, that projection may satisfy ADR 0224's ordinary warning-opportunity rule without recording whether the user read it. A grace already owed is committed before cleanup as usual. Hold time and grace may overlap, but neither restarts, pauses or lengthens the other.

<a id="0227-p008"></a>

While the hold is active, the user may invoke separately confirmed Delete Managed Download Copy actions or the ADR 0230 user-selected batch for listed package copies and retry Keep against a fresh storage snapshot. No candidate is preselected or deleted by entering the workflow, and the held target stays outside the candidate batch. Successful Keep atomically replaces the pending owner and ends the hold; Install or explicit deletion of the target copy also ends it. An independently active delete/install transaction keeps only its own ordinary transaction pin until a safe boundary.

<a id="0227-p009"></a>

When the workflow ends or reaches 30 minutes, the host normally releases the temporary pin and reevaluates the unchanged pending episode at a safe boundary. ADR 0234 is the only exception at that boundary: if a batch deletion was already accepted and remains non-terminal, the host may atomically replace this pin with one read-only drain until that batch terminates or for at most five additional elapsed minutes. ADR 0235 may then continue only a freshly Covered drain result into one maximum-60-second renderer-acknowledged Keep decision, not another cleanup workflow or interactive budget. Otherwise, if the ordinary or grace deadline has passed and no other active owner/pin remains, ADR 0223 cleanup may proceed; if time is not assessable or another valid gate still defers cleanup, that existing rule remains authoritative. Route teardown itself never broadens deletion scope or bypasses owner accounting.

<a id="0227-p010"></a>

ADR 0228 gives the retention episode one cumulative 30-minute Pending Package Storage Resolution Budget. Later re-entry can use only its unconsumed remainder; restart, route loops, another window and repeated blocked Keep attempts cannot refresh it. The host durably charges bounded lease quanta so a crash cannot refund already used time while retaining no browsing or attention history.

<a id="0227-p011"></a>

Active hold identity, start/deadline and host/renderer lease evidence are session-bound, path-free operational state excluded from Full Library Backup, export/merge/sync, telemetry, publisher feedback and support logs. Only ADR 0228 episode identity, aggregate consumed duration and exhausted state survive restart. No helper, scheduled wake, OS notification or background renderer preserves an active hold after Explicit Quit.

<a id="0227-p012"></a>

The current Runtime Package UI has local confirmation state, a ten-minute selection TTL and a one-hour completed-execution retention, while the executor has one process-local serial queue. It has no Verified Managed Package Copy registry, Keep admission, Storage Management cleanup workflow, renderer-acknowledged host lease or expiry-cleanup pin. This ADR changes documentation only: it starts no hold/timer/window, reads/deletes no package/cache/private state and changes no public IPC/schema/AI Worker API.

<a id="adr-0228"></a>

## 0228 · Storage Resolution Holds Share One Cumulative Thirty-Minute Episode Budget

决定来源：[0228-storage-resolution-holds-share-one-cumulative-thirty-minute-episode-budget.md](../../adr/0228-storage-resolution-holds-share-one-cumulative-thirty-minute-episode-budget.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0228-p001"></a>

Each ADR 0223 Pending Package Decision Retention episode owns one **Pending Package Storage Resolution Budget** totaling 30 elapsed minutes. Every ADR 0227 Clean Up And Keep hold for that episode consumes the same cumulative budget. Leaving and later re-entering the workflow may use only the unconsumed remainder; renderer reload, route loops, repeated blocked Keep attempts, application restart or a different main window never creates another full allowance.

<a id="0228-p002"></a>

Before granting a hold, the host first acquires every ADR 0229 Storage Resolution Volume Slot and then atomically loads the episode's consumed duration and exhausted state. Remaining duration is `max(0, 30 minutes - consumed duration)`, and the new hold's hard deadline cannot exceed either that remainder or ADR 0227's per-hold limit. Only one hold for the episode may be active at once, so two windows or duplicate renderer requests cannot consume overlapping leases or double-protect the pending owner. A busy volume consumes no budget.

<a id="0228-p003"></a>

Hold time is charged continuously only while the host-issued ADR 0227 workflow lease is valid. To survive an unclean renderer or process failure without refunding time, the host durably precharges a small bounded accounting quantum before issuing each next lease segment. A normal leave or Explicit Quit finalizes the monotonic elapsed use and may return the unused part of the last quantum; a crash keeps the last committed charge. Thus failure may conservatively consume at most one short quantum beyond observed usable time but cannot restore minutes already used. The quantum is an internal bounded implementation constant, not a new user retention period.

<a id="0228-p004"></a>

The durable record contains only opaque retention episode identity, cumulative consumed duration and an exhausted marker. Active hold start/deadline, window/workflow identity and lease sequence remain session memory and disappear when the hold or process ends. No route, focus, click, keystroke, deleted-candidate list or attention history is retained. Updating one aggregate duration is accounting, not a timeline of user activity.

<a id="0228-p005"></a>

When the remaining budget reaches zero, the host commits exhausted state before releasing the final interactive lease. Clean Up And Keep then explains that temporary cleanup protection has been used for this episode and cannot acquire another hold. ADR 0234 may substitute one non-renewable five-minute maximum drain for an already accepted running batch, but it neither refunds nor increases this exhausted budget. A freshly Covered drain result may then receive ADR 0235's one maximum-60-second explicit Keep decision without restoring cleanup time, and at most once per episode. The user may still open ordinary Storage Management, explicitly delete managed copies, retry Keep Pin Admission, Install or Delete the target when otherwise available, but an expired pending owner is no longer protected by this workflow budget.

<a id="0228-p006"></a>

Ending a hold early does not consume the unused remainder, except for the bounded crash-conservative quantum above. A later explicit re-entry may use that remainder if the target still has the same Awaiting Install Decision owner and retention episode and owner-safe cleanup has not already removed it. The budget never resets when storage availability changes, a deletion fails, Keep remains blocked, warning/grace state changes or Retention Time Not Assessable later recovers.

<a id="0228-p007"></a>

Install, successful Keep, explicit target Delete or ADR 0223 expiry ends the retention episode and makes its budget record obsolete. A separately confirmed reacquisition or ADR 0225 unpin creates a genuinely new retention episode with its own 30-minute budget even when content-addressed bytes deduplicate; the old episode's consumed state is never transferred. Obsolete records may be pruned after owner reconciliation and do not become durable history.

<a id="0228-p008"></a>

The budget does not alter the seven-day deadline, ADR 0224 grace, Keep Pin Storage Shortfall, trust state or physical owner accounting. Its only authority is to bound cumulative ADR 0227 active-operation cleanup deferral. Low-disk pressure cannot grant extra budget, while an exhausted budget is not permission to bypass another active transaction pin, time-assessment pause or owner-safe cleanup boundary.

<a id="0228-p009"></a>

Budget state is device-local package-manager metadata excluded from Full Library Backup, export/merge/sync, telemetry, publisher feedback and support logs. Public projection exposes only coarse remaining/exhausted state and localized duration, with opaque package identity and no managed path, external-file evidence or credential.

<a id="0228-p010"></a>

The current Runtime Package session keeps selections, executions and running promises only in process-local maps; its selection TTL and execution-result retention are not persistent owner policy. It has no retention episode ledger, storage-resolution budget, durable consumed-duration update or host lease accounting. This ADR changes documentation only: it persists/charges no real budget, starts no hold/timer, reads/deletes no package/private state and changes no public IPC/schema/AI Worker API.

<a id="adr-0229"></a>

## 0229 · Only One Storage Resolution Hold May Be Active Per Volume

决定来源：[0229-only-one-storage-resolution-hold-may-be-active-per-volume.md](../../adr/0229-only-one-storage-resolution-hold-may-be-active-per-volume.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0229-p001"></a>

Each stable affected storage-volume identity owns one **Storage Resolution Volume Slot**. At most one ADR 0227 Pending Package Storage Resolution Hold may occupy that slot at a time, regardless of package identity, renderer window, route, application process or retention episode. A second Clean Up And Keep request on the same physical volume must wait until the current hold completes or ends; it cannot protect another pending copy concurrently.

<a id="0229-p002"></a>

Volume identity comes from the host storage adapter's stable local-volume evidence, not a displayed path, mount point, drive letter, root label or renderer-provided string. Multiple managed roots on the same physical volume share one slot. Distinct volumes may each hold one independent workflow because their Storage Safety Reserves, physical availability and reclaimable bytes are not interchangeable.

<a id="0229-p003"></a>

Before ADR 0228 precharges any episode budget, the host atomically acquires the required volume slot for the exact pending episode and host/renderer workflow lease. If the slot is busy, the new request consumes no budget, creates no active-operation pin and changes no deadline, warning, grace or owner state. Duplicate requests for the already active exact workflow are idempotent lease checks, not a second hold.

<a id="0229-p004"></a>

The busy projection shows path-free volume identity, that another cleanup workflow currently owns the slot, its coarse remaining-hold class and an action to return to the active workflow when it belongs to this application session. It does not expose another window/process token, managed path, deletion candidates or user activity. There is no automatic queue: after the slot becomes free, starting another hold still requires an explicit current Clean Up And Keep action and fresh ADR 0226 admission/ADR 0228 budget checks.

<a id="0229-p005"></a>

The application does not silently switch targets. Leaving or completing the current workflow first finalizes its consumed budget, releases its hold and reevaluates that target's unchanged retention episode at an owner-safe boundary. Only after release may another target acquire the slot. If the first target's ordinary/grace deadline has already passed, switching away may permit its cleanup; the UI states that consequence before an explicit navigation that ends protection.

<a id="0229-p006"></a>

If one managed copy has owner-attributable bytes on more than one affected volume, its hold must acquire every required volume slot atomically or acquire none. The host uses deterministic volume ordering inside one owner transaction so competing multi-volume requests cannot deadlock or leave a partial hold. Any busy or unassessable volume blocks the whole hold without consuming episode budget; free space on another volume remains irrelevant.

<a id="0229-p007"></a>

Slot ownership normally ends with every ADR 0227 terminal cause: successful Keep, Install or target Delete, workflow leave, unusable window, renderer disconnect, Explicit Quit, lease expiry or the 30-minute/budget limit. ADR 0234 may retain the same slot only for an already accepted non-terminal batch until its result or a five-minute hard drain cap, with no new workflow action. If that result is freshly Covered, ADR 0235 may atomically retain the same slot for one acknowledged maximum-60-second Keep decision. ADR 0238 may then retain it only for a final request accepted before that deadline and only until terminal or a five-second commit cap; success, failure or rollback releases it. A crash leaves no indefinite slot. Another process may reclaim an expired slot only after validating the lease generation and reconciling the pending owner, preventing a stale process from continuing to renew or release the replacement hold.

<a id="0229-p008"></a>

Different-volume holds remain independent but still obey their own one-per-episode ADR 0228 budget and one usable workflow lease. A low-disk event, generic Storage Management page, background renderer or cleanup completion on another volume cannot create, transfer or extend a slot. Existing transaction pins and Retention Time Not Assessable remain separate gates and do not masquerade as volume-slot ownership.

<a id="0229-p009"></a>

ADR 0240 Keep Recovery Safety Gate is also separate from slot ownership. It protects only one copy whose interrupted owner transition cannot be proved, acquires no volume slot and cannot block a different target's cleanup workflow even on the same physical volume.

<a id="0229-p010"></a>

ADR 0230 batch deletion runs as explicit storage actions inside the active workflow; it does not acquire extra Clean Up And Keep slots or protect selected deletion candidates. Candidate copies on another volume are accounted separately and do not reduce this volume's shortfall. Per-item delete transaction pins remain narrower than the volume slot and end at their own safe boundaries.

<a id="0229-p011"></a>

Active slot state contains only opaque stable volume identity, opaque retention episode/hold token, lease generation and coarse deadline. It is device-local operational state excluded from Full Library Backup, export/merge/sync, telemetry, publisher feedback and support logs. Public UI receives only path-free volume/package identity and busy/remaining class; it records no window history, attention or queued intent.

<a id="0229-p012"></a>

The current Electron main entry normally creates one main BrowserWindow but has no application single-instance lock. Runtime Package execution has one process-local serial promise queue, not a stable-volume or cross-process storage-resolution lease. The project has no managed-copy owner registry, volume-slot identity, cleanup-hold arbitration or stale-lease reconciliation. This ADR changes documentation only: it acquires/releases no real lock, opens no window, reads/deletes no package/private state and changes no public IPC/schema/AI Worker API.

<a id="adr-0230"></a>

## 0230 · Managed Package Copy Batch Delete Is User Selected And Owner Aware

决定来源：[0230-managed-package-copy-batch-delete-is-user-selected-and-owner-aware.md](../../adr/0230-managed-package-copy-batch-delete-is-user-selected-and-owner-aware.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0230-p001"></a>

ADR 0227 Clean Up And Keep and ordinary package Storage Management may offer **Managed Package Copy Batch Delete** for application-owned Verified Managed Package Copies. The review starts with no selected rows. Only an explicit user selection can enter the delete plan; opening the list, a Keep Pin Storage Shortfall, low-disk pressure, sorting/filtering, a previous selection or a suggested reclaim target never preselects or executes a copy.

<a id="0230-p002"></a>

Each row shows path-free package/publisher/target identity, decision state, affected volume, logical bytes, shared/already-protected bytes and currently reclaimable physical bytes. Awaiting and Kept copies may be selectable when ADR 0222 Delete Managed Download Copy is currently permitted. The exact Clean Up And Keep target remains outside the candidate batch and keeps its separate target Delete action because deleting it ends that workflow rather than making space to Keep it.

<a id="0230-p003"></a>

ADR 0231 supplies the list order and per-row selection aid. The initial default uses descending independently reclaimable physical bytes without recommending deletion; after selection begins, automatic ordering freezes while non-additive add/remove marginal contributions update in place. Only this ADR's combined per-volume owner-graph total authorizes the confirmation projection.

<a id="0230-p004"></a>

Installed/extracted packages, active or Last Known Good Runtime owners, active transfer/install/delete transactions, ADR 0240 recovery-protected copies, External User-Owned Packages, user assets, required previews, results, trust evidence and other cache/storage classes are not eligible managed-copy rows. ADR 0241's owner-proven advanced deletion remains an isolated exact-name-confirmed action and never enters this batch. A row that becomes active, changes owner or otherwise loses eligibility after selection moves to Excluded Selection with a typed reason; the batch never cancels an operation, uninstalls content, releases rollback or broadens deletion authority.

<a id="0230-p005"></a>

The review computes **Owner-Aware Batch Reclaimable Bytes** as the physical before/after delta if the selected app-owned copy references were removed while every unselected installed, rollback, kept, pending, transaction and other declared owner remained. It is not the sum of row logical sizes or independent row estimates. Shared content is counted once, zero/partial reclamation stays visible, and totals are separated per stable physical volume; bytes on another volume do not satisfy the target shortfall.

<a id="0230-p006"></a>

Before execution, an irreversible confirmation sheet shows selected, currently eligible and excluded counts, exact package identities, per-volume projected physical reclamation, logical/shared bytes, the remaining Keep Pin Storage Shortfall if the projection succeeds, and that there is no Asset Trash or Undo. No default confirmation, select-all implication, deletion of the held target or automatic Keep follows from reaching the sheet.

<a id="0230-p007"></a>

ADR 0232 lets selection continue after the per-volume projection covers the Keep shortfall. The footer and confirmation show Covered/Projected Excess without auto-opening the sheet, identifying an unnecessary row or computing a minimum delete set; the user's selected identities remain the only proposed deletion scope.

<a id="0230-p008"></a>

ADR 0233 also permits a Not Yet Covered selection with at least one fresh eligible row to enter the same irreversible confirmation as an explicit partial cleanup. The sheet shows projected remaining shortfall and the action remains Delete Selected Managed Copies; it never adds rows or promises enough space.

<a id="0230-p009"></a>

Execution revalidates the fresh owner graph, volume identity, active pins and each selected reference. Every eligible copy reference is removed item-atomically through the same ADR 0222 Delete Managed Download Copy boundary. Underlying immutable blobs are deleted only after durable reference removal proves no owner remains. A failure for one item leaves that reference unchanged and does not roll back already successful independent deletions or widen the scope to another item.

<a id="0230-p010"></a>

If this accepted batch is still running when the interactive cleanup hold/budget ends, ADR 0234 may protect only the held target through one read-only drain until the batch result or a five-minute cap. The batch's selected-item transactions remain safe independently; drain expiry never cancels them or expands them to the target.

<a id="0230-p011"></a>

Because shared ownership couples physical reclamation, the final result recomputes the owner graph rather than promising the preview total. It reports successful, excluded/skipped and failed copy counts; logical references removed; actual physical bytes reclaimed per volume; bytes still shared/pinned; and any **Physical Reclaim Pending** state where reference deletion committed but safe managed-file removal must be reconciled later. It never reports the sum of selected logical sizes as freed disk space.

<a id="0230-p012"></a>

Managed orphan reconciliation may later retry physical removal only after the delete authorization has already committed the last owner-reference removal. Retrying a failed reference deletion requires a new explicit item/batch action. This follows ADR 0079's separation of recovery from undo: the irreversible batch has no undo, does not automatically repeat user-intent writes and never restores a deleted copy from hidden backup.

<a id="0230-p013"></a>

ADR 0252 defines that physical-only reconciliation: commit/startup/volume/active-app/manual triggers may retry after a fresh owner and stable-byte identity check, with at most one attempt per target. Owner, unavailable-volume or unassessable evidence pauses deletion, while the pending state has no age-based abandonment and never repeats this batch's reference writes.

<a id="0230-p014"></a>

ADR 0254 clears that pending scheduler only when every scoped object is authoritatively removed or already absent, then shows one actual-byte result for at most one usable viewing or 24 hours. Batch projections and logical size never become the completion amount.

<a id="0230-p015"></a>

ADR 0255 may instead finish one deleted target as Completed As Shared when every remaining physical object has another current authoritative owner and no unowned cleanup failure remains. Shared bytes are retained and counted as zero freed; their future last-owner transition owns any later physical reclaim.

<a id="0230-p016"></a>

ADR 0256 removes the completed target's minimal terminal evidence only after its result and every dependent recovery/reclaim state close and a later startup reconfirms owner consistency. It creates no permanent batch deletion tombstone and changes no surviving shared owner.

<a id="0230-p017"></a>

ADR 0257 aggregates later completions from one reconciliation/scheduler generation per physical volume for display only. It reports actual totals and path-free expandable targets, while every item result preserves its independent acknowledgement, 24-hour expiry and deletion-evidence closure.

<a id="0230-p018"></a>

ADR 0245 reuses only this Physical Reclaim Pending separation after a recovery-protected reference has durably committed removal. Its advanced delete remains an isolated single-target transaction, never joins this batch and never lets physical-cleanup reconciliation repeat reference deletion or its consumed authorization.

<a id="0230-p019"></a>

After the batch, the active Clean Up And Keep workflow refreshes availability, candidate rows and shortfall and returns focus according to ADR 0233 mixed-result selection. Even when enough space was reclaimed, Keep Pin Admission remains a separate explicit retry against a fresh snapshot; batch success never creates a Keep owner automatically. If terminal completion occurs inside ADR 0234's drain and fresh actual evidence is Covered, ADR 0235 may replace that drain only after the same usable renderer acknowledges the result, offering one freshly rechecked Keep Now request for at most 60 seconds without another deletion batch. If the shortfall remains, the user may make another manual selection only while the ADR 0227 hold, ADR 0228 budget and ADR 0229 volume slot remain valid.

<a id="0230-p020"></a>

The immediate Mixed Managed Copy Delete Result retains only opaque batch/item identities, result/reason classes and logical/shared/reclaimed byte counts needed to explain the operation. It contains no payload, managed/external paths, credentials, content, user assets or former external-file evidence and is excluded from Full Library Backup, export/merge/sync, telemetry and publisher feedback. Longer activity-history retention is not created by this decision.

### 当时实施上下文（来源，非当前状态）

以下句子记录原文写作时的执行/交付范围，不否定当前实现，不授予新操作权限。

<a id="0230-p021"></a>

The current project has no Verified Managed Package Copy registry, owner-aware reclaimability projector, package-copy delete action, batch selection/revalidation or mixed package-delete result. Existing Candidate Batch Action ADRs and UI do not provide package-owner semantics, while Runtime Package execution still installs directly. This ADR changes documentation only: it selects/deletes/reconciles no real copy, reads no package/private state and changes no public IPC/schema/AI Worker API.

<a id="adr-0231"></a>

## 0231 · Managed Copy Cleanup Sorting Freezes During Selection

决定来源：[0231-managed-copy-cleanup-sorting-freezes-during-selection.md](../../adr/0231-managed-copy-cleanup-sorting-freezes-during-selection.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0231-p001"></a>

An ADR 0230 Managed Package Copy Batch Delete list initially sorts eligible rows by **Independent Managed Copy Reclaimable Bytes** descending: the physical delta if that one app-owned copy reference were deleted while every other owner and candidate remained. This is a storage-impact ordering, not a recommendation or statement of user value. The UI does not label any row “recommended,” “safe to remove,” “unused” or “best” merely because it appears first.

<a id="0231-p002"></a>

Ties use stable path-free package identity and opaque copy identity so the same owner-graph snapshot produces deterministic order without filenames, paths, access history or attention data. Lifecycle, revocation, compatibility, age and Keep status remain visible facts but are not covert value scores or default-delete priorities. A user may deliberately choose another explicit sort, but no sort mode selects rows.

<a id="0231-p003"></a>

While the selection is empty, a fresh host owner-graph snapshot may update independent reclaimable values and the default order. Once the user selects the first row, the current **Stable Cleanup Selection Order** freezes. Selecting/deselecting rows, recalculating shared ownership, budget countdown, shortfall changes or background owner invalidation updates values and eligibility in place but does not automatically move rows.

<a id="0231-p004"></a>

An item that becomes ineligible or disappears from ordinary candidates stays at its keyed position as an Excluded/Unavailable placeholder until selection is cleared, the batch finishes or the user explicitly refreshes the result set. This prevents row collapse from moving another destructive checkbox under the pointer. Selected identity is host-issued and stable; array position, displayed label and renderer index never authorize deletion.

<a id="0231-p005"></a>

An explicit user sort remains a presentation action under ADR 0081: it may reorder the same keyed result set while preserving selected identities and focus, but the action must be deliberate and cannot occur as a side effect of checking a box. Filter, volume, search, route or candidate-scope changes that can hide selected package copies clear the destructive selection before presenting a different result set; there is no implicit cross-scope selection.

<a id="0231-p006"></a>

After every selection change, the host computes **Marginal Batch Reclaim Contribution** from the current selected set. For an unselected row it means the extra physical bytes projected if that row were added; for a selected row it means the physical reclamation projected to be lost if that row were removed. The value is a counterfactual aid, not an independent byte claim.

<a id="0231-p007"></a>

Marginal contributions are explicitly non-additive. Two selected references may jointly release a shared blob even though neither releases it alone, or each removal counterfactual may appear to lose the same shared bytes. Row margins therefore may overlap and never have to sum to Owner-Aware Batch Reclaimable Bytes. The per-volume combined footer from ADR 0230 remains the only authoritative projected total and shortfall comparison.

<a id="0231-p008"></a>

ADR 0232 may mark that footer Covered or Covered With Excess, but neither state reorders rows, stops selection or identifies a minimum/unnecessary row. Continued explicit selection only updates margins and the combined per-volume remaining/excess projection in place.

<a id="0231-p009"></a>

Every projection carries an opaque owner-graph generation. If another process, install, delete, Keep/unpin transition or transaction changes ownership, the host invalidates the generation. The renderer keeps row positions stable, marks affected values Recalculating and disables irreversible confirmation until a fresh generation arrives; it never silently executes from stale margins or locally recomputes filesystem ownership.

<a id="0231-p010"></a>

ADR 0243 applies the same host-authoritative invalidation principle more strictly to recovery-protected single-copy deletion: owner change clears the prior scan and typed confirmation, but unlike this ordinary list refresh it requires a new explicit complete scan before another destructive review can exist.

<a id="0231-p011"></a>

After batch completion, explicit selection clearing or an explicit refresh, a new result-set snapshot may apply the default descending independent-reclaim order again. Mixed-result rows follow ADR 0230/ADR 0084 outcome focus rather than being reinserted under the pointer during execution. No automatic reordering occurs while confirmation or deletion is running.

<a id="0231-p012"></a>

Sort key, frozen row order, selected opaque identities, projection generation and marginal byte values are session-bound UI/operation state. They are excluded from Full Library Backup, export/merge/sync, telemetry, publisher feedback and support logs and do not create package-use or user-value history.

### 当时实施上下文（来源，非当前状态）

以下句子记录原文写作时的执行/交付范围，不否定当前实现，不授予新操作权限。

<a id="0231-p013"></a>

The current project has no Verified Managed Package Copy list, owner-graph generation, independent/marginal reclaim projector, stable destructive-row placeholder or batch package selection. Existing renderer sorts cover unrelated asset/tag views and cannot infer package ownership. This ADR changes documentation only: it sorts/selects/deletes no real copy, reads no package/private state and changes no public IPC/schema/AI Worker API.

<a id="adr-0232"></a>

## 0232 · Shortfall Coverage Does Not Auto Stop Selection Or Keep The Target

决定来源：[0232-shortfall-coverage-does-not-auto-stop-selection-or-keep-the-target.md](../../adr/0232-shortfall-coverage-does-not-auto-stop-selection-or-keep-the-target.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0232-p001"></a>

The ADR 0230 combined footer compares Owner-Aware Batch Reclaimable Bytes with ADR 0226 Keep Pin Storage Shortfall as a **Keep Shortfall Coverage State**. Each affected physical volume is evaluated separately. A volume shows remaining shortfall when projected reclamation is lower, Covered when it exactly meets the requirement, or Covered With Excess with projected excess physical bytes when it is higher.

<a id="0232-p002"></a>

The overall state is Not Yet Covered while any required volume remains short, even if another volume has excess. It becomes Covered only when every affected volume meets or exceeds its own requirement, and Covered With Excess when all are covered and at least one has projected excess. Cross-volume totals, logical package sizes and unrelated free space never offset a deficient volume.

<a id="0232-p003"></a>

Reaching Covered or Covered With Excess changes explanation only. The application does not stop selection, close the review, clear or disable other checkboxes, choose a subset, open confirmation, execute deletion or retry Keep Pin Admission automatically. The selected identities, ADR 0231 Stable Cleanup Selection Order, ADR 0227 hold, ADR 0228 budget and ADR 0229 volume slot continue unchanged until an explicit user action or their existing terminal rules.

<a id="0232-p004"></a>

The user may continue selecting or deselecting rows after coverage. The host recomputes per-volume owner-aware totals, remaining/excess bytes and ADR 0231 non-additive margins from a fresh generation, while rows stay in place. The footer displays that the current Keep shortfall is satisfied and how many projected physical bytes exceed it; it never implies that projected bytes have already been freed.

<a id="0232-p005"></a>

No row is labelled Unnecessary, Excess, Remove From Selection or part of a computed minimum set. Shared-owner complementarity can make multiple different subsets cover the same shortfall, and an individual marginal contribution can change when another row is selected. The host therefore does not infer which package has less user value or solve a hidden automatic deletion plan.

<a id="0232-p006"></a>

If the user opens ADR 0230 irreversible confirmation with projected excess, the same sheet separately states per-volume required, projected and excess physical bytes and that the user selected more projected reclamation than the current Keep request requires. This is an informational excess warning inside the explicit confirmation, not a second consent trick, forced deselection or permission to delete an unselected row.

<a id="0232-p007"></a>

Owner-graph invalidation before execution may change Covered to Not Yet Covered or change the excess. ADR 0231 disables stale confirmation and returns the refreshed per-volume state for review without reordering rows or preserving an outdated promise. Execution then uses ADR 0230 item-atomic revalidation and reports actual physical reclamation, which may differ from the projection.

<a id="0232-p008"></a>

After deletion, the workflow recomputes actual availability and a fresh Keep Pin Storage Shortfall. Neither projected coverage nor actual batch success automatically creates a Keep owner; the user must explicitly retry Keep Pin Admission. If concurrent writes or changed owners recreate a shortfall, the pending copy remains pending and the UI explains the new state.

<a id="0232-p009"></a>

ADR 0233 permits a deliberately Not Yet Covered selection with at least one eligible row and a fresh owner generation to execute as explicit Partial Managed Copy Cleanup. Its confirmation shows projected remaining shortfall and uses Delete Selected Managed Copies; nothing authorizes an automatic deletion to reach coverage.

<a id="0232-p010"></a>

Coverage state, per-volume required/projected/remaining/excess bytes and projection generation are session-bound operational UI state. They are excluded from Full Library Backup, export/merge/sync, telemetry, publisher feedback and support logs and contain no paths, content, credentials, user-value score or attention history.

### 当时实施上下文（来源，非当前状态）

以下句子记录原文写作时的执行/交付范围，不否定当前实现，不授予新操作权限。

<a id="0232-p011"></a>

The current project has no managed package-copy registry, Keep shortfall projector, batch owner graph, per-volume coverage footer or excess confirmation. This ADR changes documentation only: it covers/selects/deletes/keeps no real copy, reads no package/private state and changes no public IPC/schema/AI Worker API.

<a id="adr-0233"></a>

## 0233 · Not Yet Covered Selections May Execute As Explicit Partial Cleanup

决定来源：[0233-not-yet-covered-selections-may-execute-as-explicit-partial-cleanup.md](../../adr/0233-not-yet-covered-selections-may-execute-as-explicit-partial-cleanup.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0233-p001"></a>

An ADR 0230 selection may open irreversible deletion confirmation whenever it contains at least one currently eligible managed package-copy reference and the ADR 0231 owner-graph generation is fresh. ADR 0232 Keep Shortfall Coverage State does not gate the action. A Not Yet Covered selection is an explicit **Partial Managed Copy Cleanup**, not an invalid or automatically enlarged plan.

<a id="0233-p002"></a>

The primary action is labelled Delete Selected Managed Copies. It is never labelled Free Enough Space, Fix Storage, Continue To Keep or another phrase implying that the current selection will satisfy admission. An empty selection, a selection containing no currently eligible rows, a recalculating/stale owner generation or an active conflicting delete transaction keeps the action disabled for its actual reason.

<a id="0233-p003"></a>

For a Not Yet Covered selection, the confirmation sheet shows each affected volume's current Keep Pin Storage Shortfall, projected Owner-Aware Batch Reclaimable Bytes and projected remaining shortfall after the selected deletion. It explicitly states that this batch is projected to be only a partial cleanup step and that Keep Pin Admission will still require a new storage check. The sheet does not add candidates, preselect more rows or claim that a projection is guaranteed actual reclamation.

<a id="0233-p004"></a>

Covered and Covered With Excess selections keep ADR 0232's corresponding confirmation explanation. All coverage states use the same irreversible ADR 0230 item list, selected/eligible/excluded counts, no-Trash/no-Undo consequence and explicit final confirmation. Coverage changes wording and byte comparison, not deletion authority or per-item owner boundaries.

<a id="0233-p005"></a>

Execution remains item-atomic and freshly revalidated under ADR 0230. A row excluded at execution is skipped with its reason; a failed reference remains unchanged; successful reference removals and owner-safe blob reclamation are not rolled back merely because the batch still leaves a shortfall. Partial cleanup never reaches an unselected copy or starts a second batch automatically.

<a id="0233-p006"></a>

After execution, the workflow returns to the cleanup list with an inline Mixed Managed Copy Delete Result. Successfully deleted rows leave the active selection, while failed and excluded rows remain selected at their stable keyed positions with reasons; focus moves to the first unresolved selected row or, when none remains, the next visible eligible candidate. This adapts ADR 0084 outcome-based selection without offering Undo for irreversible deletion.

<a id="0233-p007"></a>

The host refreshes actual per-volume availability, candidates, Owner-Aware Batch Reclaimable Bytes and Keep Pin Storage Shortfall. If the result remains Not Yet Covered, the user may explicitly select and confirm another partial batch while interactive hold budget remains. If it becomes Covered during ADR 0234's terminal drain, ADR 0235 may expose one renderer-acknowledged maximum-60-second Keep Now opportunity; otherwise the ordinary UI may expose the separate Retry Keep action only while its original workflow still exists. No batch result invokes Keep Pin Admission automatically.

<a id="0233-p008"></a>

Each later partial batch requires a new explicit selection scope and confirmation from a fresh owner generation. There is no remembered “delete until enough” intent, automatic queue, candidate refill or background continuation. ADR 0227 hold time and ADR 0228 cumulative budget continue under their existing elapsed-time rules and are not paused or extended by choosing a partial plan.

<a id="0233-p009"></a>

ADR 0234 gives an already accepted non-terminal batch one Cleanup Batch Drain Hold when the ADR 0227 hold/budget expires. It protects only the target until the batch terminates or for at most five additional elapsed minutes, seals the existing scope and allows no new selection/batch/Keep action; selected-item transaction safety continues even after the drain ends.

<a id="0233-p010"></a>

Partial/coverage explanation, projected remaining bytes, selected identities and immediate result focus are session-bound operational UI state excluded from Full Library Backup, export/merge/sync, telemetry, publisher feedback and support logs. No partial plan stores paths, content, credentials, hidden candidates or future deletion intent.

### 当时实施上下文（来源，非当前状态）

以下句子记录原文写作时的执行/交付范围，不否定当前实现，不授予新操作权限。

<a id="0233-p011"></a>

The current project has no managed package-copy registry, partial cleanup confirmation, owner-aware batch delete or post-delete shortfall workflow. Existing Candidate Batch Action result rules do not provide package-owner deletion. This ADR changes documentation only: it partially/full deletes no real copy, reads no package/private state and changes no public IPC/schema/AI Worker API.

<a id="adr-0234"></a>

## 0234 · Running Batch Cleanup Gets One Five Minute Terminal Drain

决定来源：[0234-running-batch-cleanup-gets-one-five-minute-terminal-drain.md](../../adr/0234-running-batch-cleanup-gets-one-five-minute-terminal-drain.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0234-p001"></a>

If an ADR 0230 Managed Package Copy Batch Delete was host-accepted and remains non-terminal when the ADR 0227 interactive hold or ADR 0228 cumulative budget ends, the host atomically replaces only the target's expiring interactive pin with one **Cleanup Batch Drain Hold**. Opening confirmation, selecting rows, submitting after expiry or a request that was not accepted before the boundary does not qualify.

<a id="0234-p002"></a>

The transition finalizes the 30-minute budget and renderer lease normally. The drain begins at that same host terminal boundary and ends at the earlier of the accepted batch's terminal result or five elapsed minutes. It is not remaining interactive budget, a budget refund, another warning grace or a renewable hold. Restart, repeated requests, another batch or renderer reconnection cannot grant a new five minutes.

<a id="0234-p003"></a>

During drain, the workflow is Finishing Current Batch. The selected item scope and owner-graph generation are sealed to the already accepted transaction. The renderer cannot add/remove rows, start another item or batch deletion, switch cleanup targets, retry Keep, or convert the drain into general Storage Management protection. It may show path-free progress and the hard drain deadline; no new deletion authority is accepted.

<a id="0234-p004"></a>

ADR 0229 Storage Resolution Volume Slot remains owned by the draining target for the same affected volumes until the drain ends, preventing another Clean Up And Keep workflow from overlapping the terminal batch. Distinct volumes remain independent. The batch's selected copy references and managed blobs retain their narrower transaction pins regardless of the target drain, and the held target remains outside the deletion batch.

<a id="0234-p005"></a>

If the batch becomes terminal within five minutes, the host commits its ADR 0230 mixed result and recomputes actual availability, owner graph and Keep Pin Storage Shortfall. When the same target episode is freshly Covered, ADR 0235 may retain the drain only while awaiting acknowledgement of the result in the same usable renderer and never beyond this drain's original cap; acknowledgement atomically replaces the drain with one maximum-60-second explicit Keep decision while preserving the volume slot. If it is not Covered or not acknowledged by the cap, the host ends the drain, releases the slot and reevaluates the unchanged target at an owner-safe boundary. Neither path auto-Keeps or starts another interactive cleanup hold; another independent pin or Retention Time Not Assessable may still govern the target.

<a id="0234-p006"></a>

If five minutes elapse first, the host releases the drain and volume slot and reevaluates the target even while the selected deletion transaction continues. That transaction may safely finish, roll back or reconcile its own items under ADR 0230, but it no longer protects, deletes, resurrects or changes the target copy. Its later result may appear in ordinary managed package activity without recreating the expired Clean Up And Keep workflow.

<a id="0234-p007"></a>

Renderer loss or window hiding during drain does not by itself cancel an already accepted host transaction or create another interactive lease; the drain is transaction-bound and remains capped. Explicit Quit or main-process termination preserves no background helper: the active drain ends, while the durable delete journal records only the selected transaction state needed for safe later reconciliation. A later launch never restarts the five-minute allowance from zero.

<a id="0234-p008"></a>

For crash reconciliation, the minimal drain record binds opaque target retention episode, accepted batch identity, affected volume-slot generation and the original hard drain deadline. If a later host can prove the same transaction is still active and the conservative deadline has not passed, it may honor only the remaining portion; otherwise the drain is expired. Clock/timezone anomalies cannot lengthen it, while ADR 0223 may separately pause actual target cleanup when retention time is not assessable.

<a id="0234-p009"></a>

The drain does not pause the original seven-day/grace deadline, create a Pending Package Warning Opportunity, add Missed Pending Package Warning Grace or change trust/install eligibility. Low-disk pressure cannot shorten it below the batch terminal boundary rules or extend it beyond five minutes. ADR 0235's acknowledged handoff is a separate one-attempt decision state, not extra drain or cleanup time. No OS notification, wake task or publisher feedback is created.

<a id="0234-p010"></a>

Drain identity/deadline/generation and coarse batch progress are device-local operational state excluded from Full Library Backup, export/merge/sync, telemetry and support logs. Renderer projection contains opaque package/batch/volume identities and status classes without paths, selected content, credentials or user-attention evidence.

<a id="0234-p011"></a>

The current Runtime Package executor has process-local non-cancellable executions, terminal snapshots and rollback, but no Verified Managed Package Copy batch deletion, target retention pin, volume slot, durable delete journal or terminal drain. This ADR changes documentation only: it drains/extends/deletes no real operation, reads no package/private state and changes no public IPC/schema/AI Worker API.

<a id="adr-0235"></a>

## 0235 · Covered Drain Results Get One Sixty-Second Explicit Keep Decision

决定来源：[0235-covered-drain-results-get-one-sixty-second-explicit-keep-decision.md](../../adr/0235-covered-drain-results-get-one-sixty-second-explicit-keep-decision.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0235-p001"></a>

When an ADR 0234 Cleanup Batch Drain Hold reaches its accepted batch's terminal result before the five-minute cap, the host refreshes the exact target episode, managed-copy owner graph, actual per-volume availability and ADR 0226 Keep Pin Storage Shortfall. If the same Awaiting Install Decision target still exists and fresh evidence shows every affected volume is Covered, the result may qualify for one **Post-Cleanup Keep Decision Hold**. A projected estimate, Not Yet Covered result, terminal result after the drain cap, changed target/episode or unassessable storage does not qualify.

<a id="0235-p002"></a>

The hold starts only after the same usable main window and renderer workflow acknowledge a path-free projection containing the committed batch result, current coverage and one Keep Now action. Batch terminal alone never starts a hidden 60-second countdown. The existing drain and volume-slot generation may remain only while waiting for that acknowledgement and never beyond the original five-minute drain deadline; if acknowledgement does not arrive in time, no decision hold is created.

<a id="0235-p003"></a>

On acknowledgement, the host atomically replaces the drain with the decision hold, preserving the same target and ADR 0229 Storage Resolution Volume Slot without an unpinned gap. The decision deadline is at most 60 elapsed seconds from that committed handoff. It is non-renewable, cannot pause for focus, sleep, clock/timezone change or a confirmation surface, and cannot be recreated by reload, another window, process restart or renderer reconnection.

<a id="0235-p004"></a>

The projected result is read-only except for one explicit Keep Now entry. ADR 0236 makes that entry open a compact final confirmation showing the exact target, newly protected/shared physical-byte impact and projected remaining reserve. Opening or cancelling confirmation consumes no attempt and does not pause this deadline; only a host-accepted final Confirm Keep Copy request begins the one attempt. The user cannot select or delete another copy, start or retry a batch, switch cleanup targets, Install, delete the target or open general Storage Management under this hold. Those ordinary actions may be available only after the hold ends and the target survives normal retention reevaluation.

<a id="0235-p005"></a>

Keep Now never relies on the just-computed coverage as reserved success. At a final request received and validated before this deadline, ADR 0238 atomically consumes the episode's one attempt and replaces this decision hold with one maximum-five-second Keep Commit In Flight transaction. That transaction freshly revalidates the exact target/episode, owner graph, managed-copy integrity and owner state, affected volume identity, current availability, effective Storage Safety Reserve and newly protected physical bytes. Current trust, release-window, compatibility and dependency state remain visible and may still block Install, but do not silently prevent the already permitted Keep owner choice.

<a id="0235-p006"></a>

If fresh Keep Pin Admission succeeds, the host atomically replaces the Awaiting Install Decision owner with the Kept Verified Package Copy Pin, ends the retention episode and decision hold, and releases the volume slot. ADR 0237 permits confirmation-byte drift when the same target/owner/integrity/volumes remain valid and final actual evidence still preserves reserve. If reserve fails, storage becomes unassessable, identity/integrity/ownership no longer matches or another race blocks the transition, the request fails with a typed path-free reason; the attempt is not restored, the hold ends immediately and the unchanged target returns to its original retention reevaluation. No automatic deletion, second attempt, timer refresh or cleanup continuation follows.

<a id="0235-p007"></a>

The hold also ends immediately on its deadline, leaving/dismissing the result, a hidden, minimized, destroyed or otherwise unusable main window, renderer disconnect/crash, Explicit Quit, target owner/episode change or loss of the acknowledged projection. The only accepted continuation is an ADR 0238 transaction already host-accepted before the deadline; later renderer events do not qualify. Ending otherwise releases the volume slot and reevaluates the target at an owner-safe boundary. Another independent pin or Retention Time Not Assessable may still govern cleanup, but this hold creates neither a background helper nor an OS notification.

<a id="0235-p008"></a>

At most one Post-Cleanup Keep Decision Hold may be committed in one retention episode, and only from a Covered terminal result reached inside that episode's ADR 0234 drain. It does not refund or increase ADR 0228's cumulative 30-minute budget, add to ADR 0234's five minutes, shift the original seven-day or grace deadline, or create an ADR 0224 warning opportunity. Coverage lost during the 60 seconds may disable or fail Keep Now but never extends the deadline.

<a id="0235-p009"></a>

Minimal device-local operational state contains only opaque retention episode and batch/result identities, decision deadline, one-attempt-consumed state, volume-slot generation and renderer projection acknowledgement. It contains no managed paths, selected content, click history or attention evidence and is excluded from Full Library Backup, export/merge/sync, telemetry, publisher feedback and support logs. Restart cannot reconstruct the hold.

<a id="0235-p010"></a>

The current Runtime Package UI has local confirmation state, while the main process has no renderer-acknowledged package-result projection, Verified Managed Package Copy owner registry, storage admission, terminal-drain handoff or post-cleanup decision hold. This ADR changes documentation only: it starts no timer/hold, keeps/deletes no package, reads no package/cache/private state and changes no public IPC/schema/AI Worker API.

<a id="adr-0236"></a>

## 0236 · Post-Cleanup Keep Now Uses A Live Compact Final Confirmation

决定来源：[0236-post-cleanup-keep-now-uses-a-live-compact-final-confirmation.md](../../adr/0236-post-cleanup-keep-now-uses-a-live-compact-final-confirmation.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0236-p001"></a>

Inside an ADR 0235 Post-Cleanup Keep Decision Hold, Keep Now is an entry into one compact **Post-Cleanup Keep Confirmation**, not the final Keep request itself. Opening the confirmation does not change the Awaiting Install Decision owner, reserve space, consume the episode's one Keep attempt or create another hold.

<a id="0236-p002"></a>

The confirmation remains inside the same acknowledged result workflow and identifies the exact package copy and retention episode. For every affected physical volume it shows path-free volume identity, current availability, effective Storage Safety Reserve, logical package bytes, shared/already-protected bytes, physical bytes that would become newly protected by this Keep pin, and projected reserve remaining after the pin. Shared bytes are explanatory owner-accounting evidence, not additional bytes to add to the newly protected total.

<a id="0236-p003"></a>

These values come from a fresh host projection when the confirmation opens and are explicitly a current impact snapshot, not a reservation or guarantee. The host, not the renderer, computes the owner graph, physical-byte deltas and reserve projection. The confirmation keeps the ADR 0235 hard deadline visible and explains that final confirmation will recheck current storage before committing. ADR 0237 permits changed byte values without another prompt when the identical transition remains safe, and the success result shows final actual values.

<a id="0236-p004"></a>

Opening, closing or cancelling the confirmation does not consume the attempt. If the same decision hold remains valid, the user may return to the result and reopen the same confirmation entry; this creates no new 60-second allowance, renderer acknowledgement, volume slot or cleanup authority. Only one confirmation surface may be active for the target at a time.

<a id="0236-p005"></a>

The final action is an explicit, non-default Confirm Keep Copy request. Merely opening the sheet, focusing it, pressing a generic navigation key, losing focus or allowing the countdown to expire never sends that request. The sheet contains no Install, target Delete, managed-copy selection, new cleanup batch or timer-extension action.

<a id="0236-p006"></a>

When the host accepts the final confirmation request for the exact target, retention episode, decision-hold generation and still-live deadline, ADR 0238 atomically consumes ADR 0235's one attempt and converts the decision hold into one maximum-five-second Keep Commit In Flight transaction for fresh admission and owner transition. Duplicate final submissions are idempotently rejected as the same consumed attempt rather than creating another request. Success, failure or rollback then follows ADR 0235; the confirmation itself cannot restore an attempt.

<a id="0236-p007"></a>

The 60-second elapsed deadline continues while the confirmation is open and is never paused by reading, keyboard navigation, accessibility interaction, loss of focus, animation or a slow renderer. At expiry, renderer loss, window/workflow unusability or another ADR 0235 terminal cause before acceptance, the host invalidates the confirmation and ends the decision hold. A late renderer event cannot commit Keep or resurrect the sheet, while an ADR 0238 request already accepted before expiry proceeds independently under its five-second transaction cap.

<a id="0236-p008"></a>

Confirmation state contains only opaque target/episode/hold and confirmation generations plus the path-free displayed byte projection. It contains no managed path, user attention, click history, asset content or credentials and is excluded from Full Library Backup, export/merge/sync, telemetry, publisher feedback and support logs. Restart cannot recreate it.

<a id="0236-p009"></a>

The current Runtime Package panel has renderer-local `confirming` state for installation and sends `confirmed: true` to a process-local session service. It has no Keep owner choice, host-issued confirmation generation, live hold deadline, owner-aware byte projection or Storage Safety Reserve admission. This ADR changes documentation only: it opens no confirmation, keeps/deletes no package, reads no package/cache/private state and changes no public IPC/schema/AI Worker API.

<a id="adr-0237"></a>

## 0237 · Safe Final Keep Recheck Accepts Nonblocking Byte Drift

决定来源：[0237-safe-final-keep-recheck-accepts-nonblocking-byte-drift.md](../../adr/0237-safe-final-keep-recheck-accepts-nonblocking-byte-drift.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0237-p001"></a>

ADR 0236's displayed Post-Cleanup Keep Confirmation is an explanatory impact snapshot. When its final Confirm Keep Copy request is host-accepted before the decision deadline, ADR 0238 creates one maximum-five-second transaction in which the host computes a fresh atomic **Final Keep Commit Snapshot** under ADR 0226 Keep Pin Admission. The commit snapshot, not equality with the displayed byte counts, determines whether Keep may proceed.

<a id="0237-p002"></a>

Availability, effective Storage Safety Reserve, shared/already-protected bytes and newly protected physical bytes may change between display and final recheck because of unrelated filesystem activity, policy refresh or owner-graph changes. The host does not require another confirmation merely because one or more of those byte values moved upward or downward.

<a id="0237-p003"></a>

Nonblocking drift is accepted only when the same Awaiting Install Decision target and retention episode remain authoritative, the exact managed package content identity and integrity still match, affected stable physical-volume identity has not changed, the requested owner transition is still permitted, storage remains assessable and the fresh commit snapshot preserves the effective Storage Safety Reserve on every affected volume. Unrelated owner changes may alter the physical delta but cannot substitute another target, volume or package.

<a id="0237-p004"></a>

When all gates still pass, the host atomically commits the Kept Verified Package Copy Pin using the fresh owner/volume evidence even if the confirmation numbers differ. There is no drift threshold, byte-by-byte equality requirement, warning-only reconfirmation or attempt refund. Requiring exact equality would make a bounded 60-second decision unreliable on an active volume without improving the reserve invariant.

<a id="0237-p005"></a>

The success result shows the actual committed per-volume availability, effective reserve, newly protected physical bytes, shared/already-protected bytes and reserve remaining after Keep. If any displayed value changed, the result may mark it as Updated During Final Check, but it does not retain a long-term before/after activity trail or imply that the earlier projection was an error.

<a id="0237-p006"></a>

If the final snapshot would create or enlarge a reserve shortfall, storage is no longer assessable, target/episode/volume identity changed, integrity no longer matches or the pending owner is no longer authoritative, the host does not commit Keep. It returns the corresponding typed path-free failure and follows ADR 0235's consumed-attempt terminal behavior. A safer but different package, owner or volume is never accepted as equivalent.

<a id="0237-p007"></a>

The final calculation and owner transition share one generation-checked transaction boundary so another write or owner mutation cannot be inserted between the successful admission result and Keep owner commit. Ordinary writes not governed by the package owner transaction may still occur afterward; like every accepted ADR 0226 pin, later low-disk pressure does not retroactively invalidate the committed Keep owner.

<a id="0237-p008"></a>

Final Keep Commit Snapshot state is minimal device-local operational evidence. Only the immediate result needs the final path-free byte values and an Updated During Final Check marker; it stores no managed paths, filesystem event history, unrelated owner identities, asset content, credentials or attention evidence and is excluded from Full Library Backup, export/merge/sync, telemetry, publisher feedback and support logs.

<a id="0237-p009"></a>

The current Runtime Package session validates and executes a selected install but has no Keep owner registry, free-space/reserve adapter, owner-graph transaction or displayed-versus-commit storage snapshots. This ADR changes documentation only: it calculates/commits no real Keep, reads no package/cache/private state and changes no public IPC/schema/AI Worker API.

<a id="adr-0238"></a>

## 0238 · On-Time Final Keep Requests Get One Five-Second Commit Transaction

决定来源：[0238-on-time-final-keep-requests-get-one-five-second-commit-transaction.md](../../adr/0238-on-time-final-keep-requests-get-one-five-second-commit-transaction.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0238-p001"></a>

An ADR 0236 final Confirm Keep Copy request qualifies only when the host receives and validates the exact target, retention episode, decision-hold generation, confirmation generation and unconsumed attempt before ADR 0235's 60-second deadline. A renderer click time, queued IPC message, animation state or request arriving after the deadline does not qualify.

<a id="0238-p002"></a>

On acceptance, the host atomically consumes the one attempt and replaces the Post-Cleanup Keep Decision Hold with one **Keep Commit In Flight** transaction pin. This handoff preserves the exact target and ADR 0229 Storage Resolution Volume Slot without an owner-safety gap. The 60-second decision deadline may then expire without cancelling the already accepted request.

<a id="0238-p003"></a>

Keep Commit In Flight lasts until the request reaches a terminal result or five elapsed seconds from host acceptance, whichever occurs first. It is a non-renewable commit bound, not another decision period, cleanup hold, ADR 0234 drain, warning grace, retry or addition to ADR 0228's cumulative budget. Another renderer, process, request or reconnection cannot restart or extend it.

<a id="0238-p004"></a>

During the transaction the host performs only ADR 0237's fresh Final Keep Commit Snapshot, ADR 0226 admission and the atomic pending-owner-to-Keep-owner transition. It moves or rewrites no package payload and accepts no Install, Delete, cleanup selection, target switch, cancellation or second Keep request. The UI may show Finalizing Keep with the hard commit deadline but has no cancel action.

<a id="0238-p005"></a>

Renderer disconnect, result-surface closure, window hiding or the original 60-second expiry after acceptance does not cancel this host transaction. The same affected volume slot remains occupied so another Clean Up And Keep workflow cannot race its final owner evidence. Duplicate submissions resolve to the same accepted attempt and never create parallel commits.

<a id="0238-p006"></a>

If admission or owner transition reaches a terminal result within five seconds, success commits the Kept Verified Package Copy Pin and ends the retention episode; a typed failure leaves the Awaiting Install Decision owner unchanged. Either result ends the transaction pin and releases the volume slot, after which ADR 0235's normal terminal outcome applies and no decision hold or attempt returns.

<a id="0238-p007"></a>

The Keep owner transition must be one local generation-checked metadata transaction that is safe to roll back before durable commit. If five seconds elapse before durable owner commit, the host aborts/rolls back the incomplete transaction, preserves the pending owner, releases the transaction pin and volume slot, and returns a Commit Timed Out failure for ordinary retention reevaluation. It never leaves an indefinite in-flight owner or treats an uncertain partial state as success.

<a id="0238-p008"></a>

If Explicit Quit or main-process termination interrupts the transaction, no helper or background process continues it. Minimal device-local journal evidence records opaque commit identity, target/episode, pre-transition owner generation, attempt-consumed state and original hard deadline solely so ADR 0239 can reconcile whether the atomic owner commit completed before expiry cleanup or another target action. Restart never reruns admission, restarts five seconds or grants another attempt, and the one recovered result is explanatory rather than a transaction continuation.

<a id="0238-p009"></a>

Keep Commit In Flight state and its terminal result contain no managed paths, package content, credentials, user attention or click history and are excluded from Full Library Backup, export/merge/sync, telemetry, publisher feedback and support logs. Immediate UI projection uses only opaque package/volume identities, coarse stage/reason and path-free final byte evidence.

<a id="0238-p010"></a>

The current Runtime Package executor has process-local non-cancellable install executions and rollback, but no Keep admission, owner transaction, volume slot, five-second commit deadline or reconciliation journal. It is not reused as evidence that this policy exists. This ADR changes documentation only: it accepts/commits no real Keep, reads no package/cache/private state and changes no public IPC/schema/AI Worker API.

<a id="adr-0239"></a>

## 0239 · Interrupted Keep Commits Reconcile Once And Show A Twenty-Four-Hour Result

决定来源：[0239-interrupted-keep-commits-reconcile-once-and-show-a-24-hour-result.md](../../adr/0239-interrupted-keep-commits-reconcile-once-and-show-a-24-hour-result.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0239-p001"></a>

When ADR 0238 Keep Commit In Flight is interrupted by main-process termination or an unclean application exit, the next host performs **Interrupted Keep Commit Reconciliation** before ADR 0223 expiry cleanup, new Keep admission or another storage-resolution workflow can act on that exact target. Reconciliation reads only the minimal device-local owner/journal generations needed to determine which side of the atomic transition committed.

<a id="0239-p002"></a>

If the durable owner generation proves that the pending-owner-to-Keep-owner transaction committed, the Kept Verified Package Copy Pin remains authoritative and the old retention episode is ended. If durable evidence proves it did not commit, the original Awaiting Install Decision owner, retention episode, ordinary/grace deadlines and consumed Keep attempt remain authoritative. If neither outcome can be proved, ADR 0240 applies a target-only Keep Recovery Safety Gate rather than emitting a false result. Restart never reruns admission, repeats the owner mutation, restarts the five-second transaction or opens another 60-second decision opportunity.

<a id="0239-p003"></a>

After a proven outcome, Storage Management receives one path-free **Recovered Keep Commit Result** with Recovered As Kept or Recovered As Pending status. It identifies the package copy in ordinary path-free product terms, states that an interrupted final Keep was reconciled rather than retried, and explains the resulting owner state. When available from committed metadata it may show the final reserve/byte summary, but it never fabricates missing final values from the pre-confirmation projection.

<a id="0239-p004"></a>

Recovered As Pending creates no additional pin. Once reconciliation establishes the pending owner, the original retention policy is reevaluated normally and may remove an already-expired app-owned reference at its next owner-safe boundary. The result remains explanatory even if that later cleanup means the managed copy is no longer present; it does not recreate, reacquire or protect it merely so the message can be viewed.

<a id="0239-p005"></a>

The result expires at the earlier of one usable Storage Management viewing opportunity or 24 elapsed hours after reconciliation. A viewing opportunity exists when a usable renderer acknowledges projection of the result; the card remains stable for that current surface session and is pruned after the user leaves/dismisses it. No focus duration, eye tracking, click history or proof of reading is recorded. If never projected, the 24-hour hard cap removes it.

<a id="0239-p006"></a>

The 24-hour result is not Batch Result History, package audit history, a warning grace or a notification. It opens no startup modal, creates no OS notification, badge-driven urgency, background helper or support/publisher report. Clearing or expiring the card changes no owner, deadline, attempt, reserve evidence or package bytes.

<a id="0239-p007"></a>

The recovery record contains only opaque commit/target/episode identity, reconciled owner outcome, coarse reason, reconciliation/expiry times and renderer-projection acknowledgement. It contains no managed path, package payload, credentials, user content, filesystem event trail or attention history and is excluded from Full Library Backup, export/merge/sync, telemetry, publisher feedback and support logs.

<a id="0239-p008"></a>

After reconciliation and result projection, the consumed ADR 0235 attempt remains consumed in both outcomes. An ordinary future Keep action is available only if the same pending copy survives and another existing product rule independently permits it; this recovery result itself grants no retry, cleanup budget, decision hold or storage reservation.

<a id="0239-p009"></a>

The current Runtime Package session keeps selections/executions in process-local maps and has no managed-copy owner journal, startup Keep reconciliation, Storage Management recovery projection or 24-hour result record. This ADR changes documentation only: it reconciles no real owner, reads no runtime database/package/cache/private state and changes no public IPC/schema/AI Worker API.

<a id="0239-p010"></a>

ADR 0246 applies the same one-viewing-or-24-hour explanatory-result pattern to an interrupted advanced recovery delete, but it reconciles the separate atomic reference-removal boundary. It never converts a delete outcome into Recovered As Kept/Pending or reuses this Keep attempt and owner transition.

<a id="adr-0240"></a>

## 0240 · Unassessable Keep Recovery Protects Only The Affected Copy

决定来源：[0240-unassessable-keep-recovery-protects-only-the-affected-copy.md](../../adr/0240-unassessable-keep-recovery-protects-only-the-affected-copy.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0240-p001"></a>

If ADR 0239 startup reconciliation cannot prove either a committed Keep owner or the unchanged pending owner because owner generations and the minimal commit journal conflict, are corrupt or cannot be validated, the host enters **Keep Recovery Not Assessable** for that exact managed package copy. It never guesses success or failure from timestamps, renderer state, package presence or the user's prior intent.

<a id="0240-p002"></a>

Keep Recovery Not Assessable installs one target-scoped **Keep Recovery Safety Gate** before ADR 0223 expiry cleanup can act. The gate retains the managed-copy bytes and blocks automatic deletion or owner mutation for only that unresolved target. It is not a Kept Verified Package Copy Pin, does not restart Pending Package Decision Retention, reserve storage, grant another Keep attempt or imply that final admission succeeded.

<a id="0240-p003"></a>

Because owner authority is unresolved, Install, Keep, ordinary target Delete, unpin and package-copy owner migration for that exact copy remain unavailable until reconciliation proves a state. ADR 0241 is the only destructive escape: after local repair remains unresolved, a separate advanced action may delete the recovery-protected reference only when a complete independent owner scan proves no declared owner remains and exact package-name confirmation succeeds. Read-only package identity, integrity evidence and storage impact may still be shown. Other managed copies, volumes, cleanup batches, installs and retention episodes continue under their own rules; the safety gate acquires no ADR 0229 Storage Resolution Volume Slot.

<a id="0240-p004"></a>

Storage Management shows the path-free reason class that prevented proof, the affected package identity, protected physical/shared byte impact when safely calculable, and two local actions: Recheck Recovery Evidence and Repair Recovery Record. It does not expose database rows, journal payload, paths, credentials or a manual Choose Kept/Choose Pending shortcut.

<a id="0240-p005"></a>

When an ADR 0241 owner scan finds a real installed, rollback, transaction or other managed-copy owner, ADR 0242 adds only its path-free Blocking Managed Owner category and normal lifecycle destination. The recovery page cannot release that owner or enable advanced deletion until the owner is removed through its own rules and a later complete scan proves absence.

<a id="0240-p006"></a>

Recheck Recovery Evidence is a bounded read-only local validation of the authoritative owner store, transaction generation, content identity/integrity and minimal journal. Repair Recovery Record may normalize or replace only malformed reconciliation metadata after the authoritative owner generation independently proves the outcome. It cannot manufacture a Keep owner, change the package digest, waive integrity, rerun admission, download/reacquire bytes or contact a network service.

<a id="0240-p007"></a>

The host may perform one bounded check during startup and another after an explicit repair/recheck action, but it does not poll, repeatedly rewrite evidence, create a background helper or issue an OS notification. Restart alone neither clears the gate nor turns uncertainty into pending/kept state. A failed recheck preserves the same gate with a typed path-free reason and affects no other owner.

<a id="0240-p008"></a>

When local evidence later proves committed Keep, the host atomically restores the authoritative Kept owner, clears the safety gate and emits ADR 0239's Recovered As Kept result. When evidence proves no commit, it restores the original pending owner/deadlines and consumed attempt, clears the gate, emits Recovered As Pending and immediately resumes ordinary owner-safe retention evaluation. Neither outcome reopens the five-second transaction or 60-second decision.

<a id="0240-p009"></a>

While the gate remains, Storage Management classifies the affected bytes as Recovery Protected / Reclaimability Not Assessable rather than free, reclaimable or user-kept. Low-disk pressure may explain the impact but cannot bypass the gate, clean another storage class under its identity or infer permission to discard the ambiguous copy. Only ADR 0241's separately confirmed, owner-proven advanced delete may intentionally end the gate without first proving Kept/Pending; Force Keep and Force Install never appear.

<a id="0240-p010"></a>

Gate state contains only opaque target/episode/commit identity, reason class, last bounded check outcome and minimal owner/journal generations. It is device-local safety metadata excluded from Full Library Backup, export/merge/sync, telemetry, publisher feedback and support logs and contains no managed path, payload, asset content, credential or user-attention history.

<a id="0240-p011"></a>

The current Runtime Package session has no durable managed-copy owner table, commit journal, recovery safety gate, local repair action or recovery-protected storage classification. This ADR changes documentation only: it gates/repairs no real owner, reads no runtime database/package/cache/private state and changes no public IPC/schema/AI Worker API.

<a id="0240-p012"></a>

ADR 0247 defines a distinct neutral safety gate when a later advanced-delete interruption cannot prove whether this reference and gate were atomically removed. It does not silently restore this Keep recovery state: only proof that deletion did not commit may reestablish this ADR's reference and gate as authoritative.

<a id="adr-0241"></a>

## 0241 · Unrecoverable Keep State Allows Only Owner-Proven Advanced Delete

决定来源：[0241-unrecoverable-keep-state-allows-only-owner-proven-advanced-delete.md](../../adr/0241-unrecoverable-keep-state-allows-only-owner-proven-advanced-delete.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0241-p001"></a>

While ADR 0240 Keep Recovery Not Assessable remains unresolved after an explicit local recheck/repair attempt, Storage Management may expose one advanced **Delete Recovery-Protected Managed Copy** action. It is an escape from an otherwise unresolvable target-only safety gate, not a way to choose Pending, assume Keep failed or bypass normal package ownership.

<a id="0241-p002"></a>

The action is available only after a bounded **Recovery-Protected Owner Scan** independently proves that no installed/extracted package, active or Last Known Good rollback set, active transfer/install/delete/Keep transaction, other pending or kept copy, or any other declared managed owner still requires the target reference or its immutable bytes. The scan covers only authoritative application-managed owner stores, manifests and transaction journals; it never reads user assets, external package locations or unrelated private files.

<a id="0241-p003"></a>

Missing, corrupt, contradictory, incomplete, stale or unassessable owner evidence is not proof of absence. Any unresolved owner category, busy transaction, changed managed-root identity or owner-generation race keeps the action disabled with a typed path-free reason. If a real owner is found, ADR 0242 exposes only its path-free category and normal lifecycle destination; the recovery page cannot bypass or remove it. The recovery safety gate remains authoritative until a fresh complete scan passes or ordinary reconciliation proves Kept/Pending.

<a id="0241-p004"></a>

The review shows exact path-free package/publisher/version identity, recovery-protected state, why Keep integrity/ownership could not be proven, logical/shared bytes, freshly owner-proven reclaimable physical bytes per volume, ADR 0244's remaining scan-validity class and that deletion has no Asset Trash or Undo. The user must type the exact displayed package name before the destructive final action becomes available; matching is normalized only for ordinary Unicode/case presentation and never accepts a different package identity.

<a id="0241-p005"></a>

Final confirmation revalidates the recovery-gate generation, stable volume identity, complete owner-scan generation, every absence proof and ADR 0244's five-minute deadline. ADR 0243 makes any intervening owner change invalidate the whole review, while time expiry before host acceptance also clears typed confirmation and requires a new explicit complete scan; no destructive intent is remembered. A still-valid host-accepted action enters ADR 0245's one maximum-five-second transaction to atomically remove only the ambiguous app-owned managed-copy reference and its recovery gate. Later scan expiry does not cancel that accepted request; immutable-byte deletion remains a separate owner-safe continuation. Shared bytes remain until their last valid owner is gone, and actual zero/partial/full physical reclamation is reported honestly.

<a id="0241-p006"></a>

This action never deletes installed/extracted content, rollback data still in use, an active transaction, trust statements, results, user assets, External User-Owned Packages or another storage class. It is not eligible for ADR 0230 batch selection, select-all, automatic low-disk cleanup or a suggested minimum deletion plan. Failure leaves the safety gate and bytes unchanged unless reference removal already committed at an owner-safe boundary.

<a id="0241-p007"></a>

If reference removal commits but physical managed-byte deletion fails, the copy decision is terminally deleted and the remaining unowned bytes enter ADR 0230-style Physical Reclaim Pending reconciliation. That reconciliation may retry only physical cleanup; it cannot recreate the reference, infer Pending/Kept, reacquire the package or repeat the destructive user decision.

<a id="0241-p008"></a>

If the ADR 0245 reference-removal transaction is interrupted, ADR 0246 reconciles the atomic boundary once at next startup. A proven commit remains terminally deleted, while a proven non-commit restores this recovery-protected state without reusing the scan, typed confirmation or delete authorization.

<a id="0241-p009"></a>

If that boundary cannot be proved, ADR 0247's neutral target-only safety gate blocks this and every other delete or owner mutation until local evidence repair establishes an outcome. The earlier owner scan and exact-name confirmation do not bypass the unassessable gate.

<a id="0241-p010"></a>

Only after explicit ADR 0247 repair remains unresolved may ADR 0248 offer a separate owner-proven finalization. It requires a new complete scan and exact-name confirmation and receives new destructive authorization; it never treats this action's earlier acceptance as permission to normalize the ambiguous state.

<a id="0241-p011"></a>

No Force Keep or Force Install action exists in Keep Recovery Not Assessable. Because package integrity and owner authority cannot be proved, user intent cannot substitute for the missing evidence or waive ADR 0226 admission. A future usable copy requires a separately reviewed verified reacquisition/import path rather than relabeling ambiguous bytes.

<a id="0241-p012"></a>

The immediate result records only opaque target/action identity, typed scan/confirmation outcome and path-free logical/shared/actually reclaimed bytes. It creates no long-lived package audit or recovery history, contains no typed confirmation text, paths, payload, credentials or user content, and is excluded from Full Library Backup, export/merge/sync, telemetry, publisher feedback and support logs.

<a id="0241-p013"></a>

The current Runtime Package path has no managed-copy owner registry, recovery gate, complete owner scan, typed-name destructive confirmation or advanced reference deletion. This ADR changes documentation only: it scans/deletes no real owner or bytes, reads no runtime database/package/cache/private state and changes no public IPC/schema/AI Worker API.

<a id="adr-0242"></a>

## 0242 · Blocking Managed Owners Route To Their Normal Lifecycle

决定来源：[0242-blocking-managed-owners-route-to-their-normal-lifecycle.md](../../adr/0242-blocking-managed-owners-route-to-their-normal-lifecycle.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0242-p001"></a>

When ADR 0241 Recovery-Protected Owner Scan finds one or more authoritative owners, Delete Recovery-Protected Managed Copy remains unavailable. Storage Management projects each **Blocking Managed Owner** by path-free owner category and routes the user to that owner's existing lifecycle surface; the recovery page never removes, cancels or weakens the owner itself.

<a id="0242-p002"></a>

Owner categories include Installed/Active Package, Last Known Good or Other Rollback, Active Transfer/Install/Delete/Keep Transaction, Other Pending/Kept Managed Copy, and any additional declared package-byte owner. Shared immutable bytes may list more than one category. Categories come from host owner evidence and are not inferred from filenames, directories, process names, displayed package similarity or physical file presence.

<a id="0242-p003"></a>

Installed/Active Package routes to the relevant Model Library, Extension Library or AI Runtime package detail where ordinary disable/uninstall/replacement rules apply. Rollback routes to its governed rollback or Storage Management surface, including ADR 0191 health, time and explicit early-reclaim gates. Active Transaction routes to its existing activity/progress surface, where cancellation appears only if that transaction's own policy permits it. Other Pending/Kept Copy routes to its normal managed-copy decision review.

<a id="0242-p004"></a>

The projection shows coarse owner category, exact package relationship when safely available, why it prevents advanced deletion, and the appropriate Open Management action. It exposes no managed path, database key, process token, transaction journal payload, credential or unrelated owner details. Multiple references of one category may be grouped with a count while still preserving distinct lifecycle destinations when action is required.

<a id="0242-p005"></a>

Opening a management destination does not preselect Uninstall, Release Rollback, Cancel Transaction, Unpin or Delete. It carries no remembered destructive consent, typed package-name confirmation, background cleanup request or promise that releasing one owner will reclaim the displayed bytes. Every destination repeats its own current integrity, dependency, active-job, rollback, trust and shared-owner gates.

<a id="0242-p006"></a>

There is no Continue Anyway or Force Remove control in the recovery page, Developer Mode, low-disk UI or command routing. A referenced owner must be removed through its normal lifecycle and safe terminal boundary. An active transaction that cannot be cancelled remains blocking until it completes; a required rollback owner remains blocking until ADR 0191 independently permits and the user completes its governed release.

<a id="0242-p007"></a>

Any owner generation change invalidates the prior Recovery-Protected Owner Scan and its reclaim projection. ADR 0243 returns the target as Recovery Owner Changed: returning to the recovery page never scans automatically, reuses the earlier absence proof or retains final delete confirmation. The user must explicitly run a new complete scan and, if it proves no owner, retype the package name. The ADR 0240 safety gate remains until that freshly confirmed ADR 0241 deletion commits or ordinary reconciliation proves Kept/Pending.

<a id="0242-p008"></a>

ADR 0248's Unassessable Delete Finalization Owner Scan uses the same owner categories and routing boundary after ADR 0247 repair remains unresolved. A real owner keeps finalization disabled and must be handled through this ADR's ordinary lifecycle; neither the neutral reconciliation gate nor the new exact-name confirmation can waive it.

<a id="0242-p009"></a>

Routing state is session-bound and contains only opaque target identity, coarse owner categories, destination codes and scan generation. It creates no owner activity history, cross-package browsing trail, telemetry, publisher feedback or support-log record and is excluded from Full Library Backup, export/merge/sync and synchronization.

<a id="0242-p010"></a>

The current Runtime Package/session UI has no managed-copy owner graph, blocking-owner classifier, rollback/package/transaction recovery routing or recovery-protected delete action. This ADR changes documentation only: it removes/cancels/routes no real owner, reads no runtime database/package/cache/private state and changes no public IPC/schema/AI Worker API.

<a id="adr-0243"></a>

## 0243 · Owner Changes Require A New Explicit Recovery Delete Scan And Confirmation

决定来源：[0243-owner-changes-require-a-new-explicit-recovery-delete-scan-and-confirmation.md](../../adr/0243-owner-changes-require-a-new-explicit-recovery-delete-scan-and-confirmation.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0243-p001"></a>

When any managed owner generation changes after an ADR 0241 Recovery-Protected Owner Scan, the host immediately invalidates that scan token, absence proof, reclaim projection and any open Delete Recovery-Protected Managed Copy confirmation. Storage Management enters **Recovery Owner Changed** for the exact target and keeps ADR 0240's safety gate authoritative.

<a id="0243-p002"></a>

Recovery Owner Changed shows that package ownership changed and the prior destructive review is no longer valid. Advanced delete remains disabled. Returning from an ADR 0242 management destination, reopening Storage Management, renderer reload, process restart or observing that a blocking activity has ended never automatically reruns the complete scan or re-enables deletion.

<a id="0243-p003"></a>

The only next destructive-path action is an explicit Run Full Owner Scan Again. It creates a new bounded scan over the complete authoritative managed owner stores, manifests and transaction journals, assigns a new opaque scan generation and recomputes blocking-owner categories, stable affected volumes, logical/shared bytes and owner-proven physical reclamation from current state.

<a id="0243-p004"></a>

If the new scan finds a declared owner, ADR 0242 continues to show its normal lifecycle destination and deletion stays unavailable. If it freshly proves no owner, the host may issue a new ADR 0241 delete-eligibility token and open a new irreversible review. A prior no-owner result, prior exact-name match or previous confirmation event is never reused as partial proof.

<a id="0243-p005"></a>

ADR 0244 gives each new no-owner proof a non-renewable five-minute hard validity window. Even without another owner-generation event, expiry before host acceptance invalidates eligibility, clears typed text and requires another explicit complete scan rather than refreshing the current generation.

<a id="0243-p006"></a>

Every new delete review clears the typed package-name field. The user must re-enter the exact currently displayed package name after seeing the refreshed identity, byte projection and no-Undo consequence. Browser autofill, renderer form restoration, clipboard history, another window or a cached component state cannot populate or submit the destructive confirmation automatically.

<a id="0243-p007"></a>

The final delete still revalidates the new recovery-gate generation, owner-scan generation, stable volume identity and absence proof under ADR 0241. If ownership changes during rescan or confirmation, the host returns to Recovery Owner Changed again without deleting, retaining typed text or queuing another scan. There is no retry loop, remembered delete-when-free intent or automatic execution after the last blocker ends.

<a id="0243-p008"></a>

Owner-generation invalidation is host-wide across application windows and processes for the same authoritative managed stores. A renderer-local snapshot cannot remain valid merely because its page did not observe another install, rollback, transaction or copy transition. Distinct unrelated owner graphs may continue independently when their stable store/volume evidence proves separation.

<a id="0243-p009"></a>

The same invalidation rule applies to ADR 0248's fresh Unassessable Delete Finalization Owner Scan. Any relevant owner change invalidates its proof, projection and newly typed confirmation; it never falls back to the older recovery-delete scan or authorization.

<a id="0243-p010"></a>

Recovery Owner Changed state retains only opaque target/gate and invalidated/current scan generations plus a coarse change reason. Typed confirmation text is never persisted or logged. State and projections contain no paths, owner journal payload, credentials, user content or attention history and are excluded from Full Library Backup, export/merge/sync, telemetry, publisher feedback and support logs.

<a id="0243-p011"></a>

The current Runtime Package/session UI has no durable owner generations, recovery scan token, cross-window invalidation, explicit rescan workflow or typed-name recovery delete. This ADR changes documentation only: it scans/confirms/deletes no real owner or bytes, reads no runtime database/package/cache/private state and changes no public IPC/schema/AI Worker API.

<a id="adr-0244"></a>

## 0244 · Recovery Delete Owner Scan Proof Expires After Five Minutes

决定来源：[0244-recovery-delete-owner-scan-proof-expires-after-five-minutes.md](../../adr/0244-recovery-delete-owner-scan-proof-expires-after-five-minutes.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0244-p001"></a>

An ADR 0241 Recovery-Protected Owner Scan that freshly proves no declared owner issues one **Recovery Owner Scan Validity Window**. Its destructive absence proof and delete-eligibility token remain valid for at most five elapsed minutes from the host's terminal scan commit, not from opening Storage Management, opening confirmation or beginning to type the package name.

<a id="0244-p002"></a>

The host owns the hard deadline using a monotonic bounded duration plus a conservative wall-time ceiling. Sleep, timezone/locale changes, clock anomalies, focus changes or a stalled renderer cannot lengthen it. Process restart, host lease loss or inability to assess the original scan deadline invalidates the token rather than recreating the remaining time.

<a id="0244-p003"></a>

The confirmation may open while the token is valid and shows a coarse remaining-validity countdown alongside the exact package identity and destructive consequence. Opening, dismissing, reopening, scrolling, accessibility interaction, typing, clearing or matching the package name never pauses, refreshes or replaces the scan deadline.

<a id="0244-p004"></a>

At final submission, the host requires the exact recovery gate, target, stable volumes, no-owner scan generation and hard deadline still to be valid before it may accept ADR 0241 deletion. Renderer click time, a queued IPC event, cached enabled button or confirmation animation before expiry is not acceptance. ADR 0243 owner-generation invalidation remains immediate and may end eligibility earlier than this time cap.

<a id="0244-p005"></a>

If the five-minute deadline passes before host acceptance, no reference or byte is deleted. The host invalidates the no-owner proof and eligibility token, closes/disables the confirmation, clears the typed package name and enters **Recovery Owner Scan Expired**. The ADR 0240 safety gate remains unchanged, and the only destructive-path continuation is another explicit complete owner scan.

<a id="0244-p006"></a>

Recovery Owner Scan Expired does not automatically rerun the scan, reopen confirmation, repopulate text, queue a delete-when-fresh intent or infer that ownership probably stayed unchanged. Low-disk pressure, an empty blocking-owner list, another window or repeated confirmation attempts cannot renew the proof. A new scan always receives a new generation and fresh five-minute deadline.

<a id="0244-p007"></a>

The five-minute window is neither a deletion transaction timeout nor permission to skip final generation revalidation. It bounds only how long a completed absence proof may authorize host acceptance. A timely accepted request atomically transitions to ADR 0245's one maximum-five-second reference-removal transaction; later scan expiry neither cancels that transaction nor constrains its separate physical cleanup. Expiry never retroactively authorizes a request that arrived late.

<a id="0244-p008"></a>

Validity state contains only opaque target/gate/scan identity, terminal scan time, hard deadline and expired/current class. It retains no typed package name, paths, owner evidence payload, credentials, content or attention history and is excluded from Full Library Backup, export/merge/sync, telemetry, publisher feedback and support logs. Expiry creates no notification or activity-history record.

<a id="0244-p009"></a>

ADR 0248 applies the same non-renewable five-minute absence-proof validity to its entirely new Unassessable Delete Finalization Owner Scan. That finalization never inherits remaining time, proof or confirmation from an ADR 0241 scan; expiry before host acceptance preserves the neutral ADR 0247 gate and requires another explicit complete scan.

<a id="0244-p010"></a>

A timely ADR 0248 host acceptance atomically transitions to ADR 0249's separate maximum-five-second normalization transaction. Later expiry of the finalization scan proof neither cancels that accepted transaction nor constrains physical cleanup; it still cannot authorize a late request.

<a id="0244-p011"></a>

The current Runtime Package/session UI has a separate ten-minute local-manifest selection TTL but no recovery owner scan, absence-proof token, five-minute destructive validity window or host deadline projection. That existing selection TTL is not reused as this policy. This ADR changes documentation only: it starts/expires no real scan, deletes no owner or bytes, reads no runtime database/package/cache/private state and changes no public IPC/schema/AI Worker API.

<a id="adr-0245"></a>

## 0245 · On-Time Recovery Delete Gets One Five-Second Reference Removal Transaction

决定来源：[0245-on-time-recovery-delete-gets-one-five-second-reference-removal-transaction.md](../../adr/0245-on-time-recovery-delete-gets-one-five-second-reference-removal-transaction.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0245-p001"></a>

When the host accepts an ADR 0241 Delete Recovery-Protected Managed Copy request before ADR 0244's no-owner scan deadline, it atomically consumes that exact delete authorization and enters one **Recovery-Protected Reference Removal In Flight** transaction. Acceptance freezes the target, recovery-gate generation, owner-scan generation, stable volume identity and exact package confirmation that authorized the request. Later expiry of the five-minute scan-validity window does not cancel or weaken this already accepted transaction.

<a id="0245-p002"></a>

The transaction receives at most five elapsed seconds from host acceptance to reach a terminal reference-removal outcome. It uses a narrow target/owner-store transaction lock rather than an ADR 0229 Storage Resolution Volume Slot, and it does not hold or renew the earlier scan token. The confirmation and scan countdown are replaced by a non-cancellable Deleting Recovery-Protected Copy status; closing the window, renderer loss, low-disk changes or another review cannot switch targets, edit scope, request a new scan or reuse the authorization.

<a id="0245-p003"></a>

Before its atomic commit boundary, the host revalidates the frozen target, gate and volume identity and proves against the current owner generation that no installed, rollback, transaction, kept, pending or other declared owner has appeared. A newly observed or unassessable owner aborts and rolls back the transaction before reference commit, preserves the managed-copy reference and recovery safety gate and returns the target to Recovery Owner Changed. The accepted delete attempt is consumed; continuation requires a fresh scan and newly typed confirmation rather than an automatic retry.

<a id="0245-p004"></a>

The only destructive commit removes the ambiguous application-managed copy reference and its recovery safety gate and records the terminal delete decision atomically. It does not rewrite package payloads or delete installed/extracted content, active rollback data, user assets, External User-Owned Packages, another managed reference or any unrelated storage class.

<a id="0245-p005"></a>

If durable reference removal has not committed within five seconds, the host rolls back the attempt, retains the reference and safety gate and reports **Reference Removal Timed Out**. The old scan proof and consumed authorization cannot be reused, and no background or startup path retries the user-intent write. A new attempt starts only after another explicit complete owner scan and exact-name confirmation.

<a id="0245-p006"></a>

Once durable reference removal commits within the cap, the user's delete decision is terminal even if physical unlinking is incomplete. Owner-safe deletion of now-unowned managed bytes may finish after the five-second transaction. Failure, a busy file, volume loss or delayed cleanup becomes ADR 0230-style **Physical Reclaim Pending**; reconciliation may retry only physical cleanup and may never recreate or remove a reference, repeat the delete authorization, infer Keep/Pending or widen the target. The result reports actual zero, partial or full bytes reclaimed rather than treating logical reference removal as immediate disk reclamation.

<a id="0245-p007"></a>

ADR 0252 governs those retries. Each attempt rechecks current owner, stable volume and exact byte identity and may pause as blocked, not assessable or waiting for volume; no result can reopen this transaction or repeat its user-intent write.

<a id="0245-p008"></a>

The transaction journal retains only opaque target, gate, scan, owner-generation and volume identities, acceptance/deadline timestamps, commit-boundary class and terminal reason needed to determine whether reference removal committed. It contains no typed package name, paths, payload, owner evidence, credentials, user content or private state and is excluded from Full Library Backup, export/merge/sync, telemetry, publisher feedback and support logs.

<a id="0245-p009"></a>

If process termination interrupts this transaction, ADR 0246 uses that minimal journal for one idempotent startup reconciliation. It preserves a proven committed deletion or restores a proven non-commit without rerunning the scan, confirmation or reference write, then exposes one path-free result for at most one usable viewing opportunity or 24 hours.

<a id="0245-p010"></a>

The current Runtime Package/session implementation has no recovery-protected reference-removal transaction, owner-store lock, five-second commit cap or Physical Reclaim Pending continuation for this flow. This ADR changes documentation only: it accepts/deletes/reconciles no real package copy, reads no runtime database/package/cache/model/asset/private state and changes no public IPC/schema/AI Worker API.

<a id="0245-p011"></a>

ADR 0249 uses the same five-second separation for a later, separately authorized unassessable-delete finalization, but its atomic scope normalizes an ADR 0247 neutral gate and ambiguous journal rather than retrying this reference-removal transaction. The two authorizations and journals are never interchangeable.

<a id="adr-0246"></a>

## 0246 · Interrupted Recovery Delete Reconciles Once And Shows A Twenty-Four-Hour Result

决定来源：[0246-interrupted-recovery-delete-reconciles-once-and-shows-a-24-hour-result.md](../../adr/0246-interrupted-recovery-delete-reconciles-once-and-shows-a-24-hour-result.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0246-p001"></a>

When ADR 0245 Recovery-Protected Reference Removal In Flight is interrupted by main-process termination or an unclean application exit, the next host performs one idempotent **Interrupted Recovery Delete Reconciliation** before package cleanup, recovery actions or another owner mutation may act on that exact target. Reconciliation reads only the minimal device-local owner generations and transaction journal needed to determine which side of the atomic reference-removal boundary durably committed.

<a id="0246-p002"></a>

If durable evidence proves that reference and recovery-gate removal committed, the delete decision remains terminal as **Recovered As Deleted**. The host does not recreate either record or reinterpret later ADR 0244 scan expiry. Already removed physical bytes remain removed; any unowned managed bytes still present continue only through owner-safe physical cleanup or ADR 0230-style Physical Reclaim Pending.

<a id="0246-p003"></a>

If durable evidence proves that reference removal did not commit, the original ambiguous managed-copy reference and ADR 0240 recovery safety gate remain authoritative as **Recovered As Protected**. The accepted delete authorization, exact-name confirmation and old owner scan remain consumed. Reconciliation does not rerun the scan, reopen confirmation, restart ADR 0245's five-second transaction or retry the destructive reference write.

<a id="0246-p004"></a>

If neither committed nor uncommitted outcome can be proved, reconciliation emits no false recovered outcome and performs no reference or byte mutation. ADR 0247 places the exact target behind a neutral Recovery Delete Reconciliation Safety Gate that blocks cleanup and owner-changing actions until bounded local evidence repair establishes an outcome; missing, corrupt or contradictory records are not proof of either side.

<a id="0246-p005"></a>

After a proven outcome, Storage Management receives one path-free **Recovered Protected-Copy Delete Result** with Recovered As Deleted or Recovered As Protected status. It identifies the package in ordinary path-free product terms, states that an interrupted delete was reconciled rather than retried and shows the current reference and physical-reclaim class. It may report actual reclaimed bytes when authoritative evidence provides them, but never substitutes the earlier reclaim projection for a final result.

<a id="0246-p006"></a>

The result expires at the earlier of one usable Storage Management viewing opportunity or 24 elapsed hours after reconciliation. A viewing opportunity begins only when a usable renderer acknowledges projection; the card remains stable for that surface session and is pruned after dismissal or leaving the surface. If never projected, the hard cap removes it. No focus duration, eye tracking, click history or proof of reading is recorded.

<a id="0246-p007"></a>

The result is explanatory only. It creates no startup modal, OS notification, badge-driven urgency, Activity History entry, owner, scan, confirmation, cleanup authorization or storage reservation. Its dismissal or expiry cannot alter the recovered reference outcome or stop owner-safe physical cleanup that follows an already committed deletion.

<a id="0246-p008"></a>

The reconciliation/result record retains only opaque transaction, target, gate, scan, owner-generation and volume identities, committed/uncommitted result class, coarse physical-reclaim class, reconciliation/expiry times and renderer-projection acknowledgement. It contains no typed package name, paths, payload, owner evidence, credentials, user content, filesystem event trail or attention history and is excluded from Full Library Backup, export/merge/sync, telemetry, publisher feedback and support logs.

<a id="0246-p009"></a>

The current Runtime Package/session implementation has no recovery-delete journal, startup reference-removal reconciliation, Physical Reclaim Pending continuation or 24-hour protected-copy delete result. This ADR changes documentation only: it reconciles/retries/deletes no real reference or bytes, reads no runtime database/package/cache/model/asset/private state and changes no public IPC/schema/AI Worker API.

<a id="0246-p010"></a>

ADR 0250 applies the same one-viewing-or-24-hour explanatory-result pattern to an interrupted ADR 0249 finalization, but it reconciles terminal normalization of an already neutral-gated target. Its non-commit result restores ADR 0247 neutral safety rather than this ADR's original ADR 0240 protected reference state.

<a id="adr-0247"></a>

## 0247 · Unassessable Recovery Delete Reconciliation Protects Only The Affected Copy

决定来源：[0247-unassessable-recovery-delete-reconciliation-protects-only-the-affected-copy.md](../../adr/0247-unassessable-recovery-delete-reconciliation-protects-only-the-affected-copy.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0247-p001"></a>

If ADR 0246 Interrupted Recovery Delete Reconciliation cannot prove either committed or uncommitted reference removal because the minimal transaction journal and authoritative owner generations are missing, corrupt, contradictory or unverifiable, the host enters **Recovery Delete Reconciliation Not Assessable** for that exact managed package-copy target. It never infers an outcome from package-byte presence, timestamps, renderer state, an absent row or the user's former delete intent.

<a id="0247-p002"></a>

Before any cleanup or owner-changing action can act on the target, the host installs one target-scoped **Recovery Delete Reconciliation Safety Gate**. This gate is neutral about whether the old reference-removal commit succeeded: it neither recreates an app-owned reference nor declares one deleted, and it is not an ADR 0240 Keep Recovery Safety Gate, Keep pin, pending owner, cleanup authorization or completed delete result. It preserves any remaining managed bytes from mutation while the boundary is unknown.

<a id="0247-p003"></a>

Install, Keep, ordinary or advanced Delete, unpin, owner migration, automatic pending cleanup, package-copy batch cleanup and Physical Reclaim Pending execution are blocked only for this target. Other copies, owners, volumes, installs and cleanup workflows continue under their own rules, and the gate acquires no ADR 0229 Storage Resolution Volume Slot. Low-disk pressure may report the protected impact but cannot bypass the gate or count its bytes as safely reclaimable.

<a id="0247-p004"></a>

Storage Management shows the path-free package identity, Recovery Delete Reconciliation Not Assessable state, typed evidence-failure class and protected/shared byte impact only when safely calculable. It offers two local actions: **Recheck Delete Reconciliation Evidence** and **Repair Delete Reconciliation Record**. It exposes no database row, journal payload, path, credential, private content, Choose Deleted/Choose Protected shortcut or Force Cleanup action.

<a id="0247-p005"></a>

Recheck Delete Reconciliation Evidence is a bounded read-only validation of the authoritative owner store, target/gate generations, stable volume identity and minimal reference-removal journal. Repair Delete Reconciliation Record may normalize or replace only malformed reconciliation metadata after independent authoritative evidence proves which atomic boundary committed. It cannot manufacture or remove an owner/reference, delete bytes, repeat the old transaction, renew the owner scan, reuse typed confirmation, change a digest, reacquire content or contact a network service.

<a id="0247-p006"></a>

The host may perform one bounded check during startup and another after an explicit recheck/repair request. It does not poll, repeatedly rewrite evidence, schedule background deletion, create a helper, issue an OS notification or treat restart alone as new evidence. A failed action preserves the same target gate with a typed path-free reason and changes no other package state.

<a id="0247-p007"></a>

When later evidence proves that reference removal committed, the host atomically clears this safety gate, preserves the terminal deletion and emits ADR 0246 Recovered As Deleted; only then may owner-safe physical cleanup resume or enter Physical Reclaim Pending. When evidence proves no commit, it atomically clears this safety gate, restores the original ambiguous managed-copy reference and ADR 0240 recovery safety gate as authoritative and emits Recovered As Protected. Neither outcome reruns the old delete, scan or confirmation.

<a id="0247-p008"></a>

While the state remains unassessable, Storage Management classifies any affected bytes as Recovery Delete Protected / Reclaimability Not Assessable rather than installed, kept, pending, deleted, free or reclaimable. An explanatory result is emitted only after a proven outcome; repeated failed checks do not create ADR 0246's one-viewing-or-24-hour result or activity history.

<a id="0247-p009"></a>

After an explicit recheck and repair remain unresolved, ADR 0248 may expose one separately authorized Finalize Unassessable Recovery Delete escape. A new complete owner scan, stable target/volume/byte identity and newly typed exact package name are mandatory before it may atomically normalize the ambiguous reference, gates and old journal into terminal deletion. Until that new action commits, this neutral gate remains authoritative.

<a id="0247-p010"></a>

ADR 0249 gives timely host acceptance of that action one maximum-five-second normalization transaction. Any timeout or new owner/identity drift before atomic commit rolls back to this neutral gate and consumes the new attempt; scan expiry after acceptance does not cancel an otherwise valid in-flight transaction.

<a id="0247-p011"></a>

If that normalization is interrupted, ADR 0250 restores or reasserts this neutral gate whenever non-commit is proven or the boundary remains unprovable. This restoration freezes only the target; it does not recreate a reference, reuse finalization authorization or prevent a future fully explicit ADR 0248 attempt after this ADR's prerequisites are repeated.

<a id="0247-p012"></a>

ADR 0251 requires this ADR's current-generation recheck and repair again after every timed-out, rolled-back or recovered-as-gated finalization. There is no automatic or implicit retry: only a still-unassessable result from those newly explicit actions may proceed to another fresh ADR 0248 review.

<a id="0247-p013"></a>

Gate state contains only opaque target, transaction, prior-gate, scan, owner-generation and stable-volume identities, typed reason class, last bounded-check outcome and minimal reconciliation generations. It is device-local safety metadata excluded from Full Library Backup, export/merge/sync, telemetry, publisher feedback and support logs and contains no typed package name, managed path, payload, owner evidence, asset content, credential or user-attention history.

<a id="0247-p014"></a>

The current Runtime Package/session implementation has no durable recovery-delete journal, reconciliation safety gate, local repair action or protected physical-reclaim classification. This ADR changes documentation only: it gates/rechecks/repairs no real owner or bytes, reads no runtime database/package/cache/model/asset/private state and changes no public IPC/schema/AI Worker API.

<a id="adr-0248"></a>

## 0248 · Unassessable Recovery Delete Uses A Fresh Owner-Proven Finalization

决定来源：[0248-unassessable-recovery-delete-uses-a-fresh-owner-proven-finalization.md](../../adr/0248-unassessable-recovery-delete-uses-a-fresh-owner-proven-finalization.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0248-p001"></a>

After an explicit ADR 0247 Recheck Delete Reconciliation Evidence and Repair Delete Reconciliation Record attempt still cannot prove the interrupted delete boundary, Storage Management may expose one advanced **Finalize Unassessable Recovery Delete** action. This is a new destructive decision that deliberately ends an otherwise permanent neutral safety gate; it is not a recovered outcome, retry of ADR 0245 or continuation of the old scan, confirmation or authorization.

<a id="0248-p002"></a>

The action remains disabled until a new bounded **Unassessable Delete Finalization Owner Scan** completely checks authoritative application-managed owner stores, manifests and active transaction journals and independently proves that no installed/extracted package, active or Last Known Good rollback set, transfer/install/delete/Keep transaction, other pending or kept managed copy, or any other declared owner requires the target or its immutable bytes. The ADR 0247 neutral gate and the exact ambiguous target record being normalized are not treated as functional owners, but their identity and generation remain mandatory finalization inputs.

<a id="0248-p003"></a>

Missing, corrupt, contradictory, incomplete or changing evidence is not proof of absence. Any real owner keeps finalization unavailable and uses ADR 0242's path-free category and ordinary lifecycle destination; the finalization surface cannot release or bypass it. A fresh no-owner result receives a new generation and ADR 0244's non-renewable maximum-five-minute validity window. Owner-generation change follows ADR 0243: it invalidates the proof, projection and confirmation and requires another explicit complete scan.

<a id="0248-p004"></a>

The review shows the exact path-free package/publisher/version and target identity, Recovery Delete Reconciliation Not Assessable reason, stable volume and managed-byte identity, logical/shared bytes, freshly owner-proven reclaimable physical bytes and that the action has no Asset Trash or Undo. It explains that the application will normalize an ambiguous interrupted-delete record into a terminal deletion rather than claim which old outcome occurred. The user must retype the exact displayed package name; no prior text, form restoration, old confirmation or old delete intent may populate or authorize the action.

<a id="0248-p005"></a>

Final submission reaches the host only while the exact ADR 0247 safety-gate generation, target and stable volume/byte identities, no-owner scan generation, every absence proof, typed-name match and five-minute deadline remain current. Renderer click time or queued IPC is not acceptance. A late request, owner change or identity drift deletes nothing, clears typed confirmation and requires a new explicit complete scan.

<a id="0248-p006"></a>

A timely accepted finalization receives a new authorization and enters ADR 0249's one maximum-five-second normalization transaction to atomically and idempotently establish one terminal state: no ambiguous target managed-copy reference, no residual ADR 0240 recovery gate, no ADR 0247 reconciliation safety gate and no obsolete ambiguous interrupted-delete journal remain. The commit replaces those ambiguous records with only the minimal terminal deletion evidence required for safe reconciliation and physical cleanup. Later scan expiry does not cancel the accepted transaction. It never manufactures a Pending/Kept owner, rewrites package payload, deletes an owner, changes installed/rollback state or acts outside the exact target.

<a id="0248-p007"></a>

Only after the terminal reference state commits may owner-safe physical cleanup delete now-unowned managed bytes. Shared bytes remain for any independently valid owner, and delayed or failed removal enters ADR 0230-style Physical Reclaim Pending without repeating this finalization. Actual zero, partial or full reclaimed bytes are reported; the owner-scan projection is never presented as the final reclaimed amount.

<a id="0248-p008"></a>

Finalize Unassessable Recovery Delete is single-target, manually opened and irreversible. It is excluded from package-copy batch deletion, automatic low-disk cleanup, suggested cleanup plans, Developer Mode force actions and background maintenance. Closing the review, expiry or any pre-acceptance failure preserves the neutral safety gate and schedules no scan, retry or delete-when-clear intent.

<a id="0248-p009"></a>

ADR 0250 reconciles an interrupted ADR 0249 transaction once at next startup. A proven commit preserves terminal deletion; a proven non-commit or unprovable boundary restores/reasserts ADR 0247 neutral safety without reusing this scan, typed package name or authorization.

<a id="0248-p010"></a>

ADR 0251 allows a later new finalization without a lifetime attempt cap only after the latest ADR 0247 recheck/repair again remains unassessable. The complete scan, five-minute proof, exact-name confirmation and host revalidation in this ADR are repeated from zero, and only one such review/transaction may exist for the target.

<a id="0248-p011"></a>

Finalization review state retains only opaque target, gate, scan, owner-generation and stable-volume/byte identities, typed outcome classes, hard deadline and path-free byte projections. It retains no typed package-name content, paths, owner payload, credentials, user content or private state and is excluded from Full Library Backup, export/merge/sync, telemetry, publisher feedback and support logs.

<a id="0248-p012"></a>

The current Runtime Package/session implementation has no unassessable-delete finalization, complete owner scan, neutral-gate normalization or terminal package-copy deletion record. This ADR changes documentation only: it scans/finalizes/deletes no real owner or bytes, reads no runtime database/package/cache/model/asset/private state and changes no public IPC/schema/AI Worker API. ADR 0249 defines the accepted transaction deadline; interrupted-transaction recovery remains separately defined rather than inferred here.

<a id="adr-0249"></a>

## 0249 · On-Time Unassessable Delete Finalization Gets One Five-Second Normalization Transaction

决定来源：[0249-on-time-unassessable-delete-finalization-gets-one-five-second-normalization-transaction.md](../../adr/0249-on-time-unassessable-delete-finalization-gets-one-five-second-normalization-transaction.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0249-p001"></a>

When the host accepts ADR 0248 Finalize Unassessable Recovery Delete before its fresh owner-scan deadline, it atomically consumes that exact finalization authorization and enters one **Unassessable Delete Finalization In Flight** transaction. Acceptance freezes the target, ADR 0247 safety-gate generation, finalization owner-scan generation, owner generation, stable volume/byte identities and exact package-name confirmation. Later expiry of the five-minute scan-validity window does not cancel, renew or weaken the accepted transaction.

<a id="0249-p002"></a>

The transaction receives at most five elapsed seconds from host acceptance to reach a terminal normalization outcome. It uses a narrow target/owner-store transaction lock rather than an ADR 0229 Storage Resolution Volume Slot and does not keep the earlier absence-proof token alive. The review/countdown becomes a non-cancellable Finalizing Unassessable Recovery Delete status; renderer loss, window closure, navigation, low-disk changes or another review cannot change target, edit scope, cancel, rescan or reuse the authorization.

<a id="0249-p003"></a>

Before the atomic commit boundary, the host revalidates the frozen target, neutral gate, volume/byte identities and current owner generation and again proves that no installed, rollback, transaction, pending, kept or other declared owner has appeared. A new or unassessable owner, gate change, volume replacement or target-byte identity drift aborts and rolls back before commit, preserves the ADR 0247 neutral safety gate and enters **Finalization Owner Or Identity Changed**. The accepted attempt is consumed; continuation requires a new complete scan and newly typed package name.

<a id="0249-p004"></a>

The only destructive commit idempotently establishes the ADR 0248 terminal state in one owner-store transaction: any ambiguous target reference, residual ADR 0240 recovery gate, ADR 0247 reconciliation safety gate and obsolete interrupted-delete journal are absent, while minimal terminal deletion evidence is durable. It cannot manufacture Pending/Kept ownership, remove a real owner, rewrite package payload, mutate installed/rollback content or expand to another target.

<a id="0249-p005"></a>

If that durable terminal state has not committed within five seconds, the host rolls back the attempt, retains the neutral safety gate and reports **Unassessable Delete Finalization Timed Out**. The consumed authorization, typed confirmation and old no-owner proof cannot be reused, and no background or startup path retries the normalization write. A later attempt begins only with another explicit full owner scan and exact-name confirmation.

<a id="0249-p006"></a>

Once terminal normalization commits within the cap, the delete decision is final even if physical unlinking is incomplete. Owner-safe cleanup of now-unowned managed bytes may finish after the five-second transaction. Failure, busy bytes, volume loss or delayed removal becomes ADR 0230-style Physical Reclaim Pending; reconciliation retries only physical cleanup and never repeats normalization, recreates a gate/reference or infers a different owner state. Actual zero, partial or full reclaimed bytes remain separate from the earlier projection.

<a id="0249-p007"></a>

ADR 0252 provides the physical-only retry triggers and fresh owner/volume/byte checks. Pending cleanup has no age-based abandonment, but every owner or unassessable identity state pauses unlinking without changing the terminal finalization result.

<a id="0249-p008"></a>

The transaction journal retains only opaque target, prior-gate, finalization-scan, owner-generation and stable-volume/byte identities, acceptance/deadline timestamps, atomic commit-boundary class and typed terminal reason. It contains no typed package-name content, paths, payload, owner evidence, credentials, user content or private state and is excluded from Full Library Backup, export/merge/sync, telemetry, publisher feedback and support logs.

<a id="0249-p009"></a>

If process termination interrupts this transaction, ADR 0250 performs one idempotent startup reconciliation before any target action. A proven commit remains deleted; a proven non-commit or unprovable boundary restores/reasserts ADR 0247 neutral safety. It never treats interruption as timeout, automatic retry or reusable authorization.

<a id="0249-p010"></a>

ADR 0251 permits another independently reviewed manual attempt after rollback/timeout or gated recovery, but no state from this transaction carries forward. A target-scoped host lease allows only one current finalization transaction and every new attempt repeats the full evidence and consent chain.

<a id="0249-p011"></a>

The current Runtime Package/session implementation has no unassessable-delete normalization transaction, target/owner-store lock, five-second commit cap or finalization timeout state. This ADR changes documentation only: it accepts/normalizes/deletes/reconciles no real package copy, reads no runtime database/package/cache/model/asset/private state and changes no public IPC/schema/AI Worker API.

<a id="adr-0250"></a>

## 0250 · Interrupted Unassessable Delete Finalization Reconciles Once And Restores Neutral Safety

决定来源：[0250-interrupted-unassessable-delete-finalization-reconciles-once-and-restores-neutral-safety.md](../../adr/0250-interrupted-unassessable-delete-finalization-reconciles-once-and-restores-neutral-safety.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0250-p001"></a>

When ADR 0249 Unassessable Delete Finalization In Flight is interrupted by main-process termination or an unclean application exit, the next host performs one idempotent **Interrupted Unassessable Delete Finalization Reconciliation** before cleanup, physical reclaim, recovery actions or another owner mutation may act on that exact target. Reconciliation reads only the minimal device-local owner generations and finalization journal needed to determine whether the atomic terminal-normalization boundary durably committed.

<a id="0250-p002"></a>

If durable evidence proves that normalization committed, the target becomes **Recovered Finalization As Deleted**. The terminal deletion evidence remains authoritative; no ambiguous reference, ADR 0240 gate or ADR 0247 neutral gate is recreated. Already removed bytes remain removed, while any unowned managed bytes still present continue only through owner-safe physical cleanup or ADR 0230-style Physical Reclaim Pending.

<a id="0250-p003"></a>

That continuation follows ADR 0252 and begins only after this startup reconciliation proves commit. Its retry may remove unowned managed bytes but cannot reinterpret this result, repeat normalization or bypass a newly observed owner.

<a id="0250-p004"></a>

If durable evidence proves that normalization did not commit, the host establishes **Recovered Finalization As Gated** by preserving or restoring the ADR 0247 Recovery Delete Reconciliation Safety Gate as the only recovery authority. Restoring this neutral gate does not recreate an ambiguous managed-copy reference, choose the old interrupted-delete outcome or assert that finalization failed before every internal write; it only prevents mutation while the original target remains unassessable.

<a id="0250-p005"></a>

If neither committed nor uncommitted normalization can be proved, the host also installs or reasserts the ADR 0247 neutral safety gate before any target action. It emits no false recovered outcome, changes no reference or bytes and keeps Recovery Delete Reconciliation Not Assessable visible with a typed path-free evidence reason. Package-byte presence, missing records, timestamps and prior user intent are not used to choose either side.

<a id="0250-p006"></a>

All three branches consume the interrupted ADR 0249 attempt. Reconciliation never reruns ADR 0247 repair, ADR 0248's owner scan or confirmation, restarts the five-second transaction, repeats normalization or grants a new finalization authorization. Later finalization remains possible only through the full separately explicit ADR 0247 and ADR 0248 prerequisites.

<a id="0250-p007"></a>

ADR 0251 adds no permanent attempt cap or hidden cooldown after a gated/unprovable outcome, but it requires those prerequisites to be repeated against the latest generations and permits only one active review/transaction for the target. Only the latest path-free failure class survives; this recovered result is not a retry shortcut.

<a id="0250-p008"></a>

After a proven committed or uncommitted outcome, Storage Management receives one path-free **Recovered Unassessable Delete Finalization Result** with Recovered Finalization As Deleted or Recovered Finalization As Gated status. It identifies the package in ordinary path-free terms, states that an interrupted finalization was reconciled rather than retried and shows the current terminal/gated and physical-reclaim class. It never presents the earlier owner-scan projection as actual reclaimed bytes.

<a id="0250-p009"></a>

The result expires at the earlier of one usable Storage Management viewing opportunity or 24 elapsed hours after reconciliation. A viewing opportunity begins only when a usable renderer acknowledges projection; the card remains stable for that surface session and is removed after dismissal or leaving the surface. If never projected, the hard cap removes it. An unprovable reconciliation creates no recovered-result card because no terminal outcome was established.

<a id="0250-p010"></a>

The result is explanatory only. It creates no startup modal, OS notification, badge-driven urgency, Activity History entry, owner, scan, cleanup authority, retry or storage reservation. Dismissal or expiry changes neither terminal deletion and physical cleanup nor the restored neutral safety gate.

<a id="0250-p011"></a>

The reconciliation/result record retains only opaque transaction, target, prior-gate, scan, owner-generation and stable-volume/byte identities, committed/uncommitted/unprovable class, coarse physical-reclaim class, reconciliation/expiry times and renderer-projection acknowledgement. It contains no typed package-name content, paths, payload, owner evidence, credentials, user content, filesystem event trail or attention history and is excluded from Full Library Backup, export/merge/sync, telemetry, publisher feedback and support logs.

<a id="0250-p012"></a>

The current Runtime Package/session implementation has no finalization journal, startup normalization reconciliation, neutral-gate restoration or 24-hour finalization result. This ADR changes documentation only: it reconciles/retries/normalizes/deletes no real reference or bytes, reads no runtime database/package/cache/model/asset/private state and changes no public IPC/schema/AI Worker API.

<a id="adr-0251"></a>

## 0251 · Unassessable Delete Finalization Allows New Fully Gated Manual Attempts

决定来源：[0251-unassessable-delete-finalization-allows-new-fully-gated-manual-attempts.md](../../adr/0251-unassessable-delete-finalization-allows-new-fully-gated-manual-attempts.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0251-p001"></a>

When ADR 0249 times out or rolls back, or ADR 0250 recovers an interrupted finalization as gated or unprovable, the ADR 0247 target enters **Fresh Finalization Review Required**. No old scan, typed package name, renderer state, accepted authorization, transaction generation or recovered-result card re-enables Finalize Unassessable Recovery Delete. The neutral safety gate remains authoritative until the user completes the current evidence workflow again.

<a id="0251-p002"></a>

The user must explicitly run a new ADR 0247 Recheck Delete Reconciliation Evidence and Repair Delete Reconciliation Record against the latest target, owner and journal generations. If those actions now prove the old recovery-delete outcome, ordinary ADR 0246 resolution applies and no finalization is needed. Only if the latest bounded recheck/repair remains unassessable may the user begin ADR 0248's new complete owner scan, exact-name confirmation and final host revalidation.

<a id="0251-p003"></a>

There is no lifetime attempt limit, hidden cooldown or permanent lockout for separately authorized manual finalizations. A fixed cap could strand owner-proven unneeded bytes after a transient process, volume or storage failure. This does not grant retry authority: every attempt receives new evidence and consent, and no timeout, crash, low-disk condition, restart, renderer reopen or repeated failure automatically schedules or starts another scan, repair, confirmation or transaction.

<a id="0251-p004"></a>

At most one ADR 0248 review/finalization transaction may be active host-wide for the exact target. A target-scoped generation/transaction lease rejects duplicate submissions and makes other windows read-only observers of the current state. Ordinary button debouncing and duplicate-request rejection enforce that single attempt but are not a cooldown. Distinct targets may proceed independently when their owner stores, volumes and transaction evidence prove safe separation.

<a id="0251-p005"></a>

While Fresh Finalization Review Required remains, Storage Management shows only the latest path-free finalization failure class and the next required action. A new failure atomically replaces the previous class rather than appending an attempt record. Proven recovery, terminal deletion or target retirement clears it. The app keeps no cumulative attempt count, failure timeline, long-lived Activity History entry, notification badge or support/publisher report.

<a id="0251-p006"></a>

The latest-failure state retains only opaque target, neutral-gate and last-attempt generation, typed failure/recovery class and last terminal time needed to prevent duplicate reuse. It contains no typed package-name content, scan payload, paths, bytes, credentials, user content or attention history and is excluded from Full Library Backup, export/merge/sync, telemetry, publisher feedback and support logs.

<a id="0251-p007"></a>

The current Runtime Package/session implementation has no neutral recovery-delete gate, finalization review generation, host-wide target lease or latest-only finalization failure state. This ADR changes documentation only: it retries/scans/repairs/finalizes no real package copy, reads no runtime database/package/cache/model/asset/private state and changes no public IPC/schema/AI Worker API.

<a id="adr-0252"></a>

## 0252 · Physical Reclaim Pending Retries Owner-Safe Cleanup Without Repeating Delete Intent

决定来源：[0252-physical-reclaim-pending-retries-owner-safe-cleanup-without-repeating-delete-intent.md](../../adr/0252-physical-reclaim-pending-retries-owner-safe-cleanup-without-repeating-delete-intent.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0252-p001"></a>

After an ADR 0230, ADR 0245 or ADR 0249 owner/reference transaction has durably committed terminal deletion but owner-safe removal of application-managed bytes is incomplete, the remaining bytes enter **Physical Reclaim Pending**. This state carries no reference-deletion authority: the user's irreversible decision is already terminal, and every retry may perform only physical cleanup of the exact committed, now-unowned managed-byte scope.

<a id="0252-p002"></a>

The host may trigger a retry immediately after terminal commit, during a later application startup after required transaction reconciliation, when the exact stable target volume is remounted, through bounded backoff while the application is active, or from an explicit **Retry Physical Reclaim** action in Storage Management. These triggers do not reopen confirmation, repeat a batch/finalization, renew an owner scan or create a new delete decision. No hidden helper, always-running service, network request or model/runtime process is started.

<a id="0252-p003"></a>

Before every retry, the host revalidates terminal reference-deletion evidence, the current complete owner graph, stable managed-root and physical-volume identities and the exact managed-byte/content identity. Cleanup proceeds only for byte objects that current authoritative evidence still proves have no installed, rollback, transaction, pending, kept or other declared owner. The attempt is item-atomic and cannot traverse outside managed package storage, follow an untrusted replacement, delete a user asset or widen to another storage class.

<a id="0252-p004"></a>

If a current owner appears, the target enters **Physical Reclaim Blocked By Owner** and no owned/shared bytes are removed; owner lifecycle rules determine whether a later retry can proceed. If owner evidence or byte/volume identity is incomplete, contradictory or unassessable, it enters **Physical Reclaim Not Assessable**. If the stable volume is unavailable, it enters **Physical Reclaim Waiting For Volume**. These states pause timer retries until relevant evidence or volume availability changes, while manual retry still performs the same complete checks.

<a id="0252-p005"></a>

A verified physical absence inside the exact managed object identity completes reclaim as already absent; a missing path or directory observation alone is not proof. Partial cleanup commits only the safely removed objects, reports actual reclaimed bytes and leaves remaining objects pending with their current typed reason. A busy file, permissions failure, transient I/O failure or interrupted unlink never recreates a reference, owner, recovery gate or destructive authorization.

<a id="0252-p006"></a>

At most one physical-reclaim attempt may be active host-wide for the exact target. Concurrent startup, mount, timer and manual triggers coalesce into that attempt rather than queueing duplicate unlinks. Different targets may run independently subject to ordinary bounded storage I/O governance; Physical Reclaim Pending does not acquire an ADR 0229 Storage Resolution Volume Slot.

<a id="0252-p007"></a>

Physical Reclaim Pending has no automatic abandonment or age-based expiry. It remains until all scoped bytes are authoritatively absent/reclaimed or current owners make them shared and therefore not presently reclaimable. Storage Management shows terminally deleted reference state separately from pending/shared physical bytes, the latest path-free reason, actual reclaimed bytes and Retry Physical Reclaim. It does not claim projected bytes as freed space, offer Undo or generate repeated OS notifications.

<a id="0252-p008"></a>

The pending record retains only opaque terminal-delete, target, managed-object and stable-volume identities, remaining/reclaimed byte counts, current owner-generation and latest typed reason/retry class needed to make cleanup idempotent. It contains no managed path, payload, user content, credentials, full failure timeline or attention history and is excluded from Full Library Backup, export/merge/sync, telemetry, publisher feedback and support logs. Each new attempt replaces the latest reason rather than appending long-lived retry history.

<a id="0252-p009"></a>

ADR 0253 defines active-app transient retries at 1 minute, 5 minutes, 30 minutes and then at most once every 6 hours. Startup, stable-volume remount and manual requests may trigger one immediate coalesced check; partial progress or authoritative state change resets the ladder, while blocked/not-assessable/offline states pause it without catch-up.

<a id="0252-p010"></a>

ADR 0254 makes completion an atomic scheduler transition only after every scoped managed object is authoritatively Removed Now or Already Absent. It clears pending/backoff/failure state and shows one actual-byte result for one usable viewing or 24 hours without deleting the separate terminal reference-deletion evidence.

<a id="0252-p011"></a>

ADR 0255 permits Completed As Shared when all still-present objects have other current authoritative owners and no unowned failed object remains. It clears this deleted target's scheduler without unlinking shared bytes; a later last-owner transition receives its own cleanup responsibility.

### 当时实施上下文（来源，非当前状态）

以下句子记录原文写作时的执行/交付范围，不否定当前实现，不授予新操作权限。

<a id="0252-p012"></a>

The current project has no Verified Managed Package Copy owner graph, terminal package-copy deletion journal or Physical Reclaim Pending scheduler/reconciler. This ADR changes documentation only: it schedules/retries/unlinks no real bytes, reads no runtime database/package/cache/model/asset/private state and changes no public IPC/schema/AI Worker API.

<a id="adr-0253"></a>

## 0253 · Physical Reclaim Retries At One Five Thirty Minutes Then Six-Hour Intervals

决定来源：[0253-physical-reclaim-retries-at-one-five-thirty-minutes-then-six-hour-intervals.md](../../adr/0253-physical-reclaim-retries-at-one-five-thirty-minutes-then-six-hour-intervals.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0253-p001"></a>

After ADR 0252's immediate physical-reclaim attempt ends with a retryable transient I/O, busy-file or permission outcome and scoped bytes remain, **Physical Reclaim Retry Backoff** schedules the next active-application attempts after 1 minute, then 5 minutes, then 30 minutes, and thereafter no more than once every 6 hours. Each interval starts from the host's durable terminal commit of the previous attempt, not from opening Storage Management or observing its result.

<a id="0253-p002"></a>

The host tracks the deadline with monotonic elapsed time plus a conservative wall-time ceiling. Sleep, clock/timezone changes, renderer stalls or application inactivity cannot create multiple catch-up attempts or shorten the interval. A deadline may elapse while the app is inactive, but at the next eligible active state the host runs at most one coalesced attempt and then computes the next step from that actual terminal outcome.

<a id="0253-p003"></a>

Application startup after required reconciliation, exact stable-volume remount and explicit Retry Physical Reclaim may request one immediate check without waiting for the current timer deadline. They still coalesce with an existing target attempt and do not queue a second run. A manual or lifecycle-triggered attempt by itself does not reset the backoff ladder; if it again ends with the same retryable no-progress class, the persisted current step advances normally up to the six-hour ceiling.

<a id="0253-p004"></a>

Any safely committed partial byte reclamation resets the remaining target to the 1-minute step because forward progress changed its physical scope. An authoritative owner-generation, managed-byte identity or stable-volume availability change also clears the old delay; after ADR 0252's complete revalidation finds the new state eligible, one immediate attempt may run and a later retryable failure starts again at 1 minute.

<a id="0253-p005"></a>

Physical Reclaim Blocked By Owner, Physical Reclaim Not Assessable and Physical Reclaim Waiting For Volume pause timer retry rather than advancing an interval. No elapsed paused time is accumulated for catch-up. When the relevant authoritative owner/evidence/volume change makes evaluation possible, the old schedule is discarded and current state is revalidated before one immediate attempt; it never resumes an unlink solely because the previous clock deadline passed.

<a id="0253-p006"></a>

Concurrent commit, startup, mount, timer and manual triggers for one target collapse into the same target lease and produce no queued follow-up. Distinct targets remain subject to ordinary bounded storage-I/O governance. The six-hour ceiling limits frequency, not record lifetime: pending cleanup still has no automatic abandonment date, hidden helper, network dependency or background execution after the application exits.

<a id="0253-p007"></a>

Backoff state retains only opaque target and stable-volume identities, current step class, last terminal monotonic/wall anchors, next deadline class and latest typed reason. It contains no path, payload, owner evidence, credentials, user content, attempt timeline or attention history and is excluded from Full Library Backup, export/merge/sync, telemetry, publisher feedback and support logs. A new terminal attempt replaces these fields rather than appending history.

<a id="0253-p008"></a>

ADR 0254 atomically clears this ladder and its latest reason once authoritative managed-object evidence completes physical reclaim. Its one-viewing-or-24-hour result cannot restart a cleared timer or reuse the target lease.

### 当时实施上下文（来源，非当前状态）

以下句子记录原文写作时的执行/交付范围，不否定当前实现，不授予新操作权限。

<a id="0253-p009"></a>

The current project has no Physical Reclaim Pending scheduler, lifecycle-trigger coalescing or persisted reclaim backoff. This ADR changes documentation only: it starts/times/retries/unlinks no real bytes, reads no runtime database/package/cache/model/asset/private state and changes no public IPC/schema/AI Worker API.

<a id="adr-0254"></a>

## 0254 · Physical Reclaim Completion Clears Pending State And Shows One Twenty-Four-Hour Result

决定来源：[0254-physical-reclaim-completion-clears-pending-state-and-shows-one-24-hour-result.md](../../adr/0254-physical-reclaim-completion-clears-pending-state-and-shows-one-24-hour-result.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0254-p001"></a>

When an ADR 0252 physical-reclaim attempt authoritatively proves that every exact managed-byte object in the target's remaining scope was safely removed by the current attempt or was already absent under its stable content/volume identity, the host commits **Physical Reclaim Completed**. A missing path, changed directory, unavailable volume or unassessable identity is not completion.

<a id="0254-p002"></a>

Completion atomically clears the target's Physical Reclaim Pending state, ADR 0253 backoff step/deadline, latest failure reason and active reclaim lease. No later startup, mount, timer or manual trigger may reuse the cleared pending identity or schedule another unlink for that target. The commit does not reopen or rewrite the terminal reference-deletion decision.

<a id="0254-p003"></a>

Storage Management receives one path-free **Physical Reclaim Completed Result**. It reports actual bytes removed by the completing episode and separately classifies objects verified as Removed Now, Already Absent or a mixture of both; Already Absent contributes zero newly reclaimed bytes. It never substitutes projected/logical size, claims shared bytes as freed or exposes managed paths.

<a id="0254-p004"></a>

ADR 0255 adds Completed As Shared when every still-present object has another authoritative owner and no unowned failed object remains. The same result separates actual reclaimed/already-absent bytes from shared bytes retained at zero newly freed storage.

<a id="0254-p005"></a>

The result expires at the earlier of one usable Storage Management viewing opportunity or 24 elapsed hours after completion. A viewing opportunity begins only when a usable renderer acknowledges projection; the card remains stable for that surface session and is removed after dismissal or leaving the surface. If never projected, the 24-hour hard cap removes it. No focus duration, eye tracking, click history or proof of reading is recorded.

<a id="0254-p006"></a>

ADR 0257 may project several same-generation, same-volume results in one Physical Reclaim Completion Summary. Summary acknowledgement applies to each result included in that rendered projection, but their individual completion times and hard deadlines remain unchanged.

<a id="0254-p007"></a>

For a summary larger than 50 targets, ADR 0258 makes the authoritative all-member header snapshot the acknowledged projection while loading path-free detail in 50-row lazy pages. A usable acknowledgement of that exact header snapshot closes every represented result's viewing opportunity without requiring page-by-page traversal; it does not acknowledge later or differently scoped results.

<a id="0254-p008"></a>

ADR 0259 keeps that summary collapsed by default and never auto-expands it for a particular outcome class. The complete collapsed header remains a usable result projection; optional disclosure, page and scroll state last only for the current Storage Management surface session and do not change result lifetime or acknowledgement.

<a id="0254-p009"></a>

The result is explanatory only. It creates no startup modal, OS notification, badge-driven urgency, Activity History entry, new cleanup authority, Undo, storage reservation or owner mutation. Dismissal or expiry does not recreate Physical Reclaim Pending or affect the already terminal package-copy deletion.

<a id="0254-p010"></a>

Physical-reclaim completion does not itself prune the minimal terminal deletion evidence used by package-owner/recovery reconciliation. It clears only the physical-reclaim scheduler and result dependencies. ADR 0256 prunes the terminal record only after this result closes, every other dependency closes and a later clean startup reconfirms target absence and owner consistency.

<a id="0254-p011"></a>

The completion/result record retains only opaque terminal-delete, target, managed-object and stable-volume identities, Removed Now/Already Absent class, actual reclaimed byte count, completion/expiry times and renderer-projection acknowledgement. It contains no paths, payload, user content, credentials, prior failure timeline or attention history and is excluded from Full Library Backup, export/merge/sync, telemetry, publisher feedback and support logs.

### 当时实施上下文（来源，非当前状态）

以下句子记录原文写作时的执行/交付范围，不否定当前实现，不授予新操作权限。

<a id="0254-p012"></a>

The current project has no Physical Reclaim Pending scheduler, authoritative managed-object completion transaction or 24-hour reclaim result. This ADR changes documentation only: it verifies/clears/reclaims no real bytes, reads no runtime database/package/cache/model/asset/private state and changes no public IPC/schema/AI Worker API.

<a id="adr-0255"></a>

## 0255 · Physical Reclaim Completes As Shared When Other Owners Retain All Remaining Bytes

决定来源：[0255-physical-reclaim-completes-as-shared-when-other-owners-retain-all-remaining-bytes.md](../../adr/0255-physical-reclaim-completes-as-shared-when-other-owners-retain-all-remaining-bytes.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0255-p001"></a>

When an ADR 0252 revalidation proves that the deleted target has no remaining reference and every byte object still physically present in its reclaim scope is held by at least one other current authoritative owner, the host may commit **Physical Reclaim Completed As Shared**. This is an owner-graph resolution of the deleted target's cleanup responsibility, not physical reclamation and not an age-based abandonment.

<a id="0255-p002"></a>

Completion As Shared is unavailable if any scoped object is unowned but not authoritatively removed/absent, if any owner category is incomplete or unassessable, or if target/volume/byte identity is unstable. Mixed progress may complete only when every object is either ADR 0254 Removed Now/Already Absent or explicitly retained by another valid owner. An owner-generation change before commit invalidates the projection and requires a fresh complete owner-graph evaluation.

<a id="0255-p003"></a>

The host atomically confirms the target reference remains terminally deleted and clears that target's Physical Reclaim Pending state, ADR 0253 backoff, latest failure reason and active reclaim lease. It does not unlink shared bytes, remove or weaken another owner, transfer the deleted target's authorization or recreate a target reference. No later target timer/startup/mount/manual trigger may retry those shared bytes under the deleted target identity.

<a id="0255-p004"></a>

ADR 0254's one path-free Physical Reclaim Completed Result gains a Completed As Shared outcome. It reports actual bytes already reclaimed/absent separately from **Shared Bytes Retained By Other Owners**, and the shared amount contributes zero newly freed storage. The result expires after one usable Storage Management viewing opportunity or 24 hours and creates no OS notification, Activity History entry, cleanup authority or Undo.

<a id="0255-p005"></a>

When ADR 0257 aggregates it, the per-volume summary keeps Shared Bytes Retained By Other Owners separate from actual reclaimed storage and retains this target's independent expiry/closure. ADR 0267 shows both raw values separately on the target row and requires their full-snapshot sums to match the header. Aggregation never transfers those shared bytes to the summary or another deleted target.

<a id="0255-p006"></a>

When a later governed owner transition removes the last remaining valid owner of those physical objects, that transition's own owner-safe cleanup or Physical Reclaim Pending state becomes responsible for the bytes. It never resurrects this deleted target, reopens its completed scheduler or borrows its old delete authorization. Generic orphan reconciliation may act only from current terminal owner evidence, not from this historical target scope.

<a id="0255-p007"></a>

Completion As Shared does not immediately remove the minimal terminal reference-deletion evidence retained for transaction/recovery reconciliation. ADR 0256 may later prune only this deleted target's evidence after result/dependency closure and a clean startup check; current owners and shared bytes remain. The completion record retains only opaque target, terminal-delete, current-owner/object and stable-volume identities, actually reclaimed/already-absent/shared byte counts, completion/expiry times and renderer-projection acknowledgement. It contains no paths, payload, owner evidence details, user content, credentials or attention history and is excluded from Full Library Backup, export/merge/sync, telemetry, publisher feedback and support logs.

### 当时实施上下文（来源，非当前状态）

以下句子记录原文写作时的执行/交付范围，不否定当前实现，不授予新操作权限。

<a id="0255-p008"></a>

The current project has no managed package-copy owner graph, Physical Reclaim Pending scheduler or Completed As Shared result. This ADR changes documentation only: it evaluates/transfers/clears/unlinks no real owner or bytes, reads no runtime database/package/cache/model/asset/private state and changes no public IPC/schema/AI Worker API.
