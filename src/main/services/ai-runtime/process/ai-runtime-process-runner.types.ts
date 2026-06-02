import type { PythonWorkerProcessState } from '../ai-runtime.types'

export interface AiRuntimeProcessSpawnOptions {
  cwd: string | null
  env: Record<string, string>
}

export interface AiRuntimeProcessRunner {
  spawn(command: string, args: string[], options: AiRuntimeProcessSpawnOptions): Promise<PythonWorkerProcessState>
  kill(processId: number): Promise<boolean>
  getProcess(processId: number): PythonWorkerProcessState | null
  listProcesses(): PythonWorkerProcessState[]
}
