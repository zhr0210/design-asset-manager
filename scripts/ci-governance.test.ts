import assert from 'node:assert/strict'
import fs from 'node:fs/promises'

const workflowPath = '.github/workflows/cross-platform-governance.yml'
const ciDocPath = 'docs/platform/CI_MATRIX.md'
const doctorCiPath = 'scripts/doctor-ci-check.mjs'
const packageJsonPath = 'package.json'

const workflow = await fs.readFile(workflowPath, 'utf8')
const ciDoc = await fs.readFile(ciDocPath, 'utf8')
const doctorCi = await fs.readFile(doctorCiPath, 'utf8')
const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8')) as {
  scripts?: Record<string, string>
}

assert.match(workflow, /windows-latest/)
assert.match(workflow, /macos-latest/)
assert.match(workflow, /actions\/setup-node@v4/)
assert.match(workflow, /npm ci/)
assert.match(workflow, /npm run typecheck/)
assert.match(workflow, /npm run build/)
assert.match(workflow, /npm run ci:governance/)

for (const requiredScript of [
  'ci:test-governance',
  'ci:test-runtime-safety',
  'ci:governance',
  'doctor:ci',
  'test-ci-governance'
]) {
  assert.ok(packageJson.scripts?.[requiredScript], `Missing npm script: ${requiredScript}`)
}

assert.match(doctorCi, /doctor-check\.mjs/)
assert.match(doctorCi, /--json/)
assert.match(doctorCi, /status === 'error'/)
assert.match(doctorCi, /DAM_CI_SAFE/)

const executableSurface = [workflow, doctorCi].join('\n')
assert.doesNotMatch(executableSurface, /\b(cuda|notarize|publish|release|model download|download model)\b/i)
assert.doesNotMatch(executableSurface, /\b(pip install|python -m pip|curl|wget)\b/i)
assert.doesNotMatch(executableSurface, /npm run (?:pack|dist):/i)
const combined = [workflow, ciDoc, doctorCi, JSON.stringify(packageJson.scripts)].join('\n')
assert.match(combined, /DAM_DISABLE_MODEL_DOWNLOADS/)
assert.match(combined, /DAM_DISABLE_REAL_AI_WORKER/)
assert.match(combined, /DAM_DISABLE_EXTERNAL_INFERENCE/)
