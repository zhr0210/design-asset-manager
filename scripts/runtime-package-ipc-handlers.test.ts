import assert from 'node:assert/strict'
import type { RuntimePackageSessionService } from '../src/main/runtime-package/runtime-package-session.service'
import { createRuntimePackageIpcHandlers } from '../src/main/runtime-package/runtime-package-ipc.handlers'

let selectedManifestPath: string | null = null
let executedSelectionId: string | null = null
let requestedExecutionId: string | null = null

const session: Pick<
  RuntimePackageSessionService,
  'selectLocalManifest' | 'executeSelection' | 'getExecutionStatus'
> = {
  async selectLocalManifest(manifestPath) {
    selectedManifestPath = manifestPath
    return {
      success: true,
      selection: {
        selectionId: 'selection-1',
        packageId: 'runtime-1',
        name: 'Runtime One',
        version: '1.2.3',
        type: 'runtime',
        installMode: 'managed-runtime',
        archiveFileName: 'private-runtime.zip',
        sizeBytes: 1024,
        sha256: 'a'.repeat(64),
        expiresAt: '2026-06-20T00:00:00.000Z',
        warnings: ['review']
      },
      message: 'internal selection message'
    }
  },
  async executeSelection(request) {
    executedSelectionId = request.selectionId
    return {
      accepted: true,
      execution: {
        executionId: 'execution-1',
        packageId: 'runtime-1',
        stage: 'validating',
        percent: 0,
        message: 'internal execution message',
        terminal: false
      },
      message: 'internal acceptance message'
    }
  },
  getExecutionStatus(executionId) {
    requestedExecutionId = executionId
    return {
      success: true,
      execution: {
        executionId,
        packageId: 'runtime-1',
        stage: 'completed',
        percent: 100,
        message: 'internal completion message',
        terminal: true,
        result: {
          success: true,
          packageId: 'runtime-1',
          stage: 'completed',
          installedVersion: '1.2.3',
          message: 'internal result message',
          rolledBack: false,
          progress: [{
            packageId: 'runtime-1',
            stage: 'completed',
            percent: 100,
            message: 'private progress message'
          }]
        }
      },
      message: 'internal status message'
    }
  }
}

const handlers = createRuntimePackageIpcHandlers(session)

assert.deepEqual(await handlers.selectLocalManifest(null), {
  success: false,
  errorCode: 'SELECTION_CANCELLED'
})
assert.equal(selectedManifestPath, null)

const selection = await handlers.selectLocalManifest('/private/runtime-package.json')
assert.equal(selectedManifestPath, '/private/runtime-package.json')
assert.equal(selection.success, true)
if (!selection.success) throw new Error('Expected selection success')
assert.deepEqual(Object.keys(selection.data), [
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
assert.doesNotMatch(JSON.stringify(selection), /private-runtime|sha256|message/i)

assert.deepEqual(await handlers.executeSelection({ selectionId: '', confirmed: true }), {
  success: false,
  errorCode: 'CONFIRMATION_REQUIRED'
})
assert.deepEqual(await handlers.executeSelection({ selectionId: 'selection-1', confirmed: false }), {
  success: false,
  errorCode: 'CONFIRMATION_REQUIRED'
})
assert.equal(executedSelectionId, null)

const accepted = await handlers.executeSelection({ selectionId: 'selection-1', confirmed: true })
assert.equal(executedSelectionId, 'selection-1')
assert.equal(accepted.success, true)
if (!accepted.success) throw new Error('Expected execution acceptance')
assert.deepEqual(Object.keys(accepted.data), [
  'executionId',
  'packageId',
  'stage',
  'percent',
  'terminal'
])
assert.doesNotMatch(JSON.stringify(accepted), /message/i)

assert.deepEqual(handlers.getExecutionStatus({ executionId: '' }), {
  success: false,
  errorCode: 'EXECUTION_NOT_FOUND'
})
assert.equal(requestedExecutionId, null)

const completed = handlers.getExecutionStatus({ executionId: 'execution-1' })
assert.equal(requestedExecutionId, 'execution-1')
assert.equal(completed.success, true)
if (!completed.success) throw new Error('Expected execution status success')
assert.equal(completed.data.result?.installedVersion, '1.2.3')
assert.doesNotMatch(JSON.stringify(completed), /message|progress/i)

console.log('runtime-package-ipc-handlers passed')
