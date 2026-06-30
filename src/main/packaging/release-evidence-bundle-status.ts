import type {
  ReleasePackagingArch,
  ReleasePlatform
} from './release-flow-governance'
import type {
  ReleaseExternalGateNextAction,
  ReleaseExternalGateStatus
} from './release-external-gate-status'

export type ReleaseEvidenceBundleTargetStage = 'distribution_ready' | 'publish_ready'

export interface ReleaseEvidenceBundleRequirement {
  platform: ReleasePlatform
  arch: ReleasePackagingArch
}

export interface ReleaseEvidenceBundlePlatformStatus extends ReleaseEvidenceBundleRequirement {
  present: boolean
  stage: string | null
  distributionAllowed: boolean
  publishAllowed: boolean
  targetSatisfied: boolean
  nextExternalActions: ReleaseExternalGateNextAction[]
}

export interface ReleaseEvidenceBundleMissing {
  code: 'missing_external_gate_status' | 'target_stage_not_met'
  platform: ReleasePlatform
  arch: ReleasePackagingArch
  label: string
  detail: string
}

export interface ReleaseEvidenceBundleStatus {
  schemaVersion: 1
  source: 'release-external-gate-status'
  targetStage: ReleaseEvidenceBundleTargetStage
  displayOnly: true
  readsSecretValues: false
  readsSigningAssets: false
  readsBrandingAssetBytes: false
  readsCandidateBinaries: false
  emitsLocalPaths: false
  executesWorkflow: false
  publishesRelease: false
  bundleReady: boolean
  summary: {
    requiredPlatforms: number
    presentPlatforms: number
    satisfiedPlatforms: number
    missingPlatforms: number
  }
  platforms: ReleaseEvidenceBundlePlatformStatus[]
  missing: ReleaseEvidenceBundleMissing[]
}

export function createReleaseEvidenceBundleStatus(
  gateStatuses: ReleaseExternalGateStatus[],
  requirements: ReleaseEvidenceBundleRequirement[],
  targetStage: ReleaseEvidenceBundleTargetStage = 'distribution_ready'
): ReleaseEvidenceBundleStatus {
  const statusByPlatform = new Map<string, ReleaseExternalGateStatus['platforms'][number]>()
  for (const status of gateStatuses) {
    validateGateStatus(status)
    for (const platformStatus of status.platforms) {
      const key = platformKey(platformStatus.platform, platformStatus.arch)
      if (statusByPlatform.has(key)) {
        throw new Error(`Duplicate release external gate status for ${key}.`)
      }
      statusByPlatform.set(key, platformStatus)
    }
  }

  const platforms = requirements.map((requirement) => {
    const status = statusByPlatform.get(platformKey(requirement.platform, requirement.arch))
    const nextExternalActions = status?.gates
      .filter((gate): gate is typeof gate & { status: Exclude<typeof gate.status, 'satisfied'> } =>
        gate.status !== 'satisfied'
      )
      .map((gate) => ({
        platform: requirement.platform,
        arch: requirement.arch,
        code: gate.code,
        phase: gate.phase,
        actor: gate.actor,
        requiredBefore: gate.requiredBefore,
        label: gate.label,
        detail: gate.detail,
        status: gate.status,
        missing: gate.missing
      })) ?? []

    return {
      platform: requirement.platform,
      arch: requirement.arch,
      present: Boolean(status),
      stage: status?.stage ?? null,
      distributionAllowed: status?.distributionAllowed ?? false,
      publishAllowed: status?.publishAllowed ?? false,
      targetSatisfied: status ? isTargetSatisfied(status, targetStage) : false,
      nextExternalActions
    }
  })

  const missing = platforms.flatMap((platform) => missingForPlatform(platform, targetStage))
  const presentPlatforms = platforms.filter((platform) => platform.present).length
  const satisfiedPlatforms = platforms.filter((platform) => platform.targetSatisfied).length

  return {
    schemaVersion: 1,
    source: 'release-external-gate-status',
    targetStage,
    displayOnly: true,
    readsSecretValues: false,
    readsSigningAssets: false,
    readsBrandingAssetBytes: false,
    readsCandidateBinaries: false,
    emitsLocalPaths: false,
    executesWorkflow: false,
    publishesRelease: false,
    bundleReady: missing.length === 0,
    summary: {
      requiredPlatforms: requirements.length,
      presentPlatforms,
      satisfiedPlatforms,
      missingPlatforms: requirements.length - presentPlatforms
    },
    platforms,
    missing
  }
}

function validateGateStatus(status: ReleaseExternalGateStatus): void {
  if (
    status.schemaVersion !== 1
    || status.source !== 'release-readiness-summary'
    || status.displayOnly !== true
    || status.readsSecretValues !== false
    || status.readsSigningAssets !== false
    || status.readsBrandingAssetBytes !== false
    || status.emitsLocalPaths !== false
    || status.executesWorkflow !== false
    || status.publishesRelease !== false
    || !Array.isArray(status.platforms)
  ) {
    throw new Error('Invalid release external gate status evidence.')
  }
}

function isTargetSatisfied(
  status: ReleaseExternalGateStatus['platforms'][number],
  targetStage: ReleaseEvidenceBundleTargetStage
): boolean {
  return targetStage === 'publish_ready'
    ? status.publishAllowed
    : status.distributionAllowed
}

function missingForPlatform(
  platform: ReleaseEvidenceBundlePlatformStatus,
  targetStage: ReleaseEvidenceBundleTargetStage
): ReleaseEvidenceBundleMissing[] {
  if (!platform.present) {
    return [{
      code: 'missing_external_gate_status',
      platform: platform.platform,
      arch: platform.arch,
      label: 'Missing release external gate status',
      detail: 'No retained release-external-gate-status evidence was provided for this platform and architecture.'
    }]
  }

  if (platform.targetSatisfied) return []

  return [{
    code: 'target_stage_not_met',
    platform: platform.platform,
    arch: platform.arch,
    label: 'Target release stage not met',
    detail: `This platform has not reached ${targetStage}. Current stage: ${platform.stage ?? 'unknown'}.`
  }]
}

function platformKey(platform: ReleasePlatform, arch: ReleasePackagingArch): string {
  return `${platform}:${arch}`
}
