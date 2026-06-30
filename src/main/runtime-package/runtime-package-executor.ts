import { createHash, randomUUID } from 'node:crypto'
import fs from 'node:fs/promises'
import { createReadStream } from 'node:fs'
import path from 'node:path'
import extractZip from 'extract-zip'
import type { ManagedPaths, PlatformArch, PlatformName } from '../../shared/types/platform.types'
import type { RuntimeRegistry, RuntimeRegistryPackage } from '../../shared/types/runtime-registry.types'
import type {
  RuntimePackageExecutionErrorCode,
  RuntimePackageExecutionProgress,
  RuntimePackageExecutionRequest,
  RuntimePackageExecutionResult,
  RuntimePackageExecutionStage,
  RuntimePackageExecutor,
  RuntimePackageProgressListener
} from './runtime-package.types'
import { RuntimeRegistryService } from '../bootstrap/runtime-registry.service'
import { detectPlatform } from '../platform/platform-detector'
import { ensureSafeJoin, isInsideDirectory, sanitizeFilename } from '../platform/path-normalizer'
import { resolveManagedPaths } from '../platform/path-resolver'
import { validateSha256Format } from './runtime-package-manifest.validator'

const DEFAULT_MAX_ARCHIVE_ENTRIES = 10_000
const DEFAULT_MAX_UNCOMPRESSED_BYTES = 2 * 1024 * 1024 * 1024
const ALLOWED_INSTALL_MODES = new Set(['managed-runtime', 'extract-only'])
const ALLOWED_PACKAGE_TYPES = new Set(['runtime', 'tool', 'dependency'])
let filesystemExecutionQueue: Promise<void> = Promise.resolve()

interface RuntimePackageRegistryPort {
  read(): Promise<RuntimeRegistry>
  write(registry: RuntimeRegistry): Promise<void>
}

export interface FileSystemRuntimePackageExecutorOptions {
  managedPaths?: ManagedPaths
  registry?: RuntimePackageRegistryPort
  bundledResourceRoot?: string
  now?: () => string
  createExecutionId?: () => string
  maxArchiveEntries?: number
  maxUncompressedBytes?: number
  platform?: PlatformName
  arch?: PlatformArch
}

export interface InMemoryRuntimePackageExecutorOptions {
  failAt?: RuntimePackageExecutionStage
  platform?: PlatformName
  arch?: PlatformArch
}

class RuntimePackageExecutionError extends Error {
  constructor(
    readonly code: RuntimePackageExecutionErrorCode,
    message: string,
    readonly blocked = true
  ) {
    super(message)
  }
}

export class FileSystemRuntimePackageExecutor implements RuntimePackageExecutor {
  private readonly managedPaths: ManagedPaths
  private readonly registry: RuntimePackageRegistryPort
  private readonly bundledResourceRoot?: string
  private readonly now: () => string
  private readonly createExecutionId: () => string
  private readonly maxArchiveEntries: number
  private readonly maxUncompressedBytes: number
  private readonly platform: PlatformName
  private readonly arch: PlatformArch

  constructor(options: FileSystemRuntimePackageExecutorOptions = {}) {
    const detected = detectPlatform()
    this.managedPaths = options.managedPaths ?? resolveManagedPaths()
    this.registry = options.registry ?? new RuntimeRegistryService({ managedPaths: this.managedPaths })
    this.bundledResourceRoot = options.bundledResourceRoot ?? resolveElectronResourcesPath()
    this.now = options.now ?? (() => new Date().toISOString())
    this.createExecutionId = options.createExecutionId ?? randomUUID
    this.maxArchiveEntries = options.maxArchiveEntries ?? DEFAULT_MAX_ARCHIVE_ENTRIES
    this.maxUncompressedBytes = options.maxUncompressedBytes ?? DEFAULT_MAX_UNCOMPRESSED_BYTES
    this.platform = options.platform ?? detected.platform
    this.arch = options.arch ?? detected.arch
  }

  async execute(
    request: RuntimePackageExecutionRequest,
    onProgress?: RuntimePackageProgressListener
  ): Promise<RuntimePackageExecutionResult> {
    const execution = filesystemExecutionQueue.then(
      () => this.executeExclusive(request, onProgress),
      () => this.executeExclusive(request, onProgress)
    )
    filesystemExecutionQueue = execution.then(
      () => undefined,
      () => undefined
    )
    return execution
  }

