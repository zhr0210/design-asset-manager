import fs from 'fs/promises'
import path from 'path'
import { assertInsideManagedRoot, ensureDirectory, safeRemoveInsideRoot } from '../../platform/filesystem-guard'

const BACKUP_DIR_NAME = 'settings-backups'

function settingsRoot(settingsPath: string): string {
  return path.dirname(path.resolve(settingsPath))
}

function backupDir(settingsPath: string): string {
  return path.join(settingsRoot(settingsPath), BACKUP_DIR_NAME)
}

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-')
}

function backupFileName(settingsPath: string): string {
  const parsed = path.parse(settingsPath)
  return `${parsed.name}.${timestamp()}.backup${parsed.ext || '.json'}`
}

export async function createSettingsBackup(settingsPath: string): Promise<string> {
  const resolvedSettingsPath = path.resolve(settingsPath)
  const root = settingsRoot(resolvedSettingsPath)
  assertInsideManagedRoot(root, resolvedSettingsPath)

  const targetDir = backupDir(resolvedSettingsPath)
  assertInsideManagedRoot(root, targetDir)
  await ensureDirectory(targetDir)

  const targetPath = path.join(targetDir, backupFileName(resolvedSettingsPath))
  assertInsideManagedRoot(root, targetPath)

  await fs.copyFile(resolvedSettingsPath, targetPath)
  return targetPath
}

export async function restoreSettingsBackup(settingsPath: string, backupPath: string): Promise<void> {
  const resolvedSettingsPath = path.resolve(settingsPath)
  const resolvedBackupPath = path.resolve(backupPath)
  const root = settingsRoot(resolvedSettingsPath)
  const allowedBackupDir = backupDir(resolvedSettingsPath)

  assertInsideManagedRoot(root, resolvedSettingsPath)
  assertInsideManagedRoot(allowedBackupDir, resolvedBackupPath)

  const tmpPath = `${resolvedSettingsPath}.rollback.${Date.now()}.tmp`
  assertInsideManagedRoot(root, tmpPath)

  await fs.copyFile(resolvedBackupPath, tmpPath)
  await fs.rename(tmpPath, resolvedSettingsPath)
}

export async function listSettingsBackups(settingsPath: string): Promise<string[]> {
  const root = settingsRoot(settingsPath)
  const targetDir = backupDir(settingsPath)
  assertInsideManagedRoot(root, targetDir)

  try {
    const entries = await fs.readdir(targetDir)
    return entries
      .filter((entry) => entry.endsWith('.backup.json'))
      .map((entry) => path.join(targetDir, entry))
      .sort()
  } catch {
    return []
  }
}

export async function cleanupOldSettingsBackups(settingsPath: string, maxCount: number): Promise<string[]> {
  if (maxCount < 0) {
    throw new Error('maxCount must be greater than or equal to zero.')
  }

  const backups = await listSettingsBackups(settingsPath)
  const removals = backups.slice(0, Math.max(0, backups.length - maxCount))
  const dir = backupDir(settingsPath)

  for (const backupPath of removals) {
    await safeRemoveInsideRoot(dir, backupPath)
  }

  return removals
}
