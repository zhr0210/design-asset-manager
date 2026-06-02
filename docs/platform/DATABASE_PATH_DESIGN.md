# Database Path Design Preflight

Phase 13A adds a design-only path model for database path fields. It does not change schema, read the runtime database, or migrate any stored paths.

## Model

`pathRootId` separates a stored path into root identity plus relative value:

| Root | Meaning |
| --- | --- |
| `library` | Path is inside the user-selected asset library root. |
| `managed-cache` | Future cache-backed image or thumbnail path. |
| `managed-database` | Future app-managed database-adjacent path. |
| `legacy-absolute` | Existing absolute path retained as fallback. |
| `external` | Path intentionally outside managed roots. |

## Helper Behavior

- `createLibraryRelativePath` maps paths inside a proposed library root to `library://...`.
- Paths outside the proposed library root remain `legacy-absolute`.
- Empty values are skipped by dry-run.
- The helper accepts in-memory samples only.

## Dry-Run Boundary

`createDatabasePathRemapDryRun` reports what would be mapped, skipped, or kept as fallback. The report explicitly records:

- `schemaChange: false`
- `dataMigration: false`
- no database reads
- no file existence checks

## Next Step

Phase 13B should turn this into a migration design with backup, dry-run, sample database test, rollback, user confirmation, no auto-migration, and old path fallback.
