import {
  getReleasePlatformTarget,
  listReleasePlatformTargets,
  type ReleaseBrandingIconFileName,
  type ReleasePackagingArch,
  type ReleasePlatform,
  type ReleaseRunnerLabel,
  type ReleaseSignedCandidateArtifactNamePattern,
  type ReleaseSignedCandidateEnvironment,
  type ReleaseSignedCandidateJobName
} from './release-flow-governance'
import { createReleaseBrandingPreflight } from './release-branding-preflight'
import {
  createReleaseInstallSmokePreflight,
  type ReleaseDistributionInstallSmoke,
  type ReleaseInstallSmokeCheckId
} from './release-install-smoke-preflight'
import {
  createReleaseSignedCandidatePreflight,
  type ReleaseSignedCandidateEvidence
} from './release-signed-candidate-preflight'

export type ReleaseEnvironmentApproval =
  | 'github_environment_review'
  | 'workflow_dispatch_signing_approval'

export interface ReleaseEnvironmentManifestEntry {
  platform: ReleasePlatform
  environment: ReleaseSignedCandidateEnvironment
  workflowFileName: 'release-signed-candidate.yml'
  jobName: ReleaseSignedCandidateJobName
  runnerLabel: ReleaseRunnerLabel
  supportedArches: ReleasePackagingArch[]
  refGate: 'main-or-version-tag'
  approvalGates: ReleaseEnvironmentApproval[]
  signingApprovalInput: 'signing_approved'
  requiredSecretNames: string[]
  secretValuesPolicy: 'names_only_never_read'
  requiredEvidence: ReleaseSignedCandidateEvidence[]
  requiredDistributionSmoke: ReleaseDistributionInstallSmoke
  distributionSmokeEvidenceSource: 'package-smoke'
  distributionSmokeCheckIds: ReleaseInstallSmokeCheckId[]
  brandingApprovalFile: 'release-branding.json'
  brandingIconFileName: ReleaseBrandingIconFileName
  artifactNamePattern: ReleaseSignedCandidateArtifactNamePattern
  publishEnabled: false
  repositoryPermissions: 'contents:read'
}

export interface ReleaseEnvironmentManifest {
  schemaVersion: 1
  source: 'release-preflight'
  writesGitHubSettings: false
  readsSecretValues: false
  readsSigningAssets: false
  readsBrandingAssetBytes: false
  emitsLocalPaths: false
  environments: ReleaseEnvironmentManifestEntry[]
}

export function createReleaseEnvironmentManifest(): ReleaseEnvironmentManifest {
  const brandingPreflight = createReleaseBrandingPreflight()

  return {
    schemaVersion: 1,
    source: 'release-preflight',
    writesGitHubSettings: false,
    readsSecretValues: false,
    readsSigningAssets: false,
    readsBrandingAssetBytes: false,
    emitsLocalPaths: false,
    environments: listReleasePlatformTargets().map(({ platform }) => {
      const target = getReleasePlatformTarget(platform)
      const signedPreflight = createReleaseSignedCandidatePreflight(platform, 'x64')
      const installSmokePreflight = createReleaseInstallSmokePreflight(platform)

      return {
        platform,
        environment: signedPreflight.environment,
        workflowFileName: 'release-signed-candidate.yml',
        jobName: target.signedCandidateJobName,
        runnerLabel: target.runnerLabel,
        supportedArches: [...target.supportedArches],
        refGate: signedPreflight.refGate,
        approvalGates: [
          'github_environment_review',
          'workflow_dispatch_signing_approval'
        ],
        signingApprovalInput: signedPreflight.signingApprovalInput,
        requiredSecretNames: [...signedPreflight.requiredSecretNames],
        secretValuesPolicy: 'names_only_never_read',
        requiredEvidence: [...signedPreflight.requiredEvidence],
        requiredDistributionSmoke: installSmokePreflight.distributionSmoke,
        distributionSmokeEvidenceSource: installSmokePreflight.evidenceSource,
        distributionSmokeCheckIds: [...installSmokePreflight.requiredCheckIds],
        brandingApprovalFile: brandingPreflight.approvalFileName,
        brandingIconFileName: target.brandingIconFileName,
        artifactNamePattern: target.signedCandidateArtifactNamePattern,
        publishEnabled: false,
        repositoryPermissions: 'contents:read'
      }
    })
  }
}
