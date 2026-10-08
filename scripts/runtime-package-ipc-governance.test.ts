import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { registerDisabledAppIpc } from '../src/main/ipc/disabled-app.ipc'

const contractSource = await fs.readFile('src/shared/contracts/runtime-package.contract.ts', 'utf8')
const ipcSource = await fs.readFile('src/main/ipc/runtime-package.ipc.ts', 'utf8')
const handlerSource = await fs.readFile('src/main/runtime-package/runtime-package-ipc.handlers.ts', 'utf8')
const preloadSource = await fs.readFile('src/preload/index.ts', 'utf8')
const clientSource = await fs.readFile('src/shared/client/workspace-client.ts', 'utf8')
const compositionSource = await fs.readFile('src/main/ipc/main-ipc-composition.ts', 'utf8')
const aiWorkspaceSource = await fs.readFile('src/renderer/routes/AiWorkspace.tsx', 'utf8')
const rendererFiles = await listFiles('src/renderer')
const rendererSurface = await readCombined(rendererFiles)
const mainIndexSource = await fs.readFile('src/main/index.ts', 'utf8')
const runtimePackageDoc = await fs.readFile('docs/platform/RUNTIME_PACKAGE_EXECUTOR.md', 'utf8')

for (const channel of [
  'runtime-package:select-local-manifest',
  'runtime-package:execute-selection',
  'runtime-package:get-execution-status'
]) {
  assert.equal(contractSource.split(channel).length - 1, 1, `expected one contract literal for ${channel}`)
}
assert.equal((contractSource.match(/'runtime-package:/g) ?? []).length, 3)

assert.match(ipcSource, /CHANNEL_RUNTIME_PACKAGE_SELECT_LOCAL_MANIFEST/)
assert.match(ipcSource, /CHANNEL_RUNTIME_PACKAGE_EXECUTE_SELECTION/)
assert.match(ipcSource, /CHANNEL_RUNTIME_PACKAGE_GET_EXECUTION_STATUS/)
assert.match(ipcSource, /dialog\.showOpenDialog/)
assert.match(ipcSource, /createRuntimePackageIpcHandlers/)
assert.match(mainIndexSource, /registerMainIpcComposition\(/)
assert.match(compositionSource, /registerDisabledAppIpc\(dependencies\.handle\)/)
assert.doesNotMatch(mainIndexSource, /registerRuntimePackageIpc\(/)
assert.doesNotMatch(compositionSource, /registerRuntimePackageIpc\(/)
assert.doesNotMatch(aiWorkspaceSource, /RuntimePackagePanel/)
const disabled = new Map<string, (...args: any[]) => unknown>()
registerDisabledAppIpc((channel, handler) => { disabled.set(channel, handler) })
for (const channel of ['runtime-package:select-local-manifest', 'runtime-package:execute-selection', 'runtime-package:get-execution-status']) {
  assert.ok(disabled.has(channel), channel)
  assert.deepEqual(await disabled.get(channel)!({}), { success: false, error: 'This operation is unavailable while Active Library authority is active.', code: 'LIBRARY_FEATURE_DISABLED' }, channel)
}

assert.match(handlerSource, /projectRuntimePackageSelection/)
assert.match(handlerSource, /projectRuntimePackageExecutionAcceptance/)
assert.match(handlerSource, /projectRuntimePackageExecutionStatus/)
assert.match(handlerSource, /validOpaqueId/)

assert.match(preloadSource, /createWorkspaceClient\(/)
assert.match(preloadSource, /exposeInMainWorld\(['"]damClient['"], client\)/)
assert.doesNotMatch(preloadSource, /exposeInMainWorld\(['"]electronAPI['"]/)
assert.match(clientSource, /runtimePackage:\s*\{/)
assert.match(clientSource, /CHANNEL_RUNTIME_PACKAGE_SELECT_LOCAL_MANIFEST/)
assert.match(clientSource, /CHANNEL_RUNTIME_PACKAGE_EXECUTE_SELECTION/)
assert.match(clientSource, /CHANNEL_RUNTIME_PACKAGE_GET_EXECUTION_STATUS/)

assert.match(rendererSurface, /damClient\?\.runtimePackage/)
assert.match(rendererSurface, /RuntimePackagePanel/)
assert.doesNotMatch(rendererSurface, /\.manifestPath|\.archivePath|\.installPath|\.stagingPath|\.sha256/)
assert.doesNotMatch(rendererSurface, /RuntimePackageSessionService|rawExecutorResult|rollbackPlan/)

assert.match(runtimePackageDoc, /polling/i)

async function listFiles(root: string): Promise<string[]> {
  const entries = await fs.readdir(root, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    const entryPath = path.join(root, entry.name)
    if (entry.isDirectory()) files.push(...await listFiles(entryPath))
    else if (/\.(?:ts|tsx)$/.test(entry.name)) files.push(entryPath)
  }
  return files
}

async function readCombined(files: string[]): Promise<string> {
  return (await Promise.all(files.map((file) => fs.readFile(file, 'utf8')))).join('\n')
}

console.log('runtime-package-ipc-governance passed')
