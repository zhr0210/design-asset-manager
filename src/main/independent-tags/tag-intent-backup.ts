import fs from 'node:fs/promises'
import { constants, createReadStream } from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { qualifyMacLocalVolume } from '../library-lifecycle/mac-volume-qualification'
import type Database from 'better-sqlite3'
import { assertExistingDirectoryInsideManagedRoot } from '../platform/filesystem-guard'
import { openReadonlyLibraryDatabase } from '../library-lifecycle/readonly-library-database.internal'
import { assertLibraryDataSchema } from '../library-lifecycle/library-materialization.internal'
import { inspectLibraryControlStore } from '../library-lifecycle/library-open-control-store.internal'
import type { LibraryManifestDeclaration } from '../library-lifecycle/library-manifest.tracer'
import { LIBRARY_DATABASE_FILE } from '../library-lifecycle/library-layout.internal'
import { tagIntentFail, type TagIntentBinding } from './tag-intent-storage'

export const TAG_INTENT_GROWTH_BYTES = 4 * 1024 * 1024
const SAFETY = 64n * 1024n * 1024n
const SECTOR = 65536n
const VERIFIED_SQLITE_VERSION = '3.53.1'
// Qualified native artifact from C02B evidence. A different build needs fresh qualification.
const VERIFIED_NATIVE_SHA256 = 'a2cf78fc1ba336c9573768235098c82c9d35a1bd645415ea32926df23b202fb4'
const VERIFIED_SQLITE_SOURCE = '2026-05-05 10:34:17 c88b22011a54b4f6fbd149e9f8e4de77658ce58143a1af0e3785e4e6475127e9'
const localRequire = createRequire(typeof __filename === 'string' ? __filename : import.meta.url)
export interface TagIntentTestHooks {
  /** Fault injection only; production composition never provides these hooks. */
  availableBytes?: () => Promise<bigint>
  growthLimitBytes?: number
  afterBackup?: () => Promise<void>
  afterDdl?: () => void
  beforeCommit?: () => void
  afterCommit?: () => void
}
interface Binding extends TagIntentBinding { root: string; control: string; manifestDeclaration: LibraryManifestDeclaration }
interface Snapshot { size: bigint; dev: bigint; ino: bigint; mtimeNs: bigint; pages: number; pageSize: number; dataVersion: number; version: number }

export function tagIntentSpacePolicy(pages: number, pageSize: number, fileBytes: bigint, growthBytes = TAG_INTENT_GROWTH_BYTES) {
  if (!Number.isSafeInteger(pages) || pages < 1 || !Number.isSafeInteger(pageSize) || pageSize < 512 || pageSize > 65536 ||
    (pageSize & (pageSize - 1)) !== 0 || fileBytes < 0n || !Number.isSafeInteger(growthBytes) || growthBytes < 0 || growthBytes > TAG_INTENT_GROWTH_BYTES) return tagIntentFail('TAG_INTENT_SPACE_UNKNOWN')
  const n = BigInt(pages), p = BigInt(pageSize), g = BigInt(growthBytes)
  const b = fileBytes > n*p ? fileBytes : n*p
  const c = n + (g+p-1n)/p
  const journal = 2n*c*(p+8n+2n*SECTOR)+4n*SECTOR
  const beforeDdl = g+journal+SAFETY, beforeBackup = b+beforeDdl
  const pageCap = pages + Math.floor(growthBytes/pageSize)
  if (beforeBackup > BigInt(Number.MAX_SAFE_INTEGER) || !Number.isSafeInteger(pageCap) || pageCap > 4294967294) return tagIntentFail('TAG_INTENT_SPACE_UNKNOWN')
  return { beforeBackup, beforeDdl, pageCap, backupMaxBytes: b }
}

