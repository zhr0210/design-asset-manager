import fs from 'fs/promises'
import sharp from 'sharp'
import { ImageMetadataService } from '../../image-metadata.service'
import type { PromptReverseResult, PromptReverseResultData } from '../../../../shared/types/prompt.types'
import type {
  AiBackendConfig,
  AiBackendError,
  AiBackendHealthResult,
  AiModelListResult,
  ExternalPromptReverseInput,
  OpenAIChatInput,
  OpenAIChatResult
} from '../../../../shared/types/ai-backend.types'
import {
  DEFAULT_PROMPT_REVERSE_MAX_TOKENS,
  DEFAULT_QWEN3VL_DESIGN_PROMPT,
  RETRY_PROMPT_REVERSE_MAX_TOKENS
} from '../../../../shared/constants/prompt-templates.constants'

const DATA_URL_REDACTION = 'data:image/[redacted];base64,[redacted]'
const PROMPT_REVERSE_FIELDS = [
  'englishPrompt',
  'chineseDescription',
  'shortCaption',
  'styleTags',
  'subjectTags',
  'compositionTags',
  'colorTags',
  'usageTags',
  'negativePromptSuggestion'
]

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, '')
}

function createError(code: string, message: string, detail?: string, statusCode?: number): AiBackendError {
  return { code, message, detail: sanitizeDetail(detail), statusCode }
}

function sanitizeDetail(detail?: string): string | undefined {
  if (!detail) return undefined
  return detail
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/g, 'Bearer [redacted]')
    .replace(/"api[_-]?key"\s*:\s*"[^"]+"/gi, '"apiKey":"[redacted]"')
    .replace(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/g, DATA_URL_REDACTION)
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError')
}

function validateConfig(config: AiBackendConfig): AiBackendError | null {
  if (!config.baseUrl || !config.baseUrl.trim()) {
    return createError('BACKEND_INVALID_BASE_URL', 'Base URL 不能为空。')
  }

  try {
    const url = new URL(config.baseUrl)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return createError('BACKEND_INVALID_BASE_URL', 'Base URL 只支持 http 或 https。')
    }
  } catch {
    return createError('BACKEND_INVALID_BASE_URL', 'Base URL 格式无效。')
  }

  return null
}

function getHeaders(config: AiBackendConfig): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (config.apiKey && config.apiKey.trim()) {
    headers.Authorization = `Bearer ${config.apiKey.trim()}`
  }
  return headers
}

function extractModels(payload: any): Array<{ id: string; name?: string }> {
  const candidates = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload?.models)
      ? payload.models
      : Array.isArray(payload)
        ? payload
        : []

  return candidates
    .map((item: any) => {
      if (typeof item === 'string') return { id: item }
      const id = item?.id ?? item?.name ?? item?.model
      return id ? { id: String(id), name: item?.name ? String(item.name) : undefined } : null
    })
    .filter(Boolean)
}

function extractChatContent(payload: any): string {
  const content = payload?.choices?.[0]?.message?.content ?? payload?.choices?.[0]?.text ?? payload?.content
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content.map((part) => part?.text ?? '').join('').trim()
  }
  return ''
}

function extractJsonObject(text: string): any | null {
  const trimmed = text.trim()
  if (!trimmed) return null

  try {
    return JSON.parse(trimmed)
  } catch {}

  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) {
    try {
      return JSON.parse(fence[1].trim())
    } catch {}
  }

  const first = trimmed.indexOf('{')
  const last = trimmed.lastIndexOf('}')
  if (first >= 0 && last > first) {
    try {
      return JSON.parse(trimmed.slice(first, last + 1))
    } catch {}
  }

  return null
}

function cleanJsonLikeText(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
}

