import path from 'path'
import type { ManagedPaths } from '../../shared/types/platform.types'
import { assertInsideManagedRoot } from './filesystem-guard'
import { ensureSafeJoin, sanitizeFilename } from './path-normalizer'
import type { LogPaths, LogPathResolverOptions, LogPathSafetyResult } from './log-path-resolver.types'

const DEFAULT_LOG_EXTENSION = '.log'

export function resolveLogPaths(managedPaths: ManagedPaths): LogPaths {
  const logsDir = path.resolve(managedPaths.logsDir)
  return {
    logsDir,
    debugDir: ensureSafeJoin(logsDir, 'debug'),
    doctorLogsDir: ensureSafeJoin(logsDir, 'doctor'),
    aiRuntimeLogsDir: ensureSafeJoin(logsDir, 'ai-runtime'),
    bootstrapLogsDir: ensureSafeJoin(logsDir, 'bootstrap'),
    settingsMigrationLogsDir: ensureSafeJoin(logsDir, 'settings-migration'),
    legacyLogsDir: ensureSafeJoin(logsDir, 'legacy')
  }
}

export function resolveServiceLogPath(serviceId: string, options: LogPathResolverOptions = {}): string {
  const managedPaths = requireManagedPaths(options)
  const logPaths = resolveLogPaths(managedPaths)
  const fileName = options.fileName ?? `${sanitizeLogFileName(serviceId)}${normalizeExtension(options.extension)}`
  const target = ensureSafeJoin(logPaths.logsDir, ...sanitizeRelativePath(fileName))
  assertSafeLogPath(target, managedPaths)
  return target
}

export function resolveDebugLogPath(debugId: string, options: LogPathResolverOptions = {}): string {
  const managedPaths = requireManagedPaths(options)
  const logPaths = resolveLogPaths(managedPaths)
  const fileName = options.fileName ?? `${sanitizeLogFileName(debugId)}${normalizeExtension(options.extension)}`
  const target = ensureSafeJoin(logPaths.debugDir, ...sanitizeRelativePath(fileName))
  assertSafeLogPath(target, managedPaths)
  return target
}

export function sanitizeLogFileName(input: string): string {
  const sanitized = sanitizeFilename(input).replace(/[/\\]+/g, '_')
  return sanitized || 'log'
}

export function assertSafeLogPath(targetPath: string, managedPaths: ManagedPaths): LogPathSafetyResult {
  const logPaths = resolveLogPaths(managedPaths)
  const resolvedTarget = path.resolve(targetPath)
  assertInsideManagedRoot(logPaths.logsDir, resolvedTarget)
  return {
    path: resolvedTarget,
    logsDir: logPaths.logsDir,
    isInsideLogsDir: true
  }
}

function requireManagedPaths(options: LogPathResolverOptions): ManagedPaths {
  if (!options.managedPaths) {
    throw new Error('managedPaths is required to resolve managed log paths.')
  }
  return options.managedPaths
}

function normalizeExtension(extension?: string): string {
  if (!extension) return DEFAULT_LOG_EXTENSION
  const sanitized = sanitizeLogFileName(extension)
  return sanitized.startsWith('.') ? sanitized : `.${sanitized}`
}

function sanitizeRelativePath(input: string): string[] {
  return input
    .split(/[/\\]+/)
    .map((segment) => sanitizeLogFileName(segment))
    .filter((segment) => segment && segment !== '.' && segment !== '..')
}
