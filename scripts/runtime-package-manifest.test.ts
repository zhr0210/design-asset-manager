import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { sampleRuntimePackageManifest } from '../src/main/runtime-package/fixtures/sample-runtime-package-manifest'
import {
  getRuntimePackageManifestSchemaVersion,
  validateRuntimePackageManifest,
  validateSha256Format
} from '../src/main/runtime-package/runtime-package-manifest.validator'
import {
  explainPackageSelection,
  selectPackagesForRuntimeProfile
} from '../src/main/runtime-package/runtime-package-resolver'

assert.equal(getRuntimePackageManifestSchemaVersion(), 1)
assert.equal(validateRuntimePackageManifest(sampleRuntimePackageManifest).valid, true)
assert.equal(validateRuntimePackageManifest({ ...sampleRuntimePackageManifest, schemaVersion: 999 }).valid, false)

const invalidShaManifest = {
  ...sampleRuntimePackageManifest,
  packages: [{ ...sampleRuntimePackageManifest.packages[0], sha256: 'not-a-sha' }]
}
assert.equal(validateRuntimePackageManifest(invalidShaManifest).valid, false)
assert.equal(validateSha256Format('b'.repeat(64)), true)
assert.equal(validateSha256Format('bad'), false)

const windowsCpu = selectPackagesForRuntimeProfile(sampleRuntimePackageManifest, {
  profileId: 'windows-cpu',
  platform: 'win32',
  arch: 'x64',
  capabilities: ['runtime-package', 'local-ai-worker']
})
assert.ok(windowsCpu.requiredPackages.some((pkg) => pkg.id === 'ai-worker-core'))
assert.equal(windowsCpu.requiredPackages.some((pkg) => pkg.id === 'disabled-runtime'), false)
assert.equal(windowsCpu.optionalPackages.some((pkg) => pkg.id === 'deprecated-runtime'), false)
assert.equal(windowsCpu.optionalPackages.some((pkg) => pkg.id === 'experimental-runtime'), false)

const windowsCpuExperimental = selectPackagesForRuntimeProfile(sampleRuntimePackageManifest, {
  profileId: 'windows-cpu',
  platform: 'win32',
  arch: 'x64',
  capabilities: ['runtime-package'],
  includeExperimental: true
})
assert.equal(windowsCpuExperimental.optionalPackages.some((pkg) => pkg.id === 'experimental-runtime'), true)

const windowsCuda = selectPackagesForRuntimeProfile(sampleRuntimePackageManifest, {
  profileId: 'windows-nvidia-cuda',
  platform: 'win32',
  arch: 'x64',
  capabilities: ['runtime-package', 'gpu-acceleration']
})
assert.equal(windowsCuda.recommendedPackages.some((pkg) => pkg.id === 'cuda-runtime-hint'), true)
assert.equal(windowsCuda.requiredPackages.some((pkg) => pkg.id === 'ai-worker-core'), true)
assert.ok(windowsCuda.warnings.some((warning) => warning.includes('conflicts')))

const macosApple = selectPackagesForRuntimeProfile(sampleRuntimePackageManifest, {
  profileId: 'macos-apple-silicon',
  platform: 'darwin',
  arch: 'arm64',
  capabilities: ['gpu-acceleration']
})
assert.equal(macosApple.recommendedPackages.some((pkg) => pkg.id === 'metal-runtime-hint'), true)

const macosIntel = selectPackagesForRuntimeProfile(sampleRuntimePackageManifest, {
  profileId: 'macos-intel',
  platform: 'darwin',
  arch: 'x64',
  capabilities: ['ocr']
})
assert.equal(macosIntel.optionalPackages.some((pkg) => pkg.id === 'cpu-ocr-runtime'), true)

const externalOnly = selectPackagesForRuntimeProfile(sampleRuntimePackageManifest, {
  profileId: 'external-inference-only',
  platform: 'linux',
  arch: 'x64',
  capabilities: ['external-inference']
})
assert.equal(externalOnly.requiredPackages.some((pkg) => pkg.id === 'external-inference-config'), true)

const missingDependencyManifest = {
  ...sampleRuntimePackageManifest,
  packages: sampleRuntimePackageManifest.packages.filter((pkg) => pkg.id !== 'ai-worker-core')
}
const missingDependencySelection = selectPackagesForRuntimeProfile(missingDependencyManifest, {
  profileId: 'windows-nvidia-cuda',
  platform: 'win32',
  arch: 'x64',
  capabilities: ['gpu-acceleration']
})
assert.ok(missingDependencySelection.blockingIssues.some((issue) => issue.includes('ai-worker-core')))
assert.match(explainPackageSelection(sampleRuntimePackageManifest, {
  profileId: 'windows-cpu',
  platform: 'win32',
  arch: 'x64',
  capabilities: []
}), /required/)

const resolverSource = await fs.readFile('src/main/runtime-package/runtime-package-resolver.ts', 'utf8')
assert.doesNotMatch(resolverSource, /download\w*\s*\(/i)
assert.doesNotMatch(resolverSource, /install\w*\s*\(/i)
assert.doesNotMatch(resolverSource, /extract\w*\s*\(/i)
assert.doesNotMatch(resolverSource, /startServer|startWorker|runPromptReverse|AI Worker/i)

const validatorSource = await fs.readFile('src/main/runtime-package/runtime-package-manifest.validator.ts', 'utf8')
assert.doesNotMatch(validatorSource, /from 'node:fs'|from "node:fs"|from 'fs'|from "fs"/)
assert.doesNotMatch(validatorSource, /from 'node:http'|from "node:http"|fetch\(/)
