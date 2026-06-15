import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { createReleaseFlowGovernancePlan } from '../src/main/packaging/release-flow-governance'

const plan = createReleaseFlowGovernancePlan()
assert.equal(plan.phase, '15C')
assert.equal(plan.promotionInvariant, true)
assert.equal(plan.unsignedCandidateArtifacts, true)
assert.equal(plan.signedCandidateWorkflow, true)
assert.equal(plan.signingEnvironmentApproval, true)
assert.equal(plan.trustEvidence, true)
assert.equal(plan.notarizationEvidence, true)
assert.equal(plan.releaseUpdateMetadata, true)
assert.equal(plan.universalMacOptional, true)
assert.equal(plan.releaseWorkflow, true)
assert.equal(plan.publishEnabled, false)
assert.equal(plan.autoUpdateEnabled, false)
assert.equal(plan.destructiveCleanup, false)
assert.ok(plan.matrix.some((entry) => entry.target === 'windows-nsis' && entry.arch === 'x64'))
assert.ok(plan.matrix.some((entry) => entry.target === 'windows-nsis' && entry.arch === 'arm64'))
assert.ok(plan.matrix.some((entry) => entry.target === 'macos-dmg' && entry.arch === 'x64'))
assert.ok(plan.matrix.some((entry) => entry.target === 'macos-dmg' && entry.arch === 'arm64'))
assert.ok(plan.matrix.filter((entry) => entry.target === 'windows-nsis').every((entry) => entry.os === 'windows-2022'))
assert.ok(plan.matrix.every((entry) => entry.command.startsWith('npm run dist:')))

const manifest = JSON.parse(await fs.readFile('.codeindex/release-flow-governance.json', 'utf8')) as {
  windowsNsis?: boolean
  macosDmg?: boolean
  signedCandidateWorkflow?: string
  signingEnvironmentApproval?: boolean
  trustEvidence?: boolean
  releaseUpdateMetadata?: boolean
  publishEnabled?: boolean
  autoUpdateEnabled?: boolean
  privacy?: { containsSecrets?: boolean }
}
assert.equal(manifest.windowsNsis, true)
assert.equal(manifest.macosDmg, true)
assert.equal(manifest.signedCandidateWorkflow, '.github/workflows/release-signed-candidate.yml')
assert.equal(manifest.signingEnvironmentApproval, true)
assert.equal(manifest.trustEvidence, true)
assert.equal(manifest.releaseUpdateMetadata, true)
assert.equal(manifest.publishEnabled, false)
assert.equal(manifest.autoUpdateEnabled, false)
assert.equal(manifest.privacy?.containsSecrets, false)

const workflow = await fs.readFile('.github/workflows/release-packaging-dry-run.yml', 'utf8')
const signedWorkflow = await fs.readFile('.github/workflows/release-signed-candidate.yml', 'utf8')
assert.match(workflow, /workflow_dispatch/)
assert.match(workflow, /windows-2022/)
assert.match(workflow, /actions\/checkout@v6/)
assert.match(workflow, /actions\/setup-node@v6/)
assert.match(workflow, /windows-nsis/)
assert.match(workflow, /macos-dmg/)
assert.match(workflow, /arm64/)
assert.match(workflow, /x64/)
assert.match(workflow, /if: matrix\.target == 'windows-nsis'/)
assert.match(workflow, /npm run dist:win/)
assert.match(workflow, /if: matrix\.target == 'macos-dmg'/)
assert.match(workflow, /npm run dist:mac/)
assert.match(workflow, /write-release-checksums\.mjs/)
assert.match(workflow, /npm run package:smoke/)
assert.match(workflow, /actions\/upload-artifact@v4/)
assert.match(workflow, /unsigned-candidate/)
assert.match(workflow, /DAM_DISABLE_MODEL_DOWNLOADS/)
assert.doesNotMatch(workflow, /if \[/)
assert.doesNotMatch(workflow, /electron-builder.*--publish|notarize|APPLE_ID|APPLE_TEAM_ID|CSC_LINK|CSC_KEY_PASSWORD|GH_TOKEN|GITHUB_TOKEN/)
assert.match(signedWorkflow, /signing_approved/)
assert.match(signedWorkflow, /runs-on: windows-2022/)
assert.match(signedWorkflow, /actions\/checkout@v6/)
assert.match(signedWorkflow, /actions\/setup-node@v6/)
assert.match(signedWorkflow, /release-signing-windows/)
assert.match(signedWorkflow, /release-signing-macos/)
assert.match(signedWorkflow, /write-release-update-metadata\.mjs/)
assert.match(signedWorkflow, /verify-release-trust\.mjs/)
assert.match(signedWorkflow, /verify-release-branding\.mjs/)
assert.match(signedWorkflow, /build\/release-branding\.json/)
assert.match(signedWorkflow, /release-branding-evidence-\*\.json/)
assert.doesNotMatch(signedWorkflow, /contents: write|gh release|create-release|--publish always/i)

const source = await fs.readFile('src/main/packaging/release-flow-governance.ts', 'utf8')
assert.doesNotMatch(source, /(?:^|\s)rm\s|Remove-Item|unlink\s*\(|rmdir\s*\(|--publish|publish:\s*true/im)
assert.doesNotMatch(source, /C:\\Users\\[A-Za-z0-9_.-]+/i)

const doc = await fs.readFile('docs/platform/RELEASE_FLOW_GOVERNANCE.md', 'utf8')
assert.match(doc, /auto update/)
assert.doesNotMatch(doc, /C:\\Users\\[A-Za-z0-9_.-]+/i)
