export interface DoctorPlatformCommandAdapter {
  isWindows?: boolean
  command: string
}

export type PythonLauncherDetailKey = 'python' | 'python3' | 'pyLauncher'

export interface PythonLauncherCandidate {
  detailKey: PythonLauncherDetailKey
  command: string
}

export interface PythonLauncherAdapter {
  isWindows?: boolean
  candidates: PythonLauncherCandidate[]
}

export const DOCTOR_NPM_COMMAND_ADAPTERS: readonly DoctorPlatformCommandAdapter[] = [
  { isWindows: true, command: 'npm.cmd' },
  { command: 'npm' }
] as const

export const DOCTOR_PYTHON_LAUNCHER_ADAPTERS: readonly PythonLauncherAdapter[] = [
  {
    isWindows: true,
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

export function resolveDoctorNpmCommand(isWindows: boolean): string {
  return resolveDoctorPlatformCommand(DOCTOR_NPM_COMMAND_ADAPTERS, isWindows).command
}

export function resolveDoctorPythonLauncherAdapter(isWindows: boolean): PythonLauncherAdapter {
  return resolveDoctorPlatformCommand(DOCTOR_PYTHON_LAUNCHER_ADAPTERS, isWindows)
}

export function resolveDoctorPythonCommandTimeout(totalTimeoutMs: number, candidateCount: number): number {
  const checkBudgetMs = Math.min(totalTimeoutMs, MAX_DOCTOR_PYTHON_CHECK_TIMEOUT_MS)
  return Math.max(1, Math.floor((checkBudgetMs * DOCTOR_PYTHON_COMMAND_BUDGET_RATIO) / (candidateCount + 1)))
}

function resolveDoctorPlatformCommand<T extends { isWindows?: boolean }>(
  adapters: readonly T[],
  isWindows: boolean
): T {
  const adapter = adapters.find((candidate) => (
    candidate.isWindows === undefined || candidate.isWindows === isWindows
  ))

  if (!adapter) {
    throw new Error(`No Doctor command adapter configured for ${isWindows ? 'Windows' : 'non-Windows'} platform.`)
  }

  return adapter
}
