import { runProcess } from '../../platform/process-runner'
import type { RegisteredDoctorCheck } from '../doctor.types'

async function versionFor(command: string, args: string[], timeoutMs: number) {
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

export const nodeCheck: RegisteredDoctorCheck = {
  id: 'node',
  label: 'Node and npm',
  async run(context) {
    const startedAt = Date.now()
    const timeoutMs = Math.min(context.timeoutMs, 5000)
    const node = await versionFor(process.execPath, ['--version'], timeoutMs)
    const npmExecPath = process.env.npm_execpath
    const npm = npmExecPath
      ? await versionFor(process.execPath, [npmExecPath, '--version'], timeoutMs)
      : await versionFor(context.platformInfo.isWindows ? 'npm.cmd' : 'npm', ['--version'], timeoutMs)
    const status = node.available && npm.available ? 'ok' : 'warning'

    return {
      id: this.id,
      label: this.label,
      status,
      message: status === 'ok' ? 'Node and npm are available.' : 'Node or npm could not be detected.',
      details: { node, npm },
      fixSuggestion: status === 'ok' ? undefined : 'Install Node.js/npm or ensure they are available on PATH.',
      durationMs: Date.now() - startedAt
    }
  }
}
