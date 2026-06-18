import fs from 'node:fs/promises'
import path from 'node:path'

import {
  type ReleaseCandidateChecks,
  type ReleaseCheckStatus,
  type ReleasePlatform
} from '../src/main/packaging/release-flow-governance'
import { createReleaseInstallSmokePreflight } from '../src/main/packaging/release-install-smoke-preflight'
import { evaluateReleasePublishApproval } from '../src/main/packaging/release-publish-approval'
import { createReleaseReadinessSummary } from '../src/main/packaging/release-readiness-summary'
import {
  parseReleaseTargetSelection,
  releaseEvidenceFileName
} from '../src/main/packaging/release-target-selection'

interface EvidenceReport {
  exists: boolean
  value: unknown
}

interface JsonCheck {
  id?: unknown
  status?: unknown
}

const options = parseArgs(process.argv.slice(2))
const { platform, arch } = parseReleaseTargetSelection(options)
const distDir = path.resolve(options['dist-dir'] ?? 'dist-packages')
const governanceStatus = requireCheckStatus(options.governance ?? 'not_run', '--governance')
const outputPath = path.resolve(
  options.output ?? path.join(distDir, releaseEvidenceFileName('release-readiness-summary', { platform, arch }))
)

const reports = {
  checksums: await readOptionalJson(options.checksums ?? path.join(distDir, releaseEvidenceFileName('release-checksums', { platform, arch }))),
  updateMetadata: await readOptionalJson(options.metadata ?? path.join(distDir, releaseEvidenceFileName('release-update-metadata', { platform, arch }))),
  trustEvidence: await readOptionalJson(options.trust ?? path.join(distDir, releaseEvidenceFileName('release-trust-evidence', { platform, arch }))),
  brandingEvidence: await readOptionalJson(options.branding ?? path.join(distDir, releaseEvidenceFileName('release-branding-evidence', { platform, arch }))),
  packageSmoke: await readOptionalJson(options['package-smoke'] ?? path.join(distDir, releaseEvidenceFileName('package-smoke', { platform, arch }))),
  publishApproval: options['publish-approval']
    ? await readOptionalJson(path.resolve(options['publish-approval']))
    : { exists: false, value: null }
}

const publishApproval = evaluateReleasePublishApproval(reports.publishApproval.value, platform, arch)
const explicitPublishApproval = options['publish-approved'] === 'true' || publishApproval.approved

const checksumsValid = isValidChecksums(reports.checksums.value)
const checks: ReleaseCandidateChecks = {
  build: statusFromBoolean(checksumsValid, reports.checksums.exists),
  governance: governanceStatus,
  artifact: statusFromBoolean(checksumsValid, reports.checksums.exists),
  checksum: statusFromBoolean(checksumsValid, reports.checksums.exists),
  packageSmoke: statusFromBoolean(hasNoFailedChecks(reports.packageSmoke.value), reports.packageSmoke.exists),
  branding: statusFromBoolean(hasNoFailedChecks(reports.brandingEvidence.value), reports.brandingEvidence.exists),
  installerSmoke: statusFromBoolean(hasInstallSmoke(reports.packageSmoke.value, platform), reports.packageSmoke.exists),
  signature: statusFromBoolean(hasPassedCheck(reports.trustEvidence.value, 'signature'), reports.trustEvidence.exists),
  hardenedRuntime: platform === 'macos'
    ? statusFromBoolean(hasPassedCheck(reports.trustEvidence.value, 'hardened_runtime'), reports.trustEvidence.exists)
    : 'not_applicable',
  nestedSignatures: platform === 'macos'
    ? statusFromBoolean(hasPassedCheck(reports.trustEvidence.value, 'nested_signatures'), reports.trustEvidence.exists)
    : 'not_applicable',
  notarization: platform === 'macos'
    ? statusFromBoolean(hasPassedCheck(reports.trustEvidence.value, 'notarization'), reports.trustEvidence.exists)
    : 'not_applicable',
  staple: platform === 'macos'
    ? statusFromBoolean(hasPassedCheck(reports.trustEvidence.value, 'staple'), reports.trustEvidence.exists)
    : 'not_applicable',
  gatekeeper: platform === 'macos'
    ? statusFromBoolean(hasPassedCheck(reports.trustEvidence.value, 'gatekeeper'), reports.trustEvidence.exists)
    : 'not_applicable',
  updateMetadata: statusFromBoolean(isValidUpdateMetadata(reports.updateMetadata.value), reports.updateMetadata.exists)
}

