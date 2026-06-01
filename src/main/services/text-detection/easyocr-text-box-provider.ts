import { ITextBoxProvider } from './text-box-provider.types'
import type { TextBox } from '../../../shared/types/color-palette.types'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import { resolvePythonExecutable } from '../ocr-dependency.service'
import { getPythonModelCacheEnv } from '../ai-models/ai-model-registry'

export class EasyOcrColorTextBoxProvider implements ITextBoxProvider {
  private config: { timeoutMs: number; minConfidence: number; maxTextBoxes: number }

  constructor(config: { timeoutMs: number; minConfidence: number; maxTextBoxes: number }) {
    this.config = config
  }

  public async detect(imagePath: string, _assetId?: string): Promise<TextBox[]> {
    const pythonExe = resolvePythonExecutable()
    
    // Resolve absolute path to easyocr_color_worker.py in workspace
    const workspace = process.cwd()
    const workerPath = path.resolve(workspace, 'ai-service', 'ocr_workers', 'easyocr_color_worker.py')
    
    console.log(`[EasyOcrColorTextBoxProvider] Spawning easyocr worker: ${workerPath} for image: ${imagePath} using ${pythonExe}`)

    if (!fs.existsSync(workerPath)) {
      throw new Error(`EasyOCR worker script not found at: ${workerPath}`)
    }

    const payload = {
      imagePath: imagePath.replace(/\\/g, '/'),
      languages: ['ch_sim', 'en'],
      gpu: true,
      options: {
        extractColor: true,
        minConfidence: this.config.minConfidence
      }
    }

    return new Promise<TextBox[]>((resolve, reject) => {
      let stdoutData = ''
      let stderrData = ''
      let killed = false

      const child = spawn(pythonExe, [workerPath], { shell: false, env: getPythonModelCacheEnv() })

      // Write JSON parameters to stdin and close it
      child.stdin.write(JSON.stringify(payload), 'utf8')
      child.stdin.end()

      // Handle timeout (ensure enough time for standard model runs)
      const timeoutMs = Math.max(this.config.timeoutMs, 30000)
      const timer = setTimeout(() => {
        killed = true
        try {
          child.kill('SIGKILL')
        } catch {}
        reject(new Error(`EasyOCR worker process execution timed out after ${timeoutMs}ms.`))
      }, timeoutMs)

      child.stdout.on('data', (chunk) => {
        stdoutData += chunk.toString()
      })

      child.stderr.on('data', (chunk) => {
        stderrData += chunk.toString()
      })

      child.on('error', (err) => {
        if (killed) return
        clearTimeout(timer)
        reject(new Error(`Failed to spawn EasyOCR worker process: ${err.message}`))
      })

      child.on('close', (code) => {
        if (killed) return
        clearTimeout(timer)

        const trimmedStdout = stdoutData.trim()
        
        if (code !== 0 || !trimmedStdout) {
          const stderrSummary = stderrData.trim() ? ` Stderr:\n${stderrData.trim()}` : ''
          reject(new Error(`EasyOCR worker process exited with code ${code}.${stderrSummary}`))
          return
        }

        try {
          const parsed = JSON.parse(trimmedStdout)

          if (parsed.success === false && parsed.error) {
            reject(new Error(`EasyOCR worker error: [${parsed.error.code}] ${parsed.error.message}\nStderr:\n${parsed.error.stderr || stderrData}`))
            return
          }

          if (parsed.success === true && parsed.data && Array.isArray(parsed.data.items)) {
            // Map the parsed worker items directly to TextBox schema
            const boxes: TextBox[] = parsed.data.items.map((item: any) => ({
              x: item.bbox[0],
              y: item.bbox[1],
              width: item.bbox[2],
              height: item.bbox[3],
              polygon: item.polygon,
              confidence: item.score,
              text: item.text,
              color: item.textColor,
              background_color: item.backgroundColor,
              readability_score: item.contrast
            }))

            resolve(boxes.slice(0, this.config.maxTextBoxes))
          } else {
            reject(new Error(`Invalid structured JSON response returned from EasyOCR worker. stdout:\n${trimmedStdout}`))
          }
        } catch (jsonErr: any) {
          reject(new Error(`Failed to parse structured JSON from EasyOCR worker: ${jsonErr.message}. Raw stdout:\n${trimmedStdout}\nStderr:\n${stderrData}`))
        }
      })
    })
  }
}
