export type AssetTaggingCategory =
  | 'design'
  | 'ui'
  | 'document'
  | 'anime'
  | 'illustration'
  | 'photo'
  | 'product'
  | 'unknown'

export type AssetTaggingModelId =
  | 'ram'
  | 'florence2'
  | 'wd_tagger'
  | 'clip'
  | 'design_rule'

export type AssetTaggingModelLayer = 'base' | 'enhanced'

export interface AssetTaggingModelOption {
  id: AssetTaggingModelId
  name: string
  desc: string
  layer: AssetTaggingModelLayer
}

export interface AssetTaggingModelSelectionItem {
  id: AssetTaggingModelId
  name: string
  desc: string
}

export interface AssetTaggingModelSelectionSection {
  code: AssetTaggingModelLayer
  title: string
  iconTone: 'purple' | 'indigo'
  items: AssetTaggingModelSelectionItem[]
}

export type AssetTaggingScanState =
  | 'idle'
  | 'routing'
  | 'classified'
  | 'tagging'
  | 'completed'

export interface AssetTaggingCategoryOption {
  value: AssetTaggingCategory
  label: string
}

export interface AssetTaggingPanelDisplayInput {
  scanState: AssetTaggingScanState
  category?: string | null
  selectedModels?: readonly string[] | null
}

export interface AssetTaggingPanelDisplay {
  isScanning: boolean
  submitDisabled: boolean
  submitLabel: string
  progressLabel: string
  progressComplete: boolean
  emptySuggestionLabel: string
}

export interface AssetTaggingCategoryInfo {
  category: AssetTaggingCategory
  typeLabel: string
  modelLabel: string
}

export interface AssetTaggingPlan {
  category: AssetTaggingCategory
  categoryInfo: AssetTaggingCategoryInfo
  modelsToRun: AssetTaggingModelId[]
  modelOptions: AssetTaggingModelOption[]
}

export interface AssetTaggingTaskSubmission {
  modelsToRun: AssetTaggingModelId[]
  modelName: string
}

export interface AssetTaggingPendingSuggestionLike {
  id: string
  tag_id?: string | null
  status?: string | null
  tag_name?: string | null
  tag_type?: string | null
  tag_color?: string | null
  source?: string | null
  confidence?: number | null
  model_name?: string | null
}

export interface AssetTaggingReviewAction {
  code: 'confirm_ai_tag' | 'reject_ai_tag'
  label: string
}

export interface AssetTaggingSuggestionReviewItem {
  id: string
  tagName: string
  confidencePercent: number
  confidenceLabel: string
  confirmAction: AssetTaggingReviewAction
  rejectAction: AssetTaggingReviewAction
}

export interface AssetTaggingConfirmedTagItem {
  relationId: string
  tagId: string
  tagName: string
  tagType: string
  tagColor?: string
  source: string
  confidence: number
  status: 'confirmed'
  modelName?: string
  searchQuery: string
}

export interface AssetTaggingConfirmedTagProjection {
  items: AssetTaggingConfirmedTagItem[]
  activeTagNames: string[]
  emptyLabel: string
}

export interface AssetTagChipDisplayInput {
  type?: string | null
  source?: string | null
  confidence?: number | null
  status?: string | null
  modelName?: string | null
}

export interface AssetTagChipDisplay {
  hidden: boolean
  isAi: boolean
  isPending: boolean
  sourceLabel: string
  confidencePercent: number
  confidenceLabel: string
  statusLabel: string
  statusToneClass: string
  iconToneClass: string
  opacityClass: string
  modelName?: string
}

export type AssetTagManagerSortOrder = 'usage' | 'name'

export interface AssetTagManagerTagLike {
  id: string
  name: string
  type?: string | null
  color?: string | null
  shorthand?: string | null
  aliases?: readonly string[] | null
  parentId?: string | null
  isCategory?: boolean | null
  usageCount?: number | null
}

export interface AssetTagManagerTypeOption {
  value: string
  label: string
}

export interface AssetTagManagerRow<T extends AssetTagManagerTagLike = AssetTagManagerTagLike> {
  tag: T
  categoryLabel: string
  shorthandLabel: string
  aliasLabels: string[]
  emptyAliasesLabel: string
  parentLabel: string
  isCategoryParent: boolean
  usageLabel: string
  usageToneClass: string
}

export interface AssetTagManagerProjection<T extends AssetTagManagerTagLike = AssetTagManagerTagLike> {
  typeOptions: AssetTagManagerTypeOption[]
  rows: AssetTagManagerRow<T>[]
  emptyLabel: string
}

