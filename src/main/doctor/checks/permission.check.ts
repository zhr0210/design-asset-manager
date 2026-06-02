import fs from 'fs/promises'
import path from 'path'
import type { ManagedPaths } from '../../../shared/types/platform.types'
import { assertInsideManagedRoot, ensureDirectory, safeRemoveInsideRoot } from '../../platform/filesystem-guard'
import { resolveCachePaths, resolveTempPaths } from '../../platform/cache-path-resolver'
import { resolveLogPaths } from '../../platform/log-path-resolver'
import { auditManagedPaths, summarizeManagedPathAudit } from '../../platform/managed-path-audit'
import type { RegisteredDoctorCheck } from '../doctor.types'

async function checkWritable(root: string, label: string) {
  const testDir = path.join(root, 'doctor-permission-check')
  const testFile = path.join(testDir, `probe-${Date.now()}-${Math.random().toString(36).slice(2)}.tmp`)
  try {
    assertInsideManagedRoot(root, testDir)
    await ensureDirectory(testDir)
    await fs.writeFile(testFile, 'doctor', 'utf8')
    assertInsideManagedRoot(root, testFile)
    await fs.unlink(testFile)
    await safeRemoveInsideRoot(root, testDir)
    return { label, path: root, writable: true }
  } catch (err) {
    return {
      label,
      path: root,
      writable: false,
      error: err instanceof Error ? err.message : String(err)
    }
  }
}

export const permissionCheck: RegisteredDoctorCheck = {
  id: 'permission',
  label: 'Managed path permissions',
  async run(context) {
    const startedAt = Date.now()
    const paths: Array<[keyof ManagedPaths, string]> = [
      ['userDataDir', context.managedPaths.userDataDir],
      ['logsDir', context.managedPaths.logsDir],
      ['cacheDir', context.managedPaths.cacheDir],
      ['databaseDir', context.managedPaths.databaseDir],
      ['tempDir', context.managedPaths.tempDir]
    ]
    const results = await Promise.all(paths.map(([label, dir]) => checkWritable(dir, label)))
    const logPaths = resolveLogPaths(context.managedPaths)
    const logPathResults = await Promise.all([
      checkWritable(logPaths.logsDir, 'logsDir'),
      checkWritable(logPaths.debugDir, 'debugDir')
    ])
    const cachePaths = resolveCachePaths(context.managedPaths)
    const tempPaths = resolveTempPaths(context.managedPaths)
    const cacheTempResults = await Promise.all([
      checkWritable(cachePaths.cacheDir, 'cacheDir'),
      checkWritable(tempPaths.tempDir, 'tempDir'),
      checkWritable(cachePaths.diagnosticCacheDir, 'diagnosticCacheDir'),
      checkWritable(tempPaths.testTempDir, 'testTempDir')
    ])
    const audit = await auditManagedPaths(context.managedPaths, {
      checkWritable: true,
      writableProbeRoot: path.join(context.managedPaths.tempDir, 'doctor-managed-path-audit')
    })
    const auditSummary = summarizeManagedPathAudit(audit)
    const status = [...results, ...logPathResults, ...cacheTempResults].every((item) => item.writable) && auditSummary.errorCount === 0 ? 'ok' : 'warning'

    return {
      id: this.id,
      label: this.label,
      status,
      message: status === 'ok' ? 'Managed paths are writable.' : 'One or more managed paths are not writable.',
      details: { paths: results, logPaths: logPathResults, cacheTempPaths: cacheTempResults, audit: auditSummary },
      fixSuggestion: status === 'ok' ? undefined : 'Choose writable app-managed directories or fix OS permissions.',
      durationMs: Date.now() - startedAt
    }
  }
}
