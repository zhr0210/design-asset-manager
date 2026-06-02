import type { PythonWorkerProcessState } from '../ai-runtime.types'
import { runProcess } from '../../../platform/process-runner'
import type { AiRuntimeProcessRunner, AiRuntimeProcessSpawnOptions } from './ai-runtime-process-runner.types'

export class RealAiRuntimeProcessRunner implements AiRuntimeProcessRunner {
  private readonly processes = new Map<number, PythonWorkerProcessState>()
  private nextProcessId = 100_000

  async spawn(command: string, args: string[], options: AiRuntimeProcessSpawnOptions): Promise<PythonWorkerProcessState> {
    const pid = this.nextProcessId++
    const processState: PythonWorkerProcessState = {
      pid,
      command,
      args: [...args],
      cwd: options.cwd,
      startedAt: new Date().toISOString(),
      exitedAt: null,
      exitCode: null,
      signal: null,
      stdoutTail: [],
      stderrTail: []
    }
    this.processes.set(pid, processState)

    void runProcess(command, args, {
      cwd: options.cwd ?? undefined,
      env: options.env,
      timeoutMs: undefined
    }).then((result) => {
      const latest = this.processes.get(pid)
      if (!latest) return
      latest.exitedAt = new Date().toISOString()
      latest.exitCode = result.exitCode
      latest.signal = result.signal
      latest.stdoutTail = result.stdout ? result.stdout.split(/\r?\n/).filter(Boolean).slice(-20) : []
      latest.stderrTail = result.stderr ? result.stderr.split(/\r?\n/).filter(Boolean).slice(-20) : []
    }).catch((error) => {
      const latest = this.processes.get(pid)
      if (!latest) return
      latest.exitedAt = new Date().toISOString()
      latest.exitCode = 1
      latest.signal = null
      latest.stderrTail = [error instanceof Error ? error.message : 'Process runner failed']
    })

    return cloneProcess(processState)
  }

  async kill(processId: number): Promise<boolean> {
    const processState = this.processes.get(processId)
    if (!processState) return false
    processState.exitedAt = new Date().toISOString()
    processState.exitCode = processState.exitCode ?? 0
    processState.signal = processState.signal ?? 'SIGTERM'
    return true
  }

  getProcess(processId: number): PythonWorkerProcessState | null {
    const processState = this.processes.get(processId)
    return processState ? cloneProcess(processState) : null
  }

  listProcesses(): PythonWorkerProcessState[] {
    return Array.from(this.processes.values()).map(cloneProcess)
  }
}

function cloneProcess(processState: PythonWorkerProcessState): PythonWorkerProcessState {
  return {
    ...processState,
    args: [...processState.args],
    stdoutTail: [...processState.stdoutTail],
    stderrTail: [...processState.stderrTail]
  }
}
