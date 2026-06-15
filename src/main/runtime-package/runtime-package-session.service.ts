import { createHash, randomUUID } from 'node:crypto'
import fs from 'node:fs/promises'
import { createReadStream } from 'node:fs'
import path from 'node:path'
import type {
  RuntimePackageEntry,
  RuntimePackageExecutionProgress,
  RuntimePackageExecutionRequest,
  RuntimePackageExecutionResult,
  RuntimePackageExecutionStage,
  RuntimePackageExecutor,
  RuntimePackageManifest
} from './runtime-package.types'
import { FileSystemRuntimePackageExecutor } from './runtime-package-executor'
import { validateRuntimePackageManifest } from './runtime-package-manifest.validator'
import { createLocalRuntimePackageSource } from './runtime-package-source'

const DEFAULT_SELECTION_TTL_MS = 10 * 60 * 1000
const MAX_MANIFEST_BYTES = 2 * 1024 * 1024

export type RuntimePackageSessionErrorCode =
  | 'CONFIRMATION_REQUIRED'
  | 'MANIFEST_INVALID'
  | 'MANIFEST_UNREADABLE'
  | 'PACKAGE_NOT_FOUND'
  | 'PACKAGE_NOT_SELECTABLE'
  | 'ARCHIVE_INVALID'
  | 'ARCHIVE_MISSING'
  | 'CHECKSUM_MISMATCH'
  | 'SELECTION_EXPIRED'
  | 'EXECUTION_NOT_FOUND'
  | 'EXECUTION_FAILED'

export interface RuntimePackageLocalManifestSelection {
  selectionId: string
  packageId: string
  name: string
  version: string
  type: RuntimePackageEntry['type']
  installMode: RuntimePackageEntry['installMode']
  archiveFileName: string
  sizeBytes: number
  sha256: string
  expiresAt: string
  warnings: string[]
}

export interface RuntimePackageSelectLocalManifestResponse {
  success: boolean
  selection?: RuntimePackageLocalManifestSelection
  errorCode?: RuntimePackageSessionErrorCode
  message: string
}

export interface RuntimePackageExecuteSelectionRequest {
  selectionId: string
  confirmed: boolean
}

export interface RuntimePackageExecutionSnapshot {
  executionId: string
  packageId: string
  stage: RuntimePackageExecutionStage
  percent: number
  message: string
  terminal: boolean
  result?: RuntimePackageExecutionResult
}

export interface RuntimePackageExecuteSelectionResponse {
  accepted: boolean
  execution?: RuntimePackageExecutionSnapshot
  errorCode?: RuntimePackageSessionErrorCode
  message: string
}

export interface RuntimePackageGetExecutionStatusResponse {
  success: boolean
  execution?: RuntimePackageExecutionSnapshot
  errorCode?: RuntimePackageSessionErrorCode
  message: string
}

export type RuntimePackageSessionProgressListener = (snapshot: RuntimePackageExecutionSnapshot) => void

export interface RuntimePackageSessionServiceOptions {
  executor?: RuntimePackageExecutor
  selectionTtlMs?: number
  now?: () => number
  createSelectionId?: () => string
  createExecutionId?: () => string
  onProgress?: RuntimePackageSessionProgressListener
}

interface StoredSelection {
  request: RuntimePackageExecutionRequest
  preview: RuntimePackageLocalManifestSelection
  expiresAtMs: number
}

type RuntimePackageEntrySelection =
  | { ok: true; entry: RuntimePackageEntry }
  | { ok: false; response: RuntimePackageSelectLocalManifestResponse }

export class RuntimePackageSessionService {
  private readonly executor: RuntimePackageExecutor
  private readonly selectionTtlMs: number
  private readonly now: () => number
  private readonly createSelectionId: () => string
  private readonly createExecutionId: () => string
  private readonly onProgress?: RuntimePackageSessionProgressListener
  private readonly selections = new Map<string, StoredSelection>()
  private readonly executions = new Map<string, RuntimePackageExecutionSnapshot>()
  private readonly running = new Map<string, Promise<RuntimePackageExecutionSnapshot>>()

  constructor(options: RuntimePackageSessionServiceOptions = {}) {
    this.executor = options.executor ?? new FileSystemRuntimePackageExecutor()
    this.selectionTtlMs = options.selectionTtlMs ?? DEFAULT_SELECTION_TTL_MS
    this.now = options.now ?? Date.now
    this.createSelectionId = options.createSelectionId ?? randomUUID
    this.createExecutionId = options.createExecutionId ?? randomUUID
    this.onProgress = options.onProgress
  }

