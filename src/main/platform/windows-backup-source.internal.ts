import path from 'node:path'
import {createHash} from 'node:crypto'
import type Database from 'better-sqlite3'
import {tagIntentSpacePolicy} from '../independent-tags/tag-intent-backup'
import {WINDOWS_BACKUP_PROFILE} from './windows-backup-profile.internal'

/** Private tracer evidence; decimal strings avoid losing native 64-bit identities. */
export interface WindowsBackupSourceEvidence {
  volume: string; file: string; size: string; created: string; written: string
  links: number; sha256: string; available: string; filesystem: string
}
export interface WindowsBackupConnectionSnapshot {
  pages: number; pageSize: number; dataVersion: number; schemaVersion: number
}
const decimal = /^(0|[1-9][0-9]{0,19})$/u
const sha = (image: Buffer) => createHash('sha256').update(image).digest('hex')
/** SQLite's own schema/index inspection can materialize an empty temp DB.
 * It grants no attached-store authority: only that exact empty internal temp
 * and one file-backed main are accepted. */
export function windowsBackupMainFile(db: Database.Database): string {
  const attached = db.pragma('database_list') as Array<{name: string; file: string}>
  const main = attached.filter(row => row.name === 'main'), temp = attached.filter(row => row.name === 'temp')
  if (main.length !== 1 || typeof main[0].file !== 'string' || !main[0].file || attached.length > 2 ||
    attached.some(row => row.name !== 'main' && row.name !== 'temp') || temp.length > 1 ||
    temp.length === 1 && (temp[0].file !== '' || db.prepare('SELECT name FROM temp.sqlite_schema LIMIT 1').get() !== undefined)) throw Error('BACKUP_SOURCE_CONNECTION_REFUSED')
  return main[0].file
}
export function captureWindowsBackupConnection(db: Database.Database, control: string, scope: 'settled' | 'readonly-transaction' = 'settled'): WindowsBackupConnectionSnapshot {
  if (scope !== 'settled' && scope !== 'readonly-transaction') throw Error('BACKUP_SOURCE_CONNECTION_REFUSED')
  const mainFile = windowsBackupMainFile(db)
  if ((scope === 'settled' ? db.inTransaction : !db.inTransaction || !db.readonly || db.pragma('query_only', {simple:true}) !== 1) ||
    db.pragma('journal_mode', {simple:true}) !== 'delete' ||
    path.resolve(mainFile) !== path.resolve(control, 'library.sqlite')) throw Error('BACKUP_SOURCE_CONNECTION_REFUSED')
  const snapshot = {pages: Number(db.pragma('page_count', {simple:true})), pageSize: Number(db.pragma('page_size', {simple:true})),
    dataVersion: Number(db.pragma('data_version', {simple:true})), schemaVersion: Number(db.pragma('user_version', {simple:true}))}
  if (!Object.values(snapshot).every(Number.isSafeInteger) || snapshot.pages < 1 || snapshot.dataVersion < 1 || snapshot.schemaVersion < 1) throw Error('BACKUP_SOURCE_CONNECTION_REFUSED')
  tagIntentSpacePolicy(snapshot.pages, snapshot.pageSize, 0n)
  return snapshot
}
export function validateWindowsBackupSource(evidence: WindowsBackupSourceEvidence, connection: WindowsBackupConnectionSnapshot, image?: Buffer) {
  if (!evidence || !['volume','file','size','created','written','available'].every(key => typeof evidence[key as keyof WindowsBackupSourceEvidence] === 'string' && decimal.test(evidence[key as keyof WindowsBackupSourceEvidence] as string)) ||
    evidence.links !== 1 || evidence.filesystem !== 'NTFS' || typeof evidence.sha256 !== 'string' || !/^[a-f0-9]{64}$/u.test(evidence.sha256) ||
    ['volume','file','size','created','written','available'].some(key => BigInt(evidence[key as keyof WindowsBackupSourceEvidence] as string) > 18446744073709551615n) ||
    BigInt(evidence.volume) > 4294967295n || BigInt(evidence.file) === 0n || BigInt(evidence.size) !== BigInt(connection.pages) * BigInt(connection.pageSize) ||
    BigInt(evidence.size) > BigInt(WINDOWS_BACKUP_PROFILE.maxImageBytes) || BigInt(evidence.created) === 0n || BigInt(evidence.written) === 0n) throw Error('BACKUP_SOURCE_EVIDENCE_REFUSED')
  if (image && (BigInt(image.length) !== BigInt(evidence.size) || sha(image) !== evidence.sha256)) throw Error('BACKUP_SOURCE_IMAGE_CHANGED')
  return tagIntentSpacePolicy(connection.pages, connection.pageSize, BigInt(evidence.size))
}
export function requireWindowsBackupSpace(evidence: WindowsBackupSourceEvidence, required: bigint) {
  if (typeof evidence.available !== 'string' || !decimal.test(evidence.available) || BigInt(evidence.available) > 18446744073709551615n || required < 0n) throw Error('BACKUP_SPACE_UNKNOWN')
  if (BigInt(evidence.available) < required) throw Error('BACKUP_SPACE_REQUIRED')
}
export function recheckWindowsBackupSource(before: WindowsBackupSourceEvidence, after: WindowsBackupSourceEvidence,
  connectionBefore: WindowsBackupConnectionSnapshot, connectionAfter: WindowsBackupConnectionSnapshot, image: Buffer) {
  const policy = validateWindowsBackupSource(after, connectionAfter, image)
  if (Object.keys(connectionBefore).some(key => connectionBefore[key as keyof WindowsBackupConnectionSnapshot] !== connectionAfter[key as keyof WindowsBackupConnectionSnapshot]) ||
    (['volume','file','size','created','written','links','sha256','filesystem'] as const).some(key => before[key] !== after[key])) throw Error('BACKUP_SOURCE_CHANGED')
  requireWindowsBackupSpace(after, policy.beforeDdl)
}
