import type { ReleasePackagingArch, ReleasePlatform } from './release-flow-governance'
import {
  releaseTargetArchMatches,
  releaseTargetPlatformMatches
} from './release-target-selection'

export type ReleasePublishApprovalStatus =
  | 'approved'
  | 'missing'
  | 'invalid'
  | 'platform_mismatch'
  | 'arch_mismatch'

export interface ReleasePublishApprovalMissing {
  code:
    | 'approval_file'
    | 'schema_version'
    | 'approval_id'
    | 'approved_at'
    | 'platform'
    | 'arch'
    | 'distribution_stage'
    | 'publish_approval'
  label: string
  detail: string
}

export interface ReleasePublishApprovalEvaluation {
  schemaVersion: 1
  source: 'release-publish-approval'
  platform: ReleasePlatform
  arch: ReleasePackagingArch
  requiredFileName: 'release-publish-approval.json'
  status: ReleasePublishApprovalStatus
  approved: boolean
  readsSecretValues: false
  emitsLocalPaths: false
  publishesRelease: false
  missing: ReleasePublishApprovalMissing[]
}

export function evaluateReleasePublishApproval(
  value: unknown,
  platform: ReleasePlatform,
  arch: ReleasePackagingArch
): ReleasePublishApprovalEvaluation {
  const missing = validateApproval(value, platform, arch)
  const status = approvalStatus(missing)

  return {
    schemaVersion: 1,
    source: 'release-publish-approval',
    platform,
    arch,
    requiredFileName: 'release-publish-approval.json',
    status,
    approved: status === 'approved',
    readsSecretValues: false,
    emitsLocalPaths: false,
    publishesRelease: false,
    missing
  }
}

function validateApproval(
  value: unknown,
  platform: ReleasePlatform,
  arch: ReleasePackagingArch
): ReleasePublishApprovalMissing[] {
  if (!isRecord(value)) {
    return [missing('approval_file', 'Publish approval file', 'A release publish approval record is required.')]
  }

  const result: ReleasePublishApprovalMissing[] = []
  if (value.schemaVersion !== 1) {
    result.push(missing('schema_version', 'Approval schema version', 'schemaVersion must be 1.'))
  }
  if (!isSafeToken(value.approvalId)) {
    result.push(missing('approval_id', 'Approval id', 'approvalId must be a short path-free token.'))
  }
  if (!isIsoTimestamp(value.approvedAt)) {
    result.push(missing('approved_at', 'Approval timestamp', 'approvedAt must be an ISO timestamp.'))
  }
  if (!releaseTargetPlatformMatches(value, { platform })) {
    result.push(missing('platform', 'Approval platform', `platform must be ${platform}.`))
  }
  if (!releaseTargetArchMatches(value, { arch })) {
    result.push(missing('arch', 'Approval architecture', `arch must be ${arch}.`))
  }
  if (value.distributionStage !== 'distribution_ready') {
    result.push(missing('distribution_stage', 'Distribution stage', 'distributionStage must be distribution_ready.'))
  }
  if (value.publishApproved !== true) {
    result.push(missing('publish_approval', 'Publish approval', 'publishApproved must be true.'))
  }

  return result
}

function approvalStatus(missingItems: ReleasePublishApprovalMissing[]): ReleasePublishApprovalStatus {
  if (missingItems.length === 0) return 'approved'
  if (missingItems.some((item) => item.code === 'approval_file')) return 'missing'
  if (missingItems.some((item) => item.code === 'platform')) return 'platform_mismatch'
  if (missingItems.some((item) => item.code === 'arch')) return 'arch_mismatch'
  return 'invalid'
}

function missing(
  code: ReleasePublishApprovalMissing['code'],
  label: string,
  detail: string
): ReleasePublishApprovalMissing {
  return { code, label, detail }
}

function isSafeToken(value: unknown): value is string {
  return typeof value === 'string'
    && /^[A-Za-z0-9._-]{1,80}$/.test(value)
}

function isIsoTimestamp(value: unknown): value is string {
  return typeof value === 'string'
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
