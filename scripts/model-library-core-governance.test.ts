import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'

const moduleRoot = 'src/main/model-library'
const interfaceSource = await fs.readFile(`${moduleRoot}/model-library.ts`, 'utf8')
const transactionalSource = await fs.readFile(
  `${moduleRoot}/transactional-model-library.tracer.ts`,
  'utf8'
)
const transactionalImplementationSource = await fs.readFile(
  `${moduleRoot}/transactional-model-library.internal.ts`,
  'utf8'
)
const storageAuthoritySource = await fs.readFile(
  `${moduleRoot}/model-storage-authority.tracer.ts`,
  'utf8'
)
const storageAuthorityImplementationSource = await fs.readFile(
  `${moduleRoot}/model-storage-authority.internal.ts`,
  'utf8'
)
const storageRootRegistrySource = await fs.readFile(
  `${moduleRoot}/model-storage-root-registry.tracer.ts`,
  'utf8'
)
const storageRootRegistryImplementationSource = await fs.readFile(
  `${moduleRoot}/model-storage-root-registry.internal.ts`,
  'utf8'
)
const formatValidationSource = await fs.readFile(
  `${moduleRoot}/model-artifact-format-validation.internal.ts`,
  'utf8'
)
const admissionSource = await fs.readFile(
  `${moduleRoot}/model-catalog-admission.tracer.ts`,
  'utf8'
)
const admissionImplementationSource = await fs.readFile(
  `${moduleRoot}/model-catalog-admission.internal.ts`,
  'utf8'
)
const barrelSource = await fs.readFile(`${moduleRoot}/index.ts`, 'utf8')
const readmeSource = await fs.readFile(`${moduleRoot}/README.md`, 'utf8')

