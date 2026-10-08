# Compatible Export Variant Set Presets Own Recipe Snapshots

A **Compatible Export Variant Set Preset** is a named reusable ordered
composition of ADR 0397 Compatible Export Variants. Each member owns a snapshot
of its variant name and complete semantic recipe intent at the moment the
composition is saved. It does not hold a live reference to the individual
Compatible Export Preset from which a variant may have been copied. Later
editing, renaming, moving or deleting either object cannot silently change the
other.

The composition is always flat: its only member type is an owned Compatible
Export Variant recipe snapshot. It cannot contain another Variant Set Preset,
a set identity, nested scope or recursive reference. Adding another composition
to an editing draft performs a one-time ordered flatten-and-copy of that
composition's current member snapshots. The destination receives no source
scope, origin dependency or update relationship, and later changes to either
composition never propagate.

Saving requires an explicit scope and defaults to **Personal Compatible Export
Variant Set Preset**. Personal compositions are device-local and available
across libraries on that device. A **Library Compatible Export Variant Set
Preset** is portable state owned by the active library and included in that
library's Full Library Backup and restore. Copying between scopes or copying a
composition to edit it creates a new independent identity; no scope is a
synchronized view of another.

A recipe snapshot may contain only the same semantic format, dimensions,
color/profile, bit depth/quality, visual-unit and permitted metadata/XMP intent
allowed by ADR 0396. It contains no selected Design Assets, current field
values, destination, path/locator, Collection placement, final name,
asset-variant eligibility, resolved encoder/capability, installed plugin state,
size estimate, conflict/skip/unique-name/replacement choice, sensitive-metadata
consent, AI-derived-value approval, filesystem authority, staging, result or
recovery evidence. Saving from a reviewed or completed task strips operation
state rather than turning that task into reusable authorization.

Applying the composition creates a fresh task-local Compatible Export Variant
Set from copied member snapshots and always opens the complete current Asset
Export Review. The application rebuilds the asset × variant matrix from current
formats, capabilities, metadata, privacy choices, names, destination and
conflicts. Missing or changed capabilities leave affected variants visibly
unsupported; they do not rewrite the stored composition, install/download a
replacement, remove the variant, or activate another member as a fallback.

Editing a composition means explicitly editing, replacing, adding, removing,
renaming or reordering its owned variant snapshots. It never edits the source
single-variant presets. Deleting a source preset leaves every earlier snapshot
intact, and deleting or editing the composition cannot alter an already
confirmed task because that task owns its own frozen ADR 0397 recipes and
matrix evidence. The saved order becomes the fresh task's reviewed Compatible
Export Variant Priority. Under ADR 0407 it remains a stable visible admission
preference rather than a promise of dispatch or completion order.

Flattened member names must remain unique under the same destination
normalization used by ADR 0397. Every collision is resolved in the editing
draft before save through an explicit Rename Imported Member, Replace Existing
Member or Skip Imported Member choice. The application never invents a suffix,
silently merges recipes, treats matching names as recipe equality or changes
the source composition while resolving the destination draft.

Different valid member names may retain semantically equivalent complete recipe
snapshots. The editor presents Duplicate Compatible Export Recipe as a
non-blocking save warning rather than treating it as a collision or silently
deduplicating the composition. Keeping both preserves distinct members and
later produces the independent ADR 0397 review, output, commit and result
boundaries; semantic equivalence is not a stored promise of byte-identical
encoding.

After reviewing the warning, the user may mark the exact current equivalence
group as an **Intentional Duplicate Recipe Group**. The composition may retain
that path-free descriptive acknowledgement because it authorizes no execution,
destination, conflict choice or resource use. Applying the composition carries
the acknowledgement into fresh review only as an “Intentional Duplicate” label:
all distinct variants, outputs, estimated bytes and conflicts remain visible.
Adding/removing a group member or changing any member name or recipe invalidates
the acknowledgement and restores the warning; reordering the same unchanged
members does not.

Flattened members without a collision, including explicitly renamed imports,
append after the destination draft's current members in their source-relative
order. Skip omits only that imported member. Replace copies the imported
member's complete name and recipe snapshot into the colliding existing member's
position; it neither appends a second member nor moves the existing slot.
After all collision choices, the user may explicitly reorder the complete flat
draft before saving, and that reviewed order becomes the composition's saved
Compatible Export Variant Priority.

ADR 0396 individual Compatible Export Presets remain the reusable unit for one
variant recipe. ADR 0397 remains the runtime task and commit model. A variant
set preset composes copied intents only; it does not mix Original Asset Export,
create a fallback chain, preauthorize execution or make exported outputs into
managed versions. ADR 0399 imposes no arbitrary small member-count cap: saving
depends only on complete valid representation of the finite flat composition,
while applying it must progressively plan and completely review the actual
asset/variant/output scale before confirmation.

The current application has no Compatible Export Variant Set Preset store or
scope selector. This ADR records target architecture only and creates, reads,
copies, saves, applies, synchronizes, backs up, renders, exports, stages, writes,
publishes, downloads, installs, rewrites, moves, deletes or changes no
runtime/user file, credential, sidecar, directory, database, cache, model,
backup, metadata value, analysis result, source relationship, public IPC,
database schema or AI Worker API.
