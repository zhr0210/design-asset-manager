# Compatible Export Variants Commit And Report Independently

A Compatible Export task contains an explicit ordered **Compatible Export
Variant Set** with at least one named **Compatible Export Variant**. Each variant
owns one complete compatible recipe covering format, dimensions, color/profile,
bit depth/quality, visual-unit scope and ADRs 0393–0395 metadata/XMP behavior.
It may start from one ADR 0396 preset or a custom recipe. Adding a variant is
always a user action; a variant is never inferred from source content, generated
as a format fallback or run only after another variant fails.

Distinct normalized variant names may intentionally carry semantically
equivalent complete recipes. The set editor and Asset Export Review show a
non-blocking **Duplicate Compatible Export Recipe** signal, but neither surface
merges, removes or rewrites either variant. Equivalence compares frozen semantic
recipe intent, not chosen encoder identity or final byte equality. Each variant
still resolves its own matrix cells, receives its own qualified output names,
commits independently and reports independently; safe shared processing remains
only the guarded ADR 0390 optimization.

The user may acknowledge a current equivalence group as an **Intentional
Duplicate Recipe Group** in the task, or receive that descriptive acknowledgement
from an applied ADR 0398 composition. Review then labels the group intentional
without repeatedly requesting duplicate acknowledgement, while still showing
every variant, physical output, estimated byte and conflict consequence. The
acknowledgement grants no matrix resolution, destination authority or execution
consent. Adding/removing a group member or changing any member name or recipe
invalidates it and restores the ordinary duplicate warning; reordering the same
unchanged group does not.

ADR 0412 owns complete **Compatible Export Matrix Resolution**, explicit task-
local exclusions, Now Supported state and reviewed reinclusion. This ADR keeps
the downstream rule: only cells remaining executable in the confirmed plan
produce commit units and participate in variant/placement success outcomes.

For Compatible Export, the **Asset Export Commit Unit** is refined to one
Design Asset × Compatible Export Variant × Asset Export Placement. All pages,
artboards, frames or other outputs selected by that variant for the asset and
every required ADR 0394 XMP companion remain members of that one unit: they
stage, validate and publish together. Copy Per Membership creates independent
placement units for the same asset-variant. Original Asset Export has no
variants and keeps one Design Asset × placement commit unit.

One variant's successful commit becomes ordinary user-owned output immediately
and is not removed because another variant fails, pauses, conflicts or is
cancelled. Results report every asset, variant and placement separately. An
asset with at least one successful confirmed executable variant and at least
one non-successful confirmed executable variant has **Partial Variant
Success**; pre-execution exclusions are shown separately and do not participate.
A variant copied to several explicit placements may independently have Partial
Placement Success. Manual retry freshly preflights only selected failed or
cancelled variant placements and never regenerates successful variants.

Multiple variants necessarily use an Export Set Directory. Each Design Asset's
variants remain grouped under one human-readable asset directory. A one-file
variant publishes through its variant-qualified final filename; a variant with
several media/XMP members uses a dedicated variant subdirectory so the complete
unit can publish atomically without merging into another variant. A task with
only one variant retains ADR 0384's simpler one-file Save As or ordinary
single-variant multi-file layout.

When more than one variant exists, every output receives a visible
human-readable variant qualifier derived from the reviewed variant name in
addition to any page/artboard/frame qualifier. Variant names are presentation
labels, not asset identity or capability evidence, and must be unique after
destination normalization within the set. Same-plan collisions never establish
variant priority or permit a later variant to replace an earlier one.

Conflict review may skip one affected asset-variant and all of its placements
without skipping the asset's other variants. Skipping the whole Design Asset
remains a separate broader choice that excludes every variant and placement.
Replacement, unique naming and Apply To All retain their existing current-
occupant and homogeneous-risk checks at the asset-variant placement boundary.

The confirmed operation freezes each variant recipe, matrix resolution and
reviewed Compatible Export Variant Priority. Later preset edits, variant
reordering, title changes or capability changes do not mutate the running plan;
current drift reopens only affected uncommitted asset-variant units. Priority
guides eligible admission under ADR 0407 but never supplies strict execution
order, collision precedence or fallback meaning. Variants never replace/relink
originals, create Design Assets, become source generations or imply that
several exported renditions are library-managed versions of one asset.

ADR 0383 still permits exactly one task-wide Asset Export Mode, so Original and
Compatible results never mix. ADRs 0384–0392 govern layout, naming, conflicts,
publication, control, scheduling, directory ownership and activity/recovery at
the refined commit boundary. ADR 0396 presets supply at most one variant recipe
each and do not preauthorize a variant set or its execution. ADR 0398 may save
an ordered set as independent recipe snapshots, but applying it still creates a
fresh reviewed task-local matrix. ADR 0399 removes an arbitrary small variant
cap while requiring complete evidence-gated progressive planning before any
matrix can be confirmed.

The current application has no Compatible Export Variant Set, variant matrix or
variant-level publisher/result projection. This ADR records target architecture
only and creates, reads, renders, exports, stages, writes, publishes, retries,
replaces, downloads, installs, rewrites, moves, deletes or changes no
runtime/user file, credential, sidecar, directory, database, cache, model,
backup, metadata value, analysis result, source relationship, public IPC,
database schema or AI Worker API.
