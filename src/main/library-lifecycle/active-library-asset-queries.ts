import {readCurrentTagSummaries} from '../independent-tags/tag-execution-storage'
import { isKnownLibrarySchemaVersion } from './library-schema-version'
import {summaryFromOcrRow} from '../ocr/ocr-storage'
import type {VisualAiEvidence, VisualAiSummary} from '../../shared/contracts/visual-ai.contract'
import type Database from 'better-sqlite3'
import { ActiveLibraryHostError, type ActiveLibraryAssetProjection, type ActiveLibraryAssetContext } from '../../shared/contracts/active-library.contract'

/** Main-only projection queries on the caller's held connection. No filesystem or global DB access. Selected results are keyed by id, not input order. */
export function readAssetContext(database: Database.Database, ids: readonly string[]): ActiveLibraryAssetContext {
  if (!Array.isArray(ids) || ids.length > 500 || ids.some(id => typeof id !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:~-]{0,255}$/.test(id))) throw new ActiveLibraryHostError('library-operation-failed', '素材选择无效。')
  const schemaVersion = Number(database.pragma('user_version', { simple: true }))
  if (!isKnownLibrarySchemaVersion(schemaVersion)) throw new ActiveLibraryHostError('library-schema-invalid', '素材库结构不可用。')
  return { schemaVersion, assets: readAssets(database, [...new Set(ids)]) }
}

