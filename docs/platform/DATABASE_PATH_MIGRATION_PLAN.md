# Database Path Migration Plan

Phase 13B records the migration design for database path fields. It does not expose apply, rollback, schema changes, or runtime database writes.

## Required Gates

Every future migration must include:

- backup before apply
- dry-run report
- sample database test using fixture rows
- rollback plan
- explicit user confirmation
- no automatic migration
- old path fallback

## Current Boundary

The current plan is intentionally non-executable:

- `applyEnabled: false`
- `rollbackEnabled: false`
- `schemaChangeIncluded: false`
- `dataWriteIncluded: false`
- no runtime database read

## Sample Test Strategy

The sample test uses in-memory path rows from Phase 13A. It verifies that library-relative mapping, legacy absolute fallback, empty-value skipping, and apply-disable gates all stay intact.

## Next Step

Phase 14A should add asset library path governance: dry-run reports, missing file report shape, remap suggestions, and explicit no move/delete/file_path update boundaries.
