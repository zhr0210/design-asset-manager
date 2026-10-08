# Phase 16 Path Governance Execution Analysis

## 1. Executive Summary
This report analyzes and designs the implementation of **Phase 16 (Path Governance Execution)** for the Design Asset Manager. The objective is to transition from dry-run assessments (Phases 13A-14C) to active execution. This involves:
- Physically migrating thumbnail and normalized image files from legacy/absolute directories into the system-controlled `managed-cache` directory structure.
- Atomically updating SQLite database paths to use portable `cache://` scheme URIs.
- Implementing an enterprise-grade, transaction-journaled backup and recovery mechanism (`better-sqlite3` API copy and file revert log) to guarantee zero data loss.
- Establishing an automated test suite supporting mock filesystems and fault-injection pathways.

---

## 2. Current State & Codebase Alignment
Our inspection of current files reveals the following foundations:
- **`src/main/path-migration/media-path-governance.ts` (Phase 14C)**:
  Defines `MediaPathReference` and governance plans. The cache root target is locked to `'managed-cache'`, and paths resolve to `${kind}/${assetId}/${filename}`. Legacy moving is currently disabled (`moveLegacyFiles: false`).
- **`src/main/path-migration/database-path-migration-plan.ts` (Phase 13B)**:
  Specifies the execution gates (backup, dry-run, fixtures check, rollback, user confirmation) but restricts write operations (`applyEnabled: false`, `dataWriteIncluded: false`).
- **`src/main/path-migration/database-path-design.ts` (Phase 13A)**:
  Exposes the layout definition for roots (`library`, `managed-cache`) and paths remapping logic. It supports transforming legacy paths into portable URIs like `library://...`.
- **`src/main/platform/managed-cache-writer.ts`**:
  Exposes safe functions (`writeManagedCache`, `resolveServiceCachePath`, `assertSafeCachePath`) which enforce platform security checks using directory isolation boundaries.
- **`src/main/db/schema.ts` & `index.ts`**:
  Tracks paths in `assets` (`file_path`, `thumbnail_path`, `original_path`, `normalized_path`) and AI tasks (`file_path`).

---

## 3. Active Path Migration Design
To physically migrate media assets and update SQLite database paths, we define a dedicated service: `PathMigrationExecutorService`.

### 3.1 Resolving and Mapping Source paths
The executor queries `assets` with legacy/absolute physical paths and computes targets:
- **Thumbnail**: Resolves legacy path from `assets.thumbnail_path` and computes destination relative path as `thumbnail/${assetId}/${path.basename(thumbnail_path)}`.
- **Normalized Image**: Resolves legacy path from `assets.normalized_path` and computes destination relative path as `normalized-image/${assetId}/${path.basename(normalized_path)}`.

### 3.2 Target Directory Resolution
Using the platform path resolver (`src/main/platform/path-resolver.ts`), the `managed-cache` absolute root resolves to `managedPaths.cacheDir` (i.e. `~/DesignAssetManager/cache`).
The absolute destination paths resolve via `resolveServiceCachePath`:
- `managedPaths.cacheDir/thumbnail/${assetId}/${filename}`
- `managedPaths.cacheDir/normalized-image/${assetId}/${filename}`

### 3.3 SQLite Path Representation
After migrating physical files, the database columns are updated to store portable cache URIs:
- `thumbnail_path` -> `cache://thumbnail/${assetId}/${filename}`
- `normalized_path` -> `cache://normalized-image/${assetId}/${filename}`

This ensures database portability when the app-managed directory is relocated or copied across platforms (Windows/macOS), as path resolution is decoupled from absolute root storage.

---

## 4. Backup, Recovery, and Transaction Logging

### 4.1 SQLite Database-Level Backup
Before executing file operations, we execute a database backup using SQLite's native non-blocking Online Backup API. Using `better-sqlite3`, we call:
```typescript
const db = getDatabase();
const backupFile = path.join(managedPaths.userDataDir, 'backups', `design_asset_manager.db.bak-${Date.now()}`);
await db.backup(backupFile);
```
This guarantees an atomic, consistent copy of the database, bypassing risks associated with physical copy-on-write during active locks.