export interface AssetTaggingComputeBannerInput {
  workerOffline?: boolean | null
  gpuDeviceName?: string | null
  gpuUtilizationPercent?: number | null
  queuedTaskCount?: number | null
}

export interface AssetTaggingComputeBannerDisplay {
  titleLabel: string
  statusLabel: string
  detailLabel: string
  indicatorClass: string
}

export interface AssetTagPickerTagLike {
  id: string
  name: string
  type?: string | null
  color?: string | null
  aliases?: readonly string[] | null
  usageCount?: number | null
}

export interface AssetTagPickerOption<T extends AssetTagPickerTagLike = AssetTagPickerTagLike> {
  tag: T
  categoryKey: string
  categoryLabel: string
  usageCount: number
  usageLabel: string
  showUsageCount: boolean
  typeBadgeLabel: string
  colorDotClass: string
  mergeOptionLabel: string
}

export interface AssetTagPickerGroup<T extends AssetTagPickerTagLike = AssetTagPickerTagLike> {
  categoryKey: string
  categoryLabel: string
  options: AssetTagPickerOption<T>[]
}

export interface AssetTagPickerProjection<T extends AssetTagPickerTagLike = AssetTagPickerTagLike> {
  options: AssetTagPickerOption<T>[]
  groups: AssetTagPickerGroup<T>[]
  emptyLabel: string
}

export interface AssetTagInputProjection<T extends AssetTagPickerTagLike = AssetTagPickerTagLike> {
  suggestions: AssetTagPickerOption<T>[]
  hasExactMatch: boolean
  canCreate: boolean
  createLabel: string
  duplicateLabel: string
}

export type AssetLibraryTagFilterIconKey =
  | 'compass'
  | 'sliders'
  | 'sparkles'
  | 'tag'
  | 'database'

export interface AssetLibrarySidebarShortcut {
  code: 'all' | 'untagged' | 'ai_pending'
  label: string
  query?: string
  iconKey: AssetLibraryTagFilterIconKey
  countLabel?: string
  isActive: boolean
  activeClassName: string
  idleClassName: string
  iconClassName: string
}

export interface AssetLibrarySidebarTagItem<T extends AssetTagPickerTagLike = AssetTagPickerTagLike> {
  tag: T
  query: string
  label: string
  countLabel: string
  isActive: boolean
  activeClassName: string
  idleClassName: string
}

export interface AssetLibrarySidebarGroup<T extends AssetTagPickerTagLike = AssetTagPickerTagLike> {
  typeKey: string
  title: string
  items: AssetLibrarySidebarTagItem<T>[]
}

export interface AssetLibrarySidebarProjection<T extends AssetTagPickerTagLike = AssetTagPickerTagLike> {
  shortcuts: AssetLibrarySidebarShortcut[]
  groups: AssetLibrarySidebarGroup<T>[]
}

export interface AssetLibraryTagFilterChip {
  query: string
  typeLabel: string
  valueLabel: string
  iconKey: AssetLibraryTagFilterIconKey
  toneClassName: string
}

export const ASSET_TAGGING_CATEGORY_INFO: Record<AssetTaggingCategory, AssetTaggingCategoryInfo> = {
  design: { category: 'design', typeLabel: '商业设计图 (DESIGN)', modelLabel: 'Florence-2 & CLIP' },
  ui: { category: 'ui', typeLabel: '界面截图 (UI)', modelLabel: 'Florence-2' },
  document: { category: 'document', typeLabel: '文档大图 (DOCUMENT)', modelLabel: 'Florence-2' },
  anime: { category: 'anime', typeLabel: '动漫原画 (ANIME)', modelLabel: 'WD Tagger' },
  illustration: { category: 'illustration', typeLabel: '手绘插画 (ILLUSTRATION)', modelLabel: 'RAM++' },
  photo: { category: 'photo', typeLabel: '摄影照片 (PHOTO)', modelLabel: 'RAM++' },
  product: { category: 'product', typeLabel: '商品展示 (PRODUCT)', modelLabel: 'RAM++' },
  unknown: { category: 'unknown', typeLabel: '未知类别 (UNKNOWN)', modelLabel: 'Rule-based Fallback' }
}

export const ASSET_TAGGING_CATEGORY_PIPELINES: Record<AssetTaggingCategory, AssetTaggingModelId[]> = {
  anime: ['wd_tagger'],
  illustration: ['ram', 'design_rule'],
  photo: ['ram', 'design_rule'],
  product: ['ram', 'design_rule'],
  design: ['ram', 'florence2', 'design_rule'],
  ui: ['ram', 'florence2', 'design_rule'],
  document: ['ram', 'florence2', 'design_rule'],
  unknown: ['ram', 'design_rule']
}

