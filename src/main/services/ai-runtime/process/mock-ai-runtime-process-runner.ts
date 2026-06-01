import type { PythonWorkerProcessState } from '../ai-runtime.types'
import type { AiRuntimeProcessRunner, AiRuntimeProcessSpawnOptions } from './ai-runtime-process-runner.types'

export interface MockProcessSpawnHistoryEntry {
  command: string
  args: string[]
  options: AiRuntimeProcessSpawnOptions
  requestedAt: string
}

function cloneProcess(processState: PythonWorkerProcessState): PythonWorkerProcessState {
  return {
    ...processState,
    args: [...processState.args],
    stdoutTail: [...processState.stdoutTail],
    stderrTail: [...processState.stderrTail]
  }
}

export class MockAiRuntimeProcessRunner implements AiRuntimeProcessRunner {
  private readonly processes = new Map<number, PythonWorkerProcessState>()
  private readonly history: MockProcessSpawnHistoryEntry[] = []
  private nextProcessId = 1
  private nextSpawnError: Error | null = null

  failNextSpawn(message = 'Mock process spawn failed'): void {
    this.nextSpawnError = new Error(message)
  }

  getHistory(): MockProcessSpawnHistoryEntry[] {
    return this.history.map((entry) => ({
      ...entry,
      args: [...entry.args],
      options: {
        cwd: entry.options.cwd,
        env: { ...entry.options.env }
      }
    }))
  }

  async spawn(command: string, args: string[], options: AiRuntimeProcessSpawnOptions): Promise<PythonWorkerProcessState> {
    this.history.push({
      command,
      args: [...args],
      options: {
        cwd: options.cwd,
        env: { ...options.env }
      },
      requestedAt: new Date().toISOString()
    })

    if (this.nextSpawnError) {
      const error = this.nextSpawnError
      this.nextSpawnError = null
      throw error
    }

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

    return cloneProcess(processState)
  }

  async kill(processId: number): Promise<boolean> {
    const processState = this.processes.get(processId)
    if (!processState) {
      return false
    }

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

  simulateExit(processId: number, exitCode: number): void {
    const processState = this.processes.get(processId)
    if (!processState) {
      return
    }

    processState.exitedAt = new Date().toISOString()
    processState.exitCode = exitCode
    processState.signal = null
  }

  simulateStdout(processId: number, text: string): void {
    const processState = this.processes.get(processId)
    if (!processState) {
      return
    }

    processState.stdoutTail = [...processState.stdoutTail, text].slice(-20)
  }

  simulateStderr(processId: number, text: string): void {
    const processState = this.processes.get(processId)
    if (!processState) {
      return
    }

    processState.stderrTail = [...processState.stderrTail, text].slice(-20)
  }

  clear(): void {
    this.processes.clear()
    this.history.length = 0
    this.nextSpawnError = null
    this.nextProcessId = 1
  }
}
