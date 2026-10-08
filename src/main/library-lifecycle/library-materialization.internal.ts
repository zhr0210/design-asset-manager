import {applyBackgroundOcrSchema} from '../background-ocr/background-ocr.schema'
import {applyBasicAnalysisSchema} from '../background-analysis/basic-analysis.schema'
import {applyBackgroundAnalysisSchema} from '../background-analysis/background-analysis.schema'
import {applyTagDecisionSchema} from '../independent-tags/tag-decision.schema'
import {applyTagExecutionSchema} from '../independent-tags/tag-execution.schema'
import { applyTagIntentSchema } from '../independent-tags/tag-intent.schema'
import {enableOcrStorage} from '../ocr/ocr.schema'
import {enableWorkSetStorage} from './work-set.schema'
import {enableOrganizationStorage} from './library-organization.schema'
import {enableNotebookStorage} from './asset-notebook.schema'
import { enableIntakeRecoveryStorage } from './intake-recovery.schema'
import { enableDownloadJournal } from '../managed-download/download-journal.schema'
import fs from 'node:fs/promises'
import path from 'node:path'
import Database from 'better-sqlite3'
import { ActiveLibraryHostError } from '../../shared/contracts/active-library.contract'
import { enableVisualAiStorage } from '../visual-ai/visual-ai-storage'
import { initializeLibraryControlStore } from './library-open-control-store.internal'
import { createExclusiveLibraryLockTracer, initializeExclusiveLibraryLockStorage } from './exclusive-library-lock.tracer'
import { initializeSqliteAssetTrashSchema } from './sqlite-asset-trash.schema'
import {applyWorkMediaSchema} from '../work-mode/work-media.schema'
import { encodeLibraryManifestDeclaration } from './library-manifest.tracer'
import type { LibraryCreationReview } from './library-creation-planner'
import { LIBRARY_DATABASE_FILE, MANIFEST_FILE, CONTROL_DIRECTORY_NAME, ORIGINALS_DIRECTORY_NAME, PREVIEW_DIRECTORY_NAME, STAGING_DIRECTORY_NAME } from './library-layout.internal'
import {
  CREATE_ASSET_TAGS_TABLE,
  CREATE_TAGS_TABLE,
  CREATE_TAG_ALIASES_TABLE,
  CREATE_TAG_RELATIONS_TABLE,
  CREATE_TAG_GROUPS_TABLE,
  CREATE_TAG_GROUP_ITEMS_TABLE,
  CREATE_TAG_SUGGESTIONS_TABLE,
  initializeCaptureIntakeSchema
} from '../db/schema'

interface OwnedEntry {
  path: string
  kind: 'file' | 'directory'
  node: { dev: bigint; ino: bigint; mode: bigint; birthtimeNs: bigint }
}

export interface MaterializedLibrary {
  root: string
  targetState: 'missing' | 'empty'
  ownedEntries: OwnedEntry[]
}