export const ASSET_TAGGING_MODEL_OPTIONS: Record<AssetTaggingModelId, AssetTaggingModelOption> = {
  ram: { id: 'ram', name: 'RAM++', desc: '通用画风与多标签反推', layer: 'base' },
  florence2: { id: 'florence2', name: 'Florence-2', desc: '图片场景详细描述', layer: 'enhanced' },
  wd_tagger: { id: 'wd_tagger', name: 'WD Tagger', desc: '二次元/动漫特征提取', layer: 'enhanced' },
  clip: { id: 'clip', name: 'CLIP Classifier', desc: '零样本特征分类器', layer: 'enhanced' },
  design_rule: { id: 'design_rule', name: 'DesignRule', desc: '排版与版式规则辅助', layer: 'enhanced' }
}

const ASSET_TAG_MANAGER_TYPE_LABELS: Record<string, string> = {
  style: '风格 (Style)',
  color: '色彩 (Color)',
  usage: '用途 (Usage)',
  layout: '版式 (Layout)',
  scene: '场景 (Scene)',
  source: '来源 (Source)',
  ai: 'AI 智能打标',
  custom: '用户自定义 (Custom)'
}

const ASSET_TAG_PICKER_CATEGORY_ORDER = ['style', 'color', 'usage', 'layout', 'scene', 'source', 'ai', 'custom']

const ASSET_LIBRARY_TAG_GROUP_TITLES: Record<string, string> = {
  style: '风格',
  color: '色彩',
  usage: '用途',
  layout: '版式',
  scene: '场景',
  source: '来源',
  ai: '智能打标',
  custom: '自定义'
}

const ASSET_LIBRARY_FILTER_TYPE_LABELS: Record<string, string> = {
  style: '风格',
  color: '主色彩',
  usage: '素材用途',
  layout: '排版版式',
  scene: '适用场景',
  source: '来源渠道',
  ai: '智能打标',
  custom: '自定义'
}

export function projectAssetLibrarySidebar<T extends AssetTagPickerTagLike>(
  tags: readonly T[],
  input?: {
    activeQueries?: readonly string[] | null
    assetsCount?: number | null
  }
): AssetLibrarySidebarProjection<T> {
  const activeQueries = input?.activeQueries || []
  const assetsCount = normalizeUsageCount(input?.assetsCount)
  const groupsByKey = new Map<string, AssetLibrarySidebarGroup<T>>()

  for (const tag of tags) {
    const usageCount = normalizeUsageCount(tag.usageCount)
    if (usageCount <= 0) continue

    const typeKey = tag.type || 'custom'
    if (!groupsByKey.has(typeKey)) {
      groupsByKey.set(typeKey, {
        typeKey,
        title: ASSET_LIBRARY_TAG_GROUP_TITLES[typeKey] || typeKey,
        items: []
      })
    }

    const query = `tag:${tag.name}`
    groupsByKey.get(typeKey)?.items.push({
      tag,
      query,
      label: `#${tag.name}`,
      countLabel: String(usageCount),
      isActive: activeQueries.includes(query),
      activeClassName: 'bg-brand-50 text-brand-700 font-bold',
      idleClassName: 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
    })
  }

  const knownGroups = ASSET_TAG_PICKER_CATEGORY_ORDER
    .map((typeKey) => groupsByKey.get(typeKey))
    .filter((group): group is AssetLibrarySidebarGroup<T> => Boolean(group))
  const extraGroups = Array.from(groupsByKey.values())
    .filter((group) => !ASSET_TAG_PICKER_CATEGORY_ORDER.includes(group.typeKey))

  return {
    shortcuts: [
      {
        code: 'all',
        label: '全部素材资源',
        iconKey: 'compass',
        countLabel: String(assetsCount),
        isActive: activeQueries.length === 0,
        activeClassName: 'bg-brand-50 text-brand-700 font-bold',
        idleClassName: 'hover:bg-slate-50 text-slate-600',
        iconClassName: 'text-slate-500'
      },
      {
        code: 'untagged',
        label: '无任何标签素材',
        query: 'special:untagged',
        iconKey: 'sliders',
        isActive: activeQueries.includes('special:untagged'),
        activeClassName: 'bg-rose-50 text-rose-700 font-bold border border-rose-100',
        idleClassName: 'hover:bg-slate-50 text-slate-600',
        iconClassName: 'text-rose-400'
      },
      {
        code: 'ai_pending',
        label: 'AI 待确认标签',
        query: 'special:ai_pending',
        iconKey: 'sparkles',
        isActive: activeQueries.includes('special:ai_pending'),
        activeClassName: 'bg-purple-50 text-purple-700 font-bold border border-purple-100',
        idleClassName: 'hover:bg-slate-50 text-slate-600',
        iconClassName: 'text-purple-500 animate-pulse'
      }
    ],
    groups: [...knownGroups, ...extraGroups]
  }
}

