import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { sampleRuntimePackageManifest } from '../src/main/runtime-package/fixtures/sample-runtime-package-manifest'
import { MockRuntimePackageDownloader, createRuntimePackageChecksumPlan } from '../src/main/runtime-package/runtime-package-downloader'
import {
  createLocalRuntimePackageSource,
  createReservedRemoteRuntimePackageSource
} from '../src/main/runtime-package/runtime-package-source'

const entry = sampleRuntimePackageManifest.packages.find((pkg) => pkg.id === 'ai-worker-core')
assert.ok(entry)

const downloader = new MockRuntimePackageDownloader()
const localSource = createLocalRuntimePackageSource('local-source', 'fixtures/runtime-packages')
const plan = downloader.createPlan(entry, localSource, 'dist-temp/runtime-packages/ai-worker-core.zip')

assert.equal(plan.packageId, entry.id)
assert.equal(plan.sourceId, localSource.id)
assert.equal(plan.dryRun, true)
assert.equal(plan.blockingIssues.length, 0)
assert.equal(plan.checksum.algorithm, 'sha256')
assert.equal(plan.checksum.verificationRequired, true)
assert.equal(plan.checksum.blockingIssues.length, 0)

const progress = await downloader.dryRun(plan)
assert.deepEqual(progress.map((item) => item.status), ['planned', 'progress', 'completed'])
assert.equal(progress.at(-1)?.percent, 100)
assert.equal(progress.at(-1)?.downloadedBytes, entry.sizeBytes)

const invalidChecksumPlan = createRuntimePackageChecksumPlan({ ...entry, sha256: 'bad' })
assert.ok(invalidChecksumPlan.blockingIssues.some((issue) => issue.includes('invalid sha256')))

const remoteSource = createReservedRemoteRuntimePackageSource('remote-source', 'https://example.invalid/package.zip')
const remotePlan = downloader.createPlan(entry, remoteSource, 'dist-temp/runtime-packages/remote.zip')
const remoteProgress = await downloader.dryRun(remotePlan)
assert.equal(remoteProgress[0].status, 'blocked')
assert.match(remoteProgress[0].message, /reserved remote/)

const emptyDestinationPlan = downloader.createPlan(entry, localSource, '')
assert.ok(emptyDestinationPlan.blockingIssues.some((issue) => issue.includes('destinationPath')))

const manifest = JSON.parse(await fs.readFile('.codeindex/runtime-package-downloader.json', 'utf8')) as {
  realDownloads?: boolean
  fileWrites?: boolean
  networkAccess?: boolean
  artifacts?: string[]
}
assert.equal(manifest.realDownloads, false)
assert.equal(manifest.fileWrites, false)
assert.equal(manifest.networkAccess, false)
assert.ok(manifest.artifacts?.includes('MockRuntimePackageDownloader'))

const source = await fs.readFile('src/main/runtime-package/runtime-package-downloader.ts', 'utf8')
assert.doesNotMatch(source, /\bfetch\s*\(/)
assert.doesNotMatch(source, /node:http|node:https|from 'http'|from "http"|from 'https'|from "https"/)
assert.doesNotMatch(source, /writeFile|createWriteStream|appendFile|mkdir|rm\(/)
assert.doesNotMatch(source, /spawn\s*\(|execFile\s*\(/)

const doc = await fs.readFile('docs/platform/RUNTIME_PACKAGE_DOWNLOADER.md', 'utf8')
assert.match(doc, /MockRuntimePackageDownloader/)
assert.match(doc, /does not download real files/)
assert.match(doc, /Phase 10C/)
