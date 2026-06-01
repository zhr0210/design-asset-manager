import { spawn } from 'child_process'

export interface RunProcessOptions {
  cwd?: string
  env?: NodeJS.ProcessEnv
  timeoutMs?: number
}

export interface RunProcessResult {
  exitCode: number | null
  signal: NodeJS.Signals | null
  stdout: string
  stderr: string
  timedOut: boolean
}

export function runProcess(command: string, args: string[], options: RunProcessOptions = {}): Promise<RunProcessResult> {
  return new Promise((resolve, reject) => {
    let stdout = ''
    let stderr = ''
    let timedOut = false

    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      shell: false
    })

    const timeout = options.timeoutMs
      ? setTimeout(() => {
          timedOut = true
          child.kill()
        }, options.timeoutMs)
      : null

    child.stdout?.on('data', (chunk) => {
      stdout += chunk.toString()
    })

    child.stderr?.on('data', (chunk) => {
      stderr += chunk.toString()
    })

    child.on('error', (error) => {
      if (timeout) clearTimeout(timeout)
      reject(error)
    })

    child.on('close', (exitCode, signal) => {
      if (timeout) clearTimeout(timeout)
      resolve({
        exitCode,
        signal,
        stdout,
        stderr,
        timedOut
      })
    })
  })
}
