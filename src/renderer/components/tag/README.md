# Tag Components

Reusable UI for tag display, editing, filtering, merging, and AI suggestions.

Tag suggestion panels should consume shared Asset Tagging Workflow projections for category pipelines, category/model options, scan-state display, task submission inputs, review items, and pending suggestion lists instead of owning duplicate routing, lifecycle copy, dedupe, or confidence/action display rules. Tag picker, input, merge, edit, and chip components should use shared projections/options for search, grouping, usage badges, type labels, color classes, and option labels.

## Entry Files

- `TagChip.tsx`: tag display chip.
- `TagInput.tsx`: tag input.
- `TagSelector.tsx`: tag selection.
- `TagSuggestionPanel.tsx`: AI suggestion review.
- `TagFilterBar.tsx`: filtering controls.
- `TagEditDialog.tsx` and `TagMergeDialog.tsx`: tag maintenance dialogs.

## Tests

```bash
npm run typecheck
npm run build
```

## Change Log

| Version | Time | Change |
| --- | --- | --- |
| v1.0.6 | 2026-06-05 | Moved TagEditDialog and TagChip local color/type configuration and mappings into shared workflow constants. |
| v1.0.5 | 2026-06-05 | Documented shared smart-tagging panel state, category option, and model toggle ownership. |
| v1.0.4 | 2026-06-04 | Documented shared tag picker/input projection ownership for tag selection and merge dialogs. |
| v1.0.3 | 2026-06-04 | Documented shared suggestion review item ownership for AI smart-tagging. |
| v1.0.2 | 2026-06-04 | Added shared task submission projection guidance for AI smart-tagging. |
| v1.0.1 | 2026-06-04 | Documented shared workflow ownership for AI suggestion routing and pending suggestion projection. |
| v1.0.0 | 2026-05-31 | Rewrote README as compact tag component map with change log. |
