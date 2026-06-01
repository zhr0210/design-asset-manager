import { getDatabase } from '../db'

export interface AiTask {
  id: string
  assetId: string
  filePath: string
  status: string
  modelName: string
  errorMessage?: string
  createdAt: string
  startedAt?: string
  completedAt?: string
}

export class AiTaskService {
  private getDb() {
    return getDatabase()
  }

  public getTagTasks(): AiTask[] {
    const db = this.getDb()
    return db.prepare('SELECT * FROM ai_tag_tasks ORDER BY created_at DESC').all() as any[]
  }

  public getPromptTasks(): AiTask[] {
    const db = this.getDb()
    return db.prepare('SELECT * FROM ai_prompt_tasks ORDER BY created_at DESC').all() as any[]
  }

  public getAnalysisTasks(): AiTask[] {
    const db = this.getDb()
    return db.prepare('SELECT * FROM ai_analysis_tasks ORDER BY created_at DESC').all() as any[]
  }

  public createTagTask(assetId: string, filePath: string, modelName: string = 'WD-Tagger-v3'): string {
    const db = this.getDb()
    const id = `task-tag-${Math.random().toString(36).substr(2, 9)}`
    const now = new Date().toISOString()

    db.prepare(`
      INSERT INTO ai_tag_tasks (id, asset_id, file_path, status, priority, model_name, retry_count, created_at)
      VALUES (?, ?, ?, 'waiting', 0, ?, 0, ?)
    `).run(id, assetId, filePath, modelName, now)

    // Update asset AI status
    db.prepare("UPDATE assets SET ai_tag_status = ? WHERE id = ?").run('queued', assetId)

    return id
  }

  public createPromptTask(assetId: string, filePath: string, modelName: string = 'JoyCaption-v2'): string {
    const db = this.getDb()
    const id = `task-prompt-${Math.random().toString(36).substr(2, 9)}`
    const now = new Date().toISOString()

    db.prepare(`
      INSERT INTO ai_prompt_tasks (id, asset_id, file_path, status, model_name, created_at)
      VALUES (?, ?, ?, 'waiting', ?, ?)
    `).run(id, assetId, filePath, modelName, now)

    db.prepare("UPDATE assets SET ai_prompt_status = ? WHERE id = ?").run('processing', assetId)

    return id
  }

  public createAnalysisTask(assetId: string, filePath: string, modelName: string = 'Qwen2.5-VL'): string {
    const db = this.getDb()
    const id = `task-analysis-${Math.random().toString(36).substr(2, 9)}`
    const now = new Date().toISOString()

    db.prepare(`
      INSERT INTO ai_analysis_tasks (id, asset_id, file_path, status, model_name, created_at)
      VALUES (?, ?, ?, 'waiting', ?, ?)
    `).run(id, assetId, filePath, modelName, now)

    db.prepare("UPDATE assets SET ai_analysis_status = ? WHERE id = ?").run('processing', assetId)

    return id
  }
}
