import assert from 'node:assert/strict'
import fs from 'node:fs/promises'

const storeSource = await fs.readFile('src/renderer/stores/asset.store.ts', 'utf8')
const panelSource = await fs.readFile('src/renderer/components/tag/TagSuggestionPanel.tsx', 'utf8')
const workflowSource = await fs.readFile('src/shared/workflows/asset-tagging.workflow.ts', 'utf8')
const ipcSource = await fs.readFile('src/main/ipc/asset-tag.ipc.ts', 'utf8')
const mockServiceSource = await fs.readFile('src/main/services/mock-ai-tag.service.ts', 'utf8')

const generateStart = storeSource.indexOf('generateAiSuggestions: async')
const generateEnd = storeSource.indexOf('generateDeepAnalysis:', generateStart)
const generateBlock = storeSource.slice(generateStart, generateEnd)

assert.ok(generateStart > 0, 'asset store should expose the tagging trigger')
assert.doesNotMatch(generateBlock, /mockAiGenerateSuggestions\(/)
assert.doesNotMatch(generateBlock, /createAssetTaggingTaskSubmission/)
assert.match(generateBlock, /Python AI Worker 未连接/)
assert.match(generateBlock, /已阻止本地 mock 标签写入|已阻止 mock fallback/)

assert.match(ipcSource, /DESIGN_ASSET_MANAGER_ALLOW_MOCK_AI_TAGS/)
assert.match(ipcSource, /Mock AI tag generation is disabled/)
assert.match(mockServiceSource, /Math\.random|random mock suggestions/i)

assert.doesNotMatch(panelSource, /emulate VisualRouter|模型生成标签建议/)
assert.match(panelSource, /projectAssetTaggingPanelDisplay/)
assert.match(workflowSource, /正在提交真实 AI Worker 打标任务/)
assert.match(workflowSource, /正在等待真实模型返回/)
assert.doesNotMatch(panelSource, /generateMockAiSuggestions/)
