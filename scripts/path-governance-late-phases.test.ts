import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { createAssetLibraryPathGovernanceReport } from '../src/main/path-migration/asset-library-path-governance'
import { createDownloadPathDryRunPlan, sanitizeDownloadFilename } from '../src/main/path-migration/download-path-governance'
import { createMediaPathGovernancePlan } from '../src/main/path-migration/media-path-governance'

const assetReport = createAssetLibraryPathGovernanceReport([
  { assetId: 'asset-1', filePath: path.join('library', 'a.png') },
  { assetId: 'asset-2', filePath: '' }
])
assert.equal(assetReport.phase, '14A')
assert.equal(assetReport.dryRunOnly, true)
assert.equal(assetReport.autoMoveFiles, false)
assert.equal(assetReport.autoDeleteFiles, false)
assert.equal(assetReport.autoUpdateFilePath, false)
assert.equal(assetReport.missingFileReportShape[0].existenceCheckDeferred, true)
assert.equal(assetReport.remapSuggestions[1].suggestedAction, 'skip-empty-path')

assert.equal(sanitizeDownloadFilename('bad:name?.png'), 'bad_name_.png')
const downloadPlan = createDownloadPathDryRunPlan({
  downloadsRoot: path.join('workspace', 'downloads'),
  requestedFilename: 'bad:name?.png',
  existingFilenames: ['bad_name_.png']
})
assert.equal(downloadPlan.phase, '14B')
assert.equal(downloadPlan.dryRunOnly, true)
assert.equal(downloadPlan.autoModifyDownloadQueue, false)
assert.equal(downloadPlan.sanitizedFilename, 'bad_name_-2.png')
assert.equal(downloadPlan.duplicateStrategy, 'append-counter')

const mediaPlan = createMediaPathGovernancePlan('thumbnail', 'asset-1', 'thumb.jpg', 'legacy-thumb.jpg')
assert.equal(mediaPlan.phase, '14C')
assert.equal(mediaPlan.regenerateFiles, false)
assert.equal(mediaPlan.moveLegacyFiles, false)
assert.equal(mediaPlan.legacyPathFallback, true)
assert.equal(mediaPlan.reference.cacheRootId, 'managed-cache')
assert.equal(mediaPlan.reference.relativePath, 'thumbnail/asset-1/thumb.jpg')

for (const file of [
  '.codeindex/asset-library-path-governance.json',
  '.codeindex/download-path-governance.json',
  '.codeindex/media-path-governance.json'
]) {
  const manifest = JSON.parse(await fs.readFile(file, 'utf8')) as { privacy?: { containsRealAssetPaths?: boolean } }
  assert.equal(manifest.privacy?.containsRealAssetPaths, false)
}

for (const file of [
  'src/main/path-migration/asset-library-path-governance.ts',
  'src/main/path-migration/download-path-governance.ts',
  'src/main/path-migration/media-path-governance.ts'
]) {
  const source = await fs.readFile(file, 'utf8')
  assert.doesNotMatch(source, /better-sqlite3|SELECT\s|UPDATE\s|INSERT\s|DELETE\s|fs\.|existsSync|readFile|writeFile|rename|unlink/i)
  assert.doesNotMatch(source, /C:\\Users\\[A-Za-z0-9_.-]+/i)
}

for (const file of [
  'docs/platform/ASSET_LIBRARY_PATH_GOVERNANCE.md',
  'docs/platform/DOWNLOAD_PATH_GOVERNANCE.md',
  'docs/platform/MEDIA_PATH_GOVERNANCE.md'
]) {
  const doc = await fs.readFile(file, 'utf8')
  assert.doesNotMatch(doc, /C:\\Users\\[A-Za-z0-9_.-]+/i)
}

// ==========================================
// Phase 16: PathMigrationExecutor Test Suite
// ==========================================
import Database from 'better-sqlite3'
import { existsSync } from 'node:fs'
import { PathMigrationExecutor } from '../src/main/path-migration/path-migration-executor'
import type { ManagedPaths } from '../src/shared/types/platform.types'
import { getDatabase, setDatabase } from '../src/main/db/index'

