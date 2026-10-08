import assert from 'node:assert/strict'
Object.defineProperty(process, 'platform', { value: 'win32', configurable: true })
Object.defineProperty(process, 'arch', { value: 'x64', configurable: true })
import fs from 'node:fs/promises'
import path from 'node:path'
import type { DoctorReport } from '../src/shared/types/doctor.types'
import type { ManagedPaths } from '../src/shared/types/platform.types'
import { BootstrapManager } from '../src/main/bootstrap/bootstrap-manager'
import { resolveBootstrapPackagePlan } from '../src/main/bootstrap/bootstrap-package-plan-resolver'
import { RuntimeRegistryService } from '../src/main/bootstrap/runtime-registry.service'
import { sampleRuntimePackageManifest } from '../src/main/runtime-package/fixtures/sample-runtime-package-manifest'
import { resolveRuntimeProfileRecommendation } from '../src/main/runtime/runtime-profile-resolver'

function reportWith(checks: DoctorReport['checks'], platform: DoctorReport['platform'] = 'win32', arch: DoctorReport['arch'] = 'x64', profile: DoctorReport['profile'] = 'windows-x64'): DoctorReport {
  return {
    id: 'bootstrap-package-plan-test',
    generatedAt: '2026-06-01T00:00:00.000Z',
    platform,
    arch,
    profile,
    overallStatus: checks.some((check) => check.status === 'error') ? 'error' : checks.some((check) => check.status === 'warning') ? 'warning' : 'ok',
    checks
  }
}

function managedPaths(base: string): ManagedPaths {
  return {
    userDataDir: path.join(base, 'user-data'),
    configDir: path.join(base, 'user-data', 'config'),
    databaseDir: path.join(base, 'user-data', 'database'),
    logsDir: path.join(base, 'user-data', 'logs'),
    cacheDir: path.join(base, 'user-data', 'cache'),
    runtimeDir: path.join(base, 'user-data', 'runtime'),
    modelsDir: path.join(base, 'user-data', 'models'),
    tempDir: path.join(base, 'temp'),
    downloadsDir: path.join(base, 'downloads')
  }
}

const okReport = reportWith([
  { id: 'system', label: 'system', status: 'ok', message: 'ok', durationMs: 1 },
  { id: 'path', label: 'path', status: 'ok', message: 'ok', durationMs: 1 },
  { id: 'node', label: 'node', status: 'ok', message: 'ok', durationMs: 1 },
  { id: 'permission', label: 'permission', status: 'ok', message: 'ok', durationMs: 1 }
])

function runtimeRecommendation(profileId: 'windows-cpu' | 'windows-nvidia-cuda' | 'macos-apple-silicon' | 'external-inference-only') {
  return resolveRuntimeProfileRecommendation({
    platformInfo: profileId === 'macos-apple-silicon' ? { platform: 'darwin', arch: 'arm64' } : { platform: 'win32', arch: 'x64' },
    doctorReport: okReport,
    runtimeRegistry: {
      schemaVersion: 1,
      initialized: false,
      platform: profileId === 'macos-apple-silicon' ? 'darwin' : 'win32',
      arch: profileId === 'macos-apple-silicon' ? 'arm64' : 'x64',
      profile: profileId === 'macos-apple-silicon' ? 'macos-apple-silicon' : 'windows-x64',
      createdAt: '2026-06-01T00:00:00.000Z',
      updatedAt: '2026-06-01T00:00:00.000Z',
      initializedAt: null,
      lastDoctorRunAt: null,
      lastDoctorStatus: null,
      selectedProfileId: null,
      recommendedProfileId: null,
      paths: { registryPath: '', runtimeDir: '', modelsDir: '', cacheDir: '', logsDir: '', databaseDir: '' },
      packages: [],
      models: [],
      warnings: [],
      metadata: profileId === 'windows-nvidia-cuda' ? { nvidiaGpu: true } : {}
    },
    userPreference: profileId === 'external-inference-only' ? 'external-inference-only' : undefined,
    hardwareHints: { nvidiaGpu: profileId === 'windows-nvidia-cuda' }
  })
}

const windowsCpuPlan = resolveBootstrapPackagePlan({
  manifest: sampleRuntimePackageManifest,
  recommendation: runtimeRecommendation('windows-cpu'),
  platform: 'win32',
  arch: 'x64',
  capabilities: []
})
assert.equal(windowsCpuPlan.requiredPackages.some((pkg) => pkg.id === 'ai-worker-core'), true)
assert.equal([...windowsCpuPlan.requiredPackages, ...windowsCpuPlan.optionalPackages].some((pkg) => pkg.id === 'disabled-runtime'), false)
assert.equal(windowsCpuPlan.optionalPackages.some((pkg) => pkg.id === 'deprecated-runtime'), false)
assert.equal(windowsCpuPlan.optionalPackages.some((pkg) => pkg.id === 'experimental-runtime'), false)

