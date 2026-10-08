import assert from 'node:assert/strict'
import { test } from 'node:test'
import { runCaption } from '../src/main/visual-ai/caption-recipe'
import { runIndependentTags } from '../src/main/independent-tags/tag-recipe'
import type { VisionInvocation, VisionProvider } from '../src/main/visual-ai/openai-vision.provider'
import type { AiBackendConfig } from '../src/shared/types/ai-backend.types'

const backend: AiBackendConfig = { id: 'fixture', name: 'Fixture', type: 'openai-compatible', enabled: true,
  baseUrl: 'http://127.0.0.1:1/v1', defaultModel: 'fixture', timeoutMs: 1000, priority: 1,
  capabilities: { chat: true, vision: true, embeddings: false, jsonOutput: true, modelList: false, modelManagement: false } }
const envelope = (value: unknown, finish = 'stop') => ({ choices: [{ finish_reason: finish, message: { content: JSON.stringify(value) } }] })
const input = { backend, model: 'fixture', jpeg: new Uint8Array([1, 2, 3]), signal: new AbortController().signal }

// Supplementary provider-boundary checks. The real Host/UI path still supplies
// qualification, transactions, actual image quality and save/reopen acceptance.
await test('independent recipes bind their output contract and retain strict validation after constrained generation', async () => {
  const invocations: VisionInvocation[] = []
  const provider: VisionProvider = { async invokeOnce(value) {
    invocations.push(value)
    return envelope(invocations.length === 1 ? { caption: '咖啡杯放在木桌上' } : { tags: ['咖啡', '木桌'] })
  } }
  assert.equal((await runCaption(input, provider)).caption, '咖啡杯放在木桌上')
  assert.deepEqual(await runIndependentTags(input, provider), ['咖啡', '木桌'])
  assert.deepEqual(invocations.map(value => (value as any).outputContract), ['caption-v1', 'tags-nfkc-lower-v1'])
  await assert.rejects(runCaption(input, { async invokeOnce() { return envelope({ caption: '咖啡', tags: [] }) } }), /CAPTION_OUTPUT_INVALID/)
  await assert.rejects(runIndependentTags(input, { async invokeOnce() { return envelope({ tags: ['x'.repeat(81)] }) } }), /TAG_OUTPUT_INVALID/)
})
