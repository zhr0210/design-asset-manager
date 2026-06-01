# Asset Components

Asset detail and action panels used by the library UI.

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
| v1.1.2 | 2026-05-31 | Added high-resolution original image viewer modal triggered on hover preview "查看大图" click, supporting 100% zoom, fit-to-screen controls, copy path, and folder reveal utilities. |
| v1.1.1 | 2026-05-31 | Filtered the "图片反推" model selection dropdown to exclusively list downloaded models, simplifying selection. |
| v1.1.0 | 2026-05-31 | Merged the legacy deep analysis panel into a unified "图片反推" workflow, adding a local GGUF/native model selection dropdown and automatic backend start orchestration. |
| v1.0.0 | 2026-05-31 | Rewrote README as compact asset component map with change log. |
