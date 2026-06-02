import assert from 'node:assert/strict'
import fs from 'node:fs/promises'

const commonScript = await fs.readFile('scripts/verify-platform-common.mjs', 'utf8')
const winScript = await fs.readFile('scripts/verify-platform-win.cmd', 'utf8')
const macScript = await fs.readFile('scripts/verify-platform-mac.sh', 'utf8')
const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8')) as {
  scripts?: Record<string, string>
}
const ciDocs = [
  await fs.readFile('docs/platform/CI_MATRIX.md', 'utf8'),
  await fs.readFile('docs/platform/CI_HYGIENE.md', 'utf8')
].join('\n')

for (const requiredScript of [
  'verify:platform',
  'verify:platform:win',
  'verify:platform:mac',
  'verify:platform:clean',
  'test-verify-platform-scripts'
]) {
  assert.ok(packageJson.scripts?.[requiredScript], `Missing npm script: ${requiredScript}`)
}

assert.match(commonScript, /ci:governance/)
assert.match(commonScript, /typecheck/)
assert.match(commonScript, /build/)
assert.match(commonScript, /npmCommand/)
assert.match(commonScript, /shell: true/)
assert.match(commonScript, /--clean/)
assert.match(commonScript, /DAM_DISABLE_MODEL_DOWNLOADS/)
assert.match(commonScript, /DAM_DISABLE_RUNTIME_DOWNLOADS/)
assert.match(commonScript, /DAM_DISABLE_REAL_AI_WORKER/)
assert.match(commonScript, /DAM_DISABLE_EXTERNAL_INFERENCE/)
assert.doesNotMatch(packageJson.scripts?.['verify:platform'] ?? '', /--clean/)
assert.match(packageJson.scripts?.['verify:platform:clean'] ?? '', /--clean/)

assert.match(winScript, /verify-platform-common\.mjs/)
assert.match(winScript, /--platform=windows/)
assert.match(macScript, /verify-platform-common\.mjs/)
assert.match(macScript, /--platform=macos/)

assert.doesNotMatch(commonScript, /\b(cuda|notarize|publish|release|pip install|python -m pip|curl|wget)\b/i)
assert.match(ciDocs, /ci:hygiene/)
