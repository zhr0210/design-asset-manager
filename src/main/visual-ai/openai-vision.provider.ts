/** Main-internal, single physical call. No retry, parsing of capability values, timer or library access. */
export interface VisionInvocation {
  readonly operationId?:string
  readonly outputContract?: import('./analysis-output-contract').AnalysisOutputContract
  readonly reasoning?:import('../../shared/workflows/ai-reasoning.workflow').AiReasoningLevel
  readonly backendId?:string
  readonly credentialRevision?:number
  readonly endpoint: string
  readonly apiKey?: string
  readonly model: string
  readonly systemPrompt: string
  readonly userPrompt: string
  readonly imageDataUrl: string
  readonly temperature: number
  readonly maxTokens: number
  readonly signal: AbortSignal
}

export interface VisionProvider {
  invokeOnce(input: VisionInvocation): Promise<unknown>
  /** Owned model residency admission before allocating the request increment. */
  prepare?(backendId:string,signal:AbortSignal):Promise<void>
  recoverLocal?(error:import('./local-oom-recovery').ConfirmedLocalOomError,input:VisionInvocation):Promise<boolean>
  finishLocalRecovery?(error:import('./local-oom-recovery').ConfirmedLocalOomError,outcome:import('./local-oom-recovery').LocalRecoveryOutcome):void
}

export const MAX_VISION_RESPONSE_BYTES = 512_000

/** The compatibility coordinator supplies a validated endpoint and frozen request content. */
export const openAiVisionProvider: VisionProvider = {
  async invokeOnce(input) {
    if(input.reasoning!==undefined)throw Error('AI_REASONING_UNSUPPORTED')
    input.signal.throwIfAborted()
    const response = await fetch(input.endpoint, {
      method: 'POST', redirect: 'error', signal: input.signal,
      headers: { 'Content-Type': 'application/json', ...(input.apiKey?.trim() ? { Authorization: `Bearer ${input.apiKey.trim()}` } : {}) },
      body: JSON.stringify({
        model: input.model, temperature: input.temperature, max_tokens: input.maxTokens,
        messages: [
          { role: 'system', content: input.systemPrompt },
          { role: 'user', content: [
            { type: 'text', text: input.userPrompt },
            { type: 'image_url', image_url: { url: input.imageDataUrl } }
          ] }
        ]
      })
    })
    if (!response.ok) {
      await response.body?.cancel()
      throw new Error(`AI_HTTP_${response.status}`)
    }
    return readResponse(response, input.signal)
  }
}

async function readResponse(response: Response, signal: AbortSignal): Promise<unknown> {
  const reader = response.body?.getReader()
  if (!reader) throw new Error('AI_RESPONSE_EMPTY')
  const parts: Uint8Array[] = []
  let bytes = 0
  try {
    while (true) {
      signal.throwIfAborted()
      const next = await reader.read()
      if (next.done) break
      bytes += next.value.length
      if (bytes > MAX_VISION_RESPONSE_BYTES) throw new Error('AI_RESPONSE_TOO_LARGE')
      parts.push(next.value)
    }
  } finally {
    await reader.cancel().catch(() => {})
    reader.releaseLock()
  }
  try { return JSON.parse(Buffer.concat(parts).toString('utf8')) } catch { throw new Error('AI_RESPONSE_INVALID') }
}
