import type { PlatformName } from '../../shared/types/platform.types'
import { platformAdapterMatchesCurrentPlatform } from '../platform/platform-adapter-selection'

export interface DoctorPlatformCommandAdapter {
  platform?: PlatformName
  command: string
}

export type PythonLauncherDetailKey = 'python' | 'python3' | 'pyLauncher'

export interface PythonLauncherCandidate {
  detailKey: PythonLauncherDetailKey
  command: string
}

export interface PythonLauncherAdapter {
  platform?: PlatformName
  candidates: PythonLauncherCandidate[]
}

export const DOCTOR_NPM_COMMAND_ADAPTERS: readonly DoctorPlatformCommandAdapter[] = [
  { platform: 'win32', command: 'npm.cmd' },
  { command: 'npm' }
] as const

export const DOCTOR_PYTHON_LAUNCHER_ADAPTERS: readonly PythonLauncherAdapter[] = [
  {
    platform: 'win32',
    candidates: [
      { detailKey: 'pyLauncher', command: 'py' },
      { detailKey: 'python', command: 'python' },
      { detailKey: 'python3', command: 'python3' }
    ]
  },
  {
    candidates: [
      { detailKey: 'python3', command: 'python3' },
      { detailKey: 'python', command: 'python' }
    ]
  }
] as const

export const MAX_DOCTOR_PYTHON_CHECK_TIMEOUT_MS = 5000
export const DOCTOR_PYTHON_COMMAND_BUDGET_RATIO = 0.8

export function resolveDoctorNpmCommand(platform: PlatformName): string {
  return resolveDoctorPlatformCommand(DOCTOR_NPM_COMMAND_ADAPTERS, platform).command
}

export function resolveDoctorPythonLauncherAdapter(platform: PlatformName): PythonLauncherAdapter {
  return resolveDoctorPlatformCommand(DOCTOR_PYTHON_LAUNCHER_ADAPTERS, platform)
}

export function resolveDoctorPythonCommandTimeout(totalTimeoutMs: number, candidateCount: number): number {
  const checkBudgetMs = Math.min(totalTimeoutMs, MAX_DOCTOR_PYTHON_CHECK_TIMEOUT_MS)
  return Math.max(1, Math.floor((checkBudgetMs * DOCTOR_PYTHON_COMMAND_BUDGET_RATIO) / (candidateCount + 1)))
}

function resolveDoctorPlatformCommand<T extends { platform?: PlatformName }>(
  adapters: readonly T[],
  platform: PlatformName
): T {
  const adapter = adapters.find((candidate) => platformAdapterMatchesCurrentPlatform(candidate, { currentPlatform: platform }))

  if (!adapter) {
    throw new Error(`No Doctor command adapter configured for ${platform} platform.`)
  }

  return adapter
}
