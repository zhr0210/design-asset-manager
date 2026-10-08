import { spawn, type ChildProcessByStdio } from 'child_process'
import type { Readable } from 'stream'
import type { PythonWorkerProcessState } from '../ai-runtime.types'
import type { AiRuntimeProcessRunner, AiRuntimeProcessSpawnOptions } from './ai-runtime-process-runner.types'

const OUTPUT_TAIL_LIMIT = 20
const STOP_TIMEOUT_MS = 5_000

type ManagedProcess = {
  child: RuntimeChildProcess
  state: PythonWorkerProcessState
}

type RuntimeChildProcess = ChildProcessByStdio<null, Readable, Readable>

export class RealAiRuntimeProcessRunner implements AiRuntimeProcessRunner {
  private readonly processes = new Map<number, ManagedProcess>()

  async spawn(command: string, args: string[], options: AiRuntimeProcessSpawnOptions): Promise<PythonWorkerProcessState> {
    const child = spawn(command, args, {
      cwd: options.cwd ?? undefined,
      env: options.env,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe']
    })

    await waitForSpawn(child)
    if (child.pid === undefined) throw new Error('Runtime process started without a PID.')

    const state: PythonWorkerProcessState = {
      pid: child.pid,
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
    this.processes.set(child.pid, { child, state })

    child.stdout.on('data', (chunk) => appendOutput(state.stdoutTail, chunk.toString()))
    child.stderr.on('data', (chunk) => appendOutput(state.stderrTail, chunk.toString()))
    child.on('close', (exitCode, signal) => {
      state.exitedAt = new Date().toISOString()
      state.exitCode = exitCode
      state.signal = signal
    })
    child.on('error', (error) => {
      appendOutput(state.stderrTail, error.message)
      if (!state.exitedAt) {
        state.exitedAt = new Date().toISOString()
        state.exitCode = 1
      }
    })

    return cloneProcess(state)
  }

  async kill(processId: number): Promise<boolean> {
    const managed = this.processes.get(processId)
    if (!managed) return false
    if (managed.state.exitedAt) return true

    managed.child.kill('SIGTERM')
    await waitForExit(managed.child, STOP_TIMEOUT_MS)
    if (!managed.state.exitedAt) {
      managed.child.kill('SIGKILL')
      await waitForExit(managed.child, STOP_TIMEOUT_MS)
    }
    return Boolean(managed.state.exitedAt)
  }

  getProcess(processId: number): PythonWorkerProcessState | null {
    const managed = this.processes.get(processId)
    return managed ? cloneProcess(managed.state) : null
  }

  listProcesses(): PythonWorkerProcessState[] {
    return Array.from(this.processes.values()).map(({ state }) => cloneProcess(state))
  }
}

function waitForSpawn(child: RuntimeChildProcess): Promise<void> {
  return new Promise((resolve, reject) => {
    const onSpawn = () => {
      child.off('error', onError)
      resolve()
    }
    const onError = (error: Error) => {
      child.off('spawn', onSpawn)
      reject(error)
    }
    child.once('spawn', onSpawn)
    child.once('error', onError)
  })
}

function waitForExit(child: RuntimeChildProcess, timeoutMs: number): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve()
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, timeoutMs)
    child.once('close', () => {
      clearTimeout(timer)
      resolve()
    })
  })
}

function appendOutput(target: string[], raw: string): void {
  target.push(...raw.split(/\r?\n/).filter(Boolean))
  if (target.length > OUTPUT_TAIL_LIMIT) target.splice(0, target.length - OUTPUT_TAIL_LIMIT)
}

function cloneProcess(processState: PythonWorkerProcessState): PythonWorkerProcessState {
  return {
    ...processState,
    args: [...processState.args],
    stdoutTail: [...processState.stdoutTail],
    stderrTail: [...processState.stderrTail]
  }
}
