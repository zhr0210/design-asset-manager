import type {
  RuntimePackageChecksumPlan,
  RuntimePackageDownloadPlan,
  RuntimePackageDownloadProgress,
  RuntimePackageDownloader,
  RuntimePackageEntry,
  RuntimePackageSource
} from './runtime-package.types'
import { validateSha256Format } from './runtime-package-manifest.validator'

export function createRuntimePackageChecksumPlan(entry: RuntimePackageEntry): RuntimePackageChecksumPlan {
  const blockingIssues: string[] = []
  if (!entry.sha256) blockingIssues.push(`${entry.id} is missing sha256 metadata.`)
  if (!validateSha256Format(entry.sha256)) blockingIssues.push(`${entry.id} has invalid sha256 metadata.`)

  return {
    algorithm: 'sha256',
    expectedSha256: entry.sha256,
    verificationRequired: true,
    blockingIssues
  }
}

export class MockRuntimePackageDownloader implements RuntimePackageDownloader {
  createPlan(entry: RuntimePackageEntry, source: RuntimePackageSource, destinationPath: string): RuntimePackageDownloadPlan {
    const blockingIssues: string[] = []
    if (source.type === 'remote') blockingIssues.push(`${source.id} is a reserved remote source and cannot be downloaded in Phase 10B.`)
    if (source.networkAccess !== 'never') blockingIssues.push(`${source.id} must not request network access in Phase 10B.`)
    if (!destinationPath.trim()) blockingIssues.push('destinationPath is required.')

    return {
      packageId: entry.id,
      sourceId: source.id,
      url: entry.url,
      destinationPath,
      sizeBytes: entry.sizeBytes,
      checksum: createRuntimePackageChecksumPlan(entry),
      dryRun: true,
      warnings: ['Mock downloader only emits progress events; it does not download or write files.'],
      blockingIssues
    }
  }

  async dryRun(plan: RuntimePackageDownloadPlan): Promise<RuntimePackageDownloadProgress[]> {
    if (plan.blockingIssues.length > 0 || plan.checksum.blockingIssues.length > 0) {
      return [
        {
          packageId: plan.packageId,
          status: 'blocked',
          downloadedBytes: 0,
          totalBytes: plan.sizeBytes,
          percent: 0,
          message: [...plan.blockingIssues, ...plan.checksum.blockingIssues].join(' ')
        }
      ]
    }

    return [
      createProgress(plan, 'planned', 0, 'Mock download planned.'),
      createProgress(plan, 'progress', Math.floor(plan.sizeBytes / 2), 'Mock download progress.'),
      createProgress(plan, 'completed', plan.sizeBytes, 'Mock download completed without file IO.')
    ]
  }
}

function createProgress(
  plan: RuntimePackageDownloadPlan,
  status: RuntimePackageDownloadProgress['status'],
  downloadedBytes: number,
  message: string
): RuntimePackageDownloadProgress {
  const totalBytes = Math.max(plan.sizeBytes, 0)
  const percent = totalBytes === 0 ? 100 : Math.round((downloadedBytes / totalBytes) * 100)
  return {
    packageId: plan.packageId,
    status,
    downloadedBytes,
    totalBytes,
    percent,
    message
  }
}
