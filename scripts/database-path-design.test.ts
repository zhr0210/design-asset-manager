import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import {
  createDatabasePathRemapDryRun,
  createLibraryPathRoot,
  createLibraryRelativePath
} from '../src/main/path-migration/database-path-design'

const root = path.join('workspace', 'library')
const insidePath = path.join(root, 'images', 'asset.png')
const outsidePath = path.join('workspace', 'other', 'asset.png')

const pathRoot = createLibraryPathRoot(root)
assert.equal(pathRoot.id, 'library')
assert.equal(pathRoot.userManaged, true)
assert.equal(pathRoot.migratable, true)

const relative = createLibraryRelativePath(insidePath, root)
assert.equal(relative.pathRootId, 'library')
assert.equal(relative.relativePath, 'images/asset.png')
assert.equal(relative.portablePath, 'library://images/asset.png')
assert.equal(relative.legacyAbsolutePath, insidePath)

const fallback = createLibraryRelativePath(outsidePath, root)
assert.equal(fallback.pathRootId, 'legacy-absolute')
assert.equal(fallback.relativePath, null)
assert.equal(fallback.legacyAbsolutePath, outsidePath)
assert.ok(fallback.warnings.some((warning) => warning.includes('outside')))

const dryRun = createDatabasePathRemapDryRun([
  { id: 'asset-1', table: 'assets', field: 'file_path', value: insidePath },
  { id: 'asset-2', table: 'assets', field: 'thumbnail_path', value: outsidePath },
  { id: 'task-1', table: 'ai_tag_tasks', field: 'file_path', value: '' }
], root)
assert.equal(dryRun.phase, '13A')
assert.equal(dryRun.schemaChange, false)
assert.equal(dryRun.dataMigration, false)
assert.equal(dryRun.summary.total, 3)
assert.equal(dryRun.summary.mapped, 1)
assert.equal(dryRun.summary.legacyFallback, 1)
assert.equal(dryRun.summary.skipped, 1)

const manifest = JSON.parse(await fs.readFile('.codeindex/database-path-design.json', 'utf8')) as {
  schemaChange?: boolean
  dataMigration?: boolean
  runtimeDatabaseRead?: boolean
  dryRunOnly?: boolean
  privacy?: { containsRealAssetPaths?: boolean }
}
assert.equal(manifest.schemaChange, false)
assert.equal(manifest.dataMigration, false)
assert.equal(manifest.runtimeDatabaseRead, false)
assert.equal(manifest.dryRunOnly, true)
assert.equal(manifest.privacy?.containsRealAssetPaths, false)

const source = await fs.readFile('src/main/path-migration/database-path-design.ts', 'utf8')
assert.doesNotMatch(source, /better-sqlite3|SELECT\s|UPDATE\s|INSERT\s|DELETE\s|fs\.|existsSync|readFile|writeFile/i)
assert.doesNotMatch(source, /C:\\Users\\[A-Za-z0-9_.-]+/i)

const schema = await fs.readFile('src/main/db/schema.ts', 'utf8')
assert.doesNotMatch(schema, /pathRootId|path_root_id/)

const doc = await fs.readFile('docs/platform/DATABASE_PATH_DESIGN.md', 'utf8')
assert.match(doc, /schemaChange: false/)
assert.match(doc, /Phase 13B/)
assert.doesNotMatch(doc, /C:\\Users\\[A-Za-z0-9_.-]+/i)