async function snapshot(a: Binding): Promise<Snapshot> {
  const db = a.database
  if (process.platform !== 'darwin' || db.inTransaction || db.pragma('journal_mode', { simple: true }) !== 'delete' ||
    (db.prepare('SELECT sqlite_version() AS version').get() as { version: string }).version !== VERIFIED_SQLITE_VERSION ||
    (db.prepare('SELECT sqlite_source_id() AS source').get() as { source: string }).source !== VERIFIED_SQLITE_SOURCE) return tagIntentFail('TAG_INTENT_BACKUP_UNSUPPORTED')
  const nativeFile=localRequire.resolve('better-sqlite3/build/Release/better_sqlite3.node')
  if (await digestFile(nativeFile)!==VERIFIED_NATIVE_SHA256 ||
    (await fs.statfs(a.control,{bigint:true})).type!==26n ||
    (await qualifyMacLocalVolume(a.control,a.identity)).kind!=='qualified') return tagIntentFail('TAG_INTENT_BACKUP_UNSUPPORTED')
  const attached = db.pragma('database_list') as Array<{ name: string }>
  if (attached.some(d => d.name !== 'main' && d.name !== 'temp')) return tagIntentFail('TAG_INTENT_BACKUP_UNSUPPORTED')
  await assertExistingDirectoryInsideManagedRoot(a.root,a.control)
  const stat = await fs.lstat(path.join(a.control,LIBRARY_DATABASE_FILE),{ bigint: true })
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1n) return tagIntentFail('TAG_INTENT_BACKUP_UNSUPPORTED')
  return { size: stat.size,dev:stat.dev,ino:stat.ino,mtimeNs:stat.mtimeNs,
    pages:Number(db.pragma('page_count',{ simple:true })),pageSize:Number(db.pragma('page_size',{ simple:true })),
    dataVersion:Number(db.pragma('data_version',{ simple:true })),version:Number(db.pragma('user_version',{ simple:true })) }
}
async function requireSpace(a: Binding, required: bigint, hooks?: TagIntentTestHooks) {
  const available = hooks?.availableBytes ? await hooks.availableBytes() : await fs.statfs(a.control,{ bigint:true }).then(s => s.bavail*s.bsize)
  if (available < 0n) return tagIntentFail('TAG_INTENT_SPACE_UNKNOWN')
  if (available < required) return tagIntentFail('TAG_INTENT_SPACE_REQUIRED')
}
async function digestFile(file: string): Promise<string> {
  const hash=createHash('sha256')
  const handle=await fs.open(file,constants.O_RDONLY|(constants.O_NOFOLLOW??0))
  try {
    for await (const chunk of createReadStream(file,{ fd:handle.fd,autoClose:false,highWaterMark:1024*1024 })) hash.update(chunk)
  } finally { await handle.close() }
  return hash.digest('hex')
}

