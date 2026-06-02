import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { sampleRuntimePackageManifest } from '../src/main/runtime-package/fixtures/sample-runtime-package-manifest'
import { MockRuntimePackageDownloader } from '../src/main/runtime-package/runtime-package-downloader'
import { createLocalRuntimePackageSource } from '../src/main/runtime-package/runtime-package-source'
import {
  MockRuntimePackageExtractor,
  createRuntimePackageRollbackPlan,
  verifyMockDownloadedPackage
} from '../src/main/runtime-package/runtime-package-verifier'

const entry = sampleRuntimePackageManifest.packages.find((pkg) => pkg.id === 'ai-worker-core')
assert.ok(entry)

const downloader = new MockRuntimePackageDownloader()
const source = createLocalRuntimePackageSource('local-source', 'fixtures/runtime-packages')
const downloadPlan = downloader.createPlan(entry, source, 'dist-temp/runtime-packages/ai-worker-core.zip')

const passed = verifyMockDownloadedPackage(downloadPlan, entry.sha256)
assert.equal(passed.status, 'passed')
assert.equal(passed.blockingIssues.length, 0)

const failed = verifyMockDownloadedPackage(downloadPlan, '0'.repeat(64))
assert.equal(failed.status, 'blocked')
assert.ok(failed.blockingIssues.some((issue) => issue.includes('checksum mismatch')))

const extractor = new MockRuntimePackageExtractor()
const extractRoot = path.resolve('dist-temp/runtime-extract')
const targetDirectory = path.join(extractRoot, 'ai-worker-core')
const extractPlan = extractor.createPlan(entry.id, downloadPlan.destinationPath, extractRoot, targetDirectory)
assert.equal(extractPlan.dryRun, true)
assert.equal(extractPlan.blockingIssues.length, 0)
assert.equal(extractPlan.rollbackPlan.registryRestoreRequired, true)
assert.ok(extractPlan.rollbackPlan.removePaths.includes(path.normalize(targetDirectory)))

const progress = await extractor.dryRun(extractPlan)
assert.deepEqual(progress.map((item) => item.status), ['planned', 'completed'])
assert.equal(progress.at(-1)?.percent, 100)

const escapePlan = extractor.createPlan(entry.id, downloadPlan.destinationPath, extractRoot, path.resolve('dist-temp/outside-runtime'))
assert.ok(escapePlan.blockingIssues.some((issue) => issue.includes('inside extractRoot')))
const escapeProgress = await extractor.dryRun(escapePlan)
assert.equal(escapeProgress[0].status, 'blocked')

const rollback = createRuntimePackageRollbackPlan(entry.id, targetDirectory)
assert.equal(rollback.packageId, entry.id)
assert.equal(rollback.registryRestoreRequired, true)

const manifest = JSON.parse(await fs.readFile('.codeindex/runtime-package-verifier-extractor.json', 'utf8')) as {
  realExtraction?: boolean
  fileWrites?: boolean
  packageScripts?: boolean
  safeExtractRootRequired?: boolean
  rollbackPlanRequired?: boolean
}
assert.equal(manifest.realExtraction, false)
assert.equal(manifest.fileWrites, false)
assert.equal(manifest.packageScripts, false)
assert.equal(manifest.safeExtractRootRequired, true)
assert.equal(manifest.rollbackPlanRequired, true)

const sourceFile = await fs.readFile('src/main/runtime-package/runtime-package-verifier.ts', 'utf8')
assert.doesNotMatch(sourceFile, /createHash|createReadStream|readFile|writeFile|createWriteStream|mkdir|rm\(/)
assert.doesNotMatch(sourceFile, /spawn\s*\(|execFile\s*\(/)
assert.doesNotMatch(sourceFile, /extract\w*\s*\(/i)

const doc = await fs.readFile('docs/platform/RUNTIME_PACKAGE_VERIFIER_EXTRACTOR.md', 'utf8')
assert.match(doc, /safe extract root/i)
assert.match(doc, /rollback plan/i)
assert.match(doc, /Phase 10D/)
