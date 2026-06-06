import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'

type CiArtifactDenylist = {
  rootDeniedEntries?: string[]
  allowedDistTempEntries?: string[]
  workflowForbiddenPatterns?: string[]
  requiredWorkflowGuardrails?: string[]
}

const denylistPath = '.codeindex/ci-artifact-denylist.json'
const workflowPath = '.github/workflows/cross-platform-governance.yml'
const packageJsonPath = 'package.json'
const ciDocs = ['docs/platform/CI_MATRIX.md', 'docs/platform/CI_HYGIENE.md']

const denylist = JSON.parse(await fs.readFile(denylistPath, 'utf8')) as CiArtifactDenylist
const rootEntries = new Set(await fs.readdir(process.cwd()))

for (const deniedEntry of denylist.rootDeniedEntries ?? []) {
  assert.equal(rootEntries.has(deniedEntry), false, `Denied CI artifact exists at project root: ${deniedEntry}`)
}

await assertDistTempIsBounded(denylist.allowedDistTempEntries ?? [])

const workflow = await fs.readFile(workflowPath, 'utf8')
const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8')) as {
  scripts?: Record<string, string>
}
const executableSurface = workflow

for (const pattern of denylist.workflowForbiddenPatterns ?? []) {
  assert.doesNotMatch(executableSurface, new RegExp(pattern, 'i'), `Forbidden CI command pattern found: ${pattern}`)
}

for (const guardrail of denylist.requiredWorkflowGuardrails ?? []) {
  assert.match(workflow, new RegExp(guardrail), `Missing workflow guardrail: ${guardrail}`)
}

assert.ok(packageJson.scripts?.['ci:hygiene'], 'Missing npm script: ci:hygiene')
assert.match(packageJson.scripts?.['ci:governance'] ?? '', /ci:hygiene/)

const docsText = (await Promise.all(ciDocs.map((docPath) => fs.readFile(docPath, 'utf8')))).join('\n')
assert.match(docsText, /ci-artifact-denylist\.json/)
assert.match(docsText, /dist-temp/)
assert.match(docsText, /DAM_DISABLE_MODEL_DOWNLOADS/)
assert.match(docsText, /DAM_DISABLE_REAL_AI_WORKER/)

async function assertDistTempIsBounded(allowedEntries: string[]): Promise<void> {
  const distTemp = path.resolve('dist-temp')
  let entries: string[]
  try {
    const rawEntries = await fs.readdir(distTemp)
    entries = rawEntries.filter((e) => e !== '.DS_Store')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return
    }
    throw error
  }

  const allowed = new Set(allowedEntries)
  for (const entry of entries) {
    assert.ok(allowed.has(entry), `Unexpected dist-temp entry: ${entry}`)
    const stat = await fs.stat(path.join(distTemp, entry))
    assert.equal(stat.isDirectory(), true, `dist-temp entry must be a directory: ${entry}`)
  }
}
