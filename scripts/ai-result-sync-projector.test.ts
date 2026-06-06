import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import {
  classifyAiWorkerTaskLifecycle,
  projectAiAnalysisCompletion,
  projectAiPromptCompletion,
  projectAiTaskSyncAction,
  projectAiTaggingCompletion,
  projectAiTagSuggestion,
  projectQwenAnalysisTagSuggestions,
  resolveAiTagModelName,
  workerEpochSecondsToIso
} from '../src/main/services/ai-client/ai-result-sync.projector'

assert.equal(workerEpochSecondsToIso(1780542672), '2026-06-04T03:11:12.000Z')
assert.equal(workerEpochSecondsToIso(null), null)
assert.equal(workerEpochSecondsToIso(undefined), null)

assert.equal(classifyAiWorkerTaskLifecycle('running', false), 'active')
assert.equal(classifyAiWorkerTaskLifecycle('processing', false), 'active')
assert.equal(classifyAiWorkerTaskLifecycle('completed', true), 'completed')
assert.equal(classifyAiWorkerTaskLifecycle('completed', false), 'ignored')
assert.equal(classifyAiWorkerTaskLifecycle('failed', false), 'failed')
assert.equal(classifyAiWorkerTaskLifecycle('cancelled', false), 'cancelled')
assert.equal(classifyAiWorkerTaskLifecycle('queued', false), 'ignored')
assert.equal(classifyAiWorkerTaskLifecycle(null, false), 'ignored')

assert.deepEqual(projectAiTaskSyncAction({
  workflow: 'tagging',
  workerStatus: 'processing',
  hasResult: false
}), {
  lifecycle: 'active',
  taskStatus: 'running',
  taskSyncStatus: null,
  assetStatus: 'running',
  errorMessage: null
})
assert.deepEqual(projectAiTaskSyncAction({
  workflow: 'analysis',
  workerStatus: 'completed',
  hasResult: true
}), {
  lifecycle: 'completed',
  taskStatus: 'completed',
  taskSyncStatus: 'synced',
  assetStatus: 'synced',
  errorMessage: null
})
assert.equal(projectAiTaskSyncAction({
  workflow: 'tagging',
  workerStatus: 'failed',
  hasResult: false
}).errorMessage, 'Inference error on Python AI worker')
assert.equal(projectAiTaskSyncAction({
  workflow: 'analysis',
  workerStatus: 'failed',
  hasResult: false
}).errorMessage, 'Qwen-VL design analysis failed')
assert.equal(projectAiTaskSyncAction({
  workflow: 'prompt',
  workerStatus: 'failed',
  hasResult: false
}).errorMessage, 'Prompt generation failed on Python AI worker')
assert.equal(projectAiTaskSyncAction({
  workflow: 'analysis',
  workerStatus: 'failed',
  hasResult: false,
  errorMessage: 'worker detail'
}).errorMessage, 'worker detail')
assert.deepEqual(projectAiTaskSyncAction({
  workflow: 'tagging',
  workerStatus: 'cancelled',
  hasResult: false
}), {
  lifecycle: 'cancelled',
  taskStatus: 'cancelled',
  taskSyncStatus: null,
  assetStatus: 'not_started',
  errorMessage: null
})
assert.equal(projectAiTaskSyncAction({
  workflow: 'analysis',
  workerStatus: 'cancelled',
  hasResult: false
}).lifecycle, 'ignored')
assert.deepEqual(projectAiTaskSyncAction({
  workflow: 'prompt',
  workerStatus: 'cancelled',
  hasResult: false
}), {
  lifecycle: 'cancelled',
  taskStatus: 'cancelled',
  taskSyncStatus: null,
  assetStatus: 'not_started',
  errorMessage: null
})

