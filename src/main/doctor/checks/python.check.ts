import { runProcess } from '../../platform/process-runner'
import {
  type PythonLauncherAdapter,
  type PythonLauncherDetailKey,
  resolveDoctorPythonCommandTimeout,
  resolveDoctorPythonLauncherAdapter
} from '../doctor-command-resolver'
import type { RegisteredDoctorCheck } from '../doctor.types'

interface PythonCommandResult extends Record<string, unknown> {
  available: boolean
}

export type PythonCommandChecker = (command: string, args: string[], timeoutMs: number) => Promise<PythonCommandResult>

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

async function detectPythonLauncher(
  adapter: PythonLauncherAdapter,
  checkCommand: PythonCommandChecker,
  timeoutMs: number
) {
  const checksPyLauncher = adapter.candidates.some((candidate) => candidate.detailKey === 'pyLauncher')
  const details: Record<PythonLauncherDetailKey, PythonCommandResult> = {
    python: skippedResult('Not checked because a higher-priority Python launcher was detected.'),
    python3: skippedResult('Not checked because a higher-priority Python launcher was detected.'),
    pyLauncher: checksPyLauncher
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
      const adapter = resolveDoctorPythonLauncherAdapter(context.platformInfo.platform)
      const timeoutMs = resolveDoctorPythonCommandTimeout(context.timeoutMs, adapter.candidates.length)
      const detected = await detectPythonLauncher(
        adapter,
        checkCommand,
        timeoutMs
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
