import type { ExternalHttpClient, ExternalHttpRequestInput, ExternalHttpRequestOptions, ExternalHttpResponse } from './ai-runtime-http-client.types'

export type MockExternalHttpFailure = 'timeout' | 'connection-refused'

export interface MockExternalHttpRoute {
  response?: ExternalHttpResponse
  failure?: MockExternalHttpFailure
}

export interface MockExternalHttpHistoryEntry extends ExternalHttpRequestInput {
  requestedAt: string
}

function routeKey(method: string, url: string): string {
  return `${method.toUpperCase()} ${url}`
}

function response(status: number, body: unknown = null, headers: Record<string, string> = {}): ExternalHttpResponse {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers,
    body,
    durationMs: 0
  }
}

export class MockAiRuntimeHttpClient implements ExternalHttpClient {
  private readonly routes = new Map<string, MockExternalHttpRoute>()
  private readonly history: MockExternalHttpHistoryEntry[] = []

  registerResponse(method: 'GET' | 'POST', url: string, mockResponse: Partial<ExternalHttpResponse> & { status: number }): void {
    this.routes.set(routeKey(method, url), {
      response: {
        status: mockResponse.status,
        ok: mockResponse.ok ?? (mockResponse.status >= 200 && mockResponse.status < 300),
        headers: mockResponse.headers ?? {},
        body: mockResponse.body ?? null,
        durationMs: mockResponse.durationMs ?? 0
      }
    })
  }

  registerTimeout(method: 'GET' | 'POST', url: string): void {
    this.routes.set(routeKey(method, url), { failure: 'timeout' })
  }

  registerConnectionRefused(method: 'GET' | 'POST', url: string): void {
    this.routes.set(routeKey(method, url), { failure: 'connection-refused' })
  }

  getHistory(): MockExternalHttpHistoryEntry[] {
    return this.history.map((entry) => ({ ...entry }))
  }

  clearHistory(): void {
    this.history.length = 0
  }

  async request(input: ExternalHttpRequestInput): Promise<ExternalHttpResponse> {
    this.history.push({
      ...input,
      requestedAt: new Date().toISOString()
    })

    const route = this.routes.get(routeKey(input.method, input.url))
    if (!route) {
      return response(404, { message: 'Mock route not found' })
    }

    if (route.failure === 'timeout') {
      throw new Error('Mock HTTP request timed out')
    }

    if (route.failure === 'connection-refused') {
      throw new Error('Mock HTTP connection refused')
    }

    return route.response ?? response(500, { message: 'Mock route has no response' })
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
