import { getDatabase } from '../db'
import { TagService } from './tag.service'
import { AssetTagService } from './asset-tag.service'
import { readAiQueueStats } from './ai-client/queue-stats'
import type { MacOSAiWorkerProbeResult } from '../../shared/types/macos-ai-runtime.types'
import type { AiRuntimeClipSiglipOnnxStatusResponse, AiRuntimePythonMpsStatusResponse } from '../../shared/contracts/ai-runtime.contract'

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
          win.webContents.send('ai:task-synced', { assetId })
        }
      })
    } catch (err) {
      console.error('[AIClient] Failed to notify renderer:', err)
    }
  }

  /**
   * Enqueues an asset for background batch tagging in Python.
   */
  public async enqueueTagging(assetId: string, filePath: string, priority: number = 0, modelsToRun?: string[]): Promise<any> {
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
        // If modelsToRun is passed, we format model_name as custom_pipeline:...
        const resolvedModelName = modelsToRun && modelsToRun.length > 0 
          ? `custom_pipeline:${modelsToRun.join(',')}`
          : (data.model_name || 'WD-Tagger-v3')

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
  public async processBatch(): Promise<any> {
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
  public async getModelsStatus(): Promise<any> {
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
      const res = await fetch(`${this.pythonUrl}/ai/runtime/macos-capabilities`, { signal: AbortSignal.timeout(1000) })
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
      const res = await fetch(`${this.pythonUrl}/ai/model/python-mps/status`, { signal: AbortSignal.timeout(1000) })
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
      const res = await fetch(`${this.pythonUrl}/ai/model/clip-siglip-onnx/status`, { signal: AbortSignal.timeout(1000) })
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

  /**
   * Forcibly release loaded model memory.
   */
  public async unloadModels(): Promise<any> {
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
  public async getRoutingPreview(filePath: string): Promise<any> {
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
  public async generatePrompt(assetId: string, filePath: string): Promise<any> {
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
  public async generateAnalysis(assetId: string, filePath: string): Promise<any> {
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
        
        if (task.status === 'running' || task.status === 'processing') {
          db.prepare("UPDATE ai_tag_tasks SET status = 'running' WHERE id = ?").run(t.id)
          db.prepare("UPDATE assets SET ai_tag_status = 'running' WHERE id = ?").run(t.asset_id)
          this.notifyRenderer(t.asset_id)
        } else if (task.status === 'completed' && task.result) {
          const r = task.result
          
          db.transaction(() => {
            // Update task status inside transaction
            db.prepare(`
              UPDATE ai_tag_tasks
              SET status = 'completed', sync_status = 'synced', synced_at = ?, started_at = ?, completed_at = ?
              WHERE id = ?
            `).run(now, task.started_at ? new Date(task.started_at * 1000).toISOString() : null, task.completed_at ? new Date(task.completed_at * 1000).toISOString() : null, t.id)

            const insertSuggestion = db.prepare(`
              INSERT INTO tag_suggestions (id, asset_id, tag_name, tag_type, source, confidence, status, model_name, raw_payload, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)
            `)

            for (const item of r.tags || []) {
              const source = item.source || 'ai_wd_tagger'
              let modelName = item.model_name
              if (!modelName) {
                if (source === 'ai_ram') {
                  modelName = 'RAM++'
                } else if (source === 'ai_wd_tagger') {
                  modelName = 'WD-Tagger-v3'
                } else if (source === 'ai_florence') {
                  modelName = 'Florence-2'
                } else if (source === 'ai_clip_design') {
                  modelName = 'CLIP Classifier'
                } else if (source === 'design_rule') {
                  modelName = 'DesignRule'
                } else {
                  modelName = 'Cooperative-Tagger'
                }
              }
              
              // 1. Idempotency Check for tag_suggestions
              const sugExists = db.prepare(`
                SELECT 1 FROM tag_suggestions 
                WHERE asset_id = ? AND tag_name = ? AND source = ? AND model_name = ?
              `).get(t.asset_id, item.name, source, modelName)

              if (!sugExists) {
                const sugId = `sug-${Math.random().toString(36).substr(2, 9)}`
                insertSuggestion.run(
                  sugId,
                  t.asset_id,
                  item.name,
                  item.type,
                  source,
                  item.confidence,
                  modelName,
                  JSON.stringify(item),
                  now,
                  now
                )
              }

              // Verify tag exists in tags table
              const tagList = tagService.listTags({ searchQuery: item.name, type: item.type })
              let tagId = ''
              if (tagList.length > 0) {
                tagId = tagList[0].id
              } else {
                const newTag = tagService.createTag({
                  name: item.name,
                  type: item.type,
                  color: 'bg-purple-50 text-purple-700 border border-purple-200'
                })
                tagId = newTag.id
              }

              // 2. Idempotency Check for asset_tags (addTagToAsset does it automatically, but let's be explicit)
              assetTagService.addTagToAsset(t.asset_id, tagId, {
                source,
                confidence: item.confidence,
                status: 'pending',
                modelName,
                createdBy: 'ai'
              })
            }

            // Query existing user edits and ocr states for safety overrides
            const assetData = db.prepare(`
              SELECT ai_caption_is_user_edited, ai_ocr_text FROM assets WHERE id = ?
            `).get(t.asset_id) as { ai_caption_is_user_edited?: number, ai_ocr_text?: string } | undefined

            const isUserEdited = assetData?.ai_caption_is_user_edited === 1
            const existingOcr = assetData?.ai_ocr_text || ''

            let updateCaptionSql = ''
            const params: any[] = []

            if (!isUserEdited && r.caption) {
              updateCaptionSql += `, ai_caption = ?, ai_caption_en = ?, ai_caption_translated_by = ?, ai_caption_source = ?, ai_caption_updated_at = ?`
              params.push(r.caption, r.caption_en || '', r.caption_translated_by || 'none', 'ai_florence', now)
            }

            if (r.ocr_text && r.ocr_text.trim()) {
              updateCaptionSql += `, ai_ocr_text = ?, ai_ocr_source = ?, ai_ocr_updated_at = ?`
              params.push(r.ocr_text.trim(), 'ai_florence_ocr', now)
            }

            // Update assets columns status, including the real physical image dimensions returned by the Python AI worker!
            db.prepare(`
              UPDATE assets
              SET ai_tag_status = 'synced', ai_tagged_at = ?, width = ?, height = ? ${updateCaptionSql}
              WHERE id = ?
            `).run(now, r.width || 1920, r.height || 1080, ...params, t.asset_id)
          })()
          
          console.log(`[AIClient] Batch tagging task ${t.id} successfully synced into SQLite library.`)
          this.notifyRenderer(t.asset_id)
          
        } else if (task.status === 'failed') {
          db.prepare(`
            UPDATE ai_tag_tasks 
            SET status = 'failed', sync_status = 'failed', error_message = ? 
            WHERE id = ?
          `).run(task.error_message || 'Inference error on Python AI worker', t.id)
          db.prepare("UPDATE assets SET ai_tag_status = 'failed' WHERE id = ?").run(t.asset_id)
          this.notifyRenderer(t.asset_id)
        } else if (task.status === 'cancelled') {
          db.prepare("UPDATE ai_tag_tasks SET status = 'cancelled' WHERE id = ?").run(t.id)
          db.prepare("UPDATE assets SET ai_tag_status = 'not_started' WHERE id = ?").run(t.asset_id)
          this.notifyRenderer(t.asset_id)
        }
      } catch (err) {
        console.error(`[AIClient] Error polling completed tagging task ${t.id}:`, err)
      }
    }

    // 3. Poll Prompt Reversal Tasks (Commented out to focus strictly on WD Tagger)
    /*
    const localPromptTasks = db.prepare("SELECT id, asset_id FROM ai_prompt_tasks WHERE status IN ('queued', 'running', 'processing')").all() as Array<{ id: string; asset_id: string }>
    for (const t of localPromptTasks) {
      try {
        const res = await fetch(`${this.pythonUrl}/ai/prompt/status/${t.id}`)
        if (!res.ok) continue
        
        const task = await res.json()
        if (task.status === 'running' || task.status === 'processing') {
          db.prepare("UPDATE ai_prompt_tasks SET status = 'running' WHERE id = ?").run(t.id)
          db.prepare("UPDATE assets SET ai_prompt_status = 'running' WHERE id = ?").run(t.asset_id)
          this.notifyRenderer(t.asset_id)
        } else if (task.status === 'completed' && task.result) {
          const r = task.result
          db.transaction(() => {
            db.prepare(`
              UPDATE ai_prompt_tasks
              SET status = 'completed', sync_status = 'synced', synced_at = ?, started_at = ?, completed_at = ?, result_prompt = ?, result_caption = ?
              WHERE id = ?
            `).run(
              now,
              task.started_at ? new Date(task.started_at * 1000).toISOString() : null,
              task.completed_at ? new Date(task.completed_at * 1000).toISOString() : null,
              r.result_prompt,
              r.result_caption,
              t.id
            )

            db.prepare(`
              UPDATE assets
              SET ai_prompt_status = 'synced', ai_prompt = ?, ai_caption = ?
              WHERE id = ?
            `).run(r.result_prompt, r.result_caption, t.asset_id)
          })()
          
          console.log(`[AIClient] Prompt task ${t.id} successfully synced into SQLite.`)
          this.notifyRenderer(t.asset_id)
        } else if (task.status === 'failed') {
          db.prepare(`
            UPDATE ai_prompt_tasks
            SET status = 'failed', sync_status = 'failed', error_message = ?
            WHERE id = ?
          `).run(task.error_message || 'JoyCaption inference failed', t.id)
          db.prepare("UPDATE assets SET ai_prompt_status = 'failed' WHERE id = ?").run(t.asset_id)
          this.notifyRenderer(t.asset_id)
        }
      } catch (err) {
        console.error(`[AIClient] Error polling completed prompt task ${t.id}:`, err)
      }
    }
    */

    // 4. Poll Deep Layout Sweep Tasks
    const localAnalysisTasks = db.prepare("SELECT id, asset_id FROM ai_analysis_tasks WHERE status IN ('queued', 'running', 'processing')").all() as Array<{ id: string; asset_id: string }>
    for (const t of localAnalysisTasks) {
      try {
        const res = await fetch(`${this.pythonUrl}/ai/prompt/status/${t.id}`)
        if (!res.ok) continue
        
        const task = await res.json()
        if (task.status === 'running' || task.status === 'processing') {
          db.prepare("UPDATE ai_analysis_tasks SET status = 'running' WHERE id = ?").run(t.id)
          db.prepare("UPDATE assets SET ai_analysis_status = 'running' WHERE id = ?").run(t.asset_id)
          this.notifyRenderer(t.asset_id)
        } else if (task.status === 'completed' && task.result) {
          const r = task.result
          db.transaction(() => {
            db.prepare(`
              UPDATE ai_analysis_tasks
              SET status = 'completed', sync_status = 'synced', synced_at = ?, started_at = ?, completed_at = ?, result_json = ?
              WHERE id = ?
            `).run(
              now,
              task.started_at ? new Date(task.started_at * 1000).toISOString() : null,
              task.completed_at ? new Date(task.completed_at * 1000).toISOString() : null,
              JSON.stringify(r),
              t.id
            )

            db.prepare(`
              UPDATE assets
              SET ai_analysis_status = 'synced', 
                  ai_analysis_json = ?,
                  ai_ocr_text = ?,
                  ai_ocr_source = 'ai_qwen_vl',
                  ai_ocr_updated_at = ?
              WHERE id = ?
            `).run(JSON.stringify(r), r.ocr_text || '', now, t.asset_id)

            // Sync text_tags and design_tags to tag_suggestions as pending
            const qwenTags: Array<{ name: string; type: string; confidence: number }> = []
            
            if (Array.isArray(r.text_tags)) {
              for (const tag of r.text_tags) {
                if (tag && tag.name) {
                  qwenTags.push({
                    name: tag.name,
                    type: 'subject',
                    confidence: typeof tag.confidence === 'number' ? tag.confidence : 0.90
                  })
                }
              }
            }
            if (Array.isArray(r.design_tags)) {
              for (const tag of r.design_tags) {
                if (tag && tag.name) {
                  qwenTags.push({
                    name: tag.name,
                    type: 'layout',
                    confidence: typeof tag.confidence === 'number' ? tag.confidence : 0.88
                  })
                }
              }
            }

            const insertSuggestion = db.prepare(`
              INSERT INTO tag_suggestions (id, asset_id, tag_name, tag_type, source, confidence, status, model_name, raw_payload, created_at, updated_at)
              VALUES (?, ?, ?, ?, 'ai_qwen_vl', ?, 'pending', 'Qwen2.5-VL', ?, ?, ?)
            `)

            for (const item of qwenTags) {
              const modelName = 'Qwen2.5-VL'
              const source = 'ai_qwen_vl'
              
              // 1. Idempotency Check for tag_suggestions
              const sugExists = db.prepare(`
                SELECT 1 FROM tag_suggestions 
                WHERE asset_id = ? AND tag_name = ? AND source = ? AND model_name = ?
              `).get(t.asset_id, item.name, source, modelName)

              if (!sugExists) {
                const sugId = `sug-${Math.random().toString(36).substr(2, 9)}`
                insertSuggestion.run(
                  sugId,
                  t.asset_id,
                  item.name,
                  item.type,
                  item.confidence,
                  JSON.stringify(item),
                  now,
                  now
                )
              }

              // Verify tag exists in tags table
              const tagList = tagService.listTags({ searchQuery: item.name, type: item.type })
              let tagId = ''
              if (tagList.length > 0) {
                tagId = tagList[0].id
              } else {
                const newTag = tagService.createTag({
                  name: item.name,
                  type: item.type,
                  color: 'bg-purple-50 text-purple-700 border border-purple-200'
                })
                tagId = newTag.id
              }

              // 2. Idempotency Check for asset_tags (addTagToAsset does it automatically, but let's be explicit)
              assetTagService.addTagToAsset(t.asset_id, tagId, {
                source,
                confidence: item.confidence,
                status: 'pending',
                modelName,
                createdBy: 'ai'
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
                await paletteService.refreshTextPaletteFromTextBlocks(t.asset_id, r.text_blocks)
              })().catch((err: any) => {
                console.error('[AIClient] Failed background color palette extraction on AI analysis completion:', err)
              })
            }
          } catch (colorErr) {
            console.error('[AIClient] Failed to trigger color palette extraction:', colorErr)
          }

          console.log(`[AIClient] Deep analysis task ${t.id} successfully synced into SQLite.`)
          this.notifyRenderer(t.asset_id)
        } else if (task.status === 'failed') {
          db.prepare(`
            UPDATE ai_analysis_tasks
            SET status = 'failed', sync_status = 'failed', error_message = ?
            WHERE id = ?
          `).run(task.error_message || 'Qwen-VL design analysis failed', t.id)
          db.prepare("UPDATE assets SET ai_analysis_status = 'failed' WHERE id = ?").run(t.asset_id)
          this.notifyRenderer(t.asset_id)
        }
      } catch (err) {
        console.error(`[AIClient] Error polling completed analysis task ${t.id}:`, err)
      }
    }

    return true
  }
}
