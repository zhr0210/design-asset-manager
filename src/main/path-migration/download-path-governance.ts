import path from 'path'

const WINDOWS_ILLEGAL_CHARS = /[<>:"/\\|?*\u0000-\u001F]/g

export interface DownloadPathPlanInput {
  downloadsRoot: string
  requestedFilename: string
  existingFilenames?: string[]
}

export interface DownloadPathDryRunPlan {
  phase: '14B'
  dryRunOnly: true
  autoModifyDownloadQueue: false
  sanitizedFilename: string
  duplicateStrategy: 'append-counter'
  plannedSavePath: string
  warnings: string[]
}

export function sanitizeDownloadFilename(filename: string): string {
  const sanitized = filename.replace(WINDOWS_ILLEGAL_CHARS, '_').replace(/\s+/g, ' ').trim()
  return sanitized || 'download'
}

export function createDownloadPathDryRunPlan(input: DownloadPathPlanInput): DownloadPathDryRunPlan {
  const existing = new Set((input.existingFilenames ?? []).map((item) => item.toLowerCase()))
  const parsed = path.parse(sanitizeDownloadFilename(input.requestedFilename))
  let candidate = `${parsed.name}${parsed.ext}`
  let counter = 1
  while (existing.has(candidate.toLowerCase())) {
    counter += 1
    candidate = `${parsed.name}-${counter}${parsed.ext}`
  }

  return {
    phase: '14B',
    dryRunOnly: true,
    autoModifyDownloadQueue: false,
    sanitizedFilename: candidate,
    duplicateStrategy: 'append-counter',
    plannedSavePath: path.join(input.downloadsRoot, candidate),
    warnings: candidate !== input.requestedFilename ? ['Filename was sanitized or deduplicated in dry-run only.'] : []
  }
}