### 4.2 Migration Transaction Journal (Log)
To allow recovery from sudden crashes or power failures, a **Migration Transaction Journal** is created before any operation starts.
```typescript
interface FileMigrationOp {
  assetId: string;
  field: 'thumbnail_path' | 'normalized_path';
  sourcePath: string;
  destPath: string;
  status: 'pending' | 'copied' | 'failed';
}

interface MigrationJournal {
  migrationId: string;
  status: 'initialized' | 'db_backed_up' | 'files_migrating' | 'files_migrated' | 'db_updating' | 'completed' | 'failed';
  dbBackupPath: string;
  activeDbPath: string;
  operations: FileMigrationOp[];
  error?: string;
}
```
The journal is serialized to a JSON file (e.g. `migration-journal.json`) inside the app's `tempDir` or `userDataDir`.

### 4.3 Detailed Execution Pipeline
1. **Lock Database & Pause Queues**: Pause download tasks and AI jobs to prevent new media files from being generated during migration.
2. **Initialize Journal**: Populate with source/destination paths and set status to `initialized`.
3. **Backup Database**: Perform `db.backup()`, record path in the journal, and set status to `db_backed_up`.
4. **Copy Physical Files**:
   - Loop over each operation.
   - Verify `sourcePath` exists. If missing but fallback exists, use fallback. If totally missing, register warning (do not fail completely if user chooses to proceed).
   - Copy the file to `destPath` (using `fs.copyFile`).
   - Mark operation status as `copied` and write changes to the journal file.
   - Set journal status to `files_migrated`.
5. **Update Database in Transaction**:
   - Run a single, unified SQLite transaction:
     ```sql
     UPDATE assets SET thumbnail_path = ?, normalized_path = ? WHERE id = ?
     ```
   - If the database write succeeds, set status to `completed` and write the final journal state.
6. **Post-Migration Clean Up**:
   - (Optional/User Confirmed) Remove legacy files at their source paths.
   - Delete/Archive the transaction journal.

### 4.4 Rollback and Recovery Protocol
If migration fails at step 4 (file copy error) or step 5 (database transaction failure/disk full):
1. **Database Rollback**:
   - Close active SQLite connection.
   - Copy the database file at `dbBackupPath` back to the active `activeDbPath` file.
   - Reopen connection.
2. **Physical Cleanup**:
   - Loop through operations. For each marked `copied`, delete the file at `destPath`.
   - Remove parent directories created under `managed-cache` if they are empty.
3. **Resume Services**:
   - Unpause AI and download queues.
   - Update journal status to `failed` and record the error.

---

## 5. Proposing Implementation Code

### 5.1 Migration Executor (Proposed File `src/main/path-migration/path-migration-executor.ts`)
Below is a proposed implementation structure for Phase 16:

