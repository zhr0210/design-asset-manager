import { getDatabase } from '../db'
import { DbAsset } from './asset.service'

export class TagSearchService {
  private getDb() {
    return getDatabase()
  }

  // Populate tags for a list of raw asset rows
  public populateTagsForAssets(assets: any[], includePending?: boolean): DbAsset[] {
    const db = this.getDb()
    const statusClause = includePending ? "at.status != 'rejected'" : "at.status = 'confirmed'"
    const getTagsStmt = db.prepare(`
      SELECT t.name FROM tags t
      JOIN asset_tags at ON t.id = at.tag_id
      WHERE at.asset_id = ? AND ${statusClause}
    `)

    return assets.map((asset) => {
      const tagRows = getTagsStmt.all(asset.id) as { name: string }[]
      return {
        ...asset,
        tags: tagRows.map((r) => r.name)
      }
    })
  }

  public searchAssetsByTags(queries: string[], includePending?: boolean): DbAsset[] {
    const db = this.getDb()
    if (!queries || queries.length === 0) {
      // Return all assets
      const allAssets = db.prepare('SELECT * FROM assets ORDER BY created_at DESC').all()
      return this.populateTagsForAssets(allAssets, includePending)
    }

    let sql = 'SELECT * FROM assets WHERE '
    const clauses: string[] = []
    const params: any[] = []
    const statusClause = includePending ? "(at.status = 'confirmed' OR at.status = 'pending')" : "at.status = 'confirmed'"

    for (const q of queries) {
      if (!q.includes(':')) {
        // Fallback to title keyword search
        clauses.push('(title LIKE ? OR file_name LIKE ?)')
        params.push(`%${q}%`, `%${q}%`)
        continue
      }

      const parts = q.split(':')
      const filterType = parts[0].trim().toLowerCase()
      const filterVal = parts.slice(1).join(':').trim()

      if (filterType === 'tag') {
        clauses.push(`id IN (
          SELECT asset_id FROM asset_tags at 
          JOIN tags t ON at.tag_id = t.id 
          WHERE (t.name = ? OR EXISTS (
            SELECT 1 FROM tag_aliases ta WHERE ta.tag_id = t.id AND ta.alias = ?
          )) AND ${statusClause}
        )`)
        params.push(filterVal, filterVal)
      } else if (filterType === 'type') {
        clauses.push(`id IN (
          SELECT asset_id FROM asset_tags at 
          JOIN tags t ON at.tag_id = t.id 
          WHERE t.type = ? AND ${statusClause}
        )`)
        params.push(filterVal)
      } else if (filterType === 'source') {
        clauses.push(`id IN (
          SELECT asset_id FROM asset_tags at 
          LEFT JOIN tags t ON at.tag_id = t.id 
          WHERE (t.type = 'source' AND t.name = ? AND ${statusClause}) 
             OR (at.source = ? AND ${statusClause})
        )`)
        params.push(filterVal, filterVal)
      } else if (filterType === 'special') {
        const specialKey = filterVal.toLowerCase()
        if (specialKey === 'untagged') {
          clauses.push(`id NOT IN (
            SELECT DISTINCT asset_id FROM asset_tags WHERE status = 'confirmed'
          )`)
        } else if (specialKey === 'ai_pending') {
          clauses.push(`(
            id IN (SELECT DISTINCT asset_id FROM asset_tags WHERE status = 'pending')
            OR id IN (SELECT DISTINCT asset_id FROM tag_suggestions WHERE status = 'pending')
          )`)
        }
      }
    }

    if (clauses.length === 0) {
      const allAssets = db.prepare('SELECT * FROM assets ORDER BY created_at DESC').all()
      return this.populateTagsForAssets(allAssets, includePending)
    }

    sql += clauses.join(' AND ')
    sql += ' ORDER BY created_at DESC'

    const rows = db.prepare(sql).all(...params)
    return this.populateTagsForAssets(rows, includePending)
  }

  public getUntaggedAssets(): DbAsset[] {
    return this.searchAssetsByTags(['special:untagged'])
  }

  public getAssetsWithPendingAiTags(): DbAsset[] {
    return this.searchAssetsByTags(['special:ai_pending'])
  }

  public getAssetsByTagType(type: string): DbAsset[] {
    return this.searchAssetsByTags([`type:${type}`])
  }

  public getAssetsByTagSource(source: string): DbAsset[] {
    return this.searchAssetsByTags([`source:${source}`])
  }
}
