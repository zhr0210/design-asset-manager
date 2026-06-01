import type { PromptReverseResult } from '../../../../shared/types/prompt.types'
import type {
  AiBackendConfig,
  AiBackendHealthResult,
  AiModelListResult,
  ExternalPromptReverseInput,
  OpenAIChatInput,
  OpenAIChatResult
} from '../../../../shared/types/ai-backend.types'
import { createDefaultLlamaBackendConfig } from '../../settings.service'
import { OpenAICompatibleProvider } from './openai-compatible.provider'

export class LlamaOpenAIProvider {
  private readonly delegate = new OpenAICompatibleProvider()

  public getDefaultConfig(): AiBackendConfig {
    return createDefaultLlamaBackendConfig()
  }

  public async healthCheck(config: AiBackendConfig): Promise<AiBackendHealthResult> {
    return this.delegate.healthCheck(this.withLlamaType(config))
  }

  public async listModels(config: AiBackendConfig): Promise<AiModelListResult> {
    return this.delegate.listModels(this.withLlamaType(config))
  }

  public async chat(config: AiBackendConfig, input: OpenAIChatInput): Promise<OpenAIChatResult> {
    return this.delegate.chat(this.withLlamaType(config), input)
  }

  public async runPromptReverse(config: AiBackendConfig, input: ExternalPromptReverseInput): Promise<PromptReverseResult> {
    return this.delegate.runPromptReverse(this.withLlamaType(config), input)
  }

  private withLlamaType(config: AiBackendConfig): AiBackendConfig {
    return { ...config, type: 'llama-openai' }
  }
}

