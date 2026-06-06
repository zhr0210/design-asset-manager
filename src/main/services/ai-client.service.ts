import { getDatabase } from '../db'
import { TagService } from './tag.service'
import { AssetTagService } from './asset-tag.service'
import { readAiQueueStats } from './ai-client/queue-stats'
import {
  projectAiAnalysisCompletion,
  projectAiPromptCompletion,
  projectAiTaskSyncAction,
  projectAiTaggingCompletion,
  workerEpochSecondsToIso
} from './ai-client/ai-result-sync.projector'
import { syncProjectedAiTagSuggestion } from './ai-client/ai-tag-suggestion-sync.sink'
import {
  syncProjectedAiTaskCompletionRecord,
  syncProjectedAiTaskLifecycle
} from './ai-client/ai-task-lifecycle-sync.sink'
import { createAssetTaggingTaskSubmission } from '../../shared/workflows/asset-tagging.workflow'
import type { MacOSAiWorkerProbeResult } from '../../shared/types/macos-ai-runtime.types'
import type {
  AiRuntimeClipSiglipOnnxStatusResponse,
  AiRuntimeOnnxModelLoadProbeResponse,
  AiRuntimePythonMpsExecutionProbeResponse,
  AiRuntimePythonMpsStatusResponse
} from '../../shared/contracts/ai-runtime.contract'
import {
  EVENT_AI_TASK_SYNCED,
  type AnalysisGenerateResponse,
  type EnqueueTagResponse,
  type ModelStatusResponse,
  type ProcessBatchResponse,
  type PromptGenerateResponse,
  type RoutingPreviewResponse,
  type UnloadModelResponse
} from '../../shared/contracts/ai-client.contract'
import type { AssetTaggingModelId } from '../../shared/workflows/asset-tagging.workflow'

const AI_CAPABILITY_PROBE_TIMEOUT_MS = 30_000

export class AiClientService {
  private pythonUrl = 'http://127.0.0.1:8000'
  private pollTimeout: NodeJS.Timeout | null = null
  private isPolling = false
  private failureCount = 0

  private getDb() {
    return getDatabase()
  }

  private getTagService() {
    return new TagService()
  }

  private getAssetTagService() {
    return new AssetTagService()
  }

  public startQueueSync() {
    if (this.isPolling) return
    this.isPolling = true
    console.log('[AIClient] Starting automatic background task sync poller...')
    this.scheduleNextPoll(3000)
    
    // Listen for Electron will-quit event to safely stop poller
    try {
      const { app } = require('electron')
      app.on('will-quit', () => {
        this.stopQueueSync()
      })
    } catch (e) {
      // Ignored if run in a different environment
    }
  }

  public stopQueueSync() {
    this.isPolling = false
    if (this.pollTimeout) {
      clearTimeout(this.pollTimeout)
      this.pollTimeout = null
      console.log('[AIClient] Background task sync poller stopped.')
    }
  }

  private scheduleNextPoll(delay: number) {
    if (this.pollTimeout) {
      clearTimeout(this.pollTimeout)
    }
    if (!this.isPolling) return

    this.pollTimeout = setTimeout(async () => {
      await this.executePollCycle()
    }, delay)
  }

  private async executePollCycle() {
    try {
      const connected = await this.pollCompletedTasks()
      if (connected) {
        if (this.failureCount > 0) {
          console.log('[AIClient] Python AI Worker service successfully reconnected. Resetting poll rate to 3s.')
        }
        this.failureCount = 0
        this.scheduleNextPoll(3000)
      } else {
        this.handlePollFailure()
      }
    } catch (err) {
      this.handlePollFailure()
    }
  }

