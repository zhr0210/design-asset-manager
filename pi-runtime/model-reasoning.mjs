import {getSupportedThinkingLevels} from '@earendil-works/pi-ai'
const levels = ['off', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max']
/** Catalog declaration only. Compatible endpoints have no qualified reasoning contract. */
export function supportedReasoningLevels(model) {
  return model.provider === 'dam-compatible' ? [] : getSupportedThinkingLevels(model)
}
/** Refuse before auth/refresh/network. Never let the SDK clamp an unsupported selection. */
export function resolveReasoning(model, requested) {
  if (requested === undefined) return undefined
  if (!levels.includes(requested)) throw Error('AI_REASONING_INVALID')
  if (!supportedReasoningLevels(model).includes(requested)) throw Error('AI_REASONING_UNSUPPORTED')
  return requested
}
