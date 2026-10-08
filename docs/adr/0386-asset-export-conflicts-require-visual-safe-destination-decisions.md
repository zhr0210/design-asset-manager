# Asset Export Conflicts Require Visual Safe Destination Decisions

Asset Export preflights the complete ADR 0384 directory tree against both the
current destination and every other planned output after ADR 0385 name
normalization. It treats exact-path, target-filesystem case/Unicode-equivalent,
file-versus-directory, planned-output, and already-occupied paths as explicit
conflict classes. Any conflict opens **Asset Export Destination Conflict
Review** before the affected output can write; filename, size, timestamp,
preview resemblance, asset identity, or prior task history never authorizes an
overwrite or silently resolves the conflict.

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

In an ADR 0397 multi-variant Compatible Export, the review also offers **Skip
Compatible Export Variant** for the affected Design Asset. It excludes that
complete variant and all of its Copy Per Membership placements while preserving
the asset's other eligible variants. Skip Asset Export Item remains the broader
choice that excludes every variant and placement for the Design Asset.

Replacement never overwrites, truncates, unlinks or permanently deletes the
occupant. A complete candidate output must first be staged and verified under
the later publication policy. The application then durably binds the approved
replacement to the exact occupant and asks the operating system to move that
ordinary file to trash. Only a proven trash success and a still-vacant intended
path permit publication. A directory, link, special file, protected item,
unprovable occupant, unsupported trash operation or changed occupant is not
replaceable through this action and never falls back to direct overwrite,
unique naming, skipping or another destination automatically.

If the occupant is proven trashed but publication is not proven committed, the
item enters **Asset Export Replacement Recovery**. The application first
attempts one evidence-bound restore of that exact occupant only when the
intended path remains vacant and publication is proven absent. A successful
restore returns the item to current conflict review. Ambiguous publication,
changed destination, unavailable trash evidence or failed restore blocks
automatic action and opens a recovery review for an explicit safe restore
location or freshly validated continuation; it never guesses which file won,
repeats trash, or reports export success.

An intended Export Set Directory or asset subdirectory that collides with a
non-empty directory cannot be replaced, recursively cleared, or silently
merged. The user must choose a unique directory name or another parent
location. A proven empty ordinary directory may be selected explicitly after
the review shows that it contributes no existing contents; it is revalidated as
empty immediately before use. A file-directory type conflict, link, package,
mount boundary or uninspectable directory remains blocking rather than being
treated as an empty container.

Two outputs inside the same Asset Export Plan may not replace each other. The
review may rename one or more ordinary outputs, change the Compatible Export
recipe/unit scope, skip a complete affected asset-variant, or skip the complete
Design Asset, but it cannot order same-path outputs so that the later one wins.
Compound member names stay
protected by ADR 0385; an internal Compound collision or unrepresentable layout
blocks the complete compound item rather than renaming or omitting one member.

An Apply To All action is available only for a currently enumerated,
homogeneous conflict set with the same object type, operation meaning and risk.
It shows every resulting path and aggregate replacement/skip consequences
before confirmation. Applying unique names never becomes a remembered suffix
rule, and applying replacement never authorizes a wildcard or any occupant that
appears later. Non-empty-directory, type, compound-layout, permission and
recovery conflicts cannot be hidden inside an ordinary-file batch choice.

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