assert.equal(resolveAiTagModelName('ai_ram'), 'RAM++')
assert.equal(resolveAiTagModelName('ai_wd_tagger'), 'WD-Tagger-v3')
assert.equal(resolveAiTagModelName('ai_florence'), 'Florence-2')
assert.equal(resolveAiTagModelName('ai_clip_design'), 'CLIP Classifier')
assert.equal(resolveAiTagModelName('design_rule'), 'DesignRule')
assert.equal(resolveAiTagModelName('unknown_source'), 'Cooperative-Tagger')
assert.equal(resolveAiTagModelName('ai_ram', 'Explicit Model'), 'Explicit Model')

const tagSuggestion = projectAiTagSuggestion({
  name: 'poster',
  type: 'layout',
  confidence: 0.82,
  source: 'ai_clip_design'
})

assert.deepEqual(tagSuggestion, {
  tagName: 'poster',
  tagType: 'layout',
  source: 'ai_clip_design',
  confidence: 0.82,
  modelName: 'CLIP Classifier',
  rawPayload: JSON.stringify({
    name: 'poster',
    type: 'layout',
    confidence: 0.82,
    source: 'ai_clip_design'
  })
})

const defaultTagSuggestion = projectAiTagSuggestion({
  name: 'character',
  type: 'subject',
  confidence: 0.74
})

assert.equal(defaultTagSuggestion.source, 'ai_wd_tagger')
assert.equal(defaultTagSuggestion.modelName, 'WD-Tagger-v3')

const qwenSuggestions = projectQwenAnalysisTagSuggestions({
  text_tags: [
    { name: 'headline', confidence: 0.77 },
    { confidence: 0.12 }
  ],
  design_tags: [
    { name: 'grid' },
    { name: 'contrast', confidence: 0.91 }
  ]
})

assert.deepEqual(qwenSuggestions.map((item) => ({
  tagName: item.tagName,
  tagType: item.tagType,
  source: item.source,
  confidence: item.confidence,
  modelName: item.modelName
})), [
  { tagName: 'headline', tagType: 'subject', source: 'ai_qwen_vl', confidence: 0.77, modelName: 'Qwen2.5-VL' },
  { tagName: 'grid', tagType: 'layout', source: 'ai_qwen_vl', confidence: 0.88, modelName: 'Qwen2.5-VL' },
  { tagName: 'contrast', tagType: 'layout', source: 'ai_qwen_vl', confidence: 0.91, modelName: 'Qwen2.5-VL' }
])

for (const suggestion of qwenSuggestions) {
  assert.equal(typeof suggestion.rawPayload, 'string')
  assert.doesNotMatch(suggestion.rawPayload, /file_path|base64|Downloads|Users/)
}

const taggingCompletion = projectAiTaggingCompletion({
  width: 2048,
  height: 1024,
  caption: 'Poster layout',
  caption_en: 'Poster layout',
  caption_translated_by: 'none',
  ocr_text: '  SALE  ',
  tags: [{
    name: 'poster',
    type: 'layout',
    confidence: 0.82,
    source: 'ai_clip_design'
  }]
}, {
  isCaptionUserEdited: false,
  now: '2026-06-05T00:00:00.000Z'
})

assert.equal(taggingCompletion.width, 2048)
assert.equal(taggingCompletion.height, 1024)
assert.deepEqual(taggingCompletion.caption, {
  value: 'Poster layout',
  englishValue: 'Poster layout',
  translatedBy: 'none',
  source: 'ai_florence',
  updatedAt: '2026-06-05T00:00:00.000Z'
})
assert.deepEqual(taggingCompletion.ocr, {
  text: 'SALE',
  source: 'ai_florence_ocr',
  updatedAt: '2026-06-05T00:00:00.000Z'
})
assert.equal(taggingCompletion.suggestions[0].modelName, 'CLIP Classifier')