async function runPathMigrationExecutorTests() {
  console.log('Running PathMigrationExecutor tests...')
  const testTempDir = path.join(process.cwd(), 'dist-temp', 'test-migration-' + Date.now())
  await fs.mkdir(testTempDir, { recursive: true })

  const dbFile = path.join(testTempDir, 'test.db')
  const testDb = new Database(dbFile)
  setDatabase(testDb)
  assert.equal(getDatabase(), testDb)

  testDb.prepare(`
    CREATE TABLE assets (
      id TEXT PRIMARY KEY,
      title TEXT,
      file_name TEXT,
      file_path TEXT,
      thumbnail_path TEXT,
      normalized_path TEXT,
      source_site_id TEXT,
      source_site_name TEXT,
      created_at TEXT,
      updated_at TEXT
    )
  `).run()

  const asset1Id = 'asset-mig-1'
  const asset2Id = 'asset-mig-2'

  const sourceTempDir = path.join(testTempDir, 'source-files')
  await fs.mkdir(sourceTempDir, { recursive: true })

  const thumbFile1 = path.join(sourceTempDir, 'thumb1.webp')
  const normFile1 = path.join(sourceTempDir, 'norm1.jpg')
  await fs.writeFile(thumbFile1, 'thumb1 data')
  await fs.writeFile(normFile1, 'norm1 data')

  testDb.prepare(`
    INSERT INTO assets (id, title, file_name, file_path, thumbnail_path, normalized_path, source_site_id, source_site_name, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(asset1Id, 'Asset 1', 'asset1.png', 'path1', thumbFile1, normFile1, 'site1', 'Site 1', 'now', 'now')

  testDb.prepare(`
    INSERT INTO assets (id, title, file_name, file_path, thumbnail_path, normalized_path, source_site_id, source_site_name, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(asset2Id, 'Asset 2', 'asset2.png', 'path2', 'cache://thumbnail/asset-mig-2/thumb2.webp', '', 'site1', 'Site 1', 'now', 'now')

  const testManagedPaths: ManagedPaths = {
    userDataDir: path.join(testTempDir, 'user-data'),
    configDir: path.join(testTempDir, 'config'),
    databaseDir: path.join(testTempDir, 'database'),
    logsDir: path.join(testTempDir, 'logs'),
    cacheDir: path.join(testTempDir, 'cache'),
    runtimeDir: path.join(testTempDir, 'runtime'),
    modelsDir: path.join(testTempDir, 'models'),
    tempDir: path.join(testTempDir, 'temp'),
    downloadsDir: path.join(testTempDir, 'downloads')
  }

  await fs.mkdir(testManagedPaths.userDataDir, { recursive: true })
  await fs.mkdir(testManagedPaths.tempDir, { recursive: true })
  await fs.mkdir(testManagedPaths.cacheDir, { recursive: true })

  // 1. Test Successful Migration
  const executor = new PathMigrationExecutor(testDb, testManagedPaths)
  const result = await executor.executeMigration({ deleteLegacyFiles: false })

  assert.equal(result.success, true)
  assert.equal(result.migratedCount, 1)

  const updatedAsset = testDb.prepare('SELECT thumbnail_path, normalized_path FROM assets WHERE id = ?').get(asset1Id) as { thumbnail_path: string, normalized_path: string }
  assert.equal(updatedAsset.thumbnail_path, `cache://thumbnail/${asset1Id}/thumb1.webp`)
  assert.equal(updatedAsset.normalized_path, `cache://normalized-image/${asset1Id}/norm1.jpg`)

  const destThumb = path.join(testManagedPaths.cacheDir, 'thumbnail', asset1Id, 'thumb1.webp')
  const destNorm = path.join(testManagedPaths.cacheDir, 'normalized-image', asset1Id, 'norm1.jpg')
  assert.ok(existsSync(destThumb))
  assert.ok(existsSync(destNorm))
  assert.equal(await fs.readFile(destThumb, 'utf8'), 'thumb1 data')
  assert.equal(await fs.readFile(destNorm, 'utf8'), 'norm1 data')

  // Legacy files should still exist since deleteLegacyFiles was false
  assert.ok(existsSync(thumbFile1))
  assert.ok(existsSync(normFile1))

  const journal = executor.getJournal()
  assert.equal(journal.status, 'completed')
  assert.equal(journal.copiedFiles.length, 2)

  // 2. Test Rollback behavior
  // Re-insert unmigrated paths
  testDb.prepare('UPDATE assets SET thumbnail_path = ?, normalized_path = ? WHERE id = ?').run(thumbFile1, normFile1, asset1Id)

  // Insert asset with missing files to trigger error
  const asset3Id = 'asset-mig-3'
  testDb.prepare(`
    INSERT INTO assets (id, title, file_name, file_path, thumbnail_path, normalized_path, source_site_id, source_site_name, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(asset3Id, 'Asset 3', 'asset3.png', 'path3', 'missing_thumb.webp', '', 'site1', 'Site 1', 'now', 'now')

  // Run migration again, it should fail and rollback
  const executor2 = new PathMigrationExecutor(testDb, testManagedPaths)
  await assert.rejects(async () => {
    await executor2.executeMigration()
  })

  // Verify DB restored to backup state (unmigrated)
  const rolledBackAsset = executor2.getDb().prepare('SELECT thumbnail_path, normalized_path FROM assets WHERE id = ?').get(asset1Id) as { thumbnail_path: string, normalized_path: string }
  assert.equal(rolledBackAsset.thumbnail_path, thumbFile1)
  assert.equal(rolledBackAsset.normalized_path, normFile1)

  // Verify that getDatabase() now returns the new rolled back db connection
  assert.equal(getDatabase(), executor2.getDb())
  assert.notEqual(getDatabase(), testDb)

  // Verify copied files deleted from cache directory
  assert.ok(!existsSync(destThumb))
  assert.ok(!existsSync(destNorm))

  const journal2 = executor2.getJournal()
  assert.equal(journal2.status, 'failed')

  // Clean up
  executor2.getDb().close()
  await fs.rm(testTempDir, { recursive: true, force: true })
  console.log('PathMigrationExecutor tests passed successfully!')
}

await runPathMigrationExecutorTests()

const pathGovernanceIpcSource = await fs.readFile('src/main/ipc/path-governance.ipc.ts', 'utf8')
const preloadSource = await fs.readFile('src/preload/index.ts', 'utf8')
assert.doesNotMatch(pathGovernanceIpcSource, /assets:apply-path-migration|PathMigrationExecutor/)
assert.doesNotMatch(preloadSource, /assets:apply-path-migration|applyPathMigration/)