```typescript
import fs from 'fs/promises';
import path from 'path';
import { getDatabase } from '../db';
import { resolveServiceCachePath } from '../platform/cache-path-resolver';
import type { ManagedPaths } from '../../shared/types/platform.types';

export interface MigrationOptions {
  managedPaths: ManagedPaths;
  deleteLegacyFiles?: boolean;
}

export interface MigrationResult {
  success: boolean;
  copiedCount: number;
  dbUpdatedCount: number;
  backupPath: string;
  error?: string;
}

export class PathMigrationExecutor {
  private db = getDatabase();

  public async executeMigration(options: MigrationOptions): Promise<MigrationResult> {
    const { managedPaths, deleteLegacyFiles = false } = options;
    const backupDir = path.join(managedPaths.userDataDir, 'backups');
    await fs.mkdir(backupDir, { recursive: true });
    const backupPath = path.join(backupDir, `design_asset_manager.db.bak-${Date.now()}`);

    // Journal file setup
    const journalPath = path.join(managedPaths.tempDir, 'path-migration-journal.json');
    
    try {
      // Step 1: Backup database
      await this.db.backup(backupPath);

      // Step 2: Fetch legacy paths
      const rows = this.db.prepare(`
        SELECT id, thumbnail_path, normalized_path FROM assets 
        WHERE (thumbnail_path NOT LIKE 'cache://%' AND thumbnail_path IS NOT NULL AND thumbnail_path != '')
           OR (normalized_path NOT LIKE 'cache://%' AND normalized_path IS NOT NULL AND normalized_path != '')
      `).all() as Array<{ id: string; thumbnail_path: string; normalized_path: string }>;

      if (rows.length === 0) {
        return { success: true, copiedCount: 0, dbUpdatedCount: 0, backupPath };
      }

      // Step 3: Map files and initialize journal
      const operations: any[] = [];
      for (const row of rows) {
        if (row.thumbnail_path && !row.thumbnail_path.startsWith('cache://')) {
          const filename = path.basename(row.thumbnail_path);
          operations.push({
            assetId: row.id,
            field: 'thumbnail_path',
            sourcePath: row.thumbnail_path,
            destPath: resolveServiceCachePath(`thumbnail/${row.id}/${filename}`, { managedPaths, fileName: `thumbnail/${row.id}/${filename}` }),
            relativePath: `thumbnail/${row.id}/${filename}`,
            status: 'pending'
          });
        }
        if (row.normalized_path && !row.normalized_path.startsWith('cache://')) {
          const filename = path.basename(row.normalized_path);
          operations.push({
            assetId: row.id,
            field: 'normalized_path',
            sourcePath: row.normalized_path,
            destPath: resolveServiceCachePath(`normalized-image/${row.id}/${filename}`, { managedPaths, fileName: `normalized-image/${row.id}/${filename}` }),
            relativePath: `normalized-image/${row.id}/${filename}`,
            status: 'pending'
          });
        }
      }

      const journal = { status: 'db_backed_up', dbBackupPath: backupPath, operations };
      await fs.writeFile(journalPath, JSON.stringify(journal, null, 2), 'utf8');

      // Step 4: Physically copy files
      let copiedCount = 0;
      for (const op of operations) {
        try {
          const sourceExists = await fs.stat(op.sourcePath).then(() => true).catch(() => false);
          if (sourceExists) {
            await fs.mkdir(path.dirname(op.destPath), { recursive: true });
            await fs.copyFile(op.sourcePath, op.destPath);
            op.status = 'copied';
            copiedCount++;
            await fs.writeFile(journalPath, JSON.stringify(journal, null, 2), 'utf8');
          } else {
            op.status = 'missing_source';
          }
        } catch (err) {
          op.status = 'failed';
          throw new Error(`File copy failed: ${op.sourcePath} -> ${op.destPath}. Error: ${(err as Error).message}`);
        }
      }

      // Step 5: Update database paths
      const updateThumbnail = this.db.prepare('UPDATE assets SET thumbnail_path = ? WHERE id = ?');
      const updateNormalized = this.db.prepare('UPDATE assets SET normalized_path = ? WHERE id = ?');

      let dbUpdatedCount = 0;
      this.db.transaction(() => {
        for (const op of operations) {
          if (op.status === 'copied') {
            const portablePath = `cache://${op.relativePath}`;
            if (op.field === 'thumbnail_path') {
              updateThumbnail.run(portablePath, op.assetId);
            } else {
              updateNormalized.run(portablePath, op.assetId);
            }
            dbUpdatedCount++;
          }
        }
      })();

      // Step 6: Cleanup legacy files if requested
      if (deleteLegacyFiles) {
        for (const op of operations) {
          if (op.status === 'copied') {
            await fs.rm(op.sourcePath, { force: true }).catch(() => {});
          }
        }
      }

      await fs.rm(journalPath, { force: true }).catch(() => {});
      return { success: true, copiedCount, dbUpdatedCount, backupPath };

    } catch (err) {
      console.error('[Migration] Critical failure during path migration execution:', err);
      await this.rollbackMigration(journalPath, backupPath, options);
      return {
        success: false,
        copiedCount: 0,
        dbUpdatedCount: 0,
        backupPath,
        error: (err as Error).message
      };
    }
  }

  private async rollbackMigration(journalPath: string, backupPath: string, options: MigrationOptions) {
    console.warn('[Migration] Initiating rollback procedure...');
    const { managedPaths } = options;

    try {
      // 1. Rollback Database
      this.db.close();
      const activeDbFile = path.join(managedPaths.userDataDir, 'database', 'design_asset_manager.db'); // Resolve active DB filepath
      await fs.copyFile(backupPath, activeDbFile);
      // Re-initialize database connection in global/service state
      // (This assumes the db module has a method to reconnect)

      // 2. Rollback Files
      const journalExists = await fs.stat(journalPath).then(() => true).catch(() => false);
      if (journalExists) {
        const journalContent = await fs.readFile(journalPath, 'utf8');
        const journal = JSON.parse(journalContent);
        for (const op of journal.operations) {
          if (op.status === 'copied') {
            await fs.rm(op.destPath, { force: true }).catch(() => {});
            // Clean up directory if empty
            await fs.rmdir(path.dirname(op.destPath)).catch(() => {});
          }
        }
        await fs.rm(journalPath, { force: true }).catch(() => {});
      }
      console.log('[Migration] Rollback completed successfully.');
    } catch (rollErr) {
      console.error('[Migration] Disaster scenario: rollback failed!', rollErr);
    }
  }
}
```

### 5.2 IPC Bridge (Proposed File `src/main/ipc/path-governance.ipc.ts`)
Exposing confirmable path migration functionality via IPC:

```typescript
import { ipcMain } from 'electron';
import { getDatabase } from '../db';
import { SettingsService } from '../services/settings.service';
import { PathMigrationExecutor } from '../path-migration/path-migration-executor';
import { resolveManagedPaths } from '../platform/path-resolver';

