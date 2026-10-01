import assert from 'node:assert/strict'
import type {
  RuntimePackageExecuteSelectionResponse,
  RuntimePackageGetExecutionStatusResponse,
  RuntimePackageSelectLocalManifestResponse
} from '../src/main/runtime-package/runtime-package-session.service'
import {
  projectRuntimePackageExecutionAcceptance,
  projectRuntimePackageExecutionStatus,
  projectRuntimePackageSelection
} from '../src/main/runtime-package/runtime-package-session.projector'

const selectionSource = {
  success: true,
  selection: {
    selectionId: 'selection-1',
    packageId: 'runtime-1',
    name: 'Runtime One',
    version: '1.0.0',
    type: 'runtime',
    installMode: 'managed-runtime',
    archiveFileName: 'private-package-name.zip',
    sizeBytes: 1024,
    sha256: 'a'.repeat(64),
    expiresAt: '2026-06-15T01:00:00.000Z',
    warnings: ['Review package source.'],
    archivePath: '/private/runtime/private-package-name.zip'
  },
  message: 'Runtime package manifest selected.',
  manifestPath: '/private/runtime/runtime-package.json'
} as unknown as RuntimePackageSelectLocalManifestResponse

const selection = projectRuntimePackageSelection(selectionSource)
assert.equal(selection.success, true)
assert.equal(selection.data?.selectionId, 'selection-1')
assert.equal(selection.data?.sizeBytes, 1024)
assert.deepEqual(selection.data?.warnings, ['Review package source.'])
assert.equal(JSON.stringify(selection).includes('private-package-name'), false)
assert.equal(JSON.stringify(selection).includes('/private/'), false)
assert.equal(JSON.stringify(selection).includes('a'.repeat(64)), false)

selectionSource.selection!.warnings.push('Mutated after projection.')
assert.deepEqual(selection.data?.warnings, ['Review package source.'])

const executionSource = {
  accepted: true,
  execution: {
    executionId: 'execution-1',
    packageId: 'runtime-1',
    stage: 'completed',
    percent: 100,
    message: 'Private staging path: /private/runtime/staging.',
    terminal: true,
    installPath: '/private/runtime/packages/runtime-1',
    result: {
      success: true,
      packageId: 'runtime-1',
      stage: 'completed',
      installedVersion: '1.0.0',
      message: 'Installed at /private/runtime/packages/runtime-1.',
      rolledBack: false,
      progress: [{
        packageId: 'runtime-1',
        stage: 'promoting',
        percent: 80,
        message: 'Private staging path: /private/runtime/staging.'
      }],
      installPath: '/private/runtime/packages/runtime-1',
      rollbackPlan: {
        removePaths: ['/private/runtime/packages/runtime-1']
      }
    }
  },
  message: 'Runtime package execution accepted.'
} as unknown as RuntimePackageExecuteSelectionResponse

const accepted = projectRuntimePackageExecutionAcceptance(executionSource)
assert.equal(accepted.success, true)
assert.equal(accepted.data?.terminal, true)
assert.equal(accepted.data?.result?.installedVersion, '1.0.0')
assert.equal(JSON.stringify(accepted).includes('/private/'), false)
assert.equal(JSON.stringify(accepted).includes('message'), false)
assert.equal(JSON.stringify(accepted).includes('progress'), false)
assert.equal(JSON.stringify(accepted).includes('rollbackPlan'), false)

const status = projectRuntimePackageExecutionStatus({
  success: true,
  execution: executionSource.execution,
  message: 'Runtime package execution status loaded.'
} as RuntimePackageGetExecutionStatusResponse)
assert.deepEqual(status.data, accepted.data)

const failure = projectRuntimePackageSelection({
  success: false,
  errorCode: 'MANIFEST_INVALID',
  message: 'The selected runtime package manifest failed validation.'
})
assert.deepEqual(failure, {
  success: false,
  errorCode: 'MANIFEST_INVALID'
})
