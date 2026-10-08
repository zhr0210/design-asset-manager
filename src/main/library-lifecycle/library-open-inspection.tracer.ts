import { createHash } from 'node:crypto'
import { constants, type BigIntStats } from 'node:fs'
import { lstat, open, realpath } from 'node:fs/promises'
import path from 'node:path'

import type Database from 'better-sqlite3'

import { createExclusiveLibraryLockTracer } from './exclusive-library-lock.tracer'
import {
  classifyLibraryFilesystemQualification,
  libraryFilesystemScopeIdentity,
  observeLibraryControlBoundary,
  observeLibraryFilesystemRoles,
  sameLibraryFilesystemObservation,
  type LibraryFilesystemObservation
} from './library-filesystem.tracer'
import { readLibraryManifestDeclaration } from './library-manifest.tracer'
import { hasLegacyLibrarySchema, inspectLibraryControlStore } from './library-open-control-store.internal'
import { createLibraryStartTracer } from './library-start.tracer'
import { readExactPlainDataRecord } from './plain-data-record.internal'
import {
  openReadonlyLibraryDatabase,
  sqliteRecoverySidecarsAbsent
} from './readonly-library-database.internal'

export interface LibraryOpenQualificationInput {
  readonly platform: NodeJS.Platform
  readonly libraryRootDirectory: string
  readonly scopeIdentity: string
  readonly inspectionIdentity: string
  readonly lineageIdentity: string
  readonly libraryIdentity: string
  readonly controlStoreIdentity: string
  readonly generation: string
}

/** Trusted read-only Main evidence; a fixture observation is not real volume qualification. */
export interface LibraryOpenQualificationAdapter {
  inspect(input: LibraryOpenQualificationInput): unknown | Promise<unknown>
}

export interface LibraryOpenInspectionTracerInput {
  libraryRootDirectory: string
  libraryControlDirectory: string
  qualification: LibraryOpenQualificationAdapter
}

interface Configuration {
  readonly root: string
  readonly control: string
  readonly inspectQualification: LibraryOpenQualificationAdapter['inspect']
}

const MAX_MANIFEST_BYTES = 16 * 1024
const MAX_CONTROL_BYTES = 16 * 1024 * 1024
// Database size is observed with lstat; it is not loaded into a Buffer.
// Keep lock/metadata bounds narrow while admitting measured large Managed stores.
const MAX_LIBRARY_DATABASE_BYTES = 512 * 1024 * 1024
const LEGACY_DATABASE_FILE = 'design_asset_manager.db'
const recoveryRequiredObservation = Object.freeze({
  kind: 'portable', compatibility: 'compatible', integrity: 'recovery-required',
  filesystem: 'not-assessed', lock: 'not-assessed'
})

/** One existing Library Start Interface; no writer acquisition or Session construction. */
export function createLibraryOpenInspectionTracer(input: LibraryOpenInspectionTracerInput) {
  let configuration: Configuration | undefined
  try {
    const { libraryRootDirectory: root, libraryControlDirectory: control, qualification } = input
    if (typeof root === 'string' && typeof control === 'string') {
      configuration = Object.freeze({
        root, control, inspectQualification: qualification.inspect.bind(qualification)
      })
    }
  } catch {
    // Invalid trusted composition produces only the existing non-opening result.
  }
  return createLibraryStartTracer({ observe: () => configuration
    ? inspectSelectedLibrary(configuration) : { kind: 'not-assessed' } })
}