export function projectAssetLibraryTagFilterChips(
  queries: readonly string[]
): AssetLibraryTagFilterChip[] {
  return queries.map((query) => {
    const separatorIndex = query.indexOf(':')
    if (separatorIndex < 0) {
      return {
        query,
        typeLabel: '关键词',
        valueLabel: query,
        iconKey: 'sliders',
        toneClassName: 'bg-slate-50 text-slate-600 border-slate-200'
      }
    }

    const key = query.slice(0, separatorIndex).trim().toLowerCase()
    const value = query.slice(separatorIndex + 1).trim()

    if (key === 'tag') {
      return {
        query,
        typeLabel: '标签',
        valueLabel: value,
        iconKey: 'tag',
        toneClassName: 'bg-brand-50 text-brand-700 border-brand-200'
      }
    }
    if (key === 'type') {
      return {
        query,
        typeLabel: '分类',
        valueLabel: ASSET_LIBRARY_FILTER_TYPE_LABELS[value] || value,
        iconKey: 'compass',
        toneClassName: 'bg-indigo-50 text-indigo-700 border-indigo-200'
      }
    }
    if (key === 'source') {
      return {
        query,
        typeLabel: '来源',
        valueLabel: value,
        iconKey: 'database',
        toneClassName: 'bg-slate-100 text-slate-700 border-slate-200'
      }
    }
    if (key === 'special' && value === 'untagged') {
      return {
        query,
        typeLabel: '条件',
        valueLabel: '无标签素材',
        iconKey: 'sliders',
        toneClassName: 'bg-rose-50 text-rose-700 border-rose-200'
      }
    }
    if (key === 'special' && value === 'ai_pending') {
      return {
        query,
        typeLabel: '条件',
        valueLabel: 'AI待确认素材',
        iconKey: 'sparkles',
        toneClassName: 'bg-purple-50 text-purple-700 border-purple-200'
      }
    }

    return {
      query,
      typeLabel: key,
      valueLabel: value,
      iconKey: 'sliders',
      toneClassName: 'bg-slate-50 text-slate-600 border-slate-200'
    }
  })
}

export function projectAssetTagPicker<T extends AssetTagPickerTagLike>(
  tags: readonly T[],
  input?: {
    search?: string | null
    excludeTagIds?: readonly string[] | null
    excludeTagNames?: readonly string[] | null
    limit?: number | null
  }
): AssetTagPickerProjection<T> {
  const search = (input?.search || '').trim().toLowerCase()
  const excludeIds = new Set(input?.excludeTagIds || [])
  const excludeNames = new Set(input?.excludeTagNames || [])
  const limit = typeof input?.limit === 'number' && input.limit >= 0 ? input.limit : undefined

  const options = tags
    .filter((tag) => {
      if (excludeIds.has(tag.id) || excludeNames.has(tag.name)) return false
      if (!search) return true

      const aliases = Array.isArray(tag.aliases) ? tag.aliases : []
      return tag.name.toLowerCase().includes(search) ||
        aliases.some((alias) => alias.toLowerCase().includes(search))
    })
    .map((tag) => projectAssetTagPickerOption(tag))

  const limitedOptions = typeof limit === 'number' ? options.slice(0, limit) : options
  const groupsByKey = new Map<string, AssetTagPickerGroup<T>>()

  for (const option of limitedOptions) {
    if (!groupsByKey.has(option.categoryKey)) {
      groupsByKey.set(option.categoryKey, {
        categoryKey: option.categoryKey,
        categoryLabel: option.categoryLabel,
        options: []
      })
    }
    groupsByKey.get(option.categoryKey)?.options.push(option)
  }

  const knownGroups = ASSET_TAG_PICKER_CATEGORY_ORDER
    .map((categoryKey) => groupsByKey.get(categoryKey))
    .filter((group): group is AssetTagPickerGroup<T> => Boolean(group))
  const extraGroups = Array.from(groupsByKey.values())
    .filter((group) => !ASSET_TAG_PICKER_CATEGORY_ORDER.includes(group.categoryKey))

  return {
    options: limitedOptions,
    groups: [...knownGroups, ...extraGroups],
    emptyLabel: '没有匹配的标签，您可以尝试在详情面板中直接创建。'
  }
}

