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

/** A narrow generated-fixture check, not a general model-quality benchmark. */
export function matchesGeneratedVisionProbe(text: string): boolean {
  try {
    const answer = JSON.parse(text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''))
    return typeof answer?.left === 'string' && typeof answer?.right === 'string' &&
      answer.left.trim().toLowerCase() === 'red' && answer.right.trim().toLowerCase() === 'blue'
  } catch { return false }
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
      redirect: 'error',
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
      ? modelsJson.data.flatMap((item: any) => typeof item?.id === 'string' && item.id.trim() ? [item.id.trim()] : [])
      : []
    const modelId = models[0]
    if (!modelId) return {...resultBase,success:false,error:{code:'LLAMA_MODELS_EMPTY',message:'服务没有报告已加载的模型。'}}

    const chatResponse = await fetchImpl(`${normalizedBase}/chat/completions`, {
      method: 'POST',
      redirect: 'error',
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
    const chatOk = chatResponse.ok && completionText(chatPayload).replace(/[.!。！]+$/, '').trim().toUpperCase() === 'OK'
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
      redirect: 'error',
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
              text: 'Inspect the attached image. Return only a JSON object with keys left and right; each value is the English name of the dominant color on that half. Do not infer colors from this instruction.'
            },
            {
              type: 'image_url',
              image_url: { url: imageDataUrl }
            }
          ]
        }],
        max_tokens: 64,
        temperature: 0
      }),
      signal: AbortSignal.timeout(options.visionTimeoutMs ?? 60000)
    })
    const visionPayload = visionResponse.ok ? await visionResponse.json().catch(() => null) : null
    const visionOk = visionResponse.ok && matchesGeneratedVisionProbe(completionText(visionPayload))

    return {
      ...resultBase,
      success: chatOk && visionOk,
      models,
      modelId,
      chatOk,
      visionOk,
      error: visionOk
        ? undefined
        : { code: 'LLAMA_VISION_FAILED', message: visionResponse.ok ? '视觉探测未正确识别测试图的左右颜色；不能确认图像能力。' : `HTTP ${visionResponse.status}` }
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
