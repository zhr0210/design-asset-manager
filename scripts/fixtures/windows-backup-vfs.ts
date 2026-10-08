import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {createHash} from 'node:crypto'
import type Database from 'better-sqlite3'
import {captureWindowsBackupConnection, validateWindowsBackupSource, type WindowsBackupSourceEvidence} from '../../src/main/platform/windows-backup-source.internal'
import {buildWindowsQualificationNative, type WindowsNativeQualificationArtifact} from './windows-native-qualification-build'
import {prepareWindowsBackupHelper, getPreparedWindowsBackupNativeLoader} from './windows-backup-helper-process'
import {withGuardedWindowsNativeArtifact} from './windows-backup-native-load'

const source = path.resolve('scripts/fixtures/windows-backup-vfs-extension.c')
const headers = ['sqlite3.h', 'sqlite3ext.h'].map(name => path.resolve('node_modules/better-sqlite3/deps/sqlite3', name))
const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex')
let prepared: (WindowsNativeQualificationArtifact & {headersSha256: string}) | undefined
let preparation: Promise<void> | undefined
const loaded = new WeakSet<Database.Database>()

/** A captured local compile is test preparation; this never rebuilds SQLite. */
export async function prepareWindowsBackupVfs(): Promise<void> {
  preparation ??= (async () => {
    await prepareWindowsBackupHelper()
    const bytes = await Promise.all(headers.map(file => fs.readFile(file)))
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'dam-native-vfs-headers-'))
    await Promise.all(bytes.map((value, index) => fs.writeFile(path.join(directory, path.basename(headers[index])), value, {flag: 'wx'})))
    const artifact = await buildWindowsQualificationNative({sourcePath: source, outputName: 'dam-vfs-pin.dll',
      libraries: ['bcrypt.lib'], includeDirectories: [directory]})
    prepared = {...artifact, headersSha256: sha(Buffer.concat(bytes))}
  })()
  try {await preparation} catch (error) {preparation = undefined; throw error}
}

/** Guarded per-connection DLL loading is test preparation. Complete it before
 * reserving a backup Runtime permit; pin/serialize never starts a guardian. */
export async function prepareWindowsBackupVfsConnection(db: Database.Database): Promise<void> {
  const artifact = prepared
  if (!artifact) throw Error('BACKUP_VFS_NOT_PRECOMPILED')
  if (loaded.has(db)) return
  const native = getPreparedWindowsBackupNativeLoader()
  await withGuardedWindowsNativeArtifact(artifact, {
    load: pin => {
      native.verifyTransferredPins(pin.hostPins, artifact.artifactSha256)
      db.loadExtension(artifact.path)
    }, closeTransferredHandles: handles => native.closeTransferredHandles(handles)
  })
  loaded.add(db)
}

export interface WindowsBackupVfsPin {
  readonly before: WindowsBackupSourceEvidence
  readonly artifact: Readonly<{artifactSha256: string; sourceSha256: string; compilerSha256: string; headersSha256: string}>
  /** Reads the retained source and verifies current SQLite main VFS identity. */
  recheck(): WindowsBackupSourceEvidence
  close(): void
}

/** Synthetic-only qualification. The extension pins the actual main VFS file
 * object before serialize, and also retains a separate read-only no-delete
 * source handle reached through no-reparse component handles. */
export async function pinWindowsBackupVfsSource(db: Database.Database, control: string): Promise<WindowsBackupVfsPin> {
  const artifact = prepared
  if (!artifact) throw Error('BACKUP_VFS_NOT_PRECOMPILED')
  const connection = captureWindowsBackupConnection(db, control, db.readonly && db.inTransaction ? 'readonly-transaction' : 'settled')
  const [sourceBytes, outputBytes, ...headerBytes] = await Promise.all([fs.readFile(source), fs.readFile(artifact.path), ...headers.map(file => fs.readFile(file))])
  if (sha(sourceBytes) !== artifact.sourceSha256 || sha(outputBytes) !== artifact.artifactSha256 ||
    sha(Buffer.concat(headerBytes)) !== artifact.headersSha256) throw Error('BACKUP_VFS_PRECOMPILED_INPUT_CHANGED')
  if (!loaded.has(db)) throw Error('BACKUP_VFS_CONNECTION_NOT_PREPARED')
  const read = () => {
    const value = db.prepare("SELECT dam_windows_backup_vfs('read',NULL)").pluck().get()
    const evidence = JSON.parse(String(value)) as WindowsBackupSourceEvidence
    validateWindowsBackupSource(evidence, captureWindowsBackupConnection(db, control, db.readonly && db.inTransaction ? 'readonly-transaction' : 'settled'))
    return evidence
  }
  const before = JSON.parse(String(db.prepare("SELECT dam_windows_backup_vfs('pin',?)").pluck().get(path.resolve(control, 'library.sqlite')))) as WindowsBackupSourceEvidence
  try {validateWindowsBackupSource(before, connection)} catch (error) {db.prepare("SELECT dam_windows_backup_vfs('close',NULL)").get(); throw error}
  let closed = false
  return {before, artifact: {artifactSha256: artifact.artifactSha256, sourceSha256: artifact.sourceSha256,
    compilerSha256: artifact.compilerSha256, headersSha256: artifact.headersSha256},
  recheck: () => {assert.equal(closed, false, 'VFS pin already released'); return read()},
  close: () => {if (!closed) {closed = true; if (db.open) db.prepare("SELECT dam_windows_backup_vfs('close',NULL)").get()}}}
}

/** VFS/native target evidence must agree on object identity and the complete
 * settled bytes; available space may change between observations. */
export function requireWindowsBackupVfsMatch(vfs: WindowsBackupSourceEvidence, source: WindowsBackupSourceEvidence): void {
  if ((['volume', 'file', 'size', 'created', 'written', 'links', 'sha256', 'filesystem'] as const).some(key => vfs[key] !== source[key]))
    throw Error('BACKUP_VFS_RETAINED_SOURCE_MISMATCH')
}