export function readAssets(database: Database.Database, ids?: readonly string[]): readonly ActiveLibraryAssetProjection[] {
  if (ids && ids.length === 0) return []
  const selected = ids ? `AND a.id IN (${ids.map(() => '?').join(',')})` : ''
  const evidenceProjection = isKnownLibrarySchemaVersion(Number(database.pragma('user_version', { simple: true })),2)
    ? "(SELECT e.evidence_json FROM visual_ai_evidence e WHERE e.asset_id=a.id AND e.asset_revision=l.revision AND e.preview_generation=c.grid_thumbnail_ref ORDER BY e.created_at DESC,e.id DESC LIMIT 1)"
    : "NULL"
  const rows = database.prepare(`
    SELECT a.id, a.title, a.file_name AS fileName, a.source_site_id AS sourceSiteId,
      a.source_site_name AS sourceSiteName, a.width, a.height, a.file_size AS fileSize,
      a.file_type AS fileType, c.grid_thumbnail_ref AS thumbnailRef, a.created_at AS createdAt,
      l.revision,
      COALESCE(a.ai_caption, '') AS aiCaption, COALESCE(a.ai_caption_is_user_edited, 0) AS aiCaptionIsUserEdited,
      ${evidenceProjection} AS visualEvidence
    FROM assets a
    JOIN asset_lifecycle l ON l.design_asset_identity = a.id AND l.lifecycle_state = 'active'
    JOIN promotion_links p ON p.design_asset_identity = a.id
    JOIN asset_candidates c ON c.candidate_identity = p.candidate_identity
    WHERE 1=1 ${selected}
    ORDER BY a.created_at DESC
  `).all(...(ids ?? [])) as Array<Record<string, unknown>>
  if (rows.length === 0) return []
  const tagRows = database.prepare(`SELECT at.asset_id AS assetId, t.name, t.aliases FROM asset_tags at
    JOIN tags t ON t.id = at.tag_id JOIN assets a ON a.id=at.asset_id
    JOIN asset_lifecycle l ON l.design_asset_identity=a.id AND l.lifecycle_state='active'
    WHERE at.status = 'confirmed' ${selected} ORDER BY at.asset_id, at.tag_id`).all(...(ids ?? [])) as Array<{ assetId: string; name: string; aliases: string }>
  const tagsByAsset = new Map<string, string[]>()
  for (const tag of tagRows) tagsByAsset.set(tag.assetId, [...(tagsByAsset.get(tag.assetId) ?? []), tag.name])
  const aliasesByAsset = new Map<string, string[]>()
  for (const tag of tagRows) aliasesByAsset.set(tag.assetId, [...(aliasesByAsset.get(tag.assetId) ?? []), ...JSON.parse(tag.aliases || '[]') as string[]])
  const suggestions = database.prepare(`SELECT s.asset_id AS assetId,s.tag_name AS name,s.status,s.raw_payload AS payload
    FROM tag_suggestions s JOIN assets a ON a.id=s.asset_id
    JOIN asset_lifecycle l ON l.design_asset_identity=a.id AND l.lifecycle_state='active'
    WHERE s.source='visual-ai' ${selected}`).all(...(ids ?? [])) as Array<{assetId:string;name:string;status:string;payload:string}>
  const decisions = new Map<string,string>()
  for (const suggestion of suggestions) {
    try { decisions.set(JSON.stringify([suggestion.assetId,JSON.parse(suggestion.payload).evidenceId,suggestion.name]),suggestion.status) } catch { /* Older unrelated suggestions do not belong to current evidence. */ }
  }
  const summarize = (row:Record<string,unknown>):VisualAiSummary|undefined => {
    if (typeof row.visualEvidence !== 'string') return undefined
    try {
      const e = JSON.parse(row.visualEvidence) as VisualAiEvidence
      if (!e?.id || !e.output || !Array.isArray(e.output.tags) || !['caption','prompt','ocrText'].every(key => typeof e.output[key as keyof typeof e.output] === 'string')) return undefined
      const confirmed = new Set((tagsByAsset.get(String(row.id)) ?? []).map(t=>t.normalize('NFKC').toLowerCase()))
      const tags = [...new Set(e.output.tags.filter(t=>typeof t==='string'&&t.trim()&&decisions.get(JSON.stringify([row.id,e.id,t]))!=='rejected'))]
      return {evidenceId:e.id,model:e.model,createdAt:e.createdAt,caption:e.output.caption,prompt:e.output.prompt,ocrText:e.output.ocrText,tags,
        pendingTags:tags.filter(t=>!confirmed.has(t.normalize('NFKC').toLowerCase()))}
    } catch { return undefined }
  }
  const ocrRows=isKnownLibrarySchemaVersion(Number(database.pragma('user_version',{simple:true})),8) ? database.prepare(`SELECT s.*,e.asset_revision,e.source_ref,e.input_sha256,e.observation_json,e.created_at
    FROM asset_ocr_state s JOIN asset_ocr_evidence e ON e.id=s.evidence_id JOIN assets a ON a.id=s.asset_id
    JOIN asset_lifecycle l ON l.design_asset_identity=a.id AND l.lifecycle_state='active'
    JOIN promotion_links p ON p.design_asset_identity=a.id JOIN asset_candidates c ON c.candidate_identity=p.candidate_identity AND c.grid_thumbnail_ref=e.source_ref
    WHERE 1=1 ${selected}`).all(...(ids??[])) as Array<Parameters<typeof summaryFromOcrRow>[0]&{asset_id:string}> : []
  const ocrById=new Map(ocrRows.map(r=>[r.asset_id,summaryFromOcrRow(r)]))
  const tagMode=isKnownLibrarySchemaVersion(Number(database.pragma('user_version',{simple:true})),10)
  const currentTags=tagMode?readCurrentTagSummaries({database},ids):new Map()
  return rows.map((row) => {
    const visualAi=summarize(row),ocr=ocrById.get(String(row.id))
    return ({
    id: String(row.id), revision: String(row.revision), title: String(row.title), fileName: String(row.fileName),
    sourceSiteId: String(row.sourceSiteId), sourceSiteName: String(row.sourceSiteName),
    width: typeof row.width === 'number' ? row.width : null, height: typeof row.height === 'number' ? row.height : null,
    fileSize: typeof row.fileSize === 'number' ? row.fileSize : null, fileType: typeof row.fileType === 'string' ? row.fileType : null,
    thumbnailRef: String(row.thumbnailRef), tags: [...new Set(tagsByAsset.get(String(row.id)) ?? [])], tagAliases: [...new Set(aliasesByAsset.get(String(row.id)) ?? [])], createdAt: String(row.createdAt),
    aiCaption: String(row.aiCaption), aiCaptionIsUserEdited: row.aiCaptionIsUserEdited === 1, aiOcrText: ocr?.text ?? visualAi?.ocrText ?? '', ...(ocr?{ocr}:{}), ...(visualAi ? {visualAi} : {}),...(tagMode?{tagAnalysis:currentTags.get(String(row.id))??null}:{})
  })})
}
