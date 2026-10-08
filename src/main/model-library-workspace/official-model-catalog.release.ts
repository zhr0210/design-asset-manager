import type {
  BundledOfficialCatalogPackage,
  OfficialCatalogPinnedTrustRoot
} from './model-library-workspace'
import { projectBundledOfficialCatalog } from
  './bundled-official-model-catalog.internal'
import checkedInReleaseInput from './official-model-catalog.release-input.json'

/**
 * Independent release-owned inputs. The application pins the Publisher public
 * trust root separately from the signed metadata bundle so the bundle cannot
 * nominate its own signer. A qualified offline release supplies both values;
 * test Catalog keys and manifests must never be used here.
 */
export type OfficialModelCatalogReleaseEvaluation =
  | {
      readonly schemaVersion: 1
      readonly state: 'blocked'
      readonly reason:
        | 'RELEASE_INPUT_MISSING'
        | 'RELEASE_INPUT_INVALID'
        | 'CATALOG_ROOT_UNRECOGNIZED'
        | 'CATALOG_SIGNATURE_INVALID'
        | 'CATALOG_SCHEMA_REJECTED'
        | 'CATALOG_POLICY_REJECTED'
        | 'CATALOG_RELEASE_PIN_REJECTED'
      readonly candidateAllowed: false
      readonly readsSigningSecrets: false
      readonly usesNetwork: false
      readonly readsModelBytes: false
      readonly containsSensitiveMaterial: false
    }
  | {
      readonly schemaVersion: 1
      readonly state: 'ready'
      readonly catalogId: string
      readonly sequence: string
      readonly familyCount: number
      readonly checkpointCount: number
      readonly variantCount: number
      readonly candidateAllowed: true
      readonly readsSigningSecrets: false
      readonly usesNetwork: false
      readonly readsModelBytes: false
      readonly containsSensitiveMaterial: false
    }

type ResolvedOfficialModelCatalogReleaseInput =
  | { readonly state: 'missing' }
  | { readonly state: 'invalid' }
  | {
      readonly state: 'candidate'
      readonly pinnedTrustRoot: OfficialCatalogPinnedTrustRoot
      readonly bundledCatalog: BundledOfficialCatalogPackage
    }

const RELEASE_EVIDENCE_INVARIANTS = Object.freeze({
  readsSigningSecrets: false as const,
  usesNetwork: false as const,
  readsModelBytes: false as const,
  containsSensitiveMaterial: false as const
})

export function evaluateOfficialModelCatalogRelease(
  input: unknown = checkedInReleaseInput
): OfficialModelCatalogReleaseEvaluation {
  const resolved = resolveOfficialModelCatalogReleaseInput(input)
  if (resolved.state !== 'candidate') {
    return blocked(
      resolved.state === 'missing'
        ? 'RELEASE_INPUT_MISSING'
        : 'RELEASE_INPUT_INVALID'
    )
  }
  const catalog = projectBundledOfficialCatalog(
    resolved.pinnedTrustRoot,
    resolved.bundledCatalog
  )
  if (catalog.state === 'unavailable') {
    return blocked(mapCatalogFailure(catalog.reason))
  }
  return Object.freeze({
    schemaVersion: 1,
    state: 'ready',
    catalogId: catalog.catalogId,
    sequence: catalog.sequence,
    familyCount: catalog.families.length,
    checkpointCount: catalog.families.reduce(
      (total, family) => total + family.checkpoints.length,
      0
    ),
    variantCount: catalog.families.reduce(
      (familyTotal, family) => familyTotal + family.checkpoints.reduce(
        (checkpointTotal, checkpoint) =>
          checkpointTotal + checkpoint.variants.length,
        0
      ),
      0
    ),
    candidateAllowed: true,
    ...RELEASE_EVIDENCE_INVARIANTS
  })
}

const resolvedCheckedInReleaseInput = resolveOfficialModelCatalogReleaseInput(
  checkedInReleaseInput
)
export const OFFICIAL_MODEL_CATALOG_RELEASE_INPUT_STATE:
  ResolvedOfficialModelCatalogReleaseInput['state'] =
    resolvedCheckedInReleaseInput.state
export const BUNDLED_OFFICIAL_MODEL_CATALOG:
  BundledOfficialCatalogPackage | undefined =
    resolvedCheckedInReleaseInput.state === 'candidate'
      ? resolvedCheckedInReleaseInput.bundledCatalog
      : undefined

export const PINNED_OFFICIAL_MODEL_CATALOG_TRUST_ROOT:
  OfficialCatalogPinnedTrustRoot | undefined =
    resolvedCheckedInReleaseInput.state === 'candidate'
      ? resolvedCheckedInReleaseInput.pinnedTrustRoot
      : undefined

