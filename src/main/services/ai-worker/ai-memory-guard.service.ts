import { spawn } from 'child_process'
import { resolvePythonExecutable } from '../ocr-dependency.service'
import fs from 'fs'
import type { AiGpuMonitorService } from './ai-gpu-monitor.service'
import type { ClearGpuMemoryResult } from '../../../shared/types/ai-worker.types'
import { resolveAiServicePath } from '../ai-service-paths'

export class AiMemoryGuardService {
  private pythonExe: string
  private clearScriptPath: string

  constructor(private gpuMonitor: AiGpuMonitorService) {
    this.pythonExe = resolvePythonExecutable()
    this.clearScriptPath = resolveAiServicePath(['tools', 'clear_gpu_memory.py'])
  }

  public async clearGpuMemory(reason: string): Promise<ClearGpuMemoryResult> {
    console.log(`[AiMemoryGuard] Executing GPU VRAM clear (Reason: ${reason})`)
    if (!fs.existsSync(this.clearScriptPath)) {
      return {
        success: false,
        before: null,
        after: null,
        error: 'clear_gpu_memory.py script not found'
      }
    }

    return new Promise((resolve) => {
      let stdout = ''
      let killed = false
      const child = spawn(this.pythonExe, [this.clearScriptPath], { shell: false })

      const timeout = setTimeout(() => {
        killed = true
        try { child.kill('SIGKILL') } catch {}
        resolve({
          success: false,
          before: null,
          after: null,
          error: 'GPU VRAM clear timeout'
        })
      }, 8000)

      child.stdout?.on('data', (chunk) => {
        stdout += chunk.toString()
      })

      child.on('error', (err) => {
        if (killed) return
        clearTimeout(timeout)
        resolve({
          success: false,
          before: null,
          after: null,
          error: String(err)
        })
      })

      child.on('close', (code) => {
        if (killed) return
        clearTimeout(timeout)

        if (code !== 0) {
          resolve({
            success: false,
            before: null,
            after: null,
            error: `GPU VRAM clear script exited with code ${code}`
          })
          return
        }

        try {
          const parsed = JSON.parse(stdout.trim())
          resolve(parsed)
        } catch (e) {
          resolve({
            success: false,
            before: null,
            after: null,
            error: `Failed to parse GPU VRAM clear output JSON: ${String(e)}`
          })
        }
      })
    })
  }
}
