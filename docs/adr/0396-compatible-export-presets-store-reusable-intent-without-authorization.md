# Compatible Export Presets Store Reusable Intent Without Authorization

A **Compatible Export Preset** is a named reusable recipe intent, not a saved
Asset Export Review or permission to write. It may retain target format,
dimension rule, output color intent/profile behavior, bit depth, quality,
visual-unit scope, ADR 0393 metadata policy, ordinary non-sensitive field-class
intent, ADR 0395 routing and XMP mode. It stores semantic requirements rather
than a previously selected encoder or plugin implementation.

Saving requires an explicit scope and defaults to **Personal Compatible Export
Preset**. A personal preset is device-local, available while working in any
library on that device, and excluded from portable library state and Full
Library Backup. A **Library Compatible Export Preset** is authoritative portable
state owned by the active library, available whenever that library is active on
a compatible device and included in its normal backup and restore. The scopes
have independent identities; copying between them creates a new preset, and
later edits, renames or deletion do not synchronize.

Application-provided **Built-In Compatible Export Presets** are immutable and
versioned with the product. A user edits one only by copying it into personal or
library scope. Product updates may replace built-in definitions but never
rewrite a user copy or silently convert its scope. Missing current support keeps
any preset readable with truthful unavailable fields rather than deleting or
mutating it.

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

Applying a preset always opens a fresh complete Asset Export Review. The review
resolves the current selected assets, visual units, real formats, target
capabilities, installed encoders/extensions, field values, privacy choices,
output tree, destination, names, bytes and conflicts. Unsupported items remain
visible and never trigger automatic format fallback, encoder substitution,
extension/plugin installation, model execution or download. Any sensitive
metadata choice, XMP companion consequence and destructive destination
replacement requires its normal current confirmation.

Once the user confirms export, the operation owns a frozen reviewed recipe and
evidence snapshot independent of the preset. Editing or deleting the preset
cannot change, pause, retry, recover or reinterpret active or completed export
work. Preset deletion removes only reusable intent and never touches exported
files, originals, library metadata or activity/recovery records.

Under ADR 0397, one preset supplies at most one Compatible Export Variant
recipe. A user may explicitly compose several preset-derived or custom variants
in one task, but applying one preset never adds hidden variants, defines a
fallback chain or preauthorizes the resulting variant set.

ADR 0398 separately saves a whole Variant Set as owned recipe snapshots with
personal or library scope. Those snapshots do not become live references back
to this individual preset and retain none of an export task's reviewed
operation state.

ADR 0334 Source Rewrite Presets use analogous personal/library scopes but remain
separate source-mutation intents and cannot import, execute or substitute a
Compatible Export Preset. ADR 0383 governs compatible recipe resolution,
ADRs 0393–0395 govern metadata/XMP semantics, and destination/publication
authority remains under ADRs 0384–0392.

The current application has no Compatible Export Preset store, built-in preset
registry or scope selector. This ADR records target architecture only and
creates, reads, applies, copies, saves, synchronizes, backs up, exports, stages,
writes, publishes, replaces, downloads, installs, rewrites, moves, deletes or
changes no runtime/user file, credential, sidecar, directory, database, cache,
model, backup, metadata value, analysis result, source relationship, public IPC,
database schema or AI Worker API.