  private async executeExclusive(
    request: RuntimePackageExecutionRequest,
    onProgress?: RuntimePackageProgressListener
  ): Promise<RuntimePackageExecutionResult> {
    const progress: RuntimePackageExecutionProgress[] = []
    const emit = createProgressEmitter(request.entry.id, progress, onProgress)
    let stagingDirectory: string | null = null
    let installDirectory: string | null = null
    let registrySnapshot: RuntimeRegistry | null = null
    let promoted = false
    let registryAttempted = false

    try {
      emit('validating', 5, 'Validating package request.')
      const archivePath = await validateExecutionRequest(
        request,
        this.platform,
        this.arch,
        this.bundledResourceRoot
      )
      const packageSegment = safeSegment(request.entry.id, 'package id')
      const versionSegment = safeSegment(request.entry.version, 'package version')
      const executionSegment = safeSegment(this.createExecutionId(), 'execution id')
      const packagesRoot = ensureSafeJoin(this.managedPaths.runtimeDir, 'packages')
      const stagingRoot = ensureSafeJoin(this.managedPaths.runtimeDir, '.package-staging')
      stagingDirectory = ensureSafeJoin(stagingRoot, `${packageSegment}-${versionSegment}-${executionSegment}`)
      const extractedDirectory = ensureSafeJoin(stagingDirectory, 'extracted')
      installDirectory = ensureSafeJoin(packagesRoot, packageSegment, versionSegment)

      if (await pathExists(installDirectory)) {
        throw new RuntimePackageExecutionError('INSTALL_TARGET_EXISTS', 'The package version is already installed.')
      }

      await ensureManagedDirectory(this.managedPaths.runtimeDir, extractedDirectory)

      emit('verifying', 20, 'Verifying package checksum.')
      const actualSha256 = await hashFileSha256(archivePath)
      if (actualSha256 !== request.entry.sha256.toLowerCase()) {
        throw new RuntimePackageExecutionError('CHECKSUM_MISMATCH', 'The package checksum does not match the manifest.')
      }

      emit('extracting', 45, 'Extracting package into managed staging.')
      await this.extractArchive(archivePath, extractedDirectory)

      emit('promoting', 70, 'Promoting verified package into the managed runtime root.')
      await ensureManagedDirectory(this.managedPaths.runtimeDir, path.dirname(installDirectory))
      await fs.rename(extractedDirectory, installDirectory)
      promoted = true

      emit('registering', 85, 'Recording installed package metadata.')
      try {
        registrySnapshot = await this.registry.read()
        registryAttempted = true
        await this.registry.write(withInstalledPackage(
          registrySnapshot,
          request,
          installDirectory,
          this.now()
        ))
      } catch {
        throw new RuntimePackageExecutionError(
          'REGISTRY_WRITE_FAILED',
          'The installed package could not be recorded in the Runtime Registry.',
          false
        )
      }

      await this.cleanupStaging(stagingDirectory)
      emit('completed', 100, 'Runtime package installed.')
      return {
        success: true,
        packageId: request.entry.id,
        stage: 'completed',
        installedVersion: request.entry.version,
        message: 'Runtime package installed.',
        rolledBack: false,
        progress
      }
    } catch (error) {
      const executionError = normalizeExecutionError(error)
      const needsRollback = promoted || registryAttempted

      if (needsRollback) {
        emit('rolling_back', 90, 'Rolling back incomplete package installation.')
        try {
          if (installDirectory && await pathExists(installDirectory)) {
            await removeManagedPath(this.managedPaths.runtimeDir, installDirectory)
          }
          if (registryAttempted && registrySnapshot) {
            await this.registry.write(registrySnapshot)
          }
          if (stagingDirectory) await this.cleanupStaging(stagingDirectory)
          emit('rolled_back', 100, 'Incomplete package installation rolled back.')
          return failureResult(request.entry.id, 'rolled_back', executionError, true, progress)
        } catch {
          if (stagingDirectory) await this.cleanupStaging(stagingDirectory)
          const rollbackError = new RuntimePackageExecutionError(
            'ROLLBACK_FAILED',
            'Package installation failed and rollback could not be completed.',
            false
          )
          emit('failed', 100, rollbackError.message)
          return failureResult(request.entry.id, 'failed', rollbackError, false, progress)
        }
      }

      if (stagingDirectory) await this.cleanupStaging(stagingDirectory)
      const stage: RuntimePackageExecutionStage = executionError.blocked ? 'blocked' : 'failed'
      emit(stage, 100, executionError.message)
      return failureResult(request.entry.id, stage, executionError, false, progress)
    }
  }

