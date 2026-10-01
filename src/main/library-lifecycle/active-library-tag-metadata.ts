import type Database from 'better-sqlite3'
import { randomUUID } from 'node:crypto'
import { ActiveLibraryHostError, type ActiveLibraryTagInput, type ActiveLibraryTagProjection } from '../../shared/contracts/active-library.contract'

/** Metadata operations on the exact connection held by ActiveLibraryHost's lease. */
export function createActiveLibraryTagMetadata(database: Database.Database) {
  const listTags = (): ActiveLibraryTagProjection[] => database.prepare(`
    SELECT t.id, t.name, t.type, t.color, t.aliases, t.parent_id AS parentId,
      t.is_system AS isSystem,
      (SELECT COUNT(DISTINCT at.asset_id) FROM asset_tags at JOIN asset_lifecycle l
        ON l.design_asset_identity=at.asset_id
        WHERE at.tag_id=t.id AND at.status='confirmed' AND l.lifecycle_state='active') AS usageCount
    FROM tags t ORDER BY t.name
  `).all().map(raw => {
    const row = raw as Omit<ActiveLibraryTagProjection, 'aliases' | 'isSystem'> & { aliases: string; isSystem: number }
    return { ...row, aliases: JSON.parse(row.aliases || '[]') as string[], isSystem: row.isSystem === 1 }
  })
  const getTag = (id: string) => listTags().find(tag => tag.id === id) ?? null
  const requireTag = (id: string) => {
    const tag = getTag(id)
    if (!tag) throw invalid('标签已不存在，请刷新后重试。')
    return tag
  }
  const searchTags = (query: string) => {
    const value = normalize(query)
    return listTags().filter(tag => [tag.name, ...(tag.aliases ?? [])].some(label => normalize(label).includes(value)))
  }
  const createTag = (input: ActiveLibraryTagInput) => {
    if (!input.name.trim()) throw invalid('标签名称无效、重复或标签已不存在。')
    const type = input.type ?? 'custom'
    const existing = database.prepare('SELECT id, name, type, color, usage_count AS usageCount FROM tags WHERE normalized_name = ? AND type = ?').get(input.name.trim().toLocaleLowerCase(), type) as ActiveLibraryTagProjection | undefined
    if (existing) return getTag(existing.id)!
    const id = `tag:${randomUUID()}`
    const now = new Date().toISOString()
    database.prepare(`
      INSERT INTO tags (id, name, normalized_name, slug, type, color, description, aliases,
        is_category, is_system, usage_count, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, '', '[]', 0, 0, 0, ?, ?)
    `).run(id, input.name.trim(), input.name.trim().toLocaleLowerCase(), id, type, input.color ?? null, now, now)
    return getTag(id)!
  }
  const updateTag = (tagId: string, input: ActiveLibraryTagInput) => {
    const name = input.name.trim()
    if (!name) throw invalid('标签名称无效、重复或标签已不存在。')
    const current = database.prepare('SELECT id, type, color FROM tags WHERE id = ?').get(tagId) as { id: string; type: string; color: string | null } | undefined
    if (!current) throw invalid('标签名称无效、重复或标签已不存在。')
    const type = input.type ?? current.type
    const duplicate = database.prepare('SELECT id FROM tags WHERE normalized_name = ? AND type = ? AND id != ?').get(name.toLocaleLowerCase(), type, tagId)
    if (duplicate) throw invalid('标签名称无效、重复或标签已不存在。')
    const now = new Date().toISOString()
    database.prepare('UPDATE tags SET name = ?, normalized_name = ?, slug = ?, type = ?, color = ?, updated_at = ? WHERE id = ?').run(name, name.toLocaleLowerCase(), name.toLocaleLowerCase(), type, input.color ?? current.color, now, tagId)
    return getTag(tagId)!
  }

  const syncAliases = (tagId: string) => {
    const rows = database.prepare('SELECT alias FROM tag_aliases WHERE tag_id=? ORDER BY alias').all(tagId) as { alias: string }[]
    database.prepare('UPDATE tags SET aliases=?, updated_at=? WHERE id=?').run(JSON.stringify(rows.map(row => row.alias)), new Date().toISOString(), tagId)
  }
  const createAlias = (tagId: string, input: string) => database.transaction(() => {
    const tag = requireTag(tagId)
    const alias = input.trim()
    if (!alias || alias.length > 240) throw invalid('别名需要 1–240 个字符。')
    if (normalize(alias) === normalize(tag.name)) throw invalid('别名不能与标签名称相同。')
    if (database.prepare('SELECT 1 FROM tag_aliases WHERE tag_id=? AND normalized_alias=?').get(tagId, normalize(alias))) return
    database.prepare('INSERT INTO tag_aliases(id,tag_id,alias,normalized_alias,created_at) VALUES(?,?,?,?,?)')
      .run(`alias:${randomUUID()}`, tagId, alias, normalize(alias), new Date().toISOString())
    syncAliases(tagId)
  })()
  const removeAlias = (tagId: string, alias: string) => database.transaction(() => {
    requireTag(tagId)
    database.prepare('DELETE FROM tag_aliases WHERE tag_id=? AND normalized_alias=?').run(tagId, normalize(alias))
    syncAliases(tagId)
  })()
  const setParent = (tagId: string, parentId: string | null) => database.transaction(() => {
    requireTag(tagId)
    const tags = new Map(listTags().map(tag => [tag.id, tag]))
    const visited = new Set([tagId])
    let ancestor = parentId
    while (ancestor) {
      if (visited.has(ancestor)) throw invalid('不能将标签放入自身或其下级标签。')
      visited.add(ancestor)
      const parent = tags.get(ancestor)
      if (!parent) throw invalid('上级标签已不存在，请刷新后重试。')
      ancestor = parent.parentId ?? null
    }
    const now = new Date().toISOString()
    database.prepare("DELETE FROM tag_relations WHERE child_tag_id=? AND relation_type='parent'").run(tagId)
    if (parentId) database.prepare("INSERT INTO tag_relations(id,parent_tag_id,child_tag_id,relation_type,created_at) VALUES(?,?,?,'parent',?)")
      .run(`tag-relation:${randomUUID()}`, parentId, tagId, now)
    database.prepare('UPDATE tags SET parent_id=?,updated_at=? WHERE id=?').run(parentId, now, tagId)
  })()
  return { listTags, getTag, searchTags, createTag, updateTag, createAlias, removeAlias, setParent }
}

function normalize(value: string): string { return value.trim().toLocaleLowerCase() }
function invalid(message: string): ActiveLibraryHostError { return new ActiveLibraryHostError('library-operation-failed', message) }
