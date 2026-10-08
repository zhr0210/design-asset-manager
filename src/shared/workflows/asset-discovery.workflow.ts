import {currentTagSuggestions} from './ai-folders.workflow'
import type {AssetSearchField} from '../contracts/asset-search.contract'
export type AssetDiscoveryMode = 'lexical-only'

export type AssetDiscoveryEvidenceKind =
  | 'title'
  | 'filename'
  | 'tag'
  | 'description'
  | 'ocr'
  | 'prompt'
  | 'ai-tag'
  | 'semantic'
  | 'image-example'
  | 'color'

export type AssetDiscoveryEvidenceMatch = 'exact' | 'phrase' | 'term' | 'vector' | 'measured'

export interface AssetDiscoveryAssetLike {
  id: string
  title?: string | null
  fileName?: string | null
  tags?: readonly string[] | null
  tagAliases?: readonly string[] | null
  tagAnalysis?:import('../contracts/tag-execution.contract').TagCurrentSummary|null
  visualAi?: import('../contracts/visual-ai.contract').VisualAiSummary
  aiPrompt?: string | null
  aiCaption?: string | null
  aiCaptionIsUserEdited?:boolean|number
  aiCaptionSource?:string
  aiOcrText?: string | null
  sourceSiteId?: string | null
}

export interface AssetDiscoveryRequest<T extends AssetDiscoveryAssetLike> {
  assets: readonly T[]
  query?: string | null
  sourceSiteId?: string | null
  tagScope?: 'confirmed-only' | 'includes-pending'
  tagQueries?: readonly string[] | null
  fields?:readonly AssetSearchField[]
}

export interface AssetDiscoveryEvidence {
  kind: AssetDiscoveryEvidenceKind
  match: AssetDiscoveryEvidenceMatch
  label: string
}

export interface AssetDiscoveryExplanation {
  lane: 'lexical' | 'semantic' | 'hybrid'
  evidence: readonly AssetDiscoveryEvidence[]
  similarity?:number
  spaceId?:string
}

export interface AssetDiscoveryMatch<T extends AssetDiscoveryAssetLike> {
  asset: T
  explanation: AssetDiscoveryExplanation | null
}

export interface AssetDiscoveryProjection<T extends AssetDiscoveryAssetLike> {
  mode: AssetDiscoveryMode
  state: 'all-assets' | 'matched' | 'no-matches'
  matches: readonly AssetDiscoveryMatch<T>[]
}

interface LexicalField {
  scope:AssetSearchField
  kind: AssetDiscoveryEvidenceKind
  label: string
  value: string
  priority: number
}

interface RankedEvidence {
  evidence: AssetDiscoveryEvidence
  rank: number
}

interface RankedMatch<T extends AssetDiscoveryAssetLike> {
  match: AssetDiscoveryMatch<T>
  rank: number
  sourceOrder: number
}

const MAX_EVIDENCE_PREVIEW_LENGTH = 72

export function projectAssetDiscovery<T extends AssetDiscoveryAssetLike>(
  request: AssetDiscoveryRequest<T>
): AssetDiscoveryProjection<T> {
  const query = normalizeText(request.query)
  const constrainedAssets = request.assets.filter((asset) =>
    (!request.sourceSiteId || asset.sourceSiteId === request.sourceSiteId) &&
    matchesTagQueries(asset, request.tagQueries, request.tagScope ?? 'confirmed-only')
  )

  if (!query) {
    return {
      mode: 'lexical-only',
      state: 'all-assets',
      matches: constrainedAssets.map((asset) => ({
        asset,
        explanation: null
      }))
    }
  }

  const terms = tokenizeQuery(query)
  if (!terms.length) return {mode:'lexical-only',state:'no-matches',matches:[]}
  const matches = constrainedAssets
    .map((asset, sourceOrder) => createRankedMatch(
      asset,
      sourceOrder,
      query,
      terms,
      request.tagScope ?? 'confirmed-only',request.fields
    ))
    .filter((candidate): candidate is RankedMatch<T> => candidate !== null)
    .sort((left, right) => {
      if (left.rank !== right.rank) return right.rank - left.rank
      return left.sourceOrder - right.sourceOrder
    })
    .map((candidate) => candidate.match)

  return {
    mode: 'lexical-only',
    state: matches.length > 0 ? 'matched' : 'no-matches',
    matches
  }
}

