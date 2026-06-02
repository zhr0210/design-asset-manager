# Path Migration Design

Phase 7E design notes for future path migration. This document is intentionally non-executable and does not change application behavior.

## Goals

- Make path ownership explicit across app-managed roots, user library roots, download roots, model roots, and runtime metadata.
- Preserve compatibility with existing absolute and portable path values.
- Require dry-run, backup, rollback, and user confirmation before any path rewrite.

## Proposed Model

### `pathRootId`

Introduce logical root identifiers before rewriting stored paths:

| Root ID | Meaning | Owner | Example use |
| --- | --- | --- | --- |
| `managed:userData` | App-managed user data root | Platform resolver | Config metadata |
| `managed:logs` | App-managed logs root | Platform resolver | Doctor and debug logs |
| `managed:cache` | App-managed cache root | Platform resolver | Non-user cache files |
| `managed:temp` | App-managed temp root | Platform resolver | Probe/temp files |
| `library:primary` | User asset library root | User setting | Asset originals and thumbnails |
| `download:primary` | User download root | User setting | Download destinations |
| `model:primary` | User model root | User setting | Model weights and selected model paths |

### `libraryRelativePath`

For asset library files, prefer storing a root ID plus a relative path:

```text
pathRootId = library:primary
relativePath = normalized/example-file.jpg
```

The display name and stored relative path should be separate so filename sanitization does not destroy user-facing labels.

### Portable Path Compatibility

Existing `~`-style values remain readable. Future code should support:

- Existing absolute paths.
- Existing `~` portable paths.
- New `{ pathRootId, relativePath }` records.
- Remap tables for roots whose physical location changes.

### Path Mapping / Remap

Add a future read-time mapping layer:

```text
stored root id + stored relative path -> current root absolute path -> resolved file path
```

This permits compatibility reads before any database writes. It also lets users remap roots without rewriting every asset row immediately.

## Migration Rules

### No-Auto-Migration

No migration runs automatically on startup. Doctor may report risks, and Settings may show read-only guidance, but migration requires explicit user action.

### Dry-Run

Dry-run output should include:

- Count of rows affected by table/field.
- Count of files that resolve.
- Count of missing files.
- Count of collisions.
- Count of unsafe paths.
- Proposed root mapping summary.

### Backup

Before any write:

- Back up the settings file.
- Back up the SQLite database file or create a database-level export.
- Record the migration plan and timestamp.

### Rollback

Rollback must restore:

- Previous settings roots.
- Previous database path fields.
- Any migration metadata.

Rollback must not delete newly generated files unless the user explicitly selects that action.

### User Confirmation

User confirmation must be separate from dry-run. Confirmation text should state that no files will be moved unless the migration specifically asks for that in a later phase.

### Staged Migration

Recommended stages:

1. Phase 8A: root model and compatibility read layer.
2. Phase 8B: asset path field dry-run and DB backup tooling.
3. Phase 8C: thumbnail and normalized image remap plan.
4. Phase 8D: AI task path compatibility and queue pause policy.
5. Phase 8E: download task path policy.
6. Phase 8F: model/runtime root remap policy.

## Cross-Platform Strategy

- Windows drive roots may disappear or change. Treat them as root mappings, not string prefixes.
- macOS home paths may change between machines. Prefer root IDs over literal home paths.
- Case sensitivity differs. Detect collisions with case-folded comparison and exact comparison.
- Unicode normalization differs. Normalize stored relative paths and keep original display names.
- Paths with spaces and non-English characters must be supported in tests.
- Illegal filename characters should be sanitized only for generated files, not for user-visible titles.
- Symlinks, junctions, and cross-volume links must be detected before migration.
- Cross-drive moves are never automatic because rollback is hard and file operations can be slow or partial.

## Testing Strategy

- Unit test path mapping without touching real user files.
- Use synthetic temp roots under test-only directories.
- Add fixtures for spaces, Unicode, reserved names, path traversal, case collisions, and missing roots.
- Test old absolute path compatibility before testing writes.
- Test dry-run output against a seeded synthetic database, never the user's runtime database.

## Non-Goals

- No schema change in Phase 7E.
- No migration button in Phase 7E.
- No file movement or deletion in Phase 7E.
- No model download, runtime install, or network access in Phase 7E.
