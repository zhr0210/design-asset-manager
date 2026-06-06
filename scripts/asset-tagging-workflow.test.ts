import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import {
  ASSET_TAGGING_CATEGORY_INFO,
  ASSET_TAGGING_MODEL_OPTIONS,
  createAssetTaggingPlan,
  createAssetTaggingTaskSubmission,
  normalizeAssetTaggingCategory,
  normalizeAssetTaggingModelIds,
  projectAssetLibrarySidebar,
  projectAssetLibraryTagFilterChips,
  projectAssetTagInput,
  projectAssetTagManager,
  projectAssetTagPicker,
  projectAssetTaggingComputeBanner,
  projectAssetTaggingCategoryOptions,
  projectAssetTaggingConfirmedTags,
  projectAssetTagChipDisplay,
  projectAssetTaggingModelSelectionSections,
  projectAssetTaggingPanelDisplay,
  projectAssetTaggingSuggestionReviewItems,
  projectPendingAssetTagSuggestions,
  toggleAssetTaggingModelSelection,
  ASSET_TAG_PRESET_COLORS,
  ASSET_TAG_TYPES,
  CUSTOM_ASSET_TAG_COLOR_CLASS,
  DEFAULT_ASSET_TAG_COLOR_CLASS,
  getAssetTagColorClass
} from '../src/shared/workflows/asset-tagging.workflow'

assert.equal(normalizeAssetTaggingCategory('anime'), 'anime')
assert.equal(normalizeAssetTaggingCategory('not-a-category'), 'unknown')
assert.equal(normalizeAssetTaggingCategory(null), 'unknown')

assert.deepEqual(createAssetTaggingPlan('anime').modelsToRun, ['wd_tagger'])
assert.deepEqual(createAssetTaggingPlan('design').modelsToRun, ['ram', 'florence2', 'design_rule'])
assert.deepEqual(createAssetTaggingPlan('unknown').modelsToRun, ['ram', 'design_rule'])
assert.deepEqual(normalizeAssetTaggingModelIds(['ram', 'ram', 'not-a-model', 'florence2']), ['ram', 'florence2'])
assert.deepEqual(createAssetTaggingTaskSubmission({ category: 'anime' }).modelsToRun, ['wd_tagger'])
assert.deepEqual(createAssetTaggingTaskSubmission({ modelsToRun: ['ram', 'not-a-model', 'ram', 'wd_tagger'] }), {
  modelsToRun: ['ram', 'wd_tagger'],
  modelName: 'custom_pipeline:ram,wd_tagger'
})

const uiPlan = createAssetTaggingPlan('ui')
assert.equal(uiPlan.categoryInfo.typeLabel, '界面截图 (UI)')
assert.equal(uiPlan.categoryInfo.modelLabel, 'Florence-2')
assert.ok(uiPlan.modelOptions.some((model) => model.id === 'ram' && model.layer === 'base'))
assert.ok(uiPlan.modelOptions.some((model) => model.id === 'florence2' && model.layer === 'enhanced'))

const modelSections = projectAssetTaggingModelSelectionSections()
assert.deepEqual(modelSections.map((section) => section.code), ['base', 'enhanced'])
assert.equal(modelSections[0].title, '第一组：基础标签层')
assert.equal(modelSections[0].iconTone, 'purple')
assert.deepEqual(modelSections[0].items.map((item) => item.id), ['ram'])
assert.equal(modelSections[0].items[0].name, 'RAM++ 通用标签')
assert.equal(modelSections[1].title, '第二组：专项增强层')
assert.equal(modelSections[1].iconTone, 'indigo')
assert.deepEqual(modelSections[1].items.map((item) => item.id), ['florence2', 'wd_tagger', 'clip', 'design_rule'])
assert.equal(modelSections[1].items.find((item) => item.id === 'wd_tagger')?.desc, '二次元 / 动漫 / 角色特征提取，仅动漫素材建议开启。')

assert.deepEqual(projectAssetTaggingCategoryOptions(), [
  { value: 'design', label: '商业设计图' },
  { value: 'ui', label: '界面截图' },
  { value: 'document', label: '文档大图' },
  { value: 'anime', label: '动漫原画' },
  { value: 'illustration', label: '手绘插画' },
  { value: 'photo', label: '摄影照片' },
  { value: 'product', label: '商品展示' },
  { value: 'unknown', label: '未知类别' }
])