const windowsCpuExperimentalPlan = resolveBootstrapPackagePlan({
  manifest: sampleRuntimePackageManifest,
  recommendation: runtimeRecommendation('windows-cpu'),
  platform: 'win32',
  arch: 'x64',
  capabilities: [],
  includeExperimental: true
})
assert.equal(windowsCpuExperimentalPlan.optionalPackages.some((pkg) => pkg.id === 'experimental-runtime'), true)

const cudaPlan = resolveBootstrapPackagePlan({
  manifest: sampleRuntimePackageManifest,
  recommendation: runtimeRecommendation('windows-nvidia-cuda'),
  platform: 'win32',
  arch: 'x64',
  capabilities: ['gpu-acceleration']
})
assert.equal(cudaPlan.recommendedPackages.some((pkg) => pkg.id === 'cuda-runtime-hint'), true)
assert.equal(cudaPlan.requiredPackages.some((pkg) => pkg.id === 'ai-worker-core'), true)
assert.ok(cudaPlan.warnings.some((warning) => warning.includes('conflicts')))

const metalPlan = resolveBootstrapPackagePlan({
  manifest: sampleRuntimePackageManifest,
  recommendation: runtimeRecommendation('macos-apple-silicon'),
  platform: 'darwin',
  arch: 'arm64',
  capabilities: ['gpu-acceleration']
})
assert.equal(metalPlan.recommendedPackages.some((pkg) => pkg.id === 'metal-runtime-hint'), true)

const externalPlan = resolveBootstrapPackagePlan({
  manifest: sampleRuntimePackageManifest,
  recommendation: runtimeRecommendation('external-inference-only'),
  platform: 'linux',
  arch: 'x64',
  capabilities: ['external-inference']
})
assert.equal(externalPlan.requiredPackages.some((pkg) => pkg.id === 'external-inference-config'), true)

const missingDependencyPlan = resolveBootstrapPackagePlan({
  manifest: {
    ...sampleRuntimePackageManifest,
    packages: sampleRuntimePackageManifest.packages.filter((pkg) => pkg.id !== 'ai-worker-core')
  },
  recommendation: runtimeRecommendation('windows-nvidia-cuda'),
  platform: 'win32',
  arch: 'x64',
  capabilities: ['gpu-acceleration']
})
assert.ok(missingDependencyPlan.blockingIssues.some((issue) => issue.includes('ai-worker-core')))

const base = path.join(process.cwd(), 'dist-temp', 'bootstrap-package-plan-test')
await fs.rm(base, { recursive: true, force: true })
const registryService = new RuntimeRegistryService({ managedPaths: managedPaths(base) })
const manager = new BootstrapManager({
  runtimeRegistryService: registryService,
  doctorService: { async runAll() { return okReport } }
})
const start = await manager.startCheck()
assert.ok(start.recommendation.packagePlan)
assert.equal(start.recommendation.packagePlan?.requiredPackages.some((pkg) => pkg.id === 'ai-worker-core'), true)
assert.equal(start.registry.packages.length, 0)
assert.ok((start.registry.metadata.lastPackagePlan as any)?.requiredPackageIds?.includes('ai-worker-core'))
await manager.confirmLightweightMode()
const completed = await manager.completeBootstrapWithoutInstall()
assert.equal(completed.registry.packages.length, 0)

const managerSource = await fs.readFile('src/main/bootstrap/bootstrap-manager.ts', 'utf8')
assert.doesNotMatch(managerSource, /download\w*\s*\(/i)
assert.doesNotMatch(managerSource, /install(Runtime|Package|Model|Python|Cuda|Dependency)\w*\s*\(/i)
assert.doesNotMatch(managerSource, /extract\w*\s*\(/i)
assert.doesNotMatch(managerSource, /startServer|startWorker|runPromptReverse/i)

const resolverSource = await fs.readFile('src/main/bootstrap/bootstrap-package-plan-resolver.ts', 'utf8')
assert.doesNotMatch(resolverSource, /from 'node:fs'|from "node:fs"|from 'fs'|from "fs"/)
assert.doesNotMatch(resolverSource, /from 'node:http'|from "node:http"|fetch\(/)

await fs.rm(base, { recursive: true, force: true })