export function projectAssetTagInput<T extends AssetTagPickerTagLike>(
  tags: readonly T[],
  input?: {
    inputValue?: string | null
    excludeTagNames?: readonly string[] | null
    limit?: number | null
  }
): AssetTagInputProjection<T> {
  const inputValue = input?.inputValue || ''
  const trimmed = inputValue.trim()
  const suggestions = projectAssetTagPicker(tags, {
    search: inputValue,
    excludeTagNames: input?.excludeTagNames || [],
    limit: input?.limit ?? 8
  }).options
  const hasExactMatch = tags.some((tag) => tag.name.toLowerCase() === trimmed.toLowerCase())

  return {
    suggestions,
    hasExactMatch,
    canCreate: trimmed !== '' && !hasExactMatch,
    createLabel: `快速创建新标签 "${trimmed}"`,
    duplicateLabel: '该标签已添加'
  }
}

function projectAssetTagPickerOption<T extends AssetTagPickerTagLike>(tag: T): AssetTagPickerOption<T> {
  const categoryKey = tag.type || 'custom'
  const usageCount = normalizeUsageCount(tag.usageCount)

  return {
    tag,
    categoryKey,
    categoryLabel: ASSET_TAG_MANAGER_TYPE_LABELS[categoryKey] || categoryKey,
    usageCount,
    usageLabel: `${usageCount}`,
    showUsageCount: usageCount > 0,
    typeBadgeLabel: categoryKey,
    colorDotClass: (tag.color || '').split(' ')[0] || 'bg-slate-400',
    mergeOptionLabel: `${tag.name} (${categoryKey}) - 使用 ${usageCount} 次`
  }
}

export function projectAssetTagManager<T extends AssetTagManagerTagLike>(
  tags: readonly T[],
  input?: {
    search?: string | null
    filterType?: string | null
    sortOrder?: AssetTagManagerSortOrder | null
  }
): AssetTagManagerProjection<T> {
  const search = (input?.search || '').trim().toLowerCase()
  const filterType = input?.filterType || ''
  const sortOrder = input?.sortOrder === 'name' ? 'name' : 'usage'
  const tagsById = new Map(tags.map((tag) => [tag.id, tag]))

  const rows = tags
    .filter((tag) => {
      const aliases = Array.isArray(tag.aliases) ? tag.aliases : []
      const matchSearch = !search ||
        tag.name.toLowerCase().includes(search) ||
        aliases.some((alias) => alias.toLowerCase().includes(search)) ||
        (tag.shorthand || '').toLowerCase().includes(search)
      const matchType = filterType ? tag.type === filterType : true
      return matchSearch && matchType
    })
    .sort((a, b) => {
      if (sortOrder === 'usage') {
        return normalizeUsageCount(b.usageCount) - normalizeUsageCount(a.usageCount) ||
          a.name.localeCompare(b.name)
      }
      return a.name.localeCompare(b.name)
    })
    .map((tag) => {
      const aliases = Array.isArray(tag.aliases) ? tag.aliases.filter(Boolean) : []
      const usageCount = normalizeUsageCount(tag.usageCount)
      const parent = tag.parentId ? tagsById.get(tag.parentId) : undefined

      return {
        tag,
        categoryLabel: projectAssetTagManagerCategoryLabel(tag.type),
        shorthandLabel: tag.shorthand || '-',
        aliasLabels: aliases,
        emptyAliasesLabel: '无',
        parentLabel: tag.isCategory ? '大类(目录)' : parent?.name || '-',
        isCategoryParent: Boolean(tag.isCategory),
        usageLabel: `${usageCount} 次`,
        usageToneClass: usageCount > 0
          ? 'bg-brand-50 text-brand-700 border border-brand-100'
          : 'bg-slate-100 text-slate-400'
      }
    })

  return {
    typeOptions: Object.entries(ASSET_TAG_MANAGER_TYPE_LABELS).map(([value, label]) => ({ value, label })),
    rows,
    emptyLabel: '素材库中暂未匹配到对应的标签词汇'
  }
}

