# 归属转换与元数据写回：详细能力契约

本文承接原ADR中的细节，保留所有原数字、例外、状态和相互约束；[来源映射](../../checkpoints/documentation-rebuild-20261015/adr-migration.json)逐段核对。**有效要求不是当前交付声明，也不是本轮实施队列。** 现行已批准产品/设计在其明确替代范围内优先；不凭实现缺失判决定无效。

当前系统从[storage-intake](../../subsystems/storage-intake.md)进入；当前实际能力/版本见[CURRENT-STATE](../../handoff/CURRENT-STATE.md)，交互与视觉分别归[交互目录](../../design/README.md)/[DESIGN](../../../DESIGN.md)。详细条款按下面独立主题定位，不全量装入每次上下文。

## 主题导航

- [0354 · Residue Recovery Preserves Exact Generations And Replaces Earlier Content](#adr-0354)
- [0355 · Ownership Conversion Batches Use One Direction And Commit Per Asset](#adr-0355)
- [0356 · Managed-To-Referenced Batches Review One Root And Every Final Path](#adr-0356)
- [0359 · Metadata Writeback Conflicts Preserve Scalars And Append Keywords By Default](#adr-0359)
- [0360 · Metadata Writeback Batches Resolve Fields And Commit Per Asset](#adr-0360)
- [0361 · Mixed-Ownership Writeback Plans Split Source Authorization](#adr-0361)
- [0363 · Repeated Managed Writebacks Require Explicit Recovery-Point Disposition](#adr-0363)
- [0364 · Managed Writeback Recovery Points Export Or Return As A New Generation](#adr-0364)
- [0365 · Use As Current Requires Explicit Local Recovery-Point Disposition](#adr-0365)
- [0366 · Managed Writeback Recovery Point Cleanup Uses Complete-Set System Trash](#adr-0366)
- [0367 · Managed Writeback Recovery Cleanup Batches Commit Per Point](#adr-0367)
- [0368 · Mixed Managed Recovery Storage Cleanup Splits Authority By Type](#adr-0368)
- [0369 · Backup-Protected Recovery Points Are Indexed Not Locally Cleaned](#adr-0369)
- [0370 · Backup Recovery Availability Uses Passive, Manifest And Selected-Payload Tiers](#adr-0370)

<a id="adr-0354"></a>

## 0354 · Residue Recovery Preserves Exact Generations And Replaces Earlier Content

决定来源：[0354-residue-recovery-preserves-exact-generations-and-replaces-earlier-content.md](../../adr/0354-residue-recovery-preserves-exact-generations-and-replaces-earlier-content.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0354-p001"></a>

When a Referenced Asset's current single-file or complete Compound Original is unavailable, invalid or otherwise unable to revalidate, the application may offer **Residue-to-Managed Recovery** alongside keeping the asset in reference recovery and its normal explicit relink choices. Temporary offline status never starts the action automatically, no residue is selected automatically, and the user must choose one complete Managed Ownership Conversion Residue bound to the same Design Asset. Preflight freshly proves the library and item identities, residue storage ownership, every member's stable bytes, real format, declared role and manifest, current capability support, safe managed layout, required capacity and Storage Safety Reserve. A changed, incomplete, ambiguous, shared or unprovable residue is blocked rather than treated as remembered history.

<a id="0354-p002"></a>

**Recover as Managed Asset from Residue** is available only when the selected complete residue is byte/member/manifest-equivalent to the asset's last verified current Source Content Generation. One atomic commit makes those already library-owned bytes the current managed Original Asset, replaces the unavailable referenced relationships and retires only the selected residue role. The same Design Asset, Source Content Generation, user-authored metadata and still-valid generation-bound preview/analysis evidence remain; managed backup, deletion, Original Handoff and source-operation rules apply only after that commit. No external copy is required merely to duplicate bytes the library already safely owns, although invalid managed layout must be repaired through separately verified operation-owned staging before commit.

<a id="0354-p003"></a>

If the selected residue exactly matches its own recorded prior conversion generation but differs from the last verified current generation or member manifest, it cannot use the exact-recovery path and is not Asset Ownership Conversion. **Use Earlier Residue as Managed Replacement** presents the prior/current generation relationship and every provable format, dimensions, color, bit depth, structured-unit and member-manifest consequence before separate confirmation. Its one commit preserves the Design Asset and user-authored organization, makes the residue the current managed Original Asset and creates a new Source Content Generation. Current generation-bound generated evidence becomes stale under the existing source-change policy; no historical generation identifier or former analysis result is reactivated merely because the bytes match an earlier state.

<a id="0354-p004"></a>

Cancellation before commit leaves the unavailable referenced relationship and selected residue unchanged. Immediately before commit, the workflow rechecks the active library write owner, asset recovery state, residue identity and completeness, current generation evidence, managed destination safety and collisions. If the referenced source becomes healthy, another recovery changes the asset, or evidence changes, the plan expires for fresh review. Once commit begins it is reconciled rather than force-stopped; uncertain ownership, inventory, generation or group evidence enters **Residue-to-Managed Commit Recovery** and never exposes dual current ownership, a partial Compound Original, an automatically repeated commit or a guessed generation.

<a id="0354-p005"></a>

Success consumes only the selected residue into current managed ownership; other retained residue sets remain non-authoritative and separately reviewable rather than becoming a revision timeline. This ownership-conversion residue flow remains distinct from ADR 0364 Managed Metadata Writeback Recovery Points, whose use-as-current action requires the asset to remain Managed and creates a new protected managed generation without changing ownership. The former unavailable external path remains provenance only and grants no Retained Ownership Conversion Source cleanup authority because no exact file was present and verified there during recovery. If a file later appears at that path, it cannot reverse the managed recovery, relink itself or be deleted from old evidence; it follows ordinary discovery and Duplicate Signals after fresh validation.

<a id="0354-p006"></a>

The current application has no referenced-asset recovery-to-managed flow, residue selection, exact-generation residue activation, earlier-residue replacement or residue-to-managed commit recovery. This ADR records target architecture only and inspects, reads, validates, stages, copies, relates, restores, converts, moves, trashes, deletes or changes no runtime/user file, directory, database, cache, backup or system-trash item and changes no public IPC, database schema or AI Worker API.

<a id="adr-0355"></a>

## 0355 · Ownership Conversion Batches Use One Direction And Commit Per Asset

决定来源：[0355-ownership-conversion-batches-use-one-direction-and-commit-per-asset.md](../../adr/0355-ownership-conversion-batches-use-one-direction-and-commit-per-asset.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0355-p001"></a>

An **Asset Ownership Conversion Batch** is a coordinator for exactly one direction: every executable item is either Convert to Managed Asset or every executable item is Convert to Referenced Asset. It cannot mix directions, embed ADR 0354 Residue-to-Managed Recovery, infer conversion from a mixed ownership selection or include the same Design Asset twice. One selected single-file Original Asset contributes one **Asset Ownership Conversion Batch Item**; one Compound Original also contributes exactly one item whose primary, required and included optional members remain one complete group rather than member rows.

<a id="0355-p002"></a>

Before confirmation, one read-only batch review binds every item to its current Design Asset, Asset File Ownership, Source Content Generation, complete member manifest and direction-specific plan. Convert to Managed Asset items resolve managed allocation, peak staging and Storage Safety Reserve. Convert to Referenced Asset items are executable only after they have complete explicit safe destination plans under ADR 0356; the batch never guesses a folder, filename, compound layout, collision answer or shared source relationship. Cross-item same-asset, source, destination, ownership, volume or storage dependencies are detected before dispatch and block or isolate only the affected items. The review shows eligible and excluded items, source/destination consequences, projected bytes and whether success creates Retained Ownership Conversion Sources or Managed Ownership Conversion Residue.

<a id="0355-p003"></a>

One confirmation authorizes only copying, validation and the ownership commit for the displayed eligible items. Every item receives its own journal, staging where required, fresh pre-commit validation, atomic ownership/inventory/relationship commit and ADR 0351 Asset Ownership Conversion Recovery boundary. A committed item becomes usable immediately. One item's exclusion, stale evidence, collision, capacity failure, ordinary failure or recovery never rolls back committed items or stops unrelated safe items; a proven shared-path, destination-volume or library-safety dependency may pause only the affected dispatch lane until it is resolved.

<a id="0355-p004"></a>

Known inability to preserve a relevant volume's Storage Safety Reserve disables the affected confirmed scope until items or destinations change. If capacity or other evidence drifts after dispatch, the coordinator stops at the next safe item boundary, removes only proven attempt-owned incomplete staging and pauses affected remaining items with a fresh projection. It never frees space, lowers the reserve, switches ownership direction, deletes originals or treats already committed conversions as reclaimable. ADR 0278 may checkpoint remaining batch work for Library Switch while each item already inside a non-interruptible commit first settles or enters its normal recovery.

<a id="0355-p005"></a>

Batch cancellation durably stops unstarted items and may cancel a started item only before its single-item commit boundary, removing only its proven operation-owned staging. Committed items stay committed, and an item at or beyond an ambiguous commit reconciles instead of reporting cancellation. **Retry Failed Asset Ownership Conversions** creates fresh plans only for currently eligible failed or stale items; it never reruns converted items, auto-retries capacity, collision or recovery decisions, or repeats an ambiguous commit. The **Asset Ownership Conversion Batch Result** groups converted, excluded, stale, failed, Asset Ownership Conversion Recovery and cancelled Design Assets with direct item actions and never offers whole-batch rollback. Reversing a successful conversion is a new explicit conversion from current evidence.

<a id="0355-p006"></a>

Batch confirmation never authorizes post-conversion deletion. Convert to Managed Asset results independently enter ADR 0352 Keep And Exclude for exact former external sources; Convert to Referenced Asset results independently retain ADR 0353 Managed Ownership Conversion Residue. Releasing exclusions, cleaning retained external sources, cleaning managed residue and restoring either receipt class remain separately reviewed actions and cannot be remembered or applied automatically to the batch.

<a id="0355-p007"></a>

The current application has no general ownership conversion, conversion batch coordinator, direction-specific batch review, batch pause or batch result surface. This ADR records target architecture only and plans, stages, copies, validates, converts, restores, moves, trashes, deletes or changes no runtime/user file, directory, database, cache, backup, volume or system-trash item and changes no public IPC, database schema or AI Worker API.

<a id="adr-0356"></a>

## 0356 · Managed-To-Referenced Batches Review One Root And Every Final Path

决定来源：[0356-managed-to-referenced-batches-review-one-root-and-every-final-path.md](../../adr/0356-managed-to-referenced-batches-review-one-root-and-every-final-path.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0356-p001"></a>

A batch Convert to Referenced Asset begins with one user-selected safe external destination root and builds a read-only **Managed-to-Referenced Destination Plan** for every selected Managed Asset. The root is a convenience default for this batch, not a watched Source Root, In-Place Reference Library, Folder Collection Mapping, Collection hierarchy or retained preference. A user may assign another safe folder or edit the final name for any item before confirmation. The plan never copies Managed Originals Storage Buckets, Compound Original bucket placement, Collection Groups, Asset Collections, tags or Source Tree hierarchy into the destination.

<a id="0356-p002"></a>

Each single-file item proposes one path-safe **Reference Destination Readable Name** plus its validated real-format extension directly beneath its assigned folder. The proposal uses human-readable asset or filename provenance without exposing internal bucket labels, Original Storage Object Identity or the managed `--<disambiguator>` naming pattern, and the user sees and may edit the exact final name. Each Compound Original instead proposes one readable outer directory and preserves every capability-declared internal member name and relative relationship exactly; members are never flattened, independently renamed or emitted as separate assets. ADR 0357 keeps every member byte-exact and forbids generating metadata sidecars or embedding library values during this plan. All paths are checked against the live destination filesystem, current platform and complete compound layout before they become executable.

<a id="0356-p003"></a>

The confirmation page shows every final path, assigned root, single-file or complete-group bytes, destination-volume capacity and reserve projection, path-safety status, plan-internal collision and current destination occupant. A user may skip an item, change its name or choose another folder without affecting other items; every edit recalculates the affected paths, capacity and cross-item dependencies. Empty selection, inaccessible roots, links, protected application/library boundaries, unresolved capacity, unsafe paths or incomplete compound layouts remain non-executable rather than creating folders or staging speculatively.

<a id="0356-p004"></a>

An occupied or plan-colliding path enters **Managed-to-Referenced Destination Conflict Review**. A fully verified byte/member/manifest-identical regular file or exact complete group with no extra entries may offer **Use Existing Identical Conversion Destination**, but only after proving it is not a current source of another Design Asset or otherwise protected. Otherwise the non-destructive choices are Skip, choose another folder or **Publish Referenced Conversion With Unique Name**. The latter presents an exact safe vacant path; **Apply Unique Names To Current Conversion Conflicts** may materialize that choice across only the conflicts currently shown, but it still stores and revalidates one explicit path per item. It is never a standing rule for later collisions, and a newly occupied path returns only that item to review.

<a id="0356-p005"></a>

**Replace Referenced Conversion Destination** is available only for one separately reviewed regular-file occupant that is not a link, directory, special item, protected boundary, library-owned byte or proven current source. It is never preselected and has no Apply to All form. The item first builds and completely verifies destination-volume staging, journals the exact occupant and creates recovery evidence, then asks the operating system to move that occupant to trash before publishing staging. Failure to prove trash leaves staging and current managed ownership unchanged; proven trash followed by unproven publication or ownership commit enters **Conversion Destination Replacement Recovery**, attempts only evidence-safe restoration and never repeats trash or publishes from ambiguity. A successful replacement retains one device-local **Conversion Destination Replacement Receipt** under ADRs 0307 and 0308 so recovering the displaced external file never reverses conversion or overwrites the new source.

<a id="0356-p006"></a>

Immediately before each item executes, it revalidates the current managed generation and complete group, assigned root and volume, final path, capacity, occupant, collision choice and any replacement receipt authority. Drift expires only that item's path decision. Publication and ownership commit then follow ADRs 0351 and 0355; a successful item retains the old managed bytes as Managed Ownership Conversion Residue under ADR 0353, while failed, conflict, replacement-recovery and Asset Ownership Conversion Recovery items remain independently truthful. No destination-plan choice authorizes post-conversion residue cleanup.

<a id="0356-p007"></a>

The current application has no managed-to-referenced destination planner, readable external naming policy, conversion conflict review, unique-name batch application, replacement receipt or replacement recovery. This ADR records target architecture only and selects, creates, stages, copies, validates, converts, restores, moves, trashes, replaces, deletes or changes no runtime/user file, directory, database, cache, backup, volume or system-trash item and changes no public IPC, database schema or AI Worker API.

<a id="adr-0359"></a>

## 0359 · Metadata Writeback Conflicts Preserve Scalars And Append Keywords By Default

决定来源：[0359-metadata-writeback-conflicts-preserve-scalars-and-append-keywords-by-default.md](../../adr/0359-metadata-writeback-conflicts-preserve-scalars-and-append-keywords-by-default.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0359-p001"></a>

An **Original Metadata Writeback Review** creates a **Metadata Writeback Conflict** only when a freshly read supported target field contains a value that differs from the selected serialized library value. Empty targets and values proven identical under the exact format mapping are conflict-free. A title, description, rating, creator or copyright conflict defaults to **Keep Original Metadata Value**: that field leaves the current writeback while both the original-file value and library value remain unchanged. The explicit alternatives are **Use Library Metadata Value** or **Edit Shared Metadata Value**; neither is preselected, inferred from recency or remembered from another field, asset, format or prior operation.

<a id="0359-p002"></a>

Edit Shared Metadata Value validates one newly entered value against the same capability mapping and shows the exact library and file consequences. The original-file rewrite occurs through the protected writeback transaction first, and only proven source publication plus Source Content Generation commit may atomically commit the same value to the library metadata field. Cancellation, failure or ambiguous source publication leaves the prior library value unchanged rather than creating a false synchronized state. Keep Original Metadata Value resolves only the current plan and never imports the file value into the library or suppresses a future conflict.

<a id="0359-p003"></a>

A keyword conflict instead recommends **Append Library Keywords**. The planned result preserves the current source-file keyword order, appends the explicitly selected language-tagged Tag Concept labels and removes only duplicates proven by the target format's declared exact normalization. Case variants, different scripts, translations, aliases, homographs and semantically similar words remain distinct unless the user edits the reviewed output; no fuzzy, AI or concept mapping deletes source keywords. **Replace Original Keywords** remains a separate destructive field choice that shows every removed and retained serialized keyword before confirmation and never removes the Design Asset's Tag Concept memberships from the library.

<a id="0359-p004"></a>

One **Batch Conflict Resolution**, including inside an ADR 0360 Original Metadata Writeback Batch, may apply Keep Original Metadata Value, Use Library Metadata Value, Append Library Keywords or Replace Original Keywords only to a **Homogeneous Conflict Set** whose field type, target namespace/property, conflict reason, capability limits and available choices match. The Resolution Preview shows every affected asset and resulting field value; a mixed scalar/keyword set, different mappings, lossy limits, manual Edit Shared Metadata Value or item-specific source condition remains individual review. Applying a choice never creates a persistent format default or resolves conflicts that appeared after the preview.

<a id="0359-p005"></a>

Immediately before protected source mutation, writeback re-reads the current Source Content Generation, target bytes, mapped field values and capability. Drift invalidates only the affected choice and returns it to review; it never treats the library as the last writer. Source publication, new generation, stale derived evidence and recovery follow ADRs 0357 and 0358. ADR 0099 Conflict Resolution Undo may reverse only library-only metadata decisions; it never rolls back completed original-file bytes or a Source Content Generation. After successful writeback, changing the result requires a new explicit writeback/source operation, while a pre-write review choice remains freely editable or cancellable.

<a id="0359-p006"></a>

The current application has no source-field metadata reader/writer, Metadata Writeback Conflict, keyword serialization plan or writeback conflict batch surface. This ADR records target architecture only and reads, compares, merges, serializes, edits, embeds, stages, writes, rewrites, restores, exports, imports, deletes or changes no runtime/user file, sidecar, directory, database, metadata value, tag, analysis result or source relationship and changes no public IPC, database schema or AI Worker API.

<a id="adr-0360"></a>

## 0360 · Metadata Writeback Batches Resolve Fields And Commit Per Asset

决定来源：[0360-metadata-writeback-batches-resolve-fields-and-commit-per-asset.md](../../adr/0360-metadata-writeback-batches-resolve-fields-and-commit-per-asset.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0360-p001"></a>

An **Original Metadata Writeback Batch** begins only after the user selects Design Assets and one semantic **Metadata Writeback Field Set**, such as title, rating and keywords. The set names field meanings, not common EXIF/IPTC/XMP properties, shared serialized values or a format preset. Mixed JPEG, TIFF, PSD and other supported formats may participate because every item independently reads its own current library values, real format, Asset File Ownership, Source Content Generation and trusted capability mapping. The same Design Asset or physical Original Asset may appear only once; repeated or shared-source evidence blocks the affected entries rather than scheduling multiple writes to the same bytes.

<a id="0360-p002"></a>

Each Design Asset becomes one **Metadata Writeback Batch Item**. Its plan resolves the selected semantic fields into that item's current Writeback-Eligible Metadata Values, exact format-specific targets, serialized values, existing target values, conflicts, professional-structure consequences, staging capacity and ownership-specific write boundary. Missing library values are honest per-field no-ops; unsupported, lossy, ambiguous or capability-missing fields are excluded with reasons and may be removed from that item's plan without pretending they were written. An item becomes executable only after every remaining included field and ADR 0359 Metadata Writeback Conflict is resolved and at least one material or byte-identical candidate field remains.

<a id="0360-p003"></a>

All included fields for one item are serialized into one complete candidate output, staged and validated together, then published through one ownership-appropriate protected source operation. The batch never rewrites the same item once per field. A Compound Original is one item: only capability-declared affected members may be staged, but the entire member set and manifest revalidate before one group publication and generation outcome. A completely byte-identical candidate is a no-op with no receipt or new Source Content Generation. A material result commits at most one new generation for that item and stales generation-bound generated evidence under ADRs 0357 and 0358.

<a id="0360-p004"></a>

One item owns its staging, volume/source guards, publication journal, recovery evidence and current-generation commit. ADR 0362 requires a recoverable exact prior generation before a material Managed item may cross its source-write boundary; a qualifying Full Library Backup may supply that evidence without another local full-file duplicate, while a Referenced item follows its existing external old-source recovery rules. Written and byte-identical items become terminal immediately; unsupported/excluded fields, unresolved conflict review, staging or capacity failure, source drift, ordinary failure or recovery never rolls back a committed item or blocks unrelated safe items unless a proven shared source, path, volume or library-write dependency requires that lane to pause. ADR 0359 Batch Conflict Resolution may apply one choice only to currently homogeneous field conflicts and never becomes a remembered batch rule.

<a id="0360-p005"></a>

Batch cancellation durably stops unstarted items and may remove only proven attempt-owned staging before an item's protected source-write boundary. An item that crossed its first source publication/destructive boundary settles into success or its ownership-appropriate recovery state rather than cancellation or force rollback. **Retry Failed Metadata Writebacks** creates fresh item plans only for currently eligible failed or stale items; it never reruns written/byte-identical results, auto-resolves conflicts or capacity, or repeats ambiguous publication. ADR 0278 checkpoints remaining work for Library Switch at item boundaries while a non-interruptible source write settles first.

<a id="0360-p006"></a>

The **Metadata Writeback Batch Result** groups written, byte-identical, field/capability-excluded, conflict-review, failed, source-recovery and cancelled Design Assets with direct item actions. It offers no whole-batch rollback or source-byte undo. The batch cannot generate a new sidecar, invoke Attach Companion, perform Metadata Portability Export, import metadata, change Asset File Ownership, remember automatic writeback, run on future edits or broaden the ADR 0358 field set. ADR 0361 permits one mixed-ownership planning surface but splits Managed and Referenced items into separately confirmed sub-batches; every item records its ownership and may borrow no source-modification authority from another group.

<a id="0360-p007"></a>

The current application has no Original Metadata Writeback Batch, semantic field-set planner, per-item writeback staging or batch result/retry surface. This ADR records target architecture only and reads, compares, serializes, stages, writes, rewrites, restores, embeds, exports, imports, attaches, converts, moves, deletes or changes no runtime/user file, sidecar, directory, database, metadata value, tag, analysis result, source relationship or ownership state and changes no public IPC, database schema or AI Worker API.

<a id="adr-0361"></a>

## 0361 · Mixed-Ownership Writeback Plans Split Source Authorization

决定来源：[0361-mixed-ownership-writeback-plans-split-source-authorization.md](../../adr/0361-mixed-ownership-writeback-plans-split-source-authorization.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0361-p001"></a>

A selection containing both Managed Assets and Referenced Assets may enter one read-only **Mixed-Ownership Metadata Writeback Plan** and share one semantic Metadata Writeback Field Set. Planning groups every item by its current Asset File Ownership and produces a **Managed Metadata Writeback Sub-Batch** and a **Referenced Metadata Writeback Sub-Batch**; it does not make the selection one executable batch, copy or move an Original Asset, or change ownership. Ownership or source-generation drift makes only the affected item stale and requires a fresh plan under its current evidence.

<a id="0361-p002"></a>

Each sub-batch has an independent **Writeback Ownership Confirmation**. The Managed confirmation authorizes protected mutation of library-owned originals and presents the resulting managed generation, ADR 0362 recovery basis and storage consequences. The Referenced confirmation prominently identifies the user-owned external source paths and physical volumes, reports availability, permission and old-source recovery evidence, and separately authorizes mutation of those external bytes. Confirming either sub-batch never submits, authorizes or changes the other; the user may confirm one, both in separate actions, or neither.

<a id="0361-p003"></a>

Before either confirmation, a visible edit to the shared field selection may replan both ownership groups. Once one sub-batch is confirmed, its plan is frozen; later edits affect only an unconfirmed group and may not silently alter the confirmed work. Each sub-batch owns its own validation, cancellation boundary, execution, recovery, retry and result under ADR 0360 and the ownership-specific source-operation rules. A failure in one group does not roll back or misreport the other, although proven shared library, path, source or volume safety dependencies may pause an affected lane.

<a id="0361-p004"></a>

The application may present both outcomes in one activity record linked to the originating mixed plan, but the record must retain ownership badges, separate confirmation evidence and per-item outcomes. It is not one atomic transaction, one source-modification authorization, one undo unit or one ownership conversion. No writeback item changes Asset File Ownership, and an ownership conversion completed before that item's write boundary invalidates the item rather than transferring its earlier authority.

<a id="0361-p005"></a>

The current application has no Mixed-Ownership Metadata Writeback Plan, ownership-specific writeback sub-batches or Writeback Ownership Confirmation surface. This ADR records target architecture only and reads, compares, serializes, stages, writes, rewrites, restores, embeds, exports, imports, attaches, converts, moves, deletes or changes no runtime/user file, sidecar, directory, database, metadata value, tag, analysis result, source relationship or ownership state and changes no public IPC, database schema or AI Worker API.

<a id="adr-0363"></a>

## 0363 · Repeated Managed Writebacks Require Explicit Recovery-Point Disposition

决定来源：[0363-repeated-managed-writebacks-require-explicit-recovery-point-disposition.md](../../adr/0363-repeated-managed-writebacks-require-explicit-recovery-point-disposition.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0363-p001"></a>

When a material Managed Metadata Writeback needs a new local Managed Metadata Writeback Recovery Copy and the same Design Asset already has one or more local recovery copies, the item enters **Managed Writeback Recovery Point Review** before any source mutation. The review identifies every existing recovery generation, single-file or complete Compound Original set, health, creation context, accounted bytes and exact Full Library Backup coverage, together with the estimated new recovery bytes and resulting Storage Safety Reserve. Merely confirming another writeback never adds an undisclosed recovery generation or authorizes an older one to be removed.

<a id="0363-p002"></a>

The user may **Keep Multiple Managed Writeback Recovery Points** when capacity and reserve checks pass; **Preserve Prior Writeback Recovery Point In Backup** by selecting or completing a Full Library Backup that explicitly contains and verifies the exact prior recovery payload before local cleanup; **Replace Prior Managed Writeback Recovery Point** after a loss-of-that-recovery-point warning; or cancel the writeback. No destructive choice is selected by default, remembered for another asset or applied automatically to later writebacks. Repeated Keep choices may retain multiple generations, but every added local recovery point is separately visible and consented rather than becoming silent automatic revision history.

<a id="0363-p003"></a>

Replacing a prior point never overwrites its recovery bytes in place or lets the pending source write borrow its identity. When capacity permits, the new current-generation recovery copy validates before the selected older copy may enter ADR 0366 Clean Up Managed Writeback Recovery Point. When capacity does not permit both, the user may explicitly retire the selected older point first through that complete-set system-trash flow, but the current Original Asset remains unchanged and the metadata writeback stays blocked until the new recovery basis is fully created and validated. Cleanup failure, cancellation, insufficient space or a failed new copy leaves the source write unstarted rather than falling back to unprotected mutation.

<a id="0363-p004"></a>

A backup-preservation choice succeeds only after the archive manifest proves the exact Design Asset, Source Content Generation, complete member set and payload digests of the selected recovery point. An ordinary backup containing only the current Original Asset does not preserve a different prior recovery generation. Local cleanup may begin only after the qualifying archive is complete and revalidated; failure or cancellation preserves the local point and does not start metadata writeback. The resulting backup dependency remains visible wherever the local point would otherwise have appeared.

<a id="0363-p005"></a>

The review and each disposition are item-scoped. A batch may report multiple waiting items, but one item's retained, backed-up, replaced, failed or cancelled recovery decision grants no cleanup or write authority for another item. ADR 0362 continues to require a valid exact recovery basis at the final write boundary, and neither this decision nor a successful later writeback makes any recovery copy a cache or automatic storage-pressure target. ADR 0364 gives each healthy point separate export and use-as-current operations without turning this disposition review into source rollback; ADR 0365 makes consumption versus independent retention a new explicit choice when a local point is materially used.

<a id="0363-p006"></a>

The current application has no Managed Writeback Recovery Point Review, multi-generation recovery accounting, backup-preservation choice or recovery-point replacement workflow. This ADR records target architecture only and inspects, reads, validates, stages, copies, restores, moves, rewrites, trashes, clears, deletes or changes no runtime/user file, directory, database, cache, backup or system-trash item and changes no public IPC, database schema or AI Worker API.

<a id="adr-0364"></a>

## 0364 · Managed Writeback Recovery Points Export Or Return As A New Generation

决定来源：[0364-managed-writeback-recovery-points-export-or-return-as-a-new-generation.md](../../adr/0364-managed-writeback-recovery-points-export-or-return-as-a-new-generation.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0364-p001"></a>

A healthy local or backup-backed Managed Metadata Writeback Recovery Point offers two independent operations. **Export Managed Writeback Recovery Copy** writes the exact recovery payload to a user-selected external destination without changing the Design Asset, Asset File Ownership, current Original Asset, Source Content Generation or recovery-point retention. **Use Managed Writeback Recovery Point As Current** is a separately reviewed managed-source replacement, not undo, database rollback or historical-state reactivation.

<a id="0364-p002"></a>

Export resolves one explicit destination plan, validates the exact recovery generation and writes either the complete single file or the complete Compound Original member set and declared layout. Existing destination content is never silently overwritten or renamed; collision handling requires the ordinary visual destination-conflict choices and verified publication. Success creates ordinary untracked user-owned external files only. It does not create or relink a Referenced Asset, duplicate the Design Asset, attach companions, change the current generation or consume the recovery point. A backup-backed point first authenticates and extracts the selected exact payload into operation-owned safe staging; neither extraction nor export modifies the archive.

<a id="0364-p003"></a>

Use As Current is available only while the originating Design Asset is still a Managed Asset in the active library. If ownership has changed, the operation expires and offers export or a separately invoked ownership/recovery flow rather than silently converting the asset. Its **Managed Writeback Recovery Replacement Review** freshly compares the selected recovery generation with the current complete Original Asset, displays every provable format, dimensions, color, bit-depth, structured-unit, embedded-metadata and compound-member consequence, and establishes ADR 0362 recovery protection for the current generation before any replacement boundary.

<a id="0364-p004"></a>

The selected local point, or authenticated payload extracted from its Full Library Backup, is copied into complete operation-owned managed staging and revalidated against its recorded identity, bytes, real format, member roles and manifest. A Compound Original can return only as one complete group. A byte-identical candidate is a no-op that changes no generation. A material verified publication keeps the same Design Asset and Managed ownership but commits a new Source Content Generation even when its bytes match a former generation. It never reuses the former generation identifier, rewinds metadata history, erases intervening provenance or reactivates old preview, color, OCR, description, tag-suggestion, embedding or other generation-bound results; current user-authored library metadata remains governed by its normal rules.

<a id="0364-p005"></a>

Cancellation before the managed publication boundary leaves the current source and recovery point unchanged and removes only proven operation-owned staging. After that boundary, publication and current-generation evidence reconcile to one safe outcome rather than rolling back the database or guessing that old bytes became current. Failure to authenticate/extract a backup, validate a complete group, protect the current generation, reserve capacity or publish safely blocks only the affected operation. The source archive is never edited, and successful use of an ADR 0369 Backup-Protected Managed Writeback Recovery Point does not delete that generation from the backup.

<a id="0364-p006"></a>

ADR 0365 requires a separately disclosed, non-preselected Local Recovery Point Use Disposition before material publication. The user may consume a local point into the proven new current generation or retain it as an independent copy after complete capacity validation; failure or cancellation consumes neither. A backup-backed point remains in its immutable user-owned archive and creates no redundant local copy by default.

<a id="0364-p007"></a>

The current application has no Managed writeback recovery export, backup extraction, replacement review or recovery-point-to-current publication flow. This ADR records target architecture only and inspects, reads, authenticates, extracts, validates, stages, copies, restores, publishes, moves, rewrites, trashes, clears, deletes or changes no runtime/user file, directory, database, cache, backup or system-trash item and changes no public IPC, database schema or AI Worker API.

<a id="adr-0365"></a>

## 0365 · Use As Current Requires Explicit Local Recovery-Point Disposition

决定来源：[0365-use-as-current-requires-explicit-local-recovery-point-disposition.md](../../adr/0365-use-as-current-requires-explicit-local-recovery-point-disposition.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0365-p001"></a>

Before a material **Use Managed Writeback Recovery Point As Current** operation may publish a local recovery point, **Local Recovery Point Use Disposition** requires one explicit choice with neither option preselected or remembered. **Consume Managed Writeback Recovery Point Into Current** is shown as the storage-efficient recommendation: the selected bytes become the new current managed generation and the point ends its separate recovery role. **Keep Managed Writeback Recovery Point After Use** publishes a separately staged copy while retaining the selected point as independent recovery data and therefore requires the additional capacity and Storage Safety Reserve shown in review.

<a id="0365-p002"></a>

Consumption never deletes, moves or overwrites the selected recovery payload before success. ADR 0364 first revalidates the complete point, establishes ADR 0362 recovery protection for the currently active generation, and prepares the selected single-file or whole Compound Original set for protected publication. The recovery-point role may retire only in the same reconciled final outcome that proves the new Source Content Generation, complete managed current source and inventory state. Cancellation, validation failure, publication failure or an ambiguous commit keeps the point recoverable until reconciliation proves that consumption completed; it never leaves neither current nor recovery ownership for the selected bytes. Consumption is not ADR 0366 cleanup and creates no trash receipt because the selected bytes become current rather than being discarded.

<a id="0365-p003"></a>

Keep After Use retains the original recovery point identity and exact bytes unchanged. The current-source candidate uses independent complete staging, and admission includes the retained point, staging, displaced-current recovery basis and safety reserve rather than counting the same physical bytes twice. Insufficient capacity blocks that choice without switching to Consume, deleting another recovery point or writing the source. Neither choice changes the rule that the displaced current generation must have its own exact recovery basis; a qualifying existing Full Library Backup may satisfy that basis under ADR 0362.

<a id="0365-p004"></a>

A backup-backed recovery point cannot be consumed because the application does not own or mutate the archive. Its authenticated extraction follows ADR 0364, the Full Library Backup remains the recovery point, and no redundant local copy of the selected archived generation is created unless the user separately asks to retain one and capacity permits. The displaced current generation still receives its independent recovery basis before publication.

<a id="0365-p005"></a>

If the selected recovery bytes are already byte-identical to the current Original Asset, the operation is a no-op: no generation commits and no local recovery point is consumed, copied or reclassified. A completed material operation records the chosen disposition alongside the new-generation and displaced-current recovery evidence. The choice applies only to that point and attempt; batch selection, a recommendation label or a prior decision grants no disposition authority for another point.

<a id="0365-p006"></a>

The current application has no Local Recovery Point Use Disposition, recovery-point consumption commit or retained-after-use capacity plan. This ADR records target architecture only and inspects, reads, authenticates, extracts, validates, stages, copies, restores, publishes, moves, rewrites, trashes, clears, deletes or changes no runtime/user file, directory, database, cache, backup or system-trash item and changes no public IPC, database schema or AI Worker API.

<a id="adr-0366"></a>

## 0366 · Managed Writeback Recovery Point Cleanup Uses Complete-Set System Trash

决定来源：[0366-managed-writeback-recovery-point-cleanup-uses-complete-set-system-trash.md](../../adr/0366-managed-writeback-recovery-point-cleanup-uses-complete-set-system-trash.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0366-p001"></a>

**Clean Up Managed Writeback Recovery Point** is a separately confirmed Storage Management action for one local recovery point. Fresh inspection must prove the owning library and Design Asset, recovery-generation identity, library ownership, exact bytes, real format and every Compound Original member role and manifest, and must prove that none of the selected payloads is the current Original Asset, operation staging or shared by another recovery/current owner. Changed, missing, ambiguous, incomplete or multiply owned evidence blocks destructive confirmation rather than guessing from a path, filename, timestamp, visual similarity or digest alone.

<a id="0366-p002"></a>

Confirmation identifies the complete single-file or compound recovery set, its accounted logical bytes and the distinction between removing it from library recovery storage and later physical reclamation by the operating system. The application journals one cleanup intent and requests operating-system trash separately for each proven member; it does not permanently delete payloads, delete a parent directory, empty operating-system trash, silently keep only a primary member or automatically rename a collision. The recovery point leaves active local recovery inventory only after every member has a proven trash outcome.

<a id="0366-p003"></a>

Every successfully trashed member receives a device-local restore handle inside one **Managed Writeback Recovery Point Trash Receipt Set**. A failed, interrupted or ambiguous member call never counts as success and never retries automatically. Partial outcome enters **Managed Writeback Recovery Point Cleanup Recovery**, retains the complete point/member evidence and offers only freshly revalidated continuation or receipt-scoped complete-set restoration. Cache cleaning, storage pressure, Library Switch, settings reset and application/plugin maintenance cannot clear the receipt, handles or unresolved recovery state; Forget Library Registration and Uninstall Preparation follow ADR 0299.

<a id="0366-p004"></a>

**Restore Cleaned Managed Writeback Recovery Point** requires the originating library and every currently provable member handle, restores into safe vacant library-managed recovery storage, validates the exact complete set and then reinstates only the recovery-point role. It never overwrites an occupant, generates a name, changes the current Original Asset, Source Content Generation, Asset File Ownership, metadata, preview/analysis evidence or Design Asset lifecycle. Making the restored bytes current remains the separate ADR 0364 operation and ADR 0365 disposition.

<a id="0366-p005"></a>

Storage Management reports library-logical release after the complete point leaves its active recovery inventory, but reports physical bytes as pending while the operating system still retains the trashed payloads. Only authoritative filesystem evidence may later report actual reclamation; the application neither claims that moving to trash freed physical space nor empties system trash on the user's behalf. Receipt retirement never empties or modifies operating-system trash and occurs only after successful complete-set restoration, explicit warning-backed clearing or authoritative proof that the exact trash items no longer exist.

<a id="0366-p006"></a>

ADR 0353 applies similar complete-set safety to Managed Ownership Conversion Residue, but the two inventories and receipts remain distinct: cleaning a metadata-writeback recovery point grants no ownership-conversion residue authority, and cleaning conversion residue grants no writeback-recovery authority. ADR 0367 coordinates multiple writeback recovery points while preserving this ADR's complete-set commit, cancellation and recovery boundary independently for every point.

<a id="0366-p007"></a>

The current application has no Managed writeback recovery-point cleanup, trash receipt set, cleanup-recovery state or receipt-scoped restore workflow. This ADR records target architecture only and inspects, reads, validates, stages, copies, restores, publishes, moves, rewrites, trashes, clears, deletes or changes no runtime/user file, directory, database, cache, backup or system-trash item and changes no public IPC, database schema or AI Worker API.

<a id="adr-0367"></a>

## 0367 · Managed Writeback Recovery Cleanup Batches Commit Per Point

决定来源：[0367-managed-writeback-recovery-cleanup-batches-commit-per-point.md](../../adr/0367-managed-writeback-recovery-cleanup-batches-commit-per-point.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0367-p001"></a>

A **Managed Writeback Recovery Cleanup Batch** begins only after the user selects one or more local Managed Metadata Writeback Recovery Points in Storage Management and confirms the exact currently eligible set. Each distinct single-file recovery point or complete Compound Original recovery point becomes one **Managed Writeback Recovery Cleanup Batch Item**; one point may appear only once, and shared, repeated, current-source, operation-owned, ambiguous or cross-owned payload evidence blocks the affected selections rather than scheduling multiple trash requests for the same bytes.

<a id="0367-p002"></a>

Preflight freshly resolves every item's owning library and Design Asset, recovery generation, complete member set, health, exact accounted bytes, physical volume, trash capability and current eligibility under ADR 0366. The confirmation separates eligible, blocked and already unavailable points and reports expected library-logical release independently from physical reclamation that remains pending in operating-system trash. Excluded points are never silently dropped into the executable count, and the batch cannot select a primary member without its complete recovery set.

<a id="0367-p003"></a>

Every item owns its cleanup intent, member-level trash calls, device-local receipt set, recovery state and terminal outcome. An item commits as cleaned only after all of its members have proven trash outcomes; failure, interruption or ambiguity after any member call enters that item's Managed Writeback Recovery Point Cleanup Recovery without rolling back or blocking unrelated safe items. Trash-affecting work is serialized where a shared library-write or physical-volume safety dependency requires it, while independent safe items may progress without creating one cross-item transaction.

<a id="0367-p004"></a>

Batch cancellation durably stops unstarted items and items that have not issued their first operating-system trash request. An item that crossed that first destructive boundary must settle as cleaned or in cleanup recovery and is never force-cancelled or reported as merely skipped. Library Switch follows ADR 0278 at item boundaries: the current non-interruptible member-set operation first reaches a durable result, and remaining work checkpoints for the owning library.

<a id="0367-p005"></a>

**Retry Failed Managed Writeback Recovery Cleanups** creates fresh plans only for currently eligible failed, blocked-by-transient-evidence or pre-boundary cancelled items explicitly selected by the user. It never reruns successfully cleaned points, repeats ambiguous trash calls, operates on an item still in cleanup recovery, remembers prior eligibility or assumes that system trash still holds an earlier receipt. Changed ownership, generation, membership, health, bytes, volume or receipt evidence returns only the affected point to review.

<a id="0367-p006"></a>

The batch result groups cleaned, blocked/excluded, failed, cleanup-recovery and cancelled points with exact per-item logical bytes and physical-reclamation status. It has no whole-batch rollback or automatic undo. Receipt-scoped ADR 0366 restoration remains an explicit complete-set action for each cleaned point; restoring one item neither restores another nor reverses the batch. The batch never permanently deletes payloads, empties operating-system trash, clears restore handles, consumes a point into current, changes Asset File Ownership or reports pending trash bytes as physically reclaimed. ADR 0368 may originate this batch from a mixed Managed Recovery Storage selection, but keeps its confirmation and authority separate from ownership-conversion residue cleanup.

<a id="0367-p007"></a>

The current application has no Managed writeback recovery cleanup batch, per-point batch item, mixed result or failed-item retry. This ADR records target architecture only and inspects, reads, validates, stages, copies, restores, publishes, moves, rewrites, trashes, clears, deletes or changes no runtime/user file, directory, database, cache, backup or system-trash item and changes no public IPC, database schema or AI Worker API.

<a id="adr-0368"></a>

## 0368 · Mixed Managed Recovery Storage Cleanup Splits Authority By Type

决定来源：[0368-mixed-managed-recovery-storage-cleanup-splits-authority-by-type.md](../../adr/0368-mixed-managed-recovery-storage-cleanup-splits-authority-by-type.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0368-p001"></a>

Storage Management may present Managed Metadata Writeback Recovery Points and Managed Ownership Conversion Residue in one **Managed Recovery Storage** page and allow one mixed local selection. That selection creates a read-only **Mixed Managed Recovery Storage Cleanup Plan** which groups every exact recovery set by its current recovery-data type, ownership evidence and cleanup contract. The plan does not make different recovery classes one executable batch, one receipt inventory or one deletion authorization. ADR 0369 displays backup-protected recovery points in a separate zero-local-byte section that cannot enter this local cleanup plan.

<a id="0368-p002"></a>

The plan produces a separately confirmed **Writeback Recovery Cleanup Sub-Batch** governed by ADRs 0366–0367 and a separately confirmed **Ownership Conversion Residue Cleanup Sub-Batch** governed by ADR 0353. Each confirmation displays its own selected and excluded complete sets, logical bytes, pending physical-reclamation consequences, current health requirements and restore meaning. The user may confirm either sub-batch, both through separate actions, or neither; confirming one never submits, authorizes, cancels, retries or changes the other.

<a id="0368-p003"></a>

Each complete single-file or Compound Original recovery/residue set remains one independently committed item inside its type-specific sub-batch. The ownership-conversion residue sub-batch applies ADR 0353 complete-set validation, system-trash receipt and cleanup-recovery rules per residue set just as the writeback sub-batch preserves ADR 0367 per-point boundaries. A failure or partial member outcome in either class affects only that item unless fresh evidence proves a shared physical payload, library-write boundary or volume safety dependency. Any cross-type shared, duplicate or ambiguous payload evidence blocks every affected item from both sub-batches rather than granting one class authority to trash bytes claimed by another.

<a id="0368-p004"></a>

The application may show one activity record linked to the originating mixed plan, but it retains recovery-type badges, separate confirmations, exact per-item outcomes, logical-versus-physical byte status and distinct receipt/recovery actions. The record is not one atomic transaction, deletion permission, undo unit, restore action or retry plan. Cancellation and retry remain type-specific and item-scoped; no shared “clean all” decision is remembered for later selections.

<a id="0368-p005"></a>

Cleaning a writeback recovery point never grants authority over ownership-conversion residue or changes Asset File Ownership. Cleaning conversion residue never clears metadata-writeback recovery, makes a prior generation current or satisfies a writeback recovery basis. Both remain recovery data rather than cache, and neither sub-batch permanently deletes payloads or empties operating-system trash.

<a id="0368-p006"></a>

The current application has no Managed Recovery Storage page, mixed recovery cleanup plan, type-specific cleanup sub-batches or unified cross-type result. This ADR records target architecture only and inspects, reads, validates, stages, copies, restores, publishes, moves, rewrites, trashes, clears, deletes or changes no runtime/user file, directory, database, cache, backup or system-trash item and changes no public IPC, database schema or AI Worker API.

<a id="adr-0369"></a>

## 0369 · Backup-Protected Recovery Points Are Indexed Not Locally Cleaned

决定来源：[0369-backup-protected-recovery-points-are-indexed-not-locally-cleaned.md](../../adr/0369-backup-protected-recovery-points-are-indexed-not-locally-cleaned.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0369-p001"></a>

Managed Recovery Storage presents a separate **Backup-Protected Managed Writeback Recovery Point** section for exact prior generations preserved in Full Library Backup. Each row identifies the owning Design Asset and generation, complete single-file or Compound Original set, archive identity and user-facing location/volume context, archived bytes, last verified time and current available, unavailable, changed or unverified state. Its local recovery-storage usage is zero because the payload remains inside the user-owned backup archive; archived bytes are reported as backup contents rather than local recovery data.

<a id="0369-p002"></a>

A backup-protected point is never eligible for Clean Up Managed Writeback Recovery Point, mixed local cleanup selection, operating-system trash requests or physical-reclamation claims. Its actions are limited to locating or reselecting and revalidating the archive, ADR 0364 export, ADRs 0364–0365 Use As Current, and **Forget Backup Recovery Association**. Export or Use As Current authenticates and verifies the exact archive generation before operation-owned extraction; ordinary listing does not create a persistent local duplicate, and successful use never mutates or deletes the archive.

<a id="0369-p003"></a>

Forget Backup Recovery Association removes only the active library index and device-local location/verification evidence that makes the point available through this recovery surface. Confirmation names every affected point, warns that its app recovery entry and any pending plan relying on it will disappear, and blocks while an extraction, export, use-as-current or source-write preflight actively depends on the association. It never edits, truncates, moves, trashes, deletes or invalidates the Full Library Backup and never claims that archived bytes were reclaimed. The current Original Asset and every committed generation remain unchanged.

<a id="0369-p004"></a>

**Rediscover Backup-Protected Recovery Points** begins only after the user explicitly reselects a compatible archive. Authentication, library-lineage and manifest validation may reconstruct exact point associations from preserved Design Asset, Source Content Generation, member-role and payload-digest evidence, including associations previously forgotten on this device. Rediscovery creates no current source, local recovery copy, metadata import, ownership conversion or generation change and cannot infer a point from filename, archive location, timestamp or visual similarity alone.

<a id="0369-p005"></a>

An unavailable or externally deleted backup makes its indexed points unavailable without deleting their minimal recovery provenance or changing the current asset. ADR 0370 separates passive handle-based presence, manifest verification and selected complete-payload verification; selected payload revalidation must succeed before the point can satisfy ADR 0362, export or return as current. A replaced or changed archive with the same path is never trusted as the previous backup; it requires fresh identity and manifest evidence and may rediscover different points. Forgetting an unavailable association is still explicit and does not authorize broad device, network or backup-location scanning.

<a id="0369-p006"></a>

The current application has no backup-protected recovery index, zero-local-byte recovery section, forget-association action or manifest rediscovery workflow. This ADR records target architecture only and locates, opens, authenticates, reads, indexes, validates, extracts, stages, copies, restores, publishes, moves, rewrites, trashes, clears, deletes or changes no runtime/user file, directory, database, cache, backup or system-trash item and changes no public IPC, database schema or AI Worker API.

<a id="adr-0370"></a>

## 0370 · Backup Recovery Availability Uses Passive, Manifest And Selected-Payload Tiers

决定来源：[0370-backup-recovery-availability-uses-passive-manifest-and-selected-payload-tiers.md](../../adr/0370-backup-recovery-availability-uses-passive-manifest-and-selected-payload-tiers.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0370-p001"></a>

Backup-Protected Managed Writeback Recovery Points use three explicit evidence tiers. **Passive Backup Recovery Availability** may observe only saved device-local file/volume handles and operating-system availability events. It may update a point between possibly available and unavailable without scanning directories or devices, enumerating backups, mounting or connecting a network volume, waking sleeping storage, authenticating an archive, reading its manifest or opening recovery payloads. Passive presence is a hint, never proof that a recovery point is usable.

<a id="0370-p002"></a>

Opening Managed Recovery Storage or invoking manual refresh may perform **Backup Recovery Manifest Verification** for the exact associated archive. It validates the archive identity, encryption/authentication header, library lineage, manifest integrity and declared Design Asset, Source Content Generation, member-role and payload-digest entries without reading every large PSD, TIFF, PSB or other payload. If required credentials are unavailable, the archive remains locked/unverified rather than prompting from background work or weakening authentication. A manifest-verified point is still labelled payload-unverified until selected content is checked.

<a id="0370-p003"></a>

Immediately before a point may satisfy ADR 0362, export under ADR 0364 or return as current, **Selected Backup Recovery Payload Verification** reads only the selected complete single-file or Compound Original payload set, authenticates and compares every declared byte digest, real format, member role and manifest relationship, and rechecks archive identity near the operation boundary. Unselected recovery payloads are not read merely because they share an archive. Verification evidence may accelerate the current reviewed attempt, but a stale session, changed archive, volume disconnect, Library Switch or new operation requires fresh boundary evidence rather than a remembered success.

<a id="0370-p004"></a>

The page distinguishes passive presence, manifest verified, locked, offline/unavailable, archive changed, manifest invalid and selected-payload verified states. None of these availability changes deletes an association, recovery provenance, Full Library Backup or current asset. Offline and unverified points remain visible with locate/reselect and manual verification actions; changed or invalid evidence blocks use but never guesses from a matching path, filename, timestamp or archive size.

<a id="0370-p005"></a>

No verification tier automatically mounts network storage, retries credentials, downloads an archive, refreshes unrelated catalogs, writes persistent extracted content or modifies the Full Library Backup. Operation-owned selected extraction follows the existing capacity, staging and cleanup rules only after explicit export/use intent. Background availability work remains content-free and does not disclose archive paths, recovery metadata or asset contents through notifications or logs.

<a id="0370-p006"></a>

The current application has no backup-recovery availability handle, manifest-only recovery verification or selected-payload verification flow. This ADR records target architecture only and locates, scans, mounts, connects, wakes, opens, authenticates, reads, indexes, validates, extracts, stages, copies, restores, publishes, moves, rewrites, trashes, clears, deletes or changes no runtime/user file, directory, database, cache, backup, network volume or system-trash item and changes no public IPC, database schema or AI Worker API.