export async function materializeLibrary(targetDirectory: string, review: LibraryCreationReview, receipt: string, onCreationClaimed?: (rootDirectory: string) => void | Promise<void>, onBootstrapLocked?: (controlDirectory: string) => void | Promise<void>): Promise<MaterializedLibrary> {
  const target = path.resolve(targetDirectory)
  const rootState = review.targetState
  const root = target
  const ownedEntries: OwnedEntry[] = []
  if (rootState === 'missing') {
    await fs.mkdir(root)
    ownedEntries.push(await ownedEntry(root, 'directory'))
  } else {
    const claimPath = path.join(root, `.dam-create-${safeClaimFileName(receipt)}.claim`)
    const handle = await fs.open(claimPath, 'wx')
    await handle.close()
    ownedEntries.push(await ownedEntry(claimPath, 'file'))
  }
  try {
    await onCreationClaimed?.(root)
    const control = path.join(root, CONTROL_DIRECTORY_NAME)
    const managed = path.join(root, ORIGINALS_DIRECTORY_NAME)
    const previews = path.join(control, PREVIEW_DIRECTORY_NAME)
    const staging = path.join(control, STAGING_DIRECTORY_NAME)
    await fs.mkdir(control)
    ownedEntries.push(await ownedEntry(control, 'directory'))
    await fs.mkdir(managed)
    ownedEntries.push(await ownedEntry(managed, 'directory'))
    await fs.mkdir(previews)
    ownedEntries.push(await ownedEntry(previews, 'directory'))
    await fs.mkdir(staging)
    ownedEntries.push(await ownedEntry(staging, 'directory'))
    const manifest = encodeLibraryManifestDeclaration({ lineageIdentity: review.identities.lineageIdentity, libraryIdentity: review.identities.libraryIdentity, controlStoreIdentity: review.identities.controlStoreIdentity, managedOriginalsRelativePath: ORIGINALS_DIRECTORY_NAME })
    if (!manifest) throw new Error('MANIFEST_INVALID')
    const manifestPath = path.join(control, MANIFEST_FILE)
    await fs.writeFile(manifestPath, manifest, { flag: 'wx' })
    ownedEntries.push(await ownedEntry(manifestPath, 'file'))
    const databasePath = path.join(control, LIBRARY_DATABASE_FILE)
    const databaseDescriptor = await fs.open(databasePath, 'wx')
    await databaseDescriptor.close()
    ownedEntries.push(await ownedEntry(databasePath, 'file'))
    const database = new Database(databasePath, { fileMustExist: true })
    try {
      initializeLibraryControlStore(database, { ...review.identities, managedOriginalsRelativePath: ORIGINALS_DIRECTORY_NAME })
    } finally { database.close() }
    initializeExclusiveLibraryLockStorage(control, review.identities.libraryIdentity, review.identities.generation)
    const lockPath = path.join(control, 'exclusive-library-lock.sqlite')
    ownedEntries.push(await ownedEntry(lockPath, 'file'))
    if (!await ownsEntry(ownedEntries.find((entry) => entry.path === lockPath)!)) throw new ActiveLibraryHostError('library-recovery-required', 'The new Library lock claim changed.')
    const bootstrapAuthority = createExclusiveLibraryLockTracer({
      controlDirectory: control,
      libraryIdentity: review.identities.libraryIdentity,
      libraryGeneration: review.identities.generation
    })
    const acquired = await bootstrapAuthority.acquire()
    if (acquired.kind !== 'acquired') throw new ActiveLibraryHostError('library-lock-invalid', 'The new Library write authority could not be acquired.')
    let released = false
    try {
      await onBootstrapLocked?.(control)
      const result = await acquired.lock.lease.runWhileHeld(async () => {
        if (!await ownsEntry(ownedEntries.find((entry) => entry.path === databasePath)!)) throw new ActiveLibraryHostError('library-recovery-required', 'The new Library database claim changed.')
        const dataDatabase = new Database(databasePath, { fileMustExist: true, timeout: 0 })
        try { initializeLibraryDataSchema(dataDatabase) } finally { dataDatabase.close() }
        return true
      })
      if (result.kind !== 'completed') throw new ActiveLibraryHostError('library-lock-invalid', 'The new Library write authority could not be acquired.')
      await acquired.lock.release()
      released = true
    } catch (error) {
      if (!released) {
        try { await acquired.lock.release(); released = true } catch { throw new ActiveLibraryHostError('library-recovery-required', 'The new Library bootstrap lock could not be safely released.') }
      }
      throw error
    }
    await assertExpectedCreationContents(root, control, managed, previews, staging, rootState, ownedEntries)
    const claim = ownedEntries.find((entry) => entry.path.endsWith('.claim'))
    if (claim) {
      if (!await removeOwnedEntry(claim)) throw new Error('CREATION_CLAIM_LOST')
      ownedEntries.splice(ownedEntries.indexOf(claim), 1)
    }
    return { root: target, targetState: rootState, ownedEntries }
  } catch (error) {
    const cleaned = await rollbackOwnedEntries(ownedEntries)
    if (!cleaned) throw new ActiveLibraryHostError('library-recovery-required', 'The new Library creation claim could not be safely recovered.')
    throw error
  }
}

