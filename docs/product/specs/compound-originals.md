# Copy与复合原件：详细能力契约

本文承接原ADR中的细节，保留所有原数字、例外、状态和相互约束；[来源映射](../../checkpoints/documentation-rebuild-20261015/adr-migration.json)逐段核对。**有效要求不是当前交付声明，也不是本轮实施队列。** 现行已批准产品/设计在其明确替代范围内优先；不凭实现缺失判决定无效。

当前系统从[storage-intake](../../subsystems/library-lifecycle.md#intake)进入；当前实际能力/版本见[CURRENT-STATE](../../handoff/CURRENT-STATE.md)，交互与视觉分别归[交互目录](../../design/README.md)/[DESIGN](../../../DESIGN.md)。详细条款按下面独立主题定位，不全量装入每次上下文。

## 主题导航

- [0336 · Copy Folder Mapping Materializes Only At Candidate Promotion](#adr-0336)
- [0337 · Folder Mapping Conflicts Require Explicit Reuse Rename Or Skip](#adr-0337)
- [0338 · Copy Folder Plans Do Not Follow Directory Indirection](#adr-0338)
- [0343 · Compound Recovery Uses Member Publish Or Complete Directory Rebuild](#adr-0343)
- [0345 · Referenced Compound Source Paths Move Through One Group Plan](#adr-0345)
- [0346 · Referenced Compound Source Deletion Commits After Every Member Reaches OS Trash](#adr-0346)
- [0347 · Referenced Compound Source Rewrite Validates The Whole Group Before Member Publication](#adr-0347)
- [0349 · Post-Admission Companions Require Explicit Validated Attachment](#adr-0349)

<a id="adr-0336"></a>

## 0336 · Copy Folder Mapping Materializes Only At Candidate Promotion

决定来源：[0336-copy-folder-mapping-materializes-only-at-candidate-promotion.md](../../adr/0336-copy-folder-mapping-materializes-only-at-candidate-promotion.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0336-p001"></a>

When Copy Into Library contains at least one selected folder, its Copy Into Library Plan visibly defaults **Create Collections From Folders** on while allowing the user to turn it off before confirmation. The mapping preview shows selected roots and depth, proposed Collection Groups and Asset Collections, affected candidate counts, name collisions and unmapped files. A loose-file-only selection defaults the option off and continues to use ordinary Candidate Promotion targets. The setting is part of this reviewed plan only; it is not silently remembered as an application, library, source or plugin default.

<a id="0336-p002"></a>

Confirmation stores one **Folder Collection Mapping Intent** with each affected Candidate Identity but creates no Collection Group, Asset Collection, Collection Membership or physical folder mirror. Each intent binds only the reviewed relative folder position and proposed collection target identities needed for that Candidate; it neither makes the external folder a Source Tree nor creates continuing monitoring or synchronization. Copying still places managed originals under ADR 0285 through ADR 0291 storage buckets, so later external-folder or managed-original moves, renames and deletions do not restructure collection organization.

<a id="0336-p003"></a>

At Candidate Promotion, a promotion-time user-selected target has highest priority; otherwise the confirmed mapping intent precedes Collection Suggestion, current workspace context and Unsorted Collection under ADR 0032. The promotion transaction creates or reuses only the reviewed Collection Group/Asset Collection nodes required by that successfully promoted Candidate and commits its Collection Membership item-atomically. Failed, excluded, cancelled, rejected or never-promoted Candidates therefore create no empty collection hierarchy. A user may override one or multiple candidates during promotion without rewriting other candidates' intents, and later ordinary collection editing remains independent from the source folders.

<a id="0336-p004"></a>

Plan-time name collisions enter ADR 0337 Folder Mapping Conflict Review and cannot be silently merged, suffixed or replaced. Unmapped candidates simply fall through the normal ADR 0032 target order rather than blocking Copy Into Library. The current application has no Copy Into Library folder-mapping plan or candidate-bound deferred mapping intent. This ADR records target architecture only and selects, scans, copies, creates, renames, maps, modifies or deletes no runtime/user file, Candidate, Collection or membership and changes no public IPC, database schema or AI Worker API.

<a id="adr-0337"></a>

## 0337 · Folder Mapping Conflicts Require Explicit Reuse Rename Or Skip

决定来源：[0337-folder-mapping-conflicts-require-explicit-reuse-rename-or-skip.md](../../adr/0337-folder-mapping-conflicts-require-explicit-reuse-rename-or-skip.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0337-p001"></a>

A Copy Into Library Plan enters **Folder Mapping Conflict Review** whenever a proposed folder-derived node conflicts with existing library organization at the same reviewed position. The review shows the complete proposed and existing hierarchy, node names and object kinds, affected candidate counts, and downstream branches. Every conflict requires one explicit choice before the mapping plan can be confirmed: **Reuse Existing**, **Create With New Name**, or **Skip This Mapping**. Copying itself is not classified as failed merely because one mapping is skipped or later needs renewed review.

<a id="0337-p002"></a>

Reuse Existing is available only when the existing and proposed objects are the same kind and the user deliberately selects the shown existing identity. Equal text never establishes semantic equivalence, and an Asset Collection cannot be reused as a Collection Group or vice versa. Create With New Name requires an editable collision-free name and previews the resulting hierarchy; the application may suggest a unique name but never selects or commits a suffix automatically. Skip This Mapping removes the affected branch's mapping intent and lets its candidates use the ordinary ADR 0032 collection-target order, including Unsorted Collection when no other target exists. None of the choices renames, moves, merges, replaces or deletes an existing collection object.

<a id="0337-p003"></a>

One resolution may be applied across a Homogeneous Conflict Set only when proposed kind, existing kind, conflict reason and available choices match under ADR 0100. The review previews every resulting reuse, name or skipped candidate scope before accepting the shared choice; heterogeneous or newly divergent conflicts remain independent. Batch handling never treats visual name similarity as identity, crosses library boundaries, or applies one Collection target to otherwise unrelated folder branches.

<a id="0337-p004"></a>

The application revalidates the resolved target identities and hierarchy immediately before each Candidate Promotion. A still-matching reviewed target may be created or reused item-atomically under ADR 0336. If an expected object was renamed, moved, deleted, replaced by another identity, changed kind or newly collides, only affected candidates enter renewed Folder Mapping Conflict Review or explicit collection-target selection. Their copied Candidate Artifacts remain valid and active; unaffected candidates continue, and no stale name is followed, no automatic fallback is selected, and no committed copy is rolled back. The current application has no Folder Mapping Conflict Review or promotion-time mapping-target revalidation. This ADR records target architecture only and reads, creates, reuses, renames, moves, merges, replaces or deletes no runtime/user file, Candidate, collection object or membership and changes no public IPC, database schema or AI Worker API.

<a id="adr-0338"></a>

## 0338 · Copy Folder Plans Do Not Follow Directory Indirection

决定来源：[0338-copy-folder-plans-do-not-follow-directory-indirection.md](../../adr/0338-copy-folder-plans-do-not-follow-directory-indirection.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0338-p001"></a>

A Copy Into Library Plan recursively enumerates ordinary files below each explicitly selected folder through a bounded read-only walk. It imposes no extension allowlist, arbitrary product-level file-count limit or fixed original-byte cap: unknown extensions still receive real-format evidence checks, and ADR 0120 Capacity-Aware Artifact Admission rather than file size decides whether a supported original can be committed. Enumeration may stream its inventory and estimates, but every selected/discovered entry kept outside the batch appears as a **Copy Scope Exclusion** with a visible reason instead of being silently ignored.

<a id="0338-p002"></a>

Recursive discovery never follows directory symbolic links, Windows junctions or reparse-point directory indirection, Finder aliases that resolve to directories, loops, mount redirections, or another path that escapes the reviewed roots. Such entries are exclusions even when their target appears readable. A file link is considered only when the user selects that file link directly rather than when it is encountered during folder recursion; the plan must visibly disclose its resolved target, prove a stable safe regular file outside every mandatory exclusion boundary, and bind the reviewed target for later item validation. A changed, unresolved, chained, non-regular or newly unsafe target excludes or stops only that item and is never replaced by path guessing.

<a id="0338-p003"></a>

Operating-system metadata, application control/cache/temporary/runtime/model/plugin roots, the active or another known Library Control Directory, every Managed Originals Directory, and nested portable-library boundaries are always excluded, including when selected directly. The plan neither scans through nor copies those trees. Ordinary hidden files are excluded by default, and hidden directories are not traversed by default; a visible **Include Hidden Files** choice may include ordinary hidden entries within the same reviewed roots, but never includes system metadata or any mandatory boundary.

<a id="0338-p004"></a>

A directory-backed package, application bundle or special system-library container is not recursively entered as an ordinary folder. It may become one Candidate Artifact only when an explicit Capture Format Capability defines the complete package as one atomic supported asset and also proves compatible copy verification, managed-original storage, safety and System Preview behavior; an extension or operating-system package flag alone is insufficient. Until that capability exists, the package is a visible Copy Scope Exclusion and is never silently archived, flattened, transcoded or decomposed.

<a id="0338-p005"></a>

Confirmation freezes the enumerated membership of the Copy Into Library Plan, not the external bytes: files added later are outside that batch, while each planned item is freshly identity/readability/format validated before copying. Missing, changed or replaced items get truthful item outcomes and do not cause an automatic rescan or capture newly appeared siblings; including new entries requires an explicit refreshed plan. The current application has no ownership-aware Copy Into Library scope enumerator or these package/link/hidden-entry exclusions. This ADR records target architecture only and selects, resolves, traverses, reads, copies, packages, archives, modifies or deletes no runtime/user file or directory and changes no public IPC, database schema or AI Worker API.

<a id="adr-0343"></a>

## 0343 · Compound Recovery Uses Member Publish Or Complete Directory Rebuild

决定来源：[0343-compound-recovery-uses-member-publish-or-complete-directory-rebuild.md](../../adr/0343-compound-recovery-uses-member-publish-or-complete-directory-rebuild.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0343-p001"></a>

Compound Original recovery chooses one reviewed physical plan rather than treating every repair as either a cheap overwrite or a full directory copy. **Compound Member Repair** is eligible only when exactly one declared member is absent, its exact required final path is proven vacant, the current Compound Original Directory and every retained member remain stable and valid, no relative-layout change is required, and the destination volume can preserve Storage Safety Reserve. Any occupied/ambiguous destination, multiple-member repair, layout change, unprovable retained member, or missing/unsafe complete directory requires **Compound Directory Rebuild** instead.

<a id="0343-p002"></a>

Compound Member Repair copies the explicitly selected member into attempt-owned staging on the same volume, verifies its bytes and role, then validates the complete proposed group using the staged member plus freshly re-read retained members. Immediately before commit it rechecks the library lock, recovery state, directory/member identities, exact vacancy, path budgets, capability relationship and reserve. One atomic member rename publishes the file; the group journal then coordinates its member inventory, availability and exact-prior or replacement Source Content Generation outcome. It allocates no new bucket position and never overwrites, merges with, renames or removes an occupant. If a crash exposes the exact expected member before the state commit, reconciliation proves its recorded identity/digest and either finalizes that same attempt or keeps the group in recovery without copying again.

<a id="0343-p003"></a>

When a current occupant already forms a complete valid group, exact prior bytes may restore availability under ADR 0283. Different valid bytes may be adopted in place only through the explicit ADR 0342 Use as Replacement decision, creating one new group Source Content Generation without a file write. If the user instead selects different recovery input, the application cannot replace that occupant in place and must use Compound Directory Rebuild.

<a id="0343-p004"></a>

Compound Directory Rebuild reserves one new permanent ADR 0286 bucket allocation position, stages a complete new Compound Original Directory on the destination volume, and copies every retained authoritative member plus every explicitly supplied recovery member into the declared layout. It verifies the complete directory, real formats, identities, digests, relationship, paths and projected post-commit Storage Safety Reserve before atomic publication. The new directory may retain the same Compound Original Identity-derived ADR 0287 name in its different bucket because the group identity has not changed; it never invents a generation suffix or new Design Asset merely to distinguish physical attempts.

<a id="0343-p005"></a>

The rebuild journal has one authority-switch boundary. Before that boundary, the old directory/group state remains authoritative and a published-but-uncommitted new directory is attempt-owned reconciliation work, not a second asset. After the switch, the new complete directory remains authoritative even if cleanup fails; cleanup failure never rolls back valid recovered content or reactivates the old path. Replay never advances the new bucket allocation twice, chooses another name, repeats an external copy, or guesses which directory is current.

<a id="0343-p006"></a>

An old directory left after the authority switch becomes **Superseded Compound Directory Residue**. It is not the current Original Asset, another Design Asset, a retained content generation, preview/analysis input, Original Handoff source, Reference Source or generic cache. It remains visibly accounted as recovery residue and is never automatically deleted by cache pressure, retention, restart, Library Switch, settings reset, plugin removal or ordinary storage cleanup.

<a id="0343-p007"></a>

Cleanup is always a later explicit review. If fresh inventory proves the old directory contains exactly the unchanged former group-owned entries, the user may request moving that complete directory to operating-system trash. If unknown, changed or unproven entries exist, the application never trashes the directory: review distinguishes proven superseded members from unknown entries and offers leaving it in place, revealing it in Finder/Explorer, or separately trashing only exact revalidated superseded members. Unknown entries are never adopted, moved or deleted; an application-created directory may be removed only after it is proven empty. Cleanup success or failure changes no current group identity or generation.

<a id="0343-p008"></a>

The recovery plan displays member-only versus full-rebuild mode, exact input/retained bytes, complete staging and duplicate-space requirements, the new permanent allocation when applicable, projected reserve, old-directory residue consequence and unavailable reasons before confirmation. Insufficient or unassessable space leaves the group in its prior recovery/degraded state and never downgrades an unsafe rebuild into member repair, cleans other storage automatically, writes outside the active library or converts ownership.

<a id="0343-p009"></a>

The current application has no Compound Member Repair, Compound Directory Rebuild, authority-switch journal or superseded-directory cleanup review. This ADR records target architecture only and allocates, stages, reads, hashes, copies, publishes, switches, opens, moves or deletes no runtime/user file, directory, database, cache or backup and changes no public IPC, database schema or AI Worker API.

<a id="adr-0345"></a>

## 0345 · Referenced Compound Source Paths Move Through One Group Plan

决定来源：[0345-referenced-compound-source-paths-move-through-one-group-plan.md](../../adr/0345-referenced-compound-source-paths-move-through-one-group-plan.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0345-p001"></a>

Moving or renaming any member of a Referenced Compound Original requires one **Referenced Compound Source Path Operation** rather than invoking Relocate Referenced Source or Transfer Referenced Source Across Volumes on individual members. Its **Referenced Compound Source Path Plan** binds the current Compound Original identity, Source Content Generation, capability/member manifest and every included Referenced Compound Member Relationship, then shows each role's current source, required/optional state, physical volumes and one explicit Keep in Place, same-volume Relocate or cross-volume Transfer outcome. Every current member must appear; required members cannot be omitted, and ADR 0350 keeps optional-member removal as a separate generation-changing manifest action rather than an unchecked move option. Keep in Place is valid only when the capability proves the complete resulting relationship remains valid.

<a id="0345-p002"></a>

The user chooses the primary target. An active verified format capability may derive companion destinations or required relative names only when its contract defines that mapping exactly; every derived row is labeled and reviewable. Otherwise the user maps each companion role explicitly. Filename similarity, adjacency, prior layout, directory selection, plugin suggestion or a previous operation never fills a missing target. Before confirmation the plan validates every source identity, path/extension budget, boundary, permission, physical volume, target uniqueness, capacity and complete capability relationship without creating files or changing Source Tree.

<a id="0345-p003"></a>

Any occupied, duplicated, unsafe or relationship-incompatible target opens **Referenced Compound Source Path Conflict Review** for the complete plan. The user may choose another complete mapping or explicitly apply an eligible identical-destination, reviewed unique-name or replacement outcome to an affected row, but the revised full plan must validate again before execution. Existing ADR 0304 and ADR 0311 identity, trash-before-replacement and recovery safeguards remain minimum requirements; their single-file commands are not invoked independently against the member. No first-match rule, remembered choice, automatic overwrite, permanent deletion, silent suffix or primary-only fallback resolves a group conflict. A collision or destination drift discovered after member publication has begun enters group recovery instead of pretending the remaining plan is still preflight-safe.

<a id="0345-p004"></a>

Confirmation creates one durable group journal and acquires every involved ADR 0317 Referenced Source Volume Lane in deterministic order for active work. The Referenced Compound Original becomes temporarily unavailable for source-dependent open, handoff, preview regeneration, analysis and further source operations before the first member path publication and remains so until complete relationship commit or recovery; cached identification preview may remain visible. Each physical member action is individually evidenced, and operation guards prevent another command, batch item or external reconciliation from treating an intermediate path as the authoritative group.

<a id="0345-p005"></a>

Same-volume member relocations are individually atomic where the filesystem provides that property, but the multi-member operation is never described as filesystem-atomic. After every planned relocation and any cross-volume publication reaches its intended target, the application revalidates the complete target group and atomically commits all member relationships plus the primary Source Tree projection while preserving Source Content Generation for unchanged bytes. A partial, failed or ambiguous physical result enters **Referenced Compound Source Path Recovery**, records observed prior, staging and target evidence, and offers only freshly validated Continue to Planned Layout, Restore Previous Layout or create-a-new-complete-plan paths. It never automatically rolls back, commits only the members that moved, splits the asset or reports partial movement as group success.

<a id="0345-p006"></a>

For every cross-volume member, complete bytes first copy into application-owned staging on its destination volume under ADR 0303 rules while the old source remains authoritative. All cross-volume staging must verify, all target conflicts must resolve and every same-volume action must remain executable before publication begins. The application then publishes the planned target members, validates the complete target group and performs the one relationship commit. Failure before that commit requests no old-source cleanup and enters group recovery if any target publication occurred. After commit, each exact old cross-volume source receives a separately evidenced operating-system trash request. Cleanup failure leaves the complete target group active and records the affected old members as remaining user-owned copies with explicit Retry Cleanup or Keep Remaining Copies choices; it never rolls back the committed group or repeats a destructive request automatically.

<a id="0345-p007"></a>

Cancellation may stop unstarted work and verified staging before physical publication, but once any member relocation/publication begins it must settle into complete commit or Referenced Compound Source Path Recovery. Restart reconciles the group journal and never infers authority from a subset of paths. In a Referenced Source Path Batch the entire compound operation is one Design Asset item; members never become independently committed batch items. Existing single-file and batch 30-second undo affordances cannot target a compound member. Returning a successfully moved group to prior locations is a new complete Referenced Compound Source Path Plan with fresh evidence, conflicts and volume consequences rather than claimed rollback.

<a id="0345-p008"></a>

ADR 0346 and ADR 0347 separately resolve whole-group source deletion and same-format rewrite, ADR 0348 keeps cross-format outputs source-separated, ADR 0349 governs companion attachment and ADR 0350 governs optional-member removal; this ADR resolves only group-level path movement. The current application has no Referenced Compound Source Path Plan, group journal, complete relationship commit, group conflict review or group path recovery. This ADR records target architecture only and plans, stages, copies, verifies, publishes, moves, renames, relinks, trashes, restores or deletes no runtime/user file, directory, database or cache and changes no public IPC, database schema or AI Worker API.

<a id="adr-0346"></a>

## 0346 · Referenced Compound Source Deletion Commits After Every Member Reaches OS Trash

决定来源：[0346-referenced-compound-source-deletion-commits-after-every-member-reaches-os-trash.md](../../adr/0346-referenced-compound-source-deletion-commits-after-every-member-reaches-os-trash.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0346-p001"></a>

**Remove Referenced Asset from Library** remains the default deletion action for a Referenced Compound Original and leaves every user-owned source member untouched. **Delete Referenced Compound Source** is a separate high-risk group-level Referenced Source Operation; it never invokes the single-file Delete Referenced Source File command on the primary or a companion and never inherits a prior or batch-default destructive choice.

<a id="0346-p002"></a>

Before confirmation, one **Referenced Compound Source Delete Plan** binds the current Design Asset, Compound Original identity, Source Content Generation, authoritative member manifest and every Referenced Compound Member Relationship. It shows every member's role, required/optional state, safe location, real format, size, current availability, known consequence and operating-system trash support, plus the complete member count and total bytes. Every currently included required and optional member is mandatory: keeping an optional source requires completing ADR 0350 Remove Optional Companion before creating a new delete plan. Missing, changed, ambiguous, unsafe, unsupported or unverified members block source deletion; the user may repair the complete group or use Remove Referenced Asset from Library, but the delete flow never treats absence as proven trash success.

<a id="0346-p003"></a>

Confirmation durably records one group intent before the first destructive request, freshly validates the complete unchanged group and acquires the involved Referenced Source Volume Lanes. It then asks the operating system to move each exact ordinary member to trash/recycle bin, recording member outcome evidence immediately. It never permanently unlinks or overwrites a member, deletes or moves a shared parent directory, infers undeclared siblings, sends a preview/cache/control file to trash, or deletes a containing folder merely because every declared member appears to be inside it. A capability-declared atomic package remains governed by its package capability rather than being reinterpreted as a multi-file compound group.

<a id="0346-p004"></a>

Multiple operating-system trash calls cannot be made filesystem-atomic. Before the first call the Referenced Compound Original becomes unavailable for source-dependent open, handoff, preview regeneration, analysis and other source operations; cached identification preview may remain visible. Every proven successful member call immediately adds its portable member deletion evidence and optional device-local handle to one **Referenced Compound Source Trash Receipt Set**. A reported failure, ambiguity or interruption never automatically retries a destructive call, assumes a missing path is in trash, deletes another member to make progress, or discards an already created receipt.

<a id="0346-p005"></a>

Only after every current member is proven in operating-system trash does one authoritative library commit move the single Design Asset into Asset Trash, preserve its Compound Original identity/member manifest and complete portable deletion state, remove its active Source Tree projection and mark the group delete successful. Members do not enter Asset Trash independently and create no separate Design Assets, deletion histories or restore lifecycles. Permanently deleting the Design Asset later retires governed library/receipt state under existing policy but never empties system trash or issues another source deletion.

<a id="0346-p006"></a>

If any member trash request has begun but the complete member set or Asset Trash commit was not proven, the Design Asset remains outside Asset Trash in **Referenced Compound Source Delete Recovery**. The recovery surface shows every member as still present, proven trashed, failed, ambiguous or unavailable and offers only freshly validated Continue Deleting Remaining Members or Restore Trashed Members. Continue targets only exact still-present members from the confirmed group and requests no call again for a proven or ambiguous prior outcome. Restore uses the corresponding receipts and ADR 0295/0296 identity and destination-conflict safeguards; the item returns to normal availability only after every member relationship and the complete capability group validate. Partial restore, unavailable handles and unresolved destination conflicts remain group recovery rather than splitting, relinking only the primary, discarding receipts or claiming rollback.

<a id="0346-p007"></a>

Cancellation may stop the operation before the first trash request. After any member call begins, Stop means enter or remain in group recovery at the next safe boundary, not cancel, undo or restore automatically. Restart and Library Switch reconcile the durable group intent, member outcomes and Asset Trash commit independently, allow a current non-interruptible platform call to settle, and never infer group success from path absence or repeat an ambiguous call.

<a id="0346-p008"></a>

In a destructive batch, one Referenced Compound Original is one Design Asset item. It counts as succeeded only after the complete group reaches Asset Trash; a partial member result is one needs-attention group item and does not roll back successful unrelated assets. After complete success, **Referenced Compound Source Delete Undo** may appear for the existing 30 elapsed seconds and submits one whole-group receipt-scoped restore request. It never restores one selected member, treats partial deletion recovery as undo-eligible or bypasses group restore conflicts; failed group deletion continues only through its recovery surface.

<a id="0346-p009"></a>

ADR 0345 remains the group-level path operation, ADR 0347 separately resolves same-format group rewrite, ADR 0348 keeps cross-format output source-separated, ADR 0349 governs companion attachment and ADR 0350 governs optional-member removal. The current application has no referenced-compound delete plan, group delete journal, member receipt set, complete Asset Trash commit, group delete recovery or whole-group undo. This ADR records target architecture only and validates, reads, moves, trashes, restores, deletes or writes no runtime/user file, directory, database, cache or system-trash item and changes no public IPC, database schema or AI Worker API.

<a id="adr-0347"></a>

## 0347 · Referenced Compound Source Rewrite Validates The Whole Group Before Member Publication

决定来源：[0347-referenced-compound-source-rewrite-validates-the-whole-group-before-member-publication.md](../../adr/0347-referenced-compound-source-rewrite-validates-the-whole-group-before-member-publication.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0347-p001"></a>

**Rewrite Referenced Compound Source** is the only in-app same-format source rewrite for a Referenced Compound Original. It never invokes single-file Rewrite Referenced Source independently against the primary or a companion. One **Referenced Compound Source Rewrite Plan** binds the current Design Asset, Compound Original identity, Source Content Generation, authoritative manifest and every Referenced Compound Member Relationship, then gives each current member an explicit Keep Current or Rewrite outcome. Every outcome defaults to Keep Current; required and optional membership, source path, verified real format and extension remain fixed throughout this workflow.

<a id="0347-p002"></a>

A member is eligible for Rewrite only when an active trusted capability declares a same-format encoder for that exact role and proves the requested properties and promised professional structure can be preserved. The complete capability contract must also declare every cross-member semantic effect. If changing a primary would require updated XMP, color, edit, index or other companion evidence, the plan must include every required affected member and its exact compatible transformation. If the capability cannot produce and validate that coordinated result, source rewrite is blocked and Compatible Export remains a separate non-relinking output; the application never silently leaves a stale companion, flattens structure, guesses a sidecar edit or rewrites an unsupported member.

<a id="0347-p003"></a>

Each Rewrite member encodes into complete operation-owned staging on its own source volume while each Keep Current member remains untouched. The resulting **Referenced Compound Source Rewrite Staging Set** substitutes every staged output into the candidate relationship and validates the whole group: real formats/extensions, dimensions and structure, color/profile evidence, bit depth, compression/quality, declared cross-member references and preview/analysis consequences. Staging is not a source, preview/analysis input, handoff member, backup payload or independent asset. A byte-identical member output becomes Keep Current and is never published; if every proposed output is byte-identical, the operation ends as a no-op without trash calls, receipts or a new Source Content Generation.

<a id="0347-p004"></a>

Plan confirmation durably records one group journal and acquires every involved Referenced Source Volume Lane in deterministic order before authoritative reads, encoding and staging. It authorizes producing and validating the complete candidate group but no destructive call unless the entire staging set, unchanged members, current sources, expected paths and recovery evidence remain proven. The Referenced Compound Original becomes unavailable for source-dependent open, handoff, preview regeneration, analysis and other source operations immediately before the first old-member trash request; cached identification preview may remain visible. That first request is the **Referenced Compound Source Rewrite Destructive Boundary**. Cancellation may stop encoding, validation and proven staging before this boundary, but afterward Stop can only enter recovery at a safe boundary and never discards evidence or restores files automatically.

<a id="0347-p005"></a>

For each materially changed member, the application freshly validates its old source, expected publish path and boundary, requests moving the exact old bytes to operating-system trash, and only after proven trash success freshly proves that path vacant before atomically publishing that member's verified same-volume staging at the unchanged path. It records each old-member receipt and physical outcome immediately. Multi-member publication is never described as filesystem-atomic. After every planned member has published, the application revalidates the complete resulting group and atomically commits one new Source Content Generation for the same Design Asset, stales prior-generation derived evidence under existing rules and restores normal group availability. Members never receive independent generations or successful rewrite lifecycles.

<a id="0347-p006"></a>

After the destructive boundary, any failed, ambiguous, interrupted or incomplete publication, complete-group validation or generation commit enters **Referenced Compound Source Rewrite Publication Recovery**. The recovery surface shows every member as unchanged, staged, old source trashed, new output published, ambiguous or invalid and permits only freshly validated Continue Publishing Planned Members or Restore Previous Group. Continue never repeats a proven or ambiguous destructive request and publishes only complete unchanged staging into a safely vacant expected path. Restore uses exact old-member receipts and ADR 0320-style identity/path safeguards without overwriting a published output or unrelated occupant; required displacement or destination choices remain explicit. The group leaves recovery only when the complete planned new group commits one generation or the complete prior group is restored and validated. It never automatically retries, claims rollback, commits only published members, relinks only the primary or splits the Design Asset.

<a id="0347-p007"></a>

After successful group rewrite, every materially displaced old member contributes one device-local Rewritten Old Source Recovery Receipt to a **Compound Rewritten Old Source Recovery Receipt Set** in Local File Recovery. These receipts are excluded from portable library state and Full Library Backup and do not create automatic revision history. Recovering one may restore an ordinary untracked external file but never changes the active compound group. Making recovered prior bytes current requires a new complete Referenced Compound Source Rewrite Plan with all member consequences; there is no one-click group or member rewrite undo.

<a id="0347-p008"></a>

In a Referenced Source Rewrite Batch, one Referenced Compound Original is one Design Asset item. Its members share one plan resolution, staging set, destructive boundary, recovery outcome and generation commit and never become independent batch items. Existing automatic retry remains a single-file pre-destructive policy and does not replay a compound group; before the group destructive boundary, a failed plan may only be explicitly re-reviewed and fully re-encoded, while after it only group recovery may continue. Applying a Source Rewrite Preset still stores semantic intent alone, defaults every member field to Keep Current and never supplies member selection, capability proof, cross-member transformation or destructive confirmation.

<a id="0347-p009"></a>

ADR 0345 and ADR 0346 continue to govern group path movement and source deletion. ADR 0349 governs companion attachment, ADR 0350 governs optional-member removal and ADR 0351 governs complete-group ownership conversion; none is hidden inside group rewrite. ADR 0348 keeps every cross-format result, including output rendered from RAW plus XMP, as a source-separated Compatible Export rather than a replacement Compound Original. The current application has no referenced-compound rewrite plan, staging set, group publication journal, coordinated encoder contract, group rewrite recovery or compound old-source receipt set. This ADR records target architecture only and encodes, stages, validates, reads, moves, publishes, rewrites, restores, trashes or deletes no runtime/user file, directory, database, cache or system-trash item and changes no public IPC, database schema or AI Worker API.

<a id="adr-0349"></a>

## 0349 · Post-Admission Companions Require Explicit Validated Attachment

决定来源：[0349-post-admission-companions-require-explicit-validated-attachment.md](../../adr/0349-post-admission-companions-require-explicit-validated-attachment.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0349-p001"></a>

A file discovered after admission may become only a **Companion Attachment Candidate**. Automatic observation is allowed inside an already authorized library or referenced-source scope, and the user may select a file manually, but basename, extension, adjacency, timestamp, metadata resemblance or plugin suggestion never changes membership. The candidate does not affect preview, analysis, Original Handoff, availability or Source Content Generation until the user explicitly invokes **Attach Companion**.

<a id="0349-p002"></a>

Attach Companion binds the current Design Asset, Source Content Generation, candidate identity and path, one exact capability-declared optional role, ownership mode and complete proposed member set. Confirmation is available only when the active capability validates the candidate's real format and role, the complete resulting relationship and preview/analysis consequences, and proves the candidate is not already authoritative as another standalone original or compound member in the current library. A missing required member remains recovery rather than attachment, and a conflict enters Referenced Compound Membership Conflict Review instead of silently detaching or merging another asset.

<a id="0349-p003"></a>

Successful attachment keeps the same Design Asset, adds the member to one authoritative manifest and commits one new Source Content Generation. A previously single-file original gains a Compound Original Identity at that commit; an existing Compound Original retains its identity. User-authored organization and metadata remain attached, prior-generation derived evidence becomes stale under existing policy, the companion receives no independent card or analysis lifecycle, and subsequent Original Handoff uses the complete group.

<a id="0349-p004"></a>

For a Referenced Asset, attachment adds only one Referenced Compound Member Relationship and never copies, moves, renames, rewrites or writes beside the user-owned candidate. For a Managed Original, the external candidate remains unchanged: an existing safe Compound Original Directory may stage, validate and atomically publish one companion into an exact vacant declared path under a group journal, while a single-file-to-compound transition, layout change or occupied/ambiguous target uses a complete staged Compound Directory Rebuild and the ADR 0343 authority-switch and residue protections. No discovered or selected file becomes library-owned before the corresponding publication and manifest commit succeeds.

<a id="0349-p005"></a>

ADR 0350 separately governs explicit removal of an attached optional companion and never hides that decision inside attachment, rewrite or path movement. The current application has no Companion Attachment Candidate, Attach Companion review, single-to-compound transition or post-admission member-manifest commit. This ADR records target architecture only and discovers, selects, reads, copies, publishes, groups, previews, analyzes, moves, rewrites or deletes no runtime/user file, directory, database or cache and changes no public IPC, database schema or AI Worker API.
