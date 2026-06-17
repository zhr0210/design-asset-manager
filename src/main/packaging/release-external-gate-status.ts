import type {
  ReleaseCandidateChecks,
  ReleaseCandidateMissing,
  ReleaseGateId,
  ReleasePackagingArch,
  ReleasePlatform
} from './release-flow-governance'
import {
  createReleaseExternalGatePlan,
  type ReleaseExternalGate,
  type ReleaseExternalGateCode
} from './release-external-gate-plan'
import type {
  ReleaseReadinessPlatformSummary,
  ReleaseReadinessSummary
} from './release-readiness-summary'

export type ReleaseExternalGateStatusCode =
  | 'satisfied'
  | 'external_action_required'
  | 'blocked_by_candidate'
  | 'blocked_by_signed_candidate'
  | 'blocked_by_distribution'

export type ReleaseExternalGateStatusSource =
  | 'release-readiness-summary'
  | 'release-external-gate-plan'

export interface ReleaseExternalGateStatusMissing {
  code: ReleaseGateId | ReleaseExternalGateCode | 'signing_environment_review'
  label: string
  detail: string
}

export interface ReleaseExternalGateStatusEntry extends ReleaseExternalGate {
  status: ReleaseExternalGateStatusCode
  statusSource: ReleaseExternalGateStatusSource
  missing: ReleaseExternalGateStatusMissing[]
}

export interface ReleaseExternalGatePlatformStatus {
  platform: ReleasePlatform
  arch: ReleasePackagingArch
  stage: ReleaseReadinessPlatformSummary['stage']
  candidateArtifactAllowed: boolean
  distributionAllowed: boolean
  publishAllowed: boolean
  gates: ReleaseExternalGateStatusEntry[]
}

export interface ReleaseExternalGateStatus {
  schemaVersion: 1
  source: 'release-readiness-summary'
  displayOnly: true
  writesGitHubSettings: false
  readsSecretValues: false
  readsSigningAssets: false
  readsBrandingAssetBytes: false
  emitsLocalPaths: false
  executesWorkflow: false
  publishesRelease: false
  platforms: ReleaseExternalGatePlatformStatus[]
}

const SIGNED_CANDIDATE_BLOCKER_CODES = new Set<ReleaseCandidateMissing['code']>([
  'build',
  'governance',
  'artifact',
  'checksum',
  'package_smoke',
  'branding',
  'signature',
  'hardened_runtime',
  'nested_signatures',
  'notarization',
  'staple',
  'gatekeeper',
  'update_metadata'
])

export function createReleaseExternalGateStatus(
  readinessSummary: ReleaseReadinessSummary
): ReleaseExternalGateStatus {
  const plan = createReleaseExternalGatePlan()

  return {
    schemaVersion: 1,
    source: 'release-readiness-summary',
    displayOnly: true,
    writesGitHubSettings: false,
    readsSecretValues: false,
    readsSigningAssets: false,
    readsBrandingAssetBytes: false,
    emitsLocalPaths: false,
    executesWorkflow: false,
    publishesRelease: false,
    platforms: readinessSummary.platforms.map((summary) => {
      const platformPlan = plan.platforms.find((item) => item.platform === summary.platform)
      if (!platformPlan) {
        throw new Error(`Missing external gate plan for platform: ${summary.platform}`)
      }

      const signedCandidateSatisfied = isSignedCandidateEvidenceSatisfied(summary)
      return {
        platform: summary.platform,
        arch: summary.arch,
        stage: summary.stage,
        candidateArtifactAllowed: summary.candidateArtifactAllowed,
        distributionAllowed: summary.distributionAllowed,
        publishAllowed: summary.publishAllowed,
        gates: platformPlan.gates.map((gate) =>
          evaluateGate(gate, summary, signedCandidateSatisfied)
        )
      }
    })
  }
}

function evaluateGate(
  gate: ReleaseExternalGate,
  summary: ReleaseReadinessPlatformSummary,
  signedCandidateSatisfied: boolean
): ReleaseExternalGateStatusEntry {
  if (gate.code === 'branding_assets') {
    return withStatus(
      gate,
      summary.checks.branding === 'passed' ? 'satisfied' : 'external_action_required',
      missingByCodes(summary, ['branding'])
    )
  }

  if (gate.code === 'signing_environment') {
    return withStatus(
      gate,
      signedCandidateSatisfied ? 'satisfied' : 'external_action_required',
      signedCandidateSatisfied ? [] : [{
        code: 'signing_environment_review',
        label: 'Signing environment review',
        detail: `Required secret names and ${summary.signingEnvironment} review are external and not proven by release readiness evidence.`
      }]
    )
  }

  if (gate.code === 'signed_candidate_workflow') {
    if (summary.stage === 'blocked') {
      return withStatus(
        gate,
        'blocked_by_candidate',
        missingByCodes(summary, ['build', 'governance', 'artifact', 'checksum', 'package_smoke'])
      )
    }

    return withStatus(
      gate,
      signedCandidateSatisfied ? 'satisfied' : 'external_action_required',
      signedCandidateMissing(summary)
    )
  }

  if (gate.code === 'distribution_install_smoke') {
    if (!signedCandidateSatisfied) {
      return withStatus(gate, 'blocked_by_signed_candidate', signedCandidateMissing(summary))
    }

    return withStatus(
      gate,
      summary.checks.installerSmoke === 'passed' ? 'satisfied' : 'external_action_required',
      missingByCodes(summary, ['installer_smoke'])
    )
  }

  if (gate.code === 'publish_approval') {
    if (summary.publishAllowed) {
      return withStatus(gate, 'satisfied', [])
    }

    if (!summary.distributionAllowed) {
      return withStatus(gate, 'blocked_by_distribution', summary.blockers)
    }

    return withStatus(gate, 'external_action_required', missingByCodes(summary, ['publish_approval']))
  }

  return withStatus(gate, 'external_action_required', [])
}

function withStatus(
  gate: ReleaseExternalGate,
  status: ReleaseExternalGateStatusCode,
  missing: ReleaseExternalGateStatusMissing[]
): ReleaseExternalGateStatusEntry {
  return {
    ...gate,
    status,
    statusSource: status === 'satisfied'
      ? 'release-readiness-summary'
      : 'release-external-gate-plan',
    missing
  }
}

function signedCandidateMissing(
  summary: ReleaseReadinessPlatformSummary
): ReleaseExternalGateStatusMissing[] {
  return summary.blockers.filter((item) => SIGNED_CANDIDATE_BLOCKER_CODES.has(item.code))
}

function missingByCodes(
  summary: ReleaseReadinessPlatformSummary,
  codes: ReleaseCandidateMissing['code'][]
): ReleaseExternalGateStatusMissing[] {
  const expected = new Set(codes)
  return summary.blockers.filter((item) => expected.has(item.code))
}

function isSignedCandidateEvidenceSatisfied(summary: ReleaseReadinessPlatformSummary): boolean {
  const checks: Array<keyof ReleaseCandidateChecks> = [
    'build',
    'governance',
    'artifact',
    'checksum',
    'packageSmoke',
    'branding',
    'signature',
    'updateMetadata'
  ]

  if (summary.platform === 'macos') {
    checks.push('hardenedRuntime', 'nestedSignatures', 'notarization', 'staple', 'gatekeeper')
  }

  return checks.every((check) => summary.checks[check] === 'passed')
}