assert.deepEqual(toggleAssetTaggingModelSelection(['ram'], 'florence2'), ['ram', 'florence2'])
assert.deepEqual(toggleAssetTaggingModelSelection(['ram', 'florence2'], 'ram'), ['florence2'])

assert.deepEqual(projectAssetTaggingPanelDisplay({
  scanState: 'idle',
  category: 'ui',
  selectedModels: ['ram']
}), {
  isScanning: false,
  submitDisabled: false,
  submitLabel: 'AI 智能打标',
  progressLabel: '',
  progressComplete: false,
  emptySuggestionLabel: '该素材暂无 AI 智能标签建议。点击上方“AI 智能打标”生成推荐标签。'
})
assert.equal(projectAssetTaggingPanelDisplay({
  scanState: 'idle',
  selectedModels: []
}).submitDisabled, true)
assert.equal(projectAssetTaggingPanelDisplay({
  scanState: 'routing',
  selectedModels: ['ram']
}).progressLabel, '正在提交真实 AI Worker 打标任务...')
assert.equal(projectAssetTaggingPanelDisplay({
  scanState: 'classified',
  category: 'ui',
  selectedModels: ['ram']
}).progressLabel, '已识别/锁定类型: 界面截图 (UI)')
assert.equal(projectAssetTaggingPanelDisplay({
  scanState: 'tagging',
  selectedModels: ['ram', 'not-a-model', 'florence2']
}).progressLabel, '正在等待真实模型返回：[RAM++, Florence-2]')
assert.deepEqual(projectAssetTaggingPanelDisplay({
  scanState: 'completed',
  selectedModels: ['ram']
}), {
  isScanning: true,
  submitDisabled: true,
  submitLabel: '分析中...',
  progressLabel: '真实 AI 标签建议已完成。',
  progressComplete: true,
  emptySuggestionLabel: '该素材暂无 AI 智能标签建议。点击上方“AI 智能打标”生成推荐标签。'
})

for (const category of Object.keys(ASSET_TAGGING_CATEGORY_INFO)) {
  const plan = createAssetTaggingPlan(category)
  assert.ok(plan.modelsToRun.length > 0)
  for (const modelId of plan.modelsToRun) {
    assert.ok(ASSET_TAGGING_MODEL_OPTIONS[modelId])
  }
}

const pendingSuggestions = projectPendingAssetTagSuggestions([
  { id: 'confirmed', status: 'confirmed', tag_name: 'Logo' },
  { id: 'first', status: 'pending', tag_name: '  Logo  ' },
  { id: 'duplicate', status: 'pending', tag_name: 'logo' },
  { id: 'empty', status: 'pending', tag_name: '   ' },
  { id: 'second', status: 'pending', tag_name: 'Brand' },
  { id: 'rejected', status: 'rejected', tag_name: 'Poster' }
])

assert.deepEqual(pendingSuggestions.map((suggestion) => suggestion.id), ['first', 'second'])

const reviewItems = projectAssetTaggingSuggestionReviewItems([
  { id: 'first', status: 'pending', tag_name: '  Logo  ', confidence: 0.884 },
  { id: 'duplicate', status: 'pending', tag_name: 'logo', confidence: 0.2 },
  { id: 'over', status: 'pending', tag_name: 'Poster', confidence: 1.5 },
  { id: 'under', status: 'pending', tag_name: 'Layout', confidence: -1 },
  { id: 'confirmed', status: 'confirmed', tag_name: 'Ignored', confidence: 1 }
])

assert.deepEqual(reviewItems.map((item) => ({
  id: item.id,
  tagName: item.tagName,
  confidenceLabel: item.confidenceLabel,
  confirmCode: item.confirmAction.code,
  rejectCode: item.rejectAction.code
})), [
  { id: 'first', tagName: 'Logo', confidenceLabel: '88%', confirmCode: 'confirm_ai_tag', rejectCode: 'reject_ai_tag' },
  { id: 'over', tagName: 'Poster', confidenceLabel: '100%', confirmCode: 'confirm_ai_tag', rejectCode: 'reject_ai_tag' },
  { id: 'under', tagName: 'Layout', confidenceLabel: '0%', confirmCode: 'confirm_ai_tag', rejectCode: 'reject_ai_tag' }
])
assert.equal(reviewItems[0].confirmAction.label, '确认采纳此标签')
assert.equal(reviewItems[0].rejectAction.label, '拒绝此标签')

