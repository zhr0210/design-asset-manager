# Asset Export Uses Contained Flat Sets And Explicit Collection Projection

Asset Export chooses its destination shape from the planned physical result,
not merely from the number of selected Design Assets. A result proven to
contain exactly one ordinary output file uses the operating system's familiar
Save As flow and selects its complete destination filename. Any Compound
Original, multi-page/artboard/format result, or selection producing more than
one physical file instead selects a parent directory and by default creates one
user-named independent **Export Set Directory**. This contains the complete
task output and avoids scattering files through an existing directory.

The default **Flat Asset Export Layout** is deliberately shallow. An asset that
produces one file is placed directly in the Export Set Directory. A Compound
Original receives one dedicated asset subdirectory that preserves every member
name and authoritative relative path. One asset that produces multiple pages,
artboards, frames, formats, or other physical outputs likewise receives one
dedicated asset subdirectory so its results remain visibly one logical unit.
The exporter does not recreate the source filesystem tree and never embeds a
source absolute path in an output path, manifest, filename, or result intended
for the destination.

ADR 0397 treats multiple explicit Compatible Export Variants as independently
committed outputs while retaining that asset grouping. The asset directory may
receive independently published variant-qualified ordinary files; any variant
with several media/XMP members instead receives its own variant subdirectory
and publishes that complete subdirectory atomically. A multi-variant task always
uses an Export Set Directory, while one variant retains this ADR's ordinary
single-result layout.

An optional **Collection Asset Export Layout** projects one explicitly selected
Collection Group or Asset Collection scope into the Export Set Directory. It is
an output organization choice only: it does not change Collection Memberships,
invent a primary collection, duplicate a Design Asset in the library, or make a
Collection hierarchy authoritative over source/storage layout. Compound member
layout remains intact below the asset's chosen collection placement.

If one selected asset belongs to multiple exported collections, the exporter
must not guess which membership is primary. The default exports the asset once
and requires an explicit placement choice before confirmation; the review may
offer a batch choice when the same decision can truthfully apply to several
items. A user may instead explicitly choose Copy Per Membership. That option
creates a complete physical output at each chosen membership placement and
must disclose the additional file count and storage estimate before it can be
confirmed.

Before any write, Asset Export Review presents the complete planned directory
tree and final destination paths together with logical-result count, physical
file/member count, estimated bytes, duplicate-output consequences, destination
conflicts and path-length or platform-portability issues. Any unresolved
multi-membership placement, unavailable compound member, invalid path, or
unproven capacity remains visibly blocking. The preview is recalculated after
destination, layout, scope, placement, naming, recipe, or eligibility changes
and the exact plan is revalidated at execution boundaries.

ADR 0394 treats an explicitly requested Compatible Export XMP Companion as a
physical member of one multi-file output. Even one selected Design Asset then
uses an Export Set Directory and a dedicated asset directory containing the
reviewed media/XMP association; it never scatters an adjacent sidecar through
single-file Save As or hides the added file from the output tree.

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

The current application has no complete Asset Export publisher or directory
planner. This ADR records target architecture only and creates, reads, copies,
renders, exports, stages, writes, rewrites, converts, moves, deletes or changes
no runtime/user file, credential, sidecar, directory, database, cache, backup,
metadata value, analysis result, source relationship, public IPC, database
schema or AI Worker API.
