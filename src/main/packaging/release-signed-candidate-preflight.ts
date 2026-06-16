import type { ReleasePackagingArch, ReleasePlatform } from './release-flow-governance'

export type ReleaseSignedCandidateEnvironment = 'release-signing-windows' | 'release-signing-macos'

export type ReleaseSignedCandidateEvidence =
  | 'release-checksums'
  | 'release-update-metadata'
  | 'release-trust-evidence'
  | 'release-branding-evidence'
  | 'package-smoke'

export interface ReleaseSignedCandidatePreflight {
  platform: ReleasePlatform
  arch: ReleasePackagingArch
  refGate: 'main-or-version-tag'
  signingApprovalInput: 'signing_approved'
  environment: ReleaseSignedCandidateEnvironment
  requiredSecretNames: string[]
  requiredEvidence: ReleaseSignedCandidateEvidence[]
  publishEnabled: false
  readsSecretValues: false
}

export function createReleaseSignedCandidatePreflight(
  platform: ReleasePlatform,
  arch: ReleasePackagingArch
): ReleaseSignedCandidatePreflight {
  return {
    platform,
    arch,
    refGate: 'main-or-version-tag',
    signingApprovalInput: 'signing_approved',
    environment: platform === 'windows' ? 'release-signing-windows' : 'release-signing-macos',
    requiredSecretNames: platform === 'windows'
      ? ['WINDOWS_CSC_LINK', 'WINDOWS_CSC_KEY_PASSWORD']
      : [
          'MACOS_CSC_LINK',
          'MACOS_CSC_KEY_PASSWORD',
          'APPLE_ID',
          'APPLE_APP_SPECIFIC_PASSWORD',
          'APPLE_TEAM_ID'
        ],
    requiredEvidence: [
      'release-checksums',
      'release-update-metadata',
      'release-trust-evidence',
      'release-branding-evidence',
      'package-smoke'
    ],
    publishEnabled: false,
    readsSecretValues: false
  }
}
