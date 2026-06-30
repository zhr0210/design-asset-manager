import type { ReleasePackagingArch, ReleasePlatform } from './release-flow-governance'
import { createReleaseEnvironmentManifest } from './release-environment-manifest'
import { releaseTargetPlatformMatches } from './release-target-selection'

export type ReleaseExternalGateCode =
  | 'branding_assets'
  | 'signing_environment'
  | 'signed_candidate_workflow'
  | 'distribution_install_smoke'
  | 'publish_approval'

export type ReleaseExternalGatePhase =
  | 'candidate_prerequisite'
  | 'signed_candidate'
  | 'distribution'
  | 'publish'

export type ReleaseExternalGateActor =
  | 'human'
  | 'github_environment'
  | 'github_actions'
  | 'platform_host'

export interface ReleaseExternalGate {
  code: ReleaseExternalGateCode
  phase: ReleaseExternalGatePhase
  actor: ReleaseExternalGateActor
  label: string
  detail: string
  requiredBefore: 'signed_candidate' | 'distribution_ready' | 'publish_ready'
  displayOnly: true
  executesAction: false
  requiredSecretNames: string[]
  requiredEvidence: string[]
}

export interface ReleaseExternalGatePlatformPlan {
  platform: ReleasePlatform
  environment: string
  workflowFileName: 'release-signed-candidate.yml'
  supportedArches: ReleasePackagingArch[]
  signingApprovalInput: 'signing_approved'
  brandingApprovalFile: 'release-branding.json'
  brandingIconFileName: 'icon.ico' | 'icon.icns'
  distributionSmoke: string
  distributionSmokeEvidenceSource: 'package-smoke'
  distributionSmokeCheckIds: string[]
  gates: ReleaseExternalGate[]
}

export interface ReleaseExternalGatePlan {
  schemaVersion: 1
  source: 'release-environment-manifest'
  status: 'external-action-required'
  writesGitHubSettings: false
  readsSecretValues: false
  readsSigningAssets: false
  readsBrandingAssetBytes: false
  emitsLocalPaths: false
  executesWorkflow: false
  publishesRelease: false
  platforms: ReleaseExternalGatePlatformPlan[]
}

export function createReleaseExternalGatePlan(): ReleaseExternalGatePlan {
  const manifest = createReleaseEnvironmentManifest()

  return {
    schemaVersion: 1,
    source: 'release-environment-manifest',
    status: 'external-action-required',
    writesGitHubSettings: false,
    readsSecretValues: false,
    readsSigningAssets: false,
    readsBrandingAssetBytes: false,
    emitsLocalPaths: false,
    executesWorkflow: false,
    publishesRelease: false,
    platforms: manifest.environments.map((entry) => ({
      platform: entry.platform,
      environment: entry.environment,
      workflowFileName: entry.workflowFileName,
      supportedArches: [...entry.supportedArches],
      signingApprovalInput: entry.signingApprovalInput,
      brandingApprovalFile: entry.brandingApprovalFile,
      brandingIconFileName: entry.brandingIconFileName,
      distributionSmoke: entry.requiredDistributionSmoke,
      distributionSmokeEvidenceSource: entry.distributionSmokeEvidenceSource,
      distributionSmokeCheckIds: [...entry.distributionSmokeCheckIds],
      gates: [
        {
          code: 'branding_assets',
          phase: 'candidate_prerequisite',
          actor: 'human',
          label: 'Human-approved release branding',
          detail: `Provide ${entry.brandingIconFileName} and ${entry.brandingApprovalFile} with approved SHA-256 values before a signed candidate can become distributable.`,
          requiredBefore: 'signed_candidate',
          displayOnly: true,
          executesAction: false,
          requiredSecretNames: [],
          requiredEvidence: ['release-branding-evidence']
        },
        {
          code: 'signing_environment',
          phase: 'candidate_prerequisite',
          actor: 'github_environment',
          label: 'Signing environment and secret names',
          detail: `Provision ${entry.environment} with required secret names and require GitHub Environment review.`,
          requiredBefore: 'signed_candidate',
          displayOnly: true,
          executesAction: false,
          requiredSecretNames: [...entry.requiredSecretNames],
          requiredEvidence: []
        },
        {
          code: 'signed_candidate_workflow',
          phase: 'signed_candidate',
          actor: 'github_actions',
          label: 'Signed candidate workflow dispatch',
          detail: `Run ${entry.workflowFileName} on main or a version tag with ${entry.signingApprovalInput}=true for each required architecture.`,
          requiredBefore: 'distribution_ready',
          displayOnly: true,
          executesAction: false,
          requiredSecretNames: [...entry.requiredSecretNames],
          requiredEvidence: [...entry.requiredEvidence]
        },
        {
          code: 'distribution_install_smoke',
          phase: 'distribution',
          actor: 'platform_host',
          label: 'Platform install smoke evidence',
          detail: `Generate ${entry.requiredDistributionSmoke} through ${entry.distributionSmokeEvidenceSource} and require all platform check ids to pass.`,
          requiredBefore: 'distribution_ready',
          displayOnly: true,
          executesAction: false,
          requiredSecretNames: [],
          requiredEvidence: [entry.distributionSmokeEvidenceSource]
        },
        {
          code: 'publish_approval',
          phase: 'publish',
          actor: 'human',
          label: 'Separate publish approval',
          detail: 'Publishing remains disabled until distribution-ready evidence exists and a separate release approval is granted.',
          requiredBefore: 'publish_ready',
          displayOnly: true,
          executesAction: false,
          requiredSecretNames: [],
          requiredEvidence: ['release-readiness-summary']
        }
      ]
    }))
  }
}

export function getReleaseExternalGatePlatformPlan(
  plan: ReleaseExternalGatePlan,
  platform: ReleasePlatform
): ReleaseExternalGatePlatformPlan {
  const platformPlan = plan.platforms.find((item) => releaseTargetPlatformMatches(item, { platform }))
  if (!platformPlan) {
    throw new Error(`Missing external gate plan for platform: ${platform}`)
  }
  return cloneReleaseExternalGatePlatformPlan(platformPlan)
}

function cloneReleaseExternalGatePlatformPlan(
  platformPlan: ReleaseExternalGatePlatformPlan
): ReleaseExternalGatePlatformPlan {
  return {
    ...platformPlan,
    supportedArches: [...platformPlan.supportedArches],
    distributionSmokeCheckIds: [...platformPlan.distributionSmokeCheckIds],
    gates: platformPlan.gates.map((gate) => ({
      ...gate,
      requiredSecretNames: [...gate.requiredSecretNames],
      requiredEvidence: [...gate.requiredEvidence]
    }))
  }
}
