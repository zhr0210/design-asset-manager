import type { ExternalHttpRuntimeConfig } from '../ai-runtime.types'

function createBaseConfig(config: Partial<ExternalHttpRuntimeConfig> & Pick<ExternalHttpRuntimeConfig, 'runtimeId' | 'kind' | 'displayName'>): ExternalHttpRuntimeConfig {
  return {
    baseUrl: null,
    healthEndpoint: '/health',
    modelsEndpoint: null,
    chatEndpoint: null,
    completionsEndpoint: null,
    timeoutMs: 2_000,
    headers: {},
    authMode: 'none',
    metadata: {},
    ...config
  }
}

export function createOllamaRuntimeConfig(config: Partial<ExternalHttpRuntimeConfig> = {}): ExternalHttpRuntimeConfig {
  return createBaseConfig({
    runtimeId: 'ollama',
    kind: 'ollama',
    displayName: 'Ollama',
    healthEndpoint: '/api/tags',
    modelsEndpoint: '/api/tags',
    chatEndpoint: '/api/chat',
    completionsEndpoint: '/api/generate',
    metadata: { defaultPort: 11434 },
    ...config
  })
}

export function createLmStudioRuntimeConfig(config: Partial<ExternalHttpRuntimeConfig> = {}): ExternalHttpRuntimeConfig {
  return createBaseConfig({
    runtimeId: 'lm-studio',
    kind: 'lm-studio',
    displayName: 'LM Studio',
    healthEndpoint: '/v1/models',
    modelsEndpoint: '/v1/models',
    chatEndpoint: '/v1/chat/completions',
    completionsEndpoint: '/v1/completions',
    metadata: { defaultPort: 1234 },
    ...config
  })
}

export function createLlamaAppRuntimeConfig(config: Partial<ExternalHttpRuntimeConfig> = {}): ExternalHttpRuntimeConfig {
  return createBaseConfig({
    runtimeId: 'llama-app',
    kind: 'llama-app',
    displayName: 'llama.app',
    healthEndpoint: '/health',
    modelsEndpoint: '/v1/models',
    chatEndpoint: '/v1/chat/completions',
    completionsEndpoint: '/v1/completions',
    metadata: { defaultPort: 8080 },
    ...config
  })
}

export function createCustomHttpRuntimeConfig(config: Partial<ExternalHttpRuntimeConfig> = {}): ExternalHttpRuntimeConfig {
  return createBaseConfig({
    runtimeId: 'custom-http',
    kind: 'custom-http',
    displayName: 'Custom HTTP Runtime',
    healthEndpoint: '/health',
    metadata: {},
    ...config
  })
}
