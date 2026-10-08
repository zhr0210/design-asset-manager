# Compatible Export Matrix Resolution Is Explicit And Task-Local

A multi-variant Compatible Export cannot truthfully confirm while any selected asset × variant cell has unknown capability or inclusion state. Silently dropping unsupported cells would make the reviewed output smaller than the user's selected intent, while blocking the entire task would prevent deliberate partial plans.

Every cell must reach **Compatible Export Matrix Resolution** before confirmation: executable under current proven capability, or explicitly excluded for this task. Unsupported or excluded cells remain visible with exact reasons and never make another variant for the same asset unavailable. The user may edit a recipe, remove a whole variant, install a capability explicitly and rebuild evidence, or leave review; installation and fallback are never automatic.

**Exclude All Currently Unsupported And Continue** is an optional reviewed bulk action that shows affected count and reasons before applying equivalent task-local exclusions. It changes no variant, preset, or Variant Set Preset; creates no remembered rule; hides no excluded cell; waives no revalidation; and cannot make an empty executable plan confirmable.

Each **Pre-Execution Compatible Export Exclusion** retains count and reason in confirmation, immediate result, and activity summary. It creates no commit unit, is neither failure nor cancellation, consumes no retry budget, and does not contribute to Partial Variant Success or Partial Placement Success. Those outcomes compare only confirmed executable placements.

Evidence drift rebuilds dependent cells. A formerly executable cell that loses support becomes unresolved and blocks confirmation. An excluded cell that becomes executable remains excluded, is marked **Now Supported**, and requires explicit reinclusion; capability installation or recipe relaxation never expands outputs automatically.

**Reinclude Compatible Export Exclusions** has three reviewed scopes: selected Now Supported cells, every Now Supported exclusion in the current variant, or every Now Supported exclusion in the complete matrix. Preview shows affected count, new physical outputs, changed capacity estimate, and introduced name/destination conflicts. Still-unsupported cells remain excluded. Evidence drift refreshes scope and consequences before confirmation rather than partially applying a stale choice.

ADR 0397 owns independent variant commit and result semantics. ADR 0399 requires the complete progressive matrix to close before execution, and ADR 0383 keeps task-wide Original versus Compatible mode separation. Matrix resolution grants no destination conflict choice, publication authority, or future-plan consent beyond the reviewed task.
