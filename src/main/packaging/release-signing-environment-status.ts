import {
  createReleaseEnvironmentManifest,
  type ReleaseEnvironmentManifestEntry
} from './release-environment-manifest'

export interface ReleaseSigningEnvironmentEvidence {
  schemaVersion: 1
  source: 'github-environment-status'
  environments: ReleaseSigningEnvironmentEvidenceEntry[]
}

export interface ReleaseSigningEnvironmentEvidenceEntry {
  environment: string
  reviewersConfigured: boolean
  requiredSecretNamesPresent: string[]
}

export type ReleaseSigningEnvironmentStatusCode =
  | 'ready'
  | 'external_action_required'

export type ReleaseSigningEnvironmentMissingCode =
  | 'environment_status'
  | 'github_environment_review'
  | 'secret_name'

export interface ReleaseSigningEnvironmentMissing {
  code: ReleaseSigningEnvironmentMissingCode
  label: string
  detail: string
}

export interface ReleaseSigningEnvironmentPlatformStatus {
  platform: ReleaseEnvironmentManifestEntry['platform']
  environment: ReleaseEnvironmentManifestEntry['environment']
  workflowFileName: ReleaseEnvironmentManifestEntry['workflowFileName']
  jobName: ReleaseEnvironmentManifestEntry['jobName']
  signingApprovalInput: ReleaseEnvironmentManifestEntry['signingApprovalInput']
  requiredSecretNames: string[]
  secretValuesPolicy: ReleaseEnvironmentManifestEntry['secretValuesPolicy']
  reviewersConfigured: boolean
  secretNamesPresent: string[]
  status: ReleaseSigningEnvironmentStatusCode
  missing: ReleaseSigningEnvironmentMissing[]
}

export interface ReleaseSigningEnvironmentStatus {
  schemaVersion: 1
  source: 'release-environment-manifest'
  displayOnly: true
  writesGitHubSettings: false
  readsSecretValues: false
  readsSigningAssets: false
  readsBrandingAssetBytes: false
  emitsLocalPaths: false
  executesWorkflow: false
  publishesRelease: false
  status: ReleaseSigningEnvironmentStatusCode
  environments: ReleaseSigningEnvironmentPlatformStatus[]
}

export function createReleaseSigningEnvironmentStatus(
  evidence: unknown
): ReleaseSigningEnvironmentStatus {
  const manifest = createReleaseEnvironmentManifest()
  const parsedEvidence = parseEvidence(evidence)

  const environments = manifest.environments.map((entry) =>
    evaluateEnvironment(entry, parsedEvidence)
  )

  return {
    schemaVersion: 1,
    source: 'release-environment-manifest',
    displayOnly: true,
    writesGitHubSettings: false,
    readsSecretValues: false,
    readsSigningAssets: false,
    readsBrandingAssetBytes: false,
    emitsLocalPaths: false,
    executesWorkflow: false,
    publishesRelease: false,
    status: environments.every((item) => item.status === 'ready')
      ? 'ready'
      : 'external_action_required',
    environments
  }
}

function evaluateEnvironment(
  manifest: ReleaseEnvironmentManifestEntry,
  evidence: ReleaseSigningEnvironmentEvidence | null
): ReleaseSigningEnvironmentPlatformStatus {
  const evidenceEntry = evidence?.environments.find(
    (item) => item.environment === manifest.environment
  )
  const secretNamesPresent = [...new Set(evidenceEntry?.requiredSecretNamesPresent ?? [])].sort()
  const presentSecretNames = new Set(secretNamesPresent)
  const missing = missingForEnvironment(manifest, evidenceEntry, presentSecretNames)

  return {
    platform: manifest.platform,
    environment: manifest.environment,
    workflowFileName: manifest.workflowFileName,
    jobName: manifest.jobName,
    signingApprovalInput: manifest.signingApprovalInput,
    requiredSecretNames: [...manifest.requiredSecretNames],
    secretValuesPolicy: manifest.secretValuesPolicy,
    reviewersConfigured: Boolean(evidenceEntry?.reviewersConfigured),
    secretNamesPresent,
    status: missing.length === 0 ? 'ready' : 'external_action_required',
    missing
  }
}

function missingForEnvironment(
  manifest: ReleaseEnvironmentManifestEntry,
  evidence: ReleaseSigningEnvironmentEvidenceEntry | undefined,
  presentSecretNames: Set<string>
): ReleaseSigningEnvironmentMissing[] {
  if (!evidence) {
    return [{
      code: 'environment_status',
      label: 'GitHub Environment status',
      detail: `${manifest.environment} status evidence is missing.`
    }]
  }

  const missing: ReleaseSigningEnvironmentMissing[] = []
  if (!evidence.reviewersConfigured) {
    missing.push({
      code: 'github_environment_review',
      label: 'GitHub Environment review',
      detail: `${manifest.environment} must require reviewer approval before signing secrets are available.`
    })
  }

  for (const secretName of manifest.requiredSecretNames) {
    if (!presentSecretNames.has(secretName)) {
      missing.push({
        code: 'secret_name',
        label: 'Required signing secret name',
        detail: `${manifest.environment} is missing required secret name ${secretName}.`
      })
    }
  }

  return missing
}

function parseEvidence(value: unknown): ReleaseSigningEnvironmentEvidence | null {
  if (!isRecord(value)) return null
  if (
    value.schemaVersion !== 1
    || value.source !== 'github-environment-status'
    || !Array.isArray(value.environments)
  ) {
    return null
  }

  return {
    schemaVersion: 1,
    source: 'github-environment-status',
    environments: value.environments.filter(isEvidenceEntry)
  }
}

function isEvidenceEntry(value: unknown): value is ReleaseSigningEnvironmentEvidenceEntry {
  return isRecord(value)
    && typeof value.environment === 'string'
    && typeof value.reviewersConfigured === 'boolean'
    && Array.isArray(value.requiredSecretNamesPresent)
    && value.requiredSecretNamesPresent.every((item) => typeof item === 'string')
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null
}
