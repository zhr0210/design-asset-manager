# Handoff Report — Phase 16 Path Governance Execution Analysis

## 1. Observation
We observed and inspected the following files and directories in the workspace:

### 1.1 `src/main/path-migration/media-path-governance.ts`
- **Reference Structure (Lines 3-9)**:
```typescript
export interface MediaPathReference {
  kind: MediaPathKind
  assetId: string
  cacheRootId: 'managed-cache'
  relativePath: string
  legacyPathFallback: string | null
}
```
- **Plan Construction (Lines 31-41)**:
```typescript
export function createMediaPathGovernancePlan(kind: MediaPathKind, assetId: string, filename: string, legacyPathFallback: string | null = null): MediaPathGovernancePlan {
  return {
    phase: '14C',
    kind,
    regenerateFiles: false,
    moveLegacyFiles: false,
    legacyPathFallback: true,
    cacheRootDesign: 'managed-cache',
    reference: createMediaPathReference(kind, assetId, filename, legacyPathFallback)
  }
}
```

### 1.2 `src/main/path-migration/database-path-migration-plan.ts`
- **Design & Dry-Run Boundaries (Lines 13-26)**:
```typescript
export interface DatabasePathMigrationPlan {
  phase: '13B'
  planId: string
  sourceDryRun: DatabasePathRemapDryRunReport
  gates: DatabasePathMigrationGate
  applyEnabled: false
  rollbackEnabled: false
  schemaChangeIncluded: false
  dataWriteIncluded: false
  backupPlan: {
    kind: 'sqlite-file-copy'
    destination: '<managed-backup-dir>'
    beforeApplyOnly: true
  }
```

### 1.3 `src/main/path-migration/database-path-design.ts`
- **Portable Path Construction (Lines 90-96)**:
```typescript
  return {
    pathRootId: 'library',
    relativePath: relative.split(path.sep).join('/'),
    legacyAbsolutePath: trimmed,
    portablePath: `library://${relative.split(path.sep).join('/')}`,
    warnings
  }
```

### 1.4 `src/main/ipc/path-governance.ipc.ts`
- **Existing Governance Handlers (Lines 10-26)**:
```typescript
export function registerPathGovernanceIpc() {
  ipcMain.handle('assets:path-governance-report', async () => {
    try {
      const db = getDatabase()
      const rows = db.prepare('SELECT id, file_path, thumbnail_path FROM assets').all() as Array<{
        id: string
        file_path: string | null | undefined
        thumbnail_path?: string | null
      }>
```

### 1.5 `scripts/path-governance-late-phases.test.ts`
- **Assertion and Dry-Run Checks (Lines 32-38 & 49-57)**:
```typescript
const mediaPlan = createMediaPathGovernancePlan('thumbnail', 'asset-1', 'thumb.jpg', 'legacy-thumb.jpg')
assert.equal(mediaPlan.phase, '14C')
assert.equal(mediaPlan.regenerateFiles, false)
assert.equal(mediaPlan.moveLegacyFiles, false)
assert.equal(mediaPlan.legacyPathFallback, true)
assert.equal(mediaPlan.reference.cacheRootId, 'managed-cache')
assert.equal(mediaPlan.reference.relativePath, 'thumbnail/asset-1/thumb.jpg')
```
```typescript
for (const file of [
  'src/main/path-migration/asset-library-path-governance.ts',
  'src/main/path-migration/download-path-governance.ts',
  'src/main/path-migration/media-path-governance.ts'
]) {
  const source = await fs.readFile(file, 'utf8')
  assert.doesNotMatch(source, /better-sqlite3|SELECT\s|UPDATE\s|INSERT\s|DELETE\s|fs\.|existsSync|readFile|writeFile|rename|unlink/i)
  assert.doesNotMatch(source, /<LOCAL_PRIVATE_PATH>)
}
```

---

## 2. Logic Chain
1. **Goal**: Propose how to implement active path migration for thumbnails and normalized images to `managed-cache`, including database path updates.
2. **Media Path Mapping**: Observation 1.1 reveals the media path uses `cacheRootId: 'managed-cache'` and matches target layout `thumbnail/asset-id/filename` or `normalized-image/asset-id/filename`.
3. **Database Portability**: Observation 1.3 shows that remapped paths within the library use `library://` URI structure. Consequently, for files in `managed-cache`, the corresponding database paths should be mapped to portable `cache://` URIs.
4. **Execution Transition**: Observation 1.2 and 1.5 indicate that currently all modules are configured to run in a dry-run/read-only mode (`applyEnabled: false`, `moveLegacyFiles: false`), and tests explicitly check that these dry-run codebases do not perform file writes or database queries.
5. **Execution Architecture**: In Phase 16, to execute the actual migration, we need to bypass these restrictions. A separate service `PathMigrationExecutor` should be created to manage the state machine and handle file copies/moves and database transaction updates.
6. **Robustness & Risk Mitigation**: Based on risk registry `docs/platform/PATH_GOVERNANCE_RISK_REGISTER.md` (PGR-002, PGR-003, PGR-010), the migration must be atomic. By using `better-sqlite3`'s native `.backup()` function, we guarantee consistent database state backups. By logging each file copy operation to a file-based **Transaction Journal**, we can guarantee that if a crash or write failure occurs during copy or SQL commit, we can reverse copied cache files and restore the database backup.

---

## 3. Caveats
- **Physical Clean-up of Legacy Assets**: If the user opts to delete original legacy files upon successful migration, there is a small risk of loss if other parts of the system or external programs referenced them. We suggest keeping legacy files by default or requiring explicit opt-in confirmation.
- **Queue Locking**: Active AI tagging tasks or downloads must be paused/drained prior to initiating path governance execution to avoid state inconsistencies.
- **Cross-volume moves**: Moving files between different logical volumes or external storage drives can fail or be very slow; copying with transaction boundaries is preferred.

---

## 4. Conclusion
Phase 16 active path migration can be safely implemented using the proposed `PathMigrationExecutor` service, leveraging:
- Decoupled portable path formats (`cache://...`) in SQLite.
- Standard `.backup()` calls on SQLite database.
- A serialized `MigrationJournal` in JSON format to track files and ensure atomic rollback.
- An IPC channel endpoint (`assets:apply-path-migration`) that allows UI-triggered, user-confirmed execution.

---

## 5. Verification Method
To independently verify the implementation:
1. **Mock Seed Generation**: Prepare a mock directory structure with fake DB and asset files in a temp folder.
2. **Execute Tests**: Propose running the node tests using:
   ```bash
   node dist-temp/tests/path-migration-execution.test.mjs
   ```
3. **Validate DB State**: Inspect SQLite database post-run to ensure paths contain `cache://thumbnail/` or `cache://normalized-image/` instead of absolute paths.
4. **Verify Rollback**: Manually trigger permission errors (e.g. read-only target dir) during execution and assert the database is successfully rolled back to its original copy, and temp files are removed.
5. **Validation of Forbidden Expressions**: Ensure that the core path evaluation code remains clean, with file and db operations properly isolated within the `PathMigrationExecutor` class.
