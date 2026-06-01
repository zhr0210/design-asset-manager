export interface AiQueueStats {
  queued: number
  running: number
  completed: number
  failed: number
}

const EMPTY_QUEUE_STATS: AiQueueStats = {
  queued: 0,
  running: 0,
  completed: 0,
  failed: 0
}

function readTableStats(db: any, tableName: string): AiQueueStats {
  return db.prepare(`
    SELECT 
      SUM(CASE WHEN status = 'queued' THEN 1 ELSE 0 END) as queued,
      SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) as running,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
    FROM ${tableName}
  `).get() as AiQueueStats
}

export function readAiQueueStats(db: any): AiQueueStats {
  try {
    const tagStats = readTableStats(db, 'ai_tag_tasks')
    const promptStats = readTableStats(db, 'ai_prompt_tasks')
    const analysisStats = readTableStats(db, 'ai_analysis_tasks')

    return {
      queued: (tagStats?.queued || 0) + (promptStats?.queued || 0) + (analysisStats?.queued || 0),
      running: (tagStats?.running || 0) + (promptStats?.running || 0) + (analysisStats?.running || 0),
      completed: (tagStats?.completed || 0) + (promptStats?.completed || 0) + (analysisStats?.completed || 0),
      failed: (tagStats?.failed || 0) + (promptStats?.failed || 0) + (analysisStats?.failed || 0)
    }
  } catch (_) {
    return { ...EMPTY_QUEUE_STATS }
  }
}
