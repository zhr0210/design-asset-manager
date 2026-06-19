import { runProcess } from '../../platform/process-runner'
import type { RegisteredDoctorCheck } from '../doctor.types'

interface PythonCommandResult extends Record<string, unknown> {
  available: boolean
}

export type PythonCommandChecker = (command: string, args: string[], timeoutMs: number) => Promise<PythonCommandResult>

type PythonLauncherDetailKey = 'python' | 'python3' | 'pyLauncher'

interface PythonLauncherCandidate {
  detailKey: PythonLauncherDetailKey
  command: string
}

interface PythonLauncherAdapter {
  isWindows?: boolean
  candidates: PythonLauncherCandidate[]
}

const PYTHON_LAUNCHER_ADAPTERS: PythonLauncherAdapter[] = [
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
]

const MAX_PYTHON_CHECK_TIMEOUT_MS = 5000
const PYTHON_COMMAND_BUDGET_RATIO = 0.8

function skippedResult(reason: string): PythonCommandResult {
  return { available: false, skipped: true, reason }
}

async function defaultCheckCommand(command: string, args: string[], timeoutMs: number) {
  try {
    const result = await runProcess(command, args, { timeoutMs })
    return {
      available: result.exitCode === 0,
      exitCode: result.exitCode,
      version: (result.stdout || result.stderr).trim(),
      timedOut: result.timedOut
    }
  } catch (err) {
    return {
      available: false,
      error: err instanceof Error ? err.message : String(err)
    }
  }
}

function resolvePythonLauncherAdapter(isWindows: boolean): PythonLauncherAdapter {
  return PYTHON_LAUNCHER_ADAPTERS.find((adapter) => (
    adapter.isWindows === undefined || adapter.isWindows === isWindows
  ))!
}

function resolvePythonCommandTimeout(totalTimeoutMs: number, candidateCount: number): number {
  const checkBudgetMs = Math.min(totalTimeoutMs, MAX_PYTHON_CHECK_TIMEOUT_MS)
  return Math.max(1, Math.floor((checkBudgetMs * PYTHON_COMMAND_BUDGET_RATIO) / (candidateCount + 1)))
}

async function detectPythonLauncher(
  adapter: PythonLauncherAdapter,
  checkCommand: PythonCommandChecker,
  timeoutMs: number,
  isWindows: boolean
) {
  const details: Record<PythonLauncherDetailKey, PythonCommandResult> = {
    python: skippedResult('Not checked because a higher-priority Python launcher was detected.'),
    python3: skippedResult('Not checked because a higher-priority Python launcher was detected.'),
    pyLauncher: isWindows
      ? skippedResult('Not checked because a higher-priority Python launcher was detected.')
      : skippedResult('py launcher is Windows-only.')
  }

  for (const candidate of adapter.candidates) {
    const result = await checkCommand(candidate.command, ['--version'], timeoutMs)
    details[candidate.detailKey] = result
    if (result.available) {
      return { candidate, details }
    }
  }

  return { candidate: null, details }
}

export function createPythonCheck(checkCommand: PythonCommandChecker = defaultCheckCommand): RegisteredDoctorCheck {
  return {
    id: 'python',
    label: 'Python runtime',
    async run(context) {
      const startedAt = Date.now()
      const adapter = resolvePythonLauncherAdapter(context.platformInfo.isWindows)
      const timeoutMs = resolvePythonCommandTimeout(context.timeoutMs, adapter.candidates.length)
      const detected = await detectPythonLauncher(
        adapter,
        checkCommand,
        timeoutMs,
        context.platformInfo.isWindows
      )
      const pip = detected.candidate
        ? await checkCommand(detected.candidate.command, ['-m', 'pip', '--version'], timeoutMs)
        : skippedResult('pip was not checked because no Python launcher was detected.')
      const anyPython = detected.candidate !== null

      return {
        id: this.id,
        label: this.label,
        status: anyPython ? 'ok' : 'warning',
        message: anyPython ? 'Python runtime detected.' : 'Python runtime was not detected.',
        details: { ...detected.details, pip },
        fixSuggestion: anyPython ? undefined : 'Configure a managed Python runtime or install Python separately; Doctor will not install it.',
        durationMs: Date.now() - startedAt
      }
    }
  }
}

export const pythonCheck = createPythonCheck()