function isLikelyTruncatedPromptReverseText(text: string): boolean {
  const cleaned = cleanJsonLikeText(text)
  if (!cleaned || !/^\s*\{/.test(cleaned)) return false
  if (!cleaned.includes('"englishPrompt"') && !cleaned.includes('"chineseDescription"')) return false
  return extractJsonObject(cleaned) === null
}

function extractQuotedJsonField(text: string, field: string): string | undefined {
  const nextFieldPattern = PROMPT_REVERSE_FIELDS.filter((item) => item !== field).join('|')
  const pattern = new RegExp(`"${field}"\\s*:\\s*"([\\s\\S]*?)"(?=\\s*,\\s*"(?:${nextFieldPattern})"\\s*:|\\s*\\})`)
  const match = text.match(pattern)
  if (!match) return undefined

  return match[1]
    .replace(/\\"/g, '"')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .trim()
}

function extractArrayJsonField(text: string, field: string): string[] {
  const startMatch = text.match(new RegExp(`"${field}"\\s*:\\s*\\[`))
  if (!startMatch || startMatch.index === undefined) return []

  const start = startMatch.index + startMatch[0].length
  const rest = text.slice(start)
  const completeEnd = rest.indexOf(']')
  const nextFieldMatch = rest.match(/,\s*"(?:englishPrompt|chineseDescription|shortCaption|styleTags|subjectTags|compositionTags|colorTags|usageTags|negativePromptSuggestion)"\s*:/)
  const endCandidates = [completeEnd, nextFieldMatch?.index].filter((index): index is number => typeof index === 'number' && index >= 0)
  const end = endCandidates.length > 0 ? Math.min(...endCandidates) : rest.length
  const body = rest.slice(0, end)

  return Array.from(body.matchAll(/"((?:\\"|[^"])*)"/g))
    .map((match) => match[1].replace(/\\"/g, '"').trim())
    .filter(Boolean)
}

function extractPartialPromptReverseObject(text: string): Partial<PromptReverseResultData> | null {
  const cleaned = cleanJsonLikeText(text)
  const partial: Partial<PromptReverseResultData> = {}

  const englishPrompt = extractQuotedJsonField(cleaned, 'englishPrompt')
  if (englishPrompt) partial.englishPrompt = englishPrompt

  const chineseDescription = extractQuotedJsonField(cleaned, 'chineseDescription')
  if (chineseDescription) partial.chineseDescription = chineseDescription

  const shortCaption = extractQuotedJsonField(cleaned, 'shortCaption')
  if (shortCaption) partial.shortCaption = shortCaption

  const negativePromptSuggestion = extractQuotedJsonField(cleaned, 'negativePromptSuggestion')
  if (negativePromptSuggestion) partial.negativePromptSuggestion = negativePromptSuggestion

  partial.styleTags = extractArrayJsonField(cleaned, 'styleTags')
  partial.subjectTags = extractArrayJsonField(cleaned, 'subjectTags')
  partial.compositionTags = extractArrayJsonField(cleaned, 'compositionTags')
  partial.colorTags = extractArrayJsonField(cleaned, 'colorTags')
  partial.usageTags = extractArrayJsonField(cleaned, 'usageTags')

  const hasUsefulField = Boolean(
    partial.englishPrompt ||
      partial.chineseDescription ||
      partial.shortCaption ||
      partial.styleTags.length ||
      partial.subjectTags.length ||
      partial.compositionTags.length ||
      partial.colorTags.length ||
      partial.usageTags.length
  )

  return hasUsefulField ? partial : null
}

function normalizePromptReverseData(text: string, config: AiBackendConfig, modelId: string): PromptReverseResultData {
  const parsed = extractJsonObject(text)
  const parsedObject = typeof parsed === 'string' ? extractJsonObject(parsed) : parsed
  const partial = parsedObject && typeof parsedObject === 'object' ? null : extractPartialPromptReverseObject(text)
  const src = parsedObject && typeof parsedObject === 'object' ? parsedObject : partial ?? {}

  return {
    englishPrompt: String(src.englishPrompt ?? src.prompt ?? text),
    chineseDescription: String(src.chineseDescription ?? src.descriptionZh ?? ''),
    shortCaption: String(src.shortCaption ?? src.caption ?? ''),
    styleTags: Array.isArray(src.styleTags) ? src.styleTags.map(String) : [],
    subjectTags: Array.isArray(src.subjectTags) ? src.subjectTags.map(String) : [],
    compositionTags: Array.isArray(src.compositionTags) ? src.compositionTags.map(String) : [],
    colorTags: Array.isArray(src.colorTags) ? src.colorTags.map(String) : [],
    usageTags: Array.isArray(src.usageTags) ? src.usageTags.map(String) : [],
    negativePromptSuggestion: String(src.negativePromptSuggestion ?? ''),
    rawResponse: text,
    modelId,
    backendId: config.id,
    backendType: config.type
  }
}

async function encodeImageDataUrl(filePath: string, maxImageSize: number): Promise<string> {
  const resolvedPath = ImageMetadataService.resolvePath(filePath)
  await fs.access(resolvedPath)
  const buffer = await sharp(resolvedPath)
    .rotate()
    .resize({ width: maxImageSize, height: maxImageSize, fit: 'inside', withoutEnlargement: true })
    .png()
    .toBuffer()
  return `data:image/png;base64,${buffer.toString('base64')}`
}

export class OpenAICompatibleProvider {
  public async healthCheck(config: AiBackendConfig): Promise<AiBackendHealthResult> {
    const startedAt = Date.now()
    const list = await this.listModels(config)
    if (!list.success) {
      return {
        success: false,
        backendId: config.id,
        backendType: config.type,
        latencyMs: Date.now() - startedAt,
        error: list.error
      }
    }

    return {
      success: true,
      backendId: config.id,
      backendType: config.type,
      latencyMs: Date.now() - startedAt,
      models: list.models.map((model) => model.id)
    }
  }

  public async listModels(config: AiBackendConfig): Promise<AiModelListResult> {
    const validation = validateConfig(config)
    if (validation) {
      return { success: false, backendId: config.id, models: [], error: validation }
    }

    if (!config.enabled) {
      return {
        success: false,
        backendId: config.id,
        models: [],
        error: createError('BACKEND_DISABLED', '该后端尚未启用。')
      }
    }

    try {
      const response = await fetch(`${normalizeBaseUrl(config.baseUrl)}/models`, {
        method: 'GET',
        headers: getHeaders(config),
        signal: AbortSignal.timeout(config.timeoutMs)
      })
      const text = await response.text()
      if (!response.ok) {
        return {
          success: false,
          backendId: config.id,
          models: [],
          error: createError('BACKEND_MODEL_LIST_FAILED', '拉取模型列表失败。', text, response.status)
        }
      }

      let payload: any
      try {
        payload = JSON.parse(text)
      } catch {
        return {
          success: false,
          backendId: config.id,
          models: [],
          error: createError('BACKEND_RESPONSE_PARSE_FAILED', '模型列表响应不是合法 JSON。', text, response.status)
        }
      }

      return { success: true, backendId: config.id, models: extractModels(payload), rawResponse: payload }
    } catch (error: any) {
      return {
        success: false,
        backendId: config.id,
        models: [],
        error: isAbortError(error)
          ? createError('BACKEND_TIMEOUT', '连接后端超时。')
          : createError('BACKEND_CONNECTION_FAILED', '无法连接外部 AI 后端。', String(error?.message ?? error))
      }
    }
  }

  public async chat(config: AiBackendConfig, input: OpenAIChatInput): Promise<OpenAIChatResult> {
    const validation = validateConfig(config)
    if (validation) return { success: false, backendId: config.id, error: validation }
    if (!config.enabled) return { success: false, backendId: config.id, error: createError('BACKEND_DISABLED', '该后端尚未启用。') }

    const model = input.model || config.defaultModel
    if (!model) {
      return { success: false, backendId: config.id, error: createError('BACKEND_MODEL_NOT_SELECTED', '尚未选择模型。') }
    }

    try {
      const response = await fetch(`${normalizeBaseUrl(config.baseUrl)}/chat/completions`, {
        method: 'POST',
        headers: getHeaders(config),
        signal: AbortSignal.timeout(config.timeoutMs),
        body: JSON.stringify({
          model,
          messages: input.messages,
          temperature: input.temperature ?? 0.6,
          top_p: input.topP ?? 0.9,
          max_tokens: input.maxTokens ?? DEFAULT_PROMPT_REVERSE_MAX_TOKENS
        })
      })
      const text = await response.text()
      if (!response.ok) {
        return {
          success: false,
          backendId: config.id,
          modelId: model,
          error: createError('BACKEND_CHAT_FAILED', '文本模型调用失败。', text, response.status)
        }
      }

      let payload: any
      try {
        payload = JSON.parse(text)
      } catch {
        return {
          success: false,
          backendId: config.id,
          modelId: model,
          error: createError('BACKEND_RESPONSE_PARSE_FAILED', 'Chat 响应不是合法 JSON。', text, response.status)
        }
      }

      return {
        success: true,
        backendId: config.id,
        modelId: model,
        content: extractChatContent(payload),
        rawResponse: payload
      }
    } catch (error: any) {
      return {
        success: false,
        backendId: config.id,
        modelId: model,
        error: isAbortError(error)
          ? createError('BACKEND_TIMEOUT', '调用后端超时。')
          : createError('BACKEND_CONNECTION_FAILED', '无法连接外部 AI 后端。', String(error?.message ?? error))
      }
    }
  }

  public async runPromptReverse(config: AiBackendConfig, input: ExternalPromptReverseInput): Promise<PromptReverseResult> {
    const modelId = input.modelId || config.defaultModel || ''
    const startedAt = Date.now()

    if (!config.capabilities.vision) {
      return this.toPromptResult(config, modelId, startedAt, null, createError('BACKEND_VISION_NOT_SUPPORTED', '当前外部后端未声明支持图片输入。'))
    }

    if (!modelId) {
      return this.toPromptResult(config, modelId, startedAt, null, createError('BACKEND_MODEL_NOT_SELECTED', '尚未选择高级反推模型。'))
    }

    let imageUrl = ''
    try {
      imageUrl = await encodeImageDataUrl(input.filePath, input.maxImageSize ?? 1024)
    } catch (error: any) {
      return this.toPromptResult(config, modelId, startedAt, null, createError('IMAGE_ENCODE_FAILED', '图片编码失败。', String(error?.message ?? error)))
    }

    const promptText = input.promptTemplateText?.trim() || DEFAULT_QWEN3VL_DESIGN_PROMPT
    const initialMaxTokens = Math.max(input.maxTokens ?? DEFAULT_PROMPT_REVERSE_MAX_TOKENS, DEFAULT_PROMPT_REVERSE_MAX_TOKENS)
    const retryMaxTokens = Math.max(RETRY_PROMPT_REVERSE_MAX_TOKENS, initialMaxTokens * 2)
    const createChatInput = (maxTokens: number): OpenAIChatInput => ({
      model: modelId,
      temperature: input.temperature,
      topP: input.topP,
      maxTokens,
      messages: [
        {
          role: 'system',
          content: 'You are a professional AI image prompt engineer and senior visual designer.'
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: promptText
            },
            { type: 'image_url', image_url: { url: imageUrl } }
          ]
        }
      ]
    })
    const chat = await this.chat(config, createChatInput(initialMaxTokens))

    if (!chat.success || !chat.content) {
      return this.toPromptResult(config, modelId, startedAt, null, chat.error ?? createError('PROMPT_REVERSE_FAILED', '高级反推失败。'))
    }

    if (isLikelyTruncatedPromptReverseText(chat.content)) {
      const retry = await this.chat(config, createChatInput(retryMaxTokens))
      if (retry.success && retry.content) {
        return this.toPromptResult(config, modelId, startedAt, normalizePromptReverseData(retry.content, config, modelId), null)
      }
    }

    return this.toPromptResult(config, modelId, startedAt, normalizePromptReverseData(chat.content, config, modelId), null)
  }

  private toPromptResult(
    config: AiBackendConfig,
    modelId: string,
    startedAt: number,
    data: PromptReverseResultData | null,
    error: AiBackendError | null
  ): PromptReverseResult {
    return {
      success: !error,
      provider: config.type === 'llama-openai' ? 'prompt.llama-openai' : 'prompt.openai-compatible',
      modelId,
      device: 'external',
      durationMs: Date.now() - startedAt,
      data,
      error,
      cleared: false
    }
  }
}

export const __openAiCompatibleTestUtils = {
  extractModels,
  extractChatContent,
  extractJsonObject,
  isLikelyTruncatedPromptReverseText,
  extractPartialPromptReverseObject,
  normalizePromptReverseData,
  sanitizeDetail
}