function matchesTagQueries(asset: AssetDiscoveryAssetLike, queries: readonly string[] | null | undefined, scope: 'confirmed-only'|'includes-pending'): boolean {
  return (queries ?? []).every((query) => {
    const normalized = normalizeText(query)
    if (normalized === 'special:untagged') return (asset.tags ?? []).length === 0
    if (normalized === 'special:ai_pending') return Boolean(currentTagSuggestions(asset)?.pendingTags.length)
    if (!normalized.startsWith('tag:')) return true
    const expected = normalized.slice(4).trim()
    return [...(asset.tags ?? []), ...(asset.tagAliases ?? []), ...(scope==='includes-pending'?currentTagSuggestions(asset)?.pendingTags??[]:[])].some((tag) => normalizeText(tag) === expected)
  })
}

function createRankedMatch<T extends AssetDiscoveryAssetLike>(
  asset: T,
  sourceOrder: number,
  query: string,
  terms: readonly string[],
  tagScope: 'confirmed-only' | 'includes-pending',scopes?:readonly AssetSearchField[]
): RankedMatch<T> | null {
  const fields = createLexicalFields(asset, tagScope,scopes)
  const termEvidence = terms.map((term) => (
    fields
      .filter((field) => normalizeText(field.value).includes(term))
      .map((field) => rankEvidence(field, term, query))
      .sort((left, right) => right.rank - left.rank)
  ))

  if (termEvidence.some((items) => items.length === 0)) return null

  const allEvidence = [
    ...termEvidence.flat(),
    ...fields
      .filter((field) => normalizeText(field.value).includes(query))
      .map((field) => rankEvidence(field, query, query))
  ].sort((left, right) => right.rank - left.rank)

  const evidence = deduplicateEvidence(allEvidence).slice(0, 3)
  const coverageRank = termEvidence.reduce((sum, items) => sum + items[0].rank, 0)
  const phraseRank = fields.reduce((best, field) => {
    const normalized = normalizeText(field.value)
    if (!normalized.includes(query)) return best
    return Math.max(best, rankEvidence(field, query, query).rank)
  }, 0)

  return {
    match: {
      asset,
      explanation: {
        lane: 'lexical',
        evidence
      }
    },
    rank: coverageRank + phraseRank,
    sourceOrder
  }
}

function createLexicalFields(
  asset: AssetDiscoveryAssetLike,
  tagScope: 'confirmed-only' | 'includes-pending',scopes?:readonly AssetSearchField[]
): LexicalField[] {
  const fields: LexicalField[] = [
    { scope:'name',kind: 'title', label: '标题', value: asset.title || '', priority: 500 },
    { scope:'name',kind: 'filename', label: '文件名', value: asset.fileName || '', priority: 450 },
    {
      kind: 'description',
      scope:'description',label: asset.aiCaptionIsUserEdited?'人工描述':asset.aiCaptionSource?'AI 画面描述':'描述',
      value: asset.aiCaption || '',
      priority: 250
    },
    { scope:'ocr',kind: 'ocr', label: 'OCR', value: asset.aiOcrText || '', priority: 200 },
    { scope:'prompt',kind: 'prompt', label: '反推提示词', value: asset.aiPrompt || asset.visualAi?.prompt || '', priority: 180 }
  ]

  for (const tag of asset.tags ?? []) {
    fields.push({
      kind: 'tag',
      scope:'tags',
      label: '标签',
      value: tag,
      priority: 400
    })
  }

  if (tagScope === 'includes-pending') for (const tag of currentTagSuggestions(asset)?.pendingTags ?? []) fields.push({scope:'ai-tags',kind:'ai-tag',label:'AI 建议标签',value:tag,priority:320})
  if (!asset.aiCaptionIsUserEdited&&(!asset.aiCaption||!asset.aiCaptionSource)&&asset.visualAi?.caption&&asset.visualAi.caption!==asset.aiCaption) fields.push({scope:'description',kind:'description',label:'AI 画面描述',value:asset.visualAi.caption,priority:240})
  for (const alias of asset.tagAliases ?? []) fields.push({ scope:'tags',kind: 'tag', label: '标签别名', value: alias, priority: 390 })
  return fields.filter((field) => normalizeText(field.value)&&(!scopes||scopes.includes(field.scope)))
}

