import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { createDatabasePathRemapDryRun } from '../src/main/path-migration/database-path-design'
import { createDatabasePathMigrationPlan } from '../src/main/path-migration/database-path-migration-plan'

const root = path.join('workspace', 'library')
const dryRun = createDatabasePathRemapDryRun([
  { id: 'asset-1', table: 'assets', field: 'file_path', value: path.join(root, 'a.png') },
  { id: 'asset-2', table: 'assets', field: 'file_path', value: path.join('workspace', 'external', 'b.png') }
], root)

const plan = createDatabasePathMigrationPlan(dryRun)
assert.equal(plan.phase, '13B')
assert.equal(plan.applyEnabled, false)
assert.equal(plan.rollbackEnabled, false)
assert.equal(plan.schemaChangeIncluded, false)
assert.equal(plan.dataWriteIncluded, false)
assert.equal(plan.gates.backupRequired, true)
assert.equal(plan.gates.dryRunRequired, true)
assert.equal(plan.gates.sampleDatabaseTestRequired, true)
assert.equal(plan.gates.rollbackRequired, true)
assert.equal(plan.gates.userConfirmationRequired, true)
assert.equal(plan.gates.noAutoMigration, true)
assert.equal(plan.gates.oldPathFallback, true)
assert.equal(plan.backupPlan.destination, '<managed-backup-dir>')
assert.equal(plan.sampleDatabaseTestPlan.usesRuntimeDatabase, false)
assert.ok(plan.warnings.some((warning) => warning.includes('fallback')))

const manifest = JSON.parse(await fs.readFile('.codeindex/database-path-migration-plan.json', 'utf8')) as {
  backupRequired?: boolean
  applyEnabled?: boolean
  schemaChangeIncluded?: boolean
  dataWriteIncluded?: boolean
  runtimeDatabaseRead?: boolean
  privacy?: { containsRuntimeDatabaseContents?: boolean }
}
assert.equal(manifest.backupRequired, true)
assert.equal(manifest.applyEnabled, false)
assert.equal(manifest.schemaChangeIncluded, false)
assert.equal(manifest.dataWriteIncluded, false)
assert.equal(manifest.runtimeDatabaseRead, false)
assert.equal(manifest.privacy?.containsRuntimeDatabaseContents, false)

const source = await fs.readFile('src/main/path-migration/database-path-migration-plan.ts', 'utf8')
assert.doesNotMatch(source, /better-sqlite3|SELECT\s|UPDATE\s|INSERT\s|DELETE\s|fs\.|existsSync|readFile|writeFile/i)
assert.doesNotMatch(source, /C:\\Users\\[A-Za-z0-9_.-]+/i)

const doc = await fs.readFile('docs/platform/DATABASE_PATH_MIGRATION_PLAN.md', 'utf8')
assert.match(doc, /applyEnabled: false/)
assert.match(doc, /Phase 14A/)
assert.doesNotMatch(doc, /C:\\Users\\[A-Za-z0-9_.-]+/i)