function resolveOfficialModelCatalogReleaseInput(
  input: unknown
): ResolvedOfficialModelCatalogReleaseInput {
  const record = readExactRecord(input, [
    'schemaVersion',
    'pinnedTrustRoot',
    'bundledCatalog'
  ])
  if (!record || record.schemaVersion !== 1) return { state: 'invalid' }
  if (record.pinnedTrustRoot === null && record.bundledCatalog === null) {
    return { state: 'missing' }
  }
  if (record.pinnedTrustRoot === null || record.bundledCatalog === null) {
    return { state: 'invalid' }
  }
  const trustRoot = readExactRecord(record.pinnedTrustRoot, [
    'catalogId',
    'keyId',
    'publicKeySpkiBase64'
  ])
  const bundle = readExactRecord(record.bundledCatalog, [
    'envelope',
    'releasePin'
  ])
  const releasePin = readExactRecord(bundle?.releasePin, [
    'catalogId',
    'keyId',
    'sequence',
    'binding'
  ])
  if (
    !trustRoot ||
    !bundle ||
    !releasePin ||
    typeof trustRoot.catalogId !== 'string' ||
    typeof trustRoot.keyId !== 'string' ||
    typeof trustRoot.publicKeySpkiBase64 !== 'string' ||
    typeof releasePin.catalogId !== 'string' ||
    typeof releasePin.keyId !== 'string' ||
    typeof releasePin.sequence !== 'string' ||
    typeof releasePin.binding !== 'string'
  ) return { state: 'invalid' }
  return {
    state: 'candidate',
    pinnedTrustRoot: Object.freeze({
      catalogId: trustRoot.catalogId,
      keyId: trustRoot.keyId,
      publicKeySpkiBase64: trustRoot.publicKeySpkiBase64
    }),
    bundledCatalog: Object.freeze({
      envelope: bundle.envelope as BundledOfficialCatalogPackage['envelope'],
      releasePin: Object.freeze({
        catalogId: releasePin.catalogId,
        keyId: releasePin.keyId,
        sequence: releasePin.sequence,
        binding: releasePin.binding
      })
    })
  }
}

function blocked(
  reason: Extract<
    OfficialModelCatalogReleaseEvaluation,
    { state: 'blocked' }
  >['reason']
): Extract<
  OfficialModelCatalogReleaseEvaluation,
  { state: 'blocked' }
> {
  return Object.freeze({
    schemaVersion: 1,
    state: 'blocked',
    reason,
    candidateAllowed: false,
    ...RELEASE_EVIDENCE_INVARIANTS
  })
}

function mapCatalogFailure(
  reason:
    | 'BUNDLE_MISSING'
    | 'RELEASE_INPUT_INVALID'
    | 'ROOT_UNRECOGNIZED'
    | 'SIGNATURE_INVALID'
    | 'SCHEMA_REJECTED'
    | 'POLICY_REJECTED'
    | 'RELEASE_PIN_REJECTED'
): Extract<
  OfficialModelCatalogReleaseEvaluation,
  { state: 'blocked' }
>['reason'] {
  if (reason === 'ROOT_UNRECOGNIZED') return 'CATALOG_ROOT_UNRECOGNIZED'
  if (reason === 'SIGNATURE_INVALID') return 'CATALOG_SIGNATURE_INVALID'
  if (reason === 'POLICY_REJECTED') return 'CATALOG_POLICY_REJECTED'
  if (reason === 'RELEASE_PIN_REJECTED') {
    return 'CATALOG_RELEASE_PIN_REJECTED'
  }
  return reason === 'BUNDLE_MISSING' || reason === 'RELEASE_INPUT_INVALID'
    ? 'RELEASE_INPUT_INVALID'
    : 'CATALOG_SCHEMA_REJECTED'
}

function readExactRecord(
  value: unknown,
  expectedKeys: readonly string[]
): Record<string, unknown> | undefined {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return undefined
  }
  const descriptors = Object.getOwnPropertyDescriptors(value)
  if (
    Object.getPrototypeOf(value) !== Object.prototype ||
    Reflect.ownKeys(descriptors).some((key) => typeof key === 'symbol')
  ) return undefined
  const entries: Array<[string, unknown]> = []
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (!descriptor.enumerable || !('value' in descriptor)) return undefined
    entries.push([key, descriptor.value])
  }
  const record = Object.fromEntries(entries)
  const keys = Object.keys(record).sort(compareText)
  const expected = [...expectedKeys].sort(compareText)
  return keys.length === expected.length &&
    keys.every((key, index) => key === expected[index])
    ? record
    : undefined
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}
