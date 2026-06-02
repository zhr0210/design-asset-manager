import path from 'path'
import type {
  PythonWorkerCrashLogPlan,
  PythonWorkerLaunchPlan,
  PythonWorkerProcessState,
  PythonWorkerRuntimeConfig,
  PythonWorkerStopPlan
} from '../ai-runtime.types'
import { createPythonWorkerLaunchPlan } from './python-worker-launch-plan'

export function createControlledPythonWorkerLaunchPlan(config: PythonWorkerRuntimeConfig): PythonWorkerLaunchPlan {
  const plan = createPythonWorkerLaunchPlan(config)
  const blockingIssues = [...plan.blockingIssues]
  const warnings = [...plan.warnings]

  if (plan.cwd && config.scriptPath) {
    const cwd = path.resolve(plan.cwd)
    const scriptPath = path.resolve(plan.cwd, config.scriptPath)
    if (!scriptPath.startsWith(cwd)) {
      blockingIssues.push('scriptPath must stay inside workingDirectory.')
    }
  }

  if (config.port <= 0 || config.port > 65_535) {
    blockingIssues.push('port must be between 1 and 65535.')
  }

  if (Object.keys(config.env).some((key) => /TOKEN|PASSWORD|SECRET|KEY/i.test(key))) {
    warnings.push('env contains sensitive-looking keys; logs and reports must redact values.')
  }

  return {
    ...plan,
    warnings,
    blockingIssues
  }
}

export function createPythonWorkerCrashLogPlan(config: PythonWorkerRuntimeConfig, processState: PythonWorkerProcessState | null): PythonWorkerCrashLogPlan {
  return {
    runtimeId: config.runtimeId,
    crashLogPath: config.workingDirectory ? path.join(config.workingDirectory, 'logs', `${config.runtimeId}-crash.log`) : null,
    stdoutTailLimit: 20,
    stderrTailLimit: 20,
    warnings: processState?.exitCode && processState.exitCode !== 0 ? [`Process exited with code ${processState.exitCode}.`] : []
  }
}

export function createPythonWorkerStopPlan(config: PythonWorkerRuntimeConfig, processState: PythonWorkerProcessState | null): PythonWorkerStopPlan {
  const blockingIssues: string[] = []
  if (!processState?.pid) blockingIssues.push('No running process id is available.')

  return {
    runtimeId: config.runtimeId,
    pid: processState?.pid ?? null,
    signal: 'SIGTERM',
    cleanupTempFiles: false,
    warnings: ['Stop plan does not remove files automatically.'],
    blockingIssues
  }
}
