import type { ReleasePackagingArch, ReleasePlatform } from './release-flow-governance'
import { createReleaseBrandingPreflight } from './release-branding-preflight'
import {
  createReleaseSignedCandidatePreflight,
  type ReleaseSignedCandidateEnvironment,
  type ReleaseSignedCandidateEvidence
} from './release-signed-candidate-preflight'

export type ReleaseEnvironmentApproval =
  | 'github_environment_review'
  | 'workflow_dispatch_signing_approval'

export type ReleaseEnvironmentDistributionSmoke =
  | 'windows_sandbox_installer_smoke'
  | 'macos_dmg_install_smoke'

export interface ReleaseEnvironmentManifestEntry {
  platform: ReleasePlatform
  environment: ReleaseSignedCandidateEnvironment
  workflowFileName: 'release-signed-candidate.yml'
  jobName: 'windows-signed-candidate' | 'macos-signed-candidate'
  runnerLabel: 'windows-2022' | 'macos-latest'
  supportedArches: ReleasePackagingArch[]
  refGate: 'main-or-version-tag'
  approvalGates: ReleaseEnvironmentApproval[]
  signingApprovalInput: 'signing_approved'
  requiredSecretNames: string[]
  secretValuesPolicy: 'names_only_never_read'
  requiredEvidence: ReleaseSignedCandidateEvidence[]
  requiredDistributionSmoke: ReleaseEnvironmentDistributionSmoke
  brandingApprovalFile: 'release-branding.json'
  brandingIconFileName: 'icon.ico' | 'icon.icns'
  artifactNamePattern:
    | 'design-asset-manager-windows-${arch}-signed-candidate'
    | 'design-asset-manager-macos-${arch}-signed-candidate'
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

const SUPPORTED_ARCHES: ReleasePackagingArch[] = ['x64', 'arm64']

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
    environments: (['windows', 'macos'] as const).map((platform) => {
      const signedPreflight = createReleaseSignedCandidatePreflight(platform, 'x64')
      const brandingRequirement = brandingPreflight.platforms.find(
        (item) => item.platform === platform
      )

      if (!brandingRequirement) {
        throw new Error(`Missing release branding preflight for platform: ${platform}`)
      }

      return {
        platform,
        environment: signedPreflight.environment,
        workflowFileName: 'release-signed-candidate.yml',
        jobName: platform === 'windows' ? 'windows-signed-candidate' : 'macos-signed-candidate',
        runnerLabel: platform === 'windows' ? 'windows-2022' : 'macos-latest',
        supportedArches: [...SUPPORTED_ARCHES],
        refGate: signedPreflight.refGate,
        approvalGates: [
          'github_environment_review',
          'workflow_dispatch_signing_approval'
        ],
        signingApprovalInput: signedPreflight.signingApprovalInput,
        requiredSecretNames: [...signedPreflight.requiredSecretNames],
        secretValuesPolicy: 'names_only_never_read',
        requiredEvidence: [...signedPreflight.requiredEvidence],
        requiredDistributionSmoke: platform === 'windows'
          ? 'windows_sandbox_installer_smoke'
          : 'macos_dmg_install_smoke',
        brandingApprovalFile: brandingPreflight.approvalFileName,
        brandingIconFileName: brandingRequirement.iconFileName,
        artifactNamePattern: platform === 'windows'
          ? 'design-asset-manager-windows-${arch}-signed-candidate'
          : 'design-asset-manager-macos-${arch}-signed-candidate',
        publishEnabled: false,
        repositoryPermissions: 'contents:read'
      }
    })
  }
}
