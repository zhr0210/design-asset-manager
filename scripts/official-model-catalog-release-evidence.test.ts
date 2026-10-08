import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const taskRoot = await fs.mkdtemp(path.join(
  os.tmpdir(),
  'dam-official-catalog-release-evidence-'
))
const output = path.join(taskRoot, 'evidence.json')

try {
  const result = spawnSync(process.execPath, [
    'scripts/write-official-model-catalog-release-evidence.mjs',
    '--platform=windows',
    '--arch=x64',
    `--output=${output}`
  ], {
    cwd: process.cwd(),
    encoding: 'utf8'
  })
  assert.equal(result.status, 1, result.stderr)
  const evidence = JSON.parse(await fs.readFile(output, 'utf8'))
  assert.deepEqual(evidence, {
    schemaVersion: 1,
    source: 'official-model-catalog-release-gate',
    platform: 'windows',
    arch: 'x64',
    status: 'failed',
    evaluation: {
      schemaVersion: 1,
      state: 'blocked',
      reason: 'RELEASE_INPUT_MISSING',
      candidateAllowed: false,
      readsSigningSecrets: false,
      usesNetwork: false,
      readsModelBytes: false,
      containsSensitiveMaterial: false
    }
  })
  assert.deepEqual(JSON.parse(result.stdout), evidence)
  assert.equal(result.stdout.includes(taskRoot), false)
  assert.equal(result.stderr.includes(taskRoot), false)
  assert.doesNotMatch(
    JSON.stringify(evidence),
    /path|directory|url|signature|digest|publicKey|artifact|modelName/i
  )
} finally {
  await fs.rm(taskRoot, { recursive: true, force: true })
}

console.log('official-model-catalog-release-evidence passed')
