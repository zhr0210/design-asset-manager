import { getDatabase } from '../db'

export interface TagInput {
  name: string
  type?: string
  color?: string
  description?: string
  shorthand?: string
  parentId?: string
  isCategory?: boolean
}

export interface DbTag {
  id: string
  name: string
  normalized_name: string
  slug: string
  type: string
  color: string
  description: string
  shorthand: string
  aliases: string // JSON string
  parent_id: string | null
  is_category: number
  is_system: number
  usage_count: number
  created_at: string
  updated_at: string
}

export class TagService {
  private getDb() {
    return getDatabase()
  }

  public getTag(id: string): DbTag | null {
    const db = this.getDb()
    const tag = db.prepare('SELECT * FROM tags WHERE id = ?').get(id) as DbTag | undefined
    return tag || null
  }

  public createTag(input: TagInput): DbTag {
    const db = this.getDb()
    const now = new Date().toISOString()
    const id = `tag-${input.type || 'custom'}-${Math.random().toString(36).substr(2, 9)}`
    const name = input.name.trim()
    const normalized = name.toLowerCase()
    const slug = normalized
    const type = input.type || 'custom'
    const color = input.color || 'bg-slate-100 text-slate-700'
    const description = input.description || ''
    const shorthand = input.shorthand || ''
    const parentId = input.parentId || null
    const isCategory = input.isCategory ? 1 : 0
    const isSystem = 0

    // Duplicate check on normalized_name + type
    const existing = db.prepare('SELECT * FROM tags WHERE normalized_name = ? AND type = ?').get(normalized, type) as DbTag | undefined
    if (existing) {
      return existing
    }

    db.prepare(`
      INSERT INTO tags (id, name, normalized_name, slug, type, color, description, shorthand, aliases, parent_id, is_category, is_system, usage_count, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      name,
      normalized,
      slug,
      type,
      color,
      description,
      shorthand,
      JSON.stringify([]),
      parentId,
      isCategory,
      isSystem,
      0,
      now,
      now
    )

    // Recalculate parent_child tag relation in tag_relations
    if (parentId) {
      this.setParent(id, parentId)
    }

    return this.getTag(id)!
  }

  public updateTag(id: string, input: Partial<TagInput & { aliases: string[]; color: string; isCategory: boolean }>): DbTag {
    const db = this.getDb()
    const now = new Date().toISOString()
    const existing = this.getTag(id)
    if (!existing) {
      throw new Error(`Tag with ID ${id} not found`)
    }

    const name = input.name !== undefined ? input.name.trim() : existing.name
    const normalized = name.toLowerCase()
    const type = input.type !== undefined ? input.type : existing.type
    const color = input.color !== undefined ? input.color : existing.color
    const description = input.description !== undefined ? input.description : existing.description
    const shorthand = input.shorthand !== undefined ? input.shorthand : existing.shorthand
    const parentId = input.parentId !== undefined ? (input.parentId || null) : existing.parent_id
    const isCategory = input.isCategory !== undefined ? (input.isCategory ? 1 : 0) : existing.is_category

    db.prepare(`
      UPDATE tags
      SET name = ?, normalized_name = ?, slug = ?, type = ?, color = ?, description = ?, shorthand = ?, parent_id = ?, is_category = ?, updated_at = ?
      WHERE id = ?
    `).run(
      name,
      normalized,
      normalized,
      type,
      color,
      description,
      shorthand,
      parentId,
      isCategory,
      now,
      id
    )

    // Update parent tag relationship in tag_relations table
    if (input.parentId !== undefined) {
      db.prepare('DELETE FROM tag_relations WHERE child_tag_id = ? AND relation_type = ?').run(id, 'parent')
      if (input.parentId) {
        const relId = `rel-${Math.random().toString(36).substr(2, 9)}`
        db.prepare('INSERT INTO tag_relations (id, parent_tag_id, child_tag_id, relation_type, created_at) VALUES (?, ?, ?, ?, ?)').run(
          relId,
          input.parentId,
          id,
          'parent',
          now
        )
      }
    }

    return this.getTag(id)!
  }

  public deleteTag(id: string): void {
    const db = this.getDb()
    db.transaction(() => {
      // Delete relation from tag_relations
      db.prepare('DELETE FROM tag_relations WHERE parent_tag_id = ? OR child_tag_id = ?').run(id, id)
      // Delete aliases
      db.prepare('DELETE FROM tag_aliases WHERE tag_id = ?').run(id)
      // Delete relationships from asset_tags
      db.prepare('DELETE FROM asset_tags WHERE tag_id = ?').run(id)
      // Delete tag itself
      db.prepare('DELETE FROM tags WHERE id = ?').run(id)
    })()
  }

  public mergeTags(sourceTagId: string, targetTagId: string): void {
    const db = this.getDb()
    if (sourceTagId === targetTagId) return

    const sourceTag = this.getTag(sourceTagId)
    const targetTag = this.getTag(targetTagId)
    if (!sourceTag || !targetTag) {
      throw new Error('Source or target tag does not exist')
    }

    db.transaction(() => {
      // Find all assets linked with source tag
      const assetTags = db.prepare('SELECT * FROM asset_tags WHERE tag_id = ?').all(sourceTagId) as Array<{
        asset_id: string
        source: string
        confidence: number
        status: string
      }>

      const insertOrIgnore = db.prepare(`
        INSERT OR IGNORE INTO asset_tags (id, asset_id, tag_id, source, confidence, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `)

      for (const rel of assetTags) {
        const id = `${rel.asset_id}_${targetTagId}_${rel.source}`
        insertOrIgnore.run(id, rel.asset_id, targetTagId, rel.source, rel.confidence, rel.status)
      }

      // Merge aliases
      const sourceAliases = db.prepare('SELECT alias FROM tag_aliases WHERE tag_id = ?').all(sourceTagId) as Array<{ alias: string }>
      for (const entry of sourceAliases) {
        this.createAlias(targetTagId, entry.alias)
      }

      // Delete the source tag
      this.deleteTag(sourceTagId)

      // Update usage count of target
      this.recalculateUsageCount(targetTagId)
    })()
  }

  public listTags(filter?: { type?: string; searchQuery?: string; isCategory?: boolean }): DbTag[] {
    const db = this.getDb()
    let query = 'SELECT * FROM tags'
    const clauses: string[] = []
    const params: any[] = []

    if (filter?.type) {
      clauses.push('type = ?')
      params.push(filter.type)
    }

    if (filter?.searchQuery) {
      clauses.push('(name LIKE ? OR normalized_name LIKE ? OR aliases LIKE ?)')
      const searchLike = `%${filter.searchQuery.trim().toLowerCase()}%`
      params.push(searchLike, searchLike, searchLike)
    }

    if (filter?.isCategory !== undefined) {
      clauses.push('is_category = ?')
      params.push(filter.isCategory ? 1 : 0)
    }

    if (clauses.length > 0) {
      query += ' WHERE ' + clauses.join(' AND ')
    }

    query += ' ORDER BY usage_count DESC, name ASC'
    return db.prepare(query).all(...params) as DbTag[]
  }

  public searchTags(query: string): DbTag[] {
    return this.listTags({ searchQuery: query })
  }

  public getTagUsageCount(tagId: string): number {
    const db = this.getDb()
    const res = db.prepare('SELECT COUNT(DISTINCT asset_id) as count FROM asset_tags WHERE tag_id = ? AND status = ?').get(tagId, 'confirmed') as { count: number }
    return res?.count || 0
  }

  public recalculateUsageCount(tagId: string): void {
    const db = this.getDb()
    const usage = this.getTagUsageCount(tagId)
    db.prepare('UPDATE tags SET usage_count = ? WHERE id = ?').run(usage, tagId)
  }

  public createAlias(tagId: string, alias: string): void {
    const db = this.getDb()
    const now = new Date().toISOString()
    const trimmed = alias.trim()
    const normalized = trimmed.toLowerCase()
    if (!trimmed) return

    // Avoid duplicate alias in tag_aliases
    const existing = db.prepare('SELECT * FROM tag_aliases WHERE tag_id = ? AND normalized_alias = ?').get(tagId, normalized)
    if (existing) return

    const id = `alias-${Math.random().toString(36).substr(2, 9)}`
    db.prepare('INSERT INTO tag_aliases (id, tag_id, alias, normalized_alias, created_at) VALUES (?, ?, ?, ?, ?)').run(
      id,
      tagId,
      trimmed,
      normalized,
      now
    )

    // Synchronize tags table aliases JSON string
    this.syncAliasesJson(tagId)
  }

  public removeAlias(tagId: string, aliasText: string): void {
    const db = this.getDb()
    db.prepare('DELETE FROM tag_aliases WHERE tag_id = ? AND normalized_alias = ?').run(tagId, aliasText.toLowerCase().trim())
    this.syncAliasesJson(tagId)
  }

  private syncAliasesJson(tagId: string): void {
    const db = this.getDb()
    const aliasesRows = db.prepare('SELECT alias FROM tag_aliases WHERE tag_id = ? ORDER BY alias ASC').all(tagId) as Array<{ alias: string }>
    const aliasesList = aliasesRows.map((r) => r.alias)
    db.prepare('UPDATE tags SET aliases = ? WHERE id = ?').run(JSON.stringify(aliasesList), tagId)
  }

  public setParent(tagId: string, parentId: string | null): void {
    const db = this.getDb()
    const now = new Date().toISOString()

    db.prepare('DELETE FROM tag_relations WHERE child_tag_id = ? AND relation_type = ?').run(tagId, 'parent')

    if (parentId) {
      const id = `rel-${Math.random().toString(36).substr(2, 9)}`
      db.prepare('INSERT INTO tag_relations (id, parent_tag_id, child_tag_id, relation_type, created_at) VALUES (?, ?, ?, ?, ?)').run(
        id,
        parentId,
        tagId,
        'parent',
        now
      )
    }

    db.prepare('UPDATE tags SET parent_id = ?, updated_at = ? WHERE id = ?').run(parentId, now, tagId)
  }
}
