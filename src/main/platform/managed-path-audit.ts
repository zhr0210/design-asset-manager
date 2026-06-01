import fs from 'fs/promises'
import path from 'path'
import type { ManagedPaths } from '../../shared/types/platform.types'
import { detectPlatform } from './platform-detector'
import { ensureSafeJoin, isInsideDirectory } from './path-normalizer'
import type {
  HardcodedPathPatternDetection,
  ManagedPathAuditReport,
  ManagedPathSafetyOptions,
  ManagedPathSafetyResult
} from './managed-path-audit.types'

const WINDOWS_DRIVE_PATTERN = /[A-Za-z]:[\\/]/
const WINDOWS_APPDATA_PATTERN = /(?:^|[\\/])AppData(?:[\\/]|$)/i
const WINDOWS_BACKSLASH_PATTERN = /\\/
const MAC_USERS_PATTERN = /^\/Users\//
const MAC_APPLICATIONS_PATTERN = /^\/Applications(?:\/|$)/
const MAC_USR_LOCAL_PATTERN = /^\/usr\/local(?:\/|$)/
const MAC_LIBRARY_PATTERN = /^(?:~\/Library|\/Users\/[^/]+\/Library)(?:\/|$)/
const ILLEGAL_FILENAME_SEGMENT_CHARS = /[<>:"|?*\x00-\x1F]/

export function detectHardcodedPathPattern(value: string): HardcodedPathPatternDetection {
  const patterns: string[] = []
  const hasWindowsDrive = WINDOWS_DRIVE_PATTERN.test(value)
  const hasWindowsAppData = WINDOWS_APPDATA_PATTERN.test(value)
  const hasWindowsBackslash = WINDOWS_BACKSLASH_PATTERN.test(value)
  const hasMacUsersPath = MAC_USERS_PATTERN.test(value)
  const hasMacApplicationsPath = MAC_APPLICATIONS_PATTERN.test(value)
  const hasMacUsrLocalPath = MAC_USR_LOCAL_PATTERN.test(value)
  const hasMacLibraryPath = MAC_LIBRARY_PATTERN.test(value)

  if (hasWindowsDrive) patterns.push('windows-drive')
  if (hasWindowsAppData) patterns.push('windows-appdata')
  if (hasWindowsBackslash) patterns.push('windows-backslash')
  if (hasMacUsersPath) patterns.push('macos-users')
  if (hasMacApplicationsPath) patterns.push('macos-applications')
  if (hasMacUsrLocalPath) patterns.push('macos-usr-local')
  if (hasMacLibraryPath) patterns.push('macos-library')

  return {
    hasWindowsDrive,
    hasWindowsAppData,
    hasWindowsBackslash,
    hasMacUsersPath,
    hasMacApplicationsPath,
    hasMacUsrLocalPath,
    hasMacLibraryPath,
    patterns
  }
}

export async function auditPathSafety(pathValue: string, options: ManagedPathSafetyOptions = {}): Promise<ManagedPathSafetyResult> {
  const key = options.key?.toString() ?? 'path'
  const warnings: string[] = []
  const blockingIssues: string[] = []
  const recommendations: string[] = []
  const trimmed = pathValue?.trim() ?? ''
  const isEmpty = trimmed.length === 0
  const isAbsolute = !isEmpty && (path.isAbsolute(trimmed) || path.win32.isAbsolute(trimmed) || path.posix.isAbsolute(trimmed))
  const hardcodedPatterns = detectHardcodedPathPattern(trimmed)
  const hasPathTraversal = containsPathTraversal(trimmed)
  const hasIllegalFilenameChars = containsIllegalFilenameChars(trimmed)
  const isInsideUserDataDir = !isEmpty && options.userDataDir ? isInsideDirectory(options.userDataDir, trimmed) : null
  const isInsideManagedRoot = !isEmpty && options.managedRoot ? isInsideDirectory(options.managedRoot, trimmed) : null

  if (isEmpty) {
    blockingIssues.push(`${key} is empty.`)
  }
  if (!isEmpty && !isAbsolute) {
    warnings.push(`${key} is not an absolute path.`)
    recommendations.push(`Resolve ${key} through path-resolver before use.`)
  }
  if (isInsideUserDataDir === false && !options.allowOutsideUserDataDir) {
    warnings.push(`${key} is outside userDataDir.`)
  }
  if (isInsideManagedRoot === false) {
    blockingIssues.push(`${key} is outside the managed root.`)
  }
  if (hasPathTraversal) {
    blockingIssues.push(`${key} contains path traversal segments.`)
  }
  if (hasIllegalFilenameChars) {
    warnings.push(`${key} contains characters that are illegal in Windows filename segments.`)
  }
  if (hardcodedPatterns.hasWindowsDrive || hardcodedPatterns.hasWindowsAppData || hardcodedPatterns.hasWindowsBackslash) {
    warnings.push(`${key} contains Windows-specific path patterns.`)
  }
  if (hardcodedPatterns.hasMacUsersPath || hardcodedPatterns.hasMacApplicationsPath || hardcodedPatterns.hasMacUsrLocalPath || hardcodedPatterns.hasMacLibraryPath) {
    warnings.push(`${key} contains macOS-specific path patterns.`)
  }

  let isWritable: boolean | undefined
  if (options.checkWritable) {
    isWritable = await probeWritablePath(trimmed, options)
    if (!isWritable) {
      warnings.push(`${key} is not writable through the controlled audit probe.`)
      recommendations.push(`Check OS permissions for ${key}.`)
    }
  }

  const status = blockingIssues.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'ok'

  return {
    key,
    path: trimmed,
    status,
    isEmpty,
    isAbsolute,
    isInsideUserDataDir,
    isInsideManagedRoot,
    isWritable,
    hasPathTraversal,
    hasIllegalFilenameChars,
    hardcodedPatterns,
    warnings,
    blockingIssues,
    recommendations
  }
}

export async function auditManagedPaths(managedPaths: ManagedPaths, options: { checkWritable?: boolean; writableProbeRoot?: string } = {}): Promise<ManagedPathAuditReport> {
  const platformInfo = detectPlatform()
  const entries = Object.entries(managedPaths) as Array<[keyof ManagedPaths, string]>
  const checkedPaths = await Promise.all(
    entries.map(([key, value]) =>
      auditPathSafety(value, {
        key,
        userDataDir: managedPaths.userDataDir,
        managedRoot: key === 'tempDir' || key === 'downloadsDir' ? value : managedPaths.userDataDir,
        checkWritable: options.checkWritable,
        writableProbeRoot: options.writableProbeRoot,
        allowOutsideUserDataDir: key === 'tempDir' || key === 'downloadsDir'
      })
    )
  )
  const warnings = checkedPaths.flatMap((item) => item.warnings)
  const blockingIssues = checkedPaths.flatMap((item) => item.blockingIssues)
  const recommendations = [...new Set(checkedPaths.flatMap((item) => item.recommendations))]

  return {
    generatedAt: new Date().toISOString(),
    platform: platformInfo.platform,
    arch: platformInfo.arch,
    checkedPaths,
    warnings,
    blockingIssues,
    recommendations
  }
}

export function summarizeManagedPathAudit(report: ManagedPathAuditReport) {
  return {
    checkedPathCount: report.checkedPaths.length,
    okCount: report.checkedPaths.filter((item) => item.status === 'ok').length,
    warningCount: report.checkedPaths.filter((item) => item.status === 'warning').length,
    errorCount: report.checkedPaths.filter((item) => item.status === 'error').length,
    warnings: report.warnings,
    blockingIssues: report.blockingIssues,
    recommendations: report.recommendations
  }
}

function containsPathTraversal(pathValue: string): boolean {
  return pathValue.split(/[\\/]+/).some((segment) => segment === '..')
}

function containsIllegalFilenameChars(pathValue: string): boolean {
  return pathValue.split(/[\\/]+/).some((segment) => {
    if (!segment || segment === '.' || segment === '..') return false
    if (/^[A-Za-z]:$/.test(segment)) return false
    return ILLEGAL_FILENAME_SEGMENT_CHARS.test(segment)
  })
}

async function probeWritablePath(pathValue: string, options: ManagedPathSafetyOptions): Promise<boolean> {
  if (!pathValue || !options.writableProbeRoot) return false
  try {
    const probeRoot = path.resolve(options.writableProbeRoot)
    const probeDir = ensureSafeJoin(probeRoot, 'managed-path-audit')
    const probeFile = ensureSafeJoin(probeDir, `probe-${Date.now()}-${Math.random().toString(36).slice(2)}.tmp`)
    await fs.mkdir(probeDir, { recursive: true })
    await fs.writeFile(probeFile, 'audit', 'utf8')
    await fs.unlink(probeFile)
    return true
  } catch {
    return false
  }
}
