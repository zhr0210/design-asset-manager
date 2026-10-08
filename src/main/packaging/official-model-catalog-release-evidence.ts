import type { OfficialModelCatalogReleaseEvaluation } from
  '../model-library-workspace/official-model-catalog.release'
import type {
  ReleasePackagingArch,
  ReleasePlatform
} from './release-flow-governance'

export interface OfficialModelCatalogReleaseEvidence {
  readonly schemaVersion: 1
  readonly source: 'official-model-catalog-release-gate'
  readonly platform: ReleasePlatform
  readonly arch: ReleasePackagingArch
  readonly status: 'passed' | 'failed'
  readonly evaluation: OfficialModelCatalogReleaseEvaluation
}

export function createOfficialModelCatalogReleaseEvidence(
  platform: ReleasePlatform,
  arch: ReleasePackagingArch,
  evaluation: OfficialModelCatalogReleaseEvaluation
): OfficialModelCatalogReleaseEvidence {
  return Object.freeze({
    schemaVersion: 1,
    source: 'official-model-catalog-release-gate',
    platform,
    arch,
    status: evaluation.state === 'ready' ? 'passed' : 'failed',
    evaluation
  })
}

export function isPassedOfficialModelCatalogReleaseEvidence(
  value: unknown,
  target: {
    readonly platform: ReleasePlatform
    readonly arch: ReleasePackagingArch
  }
): boolean {
  const evidence = readExactRecord(value, [
    'schemaVersion',
    'source',
    'platform',
    'arch',
    'status',
    'evaluation'
  ])
  if (
    !evidence ||
    evidence.schemaVersion !== 1 ||
    evidence.source !== 'official-model-catalog-release-gate' ||
    !sameReleaseTarget(evidence, target) ||
    evidence.status !== 'passed'
  ) return false
  const evaluation = readExactRecord(evidence.evaluation, [
    'schemaVersion',
    'state',
    'catalogId',
    'sequence',
    'familyCount',
    'checkpointCount',
    'variantCount',
    'candidateAllowed',
    'readsSigningSecrets',
    'usesNetwork',
    'readsModelBytes',
    'containsSensitiveMaterial'
  ])
  return Boolean(
    evaluation &&
    evaluation.schemaVersion === 1 &&
    evaluation.state === 'ready' &&
    typeof evaluation.catalogId === 'string' &&
    typeof evaluation.sequence === 'string' &&
    isNonNegativeInteger(evaluation.familyCount) &&
    isNonNegativeInteger(evaluation.checkpointCount) &&
    isNonNegativeInteger(evaluation.variantCount) &&
    evaluation.candidateAllowed === true &&
    evaluation.readsSigningSecrets === false &&
    evaluation.usesNetwork === false &&
    evaluation.readsModelBytes === false &&
    evaluation.containsSensitiveMaterial === false
  )
}

function sameReleaseTarget(
  left: Record<string, unknown>,
  right: {
    readonly platform: ReleasePlatform
    readonly arch: ReleasePackagingArch
  }
): boolean {
  const leftPlatform = left['platform']
  const leftArch = left['arch']
  const expectedPlatform = right['platform']
  const expectedArch = right['arch']
  return typeof leftPlatform === 'string' &&
    typeof leftArch === 'string' &&
    `${leftPlatform}:${leftArch}` === `${expectedPlatform}:${expectedArch}`
}

function readExactRecord(
  value: unknown,
  expectedKeys: readonly string[]
): Record<string, unknown> | undefined {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return undefined
  }
  const record = value as Record<string, unknown>
  const keys = Object.keys(record).sort(compareText)
  const expected = [...expectedKeys].sort(compareText)
  return keys.length === expected.length &&
    keys.every((key, index) => key === expected[index])
    ? record
    : undefined
}

function isNonNegativeInteger(value: unknown): boolean {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}
