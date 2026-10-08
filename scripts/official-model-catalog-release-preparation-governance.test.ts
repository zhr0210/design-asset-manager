import assert from 'node:assert/strict'
import fs from 'node:fs/promises'

const moduleSource = await fs.readFile(
  'src/main/model-library-workspace/official-model-catalog-release-preparation.ts',
  'utf8'
)
const cliSource = await fs.readFile(
  'scripts/prepare-official-model-catalog-release-input.ts',
  'utf8'
)
const wrapperSource = await fs.readFile(
  'scripts/prepare-official-model-catalog-release-input.mjs',
  'utf8'
)
const checkedInInput = JSON.parse(await fs.readFile(
  'src/main/model-library-workspace/official-model-catalog.release-input.json',
  'utf8'
))

assert.match(moduleSource, /export function prepareOfficialModelCatalogReleaseInput/)
assert.match(moduleSource, /evaluateOfficialModelCatalogRelease/)
assert.doesNotMatch(
  `${moduleSource}\n${cliSource}\n${wrapperSource}`,
  /generateKeyPair|createPrivateKey|privateKey|BEGIN (?:RSA|PRIVATE KEY)|\bfetch\s*\(|from ['"](?:node:)?(?:http|https|net|tls|child_process|worker_threads)['"]|ai-service|runtime-package|services\/ai-models/i
)
assert.doesNotMatch(
  cliSource,
  /process\.env|console\.(?:error|warn)|recursive:\s*true/
)
assert.match(cliSource, /RESERVED_RELEASE_INPUT_FILE_NAME/)
assert.match(cliSource, /fs\.open\(target, 'wx', 0o600\)/)
assert.match(cliSource, /MAX_TRUST_ROOT_BYTES/)
assert.match(cliSource, /MAX_CATALOG_BUNDLE_BYTES/)
assert.match(cliSource, /before\.isSymbolicLink\(\)/)
assert.match(cliSource, /sameFile\(before, opened\)/)
const writeBody = cliSource.match(
  /async function writeNewCandidate[\s\S]*?\n}\n\nasync function outputBindingStillHeld/
)?.[0] ?? ''
assert.notEqual(writeBody, '')
assert.ok(
  writeBody.indexOf('outputBindingStillHeld') <
    writeBody.indexOf('handle.writeFile'),
  'Parent and owned-file identity must be rebound after wx and before content write.'
)
assert.deepEqual(checkedInInput, {
  schemaVersion: 1,
  pinnedTrustRoot: null,
  bundledCatalog: null
})

console.log('official-model-catalog-release-preparation-governance passed')
