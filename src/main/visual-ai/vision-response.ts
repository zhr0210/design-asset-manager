import type { VisualAiOutput } from '../../shared/contracts/visual-ai.contract'

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

/** Accept common complete wrappers, never extract fields from incomplete JSON. */
function parseObject(text: string): unknown {
  const trimmed = text.trim()
  try { return JSON.parse(trimmed) } catch { /* Some services wrap JSON in prose/fences. */ }
  const start = trimmed.indexOf('{')
  if (start < 0 || trimmed.startsWith('[')) throw new Error('AI_RESPONSE_INVALID')
  let depth = 0; let quoted = false; let escaped = false
  for (let i = start; i < trimmed.length; i++) {
    const char = trimmed[i]
    if (quoted) {
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === '"') quoted = false
      continue
    }
    if (char === '"') quoted = true
    else if (char === '{') depth++
    else if (char === '}' && --depth === 0) {
      // Multiple candidate objects are ambiguous; do not pick a convenient one.
      if (/[{}]/.test(trimmed.slice(i + 1))) throw new Error('AI_RESPONSE_INVALID')
      try { return JSON.parse(trimmed.slice(start, i + 1)) } catch { throw new Error('AI_RESPONSE_INVALID') }
    }
  }
  throw new Error('AI_RESPONSE_TRUNCATED')
}

export function parseVisionOutput(payload: unknown): VisualAiOutput {
  if (!record(payload) || !Array.isArray(payload.choices) || !record(payload.choices[0])) throw new Error('AI_RESPONSE_INVALID')
  const choice = payload.choices[0]
  if (choice.finish_reason === 'length') throw new Error('AI_RESPONSE_TRUNCATED')
  if (choice.finish_reason != null && choice.finish_reason !== 'stop') throw new Error('AI_RESPONSE_INVALID')
  const content = record(choice.message) ? choice.message.content : choice.text
  const text = typeof content === 'string' ? content : Array.isArray(content) && content.length && content.every(part => record(part) && part.type === 'text' && typeof part.text === 'string')
    ? content.map(part => part.text).join('') : null
  if (text === null) throw new Error('AI_RESPONSE_INVALID')
  const output = parseObject(text)
  if (!record(output)) throw new Error('AI_RESPONSE_INVALID')
  const { caption, ocrText, prompt, tags } = output
  // Keep the existing stored-output contract; the prompt asks for a smaller useful result.
  if (typeof caption !== 'string' || caption.length > 16_000 || typeof ocrText !== 'string' || ocrText.length > 16_000 ||
      typeof prompt !== 'string' || !prompt.trim() || prompt.length > 16_000 || !Array.isArray(tags) || tags.length > 30 ||
      tags.some(tag => typeof tag !== 'string' || !tag.trim() || tag.length > 80)) throw new Error('AI_RESPONSE_INVALID')
  return { caption, ocrText, prompt, tags: [...new Set(tags.map(tag => tag.trim()))] }
}
