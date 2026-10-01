# Handoff Report — 2026-06-06T01:00:00+08:00

## 1. Observation

- **Observed File Paths & Content**:
  - `src/main/path-migration/path-migration-executor.ts` (lines 208-222):
    ```typescript
    if (this.journal.backupPath && existsSync(this.journal.backupPath)) {
      const dbPath = this.db.name
      try {
        this.db.close()
      } catch (err) {
        console.warn('[PathMigrationExecutor] Error closing DB during rollback:', err)
      }
      try {
        await fs.copyFile(this.journal.backupPath, dbPath)
        this.db = new Database(dbPath)
      } catch (dbCopyErr) {
        console.error('[PathMigrationExecutor] Failed to restore backup DB file during rollback:', dbCopyErr)
      }
    }
    ```
  - `src/main/db/index.ts` (lines 7, 405-410):
    ```typescript
    let db: Database.Database
    ...
    export function getDatabase(): Database.Database {
      if (!db) {
        throw new Error('Database not initialized. Please call initDatabase() first.')
      }
      return db
    }
    ```
  - `ai-service/tools/download_cooperative_hf_model.py` (lines 119-123):
    ```python
    existing_bytes = 0
    if segment_path.exists():
        existing_bytes = segment_path.stat().st_size
        
    if existing_bytes >= chunk_size:
        return True
    ```

- **Observed Test Commands & Output**:
  - Command: `npm run test-path-governance-late-phases`
    Output:
    ```
    Running PathMigrationExecutor tests...
    [PathMigrationExecutor] Error during migration: Error: Thumbnail file not found for asset asset-mig-3 at ...
    [PathMigrationExecutor] Running rollback...
    PathMigrationExecutor tests passed successfully!
    ```
  - Command: `npm run test-python-unittest`
    Output:
    ```
    Ran 86 tests in 3.463s
    OK
    ```

## 2. Logic Chain

1. **DB Rollback Connection Severing**:
   - `PathMigrationExecutor` receives the active `Database` connection returned by `getDatabase()` (which is stored in a module-scoped variable `db` in `src/main/db/index.ts`).
   - When migration fails, `executeMigration()` catches the error and calls `rollbackMigration()`.
   - `rollbackMigration()` calls `this.db.close()`, which closes the global connection.
   - It then creates a new connection via `this.db = new Database(dbPath)`.
   - However, this re-assignment only updates the class instance field `this.db` and *not* the module-scoped variable `db` in `src/main/db/index.ts`.
   - Thus, any other service or IPC call that later retrieves the database using `getDatabase()` will receive the closed connection, causing all subsequent queries to fail.

2. **Downloader Parallel Resume Corruption**:
   - `download_segment()` calculates `chunk_size` based on the number of channels (`num_channels`).
   - If the download is aborted and subsequently restarted with a different thread count (e.g. going from 2 threads to 4 threads), the `chunk_size` changes.
   - The script checks if `existing_bytes` (from a file named `*.part.index` written during the 2-channel run) is `>= chunk_size` (for the 4-channel run).
   - If it is, the segment download is skipped, despite containing mismatched range data.
   - This results in concatenating mismatched and corrupted byte segments when merging.

3. **Urllib Fallback Issues**:
   - If a Range request returns HTTP 200 instead of 206, the segment downloader falls back to write with `mode = "wb"` and reads until connection close.
   - Since the URL is the full file resolution URL, it downloads the entire file, duplicating it in each segment file, which merges into a file size of `num_channels * total_size`.

## 3. Caveats

- We assumed that Hugging Face usually supports Range requests, so the HTTP 200 fallback bug is unlikely to trigger on standard direct connections, but poses a major threat over proxies or corporate CDNs.
- We did not run Windows Sandbox on Mac because of OS limits, so the sandbox validation was verified through code inspection and testing the package smoke test script's parsing.

## 4. Conclusion

The implemented changes are robust in their happy-path configurations and security profiles, but suffer from critical flaws under recovery/rollback scenarios (severed DB connection) and parallel resume edge cases (corrupted chunk merges when channel count changes). The final verdict is **REQUEST_CHANGES**.

## 5. Verification Method

- **To verify DB rollback correctness**:
  Run a test that triggers rollback and then immediately executes a query using `getDatabase()`. It will fail with `Error: The database connection is closed`.
- **To verify Downloader resume corruption**:
  Start a partial download of a model file with `--parallel 2` and abort it. Then resume the download using `--parallel 4`. Inspect the merged file to confirm it is corrupted and oversized.
