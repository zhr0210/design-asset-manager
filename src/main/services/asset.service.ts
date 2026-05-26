import { getDatabase } from '../db'

export interface DbAsset {
  id: string
  title: string
  file_name: string
  file_path: string
  thumbnail_path: string
  source_site_id: string
  source_site_name: string
  source_page_url?: string
  original_url?: string
  width?: number
  height?: number
  file_size?: number
  file_type?: string
  dominant_color?: string
  created_at: string
  updated_at: string
  tags?: string[]
}

export interface DbTag {
  id: string
  name: string
  color: string
  created_at: string
}

export class AssetService {
  private getDb() {
    return getDatabase()
  }

  public listAssets(filters?: { keyword?: string; siteId?: string; tagName?: string }): DbAsset[] {
    const db = this.getDb()
    let query = 'SELECT a.* FROM assets a'
    const params: any[] = []
    const clauses: string[] = []

    if (filters?.tagName) {
      query += `
        JOIN asset_tags at ON a.id = at.asset_id
        JOIN tags t ON at.tag_id = t.id
      `
      clauses.push('t.name = ?')
      params.push(filters.tagName)
    }

    if (filters?.keyword) {
      clauses.push('(a.title LIKE ? OR a.source_site_name LIKE ?)')
      params.push(`%${filters.keyword}%`, `%${filters.keyword}%`)
    }

    if (filters?.siteId) {
      clauses.push('a.source_site_id = ?')
      params.push(filters.siteId)
    }

    if (clauses.length > 0) {
      query += ' WHERE ' + clauses.join(' AND ')
    }

    query += ' ORDER BY a.created_at DESC'

    const assets = db.prepare(query).all(...params) as DbAsset[]

    // Populate tags for each asset
    const getTagsStmt = db.prepare(`
      SELECT t.name FROM tags t
      JOIN asset_tags at ON t.id = at.tag_id
      WHERE at.asset_id = ?
    `)

    return assets.map((asset) => {
      const tagRows = getTagsStmt.all(asset.id) as { name: string }[]
      return {
        ...asset,
        tags: tagRows.map((r) => r.name)
      }
    })
  }

  public saveAsset(asset: Omit<DbAsset, 'created_at' | 'updated_at'>, tagsList: string[] = []): DbAsset {
    const db = this.getDb()
    const now = new Date().toISOString()

    const existing = db.prepare('SELECT * FROM assets WHERE id = ?').get(asset.id) as DbAsset | undefined

    db.transaction(() => {
      if (existing) {
        db.prepare(`
          UPDATE assets
          SET title = ?, file_name = ?, file_path = ?, thumbnail_path = ?, source_site_id = ?, source_site_name = ?,
              source_page_url = ?, original_url = ?, width = ?, height = ?, file_size = ?, file_type = ?, dominant_color = ?, updated_at = ?
          WHERE id = ?
        `).run(
          asset.title,
          asset.file_name,
          asset.file_path,
          asset.thumbnail_path,
          asset.source_site_id,
          asset.source_site_name,
          asset.source_page_url || null,
          asset.original_url || null,
          asset.width || null,
          asset.height || null,
          asset.file_size || null,
          asset.file_type || null,
          asset.dominant_color || null,
          now,
          asset.id
        )
      } else {
        db.prepare(`
          INSERT INTO assets (id, title, file_name, file_path, thumbnail_path, source_site_id, source_site_name, source_page_url, original_url, width, height, file_size, file_type, dominant_color, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          asset.id,
          asset.title,
          asset.file_name,
          asset.file_path,
          asset.thumbnail_path,
          asset.source_site_id,
          asset.source_site_name,
          asset.source_page_url || null,
          asset.original_url || null,
          asset.width || null,
          asset.height || null,
          asset.file_size || null,
          asset.file_type || null,
          asset.dominant_color || null,
          now,
          now
        )
      }

      // Re-map tags
      db.prepare('DELETE FROM asset_tags WHERE asset_id = ?').run(asset.id)

      for (const tagName of tagsList) {
        if (!tagName.trim()) continue

        // Check if tag already exists in tags
        let tagRecord = db.prepare('SELECT * FROM tags WHERE name = ?').get(tagName) as DbTag | undefined

        if (!tagRecord) {
          const tagId = `tag-${Math.random().toString(36).substr(2, 9)}`
          const tagColors = [
            'bg-rose-100 text-rose-700',
            'bg-slate-100 text-slate-700',
            'bg-indigo-100 text-indigo-700',
            'bg-amber-100 text-amber-700'
          ]
          const chosenColor = tagColors[Math.floor(Math.random() * tagColors.length)]

          db.prepare('INSERT INTO tags (id, name, color, created_at) VALUES (?, ?, ?, ?)').run(
            tagId,
            tagName,
            chosenColor,
            now
          )
          tagRecord = { id: tagId, name: tagName, color: chosenColor, created_at: now }
        }

        // Insert association
        db.prepare('INSERT INTO asset_tags (asset_id, tag_id) VALUES (?, ?)').run(asset.id, tagRecord.id)
      }
    })()

    return {
      ...asset,
      tags: tagsList,
      created_at: existing ? existing.created_at : now,
      updated_at: now
    }
  }

  public deleteAsset(id: string): void {
    const db = this.getDb()
    db.transaction(() => {
      db.prepare('DELETE FROM asset_tags WHERE asset_id = ?').run(id)
      db.prepare('DELETE FROM assets WHERE id = ?').run(id)
    })()
  }

  public listTags(): DbTag[] {
    const db = this.getDb()
    return db.prepare('SELECT * FROM tags ORDER BY name ASC').all() as DbTag[]
  }
}