const summary = createReleaseReadinessSummary([{
  platform,
  arch,
  checks,
  explicitPublishApproval
}], 'release-readiness-evidence')

await fs.mkdir(path.dirname(outputPath), { recursive: true })
await fs.writeFile(outputPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8')
console.log(JSON.stringify(summary))
if (summary.platforms[0]?.stage === 'blocked') process.exitCode = 1

async function readOptionalJson(target: string): Promise<EvidenceReport> {
  try {
    return { exists: true, value: JSON.parse(await fs.readFile(target, 'utf8')) }
  } catch {
    return { exists: false, value: null }
  }
}

function isValidChecksums(value: unknown): boolean {
  if (!isRecord(value) || value.schemaVersion !== 1) return false
  if (value.platform !== platform || value.arch !== arch) return false
  if (!Array.isArray(value.artifacts) || value.artifacts.length === 0) return false

  return value.artifacts.every((artifact) => (
    isRecord(artifact)
    && isSafeFileName(artifact.fileName)
    && Number.isSafeInteger(artifact.sizeBytes)
    && Number(artifact.sizeBytes) >= 0
    && isSha256(artifact.sha256)
  ))
}

function isValidUpdateMetadata(value: unknown): boolean {
  if (!isRecord(value) || value.schemaVersion !== 1) return false
  if (value.platform !== platform || value.arch !== arch) return false
  if (!isRecord(value.artifact) || !isRecord(value.artifact.blockmap)) return false

  const artifact = value.artifact
  const blockmap = value.artifact.blockmap
  return isSafeFileName(artifact.fileName)
    && isSafeFileName(blockmap.fileName)
    && blockmap.fileName === `${artifact.fileName}.blockmap`
    && Number.isSafeInteger(artifact.sizeBytes)
    && Number.isSafeInteger(blockmap.sizeBytes)
    && isSha256(artifact.sha256)
    && isSha256(blockmap.sha256)
}

function hasNoFailedChecks(value: unknown): boolean {
  const checks = extractChecks(value)
  return checks.length > 0 && checks.every((check) => check.status === 'passed' || check.status === 'skipped')
}

function hasInstallSmoke(value: unknown, targetPlatform: ReleasePlatform): boolean {
  const preflight = createReleaseInstallSmokePreflight(targetPlatform)
  return preflight.requiredCheckIds.every((id) => hasPassedCheck(value, id))
}

function hasPassedCheck(value: unknown, id: string): boolean {
  return extractChecks(value).some((check) => check.id === id && check.status === 'passed')
}

function extractChecks(value: unknown): JsonCheck[] {
  if (!isRecord(value) || !Array.isArray(value.checks)) return []
  return value.checks.filter(isRecord)
}

function statusFromBoolean(passed: boolean, exists: boolean): ReleaseCheckStatus {
  if (passed) return 'passed'
  return exists ? 'failed' : 'not_run'
}

function parseArgs(args: string[]): Record<string, string> {
  return Object.fromEntries(args.map((arg) => {
    const match = /^--([^=]+)=(.*)$/.exec(arg)
    if (!match) throw new Error(`Invalid argument: ${arg}`)
    return [match[1], match[2]]
  }))
}

function requireChoice(value: string | undefined, choices: readonly ReleaseCheckStatus[], flag: string): ReleaseCheckStatus {
  if (!choices.includes(value ?? '')) {
    throw new Error(`${flag} must be one of: ${choices.join(', ')}`)
  }
  return value as ReleaseCheckStatus
}

function requireCheckStatus(value: string, flag: string): ReleaseCheckStatus {
  return requireChoice(value, ['passed', 'failed', 'not_run', 'not_applicable'], flag)
}

function isSafeFileName(value: unknown): value is string {
  return typeof value === 'string'
    && value.length > 0
    && !/[\\/\0]/.test(value)
    && path.basename(value) === value
}

function isSha256(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f0-9]{64}$/i.test(value)
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null
}
