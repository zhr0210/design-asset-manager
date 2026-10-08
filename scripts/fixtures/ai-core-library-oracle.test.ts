import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import Database from 'better-sqlite3'

const root = path.resolve('.scratch/ai-core-20261006'), library = path.join(root, 'real-library-01')
const db = new Database(path.join(library, '.dam/library.sqlite'), { readonly: true, fileMustExist: true })
try {
  const names = (db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as any[]).map(r => r.name)
  const rows = (table: string) => names.includes(table) ? db.prepare('SELECT * FROM "' + table + '" ORDER BY rowid').all() : []
  const copies = JSON.parse(await fs.readFile('.scratch/wc01-real-model-library-20261005/run-U4eFuo/library-copies.json', 'utf8'))
  const files = []
  for (const f of copies.files.filter((f: any) => f.relativePath.startsWith('Originals/') || f.relativePath.startsWith('.dam/required-previews/'))) {
    const hash = createHash('sha256').update(await fs.readFile(path.join(library, f.relativePath))).digest('hex')
    if (hash !== f.sha256) throw Error('PROTECTED_FILE_CHANGED:' + f.relativePath)
    files.push({ path: f.relativePath, sha256: hash })
  }
  const backups = []
  for (const entry of await fs.readdir(path.join(library, '.dam/schema-backups'), { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.isSymbolicLink()) continue
    const file = path.join(library, '.dam/schema-backups', entry.name, 'library.sqlite')
    const backup = new Database(file, { readonly: true, fileMustExist: true })
    try {
      const integrity = backup.pragma('integrity_check'), foreignKeys = backup.pragma('foreign_key_check')
      if (JSON.stringify(integrity) !== JSON.stringify([{integrity_check:'ok'}]) || foreignKeys.length) throw Error('BACKUP_INVALID')
      backups.push({ directory: entry.name, schema: backup.pragma('user_version', {simple:true}), integrity, foreignKeys, assets: backup.prepare('SELECT id,title,ai_caption,ai_caption_is_user_edited FROM assets ORDER BY id').all() })
    } finally { backup.close() }
  }
  const value = { at: new Date().toISOString(), schema: db.pragma('user_version', { simple: true }), integrity: db.pragma('integrity_check'), foreignKeys: db.pragma('foreign_key_check'), assets: rows('assets'), relations: Object.fromEntries(['tags', 'asset_tags', 'library_folders', 'library_folder_assets', 'library_palette_colors'].map(t => [t, rows(t)])), ocr: rows('asset_ocr_evidence'), ocrEdits: rows('asset_ocr_state'), requests: rows('basic_analysis_requests'), attempts: rows('basic_analysis_attempts'), effects: rows('basic_analysis_evidence'), current: rows('basic_analysis_current'), background: rows('background_analysis_executions'), backgroundHistory: rows('background_analysis_execution_history'), basicOutbox: rows('basic_analysis_outbox'), tagOutbox: rows('independent_tag_outbox'), files, backups }
  const mode = await fs.stat(path.join(root, 'evidence/library-before.json')).then(() => 'latest').catch(() => 'before')
  await fs.writeFile(path.join(root, 'evidence', 'library-' + mode + '.json'), JSON.stringify(value, null, 2))
  console.log(JSON.stringify({ schema: value.schema, assets: value.assets.length, filesVerified: files.length, requests: value.requests.length, attempts: value.attempts.length, effects: value.effects.length, background: value.background.length, integrity: value.integrity, foreignKeys: value.foreignKeys }))
  for (const a of value.assets as any[]) if (a.ai_caption || value.current.some((c: any) => c.asset_id === a.id)) console.log(JSON.stringify({ title: a.title, id: a.id, caption: a.ai_caption, manual: a.ai_caption_is_user_edited }))
} finally { db.close() }
