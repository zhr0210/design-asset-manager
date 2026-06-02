# Path Field Inventory

Phase 7E records path-bearing fields for future design work only. It does not change schema, save logic, runtime behavior, or any user files.

| Field | File | Module | Current meaning | Absolute today | User configurable | Database involved | Asset library involved | Migratable | Migration risk | Suggested phase |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `assets.file_path` | `src/main/db/schema.ts`, `src/main/services/asset.service.ts` | Asset library | Primary asset image path consumed by UI, AI, OCR, and palette flows. | Mixed portable/absolute depending on writer | Indirectly via library/import flow | Yes | Yes | Yes, only with dry-run and backup | High | Phase 8B |
| `assets.thumbnail_path` / `thumbnail_path` | `src/main/db/schema.ts`, `src/main/services/asset.service.ts`, `src/main/services/image-normalize.service.ts` | Asset library thumbnails | UI thumbnail path for preview rendering. | Mixed portable/absolute depending on normalization | Indirectly via library root | Yes | Yes | Yes, after asset path model is stable | High | Phase 8C |
| `assets.original_path` / `original_path` | `src/main/db/schema.ts`, `src/main/db/index.ts`, `src/main/services/asset.service.ts`, `src/main/services/image-normalize.service.ts` | Normalization | Original asset copy path after normalization pipeline. | Portable `~` form where possible | Indirectly via library root | Yes | Yes | Yes, staged with compatibility read | High | Phase 8B |
| `assets.normalized_path` / `normalized_path` | `src/main/db/schema.ts`, `src/main/services/asset.service.ts`, `src/main/services/image-normalize.service.ts` | Normalization | Normalized sRGB-safe image path used downstream. | Portable `~` form where possible | Indirectly via library root | Yes | Yes | Yes, staged with thumbnail validation | High | Phase 8C |
| AI task `file_path` | `src/main/db/schema.ts`, `src/main/services/ai-client.service.ts` | AI queue | Path submitted to AI tagging, prompt, and analysis jobs. | Mirrors asset path at enqueue time | No | Yes | Yes | Yes, only after asset compatibility layer | High | Phase 8D |
| Download task `save_path` | `src/main/db/schema.ts`, `src/main/services/download.service.ts` | Download queue | Destination path for pending/completed downloads. | Task-provided path | Indirectly via download flow | Yes | Yes | Yes, but only for pending tasks first | High | Phase 8E |
| `libraryPath` | `src/main/services/settings.service.ts`, `src/shared/types/settings.types.ts` | Settings | User-facing asset library root. | May be portable or absolute | Yes | Settings file | Yes | Yes, but never automatic | High | Phase 8A |
| `downloadPath` | Settings compatibility metadata | Settings / downloads | Intended download destination root; not consistently present in current shared type. | Unknown/optional | Yes when exposed | Settings file if present | Yes | Yes, after field ownership is clarified | Medium | Phase 8E |
| `modelRootDir` | `src/main/services/settings.service.ts`, `src/shared/types/settings.types.ts` | AI models | Root for local model storage and runtime package layout. | Often host-specific | Yes | Settings file | No | Yes, only with explicit user confirmation | High | Phase 8F |
| `selectedPromptModelPath` | `src/main/services/settings.service.ts`, `src/shared/types/settings.types.ts` | AI models | Selected native prompt model path. | Derived from model root unless explicitly persisted | Partly | Settings file | No | Yes, after `modelRootDir` mapping | High | Phase 8F |
| `managedPaths.cacheDir` / `cacheDir` | `src/shared/types/platform.types.ts`, `src/main/platform/path-resolver.ts` | Platform governance | App-managed cache root. | Resolved by platform path resolver | No | Settings metadata only | No | Already governed | Low | Done |
| `managedPaths.tempDir` / `tempDir` | `src/shared/types/platform.types.ts`, `src/main/platform/path-resolver.ts` | Platform governance | App-managed temp root. | Resolved by platform path resolver | No | Settings metadata only | No | Already governed | Low | Done |
| `managedPaths.logsDir` / `logsDir` | `src/shared/types/platform.types.ts`, `src/main/platform/path-resolver.ts` | Platform governance | App-managed logs root. | Resolved by platform path resolver | No | Settings metadata only | No | Already governed | Low | Done |
| `managedPaths.runtimeDir` / `runtimeDir` | `src/shared/types/platform.types.ts`, `src/main/platform/path-resolver.ts` | Platform governance | App-managed runtime metadata root. | Resolved by platform path resolver | No | Settings metadata only | No | Partly, only for metadata | Medium | Phase 8F |
| `managedPaths.modelsDir` / `modelsDir` | `src/shared/types/platform.types.ts`, `src/main/platform/path-resolver.ts` | Platform governance | App-managed model metadata/default root. | Resolved by platform path resolver | No | Settings metadata only | No | Yes, but separate from user `modelRootDir` | High | Phase 8F |

## Notes

- No real user paths, asset file paths, or database contents were inspected for this inventory.
- Fields marked high risk must use no-auto-migration, dry-run, backup, rollback, and explicit user confirmation.
- Current legacy portable path support uses `~`-style paths in some flows; this is not enough for multi-root migration by itself.