  private handlePollFailure() {
    this.failureCount++
    let nextDelay = 3000
    if (this.failureCount === 1) {
      nextDelay = 3000
      console.warn(`[AIClient] Python AI Worker service connection failed (Retry 1). Retrying in 3s.`)
    } else if (this.failureCount === 2) {
      nextDelay = 10000
      console.warn(`[AIClient] Python AI Worker service connection failed (Retry 2). Backing off for 10s.`)
    } else {
      nextDelay = 30000
      // Completely mute warnings after 3rd failure to prevent console flooding
    }
    this.scheduleNextPoll(nextDelay)
  }

  private notifyRenderer(assetId: string) {
    try {
      const { BrowserWindow } = require('electron')
      BrowserWindow.getAllWindows().forEach((win: any) => {
        if (!win.isDestroyed()) {
          win.webContents.send(EVENT_AI_TASK_SYNCED, { assetId })
        }
      })
    } catch (err) {
      console.error('[AIClient] Failed to notify renderer:', err)
    }
  }

  /**
   * Enqueues an asset for background batch tagging in Python.
   */
  public async enqueueTagging(
    assetId: string,
    filePath: string,
    priority: number = 0,
    modelsToRun?: AssetTaggingModelId[]
  ): Promise<EnqueueTagResponse> {
    const db = this.getDb()
    const now = new Date().toISOString()
    
    try {
      const res = await fetch(`${this.pythonUrl}/ai/tag/enqueue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asset_id: assetId, file_path: filePath, priority, models_to_run: modelsToRun })
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()

      if (data.success) {
        const submission = createAssetTaggingTaskSubmission({ modelsToRun })
        const resolvedModelName = modelsToRun && modelsToRun.length > 0
          ? submission.modelName
          : (data.model_name || submission.modelName)

        // Log inside local ai_tag_tasks table
        db.prepare(`
          INSERT OR REPLACE INTO ai_tag_tasks (id, asset_id, file_path, status, priority, model_name, retry_count, created_at, sync_status)
          VALUES (?, ?, ?, 'queued', ?, ?, 0, ?, 'pending')
        `).run(data.task_id, assetId, filePath, priority, resolvedModelName, now)

        // Update assets columns status
        db.prepare("UPDATE assets SET ai_tag_status = ? WHERE id = ?").run('queued', assetId)
        
        this.notifyRenderer(assetId)
      }
      return data
    } catch (err) {
      console.error('[AIClient] Enqueue tagging failed:', err)
      return { success: false, error: String(err) }
    }
  }

  /**
   * Manually trigger batch processing in Python.
   */
  public async processBatch(): Promise<ProcessBatchResponse> {
    try {
      const res = await fetch(`${this.pythonUrl}/ai/tag/process-batch`, { method: 'POST' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch (err) {
      console.error('[AIClient] Trigger process batch failed:', err)
      return { success: false, error: String(err) }
    }
  }

  /**
   * Fetch active loaded models and VRAM usage.
   */
  public async getModelsStatus(): Promise<ModelStatusResponse> {
    const db = this.getDb()
    const queueStats = readAiQueueStats(db)

    try {
      const res = await fetch(`${this.pythonUrl}/ai/model/status`, { signal: AbortSignal.timeout(1000) })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      return {
        success: true,
        offline: false,
        loaded_models: data.loaded_models,
        cooperative_models: data.cooperative_models ?? {},
        gpu_status: data.gpu_status,
        queue_stats: queueStats
      }
    } catch (err) {
      return {
        success: true,
        offline: true,
        loaded_models: {},
        cooperative_models: {},
        gpu_status: {
          available: false,
          is_mock: false,
          device_name: "Python AI Service Offline",
          total_vram_mb: 0,
          used_vram_mb: 0,
          free_vram_mb: 0,
          utilization_percent: 0,
          error: "Python AI Worker is offline."
        },
        queue_stats: queueStats
      }
    }
  }

  /**
   * Fetches the macOS AI branch worker capability probe without loading models.
   */
  public async getMacOSCapabilities(): Promise<{
    success: boolean
    offline: boolean
    capabilities: MacOSAiWorkerProbeResult | null
    error?: string
  }> {
    try {
      const res = await fetch(`${this.pythonUrl}/ai/runtime/macos-capabilities`, {
        signal: AbortSignal.timeout(AI_CAPABILITY_PROBE_TIMEOUT_MS)
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      return {
        success: true,
        offline: false,
        capabilities: data as MacOSAiWorkerProbeResult
      }
    } catch (err) {
      return {
        success: true,
        offline: true,
        capabilities: null,
        error: err instanceof Error ? err.message : String(err)
      }
    }
  }

  /**
   * Fetches the Python MPS compatibility signal without loading models.
   */
  public async getPythonMpsStatus(): Promise<AiRuntimePythonMpsStatusResponse & { offline: boolean; error?: string | null }> {
    try {
      const res = await fetch(`${this.pythonUrl}/ai/model/python-mps/status`, {
        signal: AbortSignal.timeout(AI_CAPABILITY_PROBE_TIMEOUT_MS)
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const compatData = data as {
        success?: boolean
        compatible: boolean
        runtime?: string | null
        status: AiRuntimePythonMpsStatusResponse['status']
        diagnostics?: Record<string, unknown>
        error?: { code?: string; message?: string } | string | null
      }
      const errorMessage = typeof compatData.error === 'string'
        ? compatData.error
        : compatData.error && typeof compatData.error === 'object'
          ? String((compatData.error as { message?: unknown }).message ?? null)
          : null
      return {
        success: compatData.success ?? true,
        offline: false,
        compatible: compatData.compatible,
        runtime: compatData.runtime ?? null,
        status: compatData.status,
        diagnostics: compatData.diagnostics ?? {},
        error: errorMessage
      }
    } catch (err) {
      return {
        success: false,
        offline: true,
        compatible: false,
        runtime: null,
        status: 'unavailable',
        diagnostics: {},
        error: err instanceof Error ? err.message : String(err)
      }
    }
  }

  /**
   * Fetches the CLIP/SigLIP ONNX compatibility signal without loading models.
   */
  public async getClipSiglipOnnxStatus(): Promise<AiRuntimeClipSiglipOnnxStatusResponse & { offline: boolean; error?: string | null }> {
    try {
      const res = await fetch(`${this.pythonUrl}/ai/model/clip-siglip-onnx/status`, {
        signal: AbortSignal.timeout(AI_CAPABILITY_PROBE_TIMEOUT_MS)
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const compatData = data as AiRuntimeClipSiglipOnnxStatusResponse & { error?: { code: string; message: string } | null }
      return {
        success: compatData.success ?? true,
        offline: false,
        compatible: compatData.compatible,
        runtime: compatData.runtime ?? null,
        diagnostics: compatData.diagnostics ?? {},
        error: compatData.error?.message ?? null
      }
    } catch (err) {
      return {
        success: false,
        offline: true,
        compatible: false,
        runtime: null,
        diagnostics: {},
        error: err instanceof Error ? err.message : String(err)
      }
    }
  }

  public async probeOnnxModelLoad(): Promise<AiRuntimeOnnxModelLoadProbeResponse> {
    const res = await fetch(`${this.pythonUrl}/ai/model/onnx-load-probe`, {
      method: 'POST',
      signal: AbortSignal.timeout(10_000)
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json() as AiRuntimeOnnxModelLoadProbeResponse
  }

  public async probePythonMpsExecution(): Promise<AiRuntimePythonMpsExecutionProbeResponse> {
    const res = await fetch(`${this.pythonUrl}/ai/model/python-mps/execution-probe`, {
      method: 'POST',
      signal: AbortSignal.timeout(AI_CAPABILITY_PROBE_TIMEOUT_MS)
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json() as AiRuntimePythonMpsExecutionProbeResponse
  }

  /**
   * Forcibly release loaded model memory.
   */
  public async unloadModels(): Promise<UnloadModelResponse> {
    try {
      const res = await fetch(`${this.pythonUrl}/ai/model/unload`, { method: 'POST' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch (err) {
      console.error('[AIClient] Force unload models failed:', err)
      return { success: false, error: String(err) }
    }
  }

  /**
   * Preview how a given file path would be routed in the VisualRouter.
   */
  public async getRoutingPreview(filePath: string): Promise<RoutingPreviewResponse> {
    try {
      const res = await fetch(`${this.pythonUrl}/ai/routing/preview?file_path=${encodeURIComponent(filePath)}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch (err) {
      console.error('[AIClient] Get routing preview failed:', err)
      return { success: false, error: String(err) }
    }
  }


  /**
   * Triggers manual prompt reversal.
   */
  public async generatePrompt(assetId: string, filePath: string): Promise<PromptGenerateResponse> {
    const db = this.getDb()
    const now = new Date().toISOString()

    try {
      const res = await fetch(`${this.pythonUrl}/ai/prompt/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asset_id: assetId, file_path: filePath })
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()

      if (data.success) {
        // Log in ai_prompt_tasks
        db.prepare(`
          INSERT OR REPLACE INTO ai_prompt_tasks (id, asset_id, file_path, status, model_name, created_at, sync_status)
          VALUES (?, ?, ?, 'queued', 'JoyCaption-v2', ?, 'pending')
        `).run(data.task_id, assetId, filePath, now)

        db.prepare("UPDATE assets SET ai_prompt_status = ? WHERE id = ?").run('queued', assetId)
        
        this.notifyRenderer(assetId)
      }
      return data
    } catch (err) {
      console.error('[AIClient] Generate prompt failed:', err)
      return { success: false, error: String(err) }
    }
  }

  /**
   * Triggers manual deep design sweep.
   */
  public async generateAnalysis(assetId: string, filePath: string): Promise<AnalysisGenerateResponse> {
    const db = this.getDb()
    const now = new Date().toISOString()

    try {
      const res = await fetch(`${this.pythonUrl}/ai/analysis/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asset_id: assetId, file_path: filePath })
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()

      if (data.success) {
        // Log in ai_analysis_tasks
        db.prepare(`
          INSERT OR REPLACE INTO ai_analysis_tasks (id, asset_id, file_path, status, model_name, created_at, sync_status)
          VALUES (?, ?, ?, 'queued', 'Qwen2.5-VL', ?, 'pending')
        `).run(data.task_id, assetId, filePath, now)

        db.prepare("UPDATE assets SET ai_analysis_status = ? WHERE id = ?").run('queued', assetId)
        
        this.notifyRenderer(assetId)
      }
      return data
    } catch (err) {
      console.error('[AIClient] Generate analysis failed:', err)
      return { success: false, error: String(err) }
    }
  }

  /**
   * Periodically queries Python status and synchronizes completed batch tag, prompt, and analysis jobs.
   * Returns true if Python server is online, false otherwise.
   */
  private async pollCompletedTasks(): Promise<boolean> {
    const db = this.getDb()
    const tagService = this.getTagService()
    const assetTagService = this.getAssetTagService()

    // 1. Test connectivity first
    try {
      const checkRes = await fetch(`${this.pythonUrl}/ai/model/status`, { signal: AbortSignal.timeout(1500) })
      if (!checkRes.ok) return false
    } catch (err) {
      return false
    }

    const now = new Date().toISOString()

    // 2. Poll Tagging Tasks (status = 'queued' or 'running')
    const localTagTasks = db.prepare("SELECT id, asset_id FROM ai_tag_tasks WHERE status IN ('queued', 'running', 'waiting')").all() as Array<{ id: string; asset_id: string }>
    for (const t of localTagTasks) {
      try {
        const res = await fetch(`${this.pythonUrl}/ai/prompt/status/${t.id}`)
        if (!res.ok) continue
        
        const task = await res.json()
        
        const action = projectAiTaskSyncAction({
          workflow: 'tagging',
          workerStatus: task.status,
          hasResult: Boolean(task.result),
          errorMessage: task.error_message
        })
        if (syncProjectedAiTaskLifecycle({
          db,
          workflow: 'tagging',
          taskId: t.id,
          assetId: t.asset_id,
          action
        })) {
          this.notifyRenderer(t.asset_id)
          continue
        }

        if (action.lifecycle === 'completed') {
          const r = task.result
          
          db.transaction(() => {
            syncProjectedAiTaskCompletionRecord({
              db,
              workflow: 'tagging',
              taskId: t.id,
              action,
              syncedAt: now,
              startedAt: workerEpochSecondsToIso(task.started_at),
              completedAt: workerEpochSecondsToIso(task.completed_at)
            })

            // Query existing user edits for caption safety override.
            const assetData = db.prepare(`
              SELECT ai_caption_is_user_edited FROM assets WHERE id = ?
            `).get(t.asset_id) as { ai_caption_is_user_edited?: number } | undefined
            const completion = projectAiTaggingCompletion(r, {
              isCaptionUserEdited: assetData?.ai_caption_is_user_edited === 1,
              now
            })

            for (const suggestion of completion.suggestions) {
              syncProjectedAiTagSuggestion({
                db,
                tagService,
                assetTagService,
                assetId: t.asset_id,
                suggestion,
                now
              })
            }

            let updateCaptionSql = ''
            const params: any[] = []

            if (completion.caption) {
              updateCaptionSql += `, ai_caption = ?, ai_caption_en = ?, ai_caption_translated_by = ?, ai_caption_source = ?, ai_caption_updated_at = ?`
              params.push(
                completion.caption.value,
                completion.caption.englishValue,
                completion.caption.translatedBy,
                completion.caption.source,
                completion.caption.updatedAt
              )
            }

            if (completion.ocr) {
              updateCaptionSql += `, ai_ocr_text = ?, ai_ocr_source = ?, ai_ocr_updated_at = ?`
              params.push(completion.ocr.text, completion.ocr.source, completion.ocr.updatedAt)
            }

            // Update assets columns status, including the real physical image dimensions returned by the Python AI worker!
            db.prepare(`
              UPDATE assets
              SET ai_tag_status = ?, ai_tagged_at = ?, width = ?, height = ? ${updateCaptionSql}
              WHERE id = ?
            `).run(action.assetStatus, now, completion.width, completion.height, ...params, t.asset_id)
          })()
          
          console.log(`[AIClient] Batch tagging task ${t.id} successfully synced into SQLite library.`)
          this.notifyRenderer(t.asset_id)
        }
      } catch (err) {
        console.error(`[AIClient] Error polling completed tagging task ${t.id}:`, err)
      }
    }

    // 3. Poll legacy asynchronous Prompt Tasks.
    const localPromptTasks = db.prepare("SELECT id, asset_id FROM ai_prompt_tasks WHERE status IN ('queued', 'running', 'processing', 'waiting')").all() as Array<{ id: string; asset_id: string }>
    for (const t of localPromptTasks) {
      try {
        const res = await fetch(`${this.pythonUrl}/ai/prompt/status/${t.id}`)
        if (!res.ok) continue

        const task = await res.json()
        const action = projectAiTaskSyncAction({
          workflow: 'prompt',
          workerStatus: task.status,
          hasResult: Boolean(task.result),
          errorMessage: task.error_message
        })
        if (syncProjectedAiTaskLifecycle({
          db,
          workflow: 'prompt',
          taskId: t.id,
          assetId: t.asset_id,
          action
        })) {
          this.notifyRenderer(t.asset_id)
          continue
        }

        if (action.lifecycle === 'completed') {
          const completion = projectAiPromptCompletion(task.result)
          db.transaction(() => {
            syncProjectedAiTaskCompletionRecord({
              db,
              workflow: 'prompt',
              taskId: t.id,
              action,
              syncedAt: now,
              startedAt: workerEpochSecondsToIso(task.started_at),
              completedAt: workerEpochSecondsToIso(task.completed_at),
              resultPrompt: completion.prompt,
              resultCaption: completion.caption
            })

            db.prepare(`
              UPDATE assets
              SET ai_prompt_status = ?, ai_prompt = ?
              WHERE id = ?
            `).run(action.assetStatus, completion.prompt, t.asset_id)
          })()

          console.log(`[AIClient] Legacy prompt task ${t.id} successfully synced into SQLite.`)
          this.notifyRenderer(t.asset_id)
        }
      } catch (err) {
        console.error(`[AIClient] Error polling completed prompt task ${t.id}:`, err)
      }
    }

    // 4. Poll Deep Layout Sweep Tasks
    const localAnalysisTasks = db.prepare("SELECT id, asset_id FROM ai_analysis_tasks WHERE status IN ('queued', 'running', 'processing')").all() as Array<{ id: string; asset_id: string }>
    for (const t of localAnalysisTasks) {
      try {
        const res = await fetch(`${this.pythonUrl}/ai/prompt/status/${t.id}`)
        if (!res.ok) continue
        
        const task = await res.json()
        const action = projectAiTaskSyncAction({
          workflow: 'analysis',
          workerStatus: task.status,
          hasResult: Boolean(task.result),
          errorMessage: task.error_message
        })
        if (syncProjectedAiTaskLifecycle({
          db,
          workflow: 'analysis',
          taskId: t.id,
          assetId: t.asset_id,
          action
        })) {
          this.notifyRenderer(t.asset_id)
          continue
        }

        if (action.lifecycle === 'completed') {
          const r = task.result
          const completion = projectAiAnalysisCompletion(r, now)
          db.transaction(() => {
            syncProjectedAiTaskCompletionRecord({
              db,
              workflow: 'analysis',
              taskId: t.id,
              action,
              syncedAt: now,
              startedAt: workerEpochSecondsToIso(task.started_at),
              completedAt: workerEpochSecondsToIso(task.completed_at),
              resultJson: completion.resultJson
            })

            db.prepare(`
              UPDATE assets
              SET ai_analysis_status = ?,
                  ai_analysis_json = ?,
                  ai_ocr_text = ?,
                  ai_ocr_source = ?,
                  ai_ocr_updated_at = ?
              WHERE id = ?
            `).run(
              action.assetStatus,
              completion.resultJson,
              completion.ocrText,
              completion.ocrSource,
              completion.ocrUpdatedAt,
              t.asset_id
            )

            // Sync text_tags and design_tags to tag_suggestions as pending
            for (const item of completion.suggestions) {
              syncProjectedAiTagSuggestion({
                db,
                tagService,
                assetTagService,
                assetId: t.asset_id,
                suggestion: item,
                now
              })
            }
          })()
          
          // Re-extract color palette with the newly generated text boxes in background
          try {
            const assetRow = db.prepare('SELECT file_path FROM assets WHERE id = ?').get(t.asset_id) as { file_path: string } | undefined
            if (assetRow && assetRow.file_path) {
              (async () => {
                const { ColorPaletteService } = await import('./color-palette.service')
                const paletteService = new ColorPaletteService()
                await paletteService.refreshTextPaletteFromTextBlocks(t.asset_id, completion.textBlocks)
              })().catch((err: any) => {
                console.error('[AIClient] Failed background color palette extraction on AI analysis completion:', err)
              })
            }
          } catch (colorErr) {
            console.error('[AIClient] Failed to trigger color palette extraction:', colorErr)
          }

          console.log(`[AIClient] Deep analysis task ${t.id} successfully synced into SQLite.`)
          this.notifyRenderer(t.asset_id)
        }
      } catch (err) {
        console.error(`[AIClient] Error polling completed analysis task ${t.id}:`, err)
      }
    }

    return true
  }
}
