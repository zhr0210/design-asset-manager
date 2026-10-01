# Library Components

Presentation components and labels for the asset library page.

The formal Library composition now uses [canvas/README.md](canvas/README.md) for
the four-icon navigation, active-library controls, bottom lexical search/tag filters,
responsive cards, side Inspector and focused controlled-preview filmstrip. The new
surface reuses `projectAssetDiscovery` and Asset Store epochs; it does not import
prototype data or pretend that unimplemented formats, palettes or notebook persistence
are available. `AssetWaterfallGrid`, `LibrarySidebar`, `LibraryToolbar` and
`WorkspaceModes` preserve older callers/tests; they are not the current Library layout.

The existing native card and Main-synchronized description/prompt session drafts remain.
Copy/bulk reviews still use trusted focus-contained sheets; original bytes and library
lock ownership stay with Main. The current formal focus pane is read-only and links
back to side editing rather than using the prototype's localStorage notes.

`ActiveLibraryControls.tsx` owns the path-free create/open/close/reopen, reviewed
Copy and recoverable Trash/Restore controls. Authority changes call the Asset
Store reset boundary before Main changes or releases Library authority, so stale list, selection,
relation and preview state cannot survive a close or switch. Unsupported Copy
items remain visible in review and a plan with no eligible image cannot confirm.

The Active Library Inspector exposes its controlled preview, manual Tags and
manual description. Local paths, source mutation, AI actions, Tag aliases,
hierarchy, merge and permanent delete remain unavailable.

## Entry Files

- `LibrarySidebar.tsx`: horizontal collection and tag filters.
- `LibraryToolbar.tsx`: search and filter controls.
- `AssetWaterfallGrid.tsx`: asset grid, loading states, and empty states.
- `BulkActionDock.tsx` and `BulkActionModal.tsx`: bulk actions.
- `library-labels.ts`: static UI labels.

## Loading and Empty States

`AssetWaterfallGrid` distinguishes the following lifecycle states:
- **首次 loading**: `!hasLoadedAssets && assetLoadStatus === 'loading'` displays the initial loading indicator ("正在读取素材列表... / 正在读取素材数据，请稍候").
- **首次 error**: `!hasLoadedAssets && assetLoadStatus === 'error'` displays the initial failure view with a retry action (`assetLoadError` uses safe fixed copy).
- **后台刷新 loading/error**: when `hasLoadedAssets` is true and cards exist, cards continue displaying while a non-blocking indicator or retryable warning banner is shown. Refresh failures retain previously loaded assets, `selectedAsset`, and `bulkSelectedAssetIds`.
- **刷新中与未就绪未定状态**: when `hasLoadedAssets` is true but `matches.length === 0` and `assetLoadStatus` is `loading`, `error`, or `idle`, an indeterminate loading or refresh failure view is shown with recovery actions to avoid falsely reporting definitive empty states while a request is in flight, failed, or not yet ready.
- **筛选无匹配 (filtered no-match) 与 库为空 (unfiltered empty)**: only when `assetLoadStatus === 'ready'` is the view definitively determined as filtered no-match (active filters with clear filters action) or unfiltered empty (library empty with refresh action).

## Keyboard Navigation & Focus Management

- **Sibling Accessible Controls**: In `AssetWaterfallGrid`, each card item separates the Inspector trigger button from the bulk selection checkbox button as non-nested sibling controls. Both controls are reachable via `Tab`, have accessible names tied to the asset's title (`aria-label`), and display visible focus rings (`focus-visible:ring-2`). The bulk selection checkbox becomes visible upon keyboard focus even when not hovered.
- **Card and Selection Interactions**: Click or `Enter` on the card trigger opens `AssetInspectorDrawer`; double-click or `Space` opens managed Quick Look. Pressing `Enter` or `Space` on the bulk selection checkbox toggles bulk selection and stops propagation, preventing inadvertent Inspector opening. Selection data semantics are preserved and no destructive or AI shortcuts are introduced.
- **Search and Modal Shortcuts**: Cmd+F / Ctrl+F focuses and selects local search unless a modal is active. Quick Look traps Tab, closes on Escape, and returns focus; its image remains the controlled preview. Space on the Quick Look root closes it, while buttons keep their normal Space behavior.
- **Focus Restoration**: `Library` maintains a card trigger reference registry. When the Inspector closes, focus is returned to the original card trigger button. If that card is no longer connected to the DOM (e.g., filtered, deleted, or list reset), focus safely falls back to the search input, ensuring focus is never left on an unmounted node.
- **Inspector Escape Boundary**: Escape handling is scoped strictly to the `AssetInspectorDrawer` container without global window listeners. Escape does not close the Inspector if the event is already `defaultPrevented`, focus is outside the drawer, an `input`/`textarea`/`select`/`contenteditable` element is actively being edited, or a child dialog/viewer modal has priority.

## Tests

```bash
npm run typecheck
npm run build
npm run test-asset-library-keyboard
npm run test-asset-store-loading
npm run test-active-library-electron-e2e
```

## Change Log

| Version | Time | Change |
| --- | --- | --- |
| v1.0.3 | 2026-07-30 | Routed local text discovery through the shared lexical-only Asset Discovery Module and added bounded match evidence to grid cards. |
| v1.0.2 | 2026-06-04 | Documented shared Asset Display projection ownership for library grid cards. |
| v1.0.1 | 2026-06-04 | Documented shared Library tag sidebar and filter-chip projection ownership. |
| v1.0.0 | 2026-05-31 | Added compact README and extracted library tag group labels. |
