import assert from 'node:assert/strict'
import fs from 'node:fs/promises'

import { createRuntimePackageIpcContractPreflight } from '../src/main/runtime-package/runtime-package-ipc-contract-preflight'

const preflight = createRuntimePackageIpcContractPreflight()

assert.equal(preflight.status, 'pending-approval')
assert.deepEqual(preflight.channels, [
  'runtime-package:select-local-manifest',
  'runtime-package:execute-selection',
  'runtime-package:get-execution-status'
])
assert.equal(preflight.version, 'v1')
assert.equal(preflight.transport, 'ipc-invoke')
assert.equal(preflight.progressModel, 'polling')
assert.equal(preflight.progressEvent, false)
assert.equal(preflight.cancellation, false)
assert.equal(preflight.mainOwnsNativeDialog, true)
assert.equal(preflight.rendererSuppliesPaths, false)
assert.equal(preflight.rendererReceivesPaths, false)
assert.equal(preflight.sharedPublicContractRegistered, false)

assert.deepEqual(preflight.selectionFields, [
  'selectionId',
  'packageId',
  'name',
  'version',
  'type',
  'installMode',
  'sizeBytes',
  'expiresAt',
  'warnings'
])
assert.deepEqual(preflight.executionSnapshotFields, [
  'executionId',
  'packageId',
  'stage',
  'percent',
  'terminal',
  'result'
])
assert.deepEqual(preflight.executionResultFields, [
  'success',
  'packageId',
  'stage',
  'installedVersion',
  'errorCode',
  'rolledBack'
])
assert.deepEqual(preflight.failureFields, ['success', 'errorCode'])
assert.deepEqual(preflight.excludedFields, [
  'absolutePath',
  'manifestPath',
  'archivePath',
  'installPath',
  'stagingPath',
  'archiveFileName',
  'sha256',
  'message',
  'progress',
  'rollbackPlan',
  'rawSession',
  'rawExecutorResult'
])

const projectorSource = await fs.readFile(
  'src/main/runtime-package/runtime-package-session.projector.ts',
  'utf8'
)

for (const field of [
  ...preflight.selectionFields,
  ...preflight.executionSnapshotFields,
  ...preflight.executionResultFields,
  ...preflight.failureFields
]) {
  assert.match(projectorSource, new RegExp(`\\b${field}\\b`), `projector should mention ${field}`)
}

for (const field of ['archiveFileName', 'sha256', 'message', 'progress', 'rollbackPlan']) {
  assert.doesNotMatch(
    projectorSource,
    new RegExp(`\\b${field}\\s*:`),
    `projector should not expose ${field}`
  )
}

const ipcGovernanceSource = await fs.readFile('scripts/runtime-package-ipc-governance.test.ts', 'utf8')
assert.match(ipcGovernanceSource, /assert\.doesNotMatch\(mainIpcSurface, \/runtime-package:\//)
assert.match(ipcGovernanceSource, /assert\.doesNotMatch\(preloadSource, \/runtimePackage\\s\*:\//)
assert.match(ipcGovernanceSource, /assert\.doesNotMatch\(rendererSurface, \/runtime-package:\//)
assert.match(ipcGovernanceSource, /assert\.doesNotMatch\(sharedContractSurface, \/runtime-package:\//)