  private async extractArchive(archivePath: string, destination: string): Promise<void> {
    let entryCount = 0
    let uncompressedBytes = 0
    const entryNames = new Set<string>()

    try {
      await extractZip(archivePath, {
        dir: destination,
        onEntry: (entry) => {
          const entryName = validateArchiveEntryName(entry.fileName)
          const collisionKey = entryName.replace(/\/$/, '').toLocaleLowerCase('en-US')
          if (entryNames.has(collisionKey)) {
            throw new RuntimePackageExecutionError(
              'ARCHIVE_ENTRY_UNSAFE',
              'The package archive contains colliding entry paths.'
            )
          }
          entryNames.add(collisionKey)
          const mode = (entry.externalFileAttributes >> 16) & 0xffff
          if ((mode & 0xf000) === 0xa000) {
            throw new RuntimePackageExecutionError(
              'ARCHIVE_ENTRY_UNSAFE',
              'The package archive contains a symbolic link.'
            )
          }

          entryCount += 1
          uncompressedBytes += entry.uncompressedSize
          if (entryCount > this.maxArchiveEntries || uncompressedBytes > this.maxUncompressedBytes) {
            throw new RuntimePackageExecutionError(
              'ARCHIVE_ENTRY_UNSAFE',
              'The package archive exceeds extraction safety limits.'
            )
          }
        }
      })
    } catch (error) {
      if (error instanceof RuntimePackageExecutionError) throw error
      if (error instanceof Error && /(out of bound path|invalid relative path|absolute path)/i.test(error.message)) {
        throw new RuntimePackageExecutionError(
          'ARCHIVE_ENTRY_UNSAFE',
          'The package archive contains an unsafe path.'
        )
      }
      throw new RuntimePackageExecutionError('ARCHIVE_INVALID', 'The package archive could not be extracted.')
    }

    if (entryCount === 0) {
      throw new RuntimePackageExecutionError('ARCHIVE_INVALID', 'The package archive is empty.')
    }
  }

  private async cleanupStaging(stagingDirectory: string): Promise<void> {
    try {
      if (await pathExists(stagingDirectory)) {
        await removeManagedPath(this.managedPaths.runtimeDir, stagingDirectory)
      }
    } catch {
      // Staging cleanup must not hide the installation or rollback result.
    }
  }
}

export class InMemoryRuntimePackageExecutor implements RuntimePackageExecutor {
  private readonly installed = new Set<string>()
  private readonly failAt?: RuntimePackageExecutionStage
  private readonly platform: PlatformName
  private readonly arch: PlatformArch

  constructor(options: InMemoryRuntimePackageExecutorOptions = {}) {
    const detected = detectPlatform()
    this.failAt = options.failAt
    this.platform = options.platform ?? detected.platform
    this.arch = options.arch ?? detected.arch
  }

  async execute(
    request: RuntimePackageExecutionRequest,
    onProgress?: RuntimePackageProgressListener
  ): Promise<RuntimePackageExecutionResult> {
    const progress: RuntimePackageExecutionProgress[] = []
    const emit = createProgressEmitter(request.entry.id, progress, onProgress)
    const key = `${request.entry.id}@${request.entry.version}`

    try {
      validateRequestPolicy(request, this.platform, this.arch)
      if (this.installed.has(key)) {
        throw new RuntimePackageExecutionError('INSTALL_TARGET_EXISTS', 'The package version is already installed.')
      }

      for (const [stage, percent, message] of MEMORY_EXECUTION_STEPS) {
        emit(stage, percent, message)
        if (this.failAt === stage) {
          throw new RuntimePackageExecutionError('EXECUTION_FAILED', 'The in-memory package execution failed.', false)
        }
      }

      this.installed.add(key)
      return {
        success: true,
        packageId: request.entry.id,
        stage: 'completed',
        installedVersion: request.entry.version,
        message: 'Runtime package installed.',
        rolledBack: false,
        progress
      }
    } catch (error) {
      const executionError = normalizeExecutionError(error)
      const stage: RuntimePackageExecutionStage = executionError.blocked ? 'blocked' : 'failed'
      emit(stage, 100, executionError.message)
      return failureResult(request.entry.id, stage, executionError, false, progress)
    }
  }
}

const MEMORY_EXECUTION_STEPS: Array<[RuntimePackageExecutionStage, number, string]> = [
  ['validating', 5, 'Validating package request.'],
  ['verifying', 20, 'Verifying package checksum.'],
  ['extracting', 45, 'Extracting package into managed staging.'],
  ['promoting', 70, 'Promoting verified package into the managed runtime root.'],
  ['registering', 85, 'Recording installed package metadata.'],
  ['completed', 100, 'Runtime package installed.']
]

