import type {
  RuntimePackageDownloadPlan,
  RuntimePackageExtractPlan,
  RuntimePackageInstallEvent,
  RuntimePackageInstallPlan,
  RuntimePackageInstallState,
  RuntimePackageRegistryMetadataPlan,
  RuntimePackageEntry,
  RuntimePackageSource,
  RuntimePackageVerificationResult
} from './runtime-package.types'
import { MockRuntimePackageDownloader } from './runtime-package-downloader'
import { MockRuntimePackageExtractor, verifyMockDownloadedPackage } from './runtime-package-verifier'

const TRANSITIONS: Record<RuntimePackageInstallState, Partial<Record<RuntimePackageInstallEvent, RuntimePackageInstallState>>> = {
  idle: { createPlan: 'planned', block: 'blocked' },
  planned: { verify: 'verifying', block: 'blocked', rollback: 'rolled-back' },
  verifying: { extract: 'extracting', block: 'blocked', rollback: 'rolled-back' },
  extracting: { complete: 'completed', block: 'blocked', rollback: 'rolled-back' },
  completed: { rollback: 'rolled-back' },
  blocked: { rollback: 'rolled-back' },
  'rolled-back': {}
}

export function transitionRuntimePackageInstallState(
  state: RuntimePackageInstallState,
  event: RuntimePackageInstallEvent
): RuntimePackageInstallState {
  return TRANSITIONS[state][event] ?? state
}

export function createRuntimePackageRegistryMetadataPlan(
  entry: RuntimePackageEntry,
  source: RuntimePackageSource,
  installPath: string
): RuntimePackageRegistryMetadataPlan {
  return {
    packageId: entry.id,
    sourceId: source.id,
    installedVersion: entry.version,
    installPath,
    status: 'planned',
    writeRegistry: false
  }
}

export class MockRuntimePackageInstaller {
  private readonly downloader = new MockRuntimePackageDownloader()
  private readonly extractor = new MockRuntimePackageExtractor()

  createDryRunPlan(
    entry: RuntimePackageEntry,
    source: RuntimePackageSource,
    archivePath: string,
    extractRoot: string,
    installPath: string
  ): RuntimePackageInstallPlan {
    const downloadPlan = this.downloader.createPlan(entry, source, archivePath)
    const verification = verifyMockDownloadedPackage(downloadPlan, entry.sha256)
    const extractPlan = this.extractor.createPlan(entry.id, archivePath, extractRoot, installPath)
    return createInstallPlan(entry, source, downloadPlan, verification, extractPlan)
  }
}

function createInstallPlan(
  entry: RuntimePackageEntry,
  source: RuntimePackageSource,
  downloadPlan: RuntimePackageDownloadPlan,
  verification: RuntimePackageVerificationResult,
  extractPlan: RuntimePackageExtractPlan
): RuntimePackageInstallPlan {
  const blockingIssues = [
    ...downloadPlan.blockingIssues,
    ...downloadPlan.checksum.blockingIssues,
    ...verification.blockingIssues,
    ...extractPlan.blockingIssues
  ]
  const state = blockingIssues.length > 0 ? 'blocked' : 'planned'

  return {
    packageId: entry.id,
    state,
    downloadPlan,
    verification,
    extractPlan,
    registryMetadata: createRuntimePackageRegistryMetadataPlan(entry, source, extractPlan.targetDirectory),
    rollbackPlan: extractPlan.rollbackPlan,
    dryRun: true,
    warnings: [...downloadPlan.warnings, ...extractPlan.warnings, 'Mock installer does not install Python, CUDA, models, or runtime packages.'],
    blockingIssues
  }
}
