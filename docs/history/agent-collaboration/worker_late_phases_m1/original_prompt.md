## 2026-06-08T07:22:34Z
You are a worker tasked with implementing the path migration IPC channels and frontend Settings UI on macOS.

Working directory: <DAM_WORKSPACE>/.agents/worker_late_phases_m1/

Please perform the following tasks:

1. Edit `src/main/ipc/path-governance.ipc.ts`:
   - Register `assets:path-migration-report` IPC handler:
     - Fetch all assets from DB (`SELECT id, thumbnail_path, normalized_path FROM assets`).
     - Check which assets need migration (i.e. those with a thumbnail_path or normalized_path that do not start with `cache://`).
     - For each path to migrate:
       - Check existence of source file using `ImageMetadataService.resolvePath(filePath)`.
       - If not exists, check fallback path: `path.join(homedir(), 'DesignAssetManager', 'library', 'thumbnails' | 'normalized', path.basename(filePath))`.
       - If neither exists, record it as a missing file.
       - Identify proposed mappings (original -> `cache://thumbnail/...` or `cache://normalized-image/...`).
       - Check if destination file in `cacheDir` already exists. If yes, mark as collision.
     - Return a structured response:
       ```typescript
       {
         success: boolean;
         report?: {
           affectedRows: number;
           missingFiles: Array<{ assetId: string; filePath: string }>;
           proposedMappings: Array<{ original: string; proposed: string; isCollision: boolean }>;
           collisions: Array<{ filePath: string; conflictingAssetId: string }>;
         };
         error?: string;
       }
       ```
   - Register `assets:apply-path-migration` IPC handler:
     - Instantiate `PathMigrationExecutor` (pass DB connection and `resolveManagedPaths()`).
     - Invoke `executeMigration({ deleteLegacyFiles: options?.deleteLegacyFiles })`.
     - Return `{ success: true, migratedCount: res.migratedCount }` or `{ success: false, error: err.message }` on error.

2. Edit `src/preload/index.ts`:
   - Expose `applyPathMigration` and `getPathMigrationReport` under `electronAPI` window object:
     - `applyPathMigration: (options?: { deleteLegacyFiles?: boolean }) => ipcRenderer.invoke('assets:apply-path-migration', options)`
     - `getPathMigrationReport: () => ipcRenderer.invoke('assets:path-migration-report')`

3. Create `src/renderer/components/settings/PathMigrationPanel.tsx`:
   - Implement the path migration UI. It should:
     - Allow scanning/dry-run by invoking `getPathMigrationReport`.
     - Show:
       - Affected rows (number of assets needing migration)
       - Missing physical files (count and detailed list if present)
       - Proposed path mappings (collapsible details panel showing original -> proposed cache path)
       - Collisions (count and list of files already in cacheDir)
     - Allow executing the migration by invoking `applyPathMigration({ deleteLegacyFiles })` after confirmation.
     - Include a checkbox for `deleteLegacyFiles`.
     - Display a dynamic progress log/console during migration (simulated or real steps: backup database, copy files, update database paths, complete/fail).
     - Handle errors gracefully, explaining that rollback was executed successfully if the migration throws.

4. Edit `src/renderer/routes/Settings.tsx`:
   - Import and render `<PathMigrationPanel />` directly below `<DoctorPanel />`.

5. Edit `scripts/path-governance-late-phases.test.ts`:
   - Change lines 208-209 from `assert.doesNotMatch` to `assert.match` to verify presence of path migration IPC channels and preload mappings.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

After doing all edits:
- Run `npm run typecheck` to verify TypeScript compile success.
- Run `npm run build` to verify build success.
- Run `node scripts/run-ts-test.mjs scripts/path-governance-late-phases.test.ts` to verify path governance tests.

Write a complete handoff report detailing your changes, verification results, and any warnings to `handoff.md` in your working directory. Then report back when complete.