async function inspectSelectedLibrary(configuration: Configuration): Promise<unknown> {
  if (!['darwin', 'win32'].includes(process.platform)) return { kind: 'not-assessed' }
  let database: Database.Database | undefined
  try {
    let boundary: Awaited<ReturnType<typeof observeLibraryControlBoundary>>
    try {
      boundary = await observeLibraryControlBoundary(configuration.root, configuration.control)
    } catch (error) {
      return isUnavailable(error) ? inspectMissingControl(configuration) : recoveryRequiredObservation
    }
    const legacyFile = path.join(boundary.root.real, LEGACY_DATABASE_FILE)
    if (!await isAbsent(legacyFile)) return recoveryRequiredObservation
    const manifestFile = path.join(boundary.control.real, 'library.manifest.json')
    const manifest = await readManifestFile(manifestFile)
    const parsed = readLibraryManifestDeclaration(manifest.bytes)
    if (parsed.kind !== 'compatible') {
      return { kind: parsed.kind === 'unsupported' ? 'manifest-unsupported' : 'manifest-invalid' }
    }
    const declaration = parsed.declaration
    const roleInput = {
      libraryRootDirectory: configuration.root,
      libraryControlDirectory: configuration.control,
      managedOriginalsDirectory: path.join(configuration.root, declaration.managedOriginalsRelativePath)
    }
    let roles: LibraryFilesystemObservation
    try {
      roles = await observeLibraryFilesystemRoles(roleInput)
    } catch (error) {
      return isUnavailable(error) ? { kind: 'unavailable' } : recoveryRequiredObservation
    }
    if (!sameLibraryFilesystemObservation({ ...boundary, managed: roles.managed }, roles)) return recoveryRequiredObservation
    const databaseFile = path.join(roles.control.real, 'library.sqlite')
    const lockFile = path.join(roles.control.real, 'exclusive-library-lock.sqlite')
    const databaseStamp = await readFileStamp(databaseFile, MAX_LIBRARY_DATABASE_BYTES)
    const lockStamp = await readFileStamp(lockFile, MAX_CONTROL_BYTES)
    database = openReadonlyLibraryDatabase(databaseFile)
    const store = inspectLibraryControlStore(database, declaration)
    if (store.kind !== 'compatible') {
      return store.kind === 'unsupported' ? { kind: 'manifest-unsupported' } : recoveryRequiredObservation
    }
    const lockStorage = createExclusiveLibraryLockTracer({
      controlDirectory: roles.control.real,
      libraryIdentity: declaration.libraryIdentity,
      libraryGeneration: store.generation
    })
    if (lockStorage.inspect().kind !== 'storage-valid') return recoveryRequiredObservation

    const qualificationInput: LibraryOpenQualificationInput = Object.freeze({
      platform: process.platform,
      libraryRootDirectory: roles.root.real,
      scopeIdentity: libraryFilesystemScopeIdentity(roles),
      inspectionIdentity: inspectionIdentity(roles, manifest.stamp, databaseStamp, lockStamp, store.generation),
      lineageIdentity: declaration.lineageIdentity,
      libraryIdentity: declaration.libraryIdentity,
      controlStoreIdentity: declaration.controlStoreIdentity,
      generation: store.generation
    })
    let rawQualification: unknown
    try {
      rawQualification = await configuration.inspectQualification(qualificationInput)
    } catch {
      rawQualification = null
    }
    const assessment = assessQualification(roles, qualificationInput, rawQualification)

    const finalRoles = await observeLibraryFilesystemRoles(roleInput)
    const finalManifest = await readManifestFile(manifestFile)
    const finalStore = inspectLibraryControlStore(database, declaration)
    if (!sameLibraryFilesystemObservation(roles, finalRoles) ||
      manifest.stamp !== finalManifest.stamp || manifest.digest !== finalManifest.digest ||
      databaseStamp !== await readFileStamp(databaseFile, MAX_LIBRARY_DATABASE_BYTES) ||
      lockStamp !== await readFileStamp(lockFile, MAX_CONTROL_BYTES) ||
      !await isAbsent(legacyFile) ||
      !sqliteRecoverySidecarsAbsent(databaseFile) ||
      finalStore.kind !== 'compatible' || finalStore.generation !== store.generation ||
      lockStorage.inspect().kind !== 'storage-valid') return recoveryRequiredObservation
    return assessment
  } catch {
    return recoveryRequiredObservation
  } finally {
    try {
      if (database?.open) database.close()
    } catch {
      throw new Error('Library read inspection could not close its snapshot.')
    }
  }
}

async function inspectMissingControl(configuration: Configuration): Promise<unknown> {
  let database: Database.Database | undefined
  try {
    const root = await lstat(configuration.root, { bigint: true })
    if (!root.isDirectory() || root.isSymbolicLink()) return recoveryRequiredObservation
    if (!await isAbsent(configuration.control)) return recoveryRequiredObservation
    const canonicalRoot = await realpath(configuration.root)
    const file = path.join(canonicalRoot, LEGACY_DATABASE_FILE)
    if (await isAbsent(file)) return { kind: 'not-assessed' }
    const fileBefore = await readFileStamp(file, MAX_CONTROL_BYTES)
    database = openReadonlyLibraryDatabase(file)
    const legacy = hasLegacyLibrarySchema(database)
    if (stamp(await lstat(configuration.root, { bigint: true })) !== stamp(root) ||
      await realpath(configuration.root) !== canonicalRoot ||
      !await isAbsent(configuration.control) ||
      fileBefore !== await readFileStamp(file, MAX_CONTROL_BYTES) ||
      !sqliteRecoverySidecarsAbsent(file)) return recoveryRequiredObservation
    return { kind: legacy ? 'legacy' : 'not-assessed' }
  } catch (error) {
    return isUnavailable(error) ? { kind: 'unavailable' } : recoveryRequiredObservation
  } finally {
    if (database?.open) database.close()
  }
}

