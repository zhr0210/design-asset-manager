import fs from 'fs/promises'
import type { ManagedPaths } from '../../../shared/types/platform.types'
import { assertSafeCachePath, assertSafeTempPath, resolveCachePaths, resolveTempPaths } from '../../platform/cache-path-resolver'
import { assertSafeLogPath, resolveLogPaths } from '../../platform/log-path-resolver'
import { auditManagedPaths, summarizeManagedPathAudit } from '../../platform/managed-path-audit'
import type { RegisteredDoctorCheck } from '../doctor.types'

async function pathState(pathValue: string) {
  try {
    const stat = await fs.stat(pathValue)
    return { path: pathValue, exists: true, isDirectory: stat.isDirectory() }
  } catch {
    return { path: pathValue, exists: false, isDirectory: false }
  }
}

export const pathCheck: RegisteredDoctorCheck = {
  id: 'path',
  label: 'Managed paths',
  async run(context) {
    const startedAt = Date.now()
    const entries = Object.entries(context.managedPaths) as Array<[keyof ManagedPaths, string]>
    const paths = Object.fromEntries(
      await Promise.all(entries.map(async ([key, value]) => [key, await pathState(value)]))
    )
    const audit = await auditManagedPaths(context.managedPaths)
    const auditSummary = summarizeManagedPathAudit(audit)
    const logPaths = resolveLogPaths(context.managedPaths)
    const cachePaths = resolveCachePaths(context.managedPaths)
    const tempPaths = resolveTempPaths(context.managedPaths)
    const logPathDiagnostics = {
      logsDir: {
        path: logPaths.logsDir,
        isInsideManagedLogsRoot: assertSafeLogPath(logPaths.logsDir, context.managedPaths).isInsideLogsDir
      },
      debugDir: {
        path: logPaths.debugDir,
        isInsideManagedLogsRoot: assertSafeLogPath(logPaths.debugDir, context.managedPaths).isInsideLogsDir
      }
    }
    const cacheTempDiagnostics = {
      cacheDir: {
        path: cachePaths.cacheDir,
        isInsideManagedCacheRoot: assertSafeCachePath(cachePaths.cacheDir, context.managedPaths).isInsideManagedRoot
      },
      tempDir: {
        path: tempPaths.tempDir,
        isInsideManagedTempRoot: assertSafeTempPath(tempPaths.tempDir, context.managedPaths).isInsideManagedRoot
      },
      diagnosticCacheDir: {
        path: cachePaths.diagnosticCacheDir,
        isInsideManagedCacheRoot: assertSafeCachePath(cachePaths.diagnosticCacheDir, context.managedPaths).isInsideManagedRoot
      },
      testTempDir: {
        path: tempPaths.testTempDir,
        isInsideManagedTempRoot: assertSafeTempPath(tempPaths.testTempDir, context.managedPaths).isInsideManagedRoot
      }
    }
    const status = auditSummary.errorCount > 0 ? 'warning' : 'ok'

    return {
      id: this.id,
      label: this.label,
      status,
      message: status === 'ok' ? 'Managed paths resolved.' : 'Managed paths resolved with blocking audit issues.',
      details: { paths, audit: auditSummary, logPaths: logPathDiagnostics, cacheTempPaths: cacheTempDiagnostics },
      fixSuggestion: status === 'ok' ? undefined : 'Review managed path metadata and prefer path-resolver managed directories.',
      durationMs: Date.now() - startedAt
    }
  }
}
