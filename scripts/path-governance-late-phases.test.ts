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