const interfaceBody = interfaceSource.match(
  /export interface ModelLibrary \{(?<body>[\s\S]*?)\n\}/
)?.groups?.body ?? ''
assert.deepEqual(
  [...interfaceBody.matchAll(/^\s{2}([a-z][A-Za-z]+)\(/gm)].map((match) => match[1]),
  ['summarize', 'install'],
  'The external Model Library Interface must remain two-entry and intention-level.'
)

assert.doesNotMatch(
  `${admissionSource}\n${admissionImplementationSource}`,
  /from ['"](?:node:)?(?:fs|fs\/promises|http|https|net|tls|child_process|worker_threads)['"]|from ['"]electron['"]|better-sqlite3|ai-service|runtime-package|services\/ai-models/i,
  'Catalog admission must not acquire filesystem, network, process, Runtime, database, Worker, or legacy model authority.'
)
assert.doesNotMatch(
  `${transactionalSource}\n${transactionalImplementationSource}\n${formatValidationSource}`,
  /from ['"](?:node:)?(?:http|https|net|tls|child_process|worker_threads)['"]|from ['"]electron['"]|better-sqlite3|ai-service|runtime-package|services\/ai-models/i,
  'The verified-storage tracer may use local temporary filesystem authority but must not acquire network, process, Runtime, database, Worker, or legacy-model authority.'
)
assert.doesNotMatch(
  `${storageAuthoritySource}\n${storageAuthorityImplementationSource}`,
  /from ['"](?:node:)?(?:http|https|net|tls|child_process|worker_threads)['"]|from ['"]electron['"]|ai-service|runtime-package|services\/ai-models/i,
  'The storage-authority tracer may use its local filesystem and SQLite lock but must not acquire network, process, Electron, Runtime, Worker, or legacy-model authority.'
)
assert.doesNotMatch(
  `${storageRootRegistrySource}\n${storageRootRegistryImplementationSource}`,
  /from ['"](?:node:)?(?:http|https|net|tls|child_process|worker_threads)['"]|from ['"]electron['"]|ai-service|runtime-package|services\/ai-models/i,
  'The root-registry tracer may use its device-local filesystem, SQLite and Storage Authority but must not acquire network, process, Electron, Runtime, Worker, or legacy-model authority.'
)
assert.doesNotMatch(
  `${transactionalSource}\n${transactionalImplementationSource}`,
  /manifestEvidence|trustEvidence|dataPolicyEvidence|compatibilityEvidence|storageEvidence/,
  'The transactional Model Library tracer must consume admitted declarations instead of caller-supplied evidence conclusions.'
)
assert.match(
  transactionalSource,
  /readonly catalog: AdmittedModelCatalog/,
  'The Model Library tracer constructor must require the opaque admitted Catalog capability.'
)
assert.equal(
  barrelSource.trim(),
  "export * from './model-library'",
  'The Module barrel must expose the Interface without exporting its tracer Implementation.'
)
const filesystemImporters: string[] = []
const sqliteImporters: string[] = []
for (const sourcePath of await sourceFilesUnder(moduleRoot)) {
  const source = await fs.readFile(sourcePath, 'utf8')
  if (/from ['"](?:node:)?fs(?:\/promises)?['"]/.test(source)) {
    filesystemImporters.push(sourcePath.split(path.sep).join('/'))
  }
  if (/from ['"]better-sqlite3['"]/.test(source)) {
    sqliteImporters.push(sourcePath.split(path.sep).join('/'))
  }
}
assert.deepEqual(filesystemImporters.sort(), [
  `${moduleRoot}/model-artifact-format-validation.internal.ts`,
  `${moduleRoot}/model-storage-authority.internal.ts`,
  `${moduleRoot}/model-storage-root-registry.internal.ts`,
  `${moduleRoot}/transactional-model-library.internal.ts`
])
assert.deepEqual(
  sqliteImporters.sort(),
  [
    `${moduleRoot}/model-storage-authority.internal.ts`,
    `${moduleRoot}/model-storage-root-registry.internal.ts`
  ],
  'Only the isolated Storage Authority and Root Registry implementations may own SQLite Adapters.'
)

const storageAuthorityInterfaceBody = storageAuthoritySource.match(
  /export interface ModelStorageAuthority \{(?<body>[\s\S]*?)\n\}/
)?.groups?.body ?? ''
assert.deepEqual(
  [...storageAuthorityInterfaceBody.matchAll(/^\s{2}([a-z][A-Za-z]+)\(/gm)]
    .map((match) => match[1]),
  ['provision', 'open'],
  'Storage authority must hide inspection, locking and recovery behind two intention-level entries.'
)
const storageSessionInterfaceBody = storageAuthoritySource.match(
  /export interface ModelStorageSession \{(?<body>[\s\S]*?)\n\}/
)?.groups?.body ?? ''
assert.deepEqual(
  [...storageSessionInterfaceBody.matchAll(/^\s{2}([a-z][A-Za-z]+)\(/gm)]
    .map((match) => match[1]),
  ['close'],
  'A successful session exposes only the ModelLibrary capability and idempotent close lifecycle.'
)
assert.doesNotMatch(
  `${interfaceSource}\n${barrelSource}\n${storageAuthorityInterfaceBody}\n${storageSessionInterfaceBody}`,
  /tracerOnly|writeAuthorityStillHeld|rollbackOwned|sqlite|rootDirectory/i,
  'Fault setup, write checkpoints, rollback receipts, SQLite and locators must not enter product Interfaces or the Module barrel.'
)
const storageRootRegistryInterfaceBody = storageRootRegistrySource.match(
  /export interface ModelStorageRootRegistry \{(?<body>[\s\S]*?)\n\}/
)?.groups?.body ?? ''
assert.deepEqual(
  [...new Set(
    [...storageRootRegistryInterfaceBody.matchAll(/^\s{2}([a-z][A-Za-z]+)\(/gm)]
      .map((match) => match[1])
  )],
  ['summarize', 'open'],
  'The device-local Root Registry must hide persistence, identity and Authority composition behind summarize/open.'
)
assert.doesNotMatch(
  `${interfaceSource}\n${barrelSource}\n${storageRootRegistryInterfaceBody}`,
  /tracerOnly|controlDirectory|rootDirectory|trustedLocator|better-sqlite3|sqlite|fault/i,
  'Registry fault setup, filesystem locations, trusted locators and SQLite details must not enter product Interfaces or the Module barrel.'
)
assert.match(
  storageRootRegistryImplementationSource,
  /createModelStorageAuthorityTracer/,
  'Candidate review and current-root open must remain composed through the existing Storage Authority.'
)
assert.match(
  storageAuthorityImplementationSource,
  /createOwnedProvisionFile[\s\S]*['"]wx['"][\s\S]*ownedProvisionNodeMatches/,
  'Provisioning must exclusively create and identity-bind its owned files before rollback may remove them.'
)
assert.doesNotMatch(
  storageAuthorityImplementationSource,
  /cleanupFailedProvision|recursive:\s*true/,
  'Provision rollback must remove only identity-matched owned nodes, never recurse through a collided target.'
)
assert.doesNotMatch(
  storageAuthorityImplementationSource,
  /\b(?:pid|processId|timestamp|stealLock|breakLock|forceUnlock|staleLock)\b/i,
  'Writer ownership must not be stolen using process identity, elapsed time or stale-lock deletion.'
)

assert.match(readmeSource, /Validated Tracer/)
assert.match(readmeSource, /not connected\s+to\s+the production composition root/i)
assert.match(readmeSource, /does not read\s+or install real user model\/cache data/i)

const admissionInterfaceBody = admissionSource.match(
  /export interface ModelCatalogAdmission \{(?<body>[\s\S]*?)\n\}/
)?.groups?.body ?? ''
assert.deepEqual(
  [...admissionInterfaceBody.matchAll(/^\s{2}([a-z][A-Za-z]+)\(/gm)].map((match) => match[1]),
  ['admit'],
  'Catalog admission must remain one-entry and hide verification orchestration.'
)
assert.doesNotMatch(
  admissionSource,
  /export (?:interface AdmittedModelCatalog(?:Artifact)?Record|function inspectAdmittedModelCatalog)/,
  'Catalog records and their reader must remain inside the Module implementation, not widen the admission Interface.'
)
assert.doesNotMatch(
  admissionImplementationSource,
  /export function (?:register|issue|mint)AdmittedModelCatalog/,
  'No deep importer may receive raw authority to mint an admitted Catalog capability.'
)
assert.match(admissionImplementationSource, /new WeakMap<object, AdmittedModelCatalogRecord>/)
assert.match(
  admissionImplementationSource,
  /function readExactDataRecord[\s\S]*Object\.getOwnPropertyDescriptors[\s\S]*Object\.fromEntries/,
  'Untrusted records must be normalized from one data-descriptor snapshot.'
)
assert.match(
  admissionImplementationSource,
  /function readExactDataArray[\s\S]*Object\.getOwnPropertyDescriptors[\s\S]*descriptor\.value/,
  'Untrusted declared sets must be normalized from one element-descriptor snapshot.'
)
assert.match(
  admissionImplementationSource,
  /admittedCatalogRecords\.set\(catalog,/,
  'Admission must mint the opaque capability only inside its lexical implementation scope.'
)
assert.match(
  transactionalImplementationSource,
  /readAdmittedModelCatalog/,
  'The sibling library implementation must consume the opaque capability through the private Module mechanism.'
)
const admittedCatalogInternalImporters: string[] = []
const admittedCatalogInternalImportPattern =
  /from\s*['"][^'"]*model-catalog-admission\.internal(?:\.[cm]?[jt]s)?['"]/i
for (const forbiddenSample of [
  'from "./model-catalog-admission.internal"',
  "from './model-catalog-admission.internal.js'",
  "from '../model-library/model-catalog-admission.internal'"
]) {
  assert.match(forbiddenSample, admittedCatalogInternalImportPattern)
}
for (const sourcePath of await sourceFilesUnder(moduleRoot)) {
  if (sourcePath.endsWith('/model-catalog-admission.internal.ts')) continue
  const source = await fs.readFile(sourcePath, 'utf8')
  if (admittedCatalogInternalImportPattern.test(source)) {
    admittedCatalogInternalImporters.push(sourcePath.split(path.sep).join('/'))
  }
}
assert.deepEqual(
  admittedCatalogInternalImporters.sort(),
  [
    `${moduleRoot}/model-catalog-admission.tracer.ts`,
    `${moduleRoot}/transactional-model-library.internal.ts`
  ],
  'Only the public admission construction wrapper and sibling library consumer may import the private implementation.'
)
assert.doesNotMatch(
  barrelSource,
  /admission|tracer|AdmittedModelCatalog/i,
  'Opaque admission capabilities and tracer Implementations must remain outside the Module barrel.'
)

const productionSourceFiles = [
  ...(await sourceFilesUnder('src')),
  ...(await sourceFilesUnder('ai-service'))
].filter((sourcePath) => {
  const repoPath = sourcePath.split(path.sep).join('/')
  return ![
    `${moduleRoot}/`,
    'src/main/extensions/photoshow/',
    'ai-service/tests/'
  ].some((excludedRoot) => repoPath.startsWith(excludedRoot))
})
const productionConnectionPattern =
  /(?:(?:from|import\s*\(|require\s*\()\s*['"][^'"]*model-library(?:\/[^'"]*)?['"]|import\s*['"][^'"]*model-library(?:\/[^'"]*)?['"]|model-library:)/i
const allowedProductionConnectionImporters = new Set([
  'src/main/model-library-workspace/bundled-official-model-catalog.internal.ts',
  'src/main/model-library-workspace/model-library-storage-port.internal.ts',
  'src/main/model-library-workspace/model-library-workspace.ts'
])

for (const forbiddenSample of [
  "import { ModelLibrary } from './model-library'",
  "import('./model-library/transactional-model-library.tracer')",
  "import('./model-library/transactional-model-library.internal')",
  "import('./model-library/model-artifact-format-validation.internal')",
  "import('./model-library/model-storage-authority.tracer')",
  "import('./model-library/model-storage-authority.internal')",
  "import('./model-library/model-storage-root-registry.tracer')",
  "import('./model-library/model-storage-root-registry.internal')",
  "import('./model-library/model-catalog-admission.tracer')",
  "require('./model-library/model-library')",
  "ipcMain.handle('model-library:install', handler)"
]) {
  assert.match(
    forbiddenSample,
    productionConnectionPattern,
    `The isolation guard must recognize: ${forbiddenSample}`
  )
}

for (const sourcePath of productionSourceFiles) {
  const source = await fs.readFile(sourcePath, 'utf8')
  const repoPath = sourcePath.split(path.sep).join('/')
  if (allowedProductionConnectionImporters.has(repoPath)) {
    assert.match(
      source,
      productionConnectionPattern,
      `${sourcePath} must remain an explicit, reviewed Workspace composition importer.`
    )
    continue
  }
  assert.doesNotMatch(
    source,
    productionConnectionPattern,
    `${sourcePath} must not connect the Model Library tracer to a production seam.`
  )
}

const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8')) as {
  scripts?: Record<string, string>
}
assert.equal(
  packageJson.scripts?.['test-model-library-catalog-admission-tracer'],
  'node scripts/run-ts-test.mjs scripts/model-library-catalog-admission.tracer.test.ts'
)
assert.equal(
  packageJson.scripts?.['test-model-library-core-tracer'],
  'node scripts/run-ts-test.mjs scripts/model-library-core-tracer.test.ts'
)
assert.equal(
  packageJson.scripts?.['test-model-library-verified-blob-store-tracer'],
  'node scripts/run-ts-test.mjs scripts/model-library-verified-blob-store.tracer.test.ts'
)
assert.equal(
  packageJson.scripts?.['test-model-library-storage-authority-tracer'],
  'node scripts/run-electron-node-test.mjs scripts/model-library-storage-authority.tracer.test.ts'
)
assert.equal(
  packageJson.scripts?.['test-model-library-root-registry-tracer'],
  'node scripts/run-electron-node-test.mjs scripts/model-library-root-registry.tracer.test.ts'
)
assert.equal(
  packageJson.scripts?.['test-model-library-core-governance'],
  'node scripts/run-ts-test.mjs scripts/model-library-core-governance.test.ts'
)
assert.match(
  packageJson.scripts?.['ci:test-runtime-safety'] ?? '',
  /test-model-library-core-tracer && npm run test-model-library-verified-blob-store-tracer && npm run test-model-library-storage-authority-tracer && npm run test-model-library-root-registry-tracer && npm run test-model-library-product-pilot && npm run test-model-library-product-pilot-storage && npm run test-official-model-catalog-release-gate && npm run test-official-model-catalog-release-evidence && npm run test-official-model-catalog-release-preparation && npm run test-official-model-catalog-release-preparation-cli && npm run test-official-model-catalog-release-preparation-safety && npm run test-official-model-catalog-release-preparation-governance && npm run test-model-library-core-governance/
)

console.log('model-library-core-governance passed')

async function sourceFilesUnder(directory: string): Promise<string[]> {
  const entries = await fs.readdir(directory, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...await sourceFilesUnder(entryPath))
    } else if (/\.(?:ts|tsx|js|mjs|py)$/.test(entry.name)) {
      files.push(entryPath)
    }
  }
  return files
}
