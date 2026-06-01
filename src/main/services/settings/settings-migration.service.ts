import fs from 'fs/promises'
import path from 'path'
import type { AppSettings } from '../../../shared/types/settings.types'
import { assertInsideManagedRoot } from '../../platform/filesystem-guard'
import { dryRunUpgradeSettings } from './settings-compatibility.dry-run'
import { createSettingsBackup, restoreSettingsBackup } from './settings-migration.backup'
import type {
  SettingsMigrationApplyResult,
  SettingsMigrationPlan,
  SettingsMigrationRollbackResult
} from './settings-migration.types'

function now(): string {
  return new Date().toISOString()
}

function planId(): string {
  return `settings-migration-${Date.now()}`
}

function settingsRoot(settingsPath: string): string {
  return path.dirname(path.resolve(settingsPath))
}

function safeSettingsPath(settingsPath: string): string {
  const resolved = path.resolve(settingsPath)
  assertInsideManagedRoot(settingsRoot(resolved), resolved)
  return resolved
}

function cloneSettings(settings: Partial<AppSettings>): Partial<AppSettings> {
  return JSON.parse(JSON.stringify(settings ?? {})) as Partial<AppSettings>
}

function protectUserPaths(nextSettings: Partial<AppSettings>, currentSettings: Partial<AppSettings>): Partial<AppSettings> {
  return {
    ...nextSettings,
    libraryPath: currentSettings.libraryPath ?? nextSettings.libraryPath,
    modelRootDir: currentSettings.modelRootDir ?? nextSettings.modelRootDir,
    selectedPromptModelPath: currentSettings.selectedPromptModelPath ?? nextSettings.selectedPromptModelPath
  }
}

function disableRealRuntimeDefaults(settings: Partial<AppSettings>): Partial<AppSettings> {
  if (!settings.aiRuntimeSettings) return settings

  const runtimes = settings.aiRuntimeSettings.runtimes.map((runtime) => {
    if (runtime.kind === 'python-worker' || runtime.kind === 'ollama' || runtime.kind === 'lm-studio' || runtime.kind === 'llama-app' || runtime.kind === 'custom-http') {
      return { ...runtime, enabled: false }
    }
    return runtime
  })

  return {
    ...settings,
    aiRuntimeSettings: {
      ...settings.aiRuntimeSettings,
      runtimes,
      allowExternalInference: false,
      allowLocalPythonWorker: false,
      healthCheckOnStartup: false,
      activeRuntimeId: settings.aiRuntimeSettings.activeRuntimeId ?? 'disabled-runtime'
    }
  }
}

function sanitizeMigrationResult(nextSettings: Partial<AppSettings>, currentSettings: Partial<AppSettings>): Partial<AppSettings> {
  return disableRealRuntimeDefaults(protectUserPaths(nextSettings, currentSettings))
}

async function atomicWriteJson(settingsPath: string, data: unknown): Promise<void> {
  const resolvedSettingsPath = safeSettingsPath(settingsPath)
  const root = settingsRoot(resolvedSettingsPath)
  const tmpPath = path.join(root, `.settings-migration.${Date.now()}.tmp`)
  assertInsideManagedRoot(root, tmpPath)

  await fs.writeFile(tmpPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
  await fs.rename(tmpPath, resolvedSettingsPath)
}

export class SettingsMigrationService {
  createMigrationPlan(currentSettings: Partial<AppSettings>): SettingsMigrationPlan {
    const original = cloneSettings(currentSettings)
    const dryRunResult = dryRunUpgradeSettings(original)
    dryRunResult.settings = sanitizeMigrationResult(dryRunResult.settings, original)

    const blockingIssues = [...dryRunResult.report.blockingIssues]
    const status = blockingIssues.length > 0 ? 'blocked' : 'safe_to_apply'

    return {
      id: planId(),
      generatedAt: now(),
      sourceVersion: dryRunResult.report.originalVersion,
      targetVersion: dryRunResult.report.targetVersion,
      status,
      changes: dryRunResult.report.changes,
      warnings: dryRunResult.report.warnings,
      blockingIssues,
      backupRequired: true,
      canApply: status === 'safe_to_apply',
      canRollback: false,
      dryRunResult
    }
  }

  dryRunFromSettings(currentSettings: Partial<AppSettings>): SettingsMigrationPlan {
    return this.createMigrationPlan(currentSettings)
  }

  canApplyMigration(plan: SettingsMigrationPlan): boolean {
    return plan.canApply && plan.status === 'safe_to_apply' && plan.blockingIssues.length === 0
  }

  async applyMigrationFromFile(settingsPath: string): Promise<SettingsMigrationApplyResult> {
    const resolvedSettingsPath = safeSettingsPath(settingsPath)
    let backupPath: string | null = null
    let plan: SettingsMigrationPlan | null = null

    try {
      const data = await fs.readFile(resolvedSettingsPath, 'utf8')
      const currentSettings = JSON.parse(data) as Partial<AppSettings>
      plan = this.createMigrationPlan(currentSettings)

      if (!this.canApplyMigration(plan)) {
        return {
          success: false,
          planId: plan.id,
          appliedAt: null,
          backupPath: null,
          settingsPath: resolvedSettingsPath,
          warnings: plan.warnings,
          error: plan.blockingIssues.join('; ') || 'Migration is not safe to apply.'
        }
      }

      backupPath = await createSettingsBackup(resolvedSettingsPath)
      await atomicWriteJson(resolvedSettingsPath, plan.dryRunResult.settings)

      return {
        success: true,
        planId: plan.id,
        appliedAt: now(),
        backupPath,
        settingsPath: resolvedSettingsPath,
        warnings: plan.warnings,
        error: null
      }
    } catch (error) {
      return {
        success: false,
        planId: plan?.id ?? '',
        appliedAt: null,
        backupPath,
        settingsPath: resolvedSettingsPath,
        warnings: plan?.warnings ?? [],
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  async rollbackMigration(settingsPath: string, backupPath: string): Promise<SettingsMigrationRollbackResult> {
    const resolvedSettingsPath = safeSettingsPath(settingsPath)

    try {
      await restoreSettingsBackup(resolvedSettingsPath, backupPath)
      return {
        success: true,
        rolledBackAt: now(),
        restoredFromBackup: path.resolve(backupPath),
        settingsPath: resolvedSettingsPath,
        warnings: [],
        error: null
      }
    } catch (error) {
      return {
        success: false,
        rolledBackAt: null,
        restoredFromBackup: null,
        settingsPath: resolvedSettingsPath,
        warnings: [],
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }
}
