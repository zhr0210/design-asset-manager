export const AI_REASONING_LEVELS = ['off', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'] as const
export type AiReasoningLevel = typeof AI_REASONING_LEVELS[number]
export const AI_REASONING_LABELS: Record<AiReasoningLevel, string> = {
  off: '关闭（off）', minimal: '最低（minimal）', low: '低（low）', medium: '中（medium）',
  high: '高（high）', xhigh: '很高（xhigh）', max: '最高（max）',
}
export const isAiReasoningLevel = (value: unknown): value is AiReasoningLevel =>
  typeof value === 'string' && (AI_REASONING_LEVELS as readonly string[]).includes(value)
export function requireReasoningConfiguration(config: {reasoning?: unknown; transport?: string; providerKind?: string}) {
  if (config.reasoning === undefined) return
  if (!isAiReasoningLevel(config.reasoning)) throw Error('AI_REASONING_INVALID')
  if (config.transport !== 'pi' || !config.providerKind || config.providerKind === 'openai-compatible') throw Error('AI_REASONING_UNSUPPORTED')
}
export const reasoningNotice = (value?: AiReasoningLevel) => `思考强度：${value === undefined ? '模型默认' : AI_REASONING_LABELS[value]}。`
