import path from 'path'
import type {
  RuntimePackageDownloadPlan,
  RuntimePackageDownloadProgress,
  RuntimePackageExtractPlan,
  RuntimePackageRollbackPlan,
  RuntimePackageVerificationResult
} from './runtime-package.types'

export function verifyMockDownloadedPackage(plan: RuntimePackageDownloadPlan, actualSha256: string): RuntimePackageVerificationResult {
  const blockingIssues = [...plan.blockingIssues, ...plan.checksum.blockingIssues]
  if (actualSha256 !== plan.checksum.expectedSha256) {
    blockingIssues.push(`${plan.packageId} checksum mismatch.`)
  }

  return {
    packageId: plan.packageId,
    status: blockingIssues.length > 0 ? 'blocked' : 'passed',
    algorithm: 'sha256',
    expectedSha256: plan.checksum.expectedSha256,
    actualSha256,
    message: blockingIssues.length > 0 ? 'Mock verification blocked.' : 'Mock verification passed.',
    blockingIssues
  }
}

export function createRuntimePackageRollbackPlan(packageId: string, targetDirectory: string): RuntimePackageRollbackPlan {
  return {
    packageId,
    restorePaths: [],
    removePaths: [path.normalize(targetDirectory)],
    registryRestoreRequired: true,
    notes: ['Rollback is a dry-run plan until installer apply is implemented.']
  }
}

export class MockRuntimePackageExtractor {
  createPlan(packageId: string, archivePath: string, extractRoot: string, targetDirectory: string): RuntimePackageExtractPlan {
    const normalizedRoot = path.resolve(extractRoot)
    const normalizedTarget = path.resolve(targetDirectory)
    const blockingIssues: string[] = []

    if (!archivePath.trim()) blockingIssues.push('archivePath is required.')
    if (!normalizedTarget.startsWith(normalizedRoot)) {
      blockingIssues.push('targetDirectory must stay inside extractRoot.')
    }

    return {
      packageId,
      archivePath: path.normalize(archivePath),
      extractRoot: normalizedRoot,
      targetDirectory: normalizedTarget,
      dryRun: true,
      rollbackPlan: createRuntimePackageRollbackPlan(packageId, normalizedTarget),
      warnings: ['Mock extractor only emits dry-run progress; it does not extract files.'],
      blockingIssues
    }
  }

  async dryRun(plan: RuntimePackageExtractPlan): Promise<RuntimePackageDownloadProgress[]> {
    if (plan.blockingIssues.length > 0) {
      return [
        {
          packageId: plan.packageId,
          status: 'blocked',
          downloadedBytes: 0,
          totalBytes: 0,
          percent: 0,
          message: plan.blockingIssues.join(' ')
        }
      ]
    }

    return [
      { packageId: plan.packageId, status: 'planned', downloadedBytes: 0, totalBytes: 0, percent: 0, message: 'Mock extraction planned.' },
      { packageId: plan.packageId, status: 'completed', downloadedBytes: 0, totalBytes: 0, percent: 100, message: 'Mock extraction completed without file IO.' }
    ]
  }
}