export function projectAssetTaggingComputeBanner(
  input: AssetTaggingComputeBannerInput
): AssetTaggingComputeBannerDisplay {
  const offline = Boolean(input.workerOffline)
  const utilization = normalizeUsageCount(input.gpuUtilizationPercent)
  const queued = normalizeUsageCount(input.queuedTaskCount)

  if (offline) {
    return {
      titleLabel: 'AI 智能打标算力状态',
      statusLabel: '离线 (本地降级)',
      detailLabel: '本地打标服务未开启，暂时无法使用反推。',
      indicatorClass: 'bg-rose-400 animate-ping'
    }
  }

  return {
    titleLabel: 'AI 智能打标算力状态',
    statusLabel: '运行中',
    detailLabel: `GPU: ${input.gpuDeviceName || 'NVIDIA Card'} • 显存利用: ${utilization}% • 任务积压: ${queued} 个`,
    indicatorClass: 'bg-emerald-500 animate-pulse'
  }
}

function projectAssetTagManagerCategoryLabel(type?: string | null): string {
  const label = type ? ASSET_TAG_MANAGER_TYPE_LABELS[type] : undefined
  return label?.split(' ')[0] || type || 'custom'
}

function normalizeUsageCount(value?: number | null): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

const ASSET_TAGGING_MODEL_SELECTION_COPY: Record<AssetTaggingModelId, { name: string; desc: string }> = {
  ram: { name: 'RAM++ 通用标签', desc: '通用图像与多标签泛用推理，建议大多数素材开启。' },
  florence2: { name: 'Florence-2 画面描述 / 设计语义', desc: '图片场景详细描述、设计图语义复判。' },
  wd_tagger: { name: 'WD Tagger 动漫标签', desc: '二次元 / 动漫 / 角色特征提取，仅动漫素材建议开启。' },
  clip: { name: 'CLIP Classifier 设计词典分类', desc: '零样本分类与自定义设计词典匹配。' },
  design_rule: { name: 'DesignRule 设计规则', desc: '排版、版式、比例、来源、设计用途规则辅助。' }
}

export function projectAssetTaggingModelSelectionSections(): AssetTaggingModelSelectionSection[] {
  const sections: AssetTaggingModelSelectionSection[] = [
    {
      code: 'base',
      title: '第一组：基础标签层',
      iconTone: 'purple',
      items: projectModelSelectionItems('base')
    },
    {
      code: 'enhanced',
      title: '第二组：专项增强层',
      iconTone: 'indigo',
      items: projectModelSelectionItems('enhanced')
    }
  ]

  return sections.filter((section) => section.items.length > 0)
}

export function projectAssetTaggingCategoryOptions(): AssetTaggingCategoryOption[] {
  return Object.values(ASSET_TAGGING_CATEGORY_INFO).map((category) => ({
    value: category.category,
    label: category.typeLabel.split(' (')[0]
  }))
}

export function toggleAssetTaggingModelSelection(
  selectedModels: readonly AssetTaggingModelId[],
  model: AssetTaggingModelId
): AssetTaggingModelId[] {
  return selectedModels.includes(model)
    ? selectedModels.filter((selectedModel) => selectedModel !== model)
    : [...selectedModels, model]
}

export function projectAssetTaggingPanelDisplay(
  input: AssetTaggingPanelDisplayInput
): AssetTaggingPanelDisplay {
  const selectedModels = normalizeAssetTaggingModelIds(input.selectedModels)
  const isScanning = input.scanState !== 'idle'
  const progressLabel = projectAssetTaggingProgressLabel(
    input.scanState,
    input.category,
    selectedModels
  )

  return {
    isScanning,
    submitDisabled: isScanning || selectedModels.length === 0,
    submitLabel: isScanning ? '分析中...' : 'AI 智能打标',
    progressLabel,
    progressComplete: input.scanState === 'completed',
    emptySuggestionLabel: '该素材暂无 AI 智能标签建议。点击上方“AI 智能打标”生成推荐标签。'
  }
}

function projectAssetTaggingProgressLabel(
  scanState: AssetTaggingScanState,
  category?: string | null,
  selectedModels: readonly AssetTaggingModelId[] = []
): string {
  switch (scanState) {
    case 'routing':
      return '正在提交真实 AI Worker 打标任务...'
    case 'classified':
      return `已识别/锁定类型: ${createAssetTaggingPlan(category).categoryInfo.typeLabel}`
    case 'tagging': {
      const modelNames = selectedModels.map((model) => ASSET_TAGGING_MODEL_OPTIONS[model].name)
      return `正在等待真实模型返回：[${modelNames.join(', ')}]`
    }
    case 'completed':
      return '真实 AI 标签建议已完成。'
    case 'idle':
      return ''
  }
}

