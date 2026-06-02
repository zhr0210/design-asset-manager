import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { createReleaseFlowGovernancePlan } from '../src/main/packaging/release-flow-governance'

const plan = createReleaseFlowGovernancePlan()
assert.equal(plan.phase, '15A')
assert.equal(plan.signingReserved, true)
assert.equal(plan.notarizationReserved, true)
assert.equal(plan.universalMacOptional, true)
assert.equal(plan.releaseWorkflow, true)
assert.equal(plan.publishEnabled, false)
assert.equal(plan.autoUpdateEnabled, false)
assert.equal(plan.destructiveCleanup, false)
assert.ok(plan.matrix.some((entry) => entry.target === 'windows-nsis' && entry.arch === 'x64'))
assert.ok(plan.matrix.some((entry) => entry.target === 'windows-nsis' && entry.arch === 'arm64'))
assert.ok(plan.matrix.some((entry) => entry.target === 'macos-dmg' && entry.arch === 'x64'))
assert.ok(plan.matrix.some((entry) => entry.target === 'macos-dmg' && entry.arch === 'arm64'))

const manifest = JSON.parse(await fs.readFile('.codeindex/release-flow-governance.json', 'utf8')) as {
  windowsNsis?: boolean
  macosDmg?: boolean
  publishEnabled?: boolean
  autoUpdateEnabled?: boolean
  privacy?: { containsSecrets?: boolean }
}
assert.equal(manifest.windowsNsis, true)
assert.equal(manifest.macosDmg, true)
assert.equal(manifest.publishEnabled, false)
assert.equal(manifest.autoUpdateEnabled, false)
assert.equal(manifest.privacy?.containsSecrets, false)

const workflow = await fs.readFile('.github/workflows/release-packaging-dry-run.yml', 'utf8')
assert.match(workflow, /workflow_dispatch/)
assert.match(workflow, /windows-nsis/)
assert.match(workflow, /macos-dmg/)
assert.match(workflow, /arm64/)
assert.match(workflow, /x64/)
assert.doesNotMatch(workflow, /electron-builder.*--publish|notarize|APPLE_ID|CSC_LINK|GH_TOKEN|GITHUB_TOKEN/)

const source = await fs.readFile('src/main/packaging/release-flow-governance.ts', 'utf8')
assert.doesNotMatch(source, /rm\s|Remove-Item|unlink\s*\(|rmdir\s*\(|--publish|publish:\s*true/i)
assert.doesNotMatch(source, /C:\\Users\\[A-Za-z0-9_.-]+/i)

const doc = await fs.readFile('docs/platform/RELEASE_FLOW_GOVERNANCE.md', 'utf8')
assert.match(doc, /auto update/)
assert.doesNotMatch(doc, /C:\\Users\\[A-Za-z0-9_.-]+/i)
