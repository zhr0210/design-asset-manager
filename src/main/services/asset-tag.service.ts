import { getDatabase } from '../db'
import { TagService } from './tag.service'

export interface AssetTagOptions {
  source?: string
  confidence?: number
  status?: string
  modelName?: string
  modelVersion?: string
  rawValue?: string
  createdBy?: string
}

export interface DbAssetTagRelation {
  id: string
  asset_id: string
  tag_id: string
  source: string
  confidence: number
  status: string
  model_name: string | null
  model_version: string | null
  raw_value: string | null
  created_by: string
  created_at: string
  updated_at: string
  // Extra tag properties joined
  tag_name?: string
  tag_type?: string
  tag_color?: string
}

export class AssetTagService {
  private getDb() {
    return getDatabase()
  }

  private getTagService() {
    return new TagService()
  }

  public addTagToAsset(assetId: string, tagId: string, options?: AssetTagOptions): DbAssetTagRelation {
    const db = this.getDb()
    const now = new Date().toISOString()
    const source = options?.source || 'manual'
    const confidence = options?.confidence !== undefined ? options.confidence : 1.0
    const status = options?.status || 'confirmed'
    const id = `${assetId}_${tagId}_${source}`

    db.transaction(() => {
      // Check duplicate/exist check
      const existing = db.prepare('SELECT status FROM asset_tags WHERE asset_id = ? AND tag_id = ? AND source = ?').get(assetId, tagId, source) as { status: string } | undefined
      
      if (existing) {
        if (existing.status === 'confirmed' && status === 'pending') {
          // Prevent overwriting a confirmed tag with pending
          return
        }
        db.prepare(`
          UPDATE asset_tags SET
            confidence = ?,
            status = ?,
            updated_at = ?
          WHERE asset_id = ? AND tag_id = ? AND source = ?
        `).run(confidence, status, now, assetId, tagId, source)
      } else {
        db.prepare(`
          INSERT INTO asset_tags (id, asset_id, tag_id, source, confidence, status, model_name, model_version, raw_value, created_by, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          id,
          assetId,
          tagId,
          source,
          confidence,
          status,
          options?.modelName || null,
          options?.modelVersion || null,
          options?.rawValue || null,
          options?.createdBy || 'user',
          now,
          now
        )
      }

      // Touch assets last_tag_updated_at
      db.prepare("UPDATE assets SET last_tag_updated_at = ? WHERE id = ?").run(now, assetId)

      // Recalculate usage_count in tags
      this.getTagService().recalculateUsageCount(tagId)
    })()

    return this.getRelationById(id)!
  }

  public removeTagFromAsset(assetId: string, tagId: string): void {
    const db = this.getDb()
    const now = new Date().toISOString()

    db.transaction(() => {
      db.prepare('DELETE FROM asset_tags WHERE asset_id = ? AND tag_id = ?').run(assetId, tagId)
      db.prepare("UPDATE assets SET last_tag_updated_at = ? WHERE id = ?").run(now, assetId)
      this.getTagService().recalculateUsageCount(tagId)
    })()
  }

  public addTagsToAssets(assetIds: string[], tagIds: string[], options?: AssetTagOptions): void {
    const db = this.getDb()
    db.transaction(() => {
      for (const assetId of assetIds) {
        for (const tagId of tagIds) {
          this.addTagToAsset(assetId, tagId, options)
        }
      }
    })()
  }

  public removeTagsFromAssets(assetIds: string[], tagIds: string[]): void {
    const db = this.getDb()
    db.transaction(() => {
      for (const assetId of assetIds) {
        for (const tagId of tagIds) {
          this.removeTagFromAsset(assetId, tagId)
        }
      }
    })()
  }

  public replaceTagForAssets(assetIds: string[], oldTagId: string, newTagId: string): void {
    const db = this.getDb()
    db.transaction(() => {
      for (const assetId of assetIds) {
        // Find existing association
        const existingList = db.prepare('SELECT * FROM asset_tags WHERE asset_id = ? AND tag_id = ?').all(assetId, oldTagId) as DbAssetTagRelation[]
        for (const rel of existingList) {
          // Remove old association
          this.removeTagFromAsset(assetId, oldTagId)
          // Add new association with same parameters
          this.addTagToAsset(assetId, newTagId, {
            source: rel.source,
            confidence: rel.confidence,
            status: rel.status,
            modelName: rel.model_name || undefined,
            modelVersion: rel.model_version || undefined,
            rawValue: rel.raw_value || undefined,
            createdBy: rel.created_by
          })
        }
      }
    })()
  }

  public getTagsForAsset(assetId: string): DbAssetTagRelation[] {
    const db = this.getDb()
    // Join with tags table to return complete tag details
    return db.prepare(`
      SELECT at.*, t.name as tag_name, t.type as tag_type, t.color as tag_color
      FROM asset_tags at
      JOIN tags t ON at.tag_id = t.id
      WHERE at.asset_id = ? AND at.status != 'rejected'
      ORDER BY at.status ASC, t.name ASC
    `).all(assetId) as DbAssetTagRelation[]
  }

  public getAssetsByTag(tagId: string): string[] {
    const db = this.getDb()
    const rows = db.prepare('SELECT asset_id FROM asset_tags WHERE tag_id = ? AND status = ?').all(tagId, 'confirmed') as Array<{ asset_id: string }>
    return rows.map((r) => r.asset_id)
  }

  public confirmAiTag(assetTagId: string): void {
    const db = this.getDb()
    const now = new Date().toISOString()
    const rel = db.prepare('SELECT * FROM asset_tags WHERE id = ?').get(assetTagId) as DbAssetTagRelation | undefined

    if (rel) {
      db.transaction(() => {
        db.prepare("UPDATE asset_tags SET status = ?, confidence = 1.0, updated_at = ? WHERE id = ?").run('confirmed', now, assetTagId)
        db.prepare("UPDATE assets SET last_tag_updated_at = ? WHERE id = ?").run(now, rel.asset_id)
        
        // Also update tag_suggestions status to confirmed!
        const tag = db.prepare('SELECT name FROM tags WHERE id = ?').get(rel.tag_id) as { name: string } | undefined
        if (tag) {
          db.prepare(`
            UPDATE tag_suggestions 
            SET status = 'confirmed', updated_at = ? 
            WHERE asset_id = ? AND tag_name = ? AND source = ?
          `).run(now, rel.asset_id, tag.name, rel.source)
        }
        
        this.getTagService().recalculateUsageCount(rel.tag_id)
      })()
    }
  }

  public rejectAiTag(assetTagId: string): void {
    const db = this.getDb()
    const now = new Date().toISOString()
    const rel = db.prepare('SELECT * FROM asset_tags WHERE id = ?').get(assetTagId) as DbAssetTagRelation | undefined

    if (rel) {
      db.transaction(() => {
        db.prepare("UPDATE asset_tags SET status = ?, updated_at = ? WHERE id = ?").run('rejected', now, assetTagId)
        db.prepare("UPDATE assets SET last_tag_updated_at = ? WHERE id = ?").run(now, rel.asset_id)
        
        // Also update tag_suggestions status to rejected!
        const tag = db.prepare('SELECT name FROM tags WHERE id = ?').get(rel.tag_id) as { name: string } | undefined
        if (tag) {
          db.prepare(`
            UPDATE tag_suggestions 
            SET status = 'rejected', updated_at = ? 
            WHERE asset_id = ? AND tag_name = ? AND source = ?
          `).run(now, rel.asset_id, tag.name, rel.source)
        }
        
        this.getTagService().recalculateUsageCount(rel.tag_id)
      })()
    }
  }

  private getRelationById(id: string): DbAssetTagRelation | null {
    const db = this.getDb()
    const rel = db.prepare('SELECT * FROM asset_tags WHERE id = ?').get(id) as DbAssetTagRelation | undefined
    return rel || null
  }
}
