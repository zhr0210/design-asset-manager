import assert from 'node:assert/strict'
import {
  recordLlamaMultimodalProbe,
  getFreshLlamaMultimodalProbe
} from '../src/main/services/ai-runtime/llama-multimodal-evidence.store'
import type { LlamaServerTestResult } from '../src/shared/types/llama-runtime.types'

console.log('=== Test: Verify Llama Multimodal 5-minute TTL Cache Logic ===')

// 1. Initial state: should return null
const initial = getFreshLlamaMultimodalProbe()
assert.equal(initial, null, 'Initial probe must be null')
console.log('[PASS] Initial state returns null.')

// 2. Record a fresh probe
const checkedAtTime = new Date('2026-06-08T12:00:00.000Z')
const checkedAtMs = checkedAtTime.getTime()

const mockProbe: LlamaServerTestResult = {
  success: true,
  checkedAt: checkedAtTime.toISOString(),
  latencyMs: 150,
  response: 'Description of an image',
  error: null
}

recordLlamaMultimodalProbe(mockProbe)

// 3. Retrieve within TTL boundary (e.g. at the exact check time)
const exactTimeResult = getFreshLlamaMultimodalProbe(checkedAtMs)
assert.deepEqual(exactTimeResult, mockProbe, 'Should retrieve cached probe at checking time')
console.log('[PASS] Probe retrieved successfully at check time.')

// 4. Retrieve within 4 minutes (under 5-minute limit)
const fourMinutesLater = checkedAtMs + 4 * 60 * 1000
const fourMinutesResult = getFreshLlamaMultimodalProbe(fourMinutesLater)
assert.deepEqual(fourMinutesResult, mockProbe, 'Should retrieve cached probe under 5 minutes')
console.log('[PASS] Probe retrieved successfully after 4 minutes (under TTL limit).')

// 5. Retrieve at exactly 5 minutes (TTL boundary)
const fiveMinutesLater = checkedAtMs + 5 * 60 * 1000
const fiveMinutesResult = getFreshLlamaMultimodalProbe(fiveMinutesLater)
assert.deepEqual(fiveMinutesResult, mockProbe, 'Should retrieve cached probe at exactly 5 minutes')
console.log('[PASS] Probe retrieved successfully after 5 minutes (on TTL boundary).')

// 6. Retrieve after 5 minutes + 1 ms (expired)
const expiredResult = getFreshLlamaMultimodalProbe(fiveMinutesLater + 1)
assert.equal(expiredResult, null, 'Should return null after 5 minutes (TTL expired)')
console.log('[PASS] Probe correctly returns null when TTL expires.')

console.log('=== ALL TTL CACHE TESTS PASSED ===')
