import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import {
  blockLegacyModelMutation,
  LEGACY_MODEL_MUTATION_BLOCKED_ERROR,
  noActiveLegacyModelTransfer,
  NO_ACTIVE_LEGACY_MODEL_TRANSFER_ERROR
} from '../src/main/services/ai-models/legacy-model-mutation.policy'

const aiModelIpcSource = await fs.readFile('src/main/ipc/ai-model.ipc.ts', 'utf8')
const cooperativeModelIpcSource = await fs.readFile('src/main/ipc/cooperative-model.ipc.ts', 'utf8')
const llamaRuntimeIpcSource = await fs.readFile('src/main/ipc/llama-runtime.ipc.ts', 'utf8')

function between(source: string, start: string, end: string): string {
  const startIndex = source.indexOf(start)
  const endIndex = source.indexOf(end, startIndex + start.length)
  assert.notEqual(startIndex, -1, `Missing source marker: ${start}`)
  assert.notEqual(endIndex, -1, `Missing source marker: ${end}`)
  return source.slice(startIndex, endIndex)
}

assert.equal(LEGACY_MODEL_MUTATION_BLOCKED_ERROR, 'LEGACY_MODEL_MUTATION_BLOCKED')
assert.deepEqual(blockLegacyModelMutation(), {
  success: false,
  error: 'LEGACY_MODEL_MUTATION_BLOCKED'
})
assert.equal(NO_ACTIVE_LEGACY_MODEL_TRANSFER_ERROR, 'NO_ACTIVE_LEGACY_MODEL_TRANSFER')
assert.deepEqual(noActiveLegacyModelTransfer(), {
  success: false,
  error: 'NO_ACTIVE_LEGACY_MODEL_TRANSFER'
})

const directDownloadHandler = between(
  aiModelIpcSource,
  "ipcMain.handle('ai-model:download'",
  "ipcMain.handle('ai-model:cancel-download'"
)
assert.match(
  aiModelIpcSource,
  /ipcMain\.handle\('ai-model:download', blockLegacyModelMutation\)/
)
assert.doesNotMatch(directDownloadHandler, /startDownload|getModelLocalPath|resolveAiServicePath|spawn\(|fs\./)

assert.match(
  aiModelIpcSource,
  /ipcMain\.handle\('ai-model:cancel-download', noActiveLegacyModelTransfer\)/
)

const directDeleteHandler = between(
  aiModelIpcSource,
  "ipcMain.handle('ai-model:delete'",
  "ipcMain.handle('ai-model:verify-compatibility'"
)
assert.match(
  aiModelIpcSource,
  /ipcMain\.handle\('ai-model:delete', blockLegacyModelMutation\)/
)
assert.doesNotMatch(directDeleteHandler, /deleteModel|getModelLocalPath|rmSync|fs\./)

const directCompatibilityHandler = aiModelIpcSource.slice(
  aiModelIpcSource.indexOf("ipcMain.handle('ai-model:verify-compatibility'")
)
assert.match(
  aiModelIpcSource,
  /ipcMain\.handle\('ai-model:verify-compatibility', blockLegacyModelMutation\)/
)
assert.doesNotMatch(
  directCompatibilityHandler,
  /PROMPT_VLM_MODELS|getModelLocalPath|resolvePythonExecutable|resolveAiServicePath|spawn\(|fs\./
)

const cooperativeDownloadHandler = between(
  cooperativeModelIpcSource,
  "ipcMain.handle('cooperative-model:download'",
  "ipcMain.handle('cooperative-model:cancel-download'"
)
assert.match(
  cooperativeModelIpcSource,
  /ipcMain\.handle\('cooperative-model:download', blockLegacyModelMutation\)/
)
assert.doesNotMatch(
  cooperativeDownloadHandler,
  /COOPERATIVE_MODELS|getCooperativeModelLocalPath|ensureManagedAiPythonRuntime|resolveAiServicePath|spawn\(|fs\./
)

assert.match(
  cooperativeModelIpcSource,
  /ipcMain\.handle\('cooperative-model:cancel-download', noActiveLegacyModelTransfer\)/
)

const cooperativeDeleteHandler = cooperativeModelIpcSource.slice(
  cooperativeModelIpcSource.indexOf("ipcMain.handle('cooperative-model:delete'")
)
assert.match(
  cooperativeModelIpcSource,
  /ipcMain\.handle\('cooperative-model:delete', blockLegacyModelMutation\)/
)
assert.doesNotMatch(
  cooperativeDeleteHandler,
  /COOPERATIVE_MODELS|getCooperativeModelLocalPath|rmSync|fs\./
)

await assert.rejects(
  fs.access('src/main/services/ai-models/ai-model-download.service.ts'),
  /ENOENT/
)

const llamaInstallHandler = between(
  llamaRuntimeIpcSource,
  'ipcMain.handle(CHANNEL_LLAMA_RUNTIME_START_INSTALL',
  'ipcMain.handle(CHANNEL_LLAMA_RUNTIME_CANCEL_INSTALL'
)
assert.match(
  llamaRuntimeIpcSource,
  /ipcMain\.handle\(CHANNEL_LLAMA_RUNTIME_START_INSTALL, blockLegacyModelMutation\)/
)
assert.doesNotMatch(llamaInstallHandler, /startInstall|request\.plan|event\.sender|spawn\(|fs\./)

const llamaCancelHandler = between(
  llamaRuntimeIpcSource,
  'ipcMain.handle(CHANNEL_LLAMA_RUNTIME_CANCEL_INSTALL',
  'ipcMain.handle(CHANNEL_LLAMA_RUNTIME_GET_STATUS'
)
assert.match(llamaCancelHandler, /return service\.cancelInstall\(\)/)

assert.match(llamaRuntimeIpcSource, /service\.detectHardware\(\)/)
assert.match(llamaRuntimeIpcSource, /service\.createInstallPlan\(/)
assert.match(llamaRuntimeIpcSource, /service\.getStatusWithHealth\(/)
assert.match(llamaRuntimeIpcSource, /service\.startServer\(/)

console.log('legacy-model-management-containment passed')
