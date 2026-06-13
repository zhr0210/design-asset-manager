import assert from 'node:assert/strict'
import fs from 'node:fs/promises'

const storeSource = await fs.readFile('src/renderer/stores/asset.store.ts', 'utf8')
const panelSource = await fs.readFile('src/renderer/components/tag/TagSuggestionPanel.tsx', 'utf8')
const workflowSource = await fs.readFile('src/shared/workflows/asset-tagging.workflow.ts', 'utf8')
const ipcSource = await fs.readFile('src/main/ipc/asset-tag.ipc.ts', 'utf8')
const preloadSource = await fs.readFile('src/preload/index.ts', 'utf8')
const tagContractSource = await fs.readFile('src/shared/contracts/tag.contract.ts', 'utf8')

const generateStart = storeSource.indexOf('generateAiSuggestions: async')
const generateEnd = storeSource.indexOf('runPromptReverse: async', generateStart)
const generateBlock = storeSource.slice(generateStart, generateEnd)

assert.ok(generateStart > 0, 'asset store should expose the tagging trigger')
assert.doesNotMatch(generateBlock, /mockAiGenerateSuggestions\(/)
assert.doesNotMatch(generateBlock, /createAssetTaggingTaskSubmission/)
assert.match(generateBlock, /Python AI Worker 未连接/)
assert.match(generateBlock, /已阻止本地 mock 标签写入|已阻止 mock fallback/)

assert.doesNotMatch(ipcSource, /mock-ai:generate-suggestions|MockAiTagService/)
assert.doesNotMatch(preloadSource, /mockAiGenerateSuggestions|mock-ai:generate-suggestions/)
assert.doesNotMatch(tagContractSource, /CHANNEL_MOCK_AI_GENERATE_SUGGESTIONS|MockAiSuggestionsResponse/)
await assert.rejects(
  fs.access('src/main/services/mock-ai-tag.service.ts'),
  'product mock tag service should not exist'
)

assert.doesNotMatch(panelSource, /emulate VisualRouter|模型生成标签建议/)
assert.match(panelSource, /projectAssetTaggingPanelDisplay/)
assert.match(workflowSource, /正在提交真实 AI Worker 打标任务/)
assert.match(workflowSource, /正在等待真实模型返回/)
assert.doesNotMatch(panelSource, /generateMockAiSuggestions/)
