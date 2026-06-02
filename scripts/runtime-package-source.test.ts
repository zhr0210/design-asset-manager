import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import {
  createBundledRuntimePackageSource,
  createLocalRuntimePackageSource,
  createReservedRemoteRuntimePackageSource,
  resolveRuntimePackageSources
} from '../src/main/runtime-package/runtime-package-source'

const local = createLocalRuntimePackageSource('local-fixtures', 'fixtures/runtime-packages')
const bundled = createBundledRuntimePackageSource('bundled-sample', 'resources/runtime-packages/sample.json')
const remote = createReservedRemoteRuntimePackageSource('remote-reserved', 'https://example.invalid/runtime-packages.json')

assert.equal(local.type, 'local')
assert.equal(local.enabled, true)
assert.equal(local.networkAccess, 'never')
assert.equal(local.access, 'filesystem')

assert.equal(bundled.type, 'bundled')
assert.equal(bundled.enabled, true)
assert.equal(bundled.trusted, true)
assert.equal(bundled.networkAccess, 'never')

assert.equal(remote.type, 'remote')
assert.equal(remote.enabled, false)
assert.equal(remote.networkAccess, 'reserved')
assert.equal(remote.access, 'reserved-remote')

const resolution = resolveRuntimePackageSources([local, bundled, remote])
assert.equal(resolution.activeSources.length, 2)
assert.equal(resolution.reservedRemoteSources.length, 1)
assert.equal(resolution.blockingIssues.length, 0)
assert.ok(resolution.warnings.length >= 2)

const invalidRemote = { ...remote, enabled: true }
const invalidResolution = resolveRuntimePackageSources([invalidRemote])
assert.ok(invalidResolution.blockingIssues.some((issue) => issue.includes('must remain disabled')))

const manifest = JSON.parse(await fs.readFile('.codeindex/runtime-package-source.json', 'utf8')) as {
  networkAccess?: boolean
  sourceTypes?: Array<{ type?: string; enabled?: boolean; downloads?: boolean }>
}
assert.equal(manifest.networkAccess, false)
assert.equal(manifest.sourceTypes?.find((source) => source.type === 'remote')?.enabled, false)
assert.equal(manifest.sourceTypes?.every((source) => source.downloads === false), true)

const sourceFile = await fs.readFile('src/main/runtime-package/runtime-package-source.ts', 'utf8')
assert.doesNotMatch(sourceFile, /\bfetch\s*\(/)
assert.doesNotMatch(sourceFile, /node:http|node:https|from 'http'|from "http"|from 'https'|from "https"/)
assert.doesNotMatch(sourceFile, /readFile|writeFile|createReadStream|createWriteStream/)
assert.doesNotMatch(sourceFile, /download\w*\s*\(|extract\w*\s*\(|install\w*\s*\(|spawn\s*\(|execFile\s*\(/)

const doc = await fs.readFile('docs/platform/RUNTIME_PACKAGE_SOURCE.md', 'utf8')
assert.match(doc, /local/)
assert.match(doc, /bundled/)
assert.match(doc, /remote/)
assert.match(doc, /Phase 10B/)
