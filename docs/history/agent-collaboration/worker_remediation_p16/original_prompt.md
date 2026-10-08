## 2026-06-05T17:00:20Z

You are a Worker subagent (Archetype: teamwork_preview_worker). Your working directory is `<DAM_WORKSPACE>/.agents/worker_remediation_p16`.
Your task is to fix four correctness and robustness issues identified in the code review and verification passes:

### 1. SQLite Database Connection Severing on Rollback
- **Problem**: In `src/main/path-migration/path-migration-executor.ts` (inside `rollbackMigration()`), the code closes `this.db` and opens a new connection:
  `this.db.close()`
  `this.db = new Database(dbPath)`
  However, this leaves the global/module-scoped `db` variable inside `src/main/db/index.ts` pointing to the closed database instance.
- **Solution**:
  1. Add and export a function `setDatabase(newDb: Database.Database): void` in `src/main/db/index.ts` that assigns the module-scoped `db` variable to the new database instance:
     ```typescript
     export function setDatabase(newDb: Database.Database): void {
       db = newDb
     }
     ```
  2. In `src/main/path-migration/path-migration-executor.ts` (inside `rollbackMigration()`), after re-initializing the database connection `this.db = new Database(dbPath)`, call `setDatabase(this.db)` to update the shared database reference in `src/main/db/index.ts`. Since the modules are in typescript/esm/commonjs compile environment, you can import `setDatabase` at the top or dynamically:
     ```typescript
     import { setDatabase } from '../db/index'
     ```
     Ensure that any tests that require `getDatabase()` or subsequent database calls in the main process work correctly after a rollback is performed.

### 2. Downloader Resume Corruptibility with Variable Channels
- **Problem**: In `ai-service/tools/download_cooperative_hf_model.py`, segment files are named `{dest.name}.part.{index}`. If a download is resumed with a different number of channels (threads), the segment bounds change, but it still matches the same filenames, causing corrupted chunks to be merged.
- **Solution**:
  Change the naming convention of the segment files in `ai-service/tools/download_cooperative_hf_model.py` to include the total channel count and the start/end offsets (e.g. `{dest.name}.part.{num_channels}.{index}.{start}_{end}`).
  - In `download_segment`, change `segment_path` generation to:
    `segment_path = dest.parent / f"{dest.name}.part.{num_channels}.{index}.{start}_{end}"`
    Ensure that `num_channels`, `start`, and `end` are passed to `download_segment` so it can compute this name.
  - In `download_parallel`, update the paths when creating/merging segments and when deleting them to match this new naming convention.

### 3. Urllib Fallback / Range Request Server Compatibility Risks
- **Problem**: If the server returns status 200 instead of 206 inside `download_segment`, the thread will write with `mode = "wb"` and download the entire file instead of just the segment.
- **Solution**:
  In `download_segment`, if `resp.status != 206`, fail immediately:
  ```python
  if resp.status != 206:
      return False
  ```
  This will fail the parallel download and correctly trigger the single-channel streaming fallback in `download_file`.

### 4. Weak Validation for Non-Model Config Files
- **Problem**: Configuration JSON files are not validated and could be truncated or corrupted.
- **Solution**:
  In `validate_file` in `ai-service/tools/download_cooperative_hf_model.py`, if the filename ends with `.json`, read and parse it using `json.load(f)`. If it fails, unlink/delete it and return `False`.

### 5. Verification
- Implement/update python unit tests in `ai-service/tests/test_model_downloads.py` or Node tests in `scripts/path-governance-late-phases.test.ts` if needed to cover these fixes.
- Run `npm run typecheck`
- Run `npm run build`
- Run `npm run ci:governance`
- Run `npm run test-python-unittest`
- Ensure all tests pass.

⚠️ MANDATORY INTEGRITY WARNING: DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work.
