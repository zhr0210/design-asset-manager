# Library Components

Presentation components and labels for the asset library page.

Library tag sidebar filters should consume shared Asset Tagging Workflow projections for shortcut state, tag usage groups, query strings, and active filter-chip copy instead of parsing tag queries locally.
Asset grid cards should consume shared Asset Display projections for title, source badge, tag preview overflow, and preview image fields instead of formatting those rules locally.

## Entry Files

- `LibrarySidebar.tsx`: sidebar filters.
- `LibraryToolbar.tsx`: search and filter controls.
- `AssetWaterfallGrid.tsx`: asset grid.
- `BulkActionDock.tsx` and `BulkActionModal.tsx`: bulk actions.
- `library-labels.ts`: static UI labels.

## Tests

```bash
npm run typecheck
npm run build
```

## Change Log

| Version | Time | Change |
| --- | --- | --- |
| v1.0.2 | 2026-06-04 | Documented shared Asset Display projection ownership for library grid cards. |
| v1.0.1 | 2026-06-04 | Documented shared Library tag sidebar and filter-chip projection ownership. |
| v1.0.0 | 2026-05-31 | Added compact README and extracted library tag group labels. |
