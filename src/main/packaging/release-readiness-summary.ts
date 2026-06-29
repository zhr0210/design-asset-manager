import {
  evaluateReleaseCandidate,
  getReleasePlatformTarget,
  type ReleaseCandidateChecks,
  type ReleaseCandidateEvaluation,
  type ReleaseCandidateMissing,
  type ReleasePackagingArch,
  type ReleasePlatform
} from './release-flow-governance'
import { createReleaseBrandingPreflight } from './release-branding-preflight'
import { createReleaseSignedCandidatePreflight } from './release-signed-candidate-preflight'

export type ReleaseReadinessPhase = 'candidate' | 'distribution' | 'publish'

export interface ReleaseReadinessInput {
  platform: ReleasePlatform
  arch: ReleasePackagingArch
  checks: ReleaseCandidateChecks
  explicitPublishApproval: boolean
}

export type ReleaseReadinessSource = 'release-flow-governance' | 'release-readiness-evidence'

export interface ReleaseReadinessBlocker extends ReleaseCandidateMissing {
  phase: ReleaseReadinessPhase
  severity: 'blocking'
}

export interface ReleaseReadinessPlatformSummary {
  platform: ReleasePlatform
  arch: ReleasePackagingArch
  stage: ReleaseCandidateEvaluation['stage']
  candidateArtifactAllowed: boolean
  distributionAllowed: boolean
  publishAllowed: boolean
  signingEnvironment: string
  signingApprovalInput: 'signing_approved'
  refGate: 'main-or-version-tag'
  requiredEvidence: string[]
  requiredSecretNames: string[]
  brandingApprovalFile: 'release-branding.json'
  brandingIconFileName: 'icon.ico' | 'icon.icns'
  checks: ReleaseCandidateChecks
  blockers: ReleaseReadinessBlocker[]
}

export interface ReleaseReadinessSummary {
  schemaVersion: 1
  source: ReleaseReadinessSource
  publishEnabled: false
  readsSecretValues: false
  readsBrandingAssetBytes: false
  emitsLocalPaths: false
  platforms: ReleaseReadinessPlatformSummary[]
}

const CANDIDATE_GATE_CODES = new Set([
  'build',
  'governance',
  'artifact',
  'checksum',
  'package_smoke'
])

export function createReleaseReadinessSummary(
  inputs: ReleaseReadinessInput[],
  source: ReleaseReadinessSource = 'release-flow-governance'
): ReleaseReadinessSummary {
  const brandingPreflight = createReleaseBrandingPreflight()

  return {
    schemaVersion: 1,
    source,
    publishEnabled: false,
    readsSecretValues: false,
    readsBrandingAssetBytes: false,
    emitsLocalPaths: false,
    platforms: inputs.map((input) => {
      const evaluation = evaluateReleaseCandidate(input)
      const target = getReleasePlatformTarget(input.platform)
      const signedPreflight = createReleaseSignedCandidatePreflight(input.platform, input.arch)

      return {
        platform: input.platform,
        arch: input.arch,
        stage: evaluation.stage,
        candidateArtifactAllowed: evaluation.candidateArtifactAllowed,
        distributionAllowed: evaluation.distributionAllowed,
        publishAllowed: evaluation.publishAllowed,
        signingEnvironment: signedPreflight.environment,
        signingApprovalInput: signedPreflight.signingApprovalInput,
        refGate: signedPreflight.refGate,
        requiredEvidence: [...signedPreflight.requiredEvidence],
        requiredSecretNames: [...signedPreflight.requiredSecretNames],
        brandingApprovalFile: brandingPreflight.approvalFileName,
        brandingIconFileName: target.brandingIconFileName,
        checks: { ...input.checks },
        blockers: evaluation.missing.map(toReadinessBlocker)
      }
    })
  }
}

function toReadinessBlocker(missing: ReleaseCandidateMissing): ReleaseReadinessBlocker {
  return {
    ...missing,
    phase: blockerPhase(missing.code),
    severity: 'blocking'
  }
}

function blockerPhase(code: ReleaseCandidateMissing['code']): ReleaseReadinessPhase {
  if (code === 'publish_approval') return 'publish'
  if (CANDIDATE_GATE_CODES.has(code)) return 'candidate'
  return 'distribution'
}