/** Caller holds the actual lease, drains ordinary operations and serializes close throughout. */
export async function prepareTagIntentBackup(a: Binding, checkCurrent: () => void, signal?: AbortSignal, hooks?: TagIntentTestHooks) {
  checkCurrent(); if (signal?.aborted) return tagIntentFail('TAG_INTENT_SESSION_EXPIRED')
  const before=await snapshot(a),policy=tagIntentSpacePolicy(before.pages,before.pageSize,before.size,hooks?.growthLimitBytes)
  await requireSpace(a,policy.beforeBackup,hooks)
  const parent=path.join(a.control,'schema-backups')
  try { await fs.mkdir(parent,{ mode:0o700 }) } catch(error) { if((error as NodeJS.ErrnoException).code!=='EEXIST')throw error }
  await assertExistingDirectoryInsideManagedRoot(a.root,parent)
  const operation=await fs.mkdtemp(path.join(parent,'tag-intent-')),target=path.join(operation,'library.sqlite')
  const status=path.join(operation,'status.json')
  let verified: { sourceVersion:number; bytes:number; sha256:string } | undefined
  await fs.writeFile(status,JSON.stringify({ phase:'backing-up',sourceVersion:before.version }),{ flag:'wx',mode:0o600 })
  try {
    await a.database.backup(target,{ progress:() => { checkCurrent(); if(signal?.aborted)throw new Error('TAG_INTENT_CANCELLED');return 100 } })
    checkCurrent(); if(signal?.aborted)return tagIntentFail('TAG_INTENT_SESSION_EXPIRED')
    const stat=await fs.lstat(target,{ bigint:true })
    if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink!==1n || stat.size>policy.backupMaxBytes) return tagIntentFail('TAG_INTENT_BACKUP_INVALID')
    await fs.chmod(target,0o600)
    const checked=openReadonlyLibraryDatabase(target)
    try {
      const inspection=inspectLibraryControlStore(checked,a.manifestDeclaration)
      if (inspection.kind!=='compatible' || inspection.generation!==a.generation || Number(checked.pragma('user_version',{ simple:true }))!==before.version) return tagIntentFail('TAG_INTENT_BACKUP_INVALID')
      assertLibraryDataSchema(checked)
    } finally { checked.close() }
    const sha256=await digestFile(target)
    const afterHash=await fs.lstat(target,{ bigint:true })
    if (!afterHash.isFile() || afterHash.isSymbolicLink() || afterHash.nlink!==1n || afterHash.dev!==stat.dev || afterHash.ino!==stat.ino || afterHash.size!==stat.size || afterHash.mtimeNs!==stat.mtimeNs) return tagIntentFail('TAG_INTENT_BACKUP_INVALID')
    const handle=await fs.open(target,'r');try { await handle.sync() } finally { await handle.close() }
    verified={ sourceVersion:before.version,bytes:Number(stat.size),sha256 }
    await fs.writeFile(status,JSON.stringify({ phase:'verified',...verified }),{ mode:0o600 })
    for (const dir of [operation,parent]) { const handle=await fs.open(dir,'r');try { await handle.sync() } finally { await handle.close() } }
    await hooks?.afterBackup?.()
    checkCurrent(); if(signal?.aborted)return tagIntentFail('TAG_INTENT_SESSION_EXPIRED')
    const after=await snapshot(a)
    if (Object.keys(before).some(key => before[key as keyof Snapshot]!==after[key as keyof Snapshot])) return tagIntentFail('TAG_INTENT_SOURCE_CHANGED')
    await requireSpace(a,policy.beforeDdl,hooks)
    return { pageCap:policy.pageCap }
  } catch(error) {
    let partial='inspection-unavailable'
    try { const s=await fs.lstat(target);partial=s.isFile()&&!s.isSymbolicLink()&&s.nlink===1?'surviving-unverified':'unsafe-unverified' }
    catch(e) { if((e as NodeJS.ErrnoException).code==='ENOENT')partial='absent' }
    await fs.writeFile(status,JSON.stringify(verified ? { phase:'verified-operation-interrupted',...verified } : { phase:'failed-or-cancelled',sourceVersion:before.version,partial }),{ mode:0o600 }).catch(()=>{})
    throw error
  }
}

export function withTagIntentGrowthCap<T>(db: Database.Database, pageCap: number, operation: () => T): T {
  const oldCap=Number(db.pragma('max_page_count',{ simple:true })),oldSpill=Number(db.pragma('cache_spill',{ simple:true }))
  try {
    db.pragma('cache_spill = OFF')
    const target=Math.min(oldCap,pageCap)
    if (Number(db.pragma(`max_page_count = ${target}`,{ simple:true }))!==target) return tagIntentFail('TAG_INTENT_GROWTH_CAP_FAILED')
    return operation()
  } finally {
    let failed=false
    try { db.pragma(`cache_spill = ${oldSpill}`);if(Number(db.pragma('cache_spill',{simple:true}))!==oldSpill)failed=true } catch { failed=true }
    try { if(Number(db.pragma(`max_page_count = ${oldCap}`,{simple:true}))!==oldCap)failed=true } catch { failed=true }
    if(failed)return tagIntentFail('TAG_INTENT_SETTINGS_RESTORE_FAILED')
  }
}
