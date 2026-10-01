# Custom Field Renames Preserve Identity And Active Names Stay Unique

A Custom Field's user-facing label must be editable without breaking values, filters or import mappings, while two active fields with the same visible name would make ordinary metadata work ambiguous. **Rename Custom Field** therefore changes only the **Custom Field Display Name**: the Custom Field Definition identity, type, values, AI Value Suggestions setting and suggestions, provenance, search/filter meaning and ADR 0421 dependency references remain attached to the same field.

Active Custom Field Definitions within one library must have unique display names under the portable, versioned comparison policy in ADR 0433. Rename and creation validate that uniqueness before commit; no conflict silently overwrites, merges, re-identifies or automatically suffixes either definition.

Archived definitions do not reserve their former display names. If restoring one would collide with an active definition, restoration enters **Custom Field Restore Name Conflict** and requires the user to rename the archived definition or the active definition before restoration completes. The application never merges the definitions, transfers their values, assigns the archived identity to the active field or treats a newly created same-name field as the restored field.

ADR 0423 separately governs field-type changes. ADR 0432 makes Select-option rename and reorder presentation-only changes on stable option identities and owns option archive/delete/merge lifecycle; ADR 0433 applies the same comparison rule to their active labels and restore collisions. This field rename policy grants no schema mutation authority to plugins, importers or AI under ADR 0418.
