import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import type { DoctorReport } from '../src/shared/types/doctor.types'
import type { RuntimeRegistry } from '../src/shared/types/runtime-registry.types'
import type { RuntimeProfileId } from '../src/shared/types/runtime-profile.types'
import { resolveBootstrapRecommendation } from '../src/main/bootstrap/bootstrap-profile-resolver'
import { getFallbackProfile, listRuntimeProfiles } from '../src/main/runtime/runtime-profile-registry'
import { resolveRuntimeProfileRecommendation } from '../src/main/runtime/runtime-profile-resolver'

function reportWith(checks: DoctorReport['checks']): DoctorReport {
  return {
    id: 'runtime-profile-test-report',
    generatedAt: '2026-06-01T00:00:00.000Z',
    platform: 'win32',
    arch: 'x64',
    profile: 'windows-x64',
    overallStatus: checks.some((check) => check.status === 'error') ? 'error' : checks.some((check) => check.status === 'warning') ? 'warning' : 'ok',
    checks
  }
}

function registry(profileId: RuntimeProfileId | null = null): RuntimeRegistry {
  return {
    schemaVersion: 1,
    initialized: false,
    platform: 'win32',
    arch: 'x64',
    profile: 'windows-x64',
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
    initializedAt: null,
    lastDoctorRunAt: null,
    lastDoctorStatus: null,
    selectedProfileId: profileId,
    recommendedProfileId: profileId,
    paths: {
      registryPath: 'runtime-registry.json',
      runtimeDir: 'runtime',
      modelsDir: 'models',
      cacheDir: 'cache',
      logsDir: 'logs',
      databaseDir: 'database'
    },
    packages: [],
    models: [],
    warnings: [],
    metadata: {}
  }
}

const okReport = reportWith([
  { id: 'system', label: 'system', status: 'ok', message: 'ok', durationMs: 1 },
  { id: 'path', label: 'path', status: 'ok', message: 'ok', durationMs: 1 },
  { id: 'node', label: 'node', status: 'ok', message: 'ok', durationMs: 1 },
  { id: 'permission', label: 'permission', status: 'ok', message: 'ok', durationMs: 1 }
])

assert.equal(listRuntimeProfiles().length, 5)

const windowsNvidia = resolveRuntimeProfileRecommendation({
  platformInfo: { platform: 'win32', arch: 'x64' },
  doctorReport: okReport,
  runtimeRegistry: registry(),
  hardwareHints: { nvidiaGpu: true }
})
assert.equal(windowsNvidia.recommendedProfileId, 'windows-nvidia-cuda')

const windowsCpu = resolveRuntimeProfileRecommendation({
  platformInfo: { platform: 'win32', arch: 'x64' },
  doctorReport: okReport,
  runtimeRegistry: registry()
})
assert.equal(windowsCpu.recommendedProfileId, 'windows-cpu')

assert.equal(resolveRuntimeProfileRecommendation({
  platformInfo: { platform: 'darwin', arch: 'arm64' },
  doctorReport: okReport,
  runtimeRegistry: { ...registry(), platform: 'darwin', arch: 'arm64', profile: 'macos-apple-silicon' }
}).recommendedProfileId, 'macos-apple-silicon')

assert.equal(resolveRuntimeProfileRecommendation({
  platformInfo: { platform: 'darwin', arch: 'x64' },
  doctorReport: okReport,
  runtimeRegistry: { ...registry(), platform: 'darwin', arch: 'x64', profile: 'macos-intel' }
}).recommendedProfileId, 'macos-intel')

assert.equal(resolveRuntimeProfileRecommendation({
  platformInfo: { platform: 'win32', arch: 'x64' },
  doctorReport: okReport,
  runtimeRegistry: registry(),
  userPreference: 'external-inference-only'
}).recommendedProfileId, 'external-inference-only')

const blocking = resolveRuntimeProfileRecommendation({
  platformInfo: { platform: 'win32', arch: 'x64' },
  doctorReport: reportWith([
    { id: 'path', label: 'path', status: 'error', message: 'bad path', durationMs: 1 },
    { id: 'permission', label: 'permission', status: 'error', message: 'denied', durationMs: 1 }
  ]),
  runtimeRegistry: registry()
})
assert.equal(blocking.canContinue, false)
assert.equal(blocking.blockingIssues.length, 2)

const pythonWarning = resolveRuntimeProfileRecommendation({
  platformInfo: { platform: 'win32', arch: 'x64' },
  doctorReport: reportWith([{ id: 'python', label: 'python', status: 'warning', message: 'missing', durationMs: 1 }]),
  runtimeRegistry: registry()
})
assert.equal(pythonWarning.canContinue, true)
assert.equal(pythonWarning.canUseLocalAi, false)

const aiWorkerWarning = resolveRuntimeProfileRecommendation({
  platformInfo: { platform: 'win32', arch: 'x64' },
  doctorReport: reportWith([
    { id: 'ai-worker', label: 'ai-worker', status: 'warning', message: 'offline', durationMs: 1 },
    { id: 'port', label: 'port', status: 'warning', message: 'closed', durationMs: 1 }
  ]),
  runtimeRegistry: registry()
})
assert.equal(aiWorkerWarning.canContinue, true)

assert.equal(getFallbackProfile('windows-nvidia-cuda')?.id, 'windows-cpu')
assert.equal(getFallbackProfile('macos-intel')?.id, 'external-inference-only')

const bootstrapRecommendation = resolveBootstrapRecommendation(okReport, registry())
assert.equal(bootstrapRecommendation.recommendedProfileId, 'windows-cpu')

const registryProfile: RuntimeRegistry = { ...registry(), selectedProfileId: 'windows-cpu', recommendedProfileId: 'windows-cpu' }
assert.equal(registryProfile.selectedProfileId, 'windows-cpu')

const resolverSource = await fs.readFile('src/main/runtime/runtime-profile-resolver.ts', 'utf8')
assert.match(resolverSource, /const DEFAULT_RUNTIME_PROFILE_RULES: RuntimeProfilePlatformRule\[\]/)
assert.match(resolverSource, /const HARDWARE_RUNTIME_PROFILE_RULES: RuntimeProfileHardwareRule\[\]/)
assert.match(resolverSource, /platform: 'win32'[\s\S]*profileId: 'windows-cpu'/)
assert.match(resolverSource, /platform: 'darwin'[\s\S]*arch: 'arm64'[\s\S]*profileId: 'macos-apple-silicon'/)
assert.match(resolverSource, /platform: 'darwin'[\s\S]*arch: 'x64'[\s\S]*profileId: 'macos-intel'/)
assert.match(resolverSource, /profileId: 'windows-nvidia-cuda'[\s\S]*hardwareHints\?\.nvidiaGpu/)
assert.match(resolverSource, /DEFAULT_RUNTIME_PROFILE_RULES\.find/)
assert.match(resolverSource, /HARDWARE_RUNTIME_PROFILE_RULES\.find/)
assert.doesNotMatch(
  resolverSource,
  /if \(platform === 'win32'\) return 'windows-cpu'|if \(platform === 'darwin' && arch === 'arm64'\)|if \(input\.hardwareHints\?\.nvidiaGpu && input\.platformInfo\.platform === 'win32'\)/
)
assert.doesNotMatch(resolverSource, /install\w*\s*\(/i)
assert.doesNotMatch(resolverSource, /download\w*\s*\(/i)
assert.doesNotMatch(resolverSource, /model\w*\s*\(/i)
assert.doesNotMatch(resolverSource, /startServer|startWorker|runPromptReverse|AI Worker/i)