async function validateExecutionRequest(
  request: RuntimePackageExecutionRequest,
  platform: PlatformName,
  arch: PlatformArch,
  bundledResourceRoot?: string
): Promise<string> {
  validateRequestPolicy(request, platform, arch)

  const archivePath = path.resolve(request.archivePath)
  const sourceRoot = resolveSourceRoot(request, bundledResourceRoot)
  let realArchivePath: string
  let realSourceRoot: string
  try {
    [realArchivePath, realSourceRoot] = await Promise.all([
      fs.realpath(archivePath),
      fs.realpath(sourceRoot)
    ])
  } catch {
    throw new RuntimePackageExecutionError('ARCHIVE_INVALID', 'The selected package archive or source is unavailable.')
  }

  if (realArchivePath !== realSourceRoot && !isInsideDirectory(realSourceRoot, realArchivePath)) {
    throw new RuntimePackageExecutionError(
      'ARCHIVE_OUTSIDE_SOURCE',
      'The selected archive is outside the approved package source.'
    )
  }

  if (path.extname(archivePath).toLowerCase() !== '.zip') {
    throw new RuntimePackageExecutionError('ARCHIVE_INVALID', 'Only ZIP runtime packages are supported.')
  }

  try {
    const stat = await fs.lstat(archivePath)
    if (!stat.isFile() || stat.isSymbolicLink()) {
      throw new RuntimePackageExecutionError('ARCHIVE_INVALID', 'The selected package archive is not a regular file.')
    }
  } catch (error) {
    if (error instanceof RuntimePackageExecutionError) throw error
    throw new RuntimePackageExecutionError('ARCHIVE_INVALID', 'The selected package archive is unavailable.')
  }

  return realArchivePath
}

function validateRequestPolicy(
  request: RuntimePackageExecutionRequest,
  platform: PlatformName,
  arch: PlatformArch
): void {
  if (!request.confirmed) {
    throw new RuntimePackageExecutionError('CONFIRMATION_REQUIRED', 'Explicit user confirmation is required.')
  }

  if (
    request.source.type === 'remote'
    || !request.source.enabled
    || request.source.networkAccess !== 'never'
    || !['local', 'bundled'].includes(request.source.type)
    || (request.source.type === 'local' && request.source.access !== 'filesystem')
    || (request.source.type === 'bundled' && request.source.access !== 'app-resource')
  ) {
    throw new RuntimePackageExecutionError('SOURCE_NOT_ALLOWED', 'Only enabled local or bundled package sources are allowed.')
  }

  if (
    request.entry.type === 'model'
    || !ALLOWED_PACKAGE_TYPES.has(request.entry.type)
    || !ALLOWED_INSTALL_MODES.has(request.entry.installMode)
  ) {
    throw new RuntimePackageExecutionError('PACKAGE_NOT_ALLOWED', 'This package type or install mode is not executable.')
  }

  if (!request.entry.sha256 || !validateSha256Format(request.entry.sha256)) {
    throw new RuntimePackageExecutionError('PACKAGE_NOT_ALLOWED', 'A valid SHA-256 manifest value is required.')
  }

  const platformMatches = request.entry.platforms.includes('all') || request.entry.platforms.includes(platform)
  const archMatches = request.entry.arch.includes('all') || request.entry.arch.includes(arch)
  if (!platformMatches || !archMatches) {
    throw new RuntimePackageExecutionError(
      'PACKAGE_NOT_ALLOWED',
      'The package does not support the current platform and architecture.'
    )
  }
}

function resolveSourceRoot(
  request: RuntimePackageExecutionRequest,
  bundledResourceRoot?: string
): string {
  if (request.source.type === 'local') return path.resolve(request.source.uri)
  if (path.isAbsolute(request.source.uri)) return path.resolve(request.source.uri)
  if (!bundledResourceRoot) {
    throw new RuntimePackageExecutionError(
      'SOURCE_NOT_ALLOWED',
      'A bundled resource root is required for relative bundled package sources.'
    )
  }
  return path.resolve(bundledResourceRoot, request.source.uri)
}

function resolveElectronResourcesPath(): string | undefined {
  const resourcesPath = (process as NodeJS.Process & { resourcesPath?: string }).resourcesPath
  return resourcesPath ? path.resolve(resourcesPath) : undefined
}

function validateArchiveEntryName(fileName: string): string {
  const normalized = fileName.normalize('NFC').replace(/\\/g, '/')
  const segments = normalized.split('/')
  const pathSegments = normalized.endsWith('/') ? segments.slice(0, -1) : segments
  if (
    !normalized
    || normalized.includes('\0')
    || normalized.startsWith('/')
    || /^[A-Za-z]:/.test(normalized)
    || pathSegments.length === 0
    || pathSegments.some((segment) => !segment || segment === '..' || segment === '.')
  ) {
    throw new RuntimePackageExecutionError(
      'ARCHIVE_ENTRY_UNSAFE',
      'The package archive contains an unsafe path.'
    )
  }
  return normalized
}

