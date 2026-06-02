import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { sampleRuntimePackageManifest } from '../src/main/runtime-package/fixtures/sample-runtime-package-manifest'
import { MockRuntimePackageInstaller, transitionRuntimePackageInstallState } from '../src/main/runtime-package/runtime-package-installer'
import {
  createLocalRuntimePackageSource,
  createReservedRemoteRuntimePackageSource
} from '../src/main/runtime-package/runtime-package-source'

const entry = sampleRuntimePackageManifest.packages.find((pkg) => pkg.id === 'ai-worker-core')
assert.ok(entry)

assert.equal(transitionRuntimePackageInstallState('idle', 'createPlan'), 'planned')
assert.equal(transitionRuntimePackageInstallState('planned', 'verify'), 'verifying')
assert.equal(transitionRuntimePackageInstallState('verifying', 'extract'), 'extracting')
assert.equal(transitionRuntimePackageInstallState('extracting', 'complete'), 'completed')
assert.equal(transitionRuntimePackageInstallState('blocked', 'rollback'), 'rolled-back')

const installer = new MockRuntimePackageInstaller()
const source = createLocalRuntimePackageSource('local-source', 'fixtures/runtime-packages')
const extractRoot = path.resolve('dist-temp/runtime-install')
const installPath = path.join(extractRoot, entry.id)
const plan = installer.createDryRunPlan(entry, source, 'dist-temp/runtime-packages/ai-worker-core.zip', extractRoot, installPath)

assert.equal(plan.packageId, entry.id)
assert.equal(plan.state, 'planned')
assert.equal(plan.dryRun, true)
assert.equal(plan.blockingIssues.length, 0)
assert.equal(plan.registryMetadata.writeRegistry, false)
assert.equal(plan.registryMetadata.status, 'planned')
assert.equal(plan.rollbackPlan.registryRestoreRequired, true)
assert.ok(plan.warnings.some((warning) => warning.includes('does not install Python')))

const remoteSource = createReservedRemoteRuntimePackageSource('remote-source', 'https://example.invalid/runtime.zip')
const remotePlan = installer.createDryRunPlan(entry, remoteSource, 'dist-temp/runtime-packages/remote.zip', extractRoot, installPath)
assert.equal(remotePlan.state, 'blocked')
assert.ok(remotePlan.blockingIssues.some((issue) => issue.includes('reserved remote')))

const escapePlan = installer.createDryRunPlan(entry, source, 'dist-temp/runtime-packages/ai-worker-core.zip', extractRoot, path.resolve('dist-temp/outside-install'))
assert.equal(escapePlan.state, 'blocked')
assert.ok(escapePlan.blockingIssues.some((issue) => issue.includes('inside extractRoot')))

const manifest = JSON.parse(await fs.readFile('.codeindex/runtime-package-installer.json', 'utf8')) as {
  realInstall?: boolean
  registryWrites?: boolean
  pythonInstall?: boolean
  cudaInstall?: boolean
  modelInstall?: boolean
  dryRunOnly?: boolean
}
assert.equal(manifest.realInstall, false)
assert.equal(manifest.registryWrites, false)
assert.equal(manifest.pythonInstall, false)
assert.equal(manifest.cudaInstall, false)
assert.equal(manifest.modelInstall, false)
assert.equal(manifest.dryRunOnly, true)

const sourceFile = await fs.readFile('src/main/runtime-package/runtime-package-installer.ts', 'utf8')
assert.doesNotMatch(sourceFile, /writeFile|createWriteStream|appendFile|mkdir|rm\(/)
assert.doesNotMatch(sourceFile, /spawn\s*\(|execFile\s*\(/)
assert.doesNotMatch(sourceFile, /RuntimeRegistry|runtime-registry|saveSettings|SettingsService/)

const doc = await fs.readFile('docs/platform/RUNTIME_PACKAGE_INSTALLER.md', 'utf8')
assert.match(doc, /writeRegistry: false/)
assert.match(doc, /install Python/)
assert.match(doc, /Phase 11A/)
