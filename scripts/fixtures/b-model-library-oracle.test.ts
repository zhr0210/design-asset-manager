import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import Database from 'better-sqlite3'
import { inspectVisionModel } from '../../src/main/model-library/vision-model-artifact'

// Read-only engineering oracle for the explicitly approved public library/profile only.
const root = path.resolve('.scratch/b-model-management-20261006'), library = path.join(root, 'real-library-01')
const profile = path.resolve('.scratch/wc01-real-model-library-20261005/run-U4eFuo/profile-04')
const database = new Database(path.join(profile, 'app-state/app-state.sqlite'), { readonly: true, fileMustExist: true })
const db = new Database(path.join(library, '.dam/library.sqlite'), { readonly: true, fileMustExist: true })
try {
  const names = (database.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as any[]).map(r => r.name)
  const appRows = (table: string) => names.includes(table) ? database.prepare(`SELECT * FROM ${table}`).all() as any[] : []
  const models = appRows('managed_model_entries').map(row => JSON.parse(row.record))
  const tasks = appRows('managed_model_transfers').map(row => JSON.parse(row.record))
  const catalog = appRows('managed_model_catalog').map(row => JSON.parse(row.record))
  const runtime = appRows('managed_vision_runtime').map(row => JSON.parse(row.configuration))
  const assets = db.prepare('SELECT id,title,ai_caption,ai_caption_is_user_edited FROM assets ORDER BY id').all()
  const files: any[] = []
  for (const subdirectory of ['Originals', '.dam/required-previews']) {
    const walk = async (relative: string): Promise<void> => {
      for (const entry of await fs.readdir(path.join(library, relative), { withFileTypes: true })) {
        if (entry.isSymbolicLink()) throw Error('PUBLIC_COPY_LINK_UNEXPECTED')
        const name = path.join(relative, entry.name)
        if (entry.isDirectory()) await walk(name)
        else files.push({ path: name, sha256: createHash('sha256').update(await fs.readFile(path.join(library, name))).digest('hex') })
      }
    }
    await walk(subdirectory)
  }
  const evidence = { at: new Date().toISOString(), models, tasks, catalog, runtime, assets, files,
    integrity: db.pragma('integrity_check'), foreignKeys: db.pragma('foreign_key_check'),
    manualRelations: Object.fromEntries(['tags', 'asset_tags', 'library_folders', 'library_folder_assets', 'asset_ocr_state']
      .map(table => [table, db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all()])),
    counts: Object.fromEntries(['basic_analysis_requests', 'basic_analysis_attempts', 'basic_analysis_evidence', 'background_analysis_executions']
      .map(table => [table, (db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get() as any).count])) }
  await fs.mkdir(path.join(root, 'evidence'), { recursive: true })
  const filename = path.join(root, 'evidence', 'library-' + (await fs.stat(path.join(root, 'evidence/library-before.json')).then(() => 'latest').catch(() => 'before')) + '.json')
  await fs.writeFile(filename, JSON.stringify(evidence, null, 2))
  console.log(JSON.stringify({ assets: assets.length, files: files.length, counts: evidence.counts, integrity: evidence.integrity,
    models: models.map(m => ({ id: m.id, model: m.artifact.model, trust: m.trusted, qualifiedAt: m.qualifiedAt, ownership: m.ownership })),
    tasks: tasks.map(t => ({ id: t.id, state: t.state, completed: t.completedBytes, error: t.error })),
    catalog: catalog.map(c => ({ model: c.model, files: c.files.length, state: c.state, error: c.error })),
    runtime: runtime.map(c => ({ model: c.model, enabled: c.enabled, entryId: c.entryId })) }))
  if (process.argv.includes('--inspect-public-model')) {
    const artifact = await inspectVisionModel(path.resolve('AIModels/qwen/qwen3-vl-4b-instruct'))
    console.log(JSON.stringify({ inspectedPublicArtifact: artifact.model, bytes: artifact.bytes, fingerprint: artifact.artifactFingerprint }))
  }
} finally { database.close(); db.close() }