assert.deepEqual(projectAssetTagChipDisplay({
  source: 'ai_florence',
  status: 'pending',
  confidence: 0.42,
  modelName: 'Florence-2'
}), {
  hidden: false,
  isAi: true,
  isPending: true,
  sourceLabel: 'Florence-2 AI',
  confidencePercent: 42,
  confidenceLabel: '42%',
  statusLabel: '待确认',
  statusToneClass: 'text-amber-400 animate-pulse',
  iconToneClass: 'text-purple-400',
  opacityClass: 'opacity-60',
  modelName: 'Florence-2'
})

assert.deepEqual(projectAssetTagChipDisplay({
  source: 'manual',
  status: 'confirmed',
  confidence: 1.4
}), {
  hidden: false,
  isAi: false,
  isPending: false,
  sourceLabel: '用户手动',
  confidencePercent: 100,
  confidenceLabel: '100%',
  statusLabel: '已确认',
  statusToneClass: 'text-emerald-400',
  iconToneClass: 'text-purple-600 animate-pulse',
  opacityClass: 'opacity-100',
  modelName: undefined
})

assert.equal(projectAssetTagChipDisplay({ status: 'rejected' }).hidden, true)
assert.equal(projectAssetTagChipDisplay({ source: 'website' }).sourceLabel, '网页抓取')

const tagManagerProjection = projectAssetTagManager([
  {
    id: 'parent',
    name: '风格',
    type: 'style',
    aliases: [],
    isCategory: true,
    usageCount: 0
  },
  {
    id: 'child',
    name: 'Bookshop',
    type: 'custom',
    aliases: ['书店', 'landing'],
    shorthand: 'bk',
    parentId: 'parent',
    usageCount: 4
  },
  {
    id: 'unused',
    name: 'Scraped',
    type: 'source',
    aliases: [],
    usageCount: 0
  }
], { search: '书店', sortOrder: 'usage' })

assert.deepEqual(tagManagerProjection.rows.map((row) => ({
  id: row.tag.id,
  categoryLabel: row.categoryLabel,
  shorthandLabel: row.shorthandLabel,
  aliasLabels: row.aliasLabels,
  parentLabel: row.parentLabel,
  isCategoryParent: row.isCategoryParent,
  usageLabel: row.usageLabel,
  usageToneClass: row.usageToneClass
})), [
  {
    id: 'child',
    categoryLabel: '用户自定义',
    shorthandLabel: 'bk',
    aliasLabels: ['书店', 'landing'],
    parentLabel: '风格',
    isCategoryParent: false,
    usageLabel: '4 次',
    usageToneClass: 'bg-brand-50 text-brand-700 border border-brand-100'
  }
])
assert.ok(tagManagerProjection.typeOptions.some((option) => option.value === 'ai' && option.label === 'AI 智能打标'))
assert.equal(projectAssetTagManager([{ id: 'cat', name: '大类', type: 'style', isCategory: true, usageCount: 0 }]).rows[0].parentLabel, '大类(目录)')
assert.deepEqual(projectAssetTagManager([
  { id: 'b', name: 'Beta', usageCount: 2 },
  { id: 'a', name: 'Alpha', usageCount: 2 },
  { id: 'z', name: 'Zulu', usageCount: 0 }
], { sortOrder: 'usage' }).rows.map((row) => row.tag.id), ['a', 'b', 'z'])
assert.deepEqual(projectAssetTagManager([
  { id: 'b', name: 'Beta', type: 'style', usageCount: 2 },
  { id: 'a', name: 'Alpha', type: 'custom', usageCount: 1 }
], { filterType: 'custom', sortOrder: 'name' }).rows.map((row) => row.tag.id), ['a'])

