import fs from 'fs/promises'
import path from 'path'
import { assertSafeLogPath, resolveServiceLogPath, sanitizeLogFileName } from './log-path-resolver'
import { ensureDirectory, safeRemoveInsideRoot } from './filesystem-guard'
import type {
  ManagedLogCleanupOptions,
  ManagedLogEntry,
  ManagedLogWriterOptions,
  ManagedLogWriteResult
} from './managed-log-writer.types'

export async function writeManagedLog(entry: ManagedLogEntry, options: ManagedLogWriterOptions): Promise<ManagedLogWriteResult> {
  const fileName = options.fileName ?? `${sanitizeLogFileName(entry.source)}.log`
  const payload = JSON.stringify({
    timestamp: entry.timestamp ?? new Date().toISOString(),
    level: entry.level,
    source: entry.source,
    message: entry.message,
    details: entry.details,
    correlationId: entry.correlationId
  })
  return appendManagedLog(fileName, `${payload}\n`, options)
}

export async function appendManagedLog(fileName: string, content: string, options: ManagedLogWriterOptions): Promise<ManagedLogWriteResult> {
  const targetPath = resolveServiceLogPath(fileName, {
    managedPaths: options.managedPaths,
    fileName
  })
  assertSafeLogPath(targetPath, options.managedPaths)
  await ensureDirectory(path.dirname(targetPath))
  await fs.appendFile(targetPath, content, options.encoding ?? 'utf8')
  return {
    path: targetPath,
    bytesWritten: Buffer.byteLength(content, options.encoding ?? 'utf8')
  }
}

export async function readManagedLogTail(fileName: string, maxBytes: number, options: ManagedLogWriterOptions): Promise<string> {
  const targetPath = resolveServiceLogPath(fileName, {
    managedPaths: options.managedPaths,
    fileName
  })
  assertSafeLogPath(targetPath, options.managedPaths)
  const stat = await fs.stat(targetPath)
  const start = Math.max(0, stat.size - Math.max(0, maxBytes))
  const handle = await fs.open(targetPath, 'r')
  try {
    const buffer = Buffer.alloc(stat.size - start)
    await handle.read(buffer, 0, buffer.length, start)
    return buffer.toString(options.encoding ?? 'utf8')
  } finally {
    await handle.close()
  }
}

export async function cleanupManagedLogs(options: ManagedLogCleanupOptions): Promise<{ removed: string[]; skipped: boolean }> {
  if (!options.enabled) {
    return { removed: [], skipped: true }
  }

  const logsDir = path.resolve(options.managedPaths.logsDir)
  assertSafeLogPath(logsDir, options.managedPaths)
  const removed: string[] = []
  const entries = await fs.readdir(logsDir, { withFileTypes: true }).catch(() => [])
  const now = Date.now()

  for (const entry of entries) {
    const target = path.join(logsDir, entry.name)
    assertSafeLogPath(target, options.managedPaths)
    if (options.olderThanMs !== undefined) {
      const stat = await fs.stat(target)
      if (now - stat.mtimeMs < options.olderThanMs) continue
    }
    await safeRemoveInsideRoot(logsDir, target)
    removed.push(target)
  }

  return { removed, skipped: false }
}
