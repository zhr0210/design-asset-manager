import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { validOfficialModelCatalogReleaseInput } from
  './fixtures/official-model-catalog-release.fixture'

const taskRoot = await fs.mkdtemp(path.join(
  os.tmpdir(),
  'dam-official-catalog-release-safety-'
))
const trustRootFile = path.join(taskRoot, 'trust-root.json')
const bundleFile = path.join(taskRoot, 'bundle.json')
await fs.writeFile(
  trustRootFile,
  JSON.stringify(validOfficialModelCatalogReleaseInput.pinnedTrustRoot)
)
await fs.writeFile(
  bundleFile,
  JSON.stringify(validOfficialModelCatalogReleaseInput.bundledCatalog)
)

try {
  const existingOutput = path.join(taskRoot, 'existing.json')
  await fs.writeFile(existingOutput, 'preserve-me')
  assertBlocked(run([
    `--trust-root=${trustRootFile}`,
    `--bundle=${bundleFile}`,
    `--output=${existingOutput}`
  ]), 'OUTPUT_EXISTS')
  assert.equal(await fs.readFile(existingOutput, 'utf8'), 'preserve-me')

  const checkedInInput = path.resolve(
    'src/main/model-library-workspace/official-model-catalog.release-input.json'
  )
  const checkedInBefore = await fs.readFile(checkedInInput, 'utf8')
  assertBlocked(run([
    `--trust-root=${trustRootFile}`,
    `--bundle=${bundleFile}`,
    `--output=${checkedInInput}`
  ]), 'OUTPUT_RESERVED')
  assert.equal(await fs.readFile(checkedInInput, 'utf8'), checkedInBefore)

  const invalidJson = path.join(taskRoot, 'invalid.json')
  await fs.writeFile(invalidJson, '{')
  const invalidOutput = path.join(taskRoot, 'invalid-output.json')
  assertBlocked(run([
    `--trust-root=${invalidJson}`,
    `--bundle=${bundleFile}`,
    `--output=${invalidOutput}`
  ]), 'TRUST_ROOT_INPUT_INVALID')
  await assertAbsent(invalidOutput)

  const oversized = path.join(taskRoot, 'oversized.json')
  await fs.writeFile(oversized, ' '.repeat(64 * 1024 + 1))
  const oversizedOutput = path.join(taskRoot, 'oversized-output.json')
  assertBlocked(run([
    `--trust-root=${oversized}`,
    `--bundle=${bundleFile}`,
    `--output=${oversizedOutput}`
  ]), 'TRUST_ROOT_INPUT_INVALID')
  await assertAbsent(oversizedOutput)

  const parentFile = path.join(taskRoot, 'not-a-directory')
  await fs.writeFile(parentFile, 'ordinary-file')
  assertBlocked(run([
    `--trust-root=${trustRootFile}`,
    `--bundle=${bundleFile}`,
    `--output=${path.join(parentFile, 'candidate.json')}`
  ]), 'OUTPUT_PARENT_UNSAFE')

  assertBlocked(run([
    `--trust-root=${trustRootFile}`,
    `--bundle=${bundleFile}`,
    `--output=${path.join(taskRoot, 'unknown-arg-output.json')}`,
    '--unexpected=value'
  ]), 'ARGUMENT_INVALID')

  const symlink = path.join(taskRoot, 'trust-root-link.json')
  try {
    await fs.symlink(trustRootFile, symlink)
    const symlinkOutput = path.join(taskRoot, 'symlink-output.json')
    assertBlocked(run([
      `--trust-root=${symlink}`,
      `--bundle=${bundleFile}`,
      `--output=${symlinkOutput}`
    ]), 'TRUST_ROOT_INPUT_INVALID')
    await assertAbsent(symlinkOutput)

    const realOutputParent = path.join(taskRoot, 'real-output-parent')
    const linkedOutputParent = path.join(taskRoot, 'linked-output-parent')
    await fs.mkdir(realOutputParent)
    await fs.symlink(realOutputParent, linkedOutputParent)
    assertBlocked(run([
      `--trust-root=${trustRootFile}`,
      `--bundle=${bundleFile}`,
      `--output=${path.join(linkedOutputParent, 'candidate.json')}`
    ]), 'OUTPUT_PARENT_UNSAFE')
    await assertAbsent(path.join(realOutputParent, 'candidate.json'))
  } catch (error) {
    if (!hasErrorCode(error, 'EPERM') && !hasErrorCode(error, 'EACCES')) {
      throw error
    }
  }
} finally {
  await fs.rm(taskRoot, { recursive: true, force: true })
}

console.log('official-model-catalog-release-preparation-safety passed')

function run(args: string[]) {
  return spawnSync(process.execPath, [
    'scripts/prepare-official-model-catalog-release-input.mjs',
    ...args
  ], {
    cwd: process.cwd(),
    encoding: 'utf8'
  })
}

function assertBlocked(
  result: ReturnType<typeof run>,
  reason: string
): void {
  assert.equal(result.status, 1, result.stderr)
  assert.deepEqual(JSON.parse(result.stdout), {
    schemaVersion: 1,
    source: 'official-model-catalog-release-preparation',
    state: 'blocked',
    reason,
    candidateWritten: false
  })
  assert.equal(result.stdout.includes(taskRoot), false)
  assert.equal(result.stderr.includes(taskRoot), false)
}

async function assertAbsent(target: string): Promise<void> {
  await assert.rejects(fs.lstat(target), (error: unknown) =>
    hasErrorCode(error, 'ENOENT')
  )
}

function hasErrorCode(value: unknown, code: string): boolean {
  return value !== null &&
    typeof value === 'object' &&
    'code' in value &&
    value.code === code
}
