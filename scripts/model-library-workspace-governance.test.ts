import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'

const workspaceRoot = 'src/main/model-library-workspace'
const workspaceInterfaceSource = await fs.readFile(
  `${workspaceRoot}/model-library-workspace.ts`,
  'utf8'
)
const workspaceSources = await Promise.all(
  (await sourceFilesUnder(workspaceRoot)).map((file) => fs.readFile(file, 'utf8'))
)
const releaseSource = await fs.readFile(
  `${workspaceRoot}/official-model-catalog.release.ts`,
  'utf8'
)
const checkedInReleaseInput = JSON.parse(await fs.readFile(
  `${workspaceRoot}/official-model-catalog.release-input.json`,
  'utf8'
)) as Record<string, unknown>
const rootRegistrySource = await fs.readFile(
  'src/main/model-library/model-storage-root-registry.internal.ts',
  'utf8'
)
const contractSource = await fs.readFile(
  'src/shared/contracts/model-library-workspace.contract.ts',
  'utf8'
)
const ipcSource = await fs.readFile(
  'src/main/ipc/model-library-workspace.ipc.ts',
  'utf8'
)
const handlersSource = await fs.readFile(
  'src/main/ipc/model-library-workspace.handlers.ts',
  'utf8'
)
const mainSource = await fs.readFile('src/main/index.ts', 'utf8')
const preloadSource = await fs.readFile('src/preload/index.ts', 'utf8')
const pageSource = await fs.readFile(
  'src/renderer/routes/ModelLibraryPage.tsx',
  'utf8'
)
const aiCardSource = await fs.readFile(
  'src/renderer/components/ai/ModelLibraryStatusCard.tsx',
  'utf8'
)

const workspaceInterfaceBody = workspaceInterfaceSource.match(
  /export interface ModelLibraryWorkspace \{(?<body>[\s\S]*?)\n\}/
)?.groups?.body ?? ''
assert.deepEqual(
  [...new Set(
    [...workspaceInterfaceBody.matchAll(/^\s{2}([a-z][A-Za-z]+)\(/gm)]
      .map((match) => match[1])
  )],
  ['summarize', 'configureStorage']
)

assert.doesNotMatch(
  workspaceSources.join('\n'),
  /SettingsService|settings:select-folder|modelRootDir|selectedPromptModelPath|services\/ai-models|ai-service|llama-runtime|from ['"](?:node:)?(?:http|https|net|tls)['"]|\bfetch\s*\(/i,
  'The Pilot must not acquire legacy settings/model, Worker, Runtime or network authority.'
)
assert.doesNotMatch(
  workspaceSources.join('\n'),
  /generateKeyPair|createPrivateKey|privateKey|BEGIN (?:RSA|PRIVATE KEY)/i,
  'Publisher private-key generation or material must never enter the product workspace.'
)
assert.match(
  releaseSource,
  /BUNDLED_OFFICIAL_MODEL_CATALOG:[\s\S]*resolvedCheckedInReleaseInput/,
  'Production must derive the Catalog only from the checked-in release input.'
)
assert.match(
  releaseSource,
  /PINNED_OFFICIAL_MODEL_CATALOG_TRUST_ROOT:[\s\S]*resolvedCheckedInReleaseInput/,
  'The production trust root must be an independent release-owned pin.'
)
assert.deepEqual(checkedInReleaseInput, {
  schemaVersion: 1,
  pinnedTrustRoot: null,
  bundledCatalog: null
})
const rootControlBody = rootRegistrySource.match(
  /export async function openModelStorageRootRegistryControl[\s\S]*?\n}\n\nfunction createAuthority/
)?.[0] ?? ''
const observeCurrentBody = rootControlBody.match(
  /async observeCurrent\(\)[\s\S]*?\n\s{4}},\n\n\s{4}async currentLocatorLeaf/
)?.[0] ?? ''
assert.notEqual(observeCurrentBody, '')
assert.doesNotMatch(
  observeCurrentBody,
  /updateObservation|commitReviewedSelection|inspectModelStorageRootRef|UPDATE\s+/i,
  'Page and manual refresh observation must remain read-only.'
)
assert.match(observeCurrentBody, /observeModelStorageRootRef/)
const readOnlyRootObservationBody = rootRegistrySource.includes(
  'observeModelStorageRootRef'
)
  ? (await fs.readFile(
      'src/main/model-library/model-storage-authority.internal.ts',
      'utf8'
    )).match(
      /export async function observeModelStorageRootRef[\s\S]*?\n}\n\nexport interface ModelStorageRootControlLease/
    )?.[0] ?? ''
  : ''
assert.notEqual(readOnlyRootObservationBody, '')
assert.doesNotMatch(
  readOnlyRootObservationBody,
  /acquireWriterLease|BEGIN\s+(?:IMMEDIATE|EXCLUSIVE)/i,
  'Read-only page observation must not request Model Storage write authority.'
)

assert.match(contractSource, /model-library-workspace:summarize/)
assert.match(contractSource, /model-library-workspace:configure-storage/)
assert.doesNotMatch(
  contractSource,
  /defaultPath|rootDirectory|modelRootDir|bookmark|locator|storageIdentity|filePath/
)
assert.match(ipcSource, /registerModelLibraryWorkspaceIpc/)
assert.match(handlersSource, /readExactRecord/)
assert.match(handlersSource, /MODULE_UNAVAILABLE/)
assert.match(mainSource, /createProductionModelLibraryWorkspaceProvider/)
assert.match(mainSource, /registerModelLibraryWorkspaceIpc|registerMainIpcComposition/)
assert.match(preloadSource, /modelLibraryWorkspace:/)
assert.match(preloadSource, /createModelLibraryWorkspacePreloadApi/)

assert.doesNotMatch(pageSource, /window\.electronAPI|settingsSelectFolder|modelRootDir/)
assert.doesNotMatch(aiCardSource, /configureStorage|review-|confirm-/)
assert.match(aiCardSource, /APP_MODEL_LIBRARY_ROUTE\.path/)
assert.doesNotMatch(aiCardSource, /to="\/model-library"/)

const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8')) as {
  readonly scripts?: Record<string, string>
}
assert.equal(
  packageJson.scripts?.['test-model-library-product-pilot'],
  'node scripts/run-ts-test.mjs scripts/model-library-product-pilot.test.ts'
)
assert.equal(
  packageJson.scripts?.['test-model-library-product-pilot-storage'],
  'node scripts/run-electron-node-test.mjs scripts/model-library-workspace-storage.test.ts'
)
assert.match(
  packageJson.scripts?.['ci:test-runtime-safety'] ?? '',
  /test-model-library-product-pilot && npm run test-model-library-product-pilot-storage/
)

console.log('model-library-workspace-governance passed')

async function sourceFilesUnder(root: string): Promise<string[]> {
  const files: string[] = []
  for (const entry of await fs.readdir(root, { withFileTypes: true })) {
    const child = path.join(root, entry.name)
    if (entry.isDirectory()) files.push(...await sourceFilesUnder(child))
    else if (/\.(?:ts|tsx)$/.test(entry.name)) files.push(child)
  }
  return files.sort()
}