function safeClaimFileName(receipt: string): string {
  return receipt.replace(/[^A-Za-z0-9._-]/gu, '-')
}

export async function rollbackMaterializedLibrary(materialized: MaterializedLibrary): Promise<boolean> {
  return rollbackOwnedEntries(materialized.ownedEntries)
}

async function assertExpectedCreationContents(
  root: string,
  control: string,
  managed: string,
  previews: string,
  staging: string,
  targetState: 'missing' | 'empty',
  ownedEntries: readonly OwnedEntry[]
): Promise<void> {
  const claim = ownedEntries.find((entry) => entry.path.endsWith('.claim'))
  await assertExactChildren(root, [CONTROL_DIRECTORY_NAME, ORIGINALS_DIRECTORY_NAME, ...(claim ? [path.basename(claim.path)] : [])], targetState === 'empty' ? 'creation-claim' : 'creation-root')
  await assertExactChildren(control, [MANIFEST_FILE, LIBRARY_DATABASE_FILE, 'exclusive-library-lock.sqlite', PREVIEW_DIRECTORY_NAME, STAGING_DIRECTORY_NAME], 'control-directory')
  await assertExactChildren(managed, [], 'managed-originals')
  await assertExactChildren(previews, [], 'required-previews')
  await assertExactChildren(staging, [], 'intake-staging')
}

async function assertExactChildren(directory: string, expected: readonly string[], label: string): Promise<void> {
  const actual = (await fs.readdir(directory)).sort()
  const sortedExpected = [...expected].sort()
  if (actual.length !== sortedExpected.length || actual.some((name, index) => name !== sortedExpected[index])) throw new ActiveLibraryHostError('library-recovery-required', `The ${label} creation claim changed.`)
}

async function rollbackOwnedEntries(entries: readonly OwnedEntry[]): Promise<boolean> {
  let safe = true
  for (const entry of [...entries].reverse()) {
    if (!await removeOwnedEntry(entry)) safe = false
  }
  return safe
}

async function ownedEntry(entryPath: string, kind: OwnedEntry['kind']): Promise<OwnedEntry> {
  const stat = await fs.lstat(entryPath, { bigint: true })
  if ((kind === 'directory' && !stat.isDirectory()) || (kind === 'file' && !stat.isFile()) || stat.isSymbolicLink()) throw new Error('CREATION_CLAIM_INVALID')
  return { path: entryPath, kind, node: { dev: stat.dev, ino: stat.ino, mode: stat.mode, birthtimeNs: stat.birthtimeNs } }
}

async function ownsEntry(entry: OwnedEntry): Promise<boolean> {
  try {
    const stat = await fs.lstat(entry.path, { bigint: true })
    return !stat.isSymbolicLink() && stat.isDirectory() === (entry.kind === 'directory') &&
      stat.dev === entry.node.dev && stat.ino === entry.node.ino && stat.mode === entry.node.mode && stat.birthtimeNs === entry.node.birthtimeNs
  } catch {
    return false
  }
}

async function removeOwnedEntry(entry: OwnedEntry): Promise<boolean> {
  try {
    const stat = await fs.lstat(entry.path, { bigint: true })
    if (stat.isSymbolicLink() || stat.isDirectory() !== (entry.kind === 'directory') ||
      stat.dev !== entry.node.dev || stat.ino !== entry.node.ino || stat.mode !== entry.node.mode || stat.birthtimeNs !== entry.node.birthtimeNs) return false
    if (entry.kind === 'directory' && (await fs.readdir(entry.path)).length !== 0) return false
    if (entry.kind === 'directory') await fs.rmdir(entry.path)
    else await fs.unlink(entry.path)
    return true
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') return true
    return false
  }
}

