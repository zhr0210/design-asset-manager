import type { AiBackendConfig } from '../../../shared/types/ai-backend.types'
import { LlamaOpenAIProvider } from '../ai-worker/providers/llama-openai.provider'
import { OpenAICompatibleProvider } from '../ai-worker/providers/openai-compatible.provider'

export class AiBackendHealthService {
  private readonly openAiProvider = new OpenAICompatibleProvider()
  private readonly llamaProvider = new LlamaOpenAIProvider()

  public healthCheck(config: AiBackendConfig) {
    return this.providerFor(config).healthCheck(config)
  }

  public listModels(config: AiBackendConfig) {
    return this.providerFor(config).listModels(config)
  }

  private providerFor(config: AiBackendConfig) {
    return config.type === 'llama-openai' ? this.llamaProvider : this.openAiProvider
  }
}

