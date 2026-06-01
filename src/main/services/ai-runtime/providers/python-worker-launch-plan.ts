import type { PythonWorkerLaunchPlan, PythonWorkerRuntimeConfig } from '../ai-runtime.types'

function buildHealthUrl(config: PythonWorkerRuntimeConfig): string | null {
  if (!config.baseUrl || !config.healthEndpoint) {
    return null
  }

  const normalizedBase = config.baseUrl.replace(/\/+$/, '')
  const normalizedEndpoint = config.healthEndpoint.startsWith('/') ? config.healthEndpoint : `/${config.healthEndpoint}`
  return `${normalizedBase}${normalizedEndpoint}`
}

export function createPythonWorkerLaunchPlan(config: PythonWorkerRuntimeConfig): PythonWorkerLaunchPlan {
  const args = config.scriptPath
    ? [
        config.scriptPath,
        '--host',
        config.host,
        '--port',
        String(config.port),
        ...config.launchArgs
      ]
    : [...config.launchArgs]

  const plan: PythonWorkerLaunchPlan = {
    command: config.pythonPath,
    args,
    cwd: config.workingDirectory,
    env: { ...config.env },
    healthUrl: buildHealthUrl(config),
    timeoutMs: config.timeoutMs,
    warnings: [],
    blockingIssues: config.scriptPath ? [] : ['scriptPath is required before a Python worker can be launched.']
  }

  return validatePythonWorkerLaunchPlan(plan)
}

export function validatePythonWorkerLaunchPlan(plan: PythonWorkerLaunchPlan): PythonWorkerLaunchPlan {
  const blockingIssues = [...plan.blockingIssues]
  const warnings = [...plan.warnings]

  if (!plan.command) {
    blockingIssues.push('pythonPath is required before a Python worker can be launched.')
  }

  if (plan.blockingIssues.every((issue) => !issue.includes('scriptPath')) && (plan.args.length === 0 || !plan.args[0])) {
    blockingIssues.push('scriptPath is required before a Python worker can be launched.')
  }

  if (!plan.cwd) {
    warnings.push('workingDirectory is not configured.')
  }

  if (!plan.healthUrl) {
    warnings.push('healthUrl is not configured.')
  }

  return {
    ...plan,
    warnings,
    blockingIssues
  }
}

export function explainPythonWorkerLaunchPlan(plan: PythonWorkerLaunchPlan): string {
  if (plan.blockingIssues.length > 0) {
    return `Python worker launch plan is blocked: ${plan.blockingIssues.join('; ')}`
  }

  if (plan.warnings.length > 0) {
    return `Python worker launch plan is usable with warnings: ${plan.warnings.join('; ')}`
  }

  return 'Python worker launch plan is ready.'
}
