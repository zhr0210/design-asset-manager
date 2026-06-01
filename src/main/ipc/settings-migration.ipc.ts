import { ipcMain } from 'electron'
import fs from 'fs/promises'
import path from 'path'
import {
  CHANNEL_SETTINGS_MIGRATION_ANALYZE,
  CHANNEL_SETTINGS_MIGRATION_CREATE_PLAN,
  CHANNEL_SETTINGS_MIGRATION_DRY_RUN,
  CHANNEL_SETTINGS_MIGRATION_LIST_BACKUPS
} from '../../shared/contracts/settings-migration.contract'
import type {
  SettingsMigrationAnalyzeRequest,
  SettingsMigrationCreatePlanRequest,
  SettingsMigrationDryRunRequest,
  SettingsMigrationIpcResponse,
  SettingsMigrationListBackupsRequest
} from '../../shared/contracts/settings-migration.contract'
import type { AppSettings } from '../../shared/types/settings.types'
import { analyzeSettingsCompatibility } from '../services/settings/settings-compatibility.dry-run'
import { createNewInstallAppSettingsDefaults } from '../services/settings/settings-defaults.builder'
import { listSettingsBackups } from '../services/settings/settings-migration.backup'
import { SettingsMigrationService } from '../services/settings/settings-migration.service'
import { SettingsService } from '../services/settings.service'

function success<T>(data: T): SettingsMigrationIpcResponse<T> {
  return { success: true, data }
}

function failure(error: unknown): SettingsMigrationIpcResponse<never> {
  return {
    success: false,
    error: error instanceof Error ? error.message : String(error)
  }
}

async function readCurrentSettingsSnapshot(settingsPath: string): Promise<Partial<AppSettings>> {
  try {
    const data = await fs.readFile(settingsPath, 'utf8')
    return JSON.parse(data) as Partial<AppSettings>
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException
    if (nodeError.code === 'ENOENT') {
      return createNewInstallAppSettingsDefaults()
    }
    throw error
  }
}

async function backupInfo(backupPath: string) {
  const stat = await fs.stat(backupPath)
  return {
    name: path.basename(backupPath),
    createdAt: stat.birthtime?.toISOString?.() ?? null,
    sizeBytes: stat.size
  }
}

export function registerSettingsMigrationIpc() {
  const settingsService = SettingsService.getInstance()
  const migrationService = new SettingsMigrationService()

  ipcMain.handle(CHANNEL_SETTINGS_MIGRATION_CREATE_PLAN, async (_, request?: SettingsMigrationCreatePlanRequest) => {
    try {
      const settings = request?.settingsSnapshot ?? await readCurrentSettingsSnapshot(settingsService.getSettingsPath())
      return success(migrationService.createMigrationPlan(settings))
    } catch (err) {
      console.error(`[IPC] ${CHANNEL_SETTINGS_MIGRATION_CREATE_PLAN} error:`, err)
      return failure(err)
    }
  })

  ipcMain.handle(CHANNEL_SETTINGS_MIGRATION_DRY_RUN, async (_, request?: SettingsMigrationDryRunRequest) => {
    try {
      const settings = request?.settingsSnapshot ?? await readCurrentSettingsSnapshot(settingsService.getSettingsPath())
      return success(migrationService.dryRunFromSettings(settings))
    } catch (err) {
      console.error(`[IPC] ${CHANNEL_SETTINGS_MIGRATION_DRY_RUN} error:`, err)
      return failure(err)
    }
  })

  ipcMain.handle(CHANNEL_SETTINGS_MIGRATION_ANALYZE, async (_, request?: SettingsMigrationAnalyzeRequest) => {
    try {
      const settings = request?.settingsSnapshot ?? await readCurrentSettingsSnapshot(settingsService.getSettingsPath())
      return success(analyzeSettingsCompatibility(settings))
    } catch (err) {
      console.error(`[IPC] ${CHANNEL_SETTINGS_MIGRATION_ANALYZE} error:`, err)
      return failure(err)
    }
  })

  ipcMain.handle(CHANNEL_SETTINGS_MIGRATION_LIST_BACKUPS, async (_, request?: SettingsMigrationListBackupsRequest) => {
    try {
      const backupPaths = await listSettingsBackups(settingsService.getSettingsPath())
      const backups = await Promise.all(backupPaths.slice(-(request?.limit ?? backupPaths.length)).map(backupInfo))
      return success({ backups })
    } catch (err) {
      console.error(`[IPC] ${CHANNEL_SETTINGS_MIGRATION_LIST_BACKUPS} error:`, err)
      return failure(err)
    }
  })
}
