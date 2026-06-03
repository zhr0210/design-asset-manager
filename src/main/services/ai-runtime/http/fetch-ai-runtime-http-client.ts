import type { ExternalHttpClient, ExternalHttpRequestInput, ExternalHttpRequestOptions, ExternalHttpResponse } from './ai-runtime-http-client.types'

export class FetchAiRuntimeHttpClient implements ExternalHttpClient {
  async request(input: ExternalHttpRequestInput): Promise<ExternalHttpResponse> {
    const startedAt = Date.now()
    const controller = new AbortController()
    const timeout = input.timeoutMs && input.timeoutMs > 0
      ? setTimeout(() => controller.abort(), input.timeoutMs)
      : null

    try {
      const response = await fetch(input.url, {
        method: input.method,
        headers: input.headers,
        body: input.body === undefined ? undefined : JSON.stringify(input.body),
        signal: controller.signal
      })
      const text = await response.text()
      let body: unknown = text
      if (text) {
        try {
          body = JSON.parse(text)
        } catch {
          body = text
        }
      }

      return {
        status: response.status,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries()),
        body,
        durationMs: Date.now() - startedAt
      }
    } finally {
      if (timeout) clearTimeout(timeout)
    }
  }

  get(url: string, options: ExternalHttpRequestOptions = {}): Promise<ExternalHttpResponse> {
    return this.request({
      method: 'GET',
      url,
      headers: options.headers,
      timeoutMs: options.timeoutMs
    })
  }

  post(url: string, body: unknown, options: ExternalHttpRequestOptions = {}): Promise<ExternalHttpResponse> {
    return this.request({
      method: 'POST',
      url,
      body,
      headers: options.headers,
      timeoutMs: options.timeoutMs
    })
  }
}
