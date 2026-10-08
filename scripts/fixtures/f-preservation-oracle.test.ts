import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { createReadStream } from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import Database from 'better-sqlite3'
import { DAM_BUILD_IDENTITY } from '../../src/shared/build-identity.generated'

// Independent read-only comparison: designated D public source and F copy.
// A matching copy is not claimed as acceptance of the original source library.
const source = path.resolve('.scratch/d-work-mode-20261008/library')
const target = path.resolve('.scratch/f-release-scale-20261008/library-10000')
const digest = async (file: string) => {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(file)) hash.update(chunk)
  return hash.digest('hex')
}
const quote = (name: string) => '"' + name.replaceAll('"', '""') + '"'
const origin = new Database(path.join(source, '.dam/library.sqlite'), { readonly: true, fileMustExist: true })
const copy = new Database(path.join(target, '.dam/library.sqlite'), { readonly: true, fileMustExist: true })
const results: Record<string, number> = {}
let files = 0, vectorCount = 0
try {
  origin.exec('BEGIN'); copy.exec('BEGIN')
  assert.equal(origin.pragma('integrity_check', { simple: true }), 'ok')
  assert.equal(copy.pragma('integrity_check', { simple: true }), 'ok')
  assert.deepEqual(copy.pragma('foreign_key_check'), [])
  const tables = ['assets', 'asset_lifecycle', 'tags', 'asset_tags', 'library_folders', 'library_folder_assets',
    'visual_ai_evidence', 'independent_tag_requests', 'independent_tag_executions', 'independent_tag_evidence',
    'asset_ocr_evidence', 'asset_ocr_state', 'basic_analysis_requests', 'basic_analysis_attempts', 'basic_analysis_evidence',
    'work_sets', 'work_set_items', 'background_analysis_executions', 'background_analysis_execution_history']
  const present = new Set((origin.prepare("SELECT name FROM sqlite_schema WHERE type='table'").all() as { name: string }[]).map(row => row.name))
  for (const table of tables.filter(table => present.has(table))) {
    const originalRows = origin.prepare(`SELECT * FROM ${quote(table)}`).all()
    const actual = new Set(copy.prepare(`SELECT * FROM ${quote(table)}`).all().map(row => JSON.stringify(row)))
    for (const row of originalRows) assert.ok(actual.has(JSON.stringify(row)), 'Inherited row changed or lost: ' + table)
    results[table] = originalRows.length
  }
  for (const role of ['Originals', '.dam/required-previews']) await checkDirectory(path.join(source, role), role)
  const registry = JSON.parse(await fs.readFile(path.join(source, '.dam/.dam-asset-retrieval.json'), 'utf8'))
  assert.match(registry.canonical, /^asset-vectors-[a-f0-9-]{36}\.sqlite$/)
  const original = new Database(path.join(source, '.dam', registry.canonical), { readonly: true, fileMustExist: true })
  const copied = new Database(path.join(target, '.dam', registry.canonical), { readonly: true, fileMustExist: true })
  try {
    original.exec('BEGIN'); copied.exec('BEGIN')
    const names = (original.prepare("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%'").all() as { name: string }[]).map(row => row.name)
    for (const name of names) {
      const expected = original.prepare(`SELECT * FROM ${quote(name)}`).all().map(row => JSON.stringify(row)).sort()
      const actual = copied.prepare(`SELECT * FROM ${quote(name)}`).all().map(row => JSON.stringify(row)).sort()
      assert.deepEqual(actual, expected, 'Canonical source vectors/identities must stay byte-exact')
      if (name === 'vectors') vectorCount = expected.length
    }
  } finally { original.close(); copied.close() }
  await fs.writeFile('.scratch/f-release-scale-20261008/evidence/preservation-result.json', JSON.stringify({
    build: DAM_BUILD_IDENTITY, kind: 'independent read-only source/copy oracle', inheritedRows: results,
    inheritedFileHashesMatched: files, canonicalVectorsMatched: vectorCount,
    unknownExecutions: 'original persisted rows retained verbatim', copyIntegrity: 'ok', foreignKeys: 0
  }, null, 2) + '\n')
  console.log(JSON.stringify({ inheritedFileHashesMatched: files, canonicalVectorsMatched: vectorCount, inheritedRows: results }))
} finally { origin.close(); copy.close() }

async function checkDirectory(directory: string, relative: string) {
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    assert.equal(entry.isSymbolicLink(), false)
    const name = path.posix.join(relative, entry.name)
    if (entry.isDirectory()) await checkDirectory(path.join(directory, entry.name), name)
    else if (entry.isFile()) {
      const actual = path.join(target, name)
      assert.equal((await fs.lstat(actual)).isSymbolicLink(), false)
      assert.equal(await digest(actual), await digest(path.join(directory, entry.name)), 'Inherited Original/preview changed: ' + name)
      files++
    }
  }
}
