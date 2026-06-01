import path from 'path'
import fs from 'fs'
import { spawn } from 'child_process'

function findScriptPath(): string {
  const starts = [process.cwd()]

  try {
    const moduleDir = typeof __dirname !== 'undefined'
      ? __dirname
      : path.dirname(new URL(import.meta.url).pathname)
    starts.push(moduleDir)
  } catch {
    // Ignore module URL resolution errors
  }

  for (const start of starts) {
    let current = path.resolve(start)
    for (let depth = 0; depth < 8; depth += 1) {
      const candidate = path.resolve(current, 'scripts', 'check-text-ocr-providers.py')
      if (fs.existsSync(candidate)) {
        return candidate
      }
      const parent = path.dirname(current)
      if (parent === current) break
      current = parent
    }
  }

  return path.resolve(process.cwd(), 'scripts', 'check-text-ocr-providers.py')
}

function resolvePythonExecutable(): string {
  const envs = [
    process.env.DESIGN_ASSET_MANAGER_PYTHON,
    process.env.TEXT_OCR_PYTHON,
    process.env.PYTHON
  ]
  for (const env of envs) {
    if (env && env.trim()) {
      return env.trim()
    }
  }
  return 'python'
}

export interface OcrHealthcheckResult {
  ok: boolean
  status: string
  schemaVersion?: string
  python?: unknown
  providers?: unknown
  runner?: unknown
  recommendation?: unknown
  error?: string
  warnings?: string[]
}

export class OcrHealthcheckService {
  private timeoutMs = 15000

  public async checkTextOcrProviders(): Promise<OcrHealthcheckResult> {
    const scriptPath = findScriptPath()
    if (!fs.existsSync(scriptPath)) {
      return {
        ok: false,
        status: 'HEALTHCHECK_SCRIPT_NOT_FOUND',
        error: `Healthcheck script check-text-ocr-providers.py not found at resolved path: ${scriptPath}`
      }
    }

    const pythonExe = resolvePythonExecutable()
    const args = [scriptPath]

    console.log(`[OcrHealthcheckService] Spawning python command: ${pythonExe} ${args.join(' ')}`)

    return new Promise<OcrHealthcheckResult>((resolve) => {
      let stdoutData = ''
      let stderrData = ''
      let killed = false
      let child: ReturnType<typeof spawn>

      try {
        child = spawn(pythonExe, args)
      } catch (err) {
        console.warn(`[OcrHealthcheckService] Failed to spawn python process synchronously: ${String(err)}`)
        resolve({
          ok: false,
          status: 'HEALTHCHECK_PROCESS_ERROR',
          error: `Synchronous spawn failure: ${String(err)}`
        })
        return
      }

      const timeoutId = setTimeout(() => {
        killed = true
        try {
          child.kill('SIGKILL')
        } catch (e) {
          // ignore kill errors
        }
        console.warn(`[OcrHealthcheckService] OCR healthcheck execution timed out after ${this.timeoutMs}ms. Process killed.`)
        resolve({
          ok: false,
          status: 'HEALTHCHECK_TIMEOUT',
          error: `Execution timed out after ${this.timeoutMs}ms`
        })
      }, this.timeoutMs)

      child.stdout?.on('data', (chunk) => {
        stdoutData += chunk.toString()
      })

      child.stderr?.on('data', (chunk) => {
        stderrData += chunk.toString()
      })

      child.on('error', (err) => {
        if (killed) return
        clearTimeout(timeoutId)
        console.warn(`[OcrHealthcheckService] Failed to spawn child process asynchronously: ${String(err)}`)
        resolve({
          ok: false,
          status: 'HEALTHCHECK_PROCESS_ERROR',
          error: `Asynchronous process error: ${String(err)}`
        })
      })

      child.on('close', (code) => {
        if (killed) return
        clearTimeout(timeoutId)

        const trimmedStdout = stdoutData.trim()
        if (!trimmedStdout) {
          console.warn(`[OcrHealthcheckService] Healthcheck script returned empty stdout. Exit code: ${code}. stderr: ${stderrData}`)
          resolve({
            ok: false,
            status: 'INVALID_HEALTHCHECK_JSON',
            error: `Script returned empty stdout. Exit code: ${code}. stderr: ${stderrData.trim() || 'none'}`
          })
          return
        }

        try {
          const parsed = JSON.parse(trimmedStdout)
          resolve({
            ok: parsed.ok ?? true,
            status: parsed.status ?? 'HEALTHCHECK_COMPLETE',
            schemaVersion: parsed.schemaVersion,
            python: parsed.python,
            providers: parsed.providers,
            runner: parsed.runner,
            recommendation: parsed.recommendation
          })
        } catch (parseErr) {
          console.warn(`[OcrHealthcheckService] Failed to parse healthcheck stdout as JSON: ${String(parseErr)}. Raw output: ${trimmedStdout}`)
          resolve({
            ok: false,
            status: 'INVALID_HEALTHCHECK_JSON',
            error: `JSON parse error: ${String(parseErr)}. Raw output: ${trimmedStdout}`
          })
        }
      })
    })
  }
}
