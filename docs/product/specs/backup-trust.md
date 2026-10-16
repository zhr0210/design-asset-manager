# 备份、模型信任与安装：详细能力契约

本文承接原ADR中的细节，保留所有原数字、例外、状态和相互约束；[来源映射](../../checkpoints/documentation-rebuild-20261015/adr-migration.json)逐段核对。**有效要求不是当前交付声明，也不是本轮实施队列。** 现行已批准产品/设计在其明确替代范围内优先；不凭实现缺失判决定无效。

当前系统从[model-library](../../subsystems/ai-system.md#models)进入；当前实际能力/版本见[CURRENT-STATE](../../handoff/CURRENT-STATE.md)，交互与视觉分别归[交互目录](../../design/README.md)/[DESIGN](../../../DESIGN.md)。详细条款按下面独立主题定位，不全量装入每次上下文。

## 主题导航

- [0204 · Trust Catalog Refresh Is Stale Driven Bounded And App Active](#adr-0204)
- [0205 · Prolonged Trust Refresh Failure Is Passive And Non Blocking](#adr-0205)
- [0207 · Offline Trust Evidence Has No Age Only Expiration](#adr-0207)
- [0208 · Time Bounded Offline Install Requires Trusted Current Time](#adr-0208)
- [0209 · Trusted Time Uses No Independent Network Service](#adr-0209)
- [0210 · Trusted Time Conflict Is Evaluated After UTC Normalization](#adr-0210)
- [0211 · One Acceptable Time Source Can Assess Time Bounded Offline Install](#adr-0211)
- [0212 · Stable Offline Packages Default To No Install Time Window](#adr-0212)
- [0213 · Time Bounded Offline Releases Require Explicit Human Approval](#adr-0213)
- [0214 · Expired Time Bounded Packages Leave Default Discovery But Remain Auditable](#adr-0214)
- [0215 · Not Yet Open Time Bounded Packages Stay Outside Managed Installation](#adr-0215)
- [0217 · External Package Inspection State Is Session Only And Path Free](#adr-0217)
- [0218 · External Package Inspection Shows Session Bound Identity Evidence](#adr-0218)
- [0219 · Full Package Digest View And Copy Are Explicit And Session Bound](#adr-0219)
- [0220 · Digest Mismatch Details Show Expected And Actual Without Enabling Install](#adr-0220)

<a id="adr-0204"></a>

## 0204 · Trust Catalog Refresh Is Stale Driven Bounded And App Active

决定来源：[0204-trust-catalog-refresh-is-stale-driven-bounded-and-app-active.md](../../adr/0204-trust-catalog-refresh-is-stale-driven-bounded-and-app-active.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0204-p001"></a>

Model and runtime trust catalogs are signed metadata services, not local asset folders, model stores or package repositories. Design Asset Manager uses one host-governed **Trust Catalog Refresh Policy** across Model Catalog Metadata Refresh, Signed Runtime Channel Index refresh and Post-Merge Trust Reconciliation. An automatic refresh is eligible only when the relevant trust root/channel has never been verified or its Last Verified Model/Runtime Trust State is older than 24 hours. Application launch does not refresh metadata that remains within that freshness window.

<a id="0204-p002"></a>

Eligible launch refresh waits until the application shell is usable and network evidence permits a bounded attempt, then applies randomized jitter so clients do not synchronize on an exact schedule. While the application remains active, each trust root/channel receives at most one automatic attempt per rolling 24-hour period. Explicit Quit does not leave a helper, launch agent, background service or wake task polling the catalog; reopening the application reevaluates eligibility from persisted path-free state.

<a id="0204-p003"></a>

When connectivity returns, the host performs one debounced refresh only if the state is stale, has never been assessed or has pending Post-Merge Trust Reconciliation. Rapid offline/online transitions and multiple libraries are coalesced by trust root/channel rather than causing retry storms or one request per asset, result or library. Failure retains the prior Last Verified Trust State and enters bounded backoff. Wall-clock rollback, large clock jumps, sleep/wake and timezone changes cannot mark unverified data fresh, bypass monotonic statement checks or create repeated attempts.

<a id="0204-p004"></a>

ADR 0208 Verified Time High-Water Mark may contribute authenticated time evidence to clock-anomaly defense, but a raw editable wall clock cannot advance freshness by itself. Trust-metadata freshness and an offline package's explicit installation-time validity remain separate decisions.

<a id="0204-p005"></a>

Model Library and AI Console always provide an explicit **Refresh Trust Metadata** action. A user-triggered request may bypass the 24-hour age gate, but it still obeys signature/schema/sequence verification, request deduplication, safe redirect/source policy, network-cost metadata limits and failure backoff. It joins an equivalent in-flight refresh instead of creating a concurrent request and grants no consent for a package, model, runtime, plugin or dependency download.

<a id="0204-p006"></a>

Each refresh is limited to signed path-free catalog/channel indexes, immutable manifest identity and digest metadata, Model/Runtime Trust Statements and other already-governed catalog evidence. It remains inside ADR 0177's strict per-refresh byte/rate budget. It never transfers model weights, executable/runtime archives, plugins, dependencies, benchmark datasets or repository snapshots; exceeding the metadata budget aborts the refresh rather than silently continuing as payload traffic. Requests, state and diagnostics contain no user assets, previews, result values, library contents, filenames, private paths, credentials or local network identifiers.

<a id="0204-p007"></a>

ADR 0209 permits the same response to contain narrowly scoped, signed and replay-resistant Catalog-Bound Authenticated Time Evidence. This adds no endpoint, refresh cadence or package authority; a static catalog/release/HTTP timestamp is not trusted current time, and absence of valid time evidence does not make the metadata refresh itself fail.

<a id="0204-p008"></a>

Refresh state is persisted per trust root/channel as last attempt, last successfully verified time, freshness classification, next automatic eligibility and a safe failure category. Transport success does not mark the state verified until signatures, monotonic sequences, schemas and digests pass. Refresh itself, unchanged freshness and recovery remain silent; only ADR 0199 New Material Trust Attention may create its separately governed aggregate notification. Offline use continues under ADRs 0165, 0192 and 0198: known revocations remain enforced, existing committed results remain unchanged and an installed non-revoked model/runtime is not disabled merely because metadata became stale.

<a id="0204-p009"></a>

ADR 0205 governs prolonged failure presentation. The first seven stale days retain only ordinary freshness state; a longer stale episode may show one passive in-app notice, never an operating-system notification or reason to disable an installed verified and not-known-revoked model/runtime. The notice does not change this ADR's automatic cadence or backoff.

<a id="0204-p010"></a>

ADR 0206 uses the same 24-hour freshness classification as an online model/runtime install gate. A stale or never-assessed state requires successful metadata refresh before a new online payload transaction may proceed, while an exactly verified official offline package uses separately displayed Dated Offline Trust Evidence and never downgrades newer persisted trust state.

### 当时实施上下文（来源，非当前状态）

以下句子记录原文写作时的执行/交付范围，不否定当前实现，不授予新操作权限。

<a id="0204-p011"></a>

The current project has no shared trust-refresh scheduler, per-root/channel freshness ledger, randomized jitter, connectivity debounce, request coalescing, clock-anomaly defense or metadata byte/rate enforcement. This ADR records target behavior only: it performs no network request or download, starts no background process/model/runtime, reads no assets/results/private state and changes no public IPC/schema/AI Worker API.

<a id="adr-0205"></a>

## 0205 · Prolonged Trust Refresh Failure Is Passive And Non Blocking

决定来源：[0205-prolonged-trust-refresh-failure-is-passive-and-non-blocking.md](../../adr/0205-prolonged-trust-refresh-failure-is-passive-and-non-blocking.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0205-p001"></a>

A failed Model/Runtime Trust Catalog refresh is connectivity or metadata-verification state, not evidence that an installed model/runtime became unsafe. For the first seven elapsed days after the relevant Last Verified Trust State becomes stale, Model Library and AI Console show only the ordinary Trust Metadata Freshness state, last verified time and a manual refresh action. They do not create a banner, modal, toast loop, navigation badge or operating-system notification merely because refresh attempts fail.

<a id="0205-p002"></a>

After more than seven elapsed days without a newly verified state, the application creates one **Prolonged Trust Refresh Notice** for that stale episode. It appears as a passive in-app banner in Model Library and AI Console with a path-free failure category, last verified time, offline/privacy explanation and **Refresh Trust Metadata** action. The two surfaces project the same notice identity rather than counting as separate alerts. It does not interrupt the Asset Workspace, open either surface automatically or repeat on every launch, failed attempt, network transition, library open or clock tick.

<a id="0205-p003"></a>

The notice may be dismissed for the current stale episode; the ordinary freshness indicator remains available. It becomes eligible once again only after a successfully verified catalog state ends that episode and a later independent state remains stale for another seven days. A materially different signed execution revocation or model advisory is not refresh-failure repetition and follows ADR 0199 independently. Successful recovery clears the banner silently and sends no success notification.

<a id="0205-p004"></a>

Refresh failure, age or notice visibility never blocks loading or future local analysis with an already installed, verified and not-known-revoked model/runtime. It does not clear or weaken a previously accepted revocation/suspension, authorize an unknown artifact, label stale state current, replace a capability, download remediation or change committed tags, OCR, descriptions, palettes, embeddings, indexes or their provenance. Existing safety enforcement continues from Last Verified Model/Runtime Trust State under ADRs 0165 and 0192.

<a id="0205-p005"></a>

No Prolonged Trust Refresh Notice is eligible for an operating-system notification, regardless of duration, retry count, library size or number of affected identities. It is not New Material Trust Attention because no new signed trust statement was accepted. ADRs 0201 through 0203 notification preferences, permission and priority therefore do not apply to this notice. Diagnostics retain only path-free stale-episode identity, duration class and safe failure category, without URLs, credentials, library/model names, asset/result content or private paths.

<a id="0205-p006"></a>

Elapsed-age calculation uses the monotonic-safe persisted freshness rules from ADR 0204. Clock rollback, timezone change, suspend/resume or a large forward jump cannot manufacture repeated seven-day notices or mark a failed response verified. Automatic attempts retain ADR 0204 cadence, coalescing and backoff; the banner does not increase polling frequency.

### 当时实施上下文（来源，非当前状态）

以下句子记录原文写作时的执行/交付范围，不否定当前实现，不授予新操作权限。

<a id="0205-p007"></a>

The current project has no per-root/channel stale-episode projection, seven-day passive-notice threshold, cross-surface notice identity, per-episode dismissal or verified-recovery clearing. This ADR records target behavior only: it performs no refresh or network request, sends no notification, loads/blocks no model/runtime, reads no assets/results/private state and changes no public IPC/schema/AI Worker API.

<a id="adr-0207"></a>

## 0207 · Offline Trust Evidence Has No Age Only Expiration

决定来源：[0207-offline-trust-evidence-has-no-age-only-expiration.md](../../adr/0207-offline-trust-evidence-has-no-age-only-expiration.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0207-p001"></a>

Official Dated Offline Trust Evidence has no application-invented age-only expiration such as 90, 180 or 365 days. Evidence age is always displayed, but elapsed time alone does not turn an otherwise exactly verified Official Offline Model/Runtime Package or ADR 0188 Offline Full Installer into an invalid package. This preserves intentional long-term and air-gapped deployment without pretending that old evidence is the latest online state.

<a id="0207-p002"></a>

ADR 0212 therefore requires Official Stable Offline packages to omit current-time install windows by default. A signed time window is allowed only for an explicitly exceptional release class with complete justification/disclosure and never as an indirect age cutoff, update pressure or connectivity requirement.

<a id="0207-p003"></a>

New offline installation is blocked only by a typed **Offline Evidence Validity Decision**: invalid/unknown signature or trust chain; missing/invalid trusted signing-time evidence where required by the signing scheme; manifest, digest, size or package binding mismatch; an explicit signed `notBefore`/`validUntil` boundary that is not satisfied; incompatible application/catalog schema, platform, architecture, ABI/API or dependency closure; a trust root/signing delegation known to be revoked for the relevant signing scope; or an applicable known model/runtime security revocation or suspension. Archive safety, license and ordinary install-plan blockers remain separately enforced.

<a id="0207-p004"></a>

An explicit validity period is authoritative only when it is inside the signed evidence and bound to the exact package/manifest. A filename date, release-page wording, mirror timestamp, filesystem creation/modification time, download time, archive metadata or unsigned README cannot create, extend or remove validity. The UI distinguishes **Evidence Age** from **Evidence Validity** so “old” never reads as “signature failed,” and shows issue date, any signed validity boundary, freshness, compatibility result and path-free blocking reason before confirmation.

<a id="0207-p005"></a>

ADR 0208 requires Trusted Current Time Assessment only when such a signed current-time installation boundary exists. Clock rollback cannot revive a package, and Time Not Assessable blocks that new installation without an in-app override. An otherwise valid official package with no current-time install boundary remains unaffected by inability to assess current time, while still requiring its signing-time and all other verification.

<a id="0207-p006"></a>

Signing-key or certificate expiration after a valid, trusted signing time does not retroactively create an age cap for a package that was correctly signed while the delegation was valid. This does not protect a key/root that is explicitly revoked for that signing time/scope, a signature without required trustworthy timestamp evidence or a package whose signed policy says otherwise. Key rotation, repository migration or availability of a newer bundle likewise does not invalidate an older bundle by implication.

<a id="0207-p007"></a>

Offline evidence is still monotonic against device state. An old package cannot roll back a newer accepted statement, clear a revocation/suspension, revive a blocked digest or replace newer trust-root policy. Trust-root revocation is enforced only from authentic application-embedded or previously verified signed state; the application does not invent revocation because it cannot connect. A later online refresh may accept newer monotonic evidence, but does not silently reinstall, activate, delete or replace an already installed package.

<a id="0207-p008"></a>

Validity boundaries govern new staging/promotion, not committed results and not existing execution by implication. Expiration of package-install evidence after a successful installation does not delete the package, alter tags/OCR/descriptions/embeddings or automatically stop a verified installed model/runtime. Stopping future execution requires a separately applicable ADR 0165/0192 trust statement, explicit continuous-entitlement contract or another already-governed execution rule. Existing non-revoked installations therefore remain usable offline.

### 当时实施上下文（来源，非当前状态）

以下句子记录原文写作时的执行/交付范围，不否定当前实现，不授予新操作权限。

<a id="0207-p009"></a>

The current project has no Dated Offline Trust Evidence schema, trusted signing-time verifier, Offline Evidence Validity Decision, signed validity-boundary handling, evidence age/validity UI separation or monotonic root-revocation merger. This ADR records target behavior only: it reads/verifies/installs no package, accesses no model/runtime/cache/asset/result/private state, performs no network request and changes no public IPC/schema/AI Worker API.

<a id="adr-0208"></a>

## 0208 · Time Bounded Offline Install Requires Trusted Current Time

决定来源：[0208-time-bounded-offline-install-requires-trusted-current-time.md](../../adr/0208-time-bounded-offline-install-requires-trusted-current-time.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0208-p001"></a>

An Official Offline Package with a signed `notBefore` or `validUntil` install boundary requires a host-owned **Trusted Current Time Assessment** before new staging/promotion. The assessment is either Assessable with path-free source/freshness evidence or **Time Not Assessable**. It is distinct from trusted signing-time evidence: signing time proves whether the signer/delegation was valid when the package was signed, while current time proves whether installation is allowed now.

<a id="0208-p002"></a>

Under ADR 0212 this path is exceptional: Official Stable Offline packages have no current-time installation boundary. Only a correctly classified and fully disclosed test/preview, legal/license-window or security-incident transition package enters the time-assessment workflow.

<a id="0208-p003"></a>

Assessable current time comes from a platform secure/synchronized-time capability or an authenticated signed time source already admitted by the application. The host persists a tamper-resistant **Verified Time High-Water Mark** from accepted evidence and evaluates effective current time no earlier than that mark. A user-editable wall clock, timezone, locale, file timestamp, package timestamp, boot duration or unsigned HTTP `Date` value cannot establish trust or advance the mark by itself. Raw forward jumps are treated as anomalies rather than permanently poisoning the high-water state.

<a id="0208-p004"></a>

ADR 0209 forbids an independent application time service. Network-derived time may come only from replay-resistant Catalog-Bound Authenticated Time Evidence returned inside an already eligible signed Trust Catalog Metadata Refresh; otherwise the host relies on honest platform capability evidence or reports Time Not Assessable.

<a id="0208-p005"></a>

Clock rollback cannot make an expired package valid, move time before a signed `notBefore`, revive a revoked signing delegation, shorten a stale period or lower the high-water mark. Suspend/resume, reboot, reinstall, daylight-saving and timezone changes preserve UTC boundary semantics. Signed schema defines exact boundary inclusivity; the UI renders localized dates for readability without changing the UTC decision.

<a id="0208-p006"></a>

ADR 0210 normalizes all acceptable sources to UTC absolute instants before comparison. Timezone-equivalent values are identical, a difference up to five minutes is tolerated with conservative boundary evaluation, and a larger normalized difference becomes Trusted Time Conflict rather than an automatic source choice.

<a id="0208-p007"></a>

ADR 0211 permits one independently acceptable platform or catalog source to complete a Single-Source Trusted Time Assessment. Corroboration is rechecked when a second source becomes available before promotion, but never becomes a mandatory network dependency for offline installation.

<a id="0208-p008"></a>

If no trustworthy current-time assessment can prove the signed installation window is satisfied, Offline Evidence Validity Decision blocks execution as **Time Not Assessable**. The application may still inspect and display the bounded package plan, evidence dates and recovery guidance, but it does not copy, stage, promote, activate or partially install package bytes. There is no Continue Anyway, Developer Mode exception, manually entered in-app date or unsigned administrator override.

<a id="0208-p009"></a>

ADR 0215 names the pre-`notBefore` result Install Window Not Started. The host may verify an explicitly selected external file read-only, but cannot copy/extract it into managed storage, schedule activation or reuse the earlier inspection as installation authority when the window later opens.

<a id="0208-p010"></a>

Recovery remains explicit and safe: correct or synchronize time through supported operating-system controls, connect for an authenticated signed metadata/time refresh, update the signed application when it carries newer time/trust policy, or select another official package whose evidence has no current-time install boundary. The application does not silently enable network access, change system time or substitute a package. Once trustworthy time becomes available, the same reviewed package is re-evaluated from signatures and manifests rather than assumed valid from a prior failure.

<a id="0208-p011"></a>

ADR 0207 packages without a signed current-time installation boundary do not require Trusted Current Time Assessment merely because they are old. They still require exact signature/trust-chain, signing-time, digest, compatibility and known-revocation checks. A time-assessment failure never disables or removes an already installed non-revoked package, changes committed results or weakens accepted revocations; it governs only new time-bounded offline installation/promotion.

<a id="0208-p012"></a>

Only path-free assessment class, source class, freshness, high-water relationship, signed boundary and typed failure enter UI/diagnostics. No raw clock-service response, device/network identifier, local path, credential, package content, asset or result is exposed. The current project has no trusted-time adapter, authenticated time-source contract, high-water ledger, anomaly handling or Time Not Assessable install gate. This ADR records target behavior only: it reads/changes no device clock, contacts no time/catalog service, inspects/installs no package, accesses no model/runtime/asset/result/private state and changes no public IPC/schema/AI Worker API.

<a id="adr-0209"></a>

## 0209 · Trusted Time Uses No Independent Network Service

决定来源：[0209-trusted-time-uses-no-independent-network-service.md](../../adr/0209-trusted-time-uses-no-independent-network-service.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0209-p001"></a>

Design Asset Manager does not contact an application-owned or third-party standalone NTP, SNTP, DNS-time, HTTP-time or equivalent endpoint for Trusted Current Time Assessment. It does not add a hidden time-check schedule, wake the application, configure operating-system time synchronization or change the device clock. Platform time synchronization remains owned by macOS/Windows and the user/administrator; the application consumes only a bounded path-free platform trust assessment when the operating system can provide one.

<a id="0209-p002"></a>

When network evidence is useful, the only application transport is an already eligible ADR 0204 signed model/runtime Trust Catalog Metadata Refresh. That same response may carry **Catalog-Bound Authenticated Time Evidence** under a narrowly scoped official time-signing delegation. The evidence binds trust root/channel, catalog sequence/digest, response freshness, UTC time and a short signed validity envelope; where the transport supports a response-specific challenge it also binds a non-identifying request nonce. The delegated key can attest time/freshness only and cannot sign packages, manifests, trust decisions, application updates or publisher identity.

<a id="0209-p003"></a>

A static catalog `issuedAt`, release/tag timestamp, GitHub API field, CDN/mirror timestamp, TLS certificate time, HTTP `Date` header or cache age is not current-time evidence. A replayed, expired, wrong-channel, unknown-key, invalid-signature or sequence-regressing envelope is rejected and cannot advance Verified Time High-Water Mark. A mirror may transport byte-identical signed evidence but cannot manufacture or rewrite time. Absence of an acceptable envelope leaves the OS assessment or ADR 0208 Time Not Assessable outcome; it never falls back to another public time provider.

<a id="0209-p004"></a>

Obtaining catalog-bound time does not broaden refresh cadence or consent. An automatic request follows ADR 0204's stale-driven app-active policy. A user reviewing a time-bounded offline package may explicitly invoke the existing Refresh Trust Metadata action, which still transfers signed metadata only, respects ADR 0177 byte/rate/network-cost limits and starts no model/runtime/package download. Successful time evidence may update the high-water mark and re-evaluate the waiting plan, but does not approve, stage, install or activate it.

<a id="0209-p005"></a>

Public official trust/time metadata requires no model-source account or GitHub credential. The request contains only protocol/schema/channel data, a random single-use freshness challenge when required and the minimum compatibility evidence needed for the catalog response. It carries no stable device/install/library identifier, hardware fingerprint, selected package/model identity, asset/preview/result data, filename/path, query/history, credential or analytics payload. The network endpoint necessarily observes ordinary connection metadata such as source network address; product privacy text does not falsely claim otherwise, and application diagnostics do not retain it.

<a id="0209-p006"></a>

macOS and Windows expose the same shared path-free Trusted Current Time Assessment shape while platform adapters own real capability differences. Unsupported or unassessable platform time is reported honestly rather than simulated from the editable wall clock. Catalog-bound evidence and its persisted high-water state are application-local operational security state, not library content, and therefore are not exported through Full Library Backup or synchronized between libraries/devices.

<a id="0209-p007"></a>

ADR 0210 compares platform and catalog evidence only after UTC normalization. Local timezone/display differences have no trust meaning; more than five minutes of remaining normalized skew becomes Trusted Time Conflict and cannot be resolved by silently preferring either source.

<a id="0209-p008"></a>

ADR 0211 allows either independently acceptable OS capability evidence or Catalog-Bound Authenticated Time Evidence to assess a time-bounded install alone. The application does not contact the catalog solely to obtain a second corroborating source when valid platform evidence already suffices.

### 当时实施上下文（来源，非当前状态）

以下句子记录原文写作时的执行/交付范围，不否定当前实现，不授予新操作权限。

<a id="0209-p009"></a>

The current project has no Trusted Current Time adapter, time-only signing delegation/envelope, response challenge, replay protection or high-water ledger. This ADR records target behavior only: it contacts no OS/catalog/time service, reads/changes no clock/network/device/private state, refreshes/downloads/installs nothing, accesses no model/runtime/asset/result data and changes no public IPC/schema/AI Worker API.

<a id="adr-0210"></a>

## 0210 · Trusted Time Conflict Is Evaluated After UTC Normalization

决定来源：[0210-trusted-time-conflict-is-evaluated-after-utc-normalization.md](../../adr/0210-trusted-time-conflict-is-evaluated-after-utc-normalization.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0210-p001"></a>

Every Trusted Current Time source is converted to one UTC absolute instant before comparison. The platform adapter supplies an epoch/UTC instant rather than a localized display string; Catalog-Bound Authenticated Time Evidence uses signed UTC schema values. Timezone, locale and daylight-saving rules are presentation inputs only. Beijing `20:00 +08:00`, London `12:00 +00:00` and Los Angeles `05:00 -07:00` represent the same instant and therefore create no conflict when each resolves to `12:00Z`.

<a id="0210-p002"></a>

After UTC normalization, two independently acceptable current-time sources are considered corroborated when their evidence intervals differ by no more than a fixed **Trusted Time Skew Tolerance** of five minutes. The interval accounts for declared source uncertainty and bounded catalog request/response duration rather than comparing rounded UI labels. The tolerance is a security protocol constant, not a user preference, localization setting or package-supplied value.

<a id="0210-p003"></a>

When normalized acceptable sources differ by more than five minutes, the assessment becomes **Trusted Time Conflict**. The application does not automatically prefer the later value, earlier value, operating-system value or catalog value, and disputed new evidence cannot advance or lower Verified Time High-Water Mark. Previously accepted monotonic high-water evidence is preserved. A missing source is not itself a conflict and remains governed by the ordinary ADR 0208 assessability rules.

<a id="0210-p004"></a>

Under ADR 0211, one independently acceptable source may produce Single-Source Trusted Time Assessment. If another acceptable source appears before promotion it becomes a required corroboration recheck, but the application never manufactures a conflict from source absence alone.

<a id="0210-p005"></a>

Within tolerance, package-window evaluation remains conservative. The earliest credible instant must satisfy signed `notBefore`, and the latest credible instant must remain before signed `validUntil` according to schema boundary semantics. If the small corroborated interval crosses a package boundary, the install is blocked as **Validity Boundary Not Proven**, not mislabeled as a source conflict. This prevents a five-minute tolerance from becoming five minutes of extra package validity.

<a id="0210-p006"></a>

Trusted Time Conflict and Validity Boundary Not Proven block only new staging/promotion of an official offline package whose signed installation window requires current time. They do not affect packages without such a window, existing installed non-revoked models/runtimes, trust-catalog browsing/refresh, package inspection, original assets, previews, committed analysis results or ordinary application use. Neither state sends an operating-system notification or changes the device clock.

<a id="0210-p007"></a>

Recovery presents one passive path: synchronize/correct time in supported OS settings and retry the existing signed Trust Catalog Metadata Refresh. A new pair of acceptable UTC-normalized sources is evaluated again; timezone conversion is automatic and never a user conflict-resolution choice. The application provides no manual choose-source, enter-time, widen-tolerance or Continue Anyway control.

<a id="0210-p008"></a>

Shared status exposes only UTC-normalized difference class, tolerance result, source classes, evidence freshness and typed recovery state. UI may render local dates with explicit timezone for explanation, but diagnostics do not expose raw service responses, device/network identity, credentials or private content. The current project has no UTC trusted-time normalization contract, skew/uncertainty evaluator, Trusted Time Conflict or Validity Boundary Not Proven state. This ADR records target behavior only: it reads/changes no clock, contacts no OS/catalog service, installs no package, accesses no model/runtime/asset/result/private state and changes no public IPC/schema/AI Worker API.

<a id="adr-0211"></a>

## 0211 · One Acceptable Time Source Can Assess Time Bounded Offline Install

决定来源：[0211-one-acceptable-time-source-can-assess-time-bounded-offline-install.md](../../adr/0211-one-acceptable-time-source-can-assess-time-bounded-offline-install.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0211-p001"></a>

Trusted Current Time Assessment does not require both platform and catalog sources. One independently acceptable source is sufficient for a **Single-Source Trusted Time Assessment** so a genuinely offline device can evaluate a signed time-bounded Official Offline Package. A second source provides corroboration when available but is not an online prerequisite or a reason to reject an otherwise assessable offline plan.

<a id="0211-p002"></a>

A platform source is independently acceptable only when its macOS/Windows adapter reports a supported secure/synchronized-time capability, UTC instant/uncertainty and freshness evidence under the shared contract; an editable wall-clock value alone never qualifies. A catalog source is independently acceptable only when ADR 0209 signature, time-only delegation, response/channel binding, nonce/freshness, sequence and replay checks pass. Source absence, unsupported capability or network unavailability is not silently converted into positive evidence.

<a id="0211-p003"></a>

The accepted source is normalized to UTC and must not precede Verified Time High-Water Mark. Its complete uncertainty interval must fit inside the package's signed `notBefore`/`validUntil` window under ADR 0210 conservative boundary rules. An older-than-high-water, excessively uncertain, stale, signature-invalid or boundary-crossing source produces the corresponding Time Not Assessable, rollback/anomaly or Validity Boundary Not Proven state rather than Single-Source acceptance.

<a id="0211-p004"></a>

One acceptable source may advance Verified Time High-Water Mark through the same tamper-resistant monotonic commit as corroborated evidence. The record retains only source class, evidence identity/freshness, normalized interval and decision class. It does not downgrade the high-water mark when that source later disappears, becomes unsupported or reports an earlier time; reinstall, library restore or opening another library likewise cannot reset it.

<a id="0211-p005"></a>

If a second independently acceptable source becomes available before package promotion, the host re-evaluates them under ADR 0210. Agreement within five minutes becomes corroborated assessment; more skew becomes Trusted Time Conflict and pauses that still-uncommitted time-bounded install. After successful installation, later source appearance/conflict does not retroactively uninstall, deactivate or delete the package; future execution changes require separate applicable trust/revocation evidence.

<a id="0211-p006"></a>

Single-source status is visible in the package review as source class and assessment freshness, but it is not an alarming banner, operating-system notification or degraded-trust label. The app does not encourage network access merely to obtain a second source, and it provides no preference requiring/forbidding corroboration, source picker, manual time entry or Continue Anyway. Packages without a signed current-time window remain outside this assessment entirely.

### 当时实施上下文（来源，非当前状态）

以下句子记录原文写作时的执行/交付范围，不否定当前实现，不授予新操作权限。

<a id="0211-p007"></a>

The current project has no independently acceptable platform/catalog time-source validators, Single-Source Trusted Time Assessment, monotonic single-source high-water commit or pre-promotion corroboration recheck. This ADR records target behavior only: it reads/changes no clock, contacts no OS/catalog service, inspects/installs no package, accesses no model/runtime/asset/result/private state and changes no public IPC/schema/AI Worker API.

<a id="adr-0212"></a>

## 0212 · Stable Offline Packages Default To No Install Time Window

决定来源：[0212-stable-offline-packages-default-to-no-install-time-window.md](../../adr/0212-stable-offline-packages-default-to-no-install-time-window.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0212-p001"></a>

Official stable-channel Offline Model Packages, Offline Runtime Packages and ADR 0188 Offline Full Installers omit signed `notBefore`/`validUntil` current-time installation boundaries by default. Their Dated Offline Trust Evidence still records issue/signing time and all compatibility/revocation metadata, but stable release age alone never creates a Trusted Current Time dependency. This makes long-term and air-gapped installation an explicit product guarantee rather than an accidental property.

<a id="0212-p002"></a>

A **Time-Bounded Official Offline Package** is an exceptional release class, permitted only for a declared pre-release/test/limited preview, an externally imposed legal or license authorization window, or a narrowly scoped security-incident transition package whose use outside the window would be unsafe or unauthorized. Generic maintenance, availability of an update, publisher preference, telemetry collection, account engagement, forcing connectivity, reducing support cost, commercial lock-in or ordinary end-of-support cannot justify a time boundary.

<a id="0212-p003"></a>

Every exception carries a signed **Offline Package Time-Bound Justification** bound to the exact package/manifest. It includes a stable reason class, `notBefore`/`validUntil`, plain-language purpose, affected package/capability scope, expected behavior before/after the window, support/recovery route and any stable replacement identity when known. Missing/unknown reason, absent recovery guidance, a time field added outside the signed manifest or a stable-channel classification with any current-time install boundary blocks official release/promotion.

<a id="0212-p004"></a>

The official download/release surface displays the exceptional class, reason and complete localized window before transfer. Model Library, AI Environment Setup and offline import review repeat the signed reason, UTC/localized boundaries, Evidence Age, Trusted Current Time requirement and exact consequence before confirmation. The information is not buried in release notes, license prose or a generic warning. Mirrors reproduce the same signed metadata and cannot remove or rewrite the disclosure.

<a id="0212-p005"></a>

ADR 0215 allows an approved exceptional package to be acquired externally before `notBefore`, while keeping it out of default in-app install discovery and all managed storage/staging/activation. Upcoming/Preview presentation never becomes early installation consent.

<a id="0212-p006"></a>

Time boundaries govern only new staging/promotion under ADRs 0208 through 0211. Window expiration after successful installation does not automatically stop execution, uninstall a package, delete caches or alter committed results; an explicit continuous-entitlement contract or separate ADR 0165/0192 revocation/suspension is required for future-execution consequences. A preview/legal/security package may declare such a separately reviewed rule, but cannot smuggle it through the install-window fields.

<a id="0212-p007"></a>

ADR 0214 moves an expired exception out of default install discovery while retaining its searchable immutable history and installed-instance provenance. Expiration supplies no automatic removal, activation, migration or reanalysis authority, and any extended window is a new candidate rather than an edit to published evidence.

<a id="0212-p008"></a>

Release Flow rejects an Official Stable Offline artifact containing a current-time install boundary and rejects any exceptional artifact whose signed reason/window/disclosure/recovery evidence is incomplete. Build scripts, catalog mirrors and package publishers cannot silently change release class or insert a boundary after approval. Public forks and third-party catalogs may define their own visibly named policies under their own trust roots, but cannot label a time-bounded artifact as this project's Official Stable Offline package.

<a id="0212-p009"></a>

ADR 0213 additionally requires a distinct authorized human maintainer to approve the exact immutable time-bounded candidate after its complete reason/window/scope/disclosure/recovery evidence exists. Package authors and automation cannot self-approve, and any bound candidate change invalidates the approval before official publication.

### 当时实施上下文（来源，非当前状态）

以下句子记录原文写作时的执行/交付范围，不否定当前实现，不授予新操作权限。

<a id="0212-p010"></a>

The current project has no stable-vs-time-bounded offline package classification, signed justification schema, release gate, download/install disclosure contract or reason/recovery validation. This ADR records target behavior only: it builds/publishes/downloads/installs nothing, reads no package/model/runtime/asset/result/private state, performs no network/time check and changes no public IPC/schema/AI Worker API.

<a id="adr-0213"></a>

## 0213 · Time Bounded Offline Releases Require Explicit Human Approval

决定来源：[0213-time-bounded-offline-releases-require-explicit-human-approval.md](../../adr/0213-time-bounded-offline-releases-require-explicit-human-approval.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0213-p001"></a>

Every Time-Bounded Official Offline Package requires a separate **Time-Bounded Offline Release Approval** before Release Flow may reach `publish_ready`. The approval is an authenticated human decision by an authorized official release maintainer, not a schema-valid manifest, package signature, CI success, automated policy result or ordinary publish button. It supplements rather than replaces package/catalog signing, platform trust gates and the existing separate Release Publish Approval.

<a id="0213-p002"></a>

The package proposer/author cannot approve their own time-bound exception. Proposal and approval identities must be distinct human identities in the official release authority registry. Bots, service accounts, build jobs, signing keys, catalog mirrors and package publishers may assemble/validate evidence but cannot satisfy the approver role. A project without an eligible second authorized maintainer waits or releases a normal non-time-bounded stable package; urgency, preview deadlines or security-incident labeling do not create an automated/self-approval bypass.

<a id="0213-p003"></a>

Approval binds the exact release class, reason category, UTC `notBefore`/`validUntil`, affected capability/package identities, complete manifest and payload digests, platform/architecture targets, signed Offline Package Time-Bound Justification, user-facing disclosure and recovery/replacement route. One approval may cover multiple artifacts only when every exact target/digest is enumerated. Rebuild, repack, re-sign with changed bytes/evidence, window/scope/reason/recovery change or added target invalidates the approval and requires a new human review.

<a id="0213-p004"></a>

Release Flow first creates a **Time-Bounded Offline Release Request** for a complete immutable candidate. CI verifies structure, allowed ADR 0212 reason class, stable-channel prohibition, digest binding, disclosure completeness and proposer/approver separation. The authorized maintainer then explicitly approves or rejects that exact request. Missing, stale, mismatched, revoked or self-approved evidence keeps the target blocked and prevents official publish/upload/mirror promotion; CI reports typed path-free causes rather than silently deleting the candidate.

<a id="0213-p005"></a>

Approval is single-candidate authority, not a reusable waiver for a model family, publisher, version range, channel, future incident or arbitrary window extension. It may be withdrawn before publication, which blocks promotion without rewriting the candidate. After publication, the immutable approval decision identity remains release provenance; correcting or superseding the package uses a new candidate/approval and never mutates published bytes or history.

<a id="0213-p006"></a>

ADR 0214 requires any post-expiration extension/reopening to use that new-candidate/new-approval path. The original request, approval and Install Window Ended history remain immutable even when the successor references identical content digests.

<a id="0213-p007"></a>

Public release evidence exposes package/release class, reason category, window, affected scope, recovery route, approval status/time and opaque proposer/approver identities sufficient to audit separation. It does not expose private legal advice, vulnerability details, credentials, signing keys, personal contact information or internal discussion. Download/install surfaces consume the already signed public projection and cannot infer approval from repository ownership or package signature alone.

<a id="0213-p008"></a>

Forks and third-party catalogs may operate their own authorization registries and approval workflows under their own trust roots, but cannot reuse this project's official approval identity or label self-approved time-bounded artifacts as Official. The current project has no time-bounded release request/approval schema, distinct-role registry check, exact-candidate approval binding, invalidation/revocation logic or CI/Release Flow gate. This ADR records target behavior only: it dispatches/approves/signs/publishes nothing, changes no GitHub/release settings, reads no credentials/private evidence/package data and changes no public IPC/schema/AI Worker API.

<a id="adr-0214"></a>

## 0214 · Expired Time Bounded Packages Leave Default Discovery But Remain Auditable

决定来源：[0214-expired-time-bounded-packages-leave-default-discovery-but-remain-auditable.md](../../adr/0214-expired-time-bounded-packages-leave-default-discovery-but-remain-auditable.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0214-p001"></a>

When a Time-Bounded Official Offline Package passes its signed `validUntil`, it enters **Install Window Ended**. Official Model/Runtime Catalog default install, update, recommendation and ordinary browse results exclude it so users are not led toward an ineligible new installation. Install Window Ended is an expected package-lifecycle state, not Critical Revocation, Analysis Suspension, Catalog Delisting, signature failure or proof that installed code/results became unsafe.

<a id="0214-p002"></a>

ADR 0215 defines the symmetric pre-window Install Window Not Started state and explicit Upcoming/Preview projection. Neither pre-window nor ended packages appear in default install discovery, and neither lifecycle state can be bypassed through possession of external bytes.

<a id="0214-p003"></a>

The package remains available through an explicit Historical/Expired Packages search or filter. Its immutable history retains release identity/class, manifest/digests, signed Offline Package Time-Bound Justification, UTC/localized window, Time-Bounded Offline Release Approval identity, affected scope, end-state reason and stable replacement/recovery route when known. If no replacement exists the catalog says so rather than inventing one. Historical discoverability does not restore an Install action or claim that payload bytes remain downloadable forever.

<a id="0214-p004"></a>

Direct release URLs, cached catalogs, mirrors, previously downloaded package files and offline copies cannot bypass the ended window. Inspection and signature/provenance display remain available, but a new import/staging/promotion is blocked by the same ADR 0208–0211 trusted-time decision. A mirror may retain immutable bytes according to release-retention policy, yet transport availability has no installation authority.

<a id="0214-p005"></a>

Already installed instances remain visible in Model Library, AI Console/Runtime Registry and Storage Management with exact producing/acquisition provenance plus a contextual **Installed — Install Window Ended** marker and replacement/recovery action. They are not hidden, de-ranked, uninstalled, deactivated, deleted or migrated automatically. Future local execution continues unless a separate applicable entitlement, ADR 0165 Model Trust Statement or ADR 0192 Runtime Trust Statement changes it; committed tags, OCR, descriptions, palettes, embeddings and indexes remain untouched.

<a id="0214-p006"></a>

Window end itself produces no operating-system notification, modal, repeated toast or global grid/search badge. It may update the installed package's contextual detail and historical catalog count silently. If a stable replacement is available, installation/selection remains a separately reviewed user action; no automatic download, activation, result migration or reanalysis follows from expiration.

<a id="0214-p007"></a>

Extending/reopening a window requires a new immutable manifest/evidence identity and a new ADR 0213 exact-candidate approval. Published `validUntil` and historical state are never edited in place. A new candidate may reference/reuse identical content digests through ordinary deduplication, but cannot resurrect the old release identity or erase that its original window ended.

<a id="0214-p008"></a>

Full Library Backup dependency inventory preserves the exact historical installed package identity and lifecycle provenance without embedding package payload by implication. Restore may show the ended dependency and its replacement route, but never reinstalls it through the expired window or treats historical availability as current eligibility. Existing backed-up committed results retain their provenance even when no replacement is available.

### 当时实施上下文（来源，非当前状态）

以下句子记录原文写作时的执行/交付范围，不否定当前实现，不授予新操作权限。

<a id="0214-p009"></a>

The current project has no Install Window Ended lifecycle state, default-vs-historical catalog projection, expired direct-import gate, installed contextual marker, replacement route or immutable extension-candidate workflow. This ADR records target behavior only: it expires/hides/downloads/installs/deletes nothing, reads no catalog/package/model/runtime/backup/asset/result/private data, performs no time/network check and changes no public IPC/schema/AI Worker API.

<a id="adr-0215"></a>

## 0215 · Not Yet Open Time Bounded Packages Stay Outside Managed Installation

决定来源：[0215-not-yet-open-time-bounded-packages-stay-outside-managed-installation.md](../../adr/0215-not-yet-open-time-bounded-packages-stay-outside-managed-installation.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0215-p001"></a>

Before a Time-Bounded Official Offline Package reaches its signed `notBefore`, it is **Install Window Not Started**. Official catalog default install, update, recommendation and ordinary browse results exclude it. An explicit Upcoming/Preview Packages surface may show the immutable package identity/class, signed reason, UTC/localized opening and closing times, affected scope, approval provenance, expected behavior and recovery/stable-replacement route without presenting an enabled Install action.

<a id="0215-p002"></a>

The official release/download surface may make the immutable external offline package available before opening so users or administrators can distribute it to air-gapped devices. Acquisition is an external-file transport decision, not installation permission. The application never automatically downloads it, stores it in Model Blob Store/Managed Runtime paths, creates installed/available registry references or counts its external bytes as managed package storage before the window opens.

<a id="0215-p003"></a>

Through an explicit native file picker, the application may perform bounded read-only inspection of the selected external file: verify signatures, manifest/digests, Time-Bounded Offline Release Approval, platform/architecture/compatibility, declared sizes and the not-yet-open window. Inspection runs under the same archive/parser isolation and path/privacy limits as ordinary package import, executes no contained code and retains only small path-free ephemeral verification state. It does not copy/extract payload bytes, create resumable staging, activate a model/runtime or keep access to the external location after the inspection session.

<a id="0215-p004"></a>

ADR 0217 owns that inspection session's privacy lifecycle. Leaving or closing the pre-install inspection surface releases its picker grant and temporary selection metadata rather than creating a recent-package list, durable selection record or reusable source bookmark. A later review always begins with a new explicit picker action.

<a id="0215-p005"></a>

ADR 0218 permits a session-bound identity card during that review. It distinguishes the selected basename/actual size from verified signed package identity, target, publisher, window and digest evidence; the card does not enable early installation or survive session teardown.

<a id="0215-p006"></a>

ADR 0221 does not turn digest-mismatch recovery into early managed acquisition. Before `notBefore`, the app may present and explicitly open a host-validated official external-acquisition source, but it downloads/stages nothing; externally reacquired bytes must be selected and fully reverified in a later session.

<a id="0215-p007"></a>

Before `notBefore`, the reviewed plan has no Continue Anyway, Developer Mode exception, early staging, preinstallation, scheduled activation or manual clock/source override. Reaching the opening time does not wake the app, send an operating-system notification, reopen the plan or begin work automatically. The user explicitly selects the external file or current catalog entry again; the host re-verifies current trusted time, signatures, manifest/digests, approval, revocation, compatibility, license, storage and other admission evidence before a new confirmation.

<a id="0215-p008"></a>

The same external bytes can be reused after opening without redownload when the user still possesses them and their exact digest remains valid. The application re-reads/re-verifies the selected scope rather than trusting the earlier ephemeral result. If the candidate is superseded, revoked, its window ends, approval/evidence becomes invalid or the bytes change, installation blocks with the current typed reason; the old preview cannot pin eligibility.

<a id="0215-p009"></a>

ADR 0216 preserves ownership when that block is a revocation/suspension. The application may clear only its own ephemeral inspection state and offer an opaque Show In File Manager action plus deletion guidance; it never deletes, moves, quarantines, remembers or watches the user-owned external package.

<a id="0215-p010"></a>

Changing `notBefore`, reason, scope or any package bytes requires a new immutable ADR 0213 candidate/approval. The published early package and its audit history are never edited in place. Mirrors may serve identical approved bytes but cannot open the window early, rewrite times or convert external acquisition into managed installation.

<a id="0215-p011"></a>

Install Window Not Started creates no global navigation badge, repeated toast or operating-system notification. It affects no installed package, existing analysis result, asset, preview, backup or ordinary application workflow. The current project has no upcoming/preview catalog projection, external pre-acquisition distinction, read-only time-bounded package inspector, ephemeral verification record or post-opening explicit re-review flow. This ADR records target behavior only: it lists/downloads/selects/reads/copies/installs no package, accesses no model/runtime/asset/result/private data, performs no time/network check and changes no public IPC/schema/AI Worker API.

<a id="adr-0217"></a>

## 0217 · External Package Inspection State Is Session Only And Path Free

决定来源：[0217-external-package-inspection-state-is-session-only-and-path-free.md](../../adr/0217-external-package-inspection-state-is-session-only-and-path-free.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0217-p001"></a>

Selecting an External User-Owned Package creates an **External Package Inspection Session**, not a recent-package entry, import record or durable activity history. The main process owns the native-picker grant and binds one opaque session identity to the foreground inspection surface. The renderer may receive only the temporary display-safe label, actual size, separately verified declared size, typed verification progress and result needed to explain the current selection; it receives no raw path, bookmark, reusable file handle or directory context.

<a id="0217-p002"></a>

ADR 0218 defines that temporary projection as an External Package Identity Card: selected basename and actual size remain explicitly separate from verified signed package/publisher/target/window/digest evidence. The card and its selection-session expiry are cleared with this session and never become package validity or durable history.

<a id="0217-p003"></a>

Before a managed installation transaction starts, closing or leaving the inspection surface, cancelling, selecting another file, picker-grant expiry, explicit Quit or process restart ends the session. The host releases the grant and clears the temporary label/size, locally computed digest, manifest projection, inspection result and parser state. Crash recovery removes only proven application-owned scratch under the governed temporary root and does not reconstruct a recent selection. A platform-native picker may independently remember a directory or recent item under macOS/Windows policy; the application neither imports that operating-system state as its own history nor promises to erase state it does not own.

<a id="0217-p004"></a>

Accepted signed revocation/suspension statements remain in Last Verified Model/Runtime Trust State independently of any selection. That global ledger may retain the exact issuer/root, package/manifest/content identity and scope carried by accepted trust evidence so a renamed or copied package cannot bypass ADR 0216. It does not add a locally computed digest merely because the user selected a file, and it records no selected/seen flag, last-opened time, attempt count, external filename, path or source location against the trust identity. Consequently, retained trust state proves what is blocked, not that this user possessed or inspected the package.

<a id="0217-p005"></a>

A bounded **External Package Diagnostic Summary** may persist at installation/device scope solely as fixed coarse outcome counters such as trust-blocked, signature-invalid or incompatible/other-verification-failure. It contains no per-attempt rows, timestamps, package/model/runtime/trust-root identities, manifests/digests, names, paths, sizes, source classes, session/correlation identifiers or successful-selection history. Counters are bounded, locally resettable and excluded from Full Library Backup, library export/merge/sync, logs, crash reports, telemetry, catalog requests, publisher communication, plugins/extensions and operating-system notifications. They cannot authorize network access, installation, deletion, automatic remediation or user profiling.

<a id="0217-p006"></a>

If the user explicitly confirms an eligible installation, the host revalidates the candidate and hands the minimum path-free manifest/digest/trust/consent/progress evidence plus a bounded source handle to a Managed Package Installation Transaction. That transaction may outlive the inspection surface only while it copies verified bytes into governed staging and completes its existing cancel/failure/recovery lifecycle. The source handle is released at copy completion or any terminal transaction state; durable installed-package provenance contains managed package identity and verification evidence, never the external filename/path or a recent-selection entry. Closing the inspection surface before confirmation creates no transaction, and an External Package Installation Blocked result can never be promoted into one.

<a id="0217-p007"></a>

No renderer store, SQLite table, settings recent-list, localStorage key, log, crash attachment, support bundle, plugin API or extension event may expose or reconstruct past external selections. After session end the application cannot reveal, reopen, reverify or distinguish the former file without a new explicit picker action. This does not remove managed installation provenance, accepted global trust statements or the unlinkable coarse diagnostic counters allowed above.

<a id="0217-p008"></a>

ADR 0219 allows the user to explicitly copy a verified full digest while this session is live. The app clears its session projection on teardown but does not clear or read back operating-system clipboard content, which becomes user/OS-owned external state rather than application selection history.

<a id="0217-p009"></a>

ADR 0220 may also keep the signed expected and fully computed mismatching actual digests in memory for the live comparison view. Session teardown clears the pair, and the actual value never becomes durable package/trust identity merely because it was calculated or explicitly copied.

### 当时实施上下文（来源，非当前状态）

以下句子记录原文写作时的执行/交付范围，不否定当前实现，不授予新操作权限。

<a id="0217-p010"></a>

The current project has no External Package Inspection Session, session teardown contract, selection-independent trust-ledger rule or External Package Diagnostic Summary. This ADR records target behavior only: it selects/reads/remembers/reveals/modifies no file, writes no history/counter, accesses no operating-system recent-item state, trust/model/runtime/asset/result/private data, starts no transaction/network activity and changes no public IPC/schema/AI Worker API.

<a id="adr-0218"></a>

## 0218 · External Package Inspection Shows Session Bound Identity Evidence

决定来源：[0218-external-package-inspection-shows-session-bound-identity-evidence.md](../../adr/0218-external-package-inspection-shows-session-bound-identity-evidence.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0218-p001"></a>

While an ADR 0217 External Package Inspection Session remains open, the inspection surface shows a read-only **External Package Identity Card**. The card helps the user confirm which item is being assessed, but it is neither installation consent nor security authority. It separates host-observed Selected File facts from fields proven by signed package evidence instead of presenting one undifferentiated metadata list.

<a id="0218-p002"></a>

Selected File facts are limited to a sanitized basename with no directory/path and the actual file byte size observed through the live picker grant. Signed Package Identity shows the verified package name and version, publisher/trust-root identity and status, Dated Offline Trust Evidence issue/freshness state, target platform and architecture, signed installation window, and a **Package Digest Short Code** only after the corresponding evidence is valid. When actual and signed declared sizes match, the card says so; a mismatch shows both values and the typed blocking reason. An undated stable package shows **No Signed Installation Window** rather than an invented expiry or an “always safe” claim.

<a id="0218-p003"></a>

Every field carries a visible source/status such as Selected File, Verification Pending, Verified Signed Manifest, Unverified, Mismatch or Not Declared. Before verification finishes, signed fields remain pending. If a manifest, signature, trust chain or binding cannot be verified, the application does not infer package name/version/publisher/target/window from the filename, extension, adjacent README, directory name or a nearby catalog entry. Publisher is labeled Verified only when its exact signature chain and trust-root policy pass; an otherwise valid third-party signature does not inherit Official publisher status.

<a id="0218-p004"></a>

Basenames and signed display strings are untrusted presentation input even when their bytes participate in valid signatures. The host bounds length, renders them as text rather than markup, neutralizes control/bidirectional spoofing, prevents active links and supplies accessible non-color-only verification labels. Display normalization never changes the raw bytes used for signature/digest checks. Full paths, parent folders, volume names, account names, source URLs and internal staging paths never enter the card, tooltip, window title, notification or clipboard implicitly.

<a id="0218-p005"></a>

The signed installation window is evaluated as UTC evidence under ADRs 0208–0211. The card displays the canonical UTC boundary plus a localized rendering with explicit timezone; timezone conversion cannot create a conflict or alter eligibility. Selection-session expiry is separately labeled **Selection Session Expires** and is never shown as package validity, license duration or `validUntil`.

<a id="0218-p006"></a>

Package Digest Short Code is an algorithm-labeled visual abbreviation derived from a fully calculated digest, for example `SHA-256 8f3a91c2…0d72b4e1`. The main process still compares the complete signed digest; matching short codes never establish identity, trust or installation eligibility. Until the complete digest matches, the default card shows verification pending/failure rather than a verified short code. ADR 0219 permits explicit session-bound full-digest viewing and host-owned copying after that complete match; ADR 0220 separately permits an explicitly labeled expected-versus-actual mismatch comparison without presenting either as a verified short code. No selection or verification event copies automatically.

<a id="0218-p007"></a>

The Install action remains separate from the card and is enabled only after every required trust, digest, compatibility, time, license, storage and policy check succeeds. Confirmation binds the opaque session and complete verified package/manifest digest, not the basename, card text or short code. The host rechecks stable source identity and complete bytes when handing the file to managed staging; replacement or mutation after inspection invalidates confirmation and blocks rather than installing the previously described package. Selecting another file immediately invalidates the prior card and confirmation state.

<a id="0218-p008"></a>

Closing the inspection surface before confirmation releases every card field under ADR 0217. If a confirmed Managed Package Installation Transaction continues, its path-free signed package identity/progress may appear in managed activity UI, but the selected basename and external source context do not follow it. Blocked-package identity remains visible only for the live foreground session alongside the typed reason and ADR 0216 user-controlled reveal guidance; it does not create durable history.

<a id="0218-p009"></a>

The current Runtime Package selection path already projects package id, name, version, type, install mode, declared size, selection expiry and warnings, while deliberately omitting its internal archive filename and SHA-256. It has no publisher/trust-root, signed target/window, source-vs-signed evidence state, safe digest short code or identity-card teardown contract. `RuntimePackagePanel` currently labels the selection TTL as “有效期”; that is not signed package validity and must become a distinct session-expiry label when this target is implemented. This ADR changes documentation only: it selects/hashes/displays/copies/installs no package, reads no private file/runtime/model/asset/result state and changes no public IPC/schema/AI Worker API.

<a id="adr-0219"></a>

## 0219 · Full Package Digest View And Copy Are Explicit And Session Bound

决定来源：[0219-full-package-digest-view-and-copy-are-explicit-and-session-bound.md](../../adr/0219-full-package-digest-view-and-copy-are-explicit-and-session-bound.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0219-p001"></a>

The ADR 0218 External Package Identity Card shows only Package Digest Short Code by default. A user may explicitly expand **External Package Technical Details** during the live ADR 0217 inspection session to view the complete verified package digest. Opening details is a read-only disclosure, not installation confirmation, license acceptance, trust override or consent to copy anything.

<a id="0219-p002"></a>

Full verified-digest disclosure becomes available only after the host has calculated the complete digest of the selected bytes and matched it exactly to the signed manifest. The details view shows the algorithm, an untruncated lowercase digest in a readable monospace/wrapping layout, and the evidence state **Matches Signed Manifest**. A signature, expected manifest value, filename resemblance, partial hash or Package Digest Short Code is insufficient. If verification is pending or missing, the full verified-digest control stays unavailable and the existing typed failure remains. ADR 0220 separately permits a mismatch comparison with distinct Signed Expected and Selected File Actual labels; it never presents the unmatched actual value as verified package identity. A fully verified digest may still be shown when a separate accepted revocation blocks installation.

<a id="0219-p003"></a>

The explicit **Copy Full Digest** action writes one canonical plain-text value: the registered lowercase algorithm identifier, one colon and the complete normalized digest, for example `sha256:<64-lowercase-hex-characters>`. It adds no filename, path, package/publisher name, version, source URL, session id, timestamps, labels, surrounding prose or trailing newline. Future algorithms must use their registered identifier and complete canonical encoding; the UI never omits the algorithm or silently converts/downgrades one digest into another.

<a id="0219-p004"></a>

The trusted host owns copying. Expanding verified details may project only algorithm, complete digest and verified-match state through the active opaque inspection session. Copy requests carry that session identity back to the main process; the host rejects expired, replaced or unverified sessions, resolves the current canonical value and writes it to the operating-system clipboard. A mismatched session has no Copy Full Digest action; ADR 0220 provides two role-specific copy actions only after both comparison values have valid provenance. The renderer does not construct a clipboard payload from card text, and plugins/extensions receive neither the full digest nor a copy hook. Manually selecting visible text remains an explicit user gesture but does not change these lifecycle or trust rules.

<a id="0219-p005"></a>

Successful copy produces only a short in-app acknowledgement such as **Full digest copied**. Failure reports a generic clipboard-write failure and leaves installation state unchanged. Feedback contains no digest, package name, filename/path or operating-system notification and creates no recent action, diagnostic counter, telemetry event or support-log row. The application never reads the clipboard back, polls it or uploads its contents to verify that copying succeeded.

<a id="0219-p006"></a>

Clipboard content becomes user/operating-system-owned external state after the explicit copy. The details surface calmly notes that macOS, Windows or a third-party clipboard manager may retain copied text. Design Asset Manager does not schedule a timer, clear or overwrite the clipboard when details collapse, the inspection page closes, the session expires, installation starts/completes, or the application quits. Automatic clearing could destroy newer user clipboard content, cannot reliably erase clipboard-manager history and would create false privacy assurance.

<a id="0219-p007"></a>

ADR 0460 applies the same external-ownership and no-automatic-clearing truth to
user-copied Text Custom Field content. It keeps Text selection/full-value source
resolution and unsafe-character handling under that field's own contract rather
than treating package-digest rules as a generic clipboard broker.

<a id="0219-p008"></a>

The expanded state and full digest projection remain in memory only for the active inspection session. Collapse, reselection, session teardown or process restart releases renderer/main references and never persists the value in SQLite, settings, localStorage, Full Library Backup, export/merge/sync, logs, crash reports, notifications or package diagnostics. An already copied operating-system value is not treated as application history and cannot be recalled, cleared or reopened by the app without a new user action.

<a id="0219-p009"></a>

Digest equality proves byte equality only relative to a trustworthy expected digest. The details text states that copying or matching the value against unsigned release text does not establish publisher identity, Official status, current trust, license, compatibility or installation eligibility. Copying never clears ADR 0216 revocation, starts network activity, selects a model/runtime or permits a blocked Install action.

<a id="0219-p010"></a>

The current Runtime Package projector deliberately omits its internal SHA-256 and `RuntimePackagePanel` has no technical-details or package-digest copy action. Other renderer surfaces use `navigator.clipboard.writeText` for ordinary user-invoked color, prompt or path copying, but those are not a trusted package-evidence broker and must not be reused as authority for this flow. The current project has no session-scoped full-digest projection, host-owned canonical clipboard action or clipboard-retention disclosure. This ADR changes documentation only: it reads/writes no clipboard, selects/hashes/copies/installs no package, accesses no private file/runtime/model/asset/result state and changes no public IPC/schema/AI Worker API.

<a id="adr-0220"></a>

## 0220 · Digest Mismatch Details Show Expected And Actual Without Enabling Install

决定来源：[0220-digest-mismatch-details-show-expected-and-actual-without-enabling-install.md](../../adr/0220-digest-mismatch-details-show-expected-and-actual-without-enabling-install.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0220-p001"></a>

When the host completely hashes the selected external package bytes and they do not equal the digest in an otherwise successfully verified signed manifest, the External Package Identity Card enters the typed blocking state **Digest Mismatch**. The default card shows the failure and keeps Install disabled. An explicit ADR 0219 External Package Technical Details expansion may show a read-only **Digest Mismatch Comparison** for diagnosis; opening or copying from it never becomes a Continue Anyway path.

<a id="0220-p002"></a>

The comparison is available only when both sides have valid provenance. **Signed Expected Digest** means the algorithm and complete expected value came from a manifest whose signature, trust chain, schema and binding were already verified for this exact artifact scope. **Selected File Actual Digest** means the host successfully read the complete selected bytes through the live picker grant and calculated the same supported algorithm. An invalid/untrusted manifest cannot supply a value labeled signed expected, and an interrupted/changed/unreadable file cannot supply a value labeled complete actual; those cases retain their own typed failures rather than fabricating a mismatch comparison.

<a id="0220-p003"></a>

Technical Details places the two full values in separate, equally readable rows. The first is labeled **Signed manifest expected** with its verified-manifest source. The second is labeled **Selected file actual — does not match and is not verified package identity**. Both show explicit algorithm identifiers and complete normalized digests without truncation. The UI does not calculate a similarity percentage, highlight matching character runs, describe one digest as “close,” or treat a common prefix as partial success; cryptographic digest equality is all-or-nothing.

<a id="0220-p004"></a>

Each row has its own explicit host-owned action: **Copy Signed Expected Digest** and **Copy Selected File Actual Digest**. Each action writes only ADR 0219 Canonical Package Digest Text, `algorithm:complete-normalized-digest`, with no role label, filename/path, package metadata or newline. The button label and content-free acknowledgement identify which row was copied. There is no ambiguous shared Copy button or automatic combined clipboard payload. Before writing, the main process revalidates the active session, selected row, manifest provenance and completed hash so a stale/reselected value cannot be copied.

<a id="0220-p005"></a>

The actual digest remains visibly unverified regardless of viewing, copying, repeated selection or similarity to any unsigned website/release text. It is not inserted into Last Verified Model/Runtime Trust State, a catalog, installed-package provenance, recent history or a package identity cache merely because it was computed or copied. Only separately accepted signed trust evidence may later identify those exact bytes. The signed expected value likewise does not prove that the selected file contains them.

<a id="0220-p006"></a>

Digest Mismatch is an absolute admission failure for this Official Offline Package transaction. There is no Continue Anyway, Developer Mode bypass, “trust this actual digest,” edit/replace signed digest, install-as-unverified within the official lane, stage now or activate later action. Copying either value cannot enable Install, clear revocation, satisfy signature/trust/compatibility/time/license/storage gates or create a Managed Package Installation Transaction. ADR 0221 owns the only recovery entries: select different bytes or review a new exact-source Official Package Reacquisition Plan.

<a id="0220-p007"></a>

The comparison, both complete values and which row is expanded remain ADR 0217 session-only state. Collapse/reselection/close/expiry/quit clears application references; no digest pair or copy event enters SQLite, settings, localStorage, Full Library Backup, export/merge/sync, logs, crash reports, notifications, support bundles, plugins/extensions or diagnostics beyond the unlinkable coarse failure counter already allowed by ADR 0217. Explicitly copied clipboard text remains OS/user-owned under ADR 0219 and is not automatically cleared or read back.

<a id="0220-p008"></a>

The current Runtime Package session calculates `actualSha256` and compares it with the manifest entry, but on mismatch returns only `CHECKSUM_MISMATCH`; its failure projector exposes only that error code and the UI shows a generic SHA-256 failure. A separate internal mock verification result already models expected and actual SHA-256, but it is not the session-bound signed-evidence/UI contract defined here. Existing focused tests assert blocking only and do not project/copy two digests. This ADR changes documentation only: it hashes/displays/copies/installs no package, reads/writes no clipboard or private file/runtime/model/asset/result state and changes no public IPC/schema/AI Worker API.
