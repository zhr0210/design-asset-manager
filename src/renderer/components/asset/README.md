# Asset Components

Asset detail and action panels used by the library UI.

Asset tag panels should consume shared Asset Tagging Workflow projections for confirmed chip lists, active tag names, and search query targets.
Asset detail drawers, original image viewers, and caption panels should consume shared Asset Display projections for preview source, source labels, image specs, file size, date labels, metadata copy, zoom labels, caption source, and caption timestamps instead of formatting metadata locally.

## Entry Files

- `AssetInspectorDrawer.tsx`: asset detail drawer.
- `AssetOriginalViewerModal.tsx`: high-resolution original image viewer modal.
- `AssetTagPanel.tsx`: tag management panel.
- `AssetCaptionPanel.tsx`: caption display.
- `AssetPromptReversePanel.tsx`: prompt reverse workflow with model dropdown.
- `AssetDeleteButton.tsx`: delete action.

## Tests

```bash
npm run typecheck
npm run build
```

## Change Log

| Version | Time | Change |
| --- | --- | --- |
| v1.1.6 | 2026-06-04 | Extended shared Asset Display ownership to caption panel source labels, timestamps, and action copy. |
| v1.1.5 | 2026-06-04 | Extended shared Asset Display ownership to original viewer metadata and zoom labels. |
| v1.1.4 | 2026-06-04 | Documented shared Asset Display projection ownership for detail drawer metadata. |
| v1.1.3 | 2026-06-04 | Documented shared confirmed-tag projection ownership for `AssetTagPanel`. |
| v1.1.2 | 2026-05-31 | Added high-resolution original image viewer modal triggered on hover preview "查看大图" click, supporting 100% zoom, fit-to-screen controls, copy path, and folder reveal utilities. |
| v1.1.1 | 2026-05-31 | Filtered the "图片反推" model selection dropdown to exclusively list downloaded models, simplifying selection. |
| v1.1.0 | 2026-05-31 | Merged the legacy deep analysis panel into a unified "图片反推" workflow, adding a local GGUF/native model selection dropdown and automatic backend start orchestration. |
| v1.0.0 | 2026-05-31 | Rewrote README as compact asset component map with change log. |