export function registerPathGovernanceIpc() {
  // Existing endpoints...

  // New endpoint to execute active path migration
  ipcMain.handle('assets:apply-path-migration', async (_, options: { deleteLegacyFiles: boolean }) => {
    try {
      const settings = SettingsService.getInstance().getSettings();
      const managedPaths = resolveManagedPaths();
      const executor = new PathMigrationExecutor();

      const result = await executor.executeMigration({
        managedPaths,
        deleteLegacyFiles: options.deleteLegacyFiles
      });
      return result;
    } catch (err) {
      console.error('[IPC] assets:apply-path-migration error:', err);
      return { success: false, error: (err as Error).message };
    }
  });
}
```

---

## 6. Automated Testing Strategy
We propose writing focused execution tests in a new file `scripts/path-migration-execution.test.ts`. This isolates side effects from standard dry-run unit tests.

### 6.1 Setup & Mocking
1. **Mock Filesystem Environment**: Create a temporary folder structure (`dist-temp/path-migration-tests/`). Setup subfolders for `user-data/database`, `user-data/cache`, and `legacy-assets`.
2. **Database Initialization**: Initialize a temporary SQLite database inside `dist-temp/path-migration-tests/user-data/database/design_asset_manager.db`. Populate the schema and insert seed rows mapping to legacy files.
3. **Populate Mock Media Assets**: Create small dummy files representing legacy thumbnails/images (e.g. `legacy-assets/thumb.jpg`, `legacy-assets/norm.jpg`).

### 6.2 Test Assertions Plan
- **Verification of Success Path**:
  - Assert that `executeMigration` returns `success: true`.
  - Assert that the database file was successfully copied to the backup folder.
  - Assert that files were copied to the destination folders under the cache root.
  - Assert that the SQLite database row paths were modified to `cache://thumbnail/asset-1/thumb.jpg` and `cache://normalized-image/asset-1/norm.jpg`.
- **Verification of Rollback Path**:
  - Seed another legacy asset.
  - Inject a failure (e.g. mock filesystem throws a write permission error during copy of the second file).
  - Verify that the first file's copied thumbnail is deleted from `managed-cache`.
  - Verify that the SQLite database paths for all assets are restored to their original absolute values.
  - Verify that the backup database exists and was not corrupted.