/** Shared semantic field policy for Host indexing and renderer explanations. */
export function assetDiscoverySearchText(asset: AssetDiscoveryAssetLike, scope: 'confirmed-only' | 'includes-pending'): string {
  return createLexicalFields(asset, scope).map(field => normalizeText(field.value)).join('\n')
}
export function assetDiscoveryRank(asset: AssetDiscoveryAssetLike, query: string, scope: 'confirmed-only' | 'includes-pending',fields?:readonly AssetSearchField[]): number {
  const normalized = normalizeText(query)
  return normalized ? createRankedMatch(asset, 0, normalized, tokenizeQuery(normalized), scope,fields)?.rank ?? 0 : 0
}

/** Refresh metadata in a frozen result without inventing a new vector rank or
 * colour measurement. Callers must first verify the same content/view and
 * current Library/folder authority; all textual hard conditions are current. */
export function refreshAssetDiscoveryMatch<T extends AssetDiscoveryAssetLike>(previous:AssetDiscoveryMatch<T>,asset:T,
 request:Omit<AssetDiscoveryRequest<T>,'assets'>):AssetDiscoveryMatch<T>|null{
 if(!projectAssetDiscovery({...request,assets:[asset],query:''}).matches.length)return null
 const lexical=projectAssetDiscovery({...request,assets:[asset]}).matches[0]
 const retained=previous.explanation?.evidence.filter(e=>['color','semantic','image-example'].includes(e.kind))??[]
 const vector=retained.some(e=>e.match==='vector')
 if(!vector&&!lexical)return null
 if(!retained.length)return{asset,explanation:lexical?.explanation??null}
 return{asset,explanation:{...previous.explanation!,lane:vector?(previous.explanation?.lane==='hybrid'&&lexical?.explanation?'hybrid':'semantic'):'lexical',
   evidence:[...retained,...(lexical?.explanation?.evidence??[])]}}
}

function rankEvidence(field: LexicalField, matchedTerm: string, fullQuery: string): RankedEvidence {
  const normalized = normalizeText(field.value)
  const match: AssetDiscoveryEvidenceMatch = normalized === fullQuery
    ? 'exact'
    : normalized.includes(fullQuery)
      ? 'phrase'
      : 'term'
  const matchRank = normalized === matchedTerm ? 30 : normalized.startsWith(matchedTerm) ? 20 : 10

  return {
    evidence: {
      kind: field.kind,
      match,
      label: `${field.label}：${createBoundedExcerpt(field.value, matchedTerm)}`
    },
    rank: field.priority * 100 + matchRank
  }
}

function createBoundedExcerpt(value: string, matchedTerm: string): string {
  const text = value.trim().replace(/\s+/gu, ' ')
  if (text.length <= MAX_EVIDENCE_PREVIEW_LENGTH) return text

  const normalizedText = normalizeText(text)
  const normalizedTerm = normalizeText(matchedTerm)
  const matchStart = normalizedText.indexOf(normalizedTerm)
  if (matchStart < 0) {
    return `${text.slice(0, MAX_EVIDENCE_PREVIEW_LENGTH - 1)}…`
  }

  const contextLength = Math.max(
    8,
    Math.floor((MAX_EVIDENCE_PREVIEW_LENGTH - normalizedTerm.length - 2) / 2)
  )
  const sliceStart = Math.max(0, matchStart - contextLength)
  const sliceEnd = Math.min(text.length, matchStart + normalizedTerm.length + contextLength)
  const prefix = sliceStart > 0 ? '…' : ''
  const suffix = sliceEnd < text.length ? '…' : ''
  const excerpt = `${prefix}${text.slice(sliceStart, sliceEnd)}${suffix}`

  return excerpt.length <= MAX_EVIDENCE_PREVIEW_LENGTH
    ? excerpt
    : `${excerpt.slice(0, MAX_EVIDENCE_PREVIEW_LENGTH - 1)}…`
}

function deduplicateEvidence(items: readonly RankedEvidence[]): AssetDiscoveryEvidence[] {
  const seen = new Set<string>()
  const evidence: AssetDiscoveryEvidence[] = []

  for (const item of items) {
    const key = `${item.evidence.kind}:${item.evidence.label}`
    if (seen.has(key)) continue
    seen.add(key)
    evidence.push(item.evidence)
  }

  return evidence
}

function normalizeText(value?: string | null): string {
  return typeof value === 'string'
    ? value.normalize('NFKC').trim().replace(/\s+/gu, ' ').toLowerCase()
    : ''
}

function tokenizeQuery(query: string): string[] {
  return Array.from(new Set(
    query
      .split(/[\s,，。！？!?；;：:、]+/u)
      .map((term) => term.trim())
      .filter(Boolean)
  ))
}
