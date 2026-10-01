# Filters Have Quick and Advanced Layers

Filtering should have two layers. Quick Filters live directly in the Workspace
Toolbar for high-frequency dimensions such as asset category, color, size,
source, and tags. Advanced Filter Panel holds composable conditions, nested
criteria, and less frequent fields.

Advanced filter configurations can be saved as Smart Filters when they
represent a reusable review or organization workflow. This keeps common
narrowing fast while allowing complex filtering without overcrowding the
toolbar.

ADR 0445 places Duplicate Text Value Finding in Advanced Filters rather than
schema validation. It binds one exact Custom Field Definition and an explicit
comparison mode, remains advisory, and may be saved through the normal Smart
Filter lifecycle without turning duplicate metadata into an invalid asset.
ADR 0446 makes the resulting comparison keys versioned and rebuildable while
the filter continues to show original values rather than normalized substitutes.

ADR 0450 completes the Text Custom Field operator catalog in Advanced Filter
Panel. Presence, content comparison, grapheme length, portable pattern,
validation state and duplicate grouping remain explicit composable conditions;
negative content operators do not silently include Missing values.

ADR 0452 adds an explicit on-demand Distinct Text Value Browser for choosing
ordinary conditions without loading a high-cardinality facet when the panel
opens. Browser pages and counts remain generation-bound session state rather
than another filter layer or schema editor.

Under ADR 0427, a filter criterion may use a target Custom Field during active
type migration, but its criterion, facet and result surfaces must disclose
Partial Custom Field Migration Coverage and evaluate committed target values
only.
