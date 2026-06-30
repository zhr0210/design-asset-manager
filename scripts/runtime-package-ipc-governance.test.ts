import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'

const contractSource = await fs.readFile('src/shared/contracts/runtime-package.contract.ts', 'utf8')
const ipcSource = await fs.readFile('src/main/ipc/runtime-package.ipc.ts', 'utf8')
const handlerSource = await fs.readFile('src/main/runtime-package/runtime-package-ipc.handlers.ts', 'utf8')
const preloadSource = await fs.readFile('src/preload/index.ts', 'utf8')
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
assert.match(mainIndexSource, /registerRuntimePackageIpc\(\)/)

assert.match(handlerSource, /projectRuntimePackageSelection/)
assert.match(handlerSource, /projectRuntimePackageExecutionAcceptance/)
assert.match(handlerSource, /projectRuntimePackageExecutionStatus/)
assert.match(handlerSource, /validOpaqueId/)

assert.match(preloadSource, /runtimePackage:\s*\{/)
assert.match(preloadSource, /CHANNEL_RUNTIME_PACKAGE_SELECT_LOCAL_MANIFEST/)
assert.match(preloadSource, /CHANNEL_RUNTIME_PACKAGE_EXECUTE_SELECTION/)
assert.match(preloadSource, /CHANNEL_RUNTIME_PACKAGE_GET_EXECUTION_STATUS/)

assert.match(rendererSurface, /electronAPI\?\.runtimePackage/)
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
