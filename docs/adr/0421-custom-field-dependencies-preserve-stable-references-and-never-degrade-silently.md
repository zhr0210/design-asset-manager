# Custom Field Dependencies Preserve Stable References And Never Degrade Silently

Removing a Custom Field criterion or mapping silently could broaden a Saved Search, Smart Filter or import operation and produce believable but incorrect results. Every durable user-owned Saved Search, User Smart Filter and Import Mapping Preset therefore stores a **Custom Field Dependency Reference** to the exact Custom Field Definition identity rather than resolving it by display name.

When the definition is archived under ADR 0420, the dependent object and reference remain intact under that object's existing persistence scope but enter **Archived Custom Field Reference** state. The affected saved criteria or mapping cannot execute as a valid plan, and opening it identifies the archived field and offers its normal edit/repair route. Restoring that exact definition identity reactivates the unchanged reference automatically; a newly created same-name field does not.

After Permanent Delete Custom Field, the dependent object remains visible with a **Missing Custom Field Reference** placeholder and cannot execute the affected criteria or mapping. Repair requires the user to remove the criterion/mapping or explicitly map it to a currently active, type-compatible definition. The host validates that change and replaces the stored stable reference only after confirmation.

The application never repairs these dependencies by matching a field name, silently omitting a criterion, treating an archived value as current, cascading deletion into the Saved Search/Smart Filter/preset, or pretending a partially changed plan still has its saved meaning. This ADR does not create a retained Custom Field Definition after permanent deletion: the missing-reference placeholder is dependency evidence only, not schema or recoverable field data.

ADR 0422 Rename Custom Field updates the label shown for a still-resolving reference without replacing its stable target identity or requiring dependency repair.

ADR 0423 Custom Field Type Migration creates a new target identity and therefore never retargets this reference implicitly; removal or compatible remapping remains an explicit user edit.

When the user explicitly creates or remaps a Saved Search or User Smart Filter criterion to that target identity during migration, ADR 0427 treats Partial Custom Field Migration Coverage as execution state only. Clearing that state after the task becomes terminal never rewrites the stable dependency or saved criteria.

ADR 0432 adds exact field-plus-option identity references for Select criteria and mappings. Archived options remain queryable against retained values but cannot receive new assignments; permanent deletion leaves a Missing Custom Field Option Reference, while only an explicitly confirmed option merge may retarget that option dependency.

ADR 0451 applies the same exact dependency to a saved Custom Field sort even
when no filter criterion references that field. Archive or deletion makes the
saved view non-executable until explicit repair; it never silently drops the
sort or substitutes filename, creation time or a same-name field.
