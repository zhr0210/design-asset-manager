import type {
  ReleasePackagingArch,
  ReleasePlatform,
  ReleaseSignedCandidateJobName
} from './release-flow-governance'
import { getReleasePlatformTarget } from './release-flow-governance'
import { createReleaseSignedCandidatePreflight } from './release-signed-candidate-preflight'
import { releaseTargetsMatch } from './release-target-selection'
import {
  getReleaseSigningEnvironmentPlatformStatus,
  type ReleaseSigningEnvironmentStatus
} from './release-signing-environment-status'

export type ReleaseSignedCandidateDispatchStatusCode =
  | 'ready'
  | 'external_action_required'

export type ReleaseSignedCandidateDispatchMissingCode =
  | 'ref_gate'
  | 'signing_approval_input'
  | 'signing_environment_status'
  | 'release_branding_evidence'

export interface ReleaseSignedCandidateDispatchMissing {
  code: ReleaseSignedCandidateDispatchMissingCode
  label: string
  detail: string
}

export interface ReleaseSignedCandidateDispatchInput {
  platform: ReleasePlatform
  arch: ReleasePackagingArch
  ref: string
  signingApproved: boolean
  signingEnvironmentStatus: unknown
  brandingEvidence: unknown
}

export interface ReleaseSignedCandidateDispatchStatus {
  schemaVersion: 1
  source: 'release-signed-candidate-preflight'
  displayOnly: true
  writesGitHubSettings: false
  readsSecretValues: false
  readsSigningAssets: false
  readsBrandingAssetBytes: false
  readsCandidateBinaries: false
  emitsLocalPaths: false
  executesWorkflow: false
  publishesRelease: false
  platform: ReleasePlatform
  arch: ReleasePackagingArch
  ref: string
  refGate: 'main-or-version-tag'
  signingApprovalInput: 'signing_approved'
  signingApproved: boolean
  environment: string
  workflowFileName: 'release-signed-candidate.yml'
  jobName: ReleaseSignedCandidateJobName
  requiredEvidence: string[]
  dispatchReady: boolean
  missing: ReleaseSignedCandidateDispatchMissing[]
}

const BRANDING_CHECK_IDS = new Set([
  'branding_approval',
  'windows_icon',
  'macos_icon',
  'approved_digest'
])

export function createReleaseSignedCandidateDispatchStatus(
  input: ReleaseSignedCandidateDispatchInput
): ReleaseSignedCandidateDispatchStatus {
  const preflight = createReleaseSignedCandidatePreflight(input.platform, input.arch)
  const target = getReleasePlatformTarget(input.platform)
  const missing = [
    ...missingRefGate(input.ref),
    ...missingSigningApproval(input.signingApproved),
    ...missingSigningEnvironment(input.signingEnvironmentStatus, input.platform),
    ...missingBrandingEvidence(input.brandingEvidence, input.platform, input.arch)
  ]

  return {
    schemaVersion: 1,
    source: 'release-signed-candidate-preflight',
    displayOnly: true,
    writesGitHubSettings: false,
    readsSecretValues: false,
    readsSigningAssets: false,
    readsBrandingAssetBytes: false,
    readsCandidateBinaries: false,
    emitsLocalPaths: false,
    executesWorkflow: false,
    publishesRelease: false,
    platform: input.platform,
    arch: input.arch,
    ref: input.ref,
    refGate: preflight.refGate,
    signingApprovalInput: preflight.signingApprovalInput,
    signingApproved: input.signingApproved,
    environment: preflight.environment,
    workflowFileName: 'release-signed-candidate.yml',
    jobName: target.signedCandidateJobName,
    requiredEvidence: [
      'release-signing-environment-status',
      'release-branding-evidence'
    ],
    dispatchReady: missing.length === 0,
    missing
  }
}

function missingRefGate(ref: string): ReleaseSignedCandidateDispatchMissing[] {
  if (ref === 'refs/heads/main' || /^refs\/tags\/v[^/]+$/.test(ref)) return []

  return [{
    code: 'ref_gate',
    label: 'Release ref gate',
    detail: 'Signed candidate dispatch requires refs/heads/main or a refs/tags/v* version tag.'
  }]
}

function missingSigningApproval(
  signingApproved: boolean
): ReleaseSignedCandidateDispatchMissing[] {
  if (signingApproved) return []

  return [{
    code: 'signing_approval_input',
    label: 'Workflow signing approval input',
    detail: 'The manual workflow dispatch must set signing_approved=true.'
  }]
}

function missingSigningEnvironment(
  value: unknown,
  platform: ReleasePlatform
): ReleaseSignedCandidateDispatchMissing[] {
  if (!isSigningEnvironmentStatus(value)) {
    return [{
      code: 'signing_environment_status',
      label: 'Signing environment status',
      detail: 'release-signing-environment-status evidence is missing or invalid.'
    }]
  }

  const environment = getReleaseSigningEnvironmentPlatformStatus(value, platform)
  if (environment?.status === 'ready') return []

  return [{
    code: 'signing_environment_status',
    label: 'Signing environment status',
    detail: `${platform} signing environment is not ready.`
  }]
}

function missingBrandingEvidence(
  value: unknown,
  platform: ReleasePlatform,
  arch: ReleasePackagingArch
): ReleaseSignedCandidateDispatchMissing[] {
  if (!isRecord(value) || value.schemaVersion !== 1 || !releaseTargetsMatch(value, { platform, arch })) {
    return [{
      code: 'release_branding_evidence',
      label: 'Release branding evidence',
      detail: 'release-branding-evidence is missing, invalid, or for a different platform/architecture.'
    }]
  }

  const checks = extractChecks(value)
  const requiredIconCheck = getReleasePlatformTarget(platform).brandingEvidenceIconCheckId
  const requiredChecks = ['branding_approval', requiredIconCheck, 'approved_digest']
  if (requiredChecks.every((id) => checks.some((check) => check.id === id && check.status === 'passed'))) {
    return []
  }

  return [{
    code: 'release_branding_evidence',
    label: 'Release branding evidence',
    detail: `${platform} release branding evidence has not passed all required checks.`
  }]
}

function isSigningEnvironmentStatus(value: unknown): value is ReleaseSigningEnvironmentStatus {
  return isRecord(value)
    && value.schemaVersion === 1
    && value.source === 'release-environment-manifest'
    && value.readsSecretValues === false
    && value.writesGitHubSettings === false
    && value.executesWorkflow === false
    && value.publishesRelease === false
    && Array.isArray(value.environments)
}

function extractChecks(value: Record<string, unknown>): Array<{ id: string, status: string }> {
  if (!Array.isArray(value.checks)) return []
  return value.checks.filter((check): check is { id: string, status: string } =>
    isRecord(check)
    && typeof check.id === 'string'
    && BRANDING_CHECK_IDS.has(check.id)
    && typeof check.status === 'string'
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
