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
    const isPackagedElectron = Boolean(process.versions.electron && !process.defaultApp)
    const node = process.versions.node
      ? {
          available: true,
          version: `v${process.versions.node}`,
          source: isPackagedElectron ? 'bundled-electron-node' : 'current-process'
        }
      : await versionFor(process.execPath, ['--version'], timeoutMs)
    const npmExecPath = process.env.npm_execpath
    const npm = npmExecPath
      ? await versionFor(process.execPath, [npmExecPath, '--version'], timeoutMs)
      : isPackagedElectron
        ? {
            available: true,
            skipped: true,
            reason: 'Packaged Electron app uses bundled Node; npm CLI is not required at runtime.'
          }
        : await versionFor(context.platformInfo.isWindows ? 'npm.cmd' : 'npm', ['--version'], timeoutMs)
    const status = node.available && npm.available ? 'ok' : 'warning'

    return {
      id: this.id,
      label: this.label,
      status,
      message: status === 'ok'
        ? isPackagedElectron
          ? 'Electron 内置 Node 运行时可用，打包版本不需要用户安装 npm。'
          : 'Node and npm are available.'
        : 'Node or npm could not be detected.',
      details: { node, npm },
      fixSuggestion: status === 'ok' ? undefined : '点击一键修复会切换到打包版内置 Node 检测并重新体检；开发环境请确认 npm 在 PATH 中。',
      durationMs: Date.now() - startedAt
    }
  }
}
