import type Database from 'better-sqlite3'
import {backupBindingSha256, serializeWindowsBackupBinding, type WindowsBackupBinding} from './windows-backup-recovery.internal'
import {validateWindowsBackupSource, windowsBackupMainFile, type WindowsBackupSourceEvidence} from './windows-backup-source.internal'
import {assertLibraryDataSchema} from '../library-lifecycle/library-materialization.internal'

export interface WindowsBackupCommitExpectation {
  binding: WindowsBackupBinding
  targetSchemaVersion: number
}

function marker(expected: WindowsBackupCommitExpectation): string {
  const {binding, targetSchemaVersion} = expected
  const canonical = serializeWindowsBackupBinding(binding)
  if (!Number.isSafeInteger(targetSchemaVersion) || targetSchemaVersion <= binding.connection.schemaVersion || targetSchemaVersion > 15) throw Error('BACKUP_COMMIT_EXPECTATION_REFUSED')
  return `backup-proof:v1:${backupBindingSha256(canonical)}:${binding.imageSha256}:${targetSchemaVersion}`
}

function requireConnection(db: Database.Database, expected: WindowsBackupCommitExpectation, readonly: boolean, committed = true) {
  windowsBackupMainFile(db)
  const version = db.pragma('user_version', {simple: true})
  if (db.readonly !== readonly || !db.inTransaction ||
    db.pragma('journal_mode', {simple: true}) !== 'delete' || db.pragma('synchronous', {simple: true}) !== 2 ||
    db.pragma('application_id', {simple: true}) !== 0x44414d49 ||
    (committed ? version !== expected.targetSchemaVersion : version !== expected.targetSchemaVersion && version !== expected.binding.connection.schemaVersion) ||
    readonly && db.pragma('query_only', {simple: true}) !== 1) throw Error('BACKUP_COMMIT_CONNECTION_REFUSED')
  const identities = db.prepare('SELECT lineage_identity, library_identity, control_store_identity, library_generation FROM library_control_identity LIMIT 2').all() as Array<Record<string, unknown>>
  const identity = identities[0], b = expected.binding
  if (identities.length !== 1 || identity.lineage_identity !== b.lineage || identity.library_identity !== b.library ||
    identity.control_store_identity !== b.controlStore || identity.library_generation !== b.generation) throw Error('BACKUP_COMMIT_IDENTITY_REFUSED')
}
function requireSettledJournal(db: Database.Database) {
  const rows = db.prepare('SELECT operation_identity, state FROM library_operation_journal LIMIT 129').all() as Array<{operation_identity: unknown; state: unknown}>
  if (rows.length > 128 || rows.some(row => typeof row.operation_identity !== 'string' ||
    !/^[A-Za-z0-9][A-Za-z0-9._:~-]{0,255}$/u.test(row.operation_identity) || row.state !== 'settled')) throw Error('BACKUP_COMMIT_JOURNAL_REFUSED')
  return rows.length
}

/** Private Host maintenance marker. Caller invokes this inside the SAME authority
 * transaction as DDL/business writes. Reuses the existing settled journal row;
 * no schema migration or status-file acknowledgement is used as commit proof. */
export function writeWindowsBackupCommitMarker(db: Database.Database, expected: WindowsBackupCommitExpectation): void {
  const identity = marker(expected)
  requireConnection(db, expected, false)
  assertLibraryDataSchema(db)
  const prefix = `backup-proof:v1:${backupBindingSha256(serializeWindowsBackupBinding(expected.binding))}:`
  if (db.prepare('SELECT operation_identity FROM library_operation_journal WHERE substr(operation_identity, 1, ?) = ? LIMIT 1').get(prefix.length, prefix)) throw Error('BACKUP_COMMIT_ALREADY_RECORDED')
  if (requireSettledJournal(db) >= 128) throw Error('BACKUP_COMMIT_JOURNAL_CAPACITY_REFUSED')
  db.prepare("INSERT INTO library_operation_journal(operation_identity, state) VALUES (?, 'settled')").run(identity)
}

/** Actual VFS evidence must be obtained from this readonly connection while its
 * native pin remains held; never accept evidence supplied by status files.
 * A journal row establishes the current source's recorded commit under the
 * exclusive Host authority. It is not an authenticated forensic statement
 * against arbitrary out-of-band writers, and grants no restore/write rights. */
export function inspectWindowsBackupSourceCommit(db: Database.Database, expected: WindowsBackupCommitExpectation, source: WindowsBackupSourceEvidence) {
  const identity = marker(expected)
  if (!source || source.filesystem !== 'NTFS' || source.links !== 1 ||
    !['volume', 'file', 'created'].every(key => source[key as keyof WindowsBackupSourceEvidence] === expected.binding.source[key as keyof WindowsBackupSourceEvidence])) throw Error('BACKUP_COMMIT_SOURCE_REFUSED')
  if (!db.readonly || !db.inTransaction || db.pragma('query_only', {simple: true}) !== 1) throw Error('BACKUP_COMMIT_CONNECTION_REFUSED')
  requireConnection(db, expected, true, false)
  assertLibraryDataSchema(db)
  requireSettledJournal(db)
  validateWindowsBackupSource(source, {pages: Number(db.pragma('page_count', {simple: true})), pageSize: Number(db.pragma('page_size', {simple: true})),
    dataVersion: Number(db.pragma('data_version', {simple: true})), schemaVersion: Number(db.pragma('user_version', {simple: true}))})
  const rows = db.prepare('SELECT operation_identity, state FROM library_operation_journal WHERE operation_identity = ? LIMIT 2').all(identity) as Array<{operation_identity: unknown; state: unknown}>
  if (rows.length === 0) return {sourceCommit: 'unproven', productionQualified: false, restoreAllowed: false} as const
  requireConnection(db, expected, true)
  if (rows.length !== 1 || rows[0].operation_identity !== identity || rows[0].state !== 'settled' ||
    db.pragma('quick_check(1)', {simple: true}) !== 'ok') throw Error('BACKUP_COMMIT_RECORD_REFUSED')
  return {sourceCommit: 'recorded-commit', productionQualified: false, restoreAllowed: false} as const
}