function safeSegment(value: string, label: string): string {
  const sanitized = sanitizeFilename(value)
  if (sanitized !== value || sanitized === '.' || sanitized === '..') {
    throw new RuntimePackageExecutionError('PACKAGE_NOT_ALLOWED', `The ${label} is not safe for managed storage.`)
  }
  return sanitized
}

function withInstalledPackage(
  registry: RuntimeRegistry,
  request: RuntimePackageExecutionRequest,
  installPath: string,
  installedAt: string
): RuntimeRegistry {
  const installedPackage: RuntimeRegistryPackage = {
    id: request.entry.id,
    version: request.entry.version,
    platform: registry.platform,
    arch: registry.arch,
    installedAt,
    installPath,
    sha256: request.entry.sha256.toLowerCase(),
    status: 'installed'
  }

  return {
    ...registry,
    packages: [
      ...registry.packages.filter((item) => !(item.id === installedPackage.id && item.version === installedPackage.version)),
      installedPackage
    ]
  }
}

async function hashFileSha256(filePath: string): Promise<string> {
  const hash = createHash('sha256')
  const stream = createReadStream(filePath)
  for await (const chunk of stream) hash.update(chunk)
  return hash.digest('hex')
}

async function pathExists(target: string): Promise<boolean> {
  try {
    await fs.lstat(target)
    return true
  } catch {
    return false
  }
}

async function ensureManagedDirectory(root: string, target: string): Promise<void> {
  const resolvedRoot = path.resolve(root)
  const resolvedTarget = path.resolve(target)
  if (resolvedTarget !== resolvedRoot && !isInsideDirectory(resolvedRoot, resolvedTarget)) {
    throw new RuntimePackageExecutionError('MANAGED_PATH_UNSAFE', 'The managed package path is outside the runtime root.')
  }

  await fs.mkdir(resolvedRoot, { recursive: true })
  await assertDirectoryWithoutSymlink(resolvedRoot)
  const realRoot = await fs.realpath(resolvedRoot)
  let current = resolvedRoot

  for (const segment of path.relative(resolvedRoot, resolvedTarget).split(path.sep).filter(Boolean)) {
    current = path.join(current, segment)
    try {
      await assertDirectoryWithoutSymlink(current)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      await fs.mkdir(current)
      await assertDirectoryWithoutSymlink(current)
    }
  }

  const realTarget = await fs.realpath(resolvedTarget)
  if (realTarget !== realRoot && !isInsideDirectory(realRoot, realTarget)) {
    throw new RuntimePackageExecutionError('MANAGED_PATH_UNSAFE', 'The managed package path crosses a symbolic link.')
  }
}

async function assertDirectoryWithoutSymlink(target: string): Promise<void> {
  const stat = await fs.lstat(target)
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    throw new RuntimePackageExecutionError(
      'MANAGED_PATH_UNSAFE',
      'The managed package path contains a symbolic link or non-directory component.'
    )
  }
}

async function removeManagedPath(root: string, target: string): Promise<void> {
  await ensureManagedDirectory(root, path.dirname(target))
  const stat = await fs.lstat(target)
  if (stat.isSymbolicLink()) {
    throw new RuntimePackageExecutionError('MANAGED_PATH_UNSAFE', 'Refusing to remove a symbolic link from managed storage.')
  }
  await fs.rm(target, { recursive: true, force: true })
}

function normalizeExecutionError(error: unknown): RuntimePackageExecutionError {
  if (error instanceof RuntimePackageExecutionError) return error
  return new RuntimePackageExecutionError('EXECUTION_FAILED', 'Runtime package execution failed.', false)
}

function createProgressEmitter(
  packageId: string,
  progress: RuntimePackageExecutionProgress[],
  listener?: RuntimePackageProgressListener
) {
  return (stage: RuntimePackageExecutionStage, percent: number, message: string) => {
    const event = { packageId, stage, percent, message }
    progress.push(event)
    listener?.(event)
  }
}

function failureResult(
  packageId: string,
  stage: RuntimePackageExecutionStage,
  error: RuntimePackageExecutionError,
  rolledBack: boolean,
  progress: RuntimePackageExecutionProgress[]
): RuntimePackageExecutionResult {
  return {
    success: false,
    packageId,
    stage,
    errorCode: error.code,
    message: error.message,
    rolledBack,
    progress
  }
}
