import {
  getReleasePlatformTarget,
  type ReleasePackagingArch,
  type ReleasePlatform,
  type ReleaseSignedCandidateEnvironment
} from './release-flow-governance'

export type { ReleaseSignedCandidateEnvironment } from './release-flow-governance'

export type ReleaseSignedCandidateEvidence =
  | 'release-checksums'
  | 'release-update-metadata'
  | 'release-trust-evidence'
  | 'release-branding-evidence'
  | 'release-readiness-summary'
  | 'release-external-gate-status'
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
  const target = getReleasePlatformTarget(platform)

  return {
    platform,
    arch,
    refGate: 'main-or-version-tag',
    signingApprovalInput: 'signing_approved',
    environment: target.signedCandidateEnvironment,
    requiredSecretNames: [...target.requiredSecretNames],
    requiredEvidence: [
      'release-checksums',
      'release-update-metadata',
      'release-trust-evidence',
      'release-branding-evidence',
      'release-readiness-summary',
      'release-external-gate-status',
      'package-smoke'
    ],
    publishEnabled: false,
    readsSecretValues: false
  }
}