function projectModelSelectionItems(layer: AssetTaggingModelLayer): AssetTaggingModelSelectionItem[] {
  return Object.values(ASSET_TAGGING_MODEL_OPTIONS)
    .filter((model) => model.layer === layer)
    .map((model) => ({
      id: model.id,
      ...ASSET_TAGGING_MODEL_SELECTION_COPY[model.id]
    }))
}

export function normalizeAssetTaggingCategory(value?: string | null): AssetTaggingCategory {
  return value && value in ASSET_TAGGING_CATEGORY_INFO ? value as AssetTaggingCategory : 'unknown'
}

export function createAssetTaggingPlan(categoryInput?: string | null): AssetTaggingPlan {
  const category = normalizeAssetTaggingCategory(categoryInput)
  const modelsToRun = ASSET_TAGGING_CATEGORY_PIPELINES[category]
  return {
    category,
    categoryInfo: ASSET_TAGGING_CATEGORY_INFO[category],
    modelsToRun,
    modelOptions: Object.values(ASSET_TAGGING_MODEL_OPTIONS)
  }
}

export function normalizeAssetTaggingModelIds(values?: readonly string[] | null): AssetTaggingModelId[] {
  if (!values) return []

  const seen = new Set<AssetTaggingModelId>()
  for (const value of values) {
    if (value in ASSET_TAGGING_MODEL_OPTIONS) {
      seen.add(value as AssetTaggingModelId)
    }
  }
  return Array.from(seen)
}

export function createAssetTaggingTaskSubmission(input?: {
  category?: string | null
  modelsToRun?: readonly string[] | null
}): AssetTaggingTaskSubmission {
  const customModels = normalizeAssetTaggingModelIds(input?.modelsToRun)
  const modelsToRun = customModels.length > 0
    ? customModels
    : createAssetTaggingPlan(input?.category).modelsToRun

  return {
    modelsToRun,
    modelName: modelsToRun.length > 0 ? `custom_pipeline:${modelsToRun.join(',')}` : 'WD-Tagger-v3'
  }
}

export function projectPendingAssetTagSuggestions<T extends AssetTaggingPendingSuggestionLike>(relations: readonly T[]): T[] {
  const seen = new Set<string>()
  return relations.filter((relation) => {
    if (relation.status !== 'pending') return false

    const normalizedName = relation.tag_name?.toLowerCase().trim()
    if (!normalizedName || seen.has(normalizedName)) return false

    seen.add(normalizedName)
    return true
  })
}

export function projectAssetTaggingSuggestionReviewItems(
  relations: readonly AssetTaggingPendingSuggestionLike[]
): AssetTaggingSuggestionReviewItem[] {
  return projectPendingAssetTagSuggestions(relations).map((relation) => {
    const confidence = typeof relation.confidence === 'number' && Number.isFinite(relation.confidence)
      ? relation.confidence
      : 0
    const confidencePercent = Math.max(0, Math.min(100, Math.round(confidence * 100)))

    return {
      id: relation.id,
      tagName: relation.tag_name?.trim() || '',
      confidencePercent,
      confidenceLabel: `${confidencePercent}%`,
      confirmAction: { code: 'confirm_ai_tag', label: '确认采纳此标签' },
      rejectAction: { code: 'reject_ai_tag', label: '拒绝此标签' }
    }
  })
}

export function projectAssetTaggingConfirmedTags(
  relations: readonly AssetTaggingPendingSuggestionLike[]
): AssetTaggingConfirmedTagProjection {
  const seen = new Set<string>()
  const items: AssetTaggingConfirmedTagItem[] = []

  for (const relation of relations) {
    if (relation.status !== 'confirmed') continue
    if (!relation.tag_id || !relation.tag_name) continue
    if (seen.has(relation.tag_id)) continue

    seen.add(relation.tag_id)
    const tagName = relation.tag_name.trim()
    if (!tagName) continue

    items.push({
      relationId: relation.id,
      tagId: relation.tag_id,
      tagName,
      tagType: relation.tag_type || 'custom',
      tagColor: relation.tag_color || undefined,
      source: relation.source || 'manual',
      confidence: typeof relation.confidence === 'number' && Number.isFinite(relation.confidence)
        ? relation.confidence
        : 1,
      status: 'confirmed',
      modelName: relation.model_name || undefined,
      searchQuery: `tag:${tagName}`
    })
  }

  return {
    items,
    activeTagNames: items.map((item) => item.tagName),
    emptyLabel: '暂无已确认标签，请在下方添加或开启 AI 特征反推。'
  }
}

