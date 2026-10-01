import assert from 'node:assert/strict'
import {
  clampRuntimePackagePercent,
  formatRuntimePackageBytes,
  projectRuntimePackageErrorDisplay,
  projectRuntimePackageExecutionDisplay,
  projectRuntimePackageIdleDisplay,
  projectRuntimePackageSelectionDisplay
} from '../src/shared/workflows/runtime-package-product.workflow'

assert.equal(projectRuntimePackageIdleDisplay().label, '未选择')
assert.equal(projectRuntimePackageSelectionDisplay({
  selectionId: 'selection-1',
  packageId: 'runtime-1',
  name: 'Runtime One',
  version: '1.0.0',
  type: 'runtime',
  installMode: 'managed-runtime',
  sizeBytes: 1024 * 1024,
  expiresAt: '2026-06-20T00:00:00.000Z',
  warnings: []
}).detail, 'Runtime One 1.0.0，1 MB')

const running = projectRuntimePackageExecutionDisplay({
  executionId: 'execution-1',
  packageId: 'runtime-1',
  stage: 'extracting',
  percent: 42.4,
  terminal: false
})
assert.equal(running.label, '正在解压')
assert.equal(running.detail, '安装进度 42%。')

const completed = projectRuntimePackageExecutionDisplay({
  executionId: 'execution-1',
  packageId: 'runtime-1',
  stage: 'completed',
  percent: 100,
  terminal: true,
  result: {
    success: true,
    packageId: 'runtime-1',
    stage: 'completed',
    installedVersion: '1.0.0',
    rolledBack: false
  }
})
assert.equal(completed.label, '安装完成')
assert.equal(completed.tone, 'success')

const rolledBack = projectRuntimePackageExecutionDisplay({
  executionId: 'execution-1',
  packageId: 'runtime-1',
  stage: 'rolled_back',
  percent: 100,
  terminal: true,
  result: {
    success: false,
    packageId: 'runtime-1',
    stage: 'rolled_back',
    errorCode: 'CHECKSUM_MISMATCH',
    rolledBack: true
  }
})
assert.equal(rolledBack.label, '失败并已回滚')
assert.equal(rolledBack.tone, 'warning')
assert.match(rolledBack.detail, /SHA-256/)

assert.equal(projectRuntimePackageErrorDisplay('SELECTION_CANCELLED').tone, 'idle')
assert.match(projectRuntimePackageErrorDisplay('MANIFEST_INVALID').detail, /清单/)
assert.equal(projectRuntimePackageErrorDisplay(undefined).tone, 'error')
assert.equal(clampRuntimePackagePercent(Number.NaN), 0)
assert.equal(clampRuntimePackagePercent(-10), 0)
assert.equal(clampRuntimePackagePercent(101), 100)
assert.equal(formatRuntimePackageBytes(0), '0 B')
assert.equal(formatRuntimePackageBytes(1536), '1.5 KB')

console.log('runtime-package-product-workflow passed')
