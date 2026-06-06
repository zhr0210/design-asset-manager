export interface AiTagResultItem {
  name: string
  type: string
  confidence: number
  source?: string
  model_name?: string
}

export interface AiTagSuggestionProjection {
  tagName: string
  tagType: string
  source: string
  confidence: number
  modelName: string
  rawPayload: string
}

export interface AiTaggingCompletionProjection {
  width: number
  height: number
  caption: {
    value: string
    englishValue: string
    translatedBy: string
    source: 'ai_florence'
    updatedAt: string
  } | null
  ocr: {
    text: string
    source: 'ai_florence_ocr'
    updatedAt: string
  } | null
  suggestions: AiTagSuggestionProjection[]
}

export interface AiAnalysisCompletionProjection {
  resultJson: string
  ocrText: string
  ocrSource: 'ai_qwen_vl'
  ocrUpdatedAt: string
  textBlocks: unknown[]
  suggestions: AiTagSuggestionProjection[]
}

export interface AiPromptCompletionProjection {
  prompt: string
  caption: string
}

export type AiWorkerTaskLifecycle = 'active' | 'completed' | 'failed' | 'cancelled' | 'ignored'
export type AiResultSyncWorkflow = 'tagging' | 'prompt' | 'analysis'

export interface AiTaskSyncActionPlan {
  lifecycle: AiWorkerTaskLifecycle
  taskStatus: 'running' | 'completed' | 'failed' | 'cancelled' | null
  taskSyncStatus: 'synced' | 'failed' | null
  assetStatus: 'running' | 'synced' | 'failed' | 'not_started' | null
  errorMessage: string | null
}

export function classifyAiWorkerTaskLifecycle(
  status: unknown,
  hasResult: boolean
): AiWorkerTaskLifecycle {
  if (status === 'running' || status === 'processing') return 'active'
  if (status === 'completed' && hasResult) return 'completed'
  if (status === 'failed') return 'failed'
  if (status === 'cancelled') return 'cancelled'
  return 'ignored'
}

export function projectAiTaskSyncAction(input: {
  workflow: AiResultSyncWorkflow
  workerStatus: unknown
  hasResult: boolean
  errorMessage?: string | null
}): AiTaskSyncActionPlan {
  const lifecycle = classifyAiWorkerTaskLifecycle(input.workerStatus, input.hasResult)

  if (lifecycle === 'active') {
    return {
      lifecycle,
      taskStatus: 'running',
      taskSyncStatus: null,
      assetStatus: 'running',
      errorMessage: null
    }
  }

  if (lifecycle === 'completed') {
    return {
      lifecycle,
      taskStatus: 'completed',
      taskSyncStatus: 'synced',
      assetStatus: 'synced',
      errorMessage: null
    }
  }

  if (lifecycle === 'failed') {
    return {
      lifecycle,
      taskStatus: 'failed',
      taskSyncStatus: 'failed',
      assetStatus: 'failed',
      errorMessage: input.errorMessage || (
        input.workflow === 'tagging'
          ? 'Inference error on Python AI worker'
          : input.workflow === 'prompt'
            ? 'Prompt generation failed on Python AI worker'
            : 'Qwen-VL design analysis failed'
      )
    }
  }

  if (lifecycle === 'cancelled' && input.workflow !== 'analysis') {
    return {
      lifecycle,
      taskStatus: 'cancelled',
      taskSyncStatus: null,
      assetStatus: 'not_started',
      errorMessage: null
    }
  }

  return {
    lifecycle: 'ignored',
    taskStatus: null,
    taskSyncStatus: null,
    assetStatus: null,
    errorMessage: null
  }
}

export function projectAiPromptCompletion(result: {
  result_prompt?: unknown
  result_caption?: unknown
}): AiPromptCompletionProjection {
  return {
    prompt: typeof result.result_prompt === 'string' ? result.result_prompt.trim() : '',
    caption: typeof result.result_caption === 'string' ? result.result_caption.trim() : ''
  }
}

