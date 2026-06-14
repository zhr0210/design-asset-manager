import assert from 'node:assert/strict'
import {
  OcrRealEvidenceProbeService
} from '../src/main/services/ai-runtime/ocr-real-evidence-probe.service'
import {
  getFreshOcrRealEvidence,
  recordOcrRealEvidence
} from '../src/main/services/ai-runtime/ocr-real-evidence.store'
import type { OcrRealEvidenceProbeResponse } from '../src/shared/types/ocr-real-evidence.types'

const checkedAt = '2026-06-14T00:00:00.000Z'
const loadedProbe: OcrRealEvidenceProbeResponse = {
  success: true,
  status: 'loaded_real',
  provider: 'rapidocr',
  operation: 'generated_image_text_detection',
  generatedFixture: true,
  downloadsAllowed: false,
  boxCount: 1,
  resultFinite: true,
  attempts: [{
    provider: 'rapidocr',
    status: 'loaded_real',
    boxCount: 1,
    resultFinite: true
  }],
  checkedAt,
  durationMs: 120
}

let capturedOptions: { env: NodeJS.ProcessEnv; timeoutMs: number } | null = null
const testRuntime = () => ({
  pythonExecutable: 'python',
  scriptPath: '/test/probe_ocr_real_evidence.py',
  workingDirectory: '/test/ai-service'
})
const service = new OcrRealEvidenceProbeService({
  runCommand: async (_command, args, options) => {
    assert.deepEqual(args.slice(-2), ['--provider', 'auto'])
    capturedOptions = options
    return { exitCode: 0, stdout: JSON.stringify(loadedProbe) }
  },
  resolveRuntime: testRuntime
})
assert.deepEqual(await service.probe(), loadedProbe)
assert.equal(capturedOptions?.env.HF_HUB_OFFLINE, '1')
assert.equal(capturedOptions?.env.TRANSFORMERS_OFFLINE, '1')
assert.equal(capturedOptions?.env.DESIGN_ASSET_MANAGER_DISABLE_USER_DATA_ACCESS, '1')
assert.equal(capturedOptions?.timeoutMs, 60_000)

const invalidService = new OcrRealEvidenceProbeService({
  runCommand: async () => ({
    exitCode: 0,
    stdout: JSON.stringify({ ...loadedProbe, downloadsAllowed: true })
  }),
  resolveRuntime: testRuntime
})
const invalidResult = await invalidService.probe()
assert.equal(invalidResult.success, false)
assert.equal(invalidResult.errorCode, 'OCR_PROBE_RESPONSE_INVALID')

recordOcrRealEvidence(loadedProbe)
const checkedAtMs = Date.parse(checkedAt)
assert.deepEqual(getFreshOcrRealEvidence(checkedAtMs + 5 * 60 * 1000), loadedProbe)
assert.equal(getFreshOcrRealEvidence(checkedAtMs + 5 * 60 * 1000 + 1), null)

console.log('ocr-real-evidence passed')
