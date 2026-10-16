# 引用源操作与恢复：详细能力契约

本文承接原ADR中的细节，保留所有原数字、例外、状态和相互约束；[来源映射](../../checkpoints/documentation-rebuild-20261015/adr-migration.json)逐段核对。**有效要求不是当前交付声明，也不是本轮实施队列。** 现行已批准产品/设计在其明确替代范围内优先；不凭实现缺失判决定无效。

当前系统从[storage-intake](../../subsystems/storage-intake.md)进入；当前实际能力/版本见[CURRENT-STATE](../../handoff/CURRENT-STATE.md)，交互与视觉分别归[交互目录](../../design/README.md)/[DESIGN](../../../DESIGN.md)。详细条款按下面独立主题定位，不全量装入每次上下文。

## 主题导航

- [0329 · Referenced Source Rewrite Cancels Only Before Old-Source Trash](#adr-0329)
- [0330 · Referenced Source Rewrite Batches Use One Plan And Commit Per Item](#adr-0330)
- [0331 · Referenced Source Rewrite Automatic Retry Re-Encodes Before The Destructive Boundary](#adr-0331)
- [0332 · Referenced Source Rewrite Holds One Shared Volume Lane Through Publication](#adr-0332)
- [0333 · Source Rewrite Plans Keep Current By Default And Resolve Per Format](#adr-0333)
- [0334 · Source Rewrite Presets Have Explicit Personal And Library Scopes](#adr-0334)

<a id="adr-0329"></a>

## 0329 · Referenced Source Rewrite Cancels Only Before Old-Source Trash

决定来源：[0329-referenced-source-rewrite-cancels-only-before-old-source-trash.md](../../adr/0329-referenced-source-rewrite-cancels-only-before-old-source-trash.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0329-p001"></a>

Rewrite Referenced Source may be cancelled during capability encoding only at a checkpoint where the encoder can stop without publishing or mutating the user-owned source. The accepted request prevents further encoding and may remove only the exact application-owned Referenced Source Rewrite Staging proven to belong to that operation. If an encoder cannot stop immediately, cancellation remains pending until that checkpoint; unprovable or failed staging cleanup is shown as operation-scoped cleanup attention and never authorizes touching the original.

<a id="0329-p002"></a>

After staging becomes complete and passes full validation, cancellation remains available until the **Referenced Source Rewrite Destructive Boundary** begins. An accepted cancellation before that boundary durably closes the rewrite, keeps the exact old source and prior Source Content Generation authoritative, creates no recovery receipt and prevents restart from issuing trash or publication. It removes only proven operation-owned staging; closing the page, application exit or Library Switch does not convert cancellation into an implicit continuation.

<a id="0329-p003"></a>

Once the operating-system trash request for the old source begins, generic cancellation and force-stop are unavailable. The call must settle or reconcile under ADR 0319–0320: proven trash failure leaves the old source authoritative, proven trash success continues publication or Referenced Source Rewrite Publication Recovery, and ambiguity remains recovery attention without another trash request. A cancellation request cannot choose rollback, discard staging or skip recovery after this boundary, because the old source may already have moved.

<a id="0329-p004"></a>

ADR 0347 defines one Referenced Compound Source Rewrite Destructive Boundary at the first old-member trash request. Before it, cancellation closes the whole group and removes only proven staging; after it, no member-level cancellation is available and the complete item must settle through group publication recovery. Successful publication and new Source Content Generation commit are final outcomes of this operation, not cancellable states or one-click undo. The Rewritten Old Source Recovery Receipt remains available under ADR 0321, and making recovered bytes current is a separately reviewed new rewrite. ADR 0330 batch items obey this same boundary independently; cancelling a batch never reverses committed items. Window closure, shutdown and restart reconcile evidence but never repeat trash, publication or restoration. The current application has no referenced-source rewrite cancellation checkpoints or destructive boundary. This ADR records target architecture only and encodes, accesses, creates, copies, relinks, moves, rewrites, restores, trashes, deletes, reads or writes no runtime/user file and changes no public IPC, database schema or AI Worker API.

<a id="adr-0330"></a>

## 0330 · Referenced Source Rewrite Batches Use One Plan And Commit Per Item

决定来源：[0330-referenced-source-rewrite-batches-use-one-plan-and-commit-per-item.md](../../adr/0330-referenced-source-rewrite-batches-use-one-plan-and-commit-per-item.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0330-p001"></a>

A **Referenced Source Rewrite Batch** applies one explicit **Source Rewrite Plan** under ADR 0333 to a reviewed selection of Referenced Assets. The plan expresses same-format rules for dimensions, color space/profile, bit depth, compression, quality and other supported properties; it does not choose a common output extension or hide source-specific values. Mixed PSD, TIFF, JPEG and other formats may share a plan only because every Design Asset independently retains its verified real formats and valid extensions. Under ADR 0347 a selected Referenced Compound Original contributes one Design Asset item whose plan resolves across every member and whose staging, destructive boundary, generation commit and recovery stay group-scoped. The same Design Asset or physical source may appear only once; shared-source or repeated-item evidence blocks the affected batch entries rather than scheduling multiple rewrites of the same bytes.

<a id="0330-p002"></a>

Each item is eligible only when its trusted installed capability and required encoder set prove they can apply the resolved plan while preserving every layer, page, artboard, frame, RAW sensor element, color property, declared compound relationship or other professional structure promised by the item review. Unsupported properties, incompatible plan rules, missing capability, invalid source evidence or unprovable preservation excludes that item with a specific reason. The batch never silently flattens, changes extension or format, invokes Compatible Export, adopts an export as current source or substitutes preview bytes for an ineligible source.

<a id="0330-p003"></a>

Before execution, the review resolves and displays each item's current/proposed properties, preserved or lost structure and eligibility; the user may remove entries. One batch confirmation may authorize ADR 0319's single-file or ADR 0347's whole-group old-source trash/publication sequence for every eligible item, but it does not preauthorize any recovery, collision or alternate-path decision for all items. Every Design Asset item then uses ADR 0332 shared volume-lane scheduling while it stages, completely validates, crosses its applicable destructive boundary, publishes and commits its Source Content Generation independently. A byte-identical item result is a no-op with no replacement, generation or recovery receipt; one item's failure, cancellation or recovery does not roll back or stop unrelated safe items.

<a id="0330-p004"></a>

The **Referenced Source Rewrite Batch Result** groups successful rewrites, byte-identical no-ops, capability/incompatibility exclusions, failed, single-file or Referenced Compound Source Rewrite Publication Recovery and cancelled Design Asset items with their normal item/group-scoped actions and receipts. Compound members never become independent success, retry, recovery or result rows. The batch offers no rollback or rewrite undo, and recovery decisions cannot be applied to all. ADR 0331 permits bounded full re-encoding only for transient pre-destructive single-file failures and defines Retry Failed Referenced Source Rewrites without rerunning completed or recovery items; compound pre-destructive retry remains explicit under ADR 0347. Restart preserves accepted cancellation for unstarted items and reconciles every started item without repeating trash, publication or restoration. The current application has no Source Rewrite Plan, rewrite batch coordinator or batch result surface. This ADR records target architecture only and encodes, exports, accesses, creates, copies, relinks, moves, rewrites, restores, trashes, deletes, reads or writes no runtime/user file and changes no public IPC, database schema or AI Worker API.

<a id="adr-0331"></a>

## 0331 · Referenced Source Rewrite Automatic Retry Re-Encodes Before The Destructive Boundary

决定来源：[0331-referenced-source-rewrite-automatic-retry-reencodes-before-the-destructive-boundary.md](../../adr/0331-referenced-source-rewrite-automatic-retry-reencodes-before-the-destructive-boundary.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0331-p001"></a>

**Referenced Source Rewrite Automatic Retry** is allowed only after a classified transient source read, encoder-process failure, application-owned staging write or complete-verification I/O failure before the Referenced Source Rewrite Destructive Boundary. The current Design Asset, Source Content Generation, exact source bytes, Source Rewrite Plan and its per-item resolved values, encoder package/version and capability evidence must remain unchanged. Each item receives at most two automatic retries after its initial attempt with bounded increasing delays; every attempt freshly checks permissions, available space and current source evidence.

<a id="0331-p002"></a>

No retry resumes, appends to or publishes an incomplete or unverified Referenced Source Rewrite Staging artifact. Before re-encoding, the application removes only staging proven to belong exclusively to the failed attempt; unprovable ownership or failed cleanup blocks automatic retry and becomes operation-scoped attention. A newly encoded output must pass the entire real-format, requested-property, structure-preservation and byte-completeness validation. Proven invalid output or the same deterministic encoder rejection is not a transient verification failure.

<a id="0331-p003"></a>

Restart reconciliation, waiting for a shared Referenced Source Volume Lane and continuing an unchanged encoder checkpoint are not retry attempts. Restart, application exit, Library Switch and **Retry Failed Referenced Source Rewrites** do not reset the automatic retry budget. Permission or space failure, missing or incompatible capability, changed source/plan/encoder evidence, deterministic encode failure, invalid output, cancellation, operating-system trash, publication, Source Content Generation commit, restore, recovery or ambiguous outcome never retries automatically. Crossing the destructive boundary permanently removes the item from ordinary retry and routes it only through ADR 0320 reconciliation or recovery.

<a id="0331-p004"></a>

**Retry Failed Referenced Source Rewrites** acts only on explicitly selected currently failed items still proven before the destructive boundary. It preserves attempt history, repeats current capability and plan review, reacquires source-operation guards and re-encodes from the exact current source; changed evidence returns the item to review instead of executing under stale confirmation. Successful, byte-identical, capability-excluded, cancelled and recovery items are excluded, so the action never reruns a committed generation or bypasses recovery. ADR 0347 does not extend this single-file automatic retry budget across a compound staging set: a failed pre-destructive group plan requires explicit whole-group re-review/re-encode, and a group that crossed its destructive boundary can continue only through Referenced Compound Source Rewrite Publication Recovery. The current application has no rewrite retry classifier, budget or result action. This ADR records target architecture only and encodes, accesses, creates, copies, relinks, moves, rewrites, restores, trashes, deletes, reads or writes no runtime/user file and changes no public IPC, database schema or AI Worker API.

<a id="adr-0332"></a>

## 0332 · Referenced Source Rewrite Holds One Shared Volume Lane Through Publication

决定来源：[0332-referenced-source-rewrite-holds-one-shared-volume-lane-through-publication.md](../../adr/0332-referenced-source-rewrite-holds-one-shared-volume-lane-through-publication.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0332-p001"></a>

Every Rewrite Referenced Source item, whether started alone or through Referenced Source Rewrite Batch, uses the existing **Referenced Source Volume Lane** for its source's stable physical-volume identity. It acquires that shared lane before authoritative source reading and holds it through encoding, same-volume staging, complete validation, the Referenced Source Rewrite Destructive Boundary, old-source trash, publication, Source Content Generation commit and immediate reconciliation or a durably recorded safe/attention state. Thus relocation, cross-volume transfer and rewrite cannot run through separate schedulers against the same volume; ADR 0348 removes the former cross-format current-source-change participant.

<a id="0332-p002"></a>

Only one application-directed Referenced Source operation actively uses a physical volume at a time, including long PSD, TIFF, PSB or other professional-format encodes. Items on disjoint physical volumes may proceed concurrently, but their authoritative library commits remain item-atomic through the active library's single-write boundary. The lane is an application scheduler, not an operating-system lock against external editors, so exact source and staging evidence is still freshly checked before the destructive boundary and publication.

<a id="0332-p003"></a>

An item waiting for user input, unavailable media or Referenced Source Rewrite Recovery Review first durably records its exact state and retains Design Asset, source-path and operation-staging guards, then releases the I/O lane rather than blocking the volume indefinitely. Continuation, automatic retry or Retry Failed Referenced Source Rewrites must reacquire the current source-volume lane and fully revalidate source, generation, plan, capability and staging evidence. Cancellation or volume loss releases the lane only after a safe encoder checkpoint; an in-progress trash, publication or commit settles or reconciles before release.

<a id="0332-p004"></a>

ADR 0347 acquires every physical volume containing a current or staged compound member in the same stable deterministic order and holds the applicable lanes through complete candidate validation, member publication and the group generation commit or durable recovery. Waiting recovery may release lanes only after preserving all group/path/staging guards, and continuation must reacquire the complete current volume set. Version one shows progress and lane-wait reasons but offers no user concurrency control and does not infer higher concurrency from device labels, filesystem type or claimed SSD/network performance. Any future increase requires measured memory, I/O, encoder-isolation and recovery evidence and cannot weaken item guards or create a second lane namespace for rewrites. The current application has no Referenced Source Volume Lane scheduler or source-rewrite execution. This ADR records target architecture only and encodes, accesses, creates, copies, relinks, moves, rewrites, restores, trashes, deletes, reads or writes no runtime/user file and changes no public IPC, database schema or AI Worker API.

<a id="0332-p005"></a>

ADR 0390 generalizes the shared underlying scheduler as Physical Volume File
Lane and adds Asset Export plus a separate media-resource gate. Rewrite remains
an exclusive participant in the same lane and neither export nor encoding may
bypass its source-volume ownership by using another queue.

<a id="adr-0333"></a>

## 0333 · Source Rewrite Plans Keep Current By Default And Resolve Per Format

决定来源：[0333-source-rewrite-plans-keep-current-by-default-and-resolve-per-format.md](../../adr/0333-source-rewrite-plans-keep-current-by-default-and-resolve-per-format.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0333-p001"></a>

Every field in a **Source Rewrite Plan** defaults to **Keep Current**, so selecting assets or loading a preset never implies a byte change. Dimension rules are explicitly one of fit within width and height, longest edge or percentage; aspect ratio remains preserved and upscaling remains off unless the user deliberately changes those choices. A percentage above 100% is explicit upscaling. Crop, content-aware resize, arbitrary distortion or encoder-specific scaling behavior is never inferred from these rules.

<a id="0333-p002"></a>

Color remains unchanged unless the plan explicitly requests conversion from the currently resolved Source Color Profile to a selected validated target profile. Assigning a profile to missing or uncertain source evidence remains ADR 0130 Sidecar Profile Assignment and is not hidden inside source rewrite; unresolved source color blocks a requested conversion rather than assuming sRGB or another profile. The plan also keeps bit depth unchanged unless explicitly selected and discloses when a higher container depth cannot recreate precision absent from the source. Unsupported or unprovable color/bit-depth preservation excludes the item instead of silently substituting another transform.

<a id="0333-p003"></a>

Compression and quality are format-specific plan sections, not one synthetic scale applied across JPEG, TIFF, PSD, PSB or other encoders. Each format keeps its current supported setting unless an explicit compatible override exists, and every lossy or structure-affecting consequence appears in per-item Referenced Source Rewrite Review. Unsupported settings exclude the affected item; they are never approximated, dropped or mapped to a vaguely similar encoder option.

<a id="0333-p004"></a>

Before confirmation, the application resolves the semantic plan into each item's actual dimensions, color/profile, bit depth, compression, quality and professional-structure outcome. ADR 0347 resolves a Referenced Compound Original across every current member row, keeps each member at Keep Current unless explicitly and safely changed, and adds capability-declared cross-member effects to the same item review. It may show a clearly labeled estimated output-size range or direction, but the estimate is not a storage guarantee or substitute for current capacity validation. Exact source/output properties and every exclusion remain visible before the batch confirmation.

<a id="0333-p005"></a>

A plan may be saved as a **Source Rewrite Preset**, but the preset stores only the named semantic intent. It stores no Design Asset or source identity, resolved per-item values, encoder package/version, capability or preservation evidence, output estimate, prior review, destructive authorization, staging or recovery state. Applying it always starts a new review, resolves against current formats and installed capabilities, and requires fresh confirmation under ADR 0330. ADR 0334 gives presets explicit Personal and Library scopes without synchronizing or bundling capabilities. The current application has no Source Rewrite Plan or preset. This ADR records target architecture only and encodes, accesses, creates, copies, relinks, moves, rewrites, restores, trashes, deletes, reads or writes no runtime/user file and changes no public IPC, database schema or AI Worker API.

<a id="adr-0334"></a>

## 0334 · Source Rewrite Presets Have Explicit Personal And Library Scopes

决定来源：[0334-source-rewrite-presets-have-explicit-personal-and-library-scopes.md](../../adr/0334-source-rewrite-presets-have-explicit-personal-and-library-scopes.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0334-p001"></a>

Saving a Source Rewrite Preset requires an explicit scope and defaults to **Personal Source Rewrite Preset**. A personal preset is device-local application state available while working in any library on that device; it is not written into a Library Root, does not belong to a Registered Library and is not included in Full Library Backup. Saving to the active library instead creates a **Library Source Rewrite Preset** as authoritative portable library state included in that library's normal Full Library Backup and restore.

<a id="0334-p002"></a>

The two scopes are independent identities, not synchronized views of one preset. Copying a personal preset into a library or a library preset into personal scope is an explicit Save Copy action with a new identity; later rename, edit or deletion never propagates across scopes. Forgetting a library registration does not delete its library presets, while a personal preset never grants another library write authority. Saving, editing or deleting a library preset requires that library to be active and writable under its normal single-owner rules.

<a id="0334-p003"></a>

On another device, a Library Source Rewrite Preset preserves its semantic rules and remains readable even when required encoders or plugins are absent. Application of the preset re-resolves every current item and installed capability under ADR 0333, marks unsupported outcomes unavailable or excluded and never downloads, installs, enables or substitutes a capability automatically. Personal presets do not appear merely because another device opens the same library.

<a id="0334-p004"></a>

Neither scope stores source paths, Design Asset identities, Source Content Generations, resolved item/member values, Compound Original membership or roles, cross-member transformations, encoder/plugin binaries, capability proof, destructive confirmation, staging, receipts or recovery state. Applying a preset to ADR 0347 therefore starts a fresh Referenced Compound Source Rewrite Plan with every member defaulted to Keep Current rather than selecting primary or companion rewrites. Once a rewrite is confirmed, its operation record holds its own reviewed plan snapshot and evidence rather than dynamically depending on the preset. Deleting a preset therefore removes only that reusable rule definition and cannot alter, cancel, retry, roll back or resolve an active or recovering rewrite. The current application has no source-rewrite preset store or scope selector. This ADR records target architecture only and encodes, installs, downloads, accesses, creates, copies, relinks, moves, rewrites, restores, trashes, deletes, reads or writes no runtime/user file and changes no public IPC, database schema or AI Worker API.

<a id="0334-p005"></a>

ADR 0396 gives Compatible Export Presets analogous personal/library scopes plus
immutable built-ins, but the two preset families remain independent. A
source-rewrite preset never authorizes export and a compatible-export preset
never authorizes current-source mutation.
