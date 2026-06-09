import assert from 'node:assert/strict'
import {
  getFreshLlamaMultimodalProbe,
  recordLlamaMultimodalProbe
} from '../src/main/services/ai-runtime/llama-multimodal-evidence.store'

console.log('Running Platform AI Cache & TTL verification tests...')

// 1. Initial State
assert.equal(getFreshLlamaMultimodalProbe(), null, 'Initially should return null')

// 2. Cache hit within TTL
const mockProbeSuccess = {
  success: true,
  baseUrl: 'http://127.0.0.1:8080/v1',
  models: ['Qwen3VL-2B-Instruct.gguf'],
  modelId: 'Qwen3VL-2B-Instruct.gguf',
  chatOk: true,
  visionOk: true,
  visionInput: 'generated_fixture' as const,
  checkedAt: new Date().toISOString()
}

recordLlamaMultimodalProbe(mockProbeSuccess)
const freshResult = getFreshLlamaMultimodalProbe()
assert.ok(freshResult, 'Should retrieve fresh probe from cache')
assert.equal(freshResult?.modelId, 'Qwen3VL-2B-Instruct.gguf')
assert.equal(freshResult?.success, true)

// 3. Cache hit exactly 4 minutes later (under 5-minute TTL)
const fourMinutesAgo = new Date(Date.now() - 4 * 60 * 1000).toISOString()
const mockProbeOldButValid = {
  ...mockProbeSuccess,
  checkedAt: fourMinutesAgo
}
recordLlamaMultimodalProbe(mockProbeOldButValid)
assert.ok(getFreshLlamaMultimodalProbe(), 'Should retrieve probe that is 4 minutes old')

// 4. Cache miss exactly 6 minutes later (over 5-minute TTL)
const sixMinutesAgo = new Date(Date.now() - 6 * 60 * 1000).toISOString()
const mockProbeExpired = {
  ...mockProbeSuccess,
  checkedAt: sixMinutesAgo
}
recordLlamaMultimodalProbe(mockProbeExpired)
assert.equal(getFreshLlamaMultimodalProbe(), null, 'Should return null for 6 minutes old probe')

// 5. Test getFreshLlamaMultimodalProbe overriding current time
const checkedAtTime = new Date('2026-06-08T12:00:00Z').toISOString()
recordLlamaMultimodalProbe({
  ...mockProbeSuccess,
  checkedAt: checkedAtTime
})

// Query at checkedAtTime + 4 min -> should be fresh
const timeWithinTTL = Date.parse(checkedAtTime) + 4 * 60 * 1000
assert.ok(getFreshLlamaMultimodalProbe(timeWithinTTL), 'Should be fresh at +4 minutes')

// Query at checkedAtTime + 6 min -> should be expired
const timeAfterTTL = Date.parse(checkedAtTime) + 6 * 60 * 1000
assert.equal(getFreshLlamaMultimodalProbe(timeAfterTTL), null, 'Should expire at +6 minutes')

console.log('Platform AI Cache & TTL verification tests PASSED!')