const pickerProjection = projectAssetTagPicker([
  { id: 'style', name: 'Minimal', type: 'style', aliases: ['极简'], color: 'bg-blue-500 text-white', usageCount: 12 },
  { id: 'custom', name: 'Landing', type: 'custom', aliases: ['首页'], color: '', usageCount: 0 },
  { id: 'extra', name: 'Partner', type: 'partner', aliases: ['合作'], usageCount: 2 }
], { search: '极简' })
assert.deepEqual(pickerProjection.options.map((option) => ({
  id: option.tag.id,
  categoryKey: option.categoryKey,
  categoryLabel: option.categoryLabel,
  usageLabel: option.usageLabel,
  showUsageCount: option.showUsageCount,
  typeBadgeLabel: option.typeBadgeLabel,
  colorDotClass: option.colorDotClass,
  mergeOptionLabel: option.mergeOptionLabel
})), [
  {
    id: 'style',
    categoryKey: 'style',
    categoryLabel: '风格 (Style)',
    usageLabel: '12',
    showUsageCount: true,
    typeBadgeLabel: 'style',
    colorDotClass: 'bg-blue-500',
    mergeOptionLabel: 'Minimal (style) - 使用 12 次'
  }
])
assert.deepEqual(projectAssetTagPicker([
  { id: 'style', name: 'Minimal', type: 'style', usageCount: 1 },
  { id: 'custom', name: 'Landing', type: 'custom', usageCount: 0 },
  { id: 'extra', name: 'Partner', type: 'partner', usageCount: 2 }
]).groups.map((group) => group.categoryKey), ['style', 'custom', 'partner'])
assert.deepEqual(projectAssetTagPicker([
  { id: 'a', name: 'Alpha', type: 'style' },
  { id: 'b', name: 'Beta', type: 'custom' }
], { excludeTagIds: ['a'], excludeTagNames: ['Beta'] }).options.map((option) => option.tag.id), [])
assert.match(projectAssetTagPicker([], { search: 'none' }).emptyLabel, /没有匹配的标签/)

const tagInputProjection = projectAssetTagInput([
  { id: 'style', name: 'Minimal', type: 'style', aliases: ['极简'], color: 'bg-blue-500 text-white', usageCount: 12 },
  { id: 'custom', name: 'Landing', type: 'custom', aliases: ['首页'], color: '', usageCount: 0 },
  { id: 'excluded', name: 'Used', type: 'usage', aliases: ['已用'], usageCount: 1 }
], { inputValue: '首页', excludeTagNames: ['Used'], limit: 8 })
assert.deepEqual(tagInputProjection.suggestions.map((option) => option.tag.id), ['custom'])
assert.equal(tagInputProjection.hasExactMatch, false)
assert.equal(tagInputProjection.canCreate, true)
assert.equal(tagInputProjection.createLabel, '快速创建新标签 "首页"')
assert.equal(projectAssetTagInput([
  { id: 'style', name: 'Minimal', type: 'style', aliases: [] }
], { inputValue: 'minimal' }).hasExactMatch, true)
assert.equal(projectAssetTagInput([
  { id: 'style', name: 'Minimal', type: 'style', aliases: [] }
], { inputValue: 'minimal' }).canCreate, false)
assert.equal(projectAssetTagInput([], { inputValue: '  ' }).canCreate, false)
assert.equal(projectAssetTagInput([], { inputValue: 'Minimal' }).duplicateLabel, '该标签已添加')

