import { runProcess } from '../../platform/process-runner'
import type { RegisteredDoctorCheck } from '../doctor.types'

export type PythonCommandChecker = (command: string, args: string[], timeoutMs: number) => Promise<Record<string, unknown>>

interface PythonLauncherAdapter {
  isWindows?: boolean
  command?: string
  skipped?: Record<string, unknown>
}

const PYTHON_LAUNCHER_ADAPTERS: PythonLauncherAdapter[] = [
  { isWindows: true, command: 'py' },
  { skipped: { available: false, skipped: true, reason: 'py launcher is Windows-only.' } }
]

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

async function checkPyLauncher(isWindows: boolean, checkCommand: PythonCommandChecker, timeoutMs: number): Promise<Record<string, unknown>> {
  const adapter = PYTHON_LAUNCHER_ADAPTERS.find((item) => item.isWindows === undefined || item.isWindows === isWindows)!
  return adapter.command
    ? checkCommand(adapter.command, ['--version'], timeoutMs)
    : adapter.skipped!
}

export function createPythonCheck(checkCommand: PythonCommandChecker = defaultCheckCommand): RegisteredDoctorCheck {
  return {
    id: 'python',
    label: 'Python runtime',
    async run(context) {
      const startedAt = Date.now()
      const timeoutMs = Math.min(context.timeoutMs, 5000)
      const python = await checkCommand('python', ['--version'], timeoutMs)
      const python3 = await checkCommand('python3', ['--version'], timeoutMs)
      const pyLauncher = await checkPyLauncher(context.platformInfo.isWindows, checkCommand, timeoutMs)
      const pip = await checkCommand('python', ['-m', 'pip', '--version'], timeoutMs)
      const anyPython = python.available || python3.available || pyLauncher.available

      return {
        id: this.id,
        label: this.label,
        status: anyPython ? 'ok' : 'warning',
        message: anyPython ? 'Python runtime detected.' : 'Python runtime was not detected.',
        details: { python, python3, pyLauncher, pip },
        fixSuggestion: anyPython ? undefined : 'Configure a managed Python runtime or install Python separately; Doctor will not install it.',
        durationMs: Date.now() - startedAt
      }
    }
  }
}

export const pythonCheck = createPythonCheck()
