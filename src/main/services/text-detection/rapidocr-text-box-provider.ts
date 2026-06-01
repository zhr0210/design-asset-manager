import { ITextBoxProvider } from './text-box-provider.types'
import type { TextBox } from '../../../shared/types/color-palette.types'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import { getPythonModelCacheEnv } from '../ai-models/ai-model-registry'

function findRunnerPath(): string {
  const starts = [process.cwd()]

  try {
    const moduleDir = typeof __dirname !== 'undefined'
      ? __dirname
      : path.dirname(new URL(import.meta.url).pathname)
    starts.push(moduleDir)
  } catch {
    // Ignore module URL resolution errors and rely on process.cwd().
  }

  for (const start of starts) {
    let current = path.resolve(start)
    for (let depth = 0; depth < 8; depth += 1) {
      const candidate = path.resolve(current, 'tools', 'ocr', 'rapidocr_detect.py')
      if (fs.existsSync(candidate)) {
        return candidate
      }
      const parent = path.dirname(current)
      if (parent === current) break
      current = parent
    }
  }

  return path.resolve(process.cwd(), 'tools', 'ocr', 'rapidocr_detect.py')
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

export class RapidOcrTextBoxProvider implements ITextBoxProvider {
  private config: { timeoutMs: number; minConfidence: number; maxTextBoxes: number }

  constructor(config: { timeoutMs: number; minConfidence: number; maxTextBoxes: number }) {
    this.config = config
  }

  public async detect(imagePath: string, _assetId?: string): Promise<TextBox[]> {
    console.log(`[RapidOcrTextBoxProvider] Initiating RapidOCR scan using local runner for: ${imagePath}`)

    // 1. Robustly locate the tools/ocr/rapidocr_detect.py script path
    const runnerPath = findRunnerPath()

    // 2. Return empty if runner script is physically missing
    if (!fs.existsSync(runnerPath)) {
      console.warn(`[RapidOcrTextBoxProvider] Local RapidOCR runner python script not found at resolved path: ${runnerPath}`)
      return []
    }

    const args = [
      runnerPath,
      '--image', imagePath,
      '--max-boxes', String(this.config.maxTextBoxes),
      '--min-confidence', String(this.config.minConfidence),
      '--timeout-ms', String(this.config.timeoutMs)
    ]

    const pythonExe = resolvePythonExecutable()
    console.log(`[RapidOcrTextBoxProvider] Spawning python process: ${pythonExe} ${args.join(' ')}`)

    return new Promise<TextBox[]>((resolve) => {
      let stdoutData = ''
      let stderrData = ''
      let killed = false
      let child: ReturnType<typeof spawn>

      try {
        child = spawn(pythonExe, args, { env: getPythonModelCacheEnv() })
      } catch (err) {
        console.warn(`[RapidOcrTextBoxProvider] Failed to spawn python runner process synchronously: ${String(err)}`)
        resolve([])
        return
      }
      
      // 3. Timeout handler to kill child process safely
      const timeoutId = setTimeout(() => {
        killed = true
        try {
          child.kill('SIGKILL')
        } catch (e) {
          // ignore kill errors
        }
        console.warn(`[RapidOcrTextBoxProvider] Command execution timed out after ${this.config.timeoutMs}ms. Child process killed.`)
        resolve([])
      }, this.config.timeoutMs)

      child.stdout?.on('data', (chunk) => {
        stdoutData += chunk.toString()
      })

      child.stderr?.on('data', (chunk) => {
        stderrData += chunk.toString()
      })

      child.on('error', (err) => {
        if (killed) return
        clearTimeout(timeoutId)
        console.warn(`[RapidOcrTextBoxProvider] Failed to spawn python runner child process: ${String(err)}`)
        resolve([])
      })

      child.on('close', (code) => {
        if (killed) return
        clearTimeout(timeoutId)

        if (code !== 0) {
          console.warn(`[RapidOcrTextBoxProvider] Runner exited with non-zero exit code: ${code}. stderr: ${stderrData}`)
        }

        const trimmedStdout = stdoutData.trim()
        if (!trimmedStdout) {
          console.warn(`[RapidOcrTextBoxProvider] Runner returned empty stdout.`)
          resolve([])
          return
        }

        try {
          const parsed = JSON.parse(trimmedStdout)
          if (!parsed || parsed.ok === false) {
            console.warn(`[RapidOcrTextBoxProvider] Runner returned failure response: ${parsed?.error || 'Unknown error'}`)
            resolve([])
            return
          }

          if (parsed && Array.isArray(parsed.boxes)) {
            // 4. Map returned boxes to TextBox structure while explicitly omitting text strings
            const mappedBoxes: TextBox[] = parsed.boxes.map((b: any) => {
              const x = Number(b.x ?? 0)
              const y = Number(b.y ?? 0)
              const w = Number(b.width ?? b.w ?? 0)
              const h = Number(b.height ?? b.h ?? 0)
              return {
                x,
                y,
                width: w,
                height: h,
                polygon: b.polygon ?? [[x, y], [x + w, y], [x + w, y + h], [x, y + h]],
                confidence: Number(b.confidence ?? 0.90)
              }
            })
            resolve(mappedBoxes)
          } else {
            console.warn(`[RapidOcrTextBoxProvider] Runner returned invalid or empty boxes structure.`)
            resolve([])
          }
        } catch (parseErr) {
          console.warn(`[RapidOcrTextBoxProvider] Failed to parse runner stdout as JSON: ${String(parseErr)}. Raw output: ${trimmedStdout}`)
          resolve([])
        }
      })
    })
  }
}