const librarySidebarProjection = projectAssetLibrarySidebar([
  { id: 'style', name: 'Minimal', type: 'style', usageCount: 4 },
  { id: 'unused', name: 'Unused', type: 'custom', usageCount: 0 },
  { id: 'ai', name: 'AI Suggested', type: 'ai', usageCount: 2 },
  { id: 'extra', name: 'Partner', type: 'partner', usageCount: 1 }
], { activeQueries: ['tag:Minimal', 'special:ai_pending'], assetsCount: 12 })
assert.deepEqual(librarySidebarProjection.shortcuts.map((shortcut) => ({
  code: shortcut.code,
  label: shortcut.label,
  query: shortcut.query,
  iconKey: shortcut.iconKey,
  countLabel: shortcut.countLabel,
  isActive: shortcut.isActive
})), [
  { code: 'all', label: '全部素材资源', query: undefined, iconKey: 'compass', countLabel: '12', isActive: false },
  { code: 'untagged', label: '无任何标签素材', query: 'special:untagged', iconKey: 'sliders', countLabel: undefined, isActive: false },
  { code: 'ai_pending', label: 'AI 待确认标签', query: 'special:ai_pending', iconKey: 'sparkles', countLabel: undefined, isActive: true }
])
assert.deepEqual(librarySidebarProjection.groups.map((group) => ({
  typeKey: group.typeKey,
  title: group.title,
  items: group.items.map((item) => ({
    id: item.tag.id,
    query: item.query,
    label: item.label,
    countLabel: item.countLabel,
    isActive: item.isActive
  }))
})), [
  {
    typeKey: 'style',
    title: '风格',
    items: [{ id: 'style', query: 'tag:Minimal', label: '#Minimal', countLabel: '4', isActive: true }]
  },
  {
    typeKey: 'ai',
    title: '智能打标',
    items: [{ id: 'ai', query: 'tag:AI Suggested', label: '#AI Suggested', countLabel: '2', isActive: false }]
  },
  {
    typeKey: 'partner',
    title: 'partner',
    items: [{ id: 'extra', query: 'tag:Partner', label: '#Partner', countLabel: '1', isActive: false }]
  }
])

assert.deepEqual(projectAssetLibrarySidebar([], { activeQueries: [], assetsCount: Number.NaN }).shortcuts[0], {
  code: 'all',
  label: '全部素材资源',
  iconKey: 'compass',
  countLabel: '0',
  isActive: true,
  activeClassName: 'bg-brand-50 text-brand-700 font-bold',
  idleClassName: 'hover:bg-slate-50 text-slate-600',
  iconClassName: 'text-slate-500'
})

