import assert from 'node:assert/strict'
import fs from 'node:fs/promises'

type NativePackagingManifest = {
  runsPackaging?: boolean
  nativeDependencies?: Array<{ name?: string; asarUnpackPattern?: string; requiresAsarUnpack?: boolean }>
  pathChecks?: { preloadEntryPoints?: string[]; sqlitePathUsesManagedDatabaseDir?: boolean; userDataPathUsesElectronUserData?: boolean }
  packagingConfigRequired?: {
    asar?: boolean
    publish?: unknown
    macIdentity?: unknown
    extraResourcesIncludesAiService?: boolean
    aiServiceModelsExcluded?: boolean
  }
}

const manifest = JSON.parse(await fs.readFile('.codeindex/native-dependency-packaging.json', 'utf8')) as NativePackagingManifest
const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8')) as {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  build?: {
    asar?: boolean
    asarUnpack?: string[]
    publish?: unknown
    mac?: { identity?: unknown }
    extraResources?: Array<{ from?: string; to?: string; filter?: string[] }>
  }
}
const electronViteConfig = await fs.readFile('electron.vite.config.ts', 'utf8')
const pathResolver = await fs.readFile('src/main/platform/path-resolver.ts', 'utf8')
const dbIndex = await fs.readFile('src/main/db/index.ts', 'utf8')
const doc = await fs.readFile('docs/platform/NATIVE_DEPENDENCY_PACKAGING.md', 'utf8')

assert.equal(manifest.runsPackaging, false)
assert.equal(packageJson.build?.asar, manifest.packagingConfigRequired?.asar)
assert.equal(packageJson.build?.publish, manifest.packagingConfigRequired?.publish)
assert.equal(packageJson.build?.mac?.identity, manifest.packagingConfigRequired?.macIdentity)

for (const dependency of manifest.nativeDependencies ?? []) {
  assert.ok(dependency.name, 'Native dependency name is required')
  assert.ok(packageJson.dependencies?.[dependency.name], `${dependency.name} must be in dependencies`)
  assert.equal(packageJson.devDependencies?.[dependency.name], undefined, `${dependency.name} must not be dev-only`)
  assert.equal(dependency.requiresAsarUnpack, true)
  assert.ok(packageJson.build?.asarUnpack?.includes(dependency.asarUnpackPattern ?? ''))
  assert.match(doc, new RegExp(dependency.name))
}

for (const preloadEntry of manifest.pathChecks?.preloadEntryPoints ?? []) {
  assert.match(electronViteConfig, new RegExp(preloadEntry.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
}

assert.match(pathResolver, /userData/)
assert.match(pathResolver, /databaseDir:\s*path\.join\(userDataDir,\s*'database'\)/)
assert.match(dbIndex, /homedir\(\)/)
assert.match(dbIndex, /DesignAssetManager/)
assert.equal(manifest.pathChecks?.sqlitePathUsesManagedDatabaseDir, false)
assert.equal(manifest.pathChecks?.userDataPathUsesElectronUserData, false)
assert.match(doc, /known packaging-path gap/i)
assert.match(doc, /Phase 13/)

const aiServiceResource = packageJson.build?.extraResources?.find((resource) => resource.from === 'ai-service')
assert.ok(aiServiceResource)
assert.equal(aiServiceResource?.to, 'ai-service')
assert.ok(aiServiceResource?.filter?.some((f) => f.includes('!**/models/**/*.onnx') || f.includes('!**/models/**/*.safetensors')))
assert.ok(aiServiceResource?.filter?.includes('!**/.venv/**'))
assert.ok(aiServiceResource?.filter?.includes('!**/__pycache__/**'))

const combined = [JSON.stringify(packageJson.build), JSON.stringify(manifest), doc].join('\n')
assert.doesNotMatch(combined, /C:\\Users\\[A-Za-z0-9_.-]+/i)
assert.doesNotMatch(combined, /\/Users\/[A-Za-z0-9_.-]+/)
assert.doesNotMatch(combined, /\b(curl|wget|pip install|python -m pip)\b/i)
