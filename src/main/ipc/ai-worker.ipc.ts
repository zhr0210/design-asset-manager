import { ipcMain } from 'electron'
import { spawn } from 'child_process'
import path from 'path'
import os from 'os'
import { AiWorkerManager } from '../services/ai-worker/ai-worker-manager'
import { Qwen3vlPromptProvider } from '../services/ai-worker/providers/qwen3vl-prompt.provider'
import { getDatabase } from '../db'
import { CHANNEL_OCR_INSTALL_LOG_UPDATE } from '../../shared/contracts/ocr-dependency.contract'

export function registerAiWorkerIpc() {
  const manager = AiWorkerManager.getInstance()
  
  // Register the Qwen3-VL provider on initialization
  manager.registerProvider(new Qwen3vlPromptProvider())

  ipcMain.handle('ai-worker:run-prompt-reverse', async (_, { assetId, filePath, modelId, modelPath, promptTemplateId, promptTemplateText }) => {
    try {
      const result = await manager.runPromptReverse({ assetId, filePath, modelId, modelPath, promptTemplateId, promptTemplateText })
      
      // Save result prompt JSON in assets table
      if (result.success && result.data) {
        const db = getDatabase()
        const now = new Date().toISOString()
        
        db.transaction(() => {
          db.prepare(`
            UPDATE assets 
            SET ai_prompt_status = 'synced', ai_prompt = ?
            WHERE id = ?
          `).run(JSON.stringify(result.data), assetId)
          
          // Log in ai_prompt_tasks
          const taskId = `prompt-task-${Math.random().toString(36).substr(2, 9)}`
          db.prepare(`
            INSERT INTO ai_prompt_tasks (id, asset_id, file_path, status, model_name, result_prompt, result_caption, created_at, synced_at, sync_status)
            VALUES (?, ?, ?, 'completed', ?, ?, ?, ?, ?, 'synced')
          `).run(taskId, assetId, filePath, modelId, JSON.stringify(result.data), result.data.shortCaption || '', now, now)
        })()
      }
      return result
    } catch (err: any) {
      console.error('[IPC] ai-worker:run-prompt-reverse failed:', err)
      return { 
        success: false, 
        provider: 'prompt.qwen3vl',
        modelId,
        device: 'unknown',
        durationMs: 0,
        data: null,
        error: {
          code: err.code || 'UNKNOWN_ERROR',
          message: err.message || String(err)
        } 
      }
    }
  })

  ipcMain.handle('ai-worker:get-gpu-status', async () => {
    try {
      return await manager.getGpuMonitor().getGpuStatus()
    } catch (err: any) {
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('ai-worker:clear-gpu-memory', async () => {
    try {
      // Force kill Llama background process to release its GGUF GPU memory
      try {
        const { LlamaRuntimeInstallService } = await import('../services/llama-runtime/llama-runtime-install.service')
        LlamaRuntimeInstallService.getInstance().stopServer()
      } catch (e) {
        // ignore
      }
      
      return await manager.getMemoryGuard().clearGpuMemory('User manual trigger')
    } catch (err: any) {
      return { success: false, error: String(err) }
    }
  })

  // macOS AI dependency installer (torch, transformers, onnxruntime, etc.)
  ipcMain.handle('macos-ai:install-deps', async (event) => {
    const { ensureMacOSAiPythonRuntime } = await import('../services/ocr-dependency.service')
    const { resolveAiServicePath } = await import('../services/ai-service-paths')
    const installScript = resolveAiServicePath(['tools', 'install_macos_ai_deps.py'])
    const startedAt = Date.now()
    const scriptLabel = 'ai-service/tools/install_macos_ai_deps.py'
    const runtime = await ensureMacOSAiPythonRuntime()
    const pythonExe = runtime.pythonPath
    const pythonLabel = runtime.success ? 'managed-venv-python' : path.basename(pythonExe)

    if (!runtime.success) {
      return {
        success: false,
        exitCode: null,
        durationMs: Date.now() - startedAt,
        python: pythonLabel,
        script: scriptLabel,
        runtime: {
          managed: true,
          ready: false,
          created: runtime.created
        },
        installedPackages: [],
        failedPackages: [{ package: 'python-venv', detail: runtime.error ?? 'failed to create managed Python environment' }],
        events: [],
        outputTail: runtime.error ?? ''
      }
    }

    console.log('[macos-ai:install-deps] Running:', pythonLabel, scriptLabel)

    return new Promise((resolve) => {
      const child = spawn(pythonExe, [installScript], {
        shell: false,
        env: {
          ...process.env,
          PYTHONPYCACHEPREFIX: process.env.PYTHONPYCACHEPREFIX || path.join(os.tmpdir(), 'design-asset-manager-pycache')
        }
      })
      let output = ''
      const events: any[] = []
      const failures: any[] = []

      child.stdout?.on('data', (chunk: Buffer) => {
        const text = chunk.toString()
        output += text
        for (const line of text.split(/\r?\n/)) {
          if (!line.trim()) continue
          try {
            const eventPayload = JSON.parse(line)
            events.push(eventPayload)
            if (Array.isArray(eventPayload.failures)) {
              failures.splice(0, failures.length, ...eventPayload.failures)
            } else if (eventPayload.type === 'error') {
              failures.push({ package: eventPayload.package ?? 'unknown', detail: eventPayload.message ?? eventPayload.detail ?? 'unknown' })
            }
            // Forward individual JSON event to renderer for real-time display
            if (!event.sender.isDestroyed()) {
              event.sender.send(CHANNEL_OCR_INSTALL_LOG_UPDATE, JSON.stringify(eventPayload))
            }
          } catch {
            // Non-JSON line: forward as raw log line
            if (!event.sender.isDestroyed() && line.trim()) {
              event.sender.send(CHANNEL_OCR_INSTALL_LOG_UPDATE, JSON.stringify({ type: 'pip-log', message: line.trim() }))
            }
          }
        }
      })

      child.stderr?.on('data', (chunk: Buffer) => {
        const text = chunk.toString()
        output += text
        if (!event.sender.isDestroyed()) {
          for (const line of text.split(/\r?\n/)) {
            if (line.trim()) {
              event.sender.send(CHANNEL_OCR_INSTALL_LOG_UPDATE, JSON.stringify({ type: 'pip-log', message: '[stderr] ' + line.trim() }))
            }
          }
        }
      })

      child.on('close', (code: number | null) => {
        console.log('[macos-ai:install-deps] Exited with code:', code)
        const completeEvent = [...events].reverse().find((entry) => entry?.type === 'complete')
        resolve({
          success: code === 0 && completeEvent?.success !== false,
          exitCode: code,
          durationMs: Date.now() - startedAt,
          python: pythonLabel,
          script: scriptLabel,
          runtime: {
            managed: true,
            ready: true,
            created: runtime.created
          },
          installedPackages: events.filter((entry) => entry?.type === 'package-complete' && entry.success).map((entry) => entry.package),
          failedPackages: failures.map((failure) => ({
            package: failure.package ?? 'unknown',
            detail: String(failure.detail ?? failure.message ?? 'unknown').slice(-1000)
          })),
          events: events.slice(-80),
          outputTail: output.slice(-2000)
        })
      })

      child.on('error', (err: Error) => {
        console.error('[macos-ai:install-deps] Spawn error:', err.message)
        resolve({
          success: false,
          error: err.message,
          durationMs: Date.now() - startedAt,
          python: pythonLabel,
          script: scriptLabel,
          runtime: {
            managed: true,
            ready: true,
            created: runtime.created
          },
          installedPackages: [],
          failedPackages: [{ package: 'installer', detail: err.message }],
          events: [],
          outputTail: ''
        })
      })
    })
  })
}
