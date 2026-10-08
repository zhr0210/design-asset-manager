import { isKnownLibrarySchemaVersion } from '../library-lifecycle/library-schema-version'
import type Database from 'better-sqlite3'
import { randomUUID } from 'node:crypto'
import type { VisualAiEvidence } from '../../shared/contracts/visual-ai.contract'
import { VISUAL_AI_TABLE_SQL, VISUAL_AI_INDEX_SQL } from './visual-ai.schema'

/** Additive v2 storage, only enabled by an explicitly confirmed AI action under the Library lease. */
export function enableVisualAiStorage(db: Database.Database): void {
  const version = db.pragma('user_version', { simple: true })
  if (isKnownLibrarySchemaVersion(version, 2)) return
  if (version !== 1) throw new Error('AI_STORAGE_VERSION_UNSUPPORTED')
  db.transaction(() => {
    db.exec(`${VISUAL_AI_TABLE_SQL};${VISUAL_AI_INDEX_SQL};PRAGMA user_version = 2;`)
  })()
}

export function readVisualAiEvidence(db: Database.Database, assetId: string): VisualAiEvidence[] {
  if (!isKnownLibrarySchemaVersion(Number(db.pragma('user_version', { simple: true })), 2)) return []
  const rows = db.prepare(`SELECT e.evidence_json FROM visual_ai_evidence e
    JOIN asset_lifecycle l ON l.design_asset_identity=e.asset_id AND l.revision=e.asset_revision AND l.lifecycle_state='active'
    JOIN promotion_links p ON p.design_asset_identity=l.design_asset_identity
    JOIN asset_candidates c ON c.candidate_identity=p.candidate_identity AND c.grid_thumbnail_ref=e.preview_generation
    WHERE e.asset_id=? ORDER BY e.created_at DESC, e.id DESC LIMIT 20`).all(assetId) as Array<{ evidence_json: string }>
  return rows.map(row => JSON.parse(row.evidence_json) as VisualAiEvidence)
}

export function commitVisualAiEvidence(db: Database.Database, evidence: VisualAiEvidence, singleWriterHistoryOnly = false): void {
  if (!isKnownLibrarySchemaVersion(Number(db.pragma('user_version', { simple: true })), 2)) throw new Error('AI_STORAGE_NOT_ENABLED')
  if (Number(db.pragma('user_version',{simple:true}))>=10 && !singleWriterHistoryOnly) throw new Error('AI_SINGLE_WRITER_REQUIRED')
  db.transaction(() => {
    const active = db.prepare(`SELECT l.revision, c.grid_thumbnail_ref AS preview FROM asset_lifecycle l
      JOIN promotion_links p ON p.design_asset_identity=l.design_asset_identity
      JOIN asset_candidates c ON c.candidate_identity=p.candidate_identity
      WHERE l.design_asset_identity=? AND l.lifecycle_state='active'`).get(evidence.assetId) as { revision: string; preview: string } | undefined
    if (!active || active.revision !== evidence.assetRevision || active.preview !== evidence.previewGeneration) throw new Error('AI_SOURCE_CHANGED')
    const inserted = db.prepare('INSERT OR IGNORE INTO visual_ai_evidence VALUES (?, ?, ?, ?, ?, ?)').run(evidence.id, evidence.assetId, evidence.assetRevision, evidence.previewGeneration, JSON.stringify(evidence), evidence.createdAt)
    if (!inserted.changes) return
    if (evidence.output.caption && Number(db.pragma('user_version',{simple:true}))<14) db.prepare(`UPDATE assets SET ai_caption=?, ai_caption_updated_at=? WHERE id=? AND ai_caption_is_user_edited=0`).run(evidence.output.caption, evidence.createdAt, evidence.assetId)
    if (!singleWriterHistoryOnly) for (const [index, tag] of evidence.output.tags.entries()) db.prepare(`INSERT INTO tag_suggestions
      (id,asset_id,tag_name,tag_type,source,confidence,status,model_name,raw_payload,created_at,updated_at)
      VALUES (?,?,?,'custom','visual-ai',NULL,'pending',?,?,?,?)`).run(`${evidence.id}:${index}`, evidence.assetId, tag, evidence.model, JSON.stringify({ evidenceId: evidence.id }), evidence.createdAt, evidence.createdAt)
  })()
}

export function confirmVisualAiTag(db: Database.Database, assetId: string, evidenceId: string, label: string): void {
  const evidence = readVisualAiEvidence(db, assetId).find(item => item.id === evidenceId)
  if (!evidence || !evidence.output.tags.includes(label)) throw new Error('AI_SUGGESTION_UNAVAILABLE')
  db.transaction(() => {
    const now = new Date().toISOString()
    const existing = db.prepare("SELECT id FROM tags WHERE normalized_name=? AND type='custom'").get(label.toLocaleLowerCase()) as { id: string } | undefined
    const id = existing?.id ?? `tag:${randomUUID()}`
    if (!existing) db.prepare(`INSERT INTO tags (id,name,normalized_name,slug,type,description,aliases,is_category,is_system,usage_count,created_at,updated_at)
      VALUES (?,?,?,?,'custom','','[]',0,0,0,?,?)`).run(id, label, label.toLocaleLowerCase(), id, now, now)
    db.prepare(`INSERT OR IGNORE INTO asset_tags (id,asset_id,tag_id,source,confidence,status,model_name,raw_value,created_by,created_at,updated_at)
      VALUES (?,?,?,'manual',1,'confirmed',?,?,'user',?,?)`).run(`${assetId}_${id}_manual`, assetId, id, evidence.model, JSON.stringify({ evidenceId }), now, now)
    db.prepare("UPDATE tag_suggestions SET status='confirmed',updated_at=? WHERE asset_id=? AND tag_name=? AND raw_payload=?").run(now, assetId, label, JSON.stringify({ evidenceId }))
    db.prepare("UPDATE tags SET usage_count=(SELECT COUNT(*) FROM asset_tags WHERE tag_id=? AND status='confirmed') WHERE id=?").run(id, id)
  })()
}
