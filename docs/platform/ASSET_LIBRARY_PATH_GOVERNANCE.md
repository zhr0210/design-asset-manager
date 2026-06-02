# Asset Library Path Governance

Phase 14A defines asset-library path reports without reading the runtime database or scanning the real asset library.

The report is dry-run only and keeps these boundaries:

- `autoMoveFiles: false`
- `autoDeleteFiles: false`
- `autoUpdateFilePath: false`
- missing-file reports are shape-only until a user-approved scan exists
- remap suggestions require later user confirmation

Phase 14B handles download save path policy next.