  async selectLocalManifest(manifestPath: string, packageId?: string): Promise<RuntimePackageSelectLocalManifestResponse> {
    this.expireSelections()
    const manifestFile = path.resolve(manifestPath)

    try {
      const stat = await fs.stat(manifestFile)
      if (!stat.isFile() || stat.size > MAX_MANIFEST_BYTES || path.extname(manifestFile).toLowerCase() !== '.json') {
        return failure('MANIFEST_INVALID', 'The selected runtime package manifest is not valid.')
      }

      const manifest = parseRuntimePackageManifest(await fs.readFile(manifestFile, 'utf8'))
      const manifestValidation = validateRuntimePackageManifest(manifest)
      if (!manifestValidation.valid) {
        return failure('MANIFEST_INVALID', 'The selected runtime package manifest failed validation.')
      }

      const entryResult = selectManifestEntry(manifest, packageId)
      if (!entryResult.ok) return entryResult.response

      const entry = entryResult.entry
      const archiveFileName = validateSiblingArchiveName(entry)
      if (!archiveFileName) {
        return failure('ARCHIVE_INVALID', 'The runtime package archive must be a sibling ZIP file named by the manifest entry.')
      }

      const manifestDirectory = path.dirname(manifestFile)
      const archivePath = path.join(manifestDirectory, archiveFileName)
      const archiveStat = await fs.stat(archivePath).catch(() => null)
      if (!archiveStat?.isFile()) {
        return failure('ARCHIVE_MISSING', 'The runtime package archive referenced by the manifest was not found.')
      }
      if (archiveStat.size !== entry.sizeBytes) {
        return failure('ARCHIVE_INVALID', 'The runtime package archive size does not match the manifest.')
      }

      const actualSha256 = await hashFileSha256(archivePath)
      if (actualSha256 !== entry.sha256.toLowerCase()) {
        return failure('CHECKSUM_MISMATCH', 'The runtime package archive checksum does not match the manifest.')
      }

      const selectionId = this.createSelectionId()
      const expiresAtMs = this.now() + this.selectionTtlMs
      const preview: RuntimePackageLocalManifestSelection = {
        selectionId,
        packageId: entry.id,
        name: entry.name,
        version: entry.version,
        type: entry.type,
        installMode: entry.installMode,
        archiveFileName,
        sizeBytes: entry.sizeBytes,
        sha256: entry.sha256.toLowerCase(),
        expiresAt: new Date(expiresAtMs).toISOString(),
        warnings: entry.warnings
      }
      this.selections.set(selectionId, {
        request: {
          entry: { ...entry, sha256: entry.sha256.toLowerCase(), url: archiveFileName },
          source: createLocalRuntimePackageSource(`local-manifest-${selectionId}`, manifestDirectory),
          archivePath,
          confirmed: true
        },
        preview,
        expiresAtMs
      })

      return {
        success: true,
        selection: preview,
        message: 'Runtime package manifest selected.'
      }
    } catch (error) {
      if (error instanceof RuntimePackageManifestParseError) {
        return failure('MANIFEST_INVALID', 'The selected runtime package manifest is not valid JSON.')
      }
      return failure('MANIFEST_UNREADABLE', 'The selected runtime package manifest could not be read.')
    }
  }

  async executeSelection(request: RuntimePackageExecuteSelectionRequest): Promise<RuntimePackageExecuteSelectionResponse> {
    this.expireSelections()
    if (!request.confirmed) {
      return {
        accepted: false,
        errorCode: 'CONFIRMATION_REQUIRED',
        message: 'Runtime package execution requires explicit confirmation.'
      }
    }

    const selection = this.selections.get(request.selectionId)
    if (!selection) {
      return {
        accepted: false,
        errorCode: 'SELECTION_EXPIRED',
        message: 'The runtime package selection is missing or expired.'
      }
    }

    this.selections.delete(request.selectionId)
    const executionId = this.createExecutionId()
    const initial = this.updateExecution(executionId, {
      executionId,
      packageId: selection.request.entry.id,
      stage: 'validating',
      percent: 0,
      message: 'Runtime package execution accepted.',
      terminal: false
    })
    const running = this.runExecution(executionId, selection.request)
    this.running.set(executionId, running)

    return {
      accepted: true,
      execution: initial,
      message: 'Runtime package execution accepted.'
    }
  }

