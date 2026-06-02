import fs from 'fs/promises'
import path from 'path'
import {
  assertSafeCachePath,
  assertSafeTempPath,
  resolveServiceCachePath,
  resolveServiceTempPath
} from './cache-path-resolver'
import { ensureDirectory, safeRemoveInsideRoot } from './filesystem-guard'
import type {
  ManagedCacheCleanupOptions,
  ManagedCacheCleanupResult,
  ManagedCacheWriterOptions,
  ManagedCacheWriteResult
} from './managed-cache-writer.types'

export async function writeManagedCache(fileName: string, content: string | Buffer, options: ManagedCacheWriterOptions): Promise<ManagedCacheWriteResult> {
  const targetPath = resolveServiceCachePath(fileName, { managedPaths: options.managedPaths, fileName })
  assertSafeCachePath(targetPath, options.managedPaths)
  await ensureDirectory(path.dirname(targetPath))
  await fs.writeFile(targetPath, content, typeof content === 'string' ? options.encoding ?? 'utf8' : undefined)
  return {
    path: targetPath,
    bytesWritten: Buffer.isBuffer(content) ? content.byteLength : Buffer.byteLength(content, options.encoding ?? 'utf8')
  }
}

export async function readManagedCache(fileName: string, options: ManagedCacheWriterOptions): Promise<string> {
  const targetPath = resolveServiceCachePath(fileName, { managedPaths: options.managedPaths, fileName })
  assertSafeCachePath(targetPath, options.managedPaths)
  return fs.readFile(targetPath, options.encoding ?? 'utf8')
}

export async function removeManagedCache(fileName: string, options: ManagedCacheWriterOptions): Promise<void> {
  const targetPath = resolveServiceCachePath(fileName, { managedPaths: options.managedPaths, fileName })
  assertSafeCachePath(targetPath, options.managedPaths)
  await safeRemoveInsideRoot(options.managedPaths.cacheDir, targetPath)
}

export async function cleanupManagedCache(options: ManagedCacheCleanupOptions): Promise<ManagedCacheCleanupResult> {
  if (!options.enabled) return { removed: [], skipped: true }
  return cleanupInsideRoot(options.managedPaths.cacheDir, options, 'cache')
}

export async function writeManagedTempFile(fileName: string, content: string | Buffer, options: ManagedCacheWriterOptions): Promise<ManagedCacheWriteResult> {
  const targetPath = resolveServiceTempPath(fileName, { managedPaths: options.managedPaths, fileName })
  assertSafeTempPath(targetPath, options.managedPaths)
  await ensureDirectory(path.dirname(targetPath))
  await fs.writeFile(targetPath, content, typeof content === 'string' ? options.encoding ?? 'utf8' : undefined)
  return {
    path: targetPath,
    bytesWritten: Buffer.isBuffer(content) ? content.byteLength : Buffer.byteLength(content, options.encoding ?? 'utf8')
  }
}

export async function removeManagedTempFile(fileName: string, options: ManagedCacheWriterOptions): Promise<void> {
  const targetPath = resolveServiceTempPath(fileName, { managedPaths: options.managedPaths, fileName })
  assertSafeTempPath(targetPath, options.managedPaths)
  await safeRemoveInsideRoot(options.managedPaths.tempDir, targetPath)
}

export async function cleanupManagedTemp(options: ManagedCacheCleanupOptions): Promise<ManagedCacheCleanupResult> {
  if (!options.enabled) return { removed: [], skipped: true }
  return cleanupInsideRoot(options.managedPaths.tempDir, options, 'temp')
}

async function cleanupInsideRoot(root: string, options: ManagedCacheCleanupOptions, kind: 'cache' | 'temp'): Promise<ManagedCacheCleanupResult> {
  const rootDir = path.resolve(root)
  if (kind === 'cache') {
    assertSafeCachePath(rootDir, options.managedPaths)
  } else {
    assertSafeTempPath(rootDir, options.managedPaths)
  }

  const removed: string[] = []
  const entries = await fs.readdir(rootDir, { withFileTypes: true }).catch(() => [])
  const now = Date.now()

  for (const entry of entries) {
    const target = path.join(rootDir, entry.name)
    if (kind === 'cache') {
      assertSafeCachePath(target, options.managedPaths)
    } else {
      assertSafeTempPath(target, options.managedPaths)
    }
    if (options.olderThanMs !== undefined) {
      const stat = await fs.stat(target)
      if (now - stat.mtimeMs < options.olderThanMs) continue
    }
    await safeRemoveInsideRoot(rootDir, target)
    removed.push(target)
  }

  return { removed, skipped: false }
}
