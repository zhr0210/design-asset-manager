import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { validOfficialModelCatalogReleaseInput } from
  './fixtures/official-model-catalog-release.fixture'

const taskRoot = await fs.mkdtemp(path.join(
  os.tmpdir(),
  'dam-official-catalog-release-preparation-'
))
const trustRootFile = path.join(taskRoot, 'publisher-trust-root.json')
const bundleFile = path.join(taskRoot, 'signed-catalog-bundle.json')
const outputFile = path.join(taskRoot, 'candidate-release-input.json')
const checkedInFile = path.resolve(
  'src/main/model-library-workspace/official-model-catalog.release-input.json'
)
const checkedInBefore = await fs.readFile(checkedInFile, 'utf8')

try {
  await fs.writeFile(
    trustRootFile,
    JSON.stringify(validOfficialModelCatalogReleaseInput.pinnedTrustRoot)
  )
  await fs.writeFile(
    bundleFile,
    JSON.stringify(validOfficialModelCatalogReleaseInput.bundledCatalog)
  )
  const result = spawnSync(process.execPath, [
    'scripts/prepare-official-model-catalog-release-input.mjs',
    `--trust-root=${trustRootFile}`,
    `--bundle=${bundleFile}`,
    `--output=${outputFile}`
  ], {
    cwd: process.cwd(),
    encoding: 'utf8'
  })
  assert.equal(result.status, 0, result.stderr)
  assert.deepEqual(
    JSON.parse(await fs.readFile(outputFile, 'utf8')),
    validOfficialModelCatalogReleaseInput
  )
  const summary = JSON.parse(result.stdout)
  assert.deepEqual(summary, {
    schemaVersion: 1,
    source: 'official-model-catalog-release-preparation',
    state: 'ready',
    catalogId: 'official-model-catalog',
    sequence: '42',
    familyCount: 1,
    checkpointCount: 1,
    variantCount: 1,
    candidateWritten: true
  })
  assert.equal(result.stdout.includes(taskRoot), false)
  assert.equal(result.stderr.includes(taskRoot), false)
  assert.doesNotMatch(
    JSON.stringify(summary),
    /qwen|path|directory|url|signature|digest|publicKey|artifact|modelName/i
  )
  assert.equal(await fs.readFile(checkedInFile, 'utf8'), checkedInBefore)
} finally {
  await fs.rm(taskRoot, { recursive: true, force: true })
}

console.log('official-model-catalog-release-preparation-cli passed')
