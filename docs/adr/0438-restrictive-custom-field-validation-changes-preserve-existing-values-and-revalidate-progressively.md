# Restrictive Custom Field Validation Changes Preserve Existing Values And Revalidate Progressively

Changing a Custom Field Definition must not destroy previously valid user metadata merely because a newer rule is narrower. A host-proven non-restrictive **Custom Field Validation Rule** change may apply directly. Any change that may reject a current value or unresolved suggestion is a **Restrictive Custom Field Validation Change** and first shows affected Asset Candidate, Design Asset, current-value, unresolved-suggestion and dependent Import Mapping Preset counts. Confirmation activates the new rule for every new manual, AI, import and migration write, but never clamps, truncates, clears, converts or silently repairs retained data.

A retained current value that fails the active rule becomes an **Out-of-Constraint Custom Field Value**, not corrupted or missing data. It remains authoritative portable library metadata, backed up, searchable, filterable and exportable with a visible validation marker. It may stay unchanged, but cannot be copied into a new assignment or accepted from an AI suggestion; ADR 0439 Candidate Promotion transfer is owner reassociation rather than such a copy. Editing that value must either leave it untouched or produce a currently valid replacement. An unresolved suggestion remains preserved but blocked from acceptance, and an affected Import Mapping Preset remains intact but non-executable until reviewed against the current rule. Relaxing the rule automatically restores validity when the same preserved value conforms again. Under ADR 0440, lowering a Text length limit follows this path and never truncates retained text; ADR 0442 applies the same preservation if a later control-character policy newly rejects old content; ADR 0443 treats a higher minimum, a new/narrower pattern or a reviewed pattern-version migration as potentially restrictive; ADR 0444 applies the same proof to case, multiline and dot-all option changes. No rule change matches, transforms or deletes values by itself.

ADR 0475 adds the Static Custom Field Default to restrictive-change preflight,
but does not treat it as an existing owner value. A proposed rule cannot commit
until the user replaces that future-write rule with a valid default, disables
it or cancels; current values retain this ADR's non-destructive behavior.

A large confirmed restrictive change creates a durable **Custom Field Constraint Revalidation Task** in ADR 0430's single schema-maintenance lane under ADR 0431 performance guards. The active definition exposes **Partial Custom Field Constraint Validation Coverage** with validated-conforming, out-of-constraint, remaining, failed and conflict counts; unchecked owners are visibly Unknown under the new rule rather than assumed valid. Ordinary value search/filter/export continues from preserved values during revalidation, while validity-specific queries use only completed validation outcomes and disclose partial coverage. Pause, cancellation and Library Switch stop at owner/dependency boundaries, restart reconciles committed outcomes, and any later rule revision invalidates stale work and requires a fresh current-rule plan rather than applying obsolete validation.

ADR 0445 duplicate Text comparison is not a Custom Field Validation Rule.
Creating, editing or saving that filter never revalidates values, creates
Out-of-Constraint state or enters the schema-maintenance lane.
ADR 0446 comparison-policy migration may rebuild advisory group membership but
likewise never changes value validity or enters constraint revalidation.
Under ADR 0447, current Out-of-Constraint values still participate in duplicate
grouping with their visible marker because they remain authoritative and
filterable; Unknown validation coverage does not silently exclude the value.
ADR 0450 ordinary Text content/length/pattern filters likewise continue to use
present authoritative values regardless of validation outcome, while explicit
validity conditions distinguish completed Conforming, completed
Out-of-Constraint and Unknown outcomes and disclose partial coverage.
ADR 0451 likewise sorts all present Text by value without promoting,
demoting or excluding Out-of-Constraint or Unknown entries; validation markers
remain visible evidence rather than hidden sort keys.

ADR 0453 Default Text Editor Presentation changes are provably
non-restrictive presentation changes. Switching Compact or Expanded never
revalidates values, suggestions or mappings and never enters the
schema-maintenance lane.

ADR 0465 validates every typed Custom Field Edit Draft against the current
definition and rule revision at commit; ADR 0454 Text is one specialization. A
rule change never silently repairs or discards the draft; an invalid or stale
draft remains pending for explicit correction, discard or field-aware
resolution.

ADR 0456 Undo/Redo is another new write and must satisfy the current rule
revision. A formerly valid previous Text value does not bypass a later
restrictive rule merely because it is present in the session Undo Stack.

ADR 0457 batch Set, Prefix, Suffix and Exact Literal Replacement are likewise
new writes. An existing Out-of-Constraint value may be cleared or transformed
only into a currently valid result; the batch cannot manufacture another
Out-of-Constraint value from a failed proposal.

ADR 0462 Number Input Locale and ADR 0463 precision/grouping display changes are
likewise device/input or presentation changes rather than validation rules.
They never revalidate or rewrite an Exact Custom Field Number. Editing an
existing Out-of-Constraint Number must still preserve it unchanged or commit one
uniquely parsed exact replacement that satisfies the current range.
