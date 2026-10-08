import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import Database from 'better-sqlite3'
import {applyTagIntentSchema} from '../../src/main/independent-tags/tag-intent.schema'
import {writeWindowsBackupCommitMarker} from '../../src/main/platform/windows-backup-commit.internal'
import type {WindowsBackupBinding} from '../../src/main/platform/windows-backup-recovery.internal'

/** A parent-owned crash cut only. This entry is never launched by product code. */
async function main() {
const configuration = JSON.parse(await fs.readFile(process.argv[2], 'utf8')) as {
  root: string; file: string; cut: 'before-commit' | 'after-commit'; binding: WindowsBackupBinding
}
const root = await fs.realpath(configuration.root), temporary = await fs.realpath(os.tmpdir())
assert.equal(path.dirname(root), temporary)
assert.ok(path.basename(root).startsWith('dam-native-target-'))
assert.equal(path.resolve(process.argv[2]), path.join(root, 'commit-crash.json'))
assert.equal(configuration.file, path.join(root, 'library', '.dam', 'library.sqlite'))
assert.ok(configuration.cut === 'before-commit' || configuration.cut === 'after-commit')

const db = new Database(configuration.file, {fileMustExist: true, timeout: 0})
db.pragma('journal_mode=DELETE')
db.pragma('synchronous=FULL')
db.pragma('foreign_keys=ON')
db.exec('BEGIN IMMEDIATE')
applyTagIntentSchema(db)
db.prepare('INSERT INTO tags(id,name,normalized_name,created_at,updated_at) VALUES(?,?,?,?,?)')
  .run('crash-cut-result', 'synthetic committed result', 'synthetic committed result', 'synthetic', 'synthetic')
writeWindowsBackupCommitMarker(db, {binding: configuration.binding, targetSchemaVersion: 9})

if (configuration.cut === 'before-commit') {
  process.stdout.write('CUT before-commit\n')
  await new Promise<void>(resolve => process.stdin.once('data', () => resolve()))
}
db.exec('COMMIT')
process.stdout.write('CUT after-commit\n')
// The parent kills the owned process at this cut. No acknowledgement/status file
// is written; reopening SQLite, rather than this message, proves persistence.
await new Promise<void>(resolve => process.stdin.once('data', () => resolve()))
db.close()
}
void main().catch(error => { console.error(error); process.exitCode = 1 })