assert.deepEqual(projectAssetLibraryTagFilterChips([
  'tag:Minimal',
  'type:style',
  'source:Pinterest',
  'special:untagged',
  'special:ai_pending',
  'loose keyword'
]).map((chip) => ({
  query: chip.query,
  typeLabel: chip.typeLabel,
  valueLabel: chip.valueLabel,
  iconKey: chip.iconKey,
  toneClassName: chip.toneClassName
})), [
  { query: 'tag:Minimal', typeLabel: '标签', valueLabel: 'Minimal', iconKey: 'tag', toneClassName: 'bg-brand-50 text-brand-700 border-brand-200' },
  { query: 'type:style', typeLabel: '分类', valueLabel: '风格', iconKey: 'compass', toneClassName: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { query: 'source:Pinterest', typeLabel: '来源', valueLabel: 'Pinterest', iconKey: 'database', toneClassName: 'bg-slate-100 text-slate-700 border-slate-200' },
  { query: 'special:untagged', typeLabel: '条件', valueLabel: '无标签素材', iconKey: 'sliders', toneClassName: 'bg-rose-50 text-rose-700 border-rose-200' },
  { query: 'special:ai_pending', typeLabel: '条件', valueLabel: 'AI待确认素材', iconKey: 'sparkles', toneClassName: 'bg-purple-50 text-purple-700 border-purple-200' },
  { query: 'loose keyword', typeLabel: '关键词', valueLabel: 'loose keyword', iconKey: 'sliders', toneClassName: 'bg-slate-50 text-slate-600 border-slate-200' }
])

assert.deepEqual(projectAssetTaggingComputeBanner({
  workerOffline: true,
  gpuDeviceName: 'Ignored GPU',
  gpuUtilizationPercent: 88,
  queuedTaskCount: 3
}), {
  titleLabel: 'AI 智能打标算力状态',
  statusLabel: '离线 (本地降级)',
  detailLabel: '本地打标服务未开启，暂时无法使用反推。',
  indicatorClass: 'bg-rose-400 animate-ping'
})

assert.deepEqual(projectAssetTaggingComputeBanner({
  workerOffline: false,
  gpuDeviceName: 'Apple Silicon (MPS)',
  gpuUtilizationPercent: 24,
  queuedTaskCount: 2
}), {
  titleLabel: 'AI 智能打标算力状态',
  statusLabel: '运行中',
  detailLabel: 'GPU: Apple Silicon (MPS) • 显存利用: 24% • 任务积压: 2 个',
  indicatorClass: 'bg-emerald-500 animate-pulse'
})

assert.equal(projectAssetTaggingComputeBanner({}).detailLabel, 'GPU: NVIDIA Card • 显存利用: 0% • 任务积压: 0 个')

const confirmedProjection = projectAssetTaggingConfirmedTags([
  { id: 'rel-1', tag_id: 'tag-1', status: 'confirmed', tag_name: '  UI设计  ', tag_type: 'style', tag_color: 'ui-color', source: 'manual', confidence: 1 },
  { id: 'rel-duplicate', tag_id: 'tag-1', status: 'confirmed', tag_name: 'UI设计 Duplicate', confidence: 0.5 },
  { id: 'rel-2', tag_id: 'tag-2', status: 'pending', tag_name: 'pending', confidence: 0.5 },
  { id: 'rel-3', tag_id: 'tag-3', status: 'rejected', tag_name: 'rejected', confidence: 0.5 },
  { id: 'rel-4', tag_id: 'tag-4', status: 'confirmed', tag_name: 'Brand', source: 'ai_ram', confidence: Number.NaN, model_name: 'RAM++' }
])

assert.deepEqual(confirmedProjection.items.map((item) => ({
  relationId: item.relationId,
  tagId: item.tagId,
  tagName: item.tagName,
  tagType: item.tagType,
  source: item.source,
  confidence: item.confidence,
  modelName: item.modelName,
  searchQuery: item.searchQuery
})), [
  {
    relationId: 'rel-1',
    tagId: 'tag-1',
    tagName: 'UI设计',
    tagType: 'style',
    source: 'manual',
    confidence: 1,
    modelName: undefined,
    searchQuery: 'tag:UI设计'
  },
  {
    relationId: 'rel-4',
    tagId: 'tag-4',
    tagName: 'Brand',
    tagType: 'custom',
    source: 'ai_ram',
    confidence: 1,
    modelName: 'RAM++',
    searchQuery: 'tag:Brand'
  }
])
assert.deepEqual(confirmedProjection.activeTagNames, ['UI设计', 'Brand'])
assert.match(confirmedProjection.emptyLabel, /暂无已确认标签/)

const panelSource = await fs.readFile('src/renderer/components/tag/TagSuggestionPanel.tsx', 'utf8')
const assetInspectorSource = await fs.readFile('src/renderer/components/asset/AssetInspectorDrawer.tsx', 'utf8')
const assetTagPanelSource = await fs.readFile('src/renderer/components/asset/AssetTagPanel.tsx', 'utf8')
const tagChipSource = await fs.readFile('src/renderer/components/tag/TagChip.tsx', 'utf8')
const tagSelectorSource = await fs.readFile('src/renderer/components/tag/TagSelector.tsx', 'utf8')
const tagInputSource = await fs.readFile('src/renderer/components/tag/TagInput.tsx', 'utf8')
const tagMergeDialogSource = await fs.readFile('src/renderer/components/tag/TagMergeDialog.tsx', 'utf8')
const tagManagerSource = await fs.readFile('src/renderer/routes/TagManagerPage.tsx', 'utf8')
const librarySource = await fs.readFile('src/renderer/routes/Library.tsx', 'utf8')
const librarySidebarSource = await fs.readFile('src/renderer/components/library/LibrarySidebar.tsx', 'utf8')
const tagFilterBarSource = await fs.readFile('src/renderer/components/tag/TagFilterBar.tsx', 'utf8')
const storeSource = await fs.readFile('src/renderer/stores/asset.store.ts', 'utf8')
const aiClientSource = await fs.readFile('src/main/services/ai-client.service.ts', 'utf8')
assert.match(panelSource, /createAssetTaggingPlan/)
assert.match(panelSource, /projectAssetTaggingCategoryOptions/)
assert.match(panelSource, /projectAssetTaggingModelSelectionSections/)
assert.match(panelSource, /projectAssetTaggingPanelDisplay/)
assert.match(panelSource, /projectAssetTaggingSuggestionReviewItems/)
assert.match(panelSource, /toggleAssetTaggingModelSelection/)
assert.match(panelSource, /AI 视觉特征分析/)
assert.match(assetInspectorSource, /<TagSuggestionPanel key=\{selectedAsset\.id\} assetId=\{selectedAsset\.id\} \/>/)
assert.match(assetTagPanelSource, /projectAssetTaggingConfirmedTags/)
assert.match(assetTagPanelSource, /CUSTOM_ASSET_TAG_COLOR_CLASS/)
assert.match(tagChipSource, /projectAssetTagChipDisplay/)
assert.match(tagChipSource, /tooltipPosition/)
assert.match(tagChipSource, /fixed z-\[9999\]/)
assert.match(tagSelectorSource, /projectAssetTagPicker/)
assert.match(tagInputSource, /projectAssetTagInput/)
assert.match(tagInputSource, /dropdownPosition/)
assert.match(tagInputSource, /fixed z-\[9999\]/)
assert.match(tagMergeDialogSource, /projectAssetTagPicker/)
assert.match(tagManagerSource, /projectAssetTagManager/)
assert.match(tagManagerSource, /projectAssetTaggingComputeBanner/)
assert.match(librarySource, /<TagFilterBar \/>/)
assert.match(librarySidebarSource, /projectAssetLibrarySidebar/)
assert.match(tagFilterBarSource, /projectAssetLibraryTagFilterChips/)
assert.match(aiClientSource, /createAssetTaggingTaskSubmission/)
assert.match(storeSource, /generateAiSuggestions/)
assert.doesNotMatch(storeSource, /createAssetTaggingTaskSubmission/)
assert.doesNotMatch(storeSource, /generateMockAiSuggestions/)
assert.doesNotMatch(panelSource, /const\s+PIPELINE_MAP/)
assert.doesNotMatch(panelSource, /const\s+TYPE_LABEL_MAP/)
assert.doesNotMatch(panelSource, /const\s+MODEL_DISPLAY_NAMES/)
assert.doesNotMatch(panelSource, /BASE_LAYER_MODELS/)
assert.doesNotMatch(panelSource, /ENHANCED_LAYER_MODELS/)
assert.doesNotMatch(panelSource, /model\.layer\s*===/)
assert.doesNotMatch(panelSource, /new Set<string>/)
assert.doesNotMatch(panelSource, /confidence\s*\*\s*100/)
assert.doesNotMatch(panelSource, /scanningState\s*!==\s*['"]idle['"]/)
assert.doesNotMatch(panelSource, /scanningState\s*===\s*['"](routing|classified|tagging|completed)['"]/)
assert.doesNotMatch(panelSource, /Object\.entries\(ASSET_TAGGING_CATEGORY_INFO\)/)
assert.doesNotMatch(panelSource, /ASSET_TAGGING_MODEL_OPTIONS/)
assert.doesNotMatch(panelSource, /AI 视觉特征 analysis/)
assert.doesNotMatch(assetTagPanelSource, /new Set<string>/)
assert.doesNotMatch(assetTagPanelSource, /status\s*===\s*['"]confirmed['"]/)
assert.doesNotMatch(assetTagPanelSource, /tag:\$\{rel\.tag_name\}/)
assert.doesNotMatch(assetTagPanelSource, /bg-pink-50 text-pink-700 border border-pink-200/)
assert.doesNotMatch(tagManagerSource, /const\s+categoryNames/)
assert.doesNotMatch(tagManagerSource, /const\s+filteredTags/)
assert.doesNotMatch(tagManagerSource, /getParentName/)
assert.doesNotMatch(tagManagerSource, /usageCount\s*>\s*0/)
assert.doesNotMatch(tagManagerSource, /tags\.find/)
assert.doesNotMatch(tagManagerSource, /aiStatus\?\.offline\s*\?/)
assert.doesNotMatch(tagManagerSource, /aiStatus\?\.gpu_status\?\.device_name\s*\|\|/)
assert.doesNotMatch(tagManagerSource, /aiStatus\?\.queue_stats\?\.queued\s*\|\|/)
assert.doesNotMatch(tagSelectorSource, /const\s+categoryNames/)
assert.doesNotMatch(tagSelectorSource, /const\s+filteredTags/)
assert.doesNotMatch(tagSelectorSource, /aliases\.some/)
assert.doesNotMatch(tagSelectorSource, /usageCount\s*>\s*0/)
assert.doesNotMatch(tagInputSource, /aliases\.some/)
assert.doesNotMatch(tagInputSource, /hasExactMatch\s*=\s*tags\.some/)
assert.doesNotMatch(tagInputSource, /slice\(0,\s*8\)/)
assert.doesNotMatch(tagInputSource, /tag\.color\.split/)
assert.doesNotMatch(tagInputSource, /absolute z-40 top-full/)
assert.doesNotMatch(tagMergeDialogSource, /tags\.filter\(\(t\)\s*=>\s*t\.id\s*!==\s*sourceTagId\)/)
assert.doesNotMatch(tagMergeDialogSource, /使用\s*\{.*usageCount.*\}\s*次/)
assert.doesNotMatch(librarySource, /groupedSidebarTags/)
assert.doesNotMatch(librarySource, /usageCount\s*>\s*0/)
assert.doesNotMatch(librarySidebarSource, /activeTagSearchQueries\.includes\(['"]special:/)
assert.doesNotMatch(librarySidebarSource, /`tag:\$\{tag\.name\}`/)
assert.doesNotMatch(librarySidebarSource, /tag\.usageCount/)
assert.doesNotMatch(tagFilterBarSource, /getQueryLabel/)
assert.doesNotMatch(tagFilterBarSource, /typeLabels/)
assert.doesNotMatch(tagFilterBarSource, /q\.split\(['"]:/)
assert.doesNotMatch(tagChipSource, /status\s*===\s*['"]pending['"]/)
assert.doesNotMatch(tagChipSource, /status\s*===\s*['"]rejected['"]/)
assert.doesNotMatch(tagChipSource, /confidence\s*<\s*0\.6/)
assert.doesNotMatch(tagChipSource, /confidence\s*\*\s*100/)
assert.doesNotMatch(tagChipSource, /getSourceLabel/)
assert.doesNotMatch(tagChipSource, /group-hover\/chip/)
assert.doesNotMatch(aiClientSource, /custom_pipeline:\$\{modelsToRun\.join/)

// Shared preset colors and types checks
assert.ok(ASSET_TAG_PRESET_COLORS.length > 0)
assert.equal(ASSET_TAG_PRESET_COLORS[0].label, '靛蓝 (Style)')
assert.equal(DEFAULT_ASSET_TAG_COLOR_CLASS, ASSET_TAG_PRESET_COLORS[0].value)
assert.equal(CUSTOM_ASSET_TAG_COLOR_CLASS, ASSET_TAG_PRESET_COLORS[7].value)
assert.ok(ASSET_TAG_TYPES.length > 0)
assert.equal(ASSET_TAG_TYPES[0].value, 'style')
assert.equal(ASSET_TAG_TYPES[0].colorClass, DEFAULT_ASSET_TAG_COLOR_CLASS)
assert.equal(ASSET_TAG_TYPES[7].colorClass, CUSTOM_ASSET_TAG_COLOR_CLASS)
assert.equal(getAssetTagColorClass('style'), 'bg-indigo-50 text-indigo-700 border border-indigo-200')
assert.equal(getAssetTagColorClass('nonexistent'), 'bg-pink-50 text-pink-700 border border-pink-200')

const tagEditDialogSource = await fs.readFile('src/renderer/components/tag/TagEditDialog.tsx', 'utf8')
assert.match(tagEditDialogSource, /ASSET_TAG_PRESET_COLORS/)
assert.match(tagEditDialogSource, /ASSET_TAG_TYPES/)
assert.match(tagEditDialogSource, /CUSTOM_ASSET_TAG_COLOR_CLASS/)
assert.match(tagEditDialogSource, /DEFAULT_ASSET_TAG_COLOR_CLASS/)
assert.doesNotMatch(tagEditDialogSource, /const\s+PRESET_COLORS\s*=/)
assert.doesNotMatch(tagEditDialogSource, /const\s+TAG_TYPES\s*=/)
assert.doesNotMatch(tagEditDialogSource, /'靛蓝 \(Style\)'/)
assert.doesNotMatch(tagEditDialogSource, /ASSET_TAG_PRESET_COLORS\[7\]/)

assert.match(tagChipSource, /getAssetTagColorClass/)
assert.doesNotMatch(tagChipSource, /const\s+getTypeColors\s*=/)
assert.doesNotMatch(tagChipSource, /bg-indigo-50 text-indigo-700 border border-indigo-200/)

console.log('asset-tagging-workflow passed')
