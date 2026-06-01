import fs from 'fs/promises'
import path from 'path'
import { assertInsideManagedRoot, ensureDirectory, safeRemoveInsideRoot } from '../platform/filesystem-guard'
import { ensureSafeJoin } from '../platform/path-normalizer'
import { resolveManagedPaths } from '../platform/path-resolver'

const REGISTRY_FILE_NAME = 'runtime-registry.json'
const BACKUP_DIR_NAME = 'runtime-registry.backups'

function defaultRegistryPath(): string {
  return path.join(resolveManagedPaths().configDir, REGISTRY_FILE_NAME)
}

function getBackupDir(registryPath: string): string {
  return ensureSafeJoin(path.dirname(registryPath), BACKUP_DIR_NAME)
}

function backupName() {
  return `runtime-registry.${new Date().toISOString().replace(/[:.]/g, '-')}.json`
}

export async function createRegistryBackup(registryPath = defaultRegistryPath()): Promise<string | null> {
  const registryDir = path.dirname(registryPath)
  assertInsideManagedRoot(registryDir, registryPath)

  try {
    await fs.access(registryPath)
  } catch {
    return null
  }

  const backupDir = getBackupDir(registryPath)
  await ensureDirectory(backupDir)
  const backupPath = ensureSafeJoin(backupDir, backupName())
  await fs.copyFile(registryPath, backupPath)
  return backupPath
}

export async function restoreRegistryBackup(backupPath: string): Promise<string> {
  const backupDir = path.dirname(backupPath)
  const registryDir = path.dirname(backupDir)
  const registryPath = ensureSafeJoin(registryDir, REGISTRY_FILE_NAME)

  assertInsideManagedRoot(registryDir, backupPath)
  await fs.copyFile(backupPath, registryPath)
  return registryPath
}

export async function listRegistryBackups(registryPath = defaultRegistryPath()): Promise<string[]> {
  const backupDir = getBackupDir(registryPath)
  try {
    const entries = await fs.readdir(backupDir)
    return entries
      .filter((entry) => entry.endsWith('.json'))
      .map((entry) => ensureSafeJoin(backupDir, entry))
      .sort()
  } catch {
    return []
  }
}

export async function cleanupOldRegistryBackups(maxCount: number, registryPath = defaultRegistryPath()): Promise<string[]> {
  if (maxCount < 0) throw new Error('maxCount must be non-negative.')
  const backups = await listRegistryBackups(registryPath)
  const removable = backups.slice(0, Math.max(0, backups.length - maxCount))

  for (const backupPath of removable) {
    await safeRemoveInsideRoot(path.dirname(path.dirname(backupPath)), backupPath)
  }

  return removable
}
