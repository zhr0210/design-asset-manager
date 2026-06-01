import type { CompatibilityReport, SettingsCompatibilityChange } from './settings-compatibility.types'

export function createCompatibilityReport(input: {
  originalVersion?: number | null
  targetVersion: number
  changes?: SettingsCompatibilityChange[]
  warnings?: string[]
  blockingIssues?: string[]
}): CompatibilityReport {
  const changes = input.changes ?? []
  const blockingIssues = input.blockingIssues ?? []

  return {
    originalVersion: input.originalVersion ?? null,
    targetVersion: input.targetVersion,
    changes,
    warnings: input.warnings ?? [],
    blockingIssues,
    wouldChange: changes.some((change) => change.type === 'add' || change.type === 'normalize'),
    safeToApplyLater: blockingIssues.length === 0
  }
}

export function mergeCompatibilityReports(...reports: CompatibilityReport[]): CompatibilityReport {
  const targetVersion = Math.max(...reports.map((report) => report.targetVersion))
  const originalVersions = reports
    .map((report) => report.originalVersion)
    .filter((version): version is number => typeof version === 'number')

  return createCompatibilityReport({
    originalVersion: originalVersions.length > 0 ? Math.min(...originalVersions) : null,
    targetVersion,
    changes: reports.flatMap((report) => report.changes),
    warnings: reports.flatMap((report) => report.warnings),
    blockingIssues: reports.flatMap((report) => report.blockingIssues)
  })
}

export function hasCompatibilityBlockingIssues(report: CompatibilityReport): boolean {
  return report.blockingIssues.length > 0
}