export function workerEpochSecondsToIso(value?: number | null): string | null {
  return value ? new Date(value * 1000).toISOString() : null
}

export function resolveAiTagModelName(source: string, explicitModelName?: string | null): string {
  if (explicitModelName) return explicitModelName
  if (source === 'ai_ram') return 'RAM++'
  if (source === 'ai_wd_tagger') return 'WD-Tagger-v3'
  if (source === 'ai_florence') return 'Florence-2'
  if (source === 'ai_clip_design') return 'CLIP Classifier'
  if (source === 'design_rule') return 'DesignRule'
  return 'Cooperative-Tagger'
}

export function projectAiTagSuggestion(item: AiTagResultItem): AiTagSuggestionProjection {
  const source = item.source || 'ai_wd_tagger'
  return {
    tagName: item.name,
    tagType: item.type,
    source,
    confidence: item.confidence,
    modelName: resolveAiTagModelName(source, item.model_name),
    rawPayload: JSON.stringify(item)
  }
}

export function projectQwenAnalysisTagSuggestions(result: {
  text_tags?: Array<{ name?: string; confidence?: number }>
  design_tags?: Array<{ name?: string; confidence?: number }>
}): AiTagSuggestionProjection[] {
  const suggestions: AiTagSuggestionProjection[] = []

  for (const tag of result.text_tags ?? []) {
    if (!tag?.name) continue
    suggestions.push({
      tagName: tag.name,
      tagType: 'subject',
      source: 'ai_qwen_vl',
      confidence: typeof tag.confidence === 'number' ? tag.confidence : 0.90,
      modelName: 'Qwen2.5-VL',
      rawPayload: JSON.stringify({
        name: tag.name,
        type: 'subject',
        confidence: typeof tag.confidence === 'number' ? tag.confidence : 0.90
      })
    })
  }

  for (const tag of result.design_tags ?? []) {
    if (!tag?.name) continue
    suggestions.push({
      tagName: tag.name,
      tagType: 'layout',
      source: 'ai_qwen_vl',
      confidence: typeof tag.confidence === 'number' ? tag.confidence : 0.88,
      modelName: 'Qwen2.5-VL',
      rawPayload: JSON.stringify({
        name: tag.name,
        type: 'layout',
        confidence: typeof tag.confidence === 'number' ? tag.confidence : 0.88
      })
    })
  }

  return suggestions
}

export function projectAiTaggingCompletion(
  result: {
    width?: number
    height?: number
    caption?: string
    caption_en?: string
    caption_translated_by?: string
    ocr_text?: string
    tags?: AiTagResultItem[]
  },
  input: {
    isCaptionUserEdited: boolean
    now: string
  }
): AiTaggingCompletionProjection {
  const caption = !input.isCaptionUserEdited && result.caption
    ? {
        value: result.caption,
        englishValue: result.caption_en || '',
        translatedBy: result.caption_translated_by || 'none',
        source: 'ai_florence' as const,
        updatedAt: input.now
      }
    : null
  const ocrText = result.ocr_text?.trim() || ''

  return {
    width: result.width || 1920,
    height: result.height || 1080,
    caption,
    ocr: ocrText
      ? {
          text: ocrText,
          source: 'ai_florence_ocr',
          updatedAt: input.now
        }
      : null,
    suggestions: (result.tags ?? []).map(projectAiTagSuggestion)
  }
}

export function projectAiAnalysisCompletion(
  result: {
    ocr_text?: string
    text_blocks?: unknown
    text_tags?: Array<{ name?: string; confidence?: number }>
    design_tags?: Array<{ name?: string; confidence?: number }>
    [key: string]: unknown
  },
  now: string
): AiAnalysisCompletionProjection {
  return {
    resultJson: JSON.stringify(result),
    ocrText: result.ocr_text || '',
    ocrSource: 'ai_qwen_vl',
    ocrUpdatedAt: now,
    textBlocks: Array.isArray(result.text_blocks) ? result.text_blocks : [],
    suggestions: projectQwenAnalysisTagSuggestions(result)
  }
}
