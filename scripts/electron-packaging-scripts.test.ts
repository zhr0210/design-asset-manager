import assert from 'node:assert/strict'
import fs from 'node:fs/promises'

type PackagingScripts = {
  runsPackagingInCI?: boolean
  scripts?: Record<string, { command?: string; publishes?: boolean; signs?: boolean; notarizes?: boolean; releaseWorkflow?: boolean }>
  forbidden?: string[]
}

const manifest = JSON.parse(await fs.readFile('.codeindex/electron-packaging-scripts.json', 'utf8')) as PackagingScripts
const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8')) as {
  scripts?: Record<string, string>
}
const workflow = await fs.readFile('.github/workflows/cross-platform-governance.yml', 'utf8')
const ciDocs = [
  await fs.readFile('docs/platform/ELECTRON_PACKAGING_AUDIT.md', 'utf8'),
  await fs.readFile('docs/platform/CI_MATRIX.md', 'utf8')
].join('\n')

assert.equal(manifest.runsPackagingInCI, false)

for (const scriptName of ['pack:win', 'pack:mac', 'dist:win', 'dist:mac']) {
  const packageScript = packageJson.scripts?.[scriptName]
  const manifestScript = manifest.scripts?.[scriptName]
  assert.ok(packageScript, `Missing package script: ${scriptName}`)
  assert.equal(packageScript, manifestScript?.command)
  assert.match(packageScript, /npm run build && electron-builder/)
  assert.doesNotMatch(packageScript, /\b(publish|release|notarize|afterSign|curl|wget|pip install|python -m pip)\b/i)
  assert.equal(manifestScript?.publishes, false)
  assert.equal(manifestScript?.signs, false)
  assert.equal(manifestScript?.notarizes, false)
  assert.equal(manifestScript?.releaseWorkflow, false)
}

assert.match(packageJson.scripts?.['pack:win'] ?? '', /--win --dir/)
assert.match(packageJson.scripts?.['pack:mac'] ?? '', /--mac --dir/)
assert.match(packageJson.scripts?.['pack:mac'] ?? '', /identity=null/)
assert.match(packageJson.scripts?.['dist:win'] ?? '', /--win$/)
assert.match(packageJson.scripts?.['dist:mac'] ?? '', /--mac --config\.mac\.identity=null$/)

assert.doesNotMatch(workflow, /npm run (?:pack|dist):/i)
assert.doesNotMatch(workflow, /electron-builder/i)
assert.match(ciDocs, /Phase 9B/i)
assert.match(ciDocs, /pack:win/)
assert.match(ciDocs, /dist:mac/)
