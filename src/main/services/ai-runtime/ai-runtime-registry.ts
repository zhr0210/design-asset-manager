import type { AiRuntimeProvider } from './ai-runtime.types'

export class AiRuntimeProviderRegistry {
  private readonly providers = new Map<string, AiRuntimeProvider>()

  registerProvider(provider: AiRuntimeProvider): void {
    this.providers.set(provider.getConfig().id, provider)
  }

  unregisterProvider(runtimeId: string): boolean {
    return this.providers.delete(runtimeId)
  }

  getProvider(runtimeId: string): AiRuntimeProvider | undefined {
    return this.providers.get(runtimeId)
  }

  listProviders(): AiRuntimeProvider[] {
    return Array.from(this.providers.values())
  }

  clear(): void {
    this.providers.clear()
  }
}
