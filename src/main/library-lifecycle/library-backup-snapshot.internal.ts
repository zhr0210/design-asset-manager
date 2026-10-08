import Database from 'better-sqlite3'
import { createHash } from 'node:crypto'
import { inspectSerializedLibraryControlStore } from './library-open-control-store.internal'
import { assertLibraryDataSchema } from './library-materialization.internal'
import type { LibraryManifestDeclaration } from './library-manifest.tracer'
import { WINDOWS_BACKUP_PROFILE } from '../platform/windows-backup-profile.internal'

export const BACKUP_SNAPSHOT_MAX_BYTES = WINDOWS_BACKUP_PROFILE.maxImageBytes

/** Main-private, bounded serialized image; never qualifies its storage or process. */
export function verifyLibraryBackupSnapshot(image: Buffer, expected: {
  declaration: LibraryManifestDeclaration
  generation: string
  schemaVersion: number
  nativeReadbackSha256: string
}): { bytes: number; sha256: string; schemaVersion: number } {
  if (!Buffer.isBuffer(image) || image.length < 100 || image.length > BACKUP_SNAPSHOT_MAX_BYTES ||
    !/^[a-f0-9]{64}$/.test(expected.nativeReadbackSha256)) throw Error('BACKUP_SNAPSHOT_INVALID')
  const sha256 = createHash('sha256').update(image).digest('hex')
  if (sha256 !== expected.nativeReadbackSha256) throw Error('BACKUP_SNAPSHOT_INVALID')
  let database: Database.Database | undefined
  try {
    database = new Database(image, { readonly: true })
    database.pragma('query_only = ON')
    database.transaction(() => {
      const inspection = inspectSerializedLibraryControlStore(database!, expected.declaration)
      if (inspection.kind !== 'compatible' || inspection.generation !== expected.generation ||
        database!.pragma('user_version', { simple: true }) !== expected.schemaVersion) throw Error('BACKUP_SNAPSHOT_INVALID')
      assertLibraryDataSchema(database!)
      const foreignKeys = database!.pragma('foreign_key_check')
      if (!Array.isArray(foreignKeys) || foreignKeys.length !== 0) throw Error('BACKUP_SNAPSHOT_INVALID')
    })()
    return { bytes: image.length, sha256, schemaVersion: expected.schemaVersion }
  } catch { throw Error('BACKUP_SNAPSHOT_INVALID') }
  finally { database?.close() }
}