  getExecutionStatus(executionId: string): RuntimePackageGetExecutionStatusResponse {
    const execution = this.executions.get(executionId)
    if (!execution) {
      return {
        success: false,
        errorCode: 'EXECUTION_NOT_FOUND',
        message: 'Runtime package execution was not found.'
      }
    }

    return {
      success: true,
      execution,
      message: 'Runtime package execution status loaded.'
    }
  }

  async waitForExecution(executionId: string): Promise<RuntimePackageExecutionSnapshot | null> {
    const running = this.running.get(executionId)
    if (running) return running
    return this.executions.get(executionId) ?? null
  }

  private async runExecution(
    executionId: string,
    request: RuntimePackageExecutionRequest
  ): Promise<RuntimePackageExecutionSnapshot> {
    try {
      const result = await this.executor.execute(request, (progress) => {
        this.updateExecution(executionId, snapshotFromProgress(executionId, progress, false))
      })
      const finalSnapshot = this.updateExecution(executionId, snapshotFromResult(executionId, result))
      this.running.delete(executionId)
      return finalSnapshot
    } catch {
      const failed = this.updateExecution(executionId, {
        executionId,
        packageId: request.entry.id,
        stage: 'failed',
        percent: 100,
        message: 'Runtime package execution failed.',
        terminal: true
      })
      this.running.delete(executionId)
      return failed
    }
  }

  private updateExecution(executionId: string, snapshot: RuntimePackageExecutionSnapshot): RuntimePackageExecutionSnapshot {
    this.executions.set(executionId, snapshot)
    this.onProgress?.(snapshot)
    return snapshot
  }

  private expireSelections(): void {
    const now = this.now()
    for (const [selectionId, selection] of this.selections.entries()) {
      if (selection.expiresAtMs <= now) this.selections.delete(selectionId)
    }
  }
}

function selectManifestEntry(
  manifest: RuntimePackageManifest,
  packageId?: string
): RuntimePackageEntrySelection {
  const matches = packageId
    ? manifest.packages.filter((entry) => entry.id === packageId)
    : manifest.packages
  if (matches.length !== 1) {
    return {
      ok: false,
      response: failure('PACKAGE_NOT_FOUND', 'Exactly one runtime package entry must be selected from the manifest.')
    }
  }

  const entry = matches[0]
  if (
    entry.type === 'model' ||
    entry.installMode === 'download-only' ||
    entry.installMode === 'external-link' ||
    !entry.sha256 ||
    entry.status === 'disabled'
  ) {
    return {
      ok: false,
      response: failure('PACKAGE_NOT_SELECTABLE', 'The selected manifest entry is not executable by the Runtime Package Executor.')
    }
  }

  return { ok: true, entry }
}

class RuntimePackageManifestParseError extends Error {}

function parseRuntimePackageManifest(contents: string): RuntimePackageManifest {
  try {
    return JSON.parse(contents) as RuntimePackageManifest
  } catch {
    throw new RuntimePackageManifestParseError('Runtime package manifest is not valid JSON.')
  }
}

function validateSiblingArchiveName(entry: RuntimePackageEntry): string | null {
  if (!entry.url || entry.url.includes('\\') || entry.url.includes('/') || entry.url.includes('\0')) return null
  if (/^[a-z][a-z0-9+.-]*:/i.test(entry.url)) return null
  if (!entry.url.toLowerCase().endsWith('.zip')) return null
  if (path.basename(entry.url) !== entry.url) return null
  return entry.url
}

function snapshotFromProgress(
  executionId: string,
  progress: RuntimePackageExecutionProgress,
  terminal: boolean
): RuntimePackageExecutionSnapshot {
  return {
    executionId,
    packageId: progress.packageId,
    stage: progress.stage,
    percent: progress.percent,
    message: progress.message,
    terminal
  }
}

function snapshotFromResult(executionId: string, result: RuntimePackageExecutionResult): RuntimePackageExecutionSnapshot {
  const lastProgress = result.progress.at(-1)
  return {
    executionId,
    packageId: result.packageId,
    stage: result.stage,
    percent: lastProgress?.percent ?? (result.success ? 100 : 0),
    message: result.message,
    terminal: true,
    result
  }
}

function failure(
  errorCode: RuntimePackageSessionErrorCode,
  message: string
): RuntimePackageSelectLocalManifestResponse {
  return {
    success: false,
    errorCode,
    message
  }
}

async function hashFileSha256(filePath: string): Promise<string> {
  const hash = createHash('sha256')
  await new Promise<void>((resolve, reject) => {
    const stream = createReadStream(filePath)
    stream.on('data', (chunk) => hash.update(chunk))
    stream.on('error', reject)
    stream.on('end', resolve)
  })
  return hash.digest('hex')
}
