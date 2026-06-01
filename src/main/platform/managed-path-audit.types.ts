import type { ManagedPaths, PlatformArch, PlatformName } from '../../shared/types/platform.types'

export type ManagedPathAuditSeverity = 'ok' | 'warning' | 'error'

export interface HardcodedPathPatternDetection {
  hasWindowsDrive: boolean
  hasWindowsAppData: boolean
  hasWindowsBackslash: boolean
  hasMacUsersPath: boolean
  hasMacApplicationsPath: boolean
  hasMacUsrLocalPath: boolean
  hasMacLibraryPath: boolean
  patterns: string[]
}

export interface ManagedPathSafetyOptions {
  key?: keyof ManagedPaths | string
  userDataDir?: string
  managedRoot?: string
  checkWritable?: boolean
  writableProbeRoot?: string
  allowOutsideUserDataDir?: boolean
}

export interface ManagedPathSafetyResult {
  key: string
  path: string
  status: ManagedPathAuditSeverity
  isEmpty: boolean
  isAbsolute: boolean
  isInsideUserDataDir: boolean | null
  isInsideManagedRoot: boolean | null
  isWritable?: boolean
  hasPathTraversal: boolean
  hasIllegalFilenameChars: boolean
  hardcodedPatterns: HardcodedPathPatternDetection
  warnings: string[]
  blockingIssues: string[]
  recommendations: string[]
}

export interface ManagedPathAuditReport {
  generatedAt: string
  platform: PlatformName
  arch: PlatformArch
  checkedPaths: ManagedPathSafetyResult[]
  warnings: string[]
  blockingIssues: string[]
  recommendations: string[]
}
