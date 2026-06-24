import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import type { AiRuntimeState } from '../src/shared/types/ai-runtime.types'
import {
  selectCurrentPlatformAiRuntimeRequests,
  type PlatformAiRuntimeAdapterApi
} from '../src/renderer/platform-ai-runtime.adapter'

function runtime(id: string, metadata: Record<string, unknown>): AiRuntimeState {
  return {
    id,
    kind: 'disabled',
    status: 'stopped',
    healthStatus: 'unknown',
    startedAt: null,
    stoppedAt: null,
    lastHealthCheckAt: null,
    lastError: null,
    pid: null,
    baseUrl: null,
    metadata
  }
}

const calls: string[] = []
const methods = {
  getMacOSCapabilities: async () => {
    calls.push('macos-capabilities')
    return { success: false as const }
  },
  getWindowsCapabilities: async () => {
    calls.push('windows-capabilities')
    return { success: false as const }
  },
  getMacOSAiBranchStatus: async () => {
    calls.push('macos-branch-status')
    return { success: false as const }
  },
  getWindowsAiBranchStatus: async () => {
    calls.push('windows-branch-status')
    return { success: false as const }
  },
  getPythonMpsStatus: async () => ({ success: false as const }),
  getPythonCudaStatus: async () => ({ success: false as const }),
  probePythonMpsRuntime: async () => ({ success: false as const }),
  probePythonCudaRuntime: async () => ({ success: false as const })
} satisfies Required<PlatformAiRuntimeAdapterApi>

const macOSRuntime = runtime('macos-ai-branch-runtime', {
  macosAiBranch: {
    marker: 'macos-ai-branch',
    phase: 'worker-probes',
    platform: 'darwin',
    arch: 'arm64',
    isCurrentPlatform: true,
    lanes: [],
    warnings: []
  }
})
const windowsRuntime = runtime('windows-ai-branch-runtime', {
  windowsAiBranch: {
    marker: 'windows-ai-branch',
    phase: 'worker-probes',
    platform: 'win32',
    arch: 'x64',
    isCurrentPlatform: true,
    lanes: [],
    warnings: []
  }
})

const macOSSelection = selectCurrentPlatformAiRuntimeRequests(methods, [macOSRuntime])
assert.equal(macOSSelection?.platformBranch, 'macos')
assert.equal(macOSSelection?.requests.getCapabilities, methods.getMacOSCapabilities)
assert.equal(macOSSelection?.requests.getBranchStatus, methods.getMacOSAiBranchStatus)
assert.equal(macOSSelection?.requests.getPythonStatus, methods.getPythonMpsStatus)
assert.equal(macOSSelection?.requests.probePythonRuntime, methods.probePythonMpsRuntime)
await macOSSelection?.requests.getCapabilities()
await macOSSelection?.requests.getBranchStatus()
assert.deepEqual(calls, ['macos-capabilities', 'macos-branch-status'])

const windowsSelection = selectCurrentPlatformAiRuntimeRequests(methods, [windowsRuntime])
assert.equal(windowsSelection?.platformBranch, 'windows')
assert.equal(windowsSelection?.requests.getCapabilities, methods.getWindowsCapabilities)
assert.equal(windowsSelection?.requests.getBranchStatus, methods.getWindowsAiBranchStatus)
assert.equal(windowsSelection?.requests.getPythonStatus, methods.getPythonCudaStatus)
assert.equal(windowsSelection?.requests.probePythonRuntime, methods.probePythonCudaRuntime)
calls.length = 0
await windowsSelection?.requests.getCapabilities()
await windowsSelection?.requests.getBranchStatus()
assert.deepEqual(calls, ['windows-capabilities', 'windows-branch-status'])

assert.equal(selectCurrentPlatformAiRuntimeRequests(methods, []), null)

const consoleSource = await fs.readFile('src/renderer/routes/AiConsolePage.tsx', 'utf8')
assert.match(consoleSource, /selectCurrentPlatformAiRuntimeRequests/)
assert.doesNotMatch(consoleSource, /getMacOSCapabilities|getWindowsCapabilities/)
assert.doesNotMatch(consoleSource, /getMacOSAiBranchStatus|getWindowsAiBranchStatus/)

const panelSource = await fs.readFile('src/renderer/components/settings/AiRuntimePanel.tsx', 'utf8')
assert.match(panelSource, /selectCurrentPlatformAiRuntimeRequests/)

console.log('platform-ai-runtime-request-selection passed')
