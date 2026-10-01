# Asset Export Publishes Verified Results Per Placement

Asset Export is progressively committed rather than one all-or-nothing
Export Set transaction. Original Asset Export uses one complete planned
physical placement of one Design Asset result as its **Asset Export Commit
Unit**. ADR 0397 refines Compatible Export to one complete Design Asset ×
Compatible Export Variant × placement unit. In Flat or Collection layout with
Export Once, an Original asset has one unit and every Compatible asset-variant
has one independently publishable unit. Copy Per Membership makes every
reviewed collection placement an independent unit because separate filesystem
paths cannot publish through one atomic rename.

Copy Per Membership still remains one reviewed Original asset or Compatible
asset-variant intent. ADR 0386 may exclude all placements through Skip Asset
Export Item or only one Compatible variant through Skip Compatible Export
Variant. Once execution begins, a successful placement remains ordinary
user-owned output when another placement or variant fails, pauses or is
cancelled. Mixed placement outcomes produce **Partial Placement Success** for
that Original asset or Compatible asset-variant; mixed variant outcomes produce
ADR 0397 Partial Variant Success for the asset. Fresh retry targets only failed
or unresolved units and never recreates successful copies or variants.

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

Original Asset Export validates staged single-file bytes against the exact
current Source Content Generation. For a Compound Original it validates every
included member digest, role, basename and authoritative relative path as one
complete set. Compatible Export validates that every staged output is a
complete decodable instance of the encoder-declared target format and matches
the reviewed dimensions, color profile/gamut behavior, bit depth/quality where
verifiable, visual-unit scope, output count and preserved/transformed/omitted
structure contract. A preview, cached derivative, extension or successful
encoder exit alone cannot prove staging valid.

When ADR 0394 enables a Compatible Export XMP Companion, compatible validation
also proves the complete media/XMP inventory, XMP syntax, declared property
mapping and values, and capability-defined filename association. The image and
sidecar stage and publish as one directory commit unit; neither may become a
final-path result independently.

A one-file commit unit publishes only the completely verified staging file to
the freshly revalidated vacant or ADR 0386-approved final path through a safe
same-volume atomic publication primitive. A Compound Original or other
multi-file result stages its complete dedicated result directory—an asset
directory or ADR 0397 variant subdirectory—and publishes that directory with
one safe same-volume atomic rename. No member receives its final visible path
earlier than the group, and post-publication validation must prove the intended
complete file/directory now occupies the final path before success is recorded.

If the live destination filesystem, provider or mount cannot prove the required
same-volume file/directory publication and post-commit inspection semantics,
the affected commit unit is unsupported at that destination. The application
asks for another location rather than falling back to member-by-member copy,
exposing an incomplete directory, weakening Compound integrity or claiming
atomicity from an unknown provider. A destination capability change after
confirmation pauses only affected units and reopens current review.

Each successfully published commit unit becomes ordinary user-owned external
output immediately while later units continue. Later failure, capacity pause,
cancellation or application restart never rolls back or removes it to simulate
batch atomicity. Consequently an Export Set Directory may truthfully contain
successful outputs while the task is partially successful. The task result
distinguishes complete asset success, Partial Variant Success, Partial
Placement Success, skipped, failed, paused and recovery-required outcomes and
never treats the mere existence of the Export Set Directory as success.

Review includes final-output demand, staging overhead and the destination's
required safety reserve. Capacity and writability are rechecked before each
commit unit starts and before publication. Insufficient safe capacity pauses
unstarted or safely pre-publication work without touching committed outputs,
source originals or destination occupants. Space recovered by cleaning only
proven attempt-owned staging may be considered after reconciliation; estimated
capacity is never a reservation or guarantee.

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
