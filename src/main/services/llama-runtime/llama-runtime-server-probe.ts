import sharp from 'sharp'
import type { LlamaServerTestResult } from '../../../shared/types/llama-runtime.types'
import { sanitizeLlamaLog } from './llama-runtime-planner'

type FetchLike = typeof fetch

export interface LlamaServerProbeOptions {
  fetchImpl?: FetchLike
  createVisionImageDataUrl?: () => Promise<string>
  textTimeoutMs?: number
  visionTimeoutMs?: number
}

function completionText(payload: unknown): string {
  const value = (payload as any)?.choices?.[0]?.message?.content
  if (typeof value === 'string') return value.trim()
  if (Array.isArray(value)) {
    return value
      .map((item) => typeof item?.text === 'string' ? item.text : '')
      .join(' ')
      .trim()
  }
  return ''
}

export async function createGeneratedVisionProbeDataUrl(): Promise<string> {
  const width = 96
  const height = 64
  const channels = 3
  const pixels = Buffer.alloc(width * height * channels)

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * channels
      const left = x < width / 2
      pixels[offset] = left ? 220 : 35
      pixels[offset + 1] = 45
      pixels[offset + 2] = left ? 45 : 210
    }
  }

  const png = await sharp(pixels, {
    raw: { width, height, channels }
  }).png().toBuffer()

  return `data:image/png;base64,${png.toString('base64')}`
}

export async function probeLlamaServer(
  baseUrl = 'http://127.0.0.1:8080/v1',
  options: LlamaServerProbeOptions = {}
): Promise<LlamaServerTestResult> {
  const checkedAt = new Date().toISOString()
  const normalizedBase = baseUrl.replace(/\/+$/, '')
  const fetchImpl = options.fetchImpl ?? fetch
  const resultBase = {
    baseUrl,
    models: [] as string[],
    modelId: undefined as string | undefined,
    chatOk: false,
    visionOk: false,
    visionInput: 'generated_fixture' as const,
    checkedAt
  }

  try {
    const modelsResponse = await fetchImpl(`${normalizedBase}/models`, {
      headers: { Authorization: 'Bearer local' },
      signal: AbortSignal.timeout(8000)
    })
    if (!modelsResponse.ok) {
      return {
        ...resultBase,
        success: false,
        error: { code: 'LLAMA_MODELS_FAILED', message: `HTTP ${modelsResponse.status}` }
      }
    }

    const modelsJson: any = await modelsResponse.json()
    const models = Array.isArray(modelsJson?.data)
      ? modelsJson.data.map((item: any) => String(item.id)).filter(Boolean)
      : []
    const modelId = models[0] ?? 'local-model'

    const chatResponse = await fetchImpl(`${normalizedBase}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer local',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: modelId,
        messages: [{ role: 'user', content: 'Reply with OK.' }],
        max_tokens: 8,
        temperature: 0
      }),
      signal: AbortSignal.timeout(options.textTimeoutMs ?? 15000)
    })
    const chatPayload = chatResponse.ok ? await chatResponse.json().catch(() => null) : null
    const chatOk = chatResponse.ok && completionText(chatPayload).length > 0
    if (!chatOk) {
      return {
        ...resultBase,
        success: false,
        models,
        modelId,
        error: { code: 'LLAMA_CHAT_FAILED', message: `HTTP ${chatResponse.status}` }
      }
    }

    const imageDataUrl = await (options.createVisionImageDataUrl ?? createGeneratedVisionProbeDataUrl)()
    const visionResponse = await fetchImpl(`${normalizedBase}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer local',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: modelId,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Inspect the attached generated test image. Reply with VISION_OK and name its two dominant colors.'
            },
            {
              type: 'image_url',
              image_url: { url: imageDataUrl }
            }
          ]
        }],
        max_tokens: 32,
        temperature: 0
      }),
      signal: AbortSignal.timeout(options.visionTimeoutMs ?? 60000)
    })
    const visionPayload = visionResponse.ok ? await visionResponse.json().catch(() => null) : null
    const visionOk = visionResponse.ok && completionText(visionPayload).length > 0

    return {
      ...resultBase,
      success: chatOk && visionOk,
      models,
      modelId,
      chatOk,
      visionOk,
      error: visionOk
        ? undefined
        : { code: 'LLAMA_VISION_FAILED', message: `HTTP ${visionResponse.status}` }
    }
  } catch (err: any) {
    return {
      ...resultBase,
      success: false,
      error: {
        code: err?.name === 'TimeoutError' ? 'LLAMA_SERVER_TIMEOUT' : 'LLAMA_SERVER_CONNECTION_FAILED',
        message: sanitizeLlamaLog(err?.message ?? String(err))
      }
    }
  }
}