export function projectAssetTagChipDisplay(input: AssetTagChipDisplayInput): AssetTagChipDisplay {
  const status = (input.status || 'confirmed').trim().toLowerCase()
  const source = input.source || 'manual'
  const confidence = typeof input.confidence === 'number' && Number.isFinite(input.confidence)
    ? input.confidence
    : 1
  const confidencePercent = Math.max(0, Math.min(100, Math.round(confidence * 100)))
  const isPending = status === 'pending'
  const isAi = source.startsWith('ai_') || source === 'ai'

  return {
    hidden: status === 'rejected',
    isAi,
    isPending,
    sourceLabel: projectAssetTagSourceLabel(source),
    confidencePercent,
    confidenceLabel: `${confidencePercent}%`,
    statusLabel: isPending ? '待确认' : '已确认',
    statusToneClass: isPending ? 'text-amber-400 animate-pulse' : 'text-emerald-400',
    iconToneClass: isPending ? 'text-purple-400' : 'text-purple-600 animate-pulse',
    opacityClass: confidence < 0.6 && isPending ? 'opacity-60' : 'opacity-100',
    modelName: input.modelName || undefined
  }
}

function projectAssetTagSourceLabel(source: string): string {
  if (source === 'manual') return '用户手动'
  if (source === 'ai_wd_tagger') return 'WD Tagger AI'
  if (source === 'ai_florence') return 'Florence-2 AI'
  if (source === 'ai_joycaption') return 'JoyCaption AI'
  if (source === 'ai_qwen_vl') return 'Qwen2.5-VL AI'
  if (source === 'filename') return '文件名解析'
  if (source === 'website') return '网页抓取'
  return source
}

export interface AssetTagPresetColor {
  label: string
  value: string
}

export interface AssetTagTypeOption {
  label: string
  value: string
  colorClass: string
}

export const ASSET_TAG_PRESET_COLORS: readonly AssetTagPresetColor[] = [
  { label: '靛蓝 (Style)', value: 'bg-indigo-50 text-indigo-700 border border-indigo-200' },
  { label: '薄荷 (Color)', value: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  { label: '海蓝 (Usage)', value: 'bg-blue-50 text-blue-700 border border-blue-200' },
  { label: '琥珀 (Layout)', value: 'bg-amber-50 text-amber-700 border border-amber-200' },
  { label: '玫瑰 (Scene)', value: 'bg-rose-50 text-rose-700 border border-rose-200' },
  { label: '石板 (Source)', value: 'bg-slate-100 text-slate-700 border border-slate-200' },
  { label: '丁香 (AI)', value: 'bg-purple-50 text-purple-700 border border-purple-200' },
  { label: '粉红 (Custom)', value: 'bg-pink-50 text-pink-700 border border-pink-200' }
]

export const DEFAULT_ASSET_TAG_COLOR_CLASS = ASSET_TAG_PRESET_COLORS[0].value
export const CUSTOM_ASSET_TAG_COLOR_CLASS = ASSET_TAG_PRESET_COLORS[7].value

export const ASSET_TAG_TYPES: readonly AssetTagTypeOption[] = [
  { label: '风格 (Style)', value: 'style', colorClass: ASSET_TAG_PRESET_COLORS[0].value },
  { label: '色彩 (Color)', value: 'color', colorClass: ASSET_TAG_PRESET_COLORS[1].value },
  { label: '用途 (Usage)', value: 'usage', colorClass: ASSET_TAG_PRESET_COLORS[2].value },
  { label: '版式 (Layout)', value: 'layout', colorClass: ASSET_TAG_PRESET_COLORS[3].value },
  { label: '场景 (Scene)', value: 'scene', colorClass: ASSET_TAG_PRESET_COLORS[4].value },
  { label: '来源 (Source)', value: 'source', colorClass: ASSET_TAG_PRESET_COLORS[5].value },
  { label: 'AI (AI Generated)', value: 'ai', colorClass: ASSET_TAG_PRESET_COLORS[6].value },
  { label: '自定义 (Custom)', value: 'custom', colorClass: CUSTOM_ASSET_TAG_COLOR_CLASS }
]

export function getAssetTagColorClass(type: string): string {
  return ASSET_TAG_TYPES.find((item) => item.value === type)?.colorClass || CUSTOM_ASSET_TAG_COLOR_CLASS
}
