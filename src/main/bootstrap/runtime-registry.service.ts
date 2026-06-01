import fs from 'fs/promises'
import path from 'path'
import type { DoctorReport } from '../../shared/types/doctor.types'
import type { ManagedPaths } from '../../shared/types/platform.types'
import type { RuntimeProfileId } from '../../shared/types/runtime-profile.types'
import { assertInsideManagedRoot, ensureDirectory } from '../platform/filesystem-guard'
import { detectPlatform } from '../platform/platform-detector'
import { ensureSafeJoin } from '../platform/path-normalizer'
import { resolveManagedPaths } from '../platform/path-resolver'
import type { RuntimeRegistry, RuntimeRegistryModel, RuntimeRegistryPackage } from './runtime-registry.types'
import { createRegistryBackup } from './runtime-registry.backup'
import { getRegistrySchemaVersion, normalizeRuntimeRegistry, validateRuntimeRegistry } from './runtime-registry.validator'

const REGISTRY_FILE_NAME = 'runtime-registry.json'

export interface RuntimeRegistryServiceOptions {
  managedPaths?: ManagedPaths
  now?: () => string
}

export class RuntimeRegistryService {
  private readonly managedPaths: ManagedPaths
  private readonly now: () => string
  private readonly registryPath: string

  constructor(options: RuntimeRegistryServiceOptions = {}) {
    this.managedPaths = options.managedPaths ?? resolveManagedPaths()
    this.now = options.now ?? (() => new Date().toISOString())
    this.registryPath = ensureSafeJoin(this.managedPaths.configDir, REGISTRY_FILE_NAME)
  }

  getRegistryPath(): string {
    return this.registryPath
  }

  async exists(): Promise<boolean> {
    try {
      await fs.access(this.registryPath)
      return true
    } catch {
      return false
    }
  }

  createDefault(): RuntimeRegistry {
    const platformInfo = detectPlatform()
    const currentTime = this.now()

    return {
      schemaVersion: getRegistrySchemaVersion(),
      initialized: false,
      platform: platformInfo.platform,
      arch: platformInfo.arch,
      profile: platformInfo.profile,
      createdAt: currentTime,
      updatedAt: currentTime,
      initializedAt: null,
      lastDoctorRunAt: null,
      lastDoctorStatus: null,
      selectedProfileId: null,
      recommendedProfileId: null,
      paths: {
        registryPath: this.registryPath,
        runtimeDir: this.managedPaths.runtimeDir,
        modelsDir: this.managedPaths.modelsDir,
        cacheDir: this.managedPaths.cacheDir,
        logsDir: this.managedPaths.logsDir,
        databaseDir: this.managedPaths.databaseDir
      },
      packages: [],
      models: [],
      warnings: [],
      metadata: {}
    }
  }

  async read(): Promise<RuntimeRegistry> {
    try {
      const raw = await fs.readFile(this.registryPath, 'utf8')
      const parsed = JSON.parse(raw)
      const normalized = normalizeRuntimeRegistry(parsed, this.createDefault())
      const validation = validateRuntimeRegistry(normalized)
      if (!validation.valid) {
        throw new Error(`Runtime registry validation failed: ${validation.errors.join('; ')}`)
      }
      return normalized
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return this.createDefault()
      }
      if (err instanceof SyntaxError) {
        throw new Error('Runtime registry JSON is corrupted.')
      }
      throw err
    }
  }

  async write(registry: RuntimeRegistry): Promise<void> {
    const validation = validateRuntimeRegistry(registry)
    if (!validation.valid) {
      throw new Error(`Runtime registry validation failed: ${validation.errors.join('; ')}`)
    }
    const normalized = normalizeRuntimeRegistry({ ...registry, updatedAt: this.now() }, this.createDefault())

    const registryDir = path.dirname(this.registryPath)
    assertInsideManagedRoot(this.managedPaths.userDataDir, this.registryPath)
    await ensureDirectory(registryDir)
    await createRegistryBackup(this.registryPath)

    const tempPath = ensureSafeJoin(registryDir, `.runtime-registry.${Date.now()}.tmp`)
    const payload = `${JSON.stringify(normalized, null, 2)}\n`

    try {
      await fs.writeFile(tempPath, payload, 'utf8')
      await fs.rename(tempPath, this.registryPath)
    } catch (err) {
      try {
        await fs.rm(tempPath, { force: true })
      } catch {
        // keep the original write error
      }
      throw err
    }
  }

  async update(partial: Partial<RuntimeRegistry>): Promise<RuntimeRegistry> {
    const current = await this.read()
    const next = normalizeRuntimeRegistry(
      {
        ...current,
        ...partial,
        paths: { ...current.paths, ...partial.paths },
        packages: partial.packages ?? current.packages,
        models: partial.models ?? current.models,
        warnings: partial.warnings ?? current.warnings,
        metadata: { ...current.metadata, ...partial.metadata }
      },
      this.createDefault()
    )
    await this.write(next)
    return this.read()
  }

  async reset(): Promise<RuntimeRegistry> {
    const registry = this.createDefault()
    await this.write(registry)
    return this.read()
  }

  async markInitialized(profileId: RuntimeProfileId): Promise<RuntimeRegistry> {
    const at = this.now()
    return this.update({
      initialized: true,
      initializedAt: at,
      selectedProfileId: profileId
    })
  }

  async updateDoctorSummary(report: DoctorReport): Promise<RuntimeRegistry> {
    return this.update({
      lastDoctorRunAt: report.generatedAt,
      lastDoctorStatus: report.overallStatus
    })
  }

  async listPackages(): Promise<RuntimeRegistryPackage[]> {
    return (await this.read()).packages
  }

  async upsertPackage(pkg: RuntimeRegistryPackage): Promise<RuntimeRegistry> {
    const current = await this.read()
    const packages = current.packages.filter((item) => !(item.id === pkg.id && item.version === pkg.version))
    packages.push(pkg)
    return this.update({ packages })
  }

  async listModels(): Promise<RuntimeRegistryModel[]> {
    return (await this.read()).models
  }

  async upsertModel(model: RuntimeRegistryModel): Promise<RuntimeRegistry> {
    const current = await this.read()
    const models = current.models.filter((item) => !(item.id === model.id && item.version === model.version))
    models.push(model)
    return this.update({ models })
  }
}
