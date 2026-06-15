import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'

const mainIpcFiles = await listFiles('src/main/ipc')
const preloadSource = await fs.readFile('src/preload/index.ts', 'utf8')
const rendererFiles = await listFiles('src/renderer')
const sharedContractFiles = await listFiles('src/shared/contracts')
const runtimePackageSessionSource = await fs.readFile('src/main/runtime-package/runtime-package-session.service.ts', 'utf8')
const runtimePackageDoc = await fs.readFile('docs/platform/RUNTIME_PACKAGE_EXECUTOR.md', 'utf8')

assert.match(runtimePackageSessionSource, /export class RuntimePackageSessionService/)
assert.match(runtimePackageSessionSource, /selectLocalManifest/)
assert.match(runtimePackageSessionSource, /executeSelection/)
assert.match(runtimePackageSessionSource, /getExecutionStatus/)
assert.match(runtimePackageSessionSource, /executionRetentionMs/)

assert.match(runtimePackageDoc, /does not register IPC channels/)
assert.match(runtimePackageDoc, /future renderer IPC surface/)

const mainIpcSurface = await readCombined(mainIpcFiles)
assert.doesNotMatch(mainIpcSurface, /runtime-package:/)
assert.doesNotMatch(mainIpcSurface, /RuntimePackageSessionService/)
assert.doesNotMatch(mainIpcFiles.join('\n'), /runtime-package\.ipc\.ts$/)

assert.doesNotMatch(preloadSource, /runtimePackage\s*:/)
assert.doesNotMatch(preloadSource, /runtime-package:/)
assert.doesNotMatch(preloadSource, /selectLocalManifest|executeSelection|getExecutionStatus/)

const rendererSurface = await readCombined(rendererFiles)
assert.doesNotMatch(rendererSurface, /runtime-package:/)
assert.doesNotMatch(rendererSurface, /runtimePackage\s*\./)
assert.doesNotMatch(rendererSurface, /RuntimePackageSessionService/)

const sharedContractSurface = await readCombined(sharedContractFiles)
assert.doesNotMatch(sharedContractSurface, /CHANNEL_RUNTIME_PACKAGE/)
assert.doesNotMatch(sharedContractSurface, /runtime-package:/)

async function listFiles(root: string): Promise<string[]> {
  const entries = await fs.readdir(root, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    const entryPath = path.join(root, entry.name)
    if (entry.isDirectory()) {
      files.push(...await listFiles(entryPath))
    } else if (/\.(?:ts|tsx)$/.test(entry.name)) {
      files.push(entryPath)
    }
  }
  return files
}

async function readCombined(files: string[]): Promise<string> {
  return (await Promise.all(files.map((file) => fs.readFile(file, 'utf8')))).join('\n')
}
