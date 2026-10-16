# 导出、交付与性能：详细能力契约

本文承接原ADR中的细节，保留所有原数字、例外、状态和相互约束；[来源映射](../../checkpoints/documentation-rebuild-20261015/adr-migration.json)逐段核对。**有效要求不是当前交付声明，也不是本轮实施队列。** 现行已批准产品/设计在其明确替代范围内优先；不凭实现缺失判决定无效。

当前系统从[media-handoff](../../subsystems/media-handoff.md)进入；当前实际能力/版本见[CURRENT-STATE](../../handoff/CURRENT-STATE.md)，交互与视觉分别归[交互目录](../../design/README.md)/[DESIGN](../../../DESIGN.md)。详细条款按下面独立主题定位，不全量装入每次上下文。

## 主题导航

- [0384 · Asset Export Uses Contained Flat Sets And Explicit Collection Projection](#adr-0384)
- [0385 · Asset Export Names Separate Human Provenance From Managed Storage](#adr-0385)
- [0386 · Asset Export Conflicts Require Visual Safe Destination Decisions](#adr-0386)
- [0387 · Asset Export Publishes Verified Results Per Placement](#adr-0387)
- [0388 · Asset Export Pause Cancel And Retry Stop Before Publication](#adr-0388)
- [0389 · Asset Export Unique Names Use Reviewed Minimum Number Suffixes](#adr-0389)
- [0390 · Asset Export Shares Physical Volume Lanes And Bounds Heavy Encoding](#adr-0390)
- [0391 · Empty Export Set Roots Are Reclaimed Only Before First Publication](#adr-0391)
- [0392 · Asset Export Activity Expires Separately From Replacement Recovery](#adr-0392)
- [0394 · Compatible Export XMP Companions Are Explicit Atomic Output Members](#adr-0394)
- [0395 · Compatible Export Metadata Routes Embedded First With Optional XMP Mirror](#adr-0395)
- [0396 · Compatible Export Presets Store Reusable Intent Without Authorization](#adr-0396)
- [0397 · Compatible Export Variants Commit And Report Independently](#adr-0397)
- [0398 · Compatible Export Variant Set Presets Own Recipe Snapshots](#adr-0398)
- [0399 · Compatible Export Uses Evidence-Gated Progressive Planning Without Arbitrary Variant Caps](#adr-0399)
- [0407 · Asset Export Admission Uses Non-Preemptive Task Fair Rotation](#adr-0407)
- [0408 · Asset Export Admission Is Bounded By Resource And Responsiveness Guards](#adr-0408)
- [0409 · Background Asset Export Requires An Explicit Profile And Visible Host](#adr-0409)
- [0410 · Compatible Export Planning Has Fixed Cross-Platform Performance Acceptance](#adr-0410)
- [0411 · Compatible Export Planning State Is Disposable And Reserve-Gated](#adr-0411)
- [0412 · Compatible Export Matrix Resolution Is Explicit And Task-Local](#adr-0412)

<a id="adr-0384"></a>

## 0384 · Asset Export Uses Contained Flat Sets And Explicit Collection Projection

决定来源：[0384-asset-export-uses-contained-flat-sets-and-explicit-collection-projection.md](../../adr/0384-asset-export-uses-contained-flat-sets-and-explicit-collection-projection.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0384-p001"></a>

Asset Export chooses its destination shape from the planned physical result,
not merely from the number of selected Design Assets. A result proven to
contain exactly one ordinary output file uses the operating system's familiar
Save As flow and selects its complete destination filename. Any Compound
Original, multi-page/artboard/format result, or selection producing more than
one physical file instead selects a parent directory and by default creates one
user-named independent **Export Set Directory**. This contains the complete
task output and avoids scattering files through an existing directory.

<a id="0384-p002"></a>

The default **Flat Asset Export Layout** is deliberately shallow. An asset that
produces one file is placed directly in the Export Set Directory. A Compound
Original receives one dedicated asset subdirectory that preserves every member
name and authoritative relative path. One asset that produces multiple pages,
artboards, frames, formats, or other physical outputs likewise receives one
dedicated asset subdirectory so its results remain visibly one logical unit.
The exporter does not recreate the source filesystem tree and never embeds a
source absolute path in an output path, manifest, filename, or result intended
for the destination.

<a id="0384-p003"></a>

ADR 0397 treats multiple explicit Compatible Export Variants as independently
committed outputs while retaining that asset grouping. The asset directory may
receive independently published variant-qualified ordinary files; any variant
with several media/XMP members instead receives its own variant subdirectory
and publishes that complete subdirectory atomically. A multi-variant task always
uses an Export Set Directory, while one variant retains this ADR's ordinary
single-result layout.

<a id="0384-p004"></a>

An optional **Collection Asset Export Layout** projects one explicitly selected
Collection Group or Asset Collection scope into the Export Set Directory. It is
an output organization choice only: it does not change Collection Memberships,
invent a primary collection, duplicate a Design Asset in the library, or make a
Collection hierarchy authoritative over source/storage layout. Compound member
layout remains intact below the asset's chosen collection placement.

<a id="0384-p005"></a>

If one selected asset belongs to multiple exported collections, the exporter
must not guess which membership is primary. The default exports the asset once
and requires an explicit placement choice before confirmation; the review may
offer a batch choice when the same decision can truthfully apply to several
items. A user may instead explicitly choose Copy Per Membership. That option
creates a complete physical output at each chosen membership placement and
must disclose the additional file count and storage estimate before it can be
confirmed.

<a id="0384-p006"></a>

Before any write, Asset Export Review presents the complete planned directory
tree and final destination paths together with logical-result count, physical
file/member count, estimated bytes, duplicate-output consequences, destination
conflicts and path-length or platform-portability issues. Any unresolved
multi-membership placement, unavailable compound member, invalid path, or
unproven capacity remains visibly blocking. The preview is recalculated after
destination, layout, scope, placement, naming, recipe, or eligibility changes
and the exact plan is revalidated at execution boundaries.

<a id="0384-p007"></a>

ADR 0394 treats an explicitly requested Compatible Export XMP Companion as a
physical member of one multi-file output. Even one selected Design Asset then
uses an Export Set Directory and a dedicated asset directory containing the
reviewed media/XMP association; it never scatters an adjacent sidecar through
single-file Save As or hides the added file from the output tree.

<a id="0384-p008"></a>

Every Export Set Directory and Save As result remains ordinary user-owned
external output. It is not managed library storage, a Source Tree, a Collection
Membership materialization, a backup, or an application cache, and deleting
the application must not make it disappear. ADR 0385 defines mode-specific
output-name derivation and transparent normalization without exposing managed-
storage identifiers. ADR 0386 requires explicit visual resolution of occupied,
same-plan and directory/type conflicts. ADR 0387 publishes each verified
placement progressively, including independent commit units for explicitly
duplicated multi-membership placements. ADR 0388 separates pause, cancellation
and bounded pre-publication retry. ADR 0391 distinguishes a reclaimable empty
provisional root from the user-owned Export Set Directory created by first
successful publication. Result and receipt retention follow ADR 0392.

<a id="0384-p009"></a>

The current application has no complete Asset Export publisher or directory
planner. This ADR records target architecture only and creates, reads, copies,
renders, exports, stages, writes, rewrites, converts, moves, deletes or changes
no runtime/user file, credential, sidecar, directory, database, cache, backup,
metadata value, analysis result, source relationship, public IPC, database
schema or AI Worker API.

<a id="adr-0385"></a>

## 0385 · Asset Export Names Separate Human Provenance From Managed Storage

决定来源：[0385-asset-export-names-separate-human-provenance-from-managed-storage.md](../../adr/0385-asset-export-names-separate-human-provenance-from-managed-storage.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0385-p001"></a>

Asset Export resolves every proposed output through a visible, mode-specific
**Asset Export Output Name** before destination-conflict handling. A name is
presentation and interoperability state for the external copy, never Design
Asset Identity, Original Storage Object Identity, Compound Original Identity,
or evidence that two outputs contain the same bytes. ADR 0384's directory-tree
review always shows the final filename and its parent path before any write.

<a id="0385-p002"></a>

For a single-file Original Asset Export, a Referenced Asset proposes its current
source basename from the validated export snapshot. A Managed Asset instead
proposes the complete received basename retained as provenance. It does not
expose the application-created bucket, Managed Original Storage Name,
`--<short-disambiguator>`, storage identity, database identity, or current
library-internal path merely because those identify the managed physical file.
This difference is explicit in review rather than pretending the managed
storage name is the user's original filename.

<a id="0385-p003"></a>

The proposed original name keeps its human-readable stem, while its extension
must remain truthful to the currently verified real format. A received or
current extension is preserved, including its ordinary spelling/case, when the
active format capability recognizes it as a valid alias. A missing, misleading,
or invalid extension is replaced with the capability's verified extension and
the review labels that correction. This renames only the external copy; it does
not transcode or rewrite the exact Original Asset bytes. If current capability
evidence cannot establish a truthful extension, the item is unresolved rather
than exported under an invented or merely trusted suffix.

<a id="0385-p004"></a>

A Compound Original preserves every current member basename and authoritative
relative path exactly. Its dedicated outer asset directory may use the same
referenced-current or managed-received primary stem and normal Export Name
Normalization because that outer directory is not a compound member. Member
names are never independently sanitized, truncated, suffixed, flattened, or
rewritten. If the destination cannot represent the complete exact member
layout, the whole item is blocked unless a future format capability defines and
validates an atomic interoperable layout mapping; ordinary filename cleanup
cannot silently break a primary/companion relationship.

<a id="0385-p005"></a>

Compatible Export derives a **Compatible Export Name** from the current
user-visible Design Asset title, falling back to the same referenced-current or
managed-received primary readable stem and finally the localized safe `asset`
fallback. A complete single-output rendering uses that stem plus the encoder-
verified target extension. An output representing a page, artboard, frame,
visible composition, format variant, or other selected visual unit adds a
readable structured qualifier containing its unit kind, stable display ordinal
when needed, and available user-visible unit label. Ordinals prevent empty or
duplicate labels from being mistaken for the same output. The exact name plan
shows these qualifiers; it does not expose database identities or treat an
untrusted layer/unit label as a path.

<a id="0385-p006"></a>

When ADR 0397 selects more than one Compatible Export Variant, every output
also carries a visible normalized qualifier derived from its reviewed unique
variant name. A single-variant task need not add redundant variant text. The
qualifier cannot be replaced by an internal variant identity, preset ID,
encoder/plugin name or hidden directory order.

<a id="0385-p007"></a>

**Export Name Normalization** preserves safe Unicode and ordinary spaces while
normalizing to NFC, replacing path separators, destination-forbidden/control
characters with `_`, removing forbidden trailing spaces/periods, protecting
reserved or hidden special names, and shortening only at grapheme boundaries
to satisfy the actual destination and disclosed portability budget. An empty
result uses `asset`. The review shows the proposed human name and final
normalized name whenever they differ. Normalization never changes bytes,
silently changes a Compound member, or appends a collision suffix; two names
that become equivalent after case, Unicode, or safety normalization remain a
visible destination conflict for the separately decided collision workflow.

<a id="0385-p008"></a>

Name derivation is frozen into the confirmed Asset Export Plan and fully
revalidated with the current asset/source generation, capability, recipe,
destination, layout, unit scope and final paths before publication. A later
title/source rename, capability change, external destination change, or stale
plan cannot silently alter already reviewed output names. Users may edit an
ordinary planned output or outer-directory name in review, after which the
same normalization and complete-plan validation apply; exact Compound member
names remain protected.

<a id="0385-p009"></a>

This ADR extends ADRs 0285, 0288 and 0289 without making their managed-storage
naming policy an export policy. ADR 0386 requires visual resolution of
destination and same-plan name conflicts without silent suffixing or overwrite.
ADR 0389 derives the explicit Keep Both name with a reviewed minimum
parenthesized number while preserving Compound member names. Batch naming
templates/presets remain separate; result retention follows ADR 0392. The current
application has no complete Asset Export name planner or publisher. This ADR
records target architecture only and creates, reads, copies, renders, exports, stages, writes,
rewrites, converts, renames, moves, deletes or changes no runtime/user file,
credential, sidecar, directory, database, cache, backup, metadata value,
analysis result, source relationship, public IPC, database schema or AI Worker
API.

<a id="adr-0386"></a>

## 0386 · Asset Export Conflicts Require Visual Safe Destination Decisions

决定来源：[0386-asset-export-conflicts-require-visual-safe-destination-decisions.md](../../adr/0386-asset-export-conflicts-require-visual-safe-destination-decisions.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0386-p001"></a>

Asset Export preflights the complete ADR 0384 directory tree against both the
current destination and every other planned output after ADR 0385 name
normalization. It treats exact-path, target-filesystem case/Unicode-equivalent,
file-versus-directory, planned-output, and already-occupied paths as explicit
conflict classes. Any conflict opens **Asset Export Destination Conflict
Review** before the affected output can write; filename, size, timestamp,
preview resemblance, asset identity, or prior task history never authorizes an
overwrite or silently resolves the conflict.

<a id="0386-p002"></a>

For an intended ordinary file occupied by a proven replaceable ordinary file,
the review offers three explicit outcomes. **Publish Asset Export With Unique
Name** is recommended and proposes a currently vacant normalized filename that
the user may edit, while displaying the recalculated final tree. **Skip Asset
Export Item** excludes the Design Asset's complete logical result from the
task, including all Compound members, multi-unit outputs and Copy Per
Membership placements, rather than claiming a partial asset export.
**Replace Asset Export Destination** is destructive, is never preselected, and
requires a separate consequence confirmation bound to the exact current
occupant.

<a id="0386-p003"></a>

In an ADR 0397 multi-variant Compatible Export, the review also offers **Skip
Compatible Export Variant** for the affected Design Asset. It excludes that
complete variant and all of its Copy Per Membership placements while preserving
the asset's other eligible variants. Skip Asset Export Item remains the broader
choice that excludes every variant and placement for the Design Asset.

<a id="0386-p004"></a>

Replacement never overwrites, truncates, unlinks or permanently deletes the
occupant. A complete candidate output must first be staged and verified under
the later publication policy. The application then durably binds the approved
replacement to the exact occupant and asks the operating system to move that
ordinary file to trash. Only a proven trash success and a still-vacant intended
path permit publication. A directory, link, special file, protected item,
unprovable occupant, unsupported trash operation or changed occupant is not
replaceable through this action and never falls back to direct overwrite,
unique naming, skipping or another destination automatically.

<a id="0386-p005"></a>

If the occupant is proven trashed but publication is not proven committed, the
item enters **Asset Export Replacement Recovery**. The application first
attempts one evidence-bound restore of that exact occupant only when the
intended path remains vacant and publication is proven absent. A successful
restore returns the item to current conflict review. Ambiguous publication,
changed destination, unavailable trash evidence or failed restore blocks
automatic action and opens a recovery review for an explicit safe restore
location or freshly validated continuation; it never guesses which file won,
repeats trash, or reports export success.

<a id="0386-p006"></a>

An intended Export Set Directory or asset subdirectory that collides with a
non-empty directory cannot be replaced, recursively cleared, or silently
merged. The user must choose a unique directory name or another parent
location. A proven empty ordinary directory may be selected explicitly after
the review shows that it contributes no existing contents; it is revalidated as
empty immediately before use. A file-directory type conflict, link, package,
mount boundary or uninspectable directory remains blocking rather than being
treated as an empty container.

<a id="0386-p007"></a>

Two outputs inside the same Asset Export Plan may not replace each other. The
review may rename one or more ordinary outputs, change the Compatible Export
recipe/unit scope, skip a complete affected asset-variant, or skip the complete
Design Asset, but it cannot order same-path outputs so that the later one wins.
Compound member names stay
protected by ADR 0385; an internal Compound collision or unrepresentable layout
blocks the complete compound item rather than renaming or omitting one member.

<a id="0386-p008"></a>

An Apply To All action is available only for a currently enumerated,
homogeneous conflict set with the same object type, operation meaning and risk.
It shows every resulting path and aggregate replacement/skip consequences
before confirmation. Applying unique names never becomes a remembered suffix
rule, and applying replacement never authorizes a wildcard or any occupant that
appears later. Non-empty-directory, type, compound-layout, permission and
recovery conflicts cannot be hidden inside an ordinary-file batch choice.

<a id="0386-p009"></a>

Every decision is rebound to the confirmed asset/source generations, staged
output, destination filesystem, parent directory, normalized final path and
exact occupant evidence immediately before its boundary. Destination drift or
a new conflict pauses only the affected item, asset-variant, or complete
Compound item, and returns it to updated review while unrelated eligible items
may continue.
No stale choice is applied to a replacement occupant. The task result reports
published, uniquely renamed, skipped, unresolved/recovery and failed items
truthfully without changing any source original, ownership, Design Asset,
Source Content Generation, membership or library metadata.

<a id="0386-p010"></a>

This decision adopts the safe visual and trash-before-publish principles of
ADRs 0304–0306 without adopting their source-relocation relationship changes or
Use Existing Identical Destination outcome. ADR 0387 instead defines verified
destination-volume staging and progressive publication per asset placement,
while ADR 0388 prevents cancellation or retry from crossing publication or
replacement boundaries. Result and receipt retention follow ADR 0392, while
ADR 0389 defines the explicit reviewed unique suffix.
The current application has no complete Asset Export conflict planner,
publisher or replacement recovery. This ADR records
target architecture only and creates, reads, copies, renders, exports, stages,
writes, rewrites, replaces, trashes, restores, renames, moves, deletes or
changes no runtime/user file, credential, sidecar, directory, database, cache,
backup, metadata value, analysis result, source relationship, public IPC,
database schema or AI Worker API.

<a id="adr-0387"></a>

## 0387 · Asset Export Publishes Verified Results Per Placement

决定来源：[0387-asset-export-publishes-verified-results-per-placement.md](../../adr/0387-asset-export-publishes-verified-results-per-placement.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0387-p001"></a>

Asset Export is progressively committed rather than one all-or-nothing
Export Set transaction. Original Asset Export uses one complete planned
physical placement of one Design Asset result as its **Asset Export Commit
Unit**. ADR 0397 refines Compatible Export to one complete Design Asset ×
Compatible Export Variant × placement unit. In Flat or Collection layout with
Export Once, an Original asset has one unit and every Compatible asset-variant
has one independently publishable unit. Copy Per Membership makes every
reviewed collection placement an independent unit because separate filesystem
paths cannot publish through one atomic rename.

<a id="0387-p002"></a>

Copy Per Membership still remains one reviewed Original asset or Compatible
asset-variant intent. ADR 0386 may exclude all placements through Skip Asset
Export Item or only one Compatible variant through Skip Compatible Export
Variant. Once execution begins, a successful placement remains ordinary
user-owned output when another placement or variant fails, pauses or is
cancelled. Mixed placement outcomes produce **Partial Placement Success** for
that Original asset or Compatible asset-variant; mixed variant outcomes produce
ADR 0397 Partial Variant Success for the asset. Fresh retry targets only failed
or unresolved units and never recreates successful copies or variants.

<a id="0387-p003"></a>

Every commit unit first builds complete **Asset Export Staging** on the selected
destination volume under an exclusively created attempt identity. Staging is
not an export result, Design Asset, original, Source Tree item, Collection
Membership materialization, preview/analysis input, backup content or cache. It
is excluded from ordinary user result surfaces and may not occupy the reviewed
final path. A durable **Asset Export Publication Checkpoint** binds the exact
plan, asset/source generation, mode/variant recipe, placement, destination
volume, staging identity, expected final path, validation evidence and
publication boundary without recording source absolute paths in portable/user-
facing results.

<a id="0387-p004"></a>

Original Asset Export validates staged single-file bytes against the exact
current Source Content Generation. For a Compound Original it validates every
included member digest, role, basename and authoritative relative path as one
complete set. Compatible Export validates that every staged output is a
complete decodable instance of the encoder-declared target format and matches
the reviewed dimensions, color profile/gamut behavior, bit depth/quality where
verifiable, visual-unit scope, output count and preserved/transformed/omitted
structure contract. A preview, cached derivative, extension or successful
encoder exit alone cannot prove staging valid.

<a id="0387-p005"></a>

When ADR 0394 enables a Compatible Export XMP Companion, compatible validation
also proves the complete media/XMP inventory, XMP syntax, declared property
mapping and values, and capability-defined filename association. The image and
sidecar stage and publish as one directory commit unit; neither may become a
final-path result independently.

<a id="0387-p006"></a>

A one-file commit unit publishes only the completely verified staging file to
the freshly revalidated vacant or ADR 0386-approved final path through a safe
same-volume atomic publication primitive. A Compound Original or other
multi-file result stages its complete dedicated result directory—an asset
directory or ADR 0397 variant subdirectory—and publishes that directory with
one safe same-volume atomic rename. No member receives its final visible path
earlier than the group, and post-publication validation must prove the intended
complete file/directory now occupies the final path before success is recorded.

<a id="0387-p007"></a>

If the live destination filesystem, provider or mount cannot prove the required
same-volume file/directory publication and post-commit inspection semantics,
the affected commit unit is unsupported at that destination. The application
asks for another location rather than falling back to member-by-member copy,
exposing an incomplete directory, weakening Compound integrity or claiming
atomicity from an unknown provider. A destination capability change after
confirmation pauses only affected units and reopens current review.

<a id="0387-p008"></a>

Each successfully published commit unit becomes ordinary user-owned external
output immediately while later units continue. Later failure, capacity pause,
cancellation or application restart never rolls back or removes it to simulate
batch atomicity. Consequently an Export Set Directory may truthfully contain
successful outputs while the task is partially successful. The task result
distinguishes complete asset success, Partial Variant Success, Partial
Placement Success, skipped, failed, paused and recovery-required outcomes and
never treats the mere existence of the Export Set Directory as success.

<a id="0387-p009"></a>

Review includes final-output demand, staging overhead and the destination's
required safety reserve. Capacity and writability are rechecked before each
commit unit starts and before publication. Insufficient safe capacity pauses
unstarted or safely pre-publication work without touching committed outputs,
source originals or destination occupants. Space recovered by cleaning only
proven attempt-owned staging may be considered after reconciliation; estimated
capacity is never a reservation or guarantee.

<a id="0387-p010"></a>

After interruption, a checkpoint-bound stage may resume or publish only when
current source/variant recipe, stage, destination, conflict and path evidence
prove the same reviewed unit. A final path that may already contain the result
is reconciled and validated instead of copied again. Ambiguous evidence enters
item- or placement-scoped recovery without guessing. Cancellation, terminal
failure and reconciliation may remove only staging whose exact attempt
ownership is proven, never a committed output, source original, conflict
occupant or similar-looking user file. Staging is not governed by ordinary
cache cleanup, storage-pressure eviction, settings reset, AI/plugin maintenance
or application uninstall cleanup.

<a id="0387-p011"></a>

ADR 0386 replacement first requires this complete verified staging, then uses
its separate trash-before-publication and recovery boundary. ADR 0388 separates
pause from cancellation and limits automatic/manual retries to safe
pre-publication evidence. ADR 0390 serializes involved physical volumes with
other application file operations and bounds heavy compatible encoding. Export
Set root ownership/empty cleanup follows ADR 0391; activity/result/receipt
retention remains separate. The current
application has no complete Asset Export staging,
checkpoint, placement commit or publisher. This ADR records target architecture
only and creates, reads, copies, renders, exports, stages, writes, publishes,
rewrites, replaces, trashes, restores, renames, moves, deletes or changes no
runtime/user file, credential, sidecar, directory, database, cache, backup,
metadata value, analysis result, source relationship, public IPC, database
schema or AI Worker API.

<a id="adr-0388"></a>

## 0388 · Asset Export Pause Cancel And Retry Stop Before Publication

决定来源：[0388-asset-export-pause-cancel-and-retry-stop-before-publication.md](../../adr/0388-asset-export-pause-cancel-and-retry-stop-before-publication.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0388-p001"></a>

Asset Export exposes **Pause Asset Export** and **Cancel Remaining Asset Export**
as different user intents. Both durably stop dispatch of new ADR 0387 Asset
Export Commit Units, but pause preserves safely resumable work while cancel ends
the uncommitted remainder. Neither action reverses, removes, repeats or hides a
successfully published user-owned output, and neither turns a progressively
committed Export Set into a batch rollback transaction.

<a id="0388-p002"></a>

Pause is observed by an in-progress placement only at a proven safe checkpoint
before final-path publication begins. A checkpoint-bound source copy may stop
with its exact attempt-owned staging retained; a non-resumable encoder may stop
only after its process/output is reconciled and any invalid incomplete staging
is safely removed. The task reports retained staging bytes and destination
capacity impact. **Resume Asset Export** is always explicit and first
revalidates the current source generation, recipe/capability, staging,
destination, conflict decisions, permissions, capacity and paths; it never
publishes merely because bytes survived a pause.

<a id="0388-p003"></a>

Cancel marks every unstarted placement cancelled and asks current
pre-publication work to stop at the same safe checkpoint. It removes only exact
staging proven to belong to that cancelled attempt. Failed or unprovable staging
cleanup becomes operation-scoped attention rather than a claimed cancellation.
A placement already published remains successful. A placement whose atomic
publication call has begun must settle into proven success, failure or
publication reconciliation, while ADR 0386 replacement that has begun moving
an occupant to operating-system trash must settle through replacement recovery.
Cancellation cannot dismiss either boundary or restore/replace files by guess.

<a id="0388-p004"></a>

Application exit, crash, forced termination, destination disconnection and
restart do not silently resume copying or encoding. Startup first reconciles
every checkpoint, staging artifact and possibly published final path. Safe
unfinished work returns as paused with an explicit Resume or Cancel choice;
ambiguous publication/replacement remains recovery-required. A publication
proven completed during interruption is recorded as success, not repeated, and
an accepted pre-exit cancel request remains durable so queued work is not later
dispatched. Reconciliation does not block the application or every export:
ADR 0402 Startup Reconciliation Isolation holds only placements that share the
unresolved source, destination path or physical-volume publication boundary.
Disjoint libraries, sources, destinations and volume boundaries remain usable.
Unresolved evidence makes the owning visual recovery surface available through
ADR 0402 Review Startup Recovery but does not open it automatically. It never
causes an automatic re-encode, copy, publication, replacement, restore or
deletion. Closing or deferring review preserves the exact source, destination
and volume-boundary isolation. Reconnection of the same proven destination
volume may trigger a read-only recheck, but not automatic export continuation.
While that volume or another required evidence source is unavailable, the
placement is Waiting For Recovery Evidence. Its checkpoint, receipts and only
the staging required to reconcile publication/replacement remain operational
recovery state rather than cache and are accounted in Storage Management.
Release Safely Rebuildable Recovery Staging is available only when fresh proof
establishes that the exact placement staging is unpublished, attempt-owned,
outside replacement and no longer needed for outcome reconciliation. It removes
only that staging, keeps the checkpoint/receipt, marks the placement Safely
Paused Without Staging and requires explicit resume to re-encode or recopy from
the beginning after full current-evidence preflight. Any ambiguity disables it.
A Recovery Staging Release Batch may include independently eligible placements
from one or more export tasks, but each placement repeats this proof and commits
its staging release independently. One changed placement is excluded without
releasing it, rolling back earlier releases or stopping unrelated eligible
placements.
Cancel Remaining Recovery Staging Releases stops new placement-release dispatch
without cancelling or resuming the underlying export. A current removal settles
or becomes reconciliation-required; unstarted placements retain their staging,
checkpoint and recovery state as Cancelled Before Release. Restart reconciles
only a possibly in-flight removal and never resumes the batch.
For compound or multi-file placement staging, the release journal preserves the
opaque expected-member set and per-member outcomes. Restart classifies proven
all-absent as Released, proven wholly intact/unchanged as Release Failed, and a
mixed or unassessable set as Staging Release Reconciliation Required. Complete
Remaining Recovery Staging Release may remove only freshly proven safe remaining
members; no partial staging resumes encoding/copying and no absent member is
reconstructed.
Multiple such placements may appear in one filterable/sortable Staging Release
Reconciliation View, but every Complete Remaining action is item-scoped and
separately confirmed. The view has no multi-select or Select All. A placement
re-proven wholly intact becomes Release Failed and may join a later ordinary
batch only through new explicit selection.
Complete Remaining Staging Release Review shows the exact path-free remaining
member count, proven bytes and full re-encode/recopy consequence for one
placement. It uses one explicit confirmation without typed-name/password
challenge, then repeats complete evidence validation. Drift removes no member,
refreshes the placement reason and consumes the confirmation.
Success merges Released After Reconciliation into the original batch item,
preserves the interruption, records the placement Safely Paused Without Staging
and adds only proven reclaimed bytes. It resolves that placement's startup and
batch attention without creating a new history record, notification or retry
attempt.
If completion fails, the same placement records one path-free Recovery Staging
Completion Attempt with time, outcome, current member counts/bytes and typed
reason. It remains reconciliation-required or waiting. Try Complete Remaining
Staging Release Again appears only after fresh read-only proof and requires a
new confirmation; attempts are visible and manually unbounded but never enter
Batch/Asset Export retry budgets and never start automatically.

<a id="0388-p005"></a>

Closing the last window is not application exit only when ADR 0409 Continue
Asset Export After Closing The Window is enabled and the normal platform
lifecycle retains a discoverable host process. ADR 0402 Safe Stop And Quit
always stops new admission, brings active work to the safe boundary defined
above and terminates the host within the shared 30-second maximum after
required checkpoint/reconciliation handling; no export worker continues as a
daemon or independent service. At that deadline, an unstarted or proven safely
incomplete placement persists as Paused or Waiting, while a placement whose
publication or replacement outcome is uncertain becomes Startup Reconciliation
Required. Neither state is falsely reported as success or cancellation.

<a id="0388-p006"></a>

**Asset Export Automatic Retry** applies only to a classified transient source
read, exact-copy, encoder-process, attempt-owned staging write or complete-
verification I/O failure before publication. One placement receives at most
two automatic retries after its initial attempt, for three total attempts, with
bounded increasing delay. Every attempt proves unchanged Design Asset and
Source Content Generation, export mode/recipe, capability/encoder identity,
destination boundary, final-name plan and staging ownership. Waiting, pause,
restart reconciliation or resuming one unchanged verified checkpoint does not
consume or reset the retry budget.

<a id="0388-p007"></a>

Automatic-retry backoff is a non-running **Waiting For Automatic Retry** state.
It retains no Physical Volume File Lane or Media Processing Resource Gate
admission and never blocks otherwise eligible placements, including later ADR
0397 variants. When the delay expires, the placement first revalidates the
required evidence and then rejoins admission at its frozen Compatible Export
Variant Priority; it does not preempt or interrupt a commit unit that is already
running. A task-wide Pause or Cancel Remaining request still governs the
waiting placement and cannot be bypassed by expiry of its retry delay.

<a id="0388-p008"></a>

An Original Asset Export may resume a proven copy checkpoint without trusting
unverified trailing bytes. A Compatible Export retry never appends to or
publishes an incomplete/invalid encoder result: it removes only the failed
attempt's proven staging and regenerates the complete placement before full
validation. A deterministic encoder rejection, repeatedly reproducible invalid
output or capability-declared unsupported transformation is not classified as
transient merely to obtain more attempts. Compound and other multi-file
placements retry/reconcile as one complete placement, never per member.

<a id="0388-p009"></a>

Destination conflict, permission denial, insufficient capacity, unavailable
volume, source/recipe/capability/encoder drift, deterministic encoding failure,
invalid output, cancellation, publication, replacement, operating-system
trash, restore, recovery or any ambiguous operation that may already have
changed a user path never retries automatically. These outcomes pause, fail,
return to current review or enter recovery under their own truthful state. In
particular, no retry automatically repeats a destructive replacement choice or
generates a new unique name after the reviewed name becomes occupied.

<a id="0388-p010"></a>

**Retry Asset Export Placements** is an explicit result action for user-selected
failed or cancelled placements that remain outside conflict/recovery and are
currently safe to try. It performs a fresh plan and destination preflight,
preserves all earlier attempt/cancellation history and merges the new outcome
into the same task result. Changed source, recipe, output name, placement,
capability or destination returns to review rather than executing stale intent.
Successful placements are excluded and never regenerated; unresolved conflict
or recovery placements must resolve their existing state before becoming
ordinary retry candidates. Manual retry does not reset the exhausted automatic-
retry budget. After successful fresh preflight, the selected retry placements
are preferred over the same task's ordinary unstarted placements. This is a
task-local waiting preference only: it never interrupts running work, crosses a
publication or recovery boundary, bypasses current lane/resource admission, or
elevates the entire task ahead of another confirmed Asset Export task.

<a id="0388-p011"></a>

ADR 0389 separately defines reviewed unique-suffix derivation. Exact
physical-volume and media scheduling follows ADR 0390. Export Set root cleanup
follows ADR 0391; activity/result/receipt retention follows ADR 0392. The current
application has no complete Asset Export pause, cancellation, retry or resume
coordinator. This ADR records target architecture only and creates, reads,
copies, renders, exports, stages, writes, publishes, retries, rewrites,
replaces, trashes, restores, renames, moves, deletes or changes no runtime/user
file, credential, sidecar, directory, database, cache, backup, metadata value,
analysis result, source relationship, public IPC, database schema or AI Worker
API.

<a id="adr-0389"></a>

## 0389 · Asset Export Unique Names Use Reviewed Minimum Number Suffixes

决定来源：[0389-asset-export-unique-names-use-reviewed-minimum-number-suffixes.md](../../adr/0389-asset-export-unique-names-use-reviewed-minimum-number-suffixes.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0389-p001"></a>

ADR 0386's **Publish Asset Export With Unique Name** is an explicit conflict
choice, never an automatic property of ordinary Asset Export. Once selected,
the application proposes an **Asset Export Unique Name** by inserting the
smallest currently available parenthesized integer suffix beginning at 2. An
ordinary file uses `readable name (2).ext`, `readable name (3).ext`, and so on;
an Export Set Directory or dedicated asset directory uses `readable name (2)`,
`readable name (3)`, and so on.

<a id="0389-p002"></a>

Availability is evaluated against the live destination directory, every other
output and directory in the frozen Asset Export Plan, and every path currently
reserved by a still-valid attempt from that plan. Comparison uses the target
filesystem/provider's proven case, Unicode normalization and name-equivalence
semantics rather than application-locale string comparison. The allocator
tests candidates in ascending numeric order and reserves each reviewed result
in the frozen plan order so a batch produces deterministic, fully displayed
paths without two planned outputs selecting the same candidate.

<a id="0389-p003"></a>

The suffix is appended to the complete current readable stem and does not parse
or remove a pre-existing user-authored parenthesized number. A source named
`concept (2).psd` therefore keeps that stem and may become
`concept (2) (2).psd`; the application does not guess that an existing number
is disposable collision syntax. The user may edit any proposed ordinary output
or outer-directory name before confirmation, after which ADR 0385 Export Name
Normalization and the complete conflict scan run again.

<a id="0389-p004"></a>

For a single-file result, only the filename stem receives the suffix and the
truthful extension remains complete. For a Compound Original or other
multi-file result, only its dedicated outer asset directory receives the
suffix; member basenames and authoritative relative layout remain unchanged.
Copy Per Membership resolves each conflicting placement path independently,
while the review still aggregates every final name and additional physical copy
under the same Design Asset.

<a id="0389-p005"></a>

When the suffix would exceed a destination component/path budget, the allocator
shortens only the readable stem at an extended grapheme-cluster boundary until
the complete space, parentheses, integer and truthful extension fit. It retains
safe Unicode and never shortens or removes the integer/extension, transliterates
the stem, renames a Compound member, chooses another parent, or substitutes an
internal identifier. If the normalized `asset (n)` fallback cannot fit or no
candidate can be proven safe, the conflict remains blocking rather than
publishing an ambiguous or invalid path.

<a id="0389-p006"></a>

Default unique names never contain a timestamp, random token, database ID,
Design Asset Identity, storage-object identity, managed bucket label or Managed
Original Short Disambiguator. These values may remain internal plan tie-breakers
but are not user-visible filename material. This keeps exported names readable
without confusing a conflict copy with library storage or stable identity.

<a id="0389-p007"></a>

The complete unique-name allocation is visible before write and bound to the
confirmed destination snapshot. If the final path becomes occupied or its name
equivalence changes before publication, the placement returns to current Asset
Export Destination Conflict Review. It does not silently increment to the next
number, overwrite, skip, apply a remembered choice or treat its staging as the
new occupant. Original Asset Export still preserves exact source bytes; the
explicitly reviewed suffix changes only the external copy's name.

<a id="0389-p008"></a>

Batch naming templates/presets remain separate; result retention follows ADR 0392.
The current application has append-counter download behavior but no complete
Asset Export conflict/name planner implementing this contract. This ADR records
target architecture only and creates, reads, copies, renders, exports, stages,
writes, publishes, renames, moves, deletes or changes no runtime/user file,
credential, sidecar, directory, database, cache, backup, metadata value,
analysis result, source relationship, public IPC, database schema or AI Worker
API.

<a id="adr-0390"></a>

## 0390 · Asset Export Shares Physical Volume Lanes And Bounds Heavy Encoding

决定来源：[0390-asset-export-shares-physical-volume-lanes-and-bounds-heavy-encoding.md](../../adr/0390-asset-export-shares-physical-volume-lanes-and-bounds-heavy-encoding.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0390-p001"></a>

Asset Export participates in one host-owned exclusive **Physical Volume File
Lane** per stable physical-volume identity. This is the shared underlying lane
used by ADR 0317/0332 Referenced Source Volume Lane participants rather than a
parallel export-only queue. Consequently an export cannot read or stage on a
volume while another application-directed relocation, transfer, rewrite,
source deletion or other lane-governed file mutation independently claims that
same volume. The lane is an application scheduler, not an operating-system lock
against external editors, so every source and destination is still revalidated.

<a id="0390-p002"></a>

Each ADR 0387 Asset Export Commit Unit acquires every physical volume containing
an authoritative source member plus its destination-volume staging/final path.
It acquires multiple lanes in stable physical-volume-identity order to prevent
opposite-direction deadlock and holds them from authoritative source validation
and reading through staging, complete verification, atomic publication and
immediate outcome reconciliation. Managed and Referenced Assets follow the same
lane rule; a Compound Original includes every distinct member volume and its
destination in one deterministically ordered set.

<a id="0390-p003"></a>

At most one active lane-governed application file operation may involve a given
physical volume. Commit units whose complete volume sets are disjoint may run
concurrently when the media resource gate also admits them. A path string,
drive letter, mount name, claimed SSD class, filesystem marketing label or
removable/network guess never establishes separate physical identity or higher
concurrency. Unknown or unstable volume identity falls back to conservative
serialization rather than assumed independence.

<a id="0390-p004"></a>

A placement waiting for conflict review, destination reconnection, explicit
resume or recovery does not retain lanes indefinitely. It first reaches an ADR
0388 safe checkpoint, durably preserves its source/path/staging guards and
truthful state, then releases the I/O lanes. Continuation and every automatic or
manual retry reacquire the complete current lane set in deterministic order and
freshly revalidate all evidence. An atomic publication, replacement trash call
or recovery reconciliation already in progress settles before its lane is
released.

<a id="0390-p005"></a>

Compatible Export also enters a host-owned **Media Processing Resource Gate**.
Version one admits at most one **Heavy Compatible Export** globally. Heavy
classification comes from format/encoder capability evidence, conservative or
measured peak memory/accelerator demand, source structure and live pressure;
PSD, PSB, TIFF, RAW and other professional sources are examples, not filename-
based hard-coded truth. Missing or stale resource evidence classifies the work
conservatively instead of assuming it is lightweight.

<a id="0390-p006"></a>

An Original Asset Export exact-byte copy may overlap one admitted compatible
encode only when their complete physical-volume sets are disjoint and current
memory, accelerator, thermal, battery/power and staging-capacity evidence shows
safe headroom. Two heavy compatible encodes do not overlap in version one.
Lighter media work may overlap only under proven headroom and never by bypassing
volume lanes, placement guards, complete validation or the one-heavy limit.

<a id="0390-p007"></a>

Explicit foreground Asset Export has higher admission priority than background
AI analysis, indexing, preview pre-generation and other deferrable maintenance.
Those background systems yield at their own safe boundaries, but Asset Export
does not borrow the Local AI Resource Governor as an encoder scheduler, start an
AI model, download a model/runtime or change analysis intent. A host resource
coordinator shares current pressure and foreground-demand evidence between the
Media Processing Resource Gate and ADR 0173 Local AI Resource Governor while
each retains its domain-specific lifecycle.

<a id="0390-p008"></a>

ADR 0407 governs non-preemptive task-fair rotation, frozen Compatible Export
Variant Priority, retry re-entry and the absence of manual cross-task priority.
Those admission preferences remain subordinate to the lanes and Media
Processing Resource Gate defined here.

<a id="0390-p009"></a>

Any shared intermediate optimization requires the same frozen source content
generation and compatible input/render evidence for every consumer. It remains
attempt-owned ephemeral processing state, never a published result or reusable
export authority. If equivalence or validity is not proven, each variant
decodes/renders independently. Reordering or reuse cannot alter a recipe,
output bytes implied by that recipe, reviewed name/path, conflict choice,
variant/placement commit boundary, retry evidence or result reporting. Priority
never resolves a same-plan collision, makes one variant a fallback, or permits
one variant to replace another.

<a id="0390-p010"></a>

ADR 0408 governs typed resource waits, the Auto/manual 1–16 Asset Export
Concurrency Ceiling, measurable responsiveness acceptance and hysteresis.
Those guards may reduce future admission but never weaken the lane, heavy-media,
publication or recovery boundaries in this ADR.

<a id="0390-p011"></a>

ADR 0409 governs foreground-loss profiles, Continue Asset Export After Closing
The Window and its required projection through the shared ADR 0174 Application
Status Center. Background lifecycle never creates another lane namespace or lets
work outlive the host.

<a id="0390-p012"></a>

ADR 0391 defines the provisional Export Set root cleanup boundary;
activity/result/receipt retention follows ADR 0392. The current application has
no complete shared Physical Volume File Lane or Asset Export Media Processing
Resource Gate; ADR 0409 separately records the missing Application Status
Center projection. This ADR records target
architecture only and schedules, creates, reads, copies, renders, exports,
stages, writes, publishes, encodes, retries, rewrites, replaces, trashes,
restores, renames, moves, deletes, analyzes, downloads or changes no
runtime/user file, credential, sidecar, directory, database, cache, model,
backup, metadata value, analysis result, source relationship, public IPC,
database schema or AI Worker API.

<a id="adr-0391"></a>

## 0391 · Empty Export Set Roots Are Reclaimed Only Before First Publication

决定来源：[0391-empty-export-set-roots-are-reclaimed-only-before-first-publication.md](../../adr/0391-empty-export-set-roots-are-reclaimed-only-before-first-publication.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0391-p001"></a>

When ADR 0384 plans a multi-file Asset Export, the application may exclusively
create one empty **Provisional Export Set Directory** under the reviewed parent
after confirmation. It is a task-bound container, not yet the user-owned Export
Set Directory described by the glossary, and its creation is not export success.
It contains no application manifest, source path, library metadata or hidden
claim that would make an empty folder appear to be a completed export.

<a id="0391-p002"></a>

The provisional directory crosses the **Export Set Ownership Boundary** when
the first ADR 0387 Asset Export Commit Unit is proven published anywhere inside
it. At that instant it becomes an ordinary user-owned **Export Set Directory**.
No later failure, cancellation, retry exhaustion, result expiry, cache cleanup,
settings reset, application uninstall or observation that it is currently empty
returns it to application ownership or authorizes automatic deletion.

<a id="0391-p003"></a>

Collection hierarchy and dedicated asset subdirectories are created lazily.
The publisher does not precreate the complete reviewed tree. A missing directory
chain is prepared only as part of the affected placement's publication plan so
the complete child result and required new branch appear together through the
safe destination semantics from ADR 0387. A Compound or multi-file asset still
publishes only as its complete directory, and speculative empty collection or
asset directories are never created merely to show future progress.

<a id="0391-p004"></a>

After Cancel Remaining Asset Export or a task state in which every placement is
terminal without success, the application may make one **Empty Export Set Root
Reclaim** attempt only when all of the following are proven: no placement ever
crossed the ownership boundary; no staging, paused/resumable checkpoint,
publication/replacement recovery or unresolved destructive obligation remains;
the exact directory identity is the one exclusively created for this task; its
reviewed parent and path have not been redirected or replaced; and the directory
is currently empty under safe non-following inspection.

<a id="0391-p005"></a>

Any file, subdirectory, link, package, filesystem metadata entry visible as a
child, user/external modification, changed directory identity, inaccessible
state or ambiguous emptiness preserves the directory. Reclaim never recursively
deletes, follows indirection, removes an unknown child, cleans a parent, or
guesses that a similarly named folder is task-owned. A directory that existed
before the task, including an empty directory explicitly adopted through ADR
0386 review, is never provisional and is never eligible for this action.

<a id="0391-p006"></a>

If the one reclaim attempt succeeds, a later manual retry may freshly recreate
a new provisional root only after the destination and complete plan are reviewed
again. If removal fails or cannot be proven, the task reports **Empty Export Set
Directory Retained** with a Reveal action and performs no automatic retry loop,
startup deletion, background cleanup or pressure-driven reclamation. This
non-destructive residue does not change placement outcomes or become
publication/replacement recovery.

<a id="0391-p007"></a>

Single-file Save As has no Export Set root and is unaffected. Asset Export
Staging remains separately operation-owned under ADR 0387 and cannot be placed
inside, mistaken for or retained by a user-owned Export Set Directory merely to
avoid its stricter reconciliation rules. ADR 0392 activity/result/receipt
retention cannot extend cleanup authority across the ownership boundary.

<a id="0391-p008"></a>

The current application has no complete Asset Export root planner, ownership
boundary or safe empty-root receipt. This ADR records target architecture only
and creates, inspects, reclaims, reads, copies, renders, exports, stages, writes,
publishes, retries, rewrites, replaces, trashes, restores, renames, moves,
deletes or changes no runtime/user file, credential, sidecar, directory,
database, cache, model, backup, metadata value, analysis result, source
relationship, public IPC, database schema or AI Worker API.

<a id="adr-0392"></a>

## 0392 · Asset Export Activity Expires Separately From Replacement Recovery

决定来源：[0392-asset-export-activity-expires-separately-from-replacement-recovery.md](../../adr/0392-asset-export-activity-expires-separately-from-replacement-recovery.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0392-p001"></a>

An active, paused, conflict-blocked or recovery-required Asset Export keeps
durable **Asset Export Operational State** until every placement and destructive
obligation reaches a truthful terminal or explicitly resolved outcome. This is
operation authority, not activity history, and ordinary 7/30-day history
retention, dismissal, cache cleanup or settings reset cannot prune checkpoints,
staging ownership, reviewed conflict state or replacement recovery while work
remains capable of changing or reconciling user paths.

<a id="0392-p002"></a>

An export whose exact destination volume or other required evidence source is
unavailable remains **Waiting For Recovery Evidence** under ADR 0402. Storage
Management presents its safely calculable checkpoint, receipt and required
operation-staging bytes as a distinct separately governed interrupted-operation
category, not as Managed Recovery Storage or deletable cache. Unknown or offline bytes
remain explicitly unknown; elapsed time, TTL, LRU, storage pressure and generic
cleanup neither estimate them as zero nor retire their operational authority.
Only an evidence-proven outcome or the placement's own safe recovery flow may
release that state and any exact operation-owned staging it governs.

<a id="0392-p003"></a>

ADR 0403 Release Safely Rebuildable Recovery Staging is the sole storage action
in this category before operational resolution. Asset Export maps its exact item
scope to one placement and applies its current-evidence eligibility, independent
per-item commit, cancellation, reconciliation, result, attempt-compaction and
30-day Reviewed Batch Action rules without removing a journal, receipt, source,
destination or published output. Safely Paused Without Staging remains
operational state rather than expired or cleared activity history.

<a id="0392-p004"></a>

At activity-record expiry, ADR 0401 governs the placement's lifecycle-bound
terminal marker, claim-scoped reconstruction, explicit unknown-outcome
retirement, anti-replay tombstone and any later returned-evidence check. Asset
Export maps ADR 0401's exact item scope to one placement and its shared
destination/publication boundary; unrelated placements and libraries remain
available, and no marker or tombstone grants export or cleanup authority.

<a id="0392-p005"></a>

Any ADR 0401 Returned-Evidence Recovery Plan for an Asset Export placement gets
a new operation identity and repeats complete Asset Export-specific preflight,
member-scope proof, visual destination-conflict handling and independent
authorization. Safe release, preserve-first copying and Protected Preserved
Recovery Staging use ADR 0401 eligibility and lifecycle rules. They never resume
the old export, reuse its consent or retry state, or overwrite/delete a source
file or published output.

<a id="0392-p006"></a>

ADR 0403's batch-history attention remains separate from this placement's
operational recovery state, Startup Recovery Attention, evidence and isolation.
Acknowledging, dismissing or expiring the history cannot clear that authority.

<a id="0392-p007"></a>

After operational resolution, the task projects one lightweight **Asset Export
Activity Record** under ADRs 0086–0090. A fully successful task that replaced no
destination occupant remains in Recent Export Activity for 7 days by default.
A terminal result containing failed, skipped, cancelled, Partial Placement
Success or any Replace Asset Export Destination outcome remains for 30 days by
default. The applicable interval begins only after unresolved placements and
ordinary conflict/recovery obligations are resolved. Existing user-configurable
Batch Activity Retention may adjust these history durations but cannot shorten
operational or receipt authority.

<a id="0392-p008"></a>

The record keeps only the task time/status, Original or Compatible mode,
path-free recipe summary, selected/eligible/pre-execution-excluded/placement/
output counts, logical and physical bytes, outcome counts, a safe destination
display label and the minimal Design Asset references/reason snapshots needed
to explain exceptional items. ADR 0397 Pre-Execution Compatible Export
Exclusion remains a distinct non-failure count; by itself it creates no retry,
Partial Variant Success, attention badge or extended failure retention. The
record stores no source absolute path, complete sensitive destination path,
image/thumbnail/preview/base64/content snapshot, original/exported file copy,
AI/OCR/tag/description/embedding result, encoder payload, credential or
portable private locator. Deleted assets become lightweight placeholders rather
than reconstructed content.

<a id="0392-p009"></a>

Reveal In Finder/Explorer uses a separate opaque **Asset Export Destination
Locator** retained only on the current device with the corresponding activity
record. It may target the single Save As result or Export Set Directory, is
excluded from portable library state, Full Library Backup, merge, Offline
Library Catalog, Cross-Library Search, metadata portability and support/export
reports, and never records a source path. If the external output is moved,
replaced, disconnected or unavailable, Reveal reports that current condition;
the application does not background-track or relink it.

<a id="0392-p010"></a>

Expiry or explicit clearing of a resolved activity record removes only its
summary and ordinary destination locator. It never deletes, moves, renames,
rewrites, reimports or unlinks an exported file/directory, changes a Design
Asset, clears unresolved operational state, removes operating-system trash, or
reclaims a user-owned Export Set Directory. An unresolved result alone creates
an Export Activity Attention badge; successful records do not. Viewing detail,
retrying, explicitly skipping/cancelling remaining work or resolving recovery
updates attention through existing Remaining Attention Count semantics rather
than treating every historical record as a notification.

<a id="0392-p011"></a>

When Replace Asset Export Destination succeeds, the device retains an **Asset
Export Destination Replacement Receipt** for the exact displaced ordinary file.
It enters ADR 0308 Local File Recovery and follows ADR 0307 recovery semantics:
alternate safe-location recovery is the default while the new exported output
occupies the old path; recovery never overwrites or removes that output, changes
the library or treats the displaced file as a backup. The receipt is independent
of the Asset Export Activity Record and survives its expiry/clearing and Forget
Library Registration.

<a id="0392-p012"></a>

An Asset Export Destination Replacement Receipt retires only after successful
receipt-scoped recovery, explicit Clear Replacement Recovery with a loss-of-
one-click-recovery warning, or authoritative proof that the exact trash item no
longer exists. Cache/storage pressure, result retention, plugin/AI maintenance,
settings reset and ordinary history clearing do not retire it. Uninstall
Preparation includes it under ADR 0308; external app deletion still cannot
guarantee preservation. Local File Recovery never enumerates unrelated system
trash or exposes the originating library/source path.

<a id="0392-p013"></a>

The immediate completion page and a contextual **Export Activity** surface in
Asset Workspace are the normal result entry points. The product does not create
a full audit log, permanent global history center or public export manifest from
these records. Local File Recovery remains its separate utility because it
represents external-file recovery authority, not export history.

<a id="0392-p014"></a>

The current application has no complete Asset Export Operational State,
activity projection, destination locator or export replacement receipt. This
ADR records target architecture only and records, reveals, expires, clears,
creates, reads, copies, renders, exports, stages, writes, publishes, retries,
rewrites, replaces, trashes, restores, renames, moves, deletes or changes no
runtime/user file, credential, sidecar, directory, database, cache, model,
backup, metadata value, analysis result, source relationship, public IPC,
database schema or AI Worker API.

<a id="adr-0394"></a>

## 0394 · Compatible Export XMP Companions Are Explicit Atomic Output Members

决定来源：[0394-compatible-export-xmp-companions-are-explicit-atomic-output-members.md](../../adr/0394-compatible-export-xmp-companions-are-explicit-atomic-output-members.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0394-p001"></a>

A **Compatible Export Metadata Gap** exists when the selected target media
format cannot faithfully embed a metadata field chosen under ADR 0393. The
affected item cannot confirm or silently discard the field. Asset Export Review
offers three explicit resolutions: remove the unsupported field from that
output, choose another target format/recipe, or enable a **Compatible Export XMP
Companion** when a trusted export capability declares a standard interoperable
XMP mapping, association convention and validator for the exact field and
target. A homogeneous reviewed group may share the same choice, but mixed
formats or capabilities never receive an inferred per-item fallback.

<a id="0394-p002"></a>

XMP is a fallback only for selected descriptive metadata whose semantics can be
represented through documented interoperable namespaces and properties. It
cannot rescue an output that lacks the color profile, orientation, bit depth,
alpha or other Essential Technical Metadata needed to interpret the media
correctly; that item still requires another format or recipe. A field that also
cannot be represented faithfully in declared XMP remains unsupported rather
than being flattened into a comment, keyword or private property.

<a id="0394-p003"></a>

Enabling the option creates an **XMP-Backed Compatible Export Unit** containing
every reviewed media output and its required XMP companion as one logical
multi-file result. The capability declares the exact media-to-sidecar
association and filename convention; the review shows the complete tree,
physical file count, bytes and field destination before confirmation. A
same-stem `.xmp` is used only where the capability proves that convention.
Filename resemblance or the presence of source XMP never establishes the
relationship by itself.

<a id="0394-p004"></a>

The XMP contains only explicitly selected values assigned to it by the reviewed
plan. It never raw-copies an unknown source packet or introduces an application-
private namespace, JSON payload or opaque analysis object. Embeddings/vectors,
internal Design Asset/database/member/storage identities, Collection/source
relationships, absolute paths, recovery state, model paths and private analysis
state remain prohibited. GPS, device serials, face regions and other Sensitive
Source Metadata require their separate ADR 0393 opt-in even when XMP could
represent them. Corrected OCR and an explicitly chosen AI-derived description
remain eligible only through the same explicit field selection and provenance
review already required for Compatible Export metadata.

<a id="0394-p005"></a>

Because the unit contains more than one physical file, ADR 0384 routes it
through an Export Set Directory and one dedicated asset directory rather than
single-file Save As. The complete media/XMP set stages and validates together.
Validation proves every media file, XMP syntax and declared property mapping,
exact reviewed value, naming/association rule and member inventory. ADR 0387
then publishes the complete staged directory atomically; if any media or XMP
member fails, no partial image-only or sidecar-only result reaches final paths.
Conflict, retry, cancellation, replacement and result reporting operate on the
whole placement rather than on individual members.

<a id="0394-p006"></a>

ADR 0397 refines only the containing layout for a multi-variant task: each
multi-file variant receives its own atomically published subdirectory inside
the asset directory. The media/XMP membership and all-or-nothing unit boundary
remain unchanged.

<a id="0394-p007"></a>

The exported XMP is an ordinary user-owned companion output. It is not a
Companion Original Member, Compound Original mutation, Attach Companion action,
Original Metadata Writeback, Source Content Generation, library sidecar,
preview/analysis input, application manifest or maintained synchronization
relationship. After publication the application does not track, update, relink
or reclaim the image/XMP association. Metadata Portability Export remains the
separate route for typed vectors, regions, relationships and full provenance;
it is never generated alongside the XMP unit automatically.

<a id="0394-p008"></a>

ADR 0393 governs which metadata values may enter Compatible Export and keeps
Original Asset Export byte-exact. ADRs 0340 and 0349 continue to govern actual
Original Asset companions, ADR 0371 governs Metadata Portability Export, and
ADRs 0384–0392 govern the multi-file output lifecycle. ADR 0395 resolves field
placement through embedded-first non-duplicating routing plus an explicit
advanced Full XMP Metadata Mirror.

<a id="0394-p009"></a>

The current application has no Compatible Export XMP capability, review,
validator or atomic companion publisher. This ADR records target architecture
only and reads, extracts, serializes, embeds, removes, exports, stages, writes,
publishes, attaches, tracks, rewrites, converts, moves, deletes or changes no
runtime/user file, credential, sidecar, directory, database, cache, model,
backup, metadata value, analysis result, source relationship, public IPC,
database schema or AI Worker API.

<a id="adr-0395"></a>

## 0395 · Compatible Export Metadata Routes Embedded First With Optional XMP Mirror

决定来源：[0395-compatible-export-metadata-routes-embedded-first-with-optional-xmp-mirror.md](../../adr/0395-compatible-export-metadata-routes-embedded-first-with-optional-xmp-mirror.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0395-p001"></a>

Compatible Export defaults to **Embedded-First Compatible Metadata Routing**.
Essential Technical Metadata always remains in the generated media where the
consumer needs it to interpret pixels correctly. Each selected descriptive
field is written only into the media when the exact target capability can
faithfully embed and validate it; otherwise it is routed to an explicitly
enabled ADR 0394 XMP companion when a faithful standard mapping exists. A field
that fits neither destination remains a Compatible Export Metadata Gap. The
default never duplicates a descriptive value across media and sidecar merely
for convenience.

<a id="0395-p002"></a>

Every destination representation derives from one frozen reviewed semantic
value. The review shows the exact destination, namespace/property, language,
limits and transformations for each field. An encoder may use several
synchronized properties inside one media file only when its capability declares
that interoperable representation as one field mapping and validation proves
the values agree; it cannot use that implementation detail to create an
undeclared media/XMP-sidecar mirror.

<a id="0395-p003"></a>

An advanced, default-off **Full XMP Metadata Mirror** is available for workflows
that deliberately require a complete sidecar view. It may create an XMP-Backed
Compatible Export Unit even when no metadata gap otherwise requires one. In
this mode, every already selected descriptive field that both the media and XMP
can represent faithfully is written to both destinations from the same frozen
value, while selected fields that only XMP can carry remain XMP-only. The XMP
therefore contains the complete selected compatible descriptive set. "Full"
does not mean all source metadata, all library metadata or all fields known to
the application. If any selected descriptive field lacks an exact XMP mapping,
the output cannot be described as a Full XMP Metadata Mirror; review requires
removing that field, returning to embedded-first routing or changing the recipe.

<a id="0395-p004"></a>

The mirror option never expands field eligibility. Sensitive Source Metadata
still requires its separate explicit selection and the review discloses every
destination copy. OCR and AI-derived descriptions retain ADR 0393 selection and
provenance requirements. Embeddings, private namespaces/JSON, internal
identities, paths, model state and other prohibited values remain excluded.
ICC profiles, orientation and other interpretation-critical technical evidence
remain authoritative in the media and cannot be replaced by a sidecar copy.

<a id="0395-p005"></a>

Validation compares the embedded and XMP representations against the same
reviewed semantic values and blocks publication on missing, lossy or divergent
mirrors. ADR 0394 still stages and publishes the complete media/XMP directory as
one commit unit. After publication both files are ordinary user-owned outputs;
the application does not designate either as a continuing authority, monitor
external edits or synchronize later divergence. The explicit mirror therefore
improves sidecar-oriented interoperability at the accepted cost of duplicate
values and possible post-export disagreement.

<a id="0395-p006"></a>

ADR 0393 continues to govern selected values and privacy, while ADR 0394 governs
XMP eligibility, naming, layout and atomic publication. Original Asset Export,
Original Metadata Writeback, Compound Original companions and Metadata
Portability Export remain separate and unchanged.

<a id="0395-p007"></a>

The current application has no embedded-first field router or Full XMP Metadata
Mirror option. This ADR records target architecture only and reads, extracts,
serializes, embeds, mirrors, removes, exports, stages, writes, publishes,
attaches, tracks, synchronizes, rewrites, converts, moves, deletes or changes no
runtime/user file, credential, sidecar, directory, database, cache, model,
backup, metadata value, analysis result, source relationship, public IPC,
database schema or AI Worker API.

<a id="adr-0396"></a>

## 0396 · Compatible Export Presets Store Reusable Intent Without Authorization

决定来源：[0396-compatible-export-presets-store-reusable-intent-without-authorization.md](../../adr/0396-compatible-export-presets-store-reusable-intent-without-authorization.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0396-p001"></a>

A **Compatible Export Preset** is a named reusable recipe intent, not a saved
Asset Export Review or permission to write. It may retain target format,
dimension rule, output color intent/profile behavior, bit depth, quality,
visual-unit scope, ADR 0393 metadata policy, ordinary non-sensitive field-class
intent, ADR 0395 routing and XMP mode. It stores semantic requirements rather
than a previously selected encoder or plugin implementation.

<a id="0396-p002"></a>

Saving requires an explicit scope and defaults to **Personal Compatible Export
Preset**. A personal preset is device-local, available while working in any
library on that device, and excluded from portable library state and Full
Library Backup. A **Library Compatible Export Preset** is authoritative portable
state owned by the active library, available whenever that library is active on
a compatible device and included in its normal backup and restore. The scopes
have independent identities; copying between them creates a new preset, and
later edits, renames or deletion do not synchronize.

<a id="0396-p003"></a>

Application-provided **Built-In Compatible Export Presets** are immutable and
versioned with the product. A user edits one only by copying it into personal or
library scope. Product updates may replace built-in definitions but never
rewrite a user copy or silently convert its scope. Missing current support keeps
any preset readable with truthful unavailable fields rather than deleting or
mutating it.

<a id="0396-p004"></a>

No preset stores a destination path or locator, selected Design Assets,
Collection placement, proposed/final filenames, resolved per-item values,
Source Content Generation, capability proof, encoder/plugin binary, installed
capability snapshot, staging, activity/recovery state, destination collision
decision, unique-name allocation, skip choice, replacement/overwrite
confirmation or filesystem permission. It also stores no current metadata
values and no authorization to include GPS, device serials, face regions or
other Sensitive Source Metadata. An AI-derived description remains a separate
per-run explicit selection; a preset cannot preapprove generated content merely
by requesting a metadata policy.

<a id="0396-p005"></a>

Applying a preset always opens a fresh complete Asset Export Review. The review
resolves the current selected assets, visual units, real formats, target
capabilities, installed encoders/extensions, field values, privacy choices,
output tree, destination, names, bytes and conflicts. Unsupported items remain
visible and never trigger automatic format fallback, encoder substitution,
extension/plugin installation, model execution or download. Any sensitive
metadata choice, XMP companion consequence and destructive destination
replacement requires its normal current confirmation.

<a id="0396-p006"></a>

Once the user confirms export, the operation owns a frozen reviewed recipe and
evidence snapshot independent of the preset. Editing or deleting the preset
cannot change, pause, retry, recover or reinterpret active or completed export
work. Preset deletion removes only reusable intent and never touches exported
files, originals, library metadata or activity/recovery records.

<a id="0396-p007"></a>

Under ADR 0397, one preset supplies at most one Compatible Export Variant
recipe. A user may explicitly compose several preset-derived or custom variants
in one task, but applying one preset never adds hidden variants, defines a
fallback chain or preauthorizes the resulting variant set.

<a id="0396-p008"></a>

ADR 0398 separately saves a whole Variant Set as owned recipe snapshots with
personal or library scope. Those snapshots do not become live references back
to this individual preset and retain none of an export task's reviewed
operation state.

<a id="0396-p009"></a>

ADR 0334 Source Rewrite Presets use analogous personal/library scopes but remain
separate source-mutation intents and cannot import, execute or substitute a
Compatible Export Preset. ADR 0383 governs compatible recipe resolution,
ADRs 0393–0395 govern metadata/XMP semantics, and destination/publication
authority remains under ADRs 0384–0392.

<a id="0396-p010"></a>

The current application has no Compatible Export Preset store, built-in preset
registry or scope selector. This ADR records target architecture only and
creates, reads, applies, copies, saves, synchronizes, backs up, exports, stages,
writes, publishes, replaces, downloads, installs, rewrites, moves, deletes or
changes no runtime/user file, credential, sidecar, directory, database, cache,
model, backup, metadata value, analysis result, source relationship, public IPC,
database schema or AI Worker API.

<a id="adr-0397"></a>

## 0397 · Compatible Export Variants Commit And Report Independently

决定来源：[0397-compatible-export-variants-commit-and-report-independently.md](../../adr/0397-compatible-export-variants-commit-and-report-independently.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0397-p001"></a>

A Compatible Export task contains an explicit ordered **Compatible Export
Variant Set** with at least one named **Compatible Export Variant**. Each variant
owns one complete compatible recipe covering format, dimensions, color/profile,
bit depth/quality, visual-unit scope and ADRs 0393–0395 metadata/XMP behavior.
It may start from one ADR 0396 preset or a custom recipe. Adding a variant is
always a user action; a variant is never inferred from source content, generated
as a format fallback or run only after another variant fails.

<a id="0397-p002"></a>

Distinct normalized variant names may intentionally carry semantically
equivalent complete recipes. The set editor and Asset Export Review show a
non-blocking **Duplicate Compatible Export Recipe** signal, but neither surface
merges, removes or rewrites either variant. Equivalence compares frozen semantic
recipe intent, not chosen encoder identity or final byte equality. Each variant
still resolves its own matrix cells, receives its own qualified output names,
commits independently and reports independently; safe shared processing remains
only the guarded ADR 0390 optimization.

<a id="0397-p003"></a>

The user may acknowledge a current equivalence group as an **Intentional
Duplicate Recipe Group** in the task, or receive that descriptive acknowledgement
from an applied ADR 0398 composition. Review then labels the group intentional
without repeatedly requesting duplicate acknowledgement, while still showing
every variant, physical output, estimated byte and conflict consequence. The
acknowledgement grants no matrix resolution, destination authority or execution
consent. Adding/removing a group member or changing any member name or recipe
invalidates it and restores the ordinary duplicate warning; reordering the same
unchanged group does not.

<a id="0397-p004"></a>

ADR 0412 owns complete **Compatible Export Matrix Resolution**, explicit task-
local exclusions, Now Supported state and reviewed reinclusion. This ADR keeps
the downstream rule: only cells remaining executable in the confirmed plan
produce commit units and participate in variant/placement success outcomes.

<a id="0397-p005"></a>

For Compatible Export, the **Asset Export Commit Unit** is refined to one
Design Asset × Compatible Export Variant × Asset Export Placement. All pages,
artboards, frames or other outputs selected by that variant for the asset and
every required ADR 0394 XMP companion remain members of that one unit: they
stage, validate and publish together. Copy Per Membership creates independent
placement units for the same asset-variant. Original Asset Export has no
variants and keeps one Design Asset × placement commit unit.

<a id="0397-p006"></a>

One variant's successful commit becomes ordinary user-owned output immediately
and is not removed because another variant fails, pauses, conflicts or is
cancelled. Results report every asset, variant and placement separately. An
asset with at least one successful confirmed executable variant and at least
one non-successful confirmed executable variant has **Partial Variant
Success**; pre-execution exclusions are shown separately and do not participate.
A variant copied to several explicit placements may independently have Partial
Placement Success. Manual retry freshly preflights only selected failed or
cancelled variant placements and never regenerates successful variants.

<a id="0397-p007"></a>

Multiple variants necessarily use an Export Set Directory. Each Design Asset's
variants remain grouped under one human-readable asset directory. A one-file
variant publishes through its variant-qualified final filename; a variant with
several media/XMP members uses a dedicated variant subdirectory so the complete
unit can publish atomically without merging into another variant. A task with
only one variant retains ADR 0384's simpler one-file Save As or ordinary
single-variant multi-file layout.

<a id="0397-p008"></a>

When more than one variant exists, every output receives a visible
human-readable variant qualifier derived from the reviewed variant name in
addition to any page/artboard/frame qualifier. Variant names are presentation
labels, not asset identity or capability evidence, and must be unique after
destination normalization within the set. Same-plan collisions never establish
variant priority or permit a later variant to replace an earlier one.

<a id="0397-p009"></a>

Conflict review may skip one affected asset-variant and all of its placements
without skipping the asset's other variants. Skipping the whole Design Asset
remains a separate broader choice that excludes every variant and placement.
Replacement, unique naming and Apply To All retain their existing current-
occupant and homogeneous-risk checks at the asset-variant placement boundary.

<a id="0397-p010"></a>

The confirmed operation freezes each variant recipe, matrix resolution and
reviewed Compatible Export Variant Priority. Later preset edits, variant
reordering, title changes or capability changes do not mutate the running plan;
current drift reopens only affected uncommitted asset-variant units. Priority
guides eligible admission under ADR 0407 but never supplies strict execution
order, collision precedence or fallback meaning. Variants never replace/relink
originals, create Design Assets, become source generations or imply that
several exported renditions are library-managed versions of one asset.

<a id="0397-p011"></a>

ADR 0383 still permits exactly one task-wide Asset Export Mode, so Original and
Compatible results never mix. ADRs 0384–0392 govern layout, naming, conflicts,
publication, control, scheduling, directory ownership and activity/recovery at
the refined commit boundary. ADR 0396 presets supply at most one variant recipe
each and do not preauthorize a variant set or its execution. ADR 0398 may save
an ordered set as independent recipe snapshots, but applying it still creates a
fresh reviewed task-local matrix. ADR 0399 removes an arbitrary small variant
cap while requiring complete evidence-gated progressive planning before any
matrix can be confirmed.

<a id="0397-p012"></a>

The current application has no Compatible Export Variant Set, variant matrix or
variant-level publisher/result projection. This ADR records target architecture
only and creates, reads, renders, exports, stages, writes, publishes, retries,
replaces, downloads, installs, rewrites, moves, deletes or changes no
runtime/user file, credential, sidecar, directory, database, cache, model,
backup, metadata value, analysis result, source relationship, public IPC,
database schema or AI Worker API.

<a id="adr-0398"></a>

## 0398 · Compatible Export Variant Set Presets Own Recipe Snapshots

决定来源：[0398-compatible-export-variant-set-presets-own-recipe-snapshots.md](../../adr/0398-compatible-export-variant-set-presets-own-recipe-snapshots.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0398-p001"></a>

A **Compatible Export Variant Set Preset** is a named reusable ordered
composition of ADR 0397 Compatible Export Variants. Each member owns a snapshot
of its variant name and complete semantic recipe intent at the moment the
composition is saved. It does not hold a live reference to the individual
Compatible Export Preset from which a variant may have been copied. Later
editing, renaming, moving or deleting either object cannot silently change the
other.

<a id="0398-p002"></a>

The composition is always flat: its only member type is an owned Compatible
Export Variant recipe snapshot. It cannot contain another Variant Set Preset,
a set identity, nested scope or recursive reference. Adding another composition
to an editing draft performs a one-time ordered flatten-and-copy of that
composition's current member snapshots. The destination receives no source
scope, origin dependency or update relationship, and later changes to either
composition never propagate.

<a id="0398-p003"></a>

Saving requires an explicit scope and defaults to **Personal Compatible Export
Variant Set Preset**. Personal compositions are device-local and available
across libraries on that device. A **Library Compatible Export Variant Set
Preset** is portable state owned by the active library and included in that
library's Full Library Backup and restore. Copying between scopes or copying a
composition to edit it creates a new independent identity; no scope is a
synchronized view of another.

<a id="0398-p004"></a>

A recipe snapshot may contain only the same semantic format, dimensions,
color/profile, bit depth/quality, visual-unit and permitted metadata/XMP intent
allowed by ADR 0396. It contains no selected Design Assets, current field
values, destination, path/locator, Collection placement, final name,
asset-variant eligibility, resolved encoder/capability, installed plugin state,
size estimate, conflict/skip/unique-name/replacement choice, sensitive-metadata
consent, AI-derived-value approval, filesystem authority, staging, result or
recovery evidence. Saving from a reviewed or completed task strips operation
state rather than turning that task into reusable authorization.

<a id="0398-p005"></a>

Applying the composition creates a fresh task-local Compatible Export Variant
Set from copied member snapshots and always opens the complete current Asset
Export Review. The application rebuilds the asset × variant matrix from current
formats, capabilities, metadata, privacy choices, names, destination and
conflicts. Missing or changed capabilities leave affected variants visibly
unsupported; they do not rewrite the stored composition, install/download a
replacement, remove the variant, or activate another member as a fallback.

<a id="0398-p006"></a>

Editing a composition means explicitly editing, replacing, adding, removing,
renaming or reordering its owned variant snapshots. It never edits the source
single-variant presets. Deleting a source preset leaves every earlier snapshot
intact, and deleting or editing the composition cannot alter an already
confirmed task because that task owns its own frozen ADR 0397 recipes and
matrix evidence. The saved order becomes the fresh task's reviewed Compatible
Export Variant Priority. Under ADR 0407 it remains a stable visible admission
preference rather than a promise of dispatch or completion order.

<a id="0398-p007"></a>

Flattened member names must remain unique under the same destination
normalization used by ADR 0397. Every collision is resolved in the editing
draft before save through an explicit Rename Imported Member, Replace Existing
Member or Skip Imported Member choice. The application never invents a suffix,
silently merges recipes, treats matching names as recipe equality or changes
the source composition while resolving the destination draft.

<a id="0398-p008"></a>

Different valid member names may retain semantically equivalent complete recipe
snapshots. The editor presents Duplicate Compatible Export Recipe as a
non-blocking save warning rather than treating it as a collision or silently
deduplicating the composition. Keeping both preserves distinct members and
later produces the independent ADR 0397 review, output, commit and result
boundaries; semantic equivalence is not a stored promise of byte-identical
encoding.

<a id="0398-p009"></a>

After reviewing the warning, the user may mark the exact current equivalence
group as an **Intentional Duplicate Recipe Group**. The composition may retain
that path-free descriptive acknowledgement because it authorizes no execution,
destination, conflict choice or resource use. Applying the composition carries
the acknowledgement into fresh review only as an “Intentional Duplicate” label:
all distinct variants, outputs, estimated bytes and conflicts remain visible.
Adding/removing a group member or changing any member name or recipe invalidates
the acknowledgement and restores the warning; reordering the same unchanged
members does not.

<a id="0398-p010"></a>

Flattened members without a collision, including explicitly renamed imports,
append after the destination draft's current members in their source-relative
order. Skip omits only that imported member. Replace copies the imported
member's complete name and recipe snapshot into the colliding existing member's
position; it neither appends a second member nor moves the existing slot.
After all collision choices, the user may explicitly reorder the complete flat
draft before saving, and that reviewed order becomes the composition's saved
Compatible Export Variant Priority.

<a id="0398-p011"></a>

ADR 0396 individual Compatible Export Presets remain the reusable unit for one
variant recipe. ADR 0397 remains the runtime task and commit model. A variant
set preset composes copied intents only; it does not mix Original Asset Export,
create a fallback chain, preauthorize execution or make exported outputs into
managed versions. ADR 0399 imposes no arbitrary small member-count cap: saving
depends only on complete valid representation of the finite flat composition,
while applying it must progressively plan and completely review the actual
asset/variant/output scale before confirmation.

<a id="0398-p012"></a>

The current application has no Compatible Export Variant Set Preset store or
scope selector. This ADR records target architecture only and creates, reads,
copies, saves, applies, synchronizes, backs up, renders, exports, stages, writes,
publishes, downloads, installs, rewrites, moves, deletes or changes no
runtime/user file, credential, sidecar, directory, database, cache, model,
backup, metadata value, analysis result, source relationship, public IPC,
database schema or AI Worker API.

<a id="adr-0399"></a>

## 0399 · Compatible Export Uses Evidence-Gated Progressive Planning Without Arbitrary Variant Caps

决定来源：[0399-compatible-export-uses-evidence-gated-progressive-planning-without-arbitrary-variant-caps.md](../../adr/0399-compatible-export-uses-evidence-gated-progressive-planning-without-arbitrary-variant-caps.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0399-p001"></a>

Compatible Export Presets, Variant Set Presets and task-local Variant Sets have
no small fixed product limit on variant count. Safety is governed by current
**Compatible Export Planning Scale**: selected Design Assets, variants, asset ×
variant cells, placements, visual-unit outputs, metadata/XMP companions and
estimated physical bytes. Distinct variants in a Duplicate Compatible Export
Recipe group remain distinct contributors rather than being discounted.

<a id="0399-p002"></a>

A finite flat ADR 0398 composition may be saved whenever its complete semantic
state and unique member names can be safely validated and represented. Saving
does not require current assets, encoders, destination capacity or expansion of
an asset matrix. A concrete inability to validate or represent the complete
composition is reported as that specific condition; it is not disguised as an
arbitrary lower variant cap or resolved by truncation.

<a id="0399-p003"></a>

Applying recipes starts cancellable, read-only **Progressive Compatible Export
Planning**. The planner may enumerate and persist bounded chunks and project a
virtualized matrix instead of retaining every cell or row in renderer memory.
During planning, current counts and byte/time estimates are visibly incomplete;
no output execution, destination mutation, capability installation, model work
or download starts merely to finish planning.

<a id="0399-p004"></a>

Confirmation remains unavailable until the complete selected scope has been
enumerated and every asset-variant has ADR 0397 Compatible Export Matrix
Resolution. The final review accounts for all physical members, placements,
names, paths, capability/encoder evidence, metadata/privacy consequences,
conflicts, estimated bytes and destination constraints. Progressive display is
not progressive authorization: no sampled, hidden or not-yet-enumerated tail
may be treated as confirmed, and execution never begins while planning is still
incomplete.

<a id="0399-p005"></a>

While review is open, **Compatible Export Planning Evidence Drift** invalidates
only its dependent proof. A source-generation change rebuilds every variant
cell for that Design Asset; a recipe change rebuilds that variant across all
selected assets; an encoder/capability change rebuilds cells that depend on it;
and destination occupancy or capacity drift rebuilds affected paths plus the
capacity aggregate. Unrelated proven cells remain available. The surface shows
Plan Updating and disables confirmation while affected evidence is rebuilt.

<a id="0399-p006"></a>

After complete enumeration, one closure validation covers every source,
recipe, capability, destination path, occupant and capacity dependency. Only a
stable closure may enable confirmation. Drift during closure reopens the
affected scope and repeats closure after repair; continuing change keeps the
plan visibly unconfirmable with its exact current reason. No stale evidence is
frozen merely to finish review.

<a id="0399-p007"></a>

Workload guidance uses graduated evidence-based warnings for actual matrix,
placement/output, byte, estimated-duration and resource scale. A large but
fully proven plan remains confirmable. Blocking is permitted only when current
evidence proves the application cannot safely enumerate, represent, persist or
review the complete plan, or when an ordinary concrete capability, path,
conflict, permission or destination constraint remains unresolved. The block
names the exact reason and offers scoped remediation such as reducing the asset
selection, removing variants, resolving/excluding cells, choosing another
destination or retrying planning after resources recover.

<a id="0399-p008"></a>

The application never silently truncates variants/assets/visual units, samples
the confirmed plan, lowers quality, substitutes a format, merges duplicate
recipes, auto-excludes cells or reports an incomplete matrix as complete. The
review remains filterable/groupable by variant, asset and issue while global
counts always describe the full current plan rather than only rendered rows.

<a id="0399-p009"></a>

ADR 0410 owns the fixed cross-platform synthetic shapes and the responsiveness,
completion, memory, cancellation and leak acceptance thresholds for this
planner. Those profiles are validation references, not count ceilings, minimum
supported hardware or configurable correctness rules.

<a id="0399-p010"></a>

ADR 0411 owns disposable planning intermediates, abandoned-state cleanup,
temporary-volume safety reserves, planning-memory headroom and their device-
local tuning boundary. Resource pressure pauses bounded chunk admission rather
than truncating the matrix or weakening complete review.

<a id="0399-p011"></a>

The current application has no complete progressive Compatible Export planner
or unbounded virtualized matrix. This ADR records target architecture only and
enumerates, creates, reads, renders, exports, stages, writes, publishes,
installs, downloads, rewrites, moves, deletes or changes no runtime/user file,
credential, sidecar, directory, database, cache, model, backup, metadata value,
analysis result, source relationship, public IPC, database schema or AI Worker
API.

<a id="adr-0407"></a>

## 0407 · Asset Export Admission Uses Non-Preemptive Task Fair Rotation

决定来源：[0407-asset-export-admission-uses-non-preemptive-task-fair-rotation.md](../../adr/0407-asset-export-admission-uses-non-preemptive-task-fair-rotation.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0407-p001"></a>

Multiple confirmed export tasks can compete for the same bounded lanes and media resources. Draining one task completely can starve later tasks, while newest-first or manual priority invites unstable completion promises. Admission therefore uses stable task fairness without interrupting work already in a commit boundary.

<a id="0407-p002"></a>

**Asset Export Task Fair Rotation** is a stable non-preemptive ring. A newly confirmed task joins the tail. After one commit unit is admitted from an eligible task, the next admission opportunity starts from the next eligible task. A task-internal variant or manual-retry preference chooses that task's candidate only after the task receives its turn. Running, publication, and recovery units are never preempted.

<a id="0407-p003"></a>

A paused, retry-delayed, conflict/recovery-blocked, or resource/volume-waiting task does not hold the rotation head and accumulates no banked turns. It remains in the ring for reconsideration when evidence changes. When only one task is eligible, it may fill all currently proven safe capacity. Disjoint-volume concurrency may admit several tasks, and each new admission advances fairness independently. Version one exposes Pause/Resume but no manual task ordering or priority slider.

<a id="0407-p004"></a>

A confirmed ADR 0397 task freezes **Compatible Export Variant Priority**. Within its own turn, otherwise equally eligible units prefer the earlier variant, but lanes, resource gates, pressure, and safe intermediate reuse can change actual dispatch or completion order. The UI keeps reviewed priority visible and explains waiting reasons rather than presenting observed completion order as a guarantee.

<a id="0407-p005"></a>

Automatic-retry delay reserves no lane, resource slot, or queue head. After delay and current-evidence validation, the placement returns at its original frozen variant priority. Explicit Retry Asset Export Placements gives freshly preflighted selected placements preference over ordinary unstarted placements only inside the same task; it grants no cross-task priority and never preempts active work.

<a id="0407-p006"></a>

ADR 0390 owns physical-volume lanes, the Media Processing Resource Gate, and safe shared intermediates. ADR 0408 can reduce safe admission below the fair scheduler's available turns but cannot silently change the ring or create priority through resource pressure.

<a id="adr-0408"></a>

## 0408 · Asset Export Admission Is Bounded By Resource And Responsiveness Guards

决定来源：[0408-asset-export-admission-is-bounded-by-resource-and-responsiveness-guards.md](../../adr/0408-asset-export-admission-is-bounded-by-resource-and-responsiveness-guards.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0408-p001"></a>

An export scheduler can be correct yet still make the desktop unusable or exceed safe memory, accelerator, thermal, power, or staging capacity. Concurrency is therefore a desired upper bound below hard evidence gates, and responsiveness is a measured admission condition rather than a throughput promise.

<a id="0408-p002"></a>

Scheduling preserves interactive navigation, requested preview, progress inspection, Pause/Cancel, and recovery controls. Memory or accelerator pressure, thermal throttling, low-power/battery policy, destination capacity pressure, or stale required telemetry stops new admission immediately. In-flight work reaches its ADR 0388 safe boundary or settles a non-interruptible publication/recovery call; it is not blindly killed and partial output is not published.

<a id="0408-p003"></a>

Version one exposes Running and typed waiting reasons plus a device-local **Asset Export Concurrency Ceiling**: Auto by default or a manual 1–16 maximum. The host admits only the lower value proven by the selected ceiling, disjoint ADR 0390 volume lanes, one-heavy-compatible limit, lightweight-media capacity, current memory/accelerator/thermal/power/staging evidence, and ADR 0407 fairness. The surface shows configured ceiling, active count, and limiting reasons. A changed ceiling affects future admission only. Raising the range or relaxing the heavy limit requires new representative performance, peak-resource, responsiveness, and recovery evidence plus a policy revision.

<a id="0408-p004"></a>

The **Asset Export Responsiveness Guard** requires interaction-to-visible-response latency at or below 100 ms p95 and 250 ms p99, Asset Library grid frame time at or below 33 ms p95, no UI freeze over 500 ms, and truthful Pause/Cancel visual acknowledgment within 200 ms. The last threshold does not claim a non-interruptible boundary has stopped. Formal release-build validation runs three ten-minute stress shapes with controlled non-private fixtures on both ADR 0410 reference profiles: one-volume contention, high-count lightweight work across independent volumes at ceiling 16, and mixed professional/heavy plus lightweight work with background preview/indexing.

<a id="0408-p005"></a>

Failure for three consecutive one-second windows reduces subsequent admissions and exposes the limiting reason. Restoration requires every responsiveness and resource target healthy for 15 consecutive seconds, then adds at most one slot followed by a ten-second observation period. Another three-window failure removes a slot and starts a 30-second recovery cooldown. Admission never exceeds the selected ceiling.

<a id="0408-p006"></a>

Hysteresis never interrupts publication/recovery or abandons required reconciliation merely to meet a UI metric. Immediate memory, thermal, power, or storage danger bypasses the responsiveness windows and stops new admission at once. Clearing pressure does not resume a user-paused task without explicit Resume Asset Export.

<a id="0408-p007"></a>

ADR 0431 applies the same visible-response, grid-frame, freeze and pause-feedback thresholds to Custom Field Migration, but owns a separate metadata-migration safe-capacity calculation and never borrows Asset Export worker or volume concurrency.

<a id="adr-0409"></a>

## 0409 · Background Asset Export Requires An Explicit Profile And Visible Host

决定来源：[0409-background-asset-export-requires-an-explicit-profile-and-visible-host.md](../../adr/0409-background-asset-export-requires-an-explicit-profile-and-visible-host.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0409-p001"></a>

Confirmed export may usefully continue when a window loses focus or closes, but hidden full-speed work can surprise users and consume resources. Background execution therefore has an explicit admission profile and, when no window is visible, requires the same discoverable application host as other no-window work.

<a id="0409-p002"></a>

After no main window has held foreground focus for five continuous seconds, the device-local **Background Asset Export Profile** governs new admission. Pause admits no new placement after active work reaches a safe boundary. Energy Saver admits at most 25% of the current Auto/manual ceiling, rounded down but at least one, and preserves at least 40% physical-memory headroom. Balanced is the default, admits at most 50%, and preserves at least 30% headroom. Full Speed retains the selected ceiling and configured memory reserve. Every non-paused profile uses reduced process and disk-I/O priority and remains subordinate to ADR 0390 lanes/media gates and ADR 0408 resource/responsiveness guards. Foreground return restores ordinary admission without preemption.

<a id="0409-p003"></a>

**Continue Asset Export After Closing The Window** is a separate default-Off device preference for already confirmed tasks. It works only while the normal platform lifecycle keeps a discoverable application process alive, installs no daemon/service/login helper, does not enable ADR 0174's AI preference, and never lets a worker outlive the host. Explicit Quit always follows ADR 0402 and the operation checkpoints of ADR 0388.

<a id="0409-p004"></a>

When no window is visible and continued export is enabled, the single ADR 0174 **Application Status Center** remains persistent through the macOS menu bar or Windows notification area. Its Asset Export section exposes only aggregate Running, Waiting, Paused, and Needs Attention counts, selected profile, effective concurrency, limiting reasons, and scoped Pause All/Resume Eligible controls. Open Design Asset Manager and Quit remain global.

<a id="0409-p005"></a>

The compact surface exposes no Cancel, output deletion, replacement action, asset name, thumbnail, path, metadata, or other private content. System notifications never substitute for it. If the platform cannot provide a trustworthy visible status item and operable card, continue-after-close is unavailable rather than invisible.

<a id="adr-0410"></a>

## 0410 · Compatible Export Planning Has Fixed Cross-Platform Performance Acceptance

决定来源：[0410-compatible-export-planning-has-fixed-cross-platform-performance-acceptance.md](../../adr/0410-compatible-export-planning-has-fixed-cross-platform-performance-acceptance.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0410-p001"></a>

Evidence-gated progressive planning has no useful scale claim without repeatable responsiveness, completion, memory, cancellation, and leak criteria. These criteria are product acceptance evidence, not configurable limits or minimum supported hardware.

<a id="0410-p002"></a>

Minimum validation uses two synthetic, non-private shapes: 100,000 Design Assets × 10 variants for 1,000,000 cells, and 1,000 Design Assets × 100 variants for 100,000 cells. Both include multi-visual-unit recipes and ADR 0394 XMP companions so physical output count exceeds cell count and exercises the output tree, naming, capacity, and conflicts. They are minimum evidence shapes, never supported-count ceilings or permission to truncate larger plans.

<a id="0410-p003"></a>

Formal release builds run cold and repeat cases on two **Compatible Export Planning Performance Reference Devices**: macOS on Apple M1 with 16 GB memory and SSD, and Windows on a documented approximately 2020-class four-core/eight-thread x64 processor with 16 GB memory and SSD. Neither relies on a discrete GPU. Exact OS/build and Windows processor/storage models accompany evidence. Faster-device results are supplemental. These profiles are not installation gates, Minimum Supported System Requirements, or encoder-throughput promises.

<a id="0410-p004"></a>

Both profiles present the truthful planning surface and usable Cancel within one second. Repeat planning shows first real completed-chunk statistics and matrix content within two seconds; cold planning does so within five seconds. The 1,000,000-cell shape completes repeat planning within 60 seconds and cold planning within 90 seconds. The 100,000-cell variant-axis shape completes repeat planning within 15 seconds and cold planning within 30 seconds. Completion requires every selected cell, physical member, path/name, capability consequence, estimated byte, destination constraint, and conflict needed for confirmation; skeletons, invented progress, sampling, or hidden ongoing evidence do not satisfy it.

<a id="0410-p005"></a>

Combined resident memory across the full application process tree stays at or below 2 GB and grows no more than 1 GB above measured pre-planning baseline. Within 60 seconds after Cancel or leaving planning it settles to no more than 200 MB above baseline. After one warm-up, five planning-and-exit runs show no sustained cumulative growth, and final settled memory is no more than 10% above the first settled value. Disk-backed state cannot hide retained processes, mappings, or leaks.

<a id="0410-p006"></a>

Cancel enters truthful Cancelling and stops new chunk dispatch within 200 ms; every planner/worker acknowledges within one second; active chunks release file handles, planning leases, and temporary resource pins within five seconds. The partial plan remains incomplete and unconfirmable. Read-only cancellation changes no destination or output, while the separate 60-second memory-settle requirement still applies.

<a id="0410-p007"></a>

Missing any acceptance threshold is a release-performance or memory-leak failure. It never permits shrinking fixtures, hiding matrix content, weakening complete review, or reclassifying a reference profile as unsupported merely to pass.

<a id="0410-p008"></a>

ADR 0431 reuses these two documented hardware profiles for 100,000-owner Custom Field Migration responsiveness evidence. That reuse does not import export-planning completion or memory thresholds into migration and does not make either profile a minimum installation requirement.

<a id="adr-0411"></a>

## 0411 · Compatible Export Planning State Is Disposable And Reserve-Gated

决定来源：[0411-compatible-export-planning-state-is-disposable-and-reserve-gated.md](../../adr/0411-compatible-export-planning-state-is-disposable-and-reserve-gated.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0411-p001"></a>

Large progressive plans need bounded disk-backed intermediates, but those intermediates are neither durable authorization nor recovery evidence. They must be disposable after the review session while admission protects both temporary-volume and physical-memory headroom.

<a id="0411-p002"></a>

Normal Cancel or leaving planning invalidates intermediate state immediately and removes it in the background. A crash or forced exit leaves abandoned application-managed state identified by opaque planning-job identity. The next launch never restores, confirms, or reuses it; a new plan validates every source, destination, and capability fact again. Discovery and cleanup do not block launch. Once idle and writable, cleanup completes within 60 seconds; an occupied or temporarily unwritable item remains visibly pending with an exact scoped reason and automatic retry, never valid planning evidence.

<a id="0411-p003"></a>

Planning temporary data has no fixed per-plan gigabyte cap. Before each bounded chunk, the planner proves enough space while preserving the greater of 5 GB and a configurable percentage of the temporary volume's total capacity, default 5%. The UI shows current use and an explicitly evolving remaining-demand estimate. If the reserve cannot be maintained, planning pauses at a safe chunk boundary and offers space remediation or another local writable temporary volume. Continuing elsewhere requires verified migration and rebinding of the managed planning state. Loss or exhaustion pauses rather than truncating, excluding, lowering quality, or weakening review.

<a id="0411-p004"></a>

A device-local planning-memory reserve defaults to 20% of physical memory with a validated 10%–50% range. New chunks preserve that headroom and still pause under operating-system memory pressure. Resource settings change admission only; they cannot change ADR 0410 acceptance thresholds, complete-plan evidence, reserve floors, file/publication correctness, or trust rules. Any additional precise resource setting requires explicit units, default, range, and the same inability to override correctness.

<a id="0411-p005"></a>

ADR 0399 owns progressive plan completeness and evidence drift. ADR 0408 separately governs export-execution concurrency and responsiveness. Settings UI follows the shared precise numeric-input-plus-slider interaction in DESIGN.md, but that presentation pattern does not convert fixed safety or acceptance constants into user settings.

<a id="adr-0412"></a>

## 0412 · Compatible Export Matrix Resolution Is Explicit And Task-Local

决定来源：[0412-compatible-export-matrix-resolution-is-explicit-and-task-local.md](../../adr/0412-compatible-export-matrix-resolution-is-explicit-and-task-local.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0412-p001"></a>

A multi-variant Compatible Export cannot truthfully confirm while any selected asset × variant cell has unknown capability or inclusion state. Silently dropping unsupported cells would make the reviewed output smaller than the user's selected intent, while blocking the entire task would prevent deliberate partial plans.

<a id="0412-p002"></a>

Every cell must reach **Compatible Export Matrix Resolution** before confirmation: executable under current proven capability, or explicitly excluded for this task. Unsupported or excluded cells remain visible with exact reasons and never make another variant for the same asset unavailable. The user may edit a recipe, remove a whole variant, install a capability explicitly and rebuild evidence, or leave review; installation and fallback are never automatic.

<a id="0412-p003"></a>

**Exclude All Currently Unsupported And Continue** is an optional reviewed bulk action that shows affected count and reasons before applying equivalent task-local exclusions. It changes no variant, preset, or Variant Set Preset; creates no remembered rule; hides no excluded cell; waives no revalidation; and cannot make an empty executable plan confirmable.

<a id="0412-p004"></a>

Each **Pre-Execution Compatible Export Exclusion** retains count and reason in confirmation, immediate result, and activity summary. It creates no commit unit, is neither failure nor cancellation, consumes no retry budget, and does not contribute to Partial Variant Success or Partial Placement Success. Those outcomes compare only confirmed executable placements.

<a id="0412-p005"></a>

Evidence drift rebuilds dependent cells. A formerly executable cell that loses support becomes unresolved and blocks confirmation. An excluded cell that becomes executable remains excluded, is marked **Now Supported**, and requires explicit reinclusion; capability installation or recipe relaxation never expands outputs automatically.

<a id="0412-p006"></a>

**Reinclude Compatible Export Exclusions** has three reviewed scopes: selected Now Supported cells, every Now Supported exclusion in the current variant, or every Now Supported exclusion in the complete matrix. Preview shows affected count, new physical outputs, changed capacity estimate, and introduced name/destination conflicts. Still-unsupported cells remain excluded. Evidence drift refreshes scope and consequences before confirmation rather than partially applying a stale choice.

<a id="0412-p007"></a>

ADR 0397 owns independent variant commit and result semantics. ADR 0399 requires the complete progressive matrix to close before execution, and ADR 0383 keeps task-wide Original versus Compatible mode separation. Matrix resolution grants no destination conflict choice, publication authority, or future-plan consent beyond the reviewed task.
