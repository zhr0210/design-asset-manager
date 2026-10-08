# Handoff Report — worker_remediation_p16

## 1. Observation
We observed four correctness and robustness issues during verification of database rollback, model downloads, and configuration validation:
- In `src/main/path-migration/path-migration-executor.ts` (inside `rollbackMigration()`), the code performs database re-initialization:
  ```typescript
  this.db = new Database(dbPath)
  ```
  However, the global/module-scoped `db` variable in `src/main/db/index.ts` was left pointing to the closed database instance, which breaks any subsequent query using `getDatabase()`.
- In `ai-service/tools/download_cooperative_hf_model.py`, segment files were named using the scheme `{dest.name}.part.{index}`. If a download resumed with a different channel/thread count, segment offsets differed but used the same names, leading to silent data corruption.
- In `ai-service/tools/download_cooperative_hf_model.py` (inside `download_segment`), when a parallel range request was sent, if the server returned status `200` instead of `206`, the worker continued downloading the entire file with mode `wb` inside a thread instead of failing immediately and falling back.
- In `ai-service/tools/download_cooperative_hf_model.py` (inside `validate_file`), configuration JSON files (e.g., `config.json`) were not validated for integrity and correctness, potentially allowing truncated/corrupted files to pass as complete.

During verification:
- `python3 -m unittest discover ai-service/tests` was run, failing `test_parallel_downloading_segmented` and `test_validate_file` before remediation with `AssertionError`.
- `node scripts/run-ts-test.mjs scripts/path-governance-late-phases.test.ts` was run and passed.

## 2. Logic Chain
We reasoned step-by-step to address each issue:
- **SQLite Database Severing**:
  1. We added and exported `setDatabase(newDb)` inside `src/main/db/index.ts` to assign the module-scoped `db` variable to `newDb`.
  2. We updated `rollbackMigration()` in `src/main/path-migration/path-migration-executor.ts` to call `setDatabase(this.db)` right after `this.db = new Database(dbPath)`.
  3. We verified this by updating `scripts/path-governance-late-phases.test.ts` to ensure `getDatabase()` correctly matches the updated instance after a rollback occurs.
- **Downloader Resume Corruptibility**:
  1. We changed `download_segment` to generate a segment filename using `num_channels`, `index`, and bounds: `{dest.name}.part.{num_channels}.{index}.{start}_{end}`.
  2. We passed `num_channels`, `start`, and `end` offsets from `download_parallel` to `download_segment`.
  3. In `download_parallel`, we updated both the merge loop and deletion cleanup to target this new format.
- **Urllib Fallback / Range Request Risks**:
  1. In `download_segment`, we checked if `resp.status != 206`. If so, we immediately return `False` rather than silently downloading the full file inside a segment thread.
- **Weak Validation for Non-Model Config Files**:
  1. In `validate_file`, we added a check for files ending with `.json`.
  2. We read and parse it using `json.load(f)`. If JSON parsing throws an error, the file is unlinked, and `validate_file` returns `False`.
  3. We updated the tests in `ai-service/tests/test_model_downloads.py` to ensure mock JSON files satisfy both the size constraint (>=100 bytes) and valid/invalid JSON structures, ensuring accurate coverage.

## 3. Caveats
- No caveats. We verified both python unit tests and node governance integration tests, and both are fully functional.

## 4. Conclusion
We successfully addressed all four correctness and robustness issues. All changes follow the minimum change principle and conform to the project structure and guidelines.

## 5. Verification Method
To verify all changes independently, run the following suite:
1. **Python Unit Tests**:
   ```bash
   python3 -m unittest discover ai-service/tests
   ```
2. **Node Governance Tests**:
   ```bash
   node scripts/run-ts-test.mjs scripts/path-governance-late-phases.test.ts
   npm run ci:governance
   ```
3. **Build and Typechecks**:
   ```bash
   npm run typecheck
   npm run build
   ```