const protectedTaggingCompletion = projectAiTaggingCompletion({
  caption: 'Worker replacement',
  ocr_text: '   '
}, {
  isCaptionUserEdited: true,
  now: '2026-06-05T00:00:00.000Z'
})
assert.equal(protectedTaggingCompletion.width, 1920)
assert.equal(protectedTaggingCompletion.height, 1080)
assert.equal(protectedTaggingCompletion.caption, null)
assert.equal(protectedTaggingCompletion.ocr, null)
assert.deepEqual(protectedTaggingCompletion.suggestions, [])

assert.deepEqual(projectAiPromptCompletion({
  result_prompt: '  studio product photo  ',
  result_caption: '  Product on white background  '
}), {
  prompt: 'studio product photo',
  caption: 'Product on white background'
})
assert.deepEqual(projectAiPromptCompletion({
  result_prompt: null,
  result_caption: 42
}), {
  prompt: '',
  caption: ''
})

const analysisInput = {
  ocr_text: 'headline',
  text_blocks: [{ text: 'headline' }],
  text_tags: [{ name: 'headline' }],
  design_tags: [{ name: 'grid' }],
  layout: { columns: 2 }
}
const analysisCompletion = projectAiAnalysisCompletion(
  analysisInput,
  '2026-06-05T00:00:00.000Z'
)
assert.equal(analysisCompletion.resultJson, JSON.stringify(analysisInput))
assert.equal(analysisCompletion.ocrText, 'headline')
assert.equal(analysisCompletion.ocrSource, 'ai_qwen_vl')
assert.equal(analysisCompletion.ocrUpdatedAt, '2026-06-05T00:00:00.000Z')
assert.deepEqual(analysisCompletion.textBlocks, [{ text: 'headline' }])
assert.deepEqual(analysisCompletion.suggestions.map((item) => item.tagName), ['headline', 'grid'])

const aiClientSource = await fs.readFile('src/main/services/ai-client.service.ts', 'utf8')
assert.match(aiClientSource, /projectAiTaggingCompletion/)
assert.match(aiClientSource, /projectAiPromptCompletion/)
assert.match(aiClientSource, /projectAiAnalysisCompletion/)
assert.match(aiClientSource, /projectAiTaskSyncAction/)
assert.match(aiClientSource, /Poll legacy asynchronous Prompt Tasks/)
assert.match(aiClientSource, /workflow: 'prompt'/)
assert.match(aiClientSource, /SET ai_prompt_status = \?, ai_prompt = \?/)
assert.doesNotMatch(aiClientSource, /r\.width \|\| 1920/)
assert.doesNotMatch(aiClientSource, /r\.height \|\| 1080/)
assert.doesNotMatch(aiClientSource, /r\.ocr_text\.trim\(\)/)
assert.doesNotMatch(aiClientSource, /projectQwenAnalysisTagSuggestions\(r\)/)
assert.doesNotMatch(aiClientSource, /JSON\.stringify\(r\)/)
assert.doesNotMatch(aiClientSource, /task\.status === ['"]running['"]/)
assert.doesNotMatch(aiClientSource, /task\.status === ['"]processing['"]/)
assert.doesNotMatch(aiClientSource, /task\.status === ['"]completed['"]/)
assert.doesNotMatch(aiClientSource, /task\.status === ['"]failed['"]/)
assert.doesNotMatch(aiClientSource, /task\.status === ['"]cancelled['"]/)
assert.doesNotMatch(aiClientSource, /SET ai_prompt_status = \?, ai_prompt = \?, ai_caption = \?/)
assert.doesNotMatch(aiClientSource, /Inference error on Python AI worker/)
assert.doesNotMatch(aiClientSource, /Prompt generation failed on Python AI worker/)
assert.doesNotMatch(aiClientSource, /Qwen-VL design analysis failed/)
assert.doesNotMatch(aiClientSource, /ai_tag_status = 'running'/)
assert.doesNotMatch(aiClientSource, /ai_analysis_status = 'running'/)
assert.doesNotMatch(aiClientSource, /ai_tag_status = 'not_started'/)

console.log('ai-result-sync-projector passed')
