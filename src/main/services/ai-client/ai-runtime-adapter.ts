import type { AiRuntimeKind } from '../../../shared/types/ai-runtime.types'

export type AiClientRuntimeBridgeKind = 'mock' | 'external-http' | 'python-worker'
export type AiClientRuntimeOperation = 'enqueue-tagging' | 'generate-prompt' | 'generate-analysis' | 'model-status' | 'unload-models' | 'routing-preview'

export interface AiClientRuntimeAdapterInput {
  operation: AiClientRuntimeOperation
  preferredBridge: AiClientRuntimeBridgeKind
  runtimeKind: AiRuntimeKind
  greySwitchEnabled: boolean
  oldChainFallbackEnabled: boolean
}

export interface AiClientRuntimeAdapterPlan {
  operation: AiClientRuntimeOperation
  bridge: AiClientRuntimeBridgeKind
  runtimeKind: AiRuntimeKind
  useRuntimeBridge: boolean
  fallbackToOldChain: boolean
  warnings: string[]
  blockingIssues: string[]
}

export interface AiClientRuntimeBridge {
  kind: AiClientRuntimeBridgeKind
  createPlan(input: AiClientRuntimeAdapterInput): AiClientRuntimeAdapterPlan
}

export class MockAiClientRuntimeBridge implements AiClientRuntimeBridge {
  kind: AiClientRuntimeBridgeKind = 'mock'

  createPlan(input: AiClientRuntimeAdapterInput): AiClientRuntimeAdapterPlan {
    return createBasePlan(input, this.kind, [])
  }
}

export class ExternalHttpAiClientRuntimeBridge implements AiClientRuntimeBridge {
  kind: AiClientRuntimeBridgeKind = 'external-http'

  createPlan(input: AiClientRuntimeAdapterInput): AiClientRuntimeAdapterPlan {
    const blockingIssues = input.runtimeKind === 'custom-http' || input.runtimeKind === 'ollama' || input.runtimeKind === 'lm-studio' || input.runtimeKind === 'llama-app'
      ? []
      : [`${input.runtimeKind} is not an external HTTP runtime.`]
    return createBasePlan(input, this.kind, blockingIssues)
  }
}

export class PythonWorkerAiClientRuntimeBridge implements AiClientRuntimeBridge {
  kind: AiClientRuntimeBridgeKind = 'python-worker'

  createPlan(input: AiClientRuntimeAdapterInput): AiClientRuntimeAdapterPlan {
    const blockingIssues = input.runtimeKind === 'python-worker' ? [] : [`${input.runtimeKind} is not a Python Worker runtime.`]
    return createBasePlan(input, this.kind, blockingIssues)
  }
}

export function createAiClientRuntimeAdapterPlan(input: AiClientRuntimeAdapterInput): AiClientRuntimeAdapterPlan {
  const bridge = createBridge(input.preferredBridge)
  return bridge.createPlan(input)
}

function createBridge(kind: AiClientRuntimeBridgeKind): AiClientRuntimeBridge {
  if (kind === 'external-http') return new ExternalHttpAiClientRuntimeBridge()
  if (kind === 'python-worker') return new PythonWorkerAiClientRuntimeBridge()
  return new MockAiClientRuntimeBridge()
}

function createBasePlan(
  input: AiClientRuntimeAdapterInput,
  bridge: AiClientRuntimeBridgeKind,
  blockingIssues: string[]
): AiClientRuntimeAdapterPlan {
  const useRuntimeBridge = input.greySwitchEnabled && blockingIssues.length === 0
  return {
    operation: input.operation,
    bridge,
    runtimeKind: input.runtimeKind,
    useRuntimeBridge,
    fallbackToOldChain: !useRuntimeBridge && input.oldChainFallbackEnabled,
    warnings: useRuntimeBridge ? ['AI Runtime bridge is selected by grey switch.'] : ['Old AI Client chain remains the fallback path.'],
    blockingIssues
  }
}
