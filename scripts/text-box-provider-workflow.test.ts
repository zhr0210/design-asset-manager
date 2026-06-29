import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import {
  normalizeProductTextBoxProvider,
  projectProductTextBoxProviderExecutionPlan
} from '../src/shared/workflows/text-box-provider.workflow'
import type { OcrEnvPayload } from '../src/shared/contracts/ocr-dependency.contract'

const providers: OcrEnvPayload['providers'] = {
  easyocr: { installed: true, version: '1.0.0', available: true },
  rapidocr: { installed: false, version: null, available: false },
  paddleocr: { installed: true, version: '2.0.0', available: true }
}

assert.equal(normalizeProductTextBoxProvider(undefined), 'none')
assert.equal(normalizeProductTextBoxProvider('mock'), 'none')
assert.equal(normalizeProductTextBoxProvider('paddleocr'), 'paddleocr')

assert.deepEqual(projectProductTextBoxProviderExecutionPlan('none', providers), {
  action: 'skip',
  detectionProvider: 'none',
  textStatus: 'skipped',
  skipReason: 'provider_none'
})

assert.deepEqual(projectProductTextBoxProviderExecutionPlan('rapidocr', providers), {
  action: 'skip',
  detectionProvider: 'rapidocr',
  textStatus: 'skipped',
  skipReason: 'rapidocr_not_installed'
})

assert.deepEqual(projectProductTextBoxProviderExecutionPlan('easyocr', providers), {
  action: 'run',
  detectionProvider: 'easyocr',
  providerType: 'easyocr_detection',
  isMockProvider: false
})

assert.deepEqual(projectProductTextBoxProviderExecutionPlan('paddleocr', providers), {
  action: 'run',
  detectionProvider: 'paddleocr',
  providerType: 'paddleocr_detection',
  isMockProvider: false
})

assert.deepEqual(projectProductTextBoxProviderExecutionPlan('mock', providers), {
  action: 'run',
  detectionProvider: 'mock',
  providerType: 'mock_text_boxes',
  isMockProvider: true
})

assert.deepEqual(projectProductTextBoxProviderExecutionPlan('qwen_vl_text_blocks', providers), {
  action: 'run',
  detectionProvider: 'qwen_vl_text_blocks',
  providerType: 'qwen_vl_text_blocks',
  isMockProvider: false
})

const workflowSource = await fs.readFile('src/shared/workflows/text-box-provider.workflow.ts', 'utf8')
const colorPaletteSource = await fs.readFile('src/main/services/color-palette.service.ts', 'utf8')
const textBoxProviderTypesSource = await fs.readFile('src/main/services/text-detection/text-box-provider.types.ts', 'utf8')

assert.match(workflowSource, /TEXT_BOX_PROVIDER_EXECUTION_DESCRIPTORS/)
assert.match(workflowSource, /mock:[\s\S]*isMockProvider: true/)
assert.match(workflowSource, /none:[\s\S]*skipReason: 'provider_none'/)
assert.match(workflowSource, /paddleocr:[\s\S]*skipReason: 'paddleocr_not_installed'[\s\S]*providers\.paddleocr\.available/)
assert.match(colorPaletteSource, /projectProductTextBoxProviderExecutionPlan/)
assert.match(textBoxProviderTypesSource, /TextBoxExecutionProvider/)
assert.doesNotMatch(workflowSource, /provider === 'none'|provider === 'mock'/)
assert.doesNotMatch(colorPaletteSource, /rawProvider === 'easyocr'|rawProvider === 'rapidocr'|rawProvider === 'paddleocr'|rawProvider === 'mock'|providerType: any/)

console.log('text-box-provider-workflow passed')