async function isAbsent(file: string): Promise<boolean> {
  try {
    await lstat(file)
    return false
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') return true
    throw error
  }
}

function assessQualification(
  roles: LibraryFilesystemObservation,
  expected: LibraryOpenQualificationInput,
  value: unknown
): unknown {
  const record = readExactPlainDataRecord(value, [
    'inspectionIdentity', 'generation', 'filesystem', 'access', 'lock'
  ])
  if (!record) return { kind: 'not-assessed' }
  if (record.inspectionIdentity !== expected.inspectionIdentity || record.generation !== expected.generation) {
    return recoveryRequiredObservation
  }
  const filesystem = classifyLibraryFilesystemQualification(roles, record.filesystem, expected.scopeIdentity)
  const access = filesystem.kind === 'filesystem-unsupported' ? 'unsupported'
    : filesystem.kind !== 'filesystem-observed' ? 'not-assessed'
    : record.access === 'read-write' ? 'qualified'
    : record.access === 'read-only' ? 'read-only' : 'not-assessed'
  const lock = record.lock === 'available' || record.lock === 'busy' ? record.lock : 'not-assessed'
  return {
    kind: 'portable', compatibility: 'compatible', integrity: 'intact',
    filesystem: access, lock
  }
}

async function readFileStamp(file: string, maximum: number): Promise<string> {
  const stat = await lstat(file, { bigint: true })
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size <= 0n || stat.size > BigInt(maximum) ||
    await realpath(file) !== path.resolve(file)) throw new Error('LIBRARY_INSPECTION_FILE_INVALID')
  return stamp(stat)
}

async function readManifestFile(file: string): Promise<Readonly<{
  bytes: Uint8Array
  digest: string
  stamp: string
}>> {
  const before = await readFileStamp(file, MAX_MANIFEST_BYTES)
  const handle = await open(file, constants.O_RDONLY | constants.O_NOFOLLOW)
  try {
    const start = await handle.stat({ bigint: true })
    if (stamp(start) !== before || !start.isFile()) throw new Error('LIBRARY_MANIFEST_CHANGED')
    const buffer = Buffer.alloc(Number(start.size) + 1)
    let count = 0
    while (count < buffer.length) {
      const read = await handle.read(buffer, count, buffer.length - count, count)
      if (read.bytesRead === 0) break
      count += read.bytesRead
    }
    if (count !== Number(start.size) || stamp(await handle.stat({ bigint: true })) !== before ||
      await readFileStamp(file, MAX_MANIFEST_BYTES) !== before) throw new Error('LIBRARY_MANIFEST_CHANGED')
    const bytes = new Uint8Array(buffer.subarray(0, count))
    return { bytes, digest: createHash('sha256').update(bytes).digest('hex'), stamp: before }
  } finally {
    await handle.close()
  }
}

function stamp(stat: BigIntStats): string {
  return [stat.dev, stat.ino, stat.mode, stat.birthtimeNs, stat.mtimeNs, stat.ctimeNs, stat.size]
    .map(String).join(':')
}

function isUnavailable(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error &&
    ['ENOENT', 'ENOTDIR', 'EACCES', 'EPERM', 'ENODEV'].includes(String(error.code)))
}

function inspectionIdentity(
  roles: LibraryFilesystemObservation,
  manifestStamp: string,
  databaseStamp: string,
  lockStamp: string,
  generation: string
): string {
  const nodes = [roles.root, roles.control, roles.managed].map((role) =>
    Object.values(role.node).map(String))
  return `inspection:${createHash('sha256')
    .update(JSON.stringify([nodes, manifestStamp, databaseStamp, lockStamp, generation]))
    .digest('hex')}`
}
