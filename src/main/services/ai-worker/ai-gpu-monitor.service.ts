import { spawn } from 'child_process'
import { resolvePythonExecutable } from '../ocr-dependency.service'
import path from 'path'
import fs from 'fs'
import type { GpuStatus } from '../../../shared/types/ai-worker.types'

export class AiGpuMonitorService {
  private pythonExe: string
  private scriptPath: string

  constructor() {
    this.pythonExe = resolvePythonExecutable()
    this.scriptPath = path.resolve(process.cwd(), 'ai-service', 'tools', 'gpu_memory_probe.py')
  }

  public async getGpuStatus(): Promise<GpuStatus> {
    if (!fs.existsSync(this.scriptPath)) {
      return {
        success: false,
        cudaAvailable: false,
        gpuName: null,
        totalVramGB: 0,
        freeVramGB: 0,
        usedVramGB: 0,
        usagePercent: 0,
        error: 'gpu_memory_probe.py script not found'
      }
    }

    return new Promise((resolve) => {
      let stdout = ''
      let killed = false
      const child = spawn(this.pythonExe, [this.scriptPath], { shell: false })

      const timeout = setTimeout(() => {
        killed = true
        try { child.kill('SIGKILL') } catch {}
        resolve({
          success: false,
          cudaAvailable: false,
          gpuName: null,
          totalVramGB: 0,
          freeVramGB: 0,
          usedVramGB: 0,
          usagePercent: 0,
          error: 'GPU probe timeout'
        })
      }, 5000)

      child.stdout?.on('data', (chunk) => {
        stdout += chunk.toString()
      })

      child.on('error', (err) => {
        if (killed) return
        clearTimeout(timeout)
        resolve({
          success: false,
          cudaAvailable: false,
          gpuName: null,
          totalVramGB: 0,
          freeVramGB: 0,
          usedVramGB: 0,
          usagePercent: 0,
          error: String(err)
        })
      })

      child.on('close', (code) => {
        if (killed) return
        clearTimeout(timeout)

        if (code !== 0) {
          resolve({
            success: false,
            cudaAvailable: false,
            gpuName: null,
            totalVramGB: 0,
            freeVramGB: 0,
            usedVramGB: 0,
            usagePercent: 0,
            error: `GPU probe script exited with code ${code}`
          })
          return
        }

        try {
          const parsed = JSON.parse(stdout.trim())
          resolve(parsed)
        } catch (e) {
          resolve({
            success: false,
            cudaAvailable: false,
            gpuName: null,
            totalVramGB: 0,
            freeVramGB: 0,
            usedVramGB: 0,
            usagePercent: 0,
            error: `Failed to parse GPU probe output JSON: ${String(e)}`
          })
        }
      })
    })
  }
}
