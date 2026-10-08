import type { AiConsoleStatusAdapter } from '../../src/renderer/modules/ai-console-status/ai-console-status.module'

export type InMemoryAiConsoleStatusAdapterOptions = Partial<Omit<AiConsoleStatusAdapter, 'available'>> & {
  available?: boolean
}

export function createInMemoryAiConsoleStatusAdapter(
  options: InMemoryAiConsoleStatusAdapterOptions = {}
): AiConsoleStatusAdapter {
  return {
    ...options,
    available: options.available ?? true
  }
}