export function initializeLibraryDataSchema(database: Database.Database): void {
  database.pragma('foreign_keys = ON')
  initializeCaptureIntakeSchema(database)
  database.exec('ALTER TABLE assets ADD COLUMN last_tag_updated_at TEXT')
  database.exec('ALTER TABLE assets ADD COLUMN ai_caption TEXT')
  database.exec('ALTER TABLE assets ADD COLUMN ai_caption_is_user_edited INTEGER NOT NULL DEFAULT 0 CHECK (ai_caption_is_user_edited IN (0, 1))')
  database.exec('ALTER TABLE assets ADD COLUMN ai_caption_updated_at TEXT')
  database.exec([
    CREATE_TAGS_TABLE, CREATE_ASSET_TAGS_TABLE, CREATE_TAG_ALIASES_TABLE,
    CREATE_TAG_RELATIONS_TABLE, CREATE_TAG_GROUPS_TABLE,
    CREATE_TAG_GROUP_ITEMS_TABLE, CREATE_TAG_SUGGESTIONS_TABLE
  ].join('\n'))
  initializeSqliteAssetTrashSchema(database)
  // Keep the first Active Library closed to AI: no worker/task tables or queue is initialized.
  database.pragma('user_version = 1')
}

export function assertLibraryDataSchema(database: Database.Database): void {
  if (database.pragma('foreign_keys', { simple: true }) !== 1 || database.pragma('quick_check(1)', { simple: true }) !== 'ok') throw new ActiveLibraryHostError('library-schema-invalid', 'The Active Library schema is unavailable.')
  const expected = new Database(':memory:')
  try {
    initializeLibraryControlStore(expected, {
      lineageIdentity: 'lineage:expected', libraryIdentity: 'library:expected',
      controlStoreIdentity: 'control:expected', generation: 'generation:expected',
      managedOriginalsRelativePath: ORIGINALS_DIRECTORY_NAME
    })
    initializeLibraryDataSchema(expected)
    const version = database.pragma('user_version', { simple: true })
    if(version===15)applyWorkMediaSchema(expected)
    else if(version===14)applyBasicAnalysisSchema(expected)
    else if(version===13){applyTagExecutionSchema(expected);applyTagDecisionSchema(expected);applyBackgroundAnalysisSchema(expected);applyBackgroundOcrSchema(expected)}
    else if(version===12){applyTagExecutionSchema(expected);applyTagDecisionSchema(expected);applyBackgroundAnalysisSchema(expected)}
    else if (version === 11) {applyTagExecutionSchema(expected);applyTagDecisionSchema(expected)}
    else if (version === 10) applyTagExecutionSchema(expected)
    else if (version === 9) applyTagIntentSchema(expected)
    else if (version === 8) enableOcrStorage(expected)
    else if (version === 7) enableWorkSetStorage(expected)
    else if (version === 6) enableOrganizationStorage(expected)
    else if (version === 5) enableNotebookStorage(expected)
    else if (version === 4) enableIntakeRecoveryStorage(expected)
    else if (version === 3) enableDownloadJournal(expected)
    else if (version === 2) enableVisualAiStorage(expected)
    else if (version !== 1) throw new ActiveLibraryHostError('library-schema-invalid', 'The Active Library schema is unavailable.')
    if (schemaSignature(database) !== schemaSignature(expected)) throw new ActiveLibraryHostError('library-schema-invalid', 'The Active Library schema is unavailable.')
  } finally {
    expected.close()
  }
}

function schemaSignature(database: Database.Database): string {
  const objects = database.prepare("SELECT type, name, tbl_name AS tableName, sql FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%' ORDER BY type, name").all()
  const tableNames = (objects as Array<{ type: string; name: string }>).filter((object) => object.type === 'table').map((object) => object.name)
  const tables = tableNames.map((table) => ({
    table,
    columns: database.prepare(`PRAGMA table_xinfo(${quoteIdentifier(table)})`).all(),
    indexes: (database.prepare(`PRAGMA index_list(${quoteIdentifier(table)})`).all() as Array<{ name: string }>).sort((left, right) => left.name.localeCompare(right.name)).map((index) => ({
      ...index,
      columns: database.prepare(`PRAGMA index_info(${quoteIdentifier(index.name)})`).all()
    })),
    foreignKeys: database.prepare(`PRAGMA foreign_key_list(${quoteIdentifier(table)})`).all()
  }))
  return JSON.stringify({ objects, tables })
}

function quoteIdentifier(value: string): string {
  return `"${value.replace(/"/gu, '""')}"`
}
