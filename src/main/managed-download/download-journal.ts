import { isKnownLibrarySchemaVersion } from '../library-lifecycle/library-schema-version'
import { ActiveLibraryHostError } from '../../shared/contracts/active-library.contract'
import fs from 'node:fs/promises'
import { constants } from 'node:fs'
import path from 'node:path'
import { createHash, randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'
import type { DownloadIntent, DownloadJournalCommand, DownloadJournalResult } from '../../shared/contracts/download-journal.contract'
import { enableDownloadJournal } from './download-journal.schema'
import { assertExistingDirectoryInsideManagedRoot } from '../platform/filesystem-guard'
import { readVerifiedOwnedFile } from '../platform/verified-owned-file'

const CHUNK = 1024 * 1024
const MAX = 32 * CHUNK
const QUOTA = 256 * CHUNK
type Binding = { root: string; staging: string; identity: string; generation: string; database: Database.Database }
type Chunk = { task_id: string; transfer_epoch: number; start_offset: number; byte_length: number; sha256: string; chunk_identity: string }
const digest = (bytes: Uint8Array | string) => createHash('sha256').update(bytes).digest('hex')
const conflict = () => new Error('下载检查点已变化或不可验证，请重新检查。')

/** Called serially by the Host, within the exclusive lease. No arbitrary path input. */
export async function executeDownloadJournal(active: Binding, cmd: Exclude<DownloadJournalCommand, { kind: 'import' }>): Promise<DownloadJournalResult> {
  const db = active.database
  if (cmd.generation !== active.generation) throw conflict()
  const version = Number(db.pragma('user_version', { simple: true }))
  if (!isKnownLibrarySchemaVersion(version)) throw conflict()
  if (cmd.kind === 'list') return { version, intents: version >= 3 ? db.prepare("SELECT * FROM managed_download_intents WHERE library_identity=? AND (phase!='completed' AND COALESCE(error_code,'')!='ABANDONED' OR EXISTS (SELECT 1 FROM managed_download_chunks c WHERE c.task_id=managed_download_intents.task_id)) ORDER BY updated_at DESC").all(active.identity) as DownloadIntent[] : [] }
  if (cmd.kind === 'create') {
    if (!/^[a-zA-Z0-9-]{1,100}$/.test(cmd.taskId) || !cmd.fileName || cmd.fileName.length > 160 || /[\\/:\u0000-\u001f]/.test(cmd.fileName)) throw conflict()
    const url = new URL(cmd.url)
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.hash || cmd.url.length > 8192) throw conflict()
    // DDL and intent are one atomic admission; failure cannot leave a half upgrade.
    db.transaction(() => {
      enableDownloadJournal(db)
      const now = new Date().toISOString()
      db.prepare(`INSERT INTO managed_download_intents (task_id,library_identity,creation_generation,request_url,file_name,phase,revision,transfer_epoch,identity_encoding,committed_bytes,created_at,updated_at)
        VALUES (?,?,?,?,?,'pending',0,0,0,0,?,?)`).run(cmd.taskId, active.identity, active.generation, url.href, cmd.fileName, now, now)
    })()
    return { version: Number(db.pragma('user_version', { simple: true })), intent: get(cmd.taskId) }
  }
  if (version < 3) throw conflict()
  let row = get(cmd.taskId)
  if ('revision' in cmd && cmd.revision !== undefined && row.revision !== cmd.revision) throw conflict()
  const captured = () => !!db.prepare('SELECT 1 FROM capture_requests WHERE capture_request_identity=?').get(`capture-request:download:${row.task_id}:1`)
  const retained = () => Number((db.prepare('SELECT COALESCE(SUM(byte_length),0) AS bytes FROM managed_download_chunks WHERE task_id=?').get(row.task_id) as { bytes: number }).bytes)
  if (cmd.kind === 'retention') return { version, intent: row, retainedBytes: retained(), captureAccepted: captured() }
  if (row.error_code === 'ABANDONED' && !['abandon','cleanup'].includes(cmd.kind)) throw new ActiveLibraryHostError('library-operation-failed', '此任务已放弃，不能恢复下载。')
  if (cmd.kind === 'abandon' && row.phase !== 'completed') {
    if (captured()) throw new ActiveLibraryHostError('library-operation-failed', '该任务已有入库记录，请先恢复入库，再通过回收站管理素材。')
    if (row.error_code !== 'ABANDONED') {
      change(row, "phase='cancelled',error_code='ABANDONED',transfer_epoch=transfer_epoch+1,committed_bytes=0,total_bytes=NULL,strong_etag=NULL,content_sha256=NULL", [])
      row = get(row.task_id)
    }
  }
  if (cmd.kind === 'read') return { version, intent: row, bytes: await read(row) }
  if (cmd.kind === 'reset') {
    if (['downloaded', 'importing', 'completed', 'recovery-required'].includes(row.phase) ||
      (cmd.etag !== null && !/^"[\x21\x23-\x7e\x80-\xff]*"$/.test(cmd.etag)) || (cmd.etag?.length ?? 0) > 1024 ||
      (cmd.total !== null && (!Number.isSafeInteger(cmd.total) || cmd.total < 0 || cmd.total > MAX))) throw conflict()
    change(row, "phase='receiving',transfer_epoch=transfer_epoch+1,strong_etag=?,identity_encoding=1,total_bytes=?,committed_bytes=0,content_sha256=NULL", [cmd.etag, cmd.total])
    return { version, intent: get(row.task_id) }
  }
  if (cmd.kind === 'append') {
    const bytes = Buffer.from(cmd.bytes)
    if (row.phase !== 'receiving' || row.transfer_epoch !== cmd.epoch || row.committed_bytes !== cmd.offset || bytes.length < 1 || bytes.length > CHUNK ||
      row.committed_bytes + bytes.length > MAX || (row.total_bytes !== null && row.committed_bytes + bytes.length > row.total_bytes)) throw conflict()
    const role = await directory(true)
    const stamp = await directoryStamp(role)
    let usage = 0
    // Flat private namespace. Unknown files count against quota; links/subdirectories fail closed.
    const entries = await fs.readdir(role)
    if (entries.length > 8192) throw new ActiveLibraryHostError('library-operation-failed', '下载恢复空间已满。')
    for (const name of entries) { const st = await fs.lstat(path.join(role, name)); if (!st.isFile() || st.isSymbolicLink() || st.nlink !== 1) throw conflict(); usage += st.size }
    if (usage + bytes.length > QUOTA) throw new ActiveLibraryHostError('library-operation-failed', '下载恢复空间已满，请完成已有任务后重试。')
    const sha = digest(bytes)
    const name = `${digest(`${row.task_id}:${row.transfer_epoch}:${cmd.offset}:${sha}`)}-${randomUUID()}.chunk`
    const target = path.join(role, name)
    const file = await fs.open(target, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | (constants.O_NOFOLLOW ?? 0), 0o600)
    try { await file.writeFile(bytes); await file.sync() } finally { await file.close() }
    await assertExistingDirectoryInsideManagedRoot(active.root, role)
    if (await directoryStamp(role) !== stamp) throw conflict()
    const checked = await readVerifiedOwnedFile({ root: active.root, role, relative: name, expectedSize: bytes.length, expectedDigest: sha, maximumBytes: CHUNK })
    if (!checked.bytes.length) throw conflict()
    const dir = await fs.open(role, constants.O_RDONLY)
    try { await dir.sync() } finally { await dir.close() }
    const parent = await fs.open(active.staging, constants.O_RDONLY)
    try { await parent.sync() } finally { await parent.close() }
    db.transaction(() => {
      change(row, 'committed_bytes=committed_bytes+?', [bytes.length])
      db.prepare('INSERT INTO managed_download_chunks VALUES (?,?,?,?,?,?)').run(row.task_id, row.transfer_epoch, cmd.offset, bytes.length, sha, name)
    })()
    return { version, intent: get(row.task_id) }
  }
  if (cmd.kind === 'downloaded') {
    if (row.phase !== 'receiving' || row.committed_bytes < 1 || (row.total_bytes !== null && row.committed_bytes !== row.total_bytes)) throw conflict()
    const bytes = await read(row)
    change(row, "phase='downloaded',total_bytes=committed_bytes,content_sha256=?", [digest(bytes)])
    return { version, intent: get(row.task_id), bytes }
  }
  let releasedBytes = 0
  // Only retired, journal-referenced chunks can be released. Unknown/mismatching files remain.
  for (const chunk of chunks(row.task_id).filter(c => c.transfer_epoch !== row.transfer_epoch || row.phase === 'completed')) {
    try {
      const role = await directory(false)
      const checked = await verify(role, chunk)
      const again = await verify(role, chunk)
      if (checked.fileIdentity !== again.fileIdentity || JSON.stringify(checked.directoryIdentities) !== JSON.stringify(again.directoryIdentities)) continue
      await fs.unlink(path.join(role, chunk.chunk_identity)); releasedBytes += chunk.byte_length
      db.prepare('DELETE FROM managed_download_chunks WHERE task_id=? AND transfer_epoch=? AND start_offset=? AND chunk_identity=?').run(chunk.task_id, chunk.transfer_epoch, chunk.start_offset, chunk.chunk_identity)
    } catch { /* Preserve conflicts and references for inspection; do not touch unknown files. */ }
  }
  return { version, intent: row, releasedBytes, retainedBytes: retained() }

  function get(id: string): DownloadIntent {
    const result = db.prepare('SELECT * FROM managed_download_intents WHERE task_id=? AND library_identity=?').get(id, active.identity) as DownloadIntent | undefined
    if (!result) throw conflict()
    return result
  }
  function change(before: DownloadIntent, assignments: string, args: unknown[]) {
    const result = db.prepare(`UPDATE managed_download_intents SET ${assignments},revision=revision+1,updated_at=? WHERE task_id=? AND library_identity=? AND revision=? AND transfer_epoch=? AND committed_bytes=?`).run(...args, new Date().toISOString(), before.task_id, active.identity, before.revision, before.transfer_epoch, before.committed_bytes)
    if (result.changes !== 1) throw conflict()
  }
  function chunks(id: string) { return db.prepare('SELECT * FROM managed_download_chunks WHERE task_id=? ORDER BY transfer_epoch,start_offset').all(id) as Chunk[] }
  async function directory(create: boolean) {
    await assertExistingDirectoryInsideManagedRoot(active.root, active.staging)
    const role = path.join(active.staging, 'download-recovery')
    if (create) { try { await fs.mkdir(role, { mode: 0o700 }) } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error } }
    await assertExistingDirectoryInsideManagedRoot(active.root, role)
    return role
  }
  function verify(role: string, c: Chunk) {
    if (!/^[a-f0-9]{64}-[a-f0-9-]{36}\.chunk$/.test(c.chunk_identity) || !c.chunk_identity.startsWith(`${digest(`${c.task_id}:${c.transfer_epoch}:${c.start_offset}:${c.sha256}`)}-`)) throw conflict()
    return readVerifiedOwnedFile({ root: active.root, role, relative: c.chunk_identity, expectedSize: c.byte_length, expectedDigest: c.sha256, maximumBytes: CHUNK })
  }
  async function read(intent: DownloadIntent) {
    if (intent.committed_bytes > MAX || intent.committed_bytes < 0) throw conflict()
    const parts: Uint8Array[] = []; let offset = 0
    const rows = chunks(intent.task_id).filter(c => c.transfer_epoch === intent.transfer_epoch)
    for (const chunk of rows) {
      if (chunk.start_offset !== offset || offset + chunk.byte_length > intent.committed_bytes) throw conflict()
      parts.push((await verify(await directory(false), chunk)).bytes); offset += chunk.byte_length
    }
    if (offset !== intent.committed_bytes) throw conflict()
    const bytes = Buffer.concat(parts, offset)
    if (intent.content_sha256 && digest(bytes) !== intent.content_sha256) throw conflict()
    return bytes
  }
}
async function directoryStamp(role: string) { const s = await fs.lstat(role, { bigint: true }); if (!s.isDirectory() || s.isSymbolicLink()) throw conflict(); return `${s.dev}:${s.ino}:${s.mode}:${s.birthtimeNs}` }
