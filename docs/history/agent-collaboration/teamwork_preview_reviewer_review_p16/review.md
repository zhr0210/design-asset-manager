## Review Summary

**Verdict**: REQUEST_CHANGES

The work implements the requested features (Path Governance, Packaging and Smoke Testing, Cooperative Downloader with parallel chunk downloading and resume support). However, there are two major correctness/robustness flaws:
1. **Critical SQLite connection severing**: On a rollback, the database connection is closed and re-initialized locally in the executor instance, but the module-scoped `db` connection inside `src/main/db/index.ts` remains closed, disabling all subsequent database queries across the entire Electron application.
2. **Major downloader corruption on parallel resume**: If the downloader resumes a download with a different number of channels (threads) than the initial run, the segment bounds differ, but it checks size against the old segment file files. It will skip downloading mismatched chunks and merge corrupted files.

---

## Findings

### [Critical] SQLite Database Connection Severing on Rollback

- **What**: The rollback mechanism closes the database connection and recreates a new `Database` instance, but does not update the global/module-scoped database reference in the application.
- **Where**: `src/main/path-migration/path-migration-executor.ts` (lines 208-222) and `src/main/db/index.ts`.
- **Why**: 
  In `rollbackMigration()`, the code runs:
  ```typescript
  this.db.close()
  ...
  this.db = new Database(dbPath)
  ```
  This closes the database connection that was passed in via constructor (originally obtained from `getDatabase()`). Since the global database reference `db` in `src/main/db/index.ts` is never updated or re-initialized, it continues to point to the closed database instance. As a result, after a migration fails and rolls back, any subsequent database operations in the Electron application will fail with: `Error: The database connection is closed`.
- **Suggestion**: 
  Expose a method in `src/main/db/index.ts` to re-initialize or reset the global database connection (e.g., re-running `initDatabase()`), or have the executor update the shared database reference.

### [Major] Downloader Resume Corruptibility with Variable Channels

- **What**: Parallel chunk downloader resume logic corrupts files if the thread count changes between runs.
- **Where**: `ai-service/tools/download_cooperative_hf_model.py` (lines 119-123 & 145-146).
- **Why**: 
  In `download_segment()`, segment bounds are determined dynamically based on `num_channels`. If a download is aborted and later resumed with a different number of threads, the chunk sizes and ranges change. The script checks:
  ```python
  if existing_bytes >= chunk_size:
      return True
  ```
  If `existing_bytes` from a previous segment file (e.g., from a 2-channel run) is greater than or equal to the new segment's `chunk_size` (e.g., from a 4-channel run), the script assumes the segment is fully downloaded and skips it. This leads to merging mismatched segment chunks, silently producing a corrupted model binary that passes size checks.
- **Suggestion**:
  Ensure that when `num_channels` changes, or segment boundaries do not match the existing partial files, all partial files (`*.part.*`) are cleared, or include the channel count and start/end offsets in the segment file names (e.g., `dest.name.part.{num_channels}.{index}`).

### [Medium] Urllib Fallback / Range Request Server Compatibility Risks

- **What**: In compatibility fallback mode, downloading fails to respect bounds if the server returns status 200.
- **Where**: `ai-service/tools/download_cooperative_hf_model.py` (lines 134-136).
- **Why**:
  If the server ignores the `Range` request header and returns `200` instead of `206`, the thread falls back to write with `mode = "wb"`. However, because the URL points to the entire file, the thread will download the entire file (not just the segment). If all threads do this, they will write the entire file into their individual segment files and then concatenate them. The merged file size will be `num_channels` times the total size, which will pass the minimum size check in `validate_file`.
- **Suggestion**:
  If `resp.status != 206` during a segment download, fail immediately and let the downloader fall back to single-channel streaming rather than completing the download with invalid content.

### [Minor] Weak Validation for Non-Model Config Files

- **What**: Non-model configuration/metadata files are validated purely on a 100-byte threshold.
- **Where**: `ai-service/tools/download_cooperative_hf_model.py` (lines 83-88).
- **Why**:
  Files like `config.json`, `tokenizer.json`, etc., are not present in `EXPECTED_SIZES`. If their download is truncated (e.g., leaving a corrupted 200-byte file instead of a complete 10KB configuration), the validator will accept it since it is `>= 100` bytes. The application will then skip re-downloading them and crash when parsing the configuration.
- **Suggestion**:
  Validate JSON structure (using `json.loads`) for `.json` files to ensure they are complete and valid.

---

## Verified Claims

- **SQLite Native DB Backup** → verified via code review of `executeMigration` calling `this.db.backup(backupPath)` → **PASS**
- **Transactional DB Migration Updates** → verified via code review showing `this.db.transaction(...)` wrapper → **PASS**
- **File Rollback & Cleanup** → verified via running `npm run test-path-governance-late-phases` which successfully deletes copied files and directories → **PASS**
- **Home/UserProfile Sandboxing** → verified via code review of environment overrides in `scripts/package-smoke.mjs` and running `npm run test-package-smoke` → **PASS**
- **No Exposed Credentials/Secrets** → verified via scanning plists, workflows, and code signing configurations → **PASS**
- **Custom TLS 1.2 Enforcement in Python Downloader** → verified via code review of `ssl.SSLContext` setup in `download_cooperative_hf_model.py` and `test_model_downloads.py` → **PASS**
- **Parallel Chunk Downloading & Resume** → verified via running `npm run test-python-unittest` and inspecting range requests → **PASS (with variable channel caveat)**

---

## Coverage Gaps

- **SQLite Database Rollback integration with IPC lifecycle** — risk level: **High** — recommendation: **Investigate/Fix**. The severing of the DB connection in the main process needs to be addressed so that IPC handlers do not fail on subsequent calls.
- **Variable Channel Downloader Resume** — risk level: **Medium** — recommendation: **Investigate/Fix**. The logic should robustly handle changes in channel counts during resume.

---

## Unverified Items

- **Apple Notarization runtime check** — skipped because Apple Notarization requires real macOS developer credentials and API endpoints, which are skipped/disabled in local and mock workflows.
- **Windows Sandbox executable run** — skipped because the tests were run on a mac host, which doesn't support executing `WindowsSandbox.exe`.
