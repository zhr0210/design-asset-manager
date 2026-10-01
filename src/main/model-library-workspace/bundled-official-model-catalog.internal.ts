import { createModelCatalogEnvelopeVerifier } from
  '../model-library/model-catalog-admission.internal'
import type { AdmittedModelCatalogArtifactRecord } from
  '../model-library/model-catalog-admission.internal'
import type {
  BundledOfficialCatalogPackage,
  OfficialCatalogPinnedTrustRoot,
  OfficialCatalogCheckpointSummary,
  OfficialCatalogFamilySummary,
  OfficialCatalogSummary,
  OfficialCatalogVariantSummary
} from './model-library-workspace'

export function projectBundledOfficialCatalog(
  pinnedTrustRoot: OfficialCatalogPinnedTrustRoot | undefined,
  bundle: BundledOfficialCatalogPackage | undefined
): OfficialCatalogSummary {
  if (!bundle) return unavailable('BUNDLE_MISSING')
  if (!pinnedTrustRoot) return unavailable('ROOT_UNRECOGNIZED')

  try {
    const verification = createModelCatalogEnvelopeVerifier([
      pinnedTrustRoot
    ]).verify(bundle.envelope)
    if (verification.kind === 'blocked') {
      return unavailable(mapVerificationFailure(verification.code))
    }
    const verified = verification.record
    if (
      bundle.releasePin.catalogId !== verified.catalogId ||
      bundle.releasePin.keyId !== verified.keyId ||
      bundle.releasePin.sequence !== verified.sequence ||
      bundle.releasePin.binding !== verified.binding
    ) {
      return unavailable('RELEASE_PIN_REJECTED')
    }

    return Object.freeze({
      state: 'available' as const,
      source: 'bundled-official' as const,
      trust: 'release-pinned' as const,
      catalogId: verified.catalogId,
      sequence: verified.sequence,
      mode: 'read-only' as const,
      families: projectFamilies(verified.artifacts)
    })
  } catch {
    return unavailable('SCHEMA_REJECTED')
  }
}

function projectFamilies(
  artifacts: readonly AdmittedModelCatalogArtifactRecord[]
): readonly OfficialCatalogFamilySummary[] {
  const families = new Map<
    string,
    Map<string, OfficialCatalogVariantSummary[]>
  >()
  for (const artifact of artifacts) {
    let checkpoints = families.get(artifact.identity.familyId)
    if (!checkpoints) {
      checkpoints = new Map()
      families.set(artifact.identity.familyId, checkpoints)
    }
    let variants = checkpoints.get(artifact.identity.checkpointId)
    if (!variants) {
      variants = []
      checkpoints.set(artifact.identity.checkpointId, variants)
    }
    variants.push(Object.freeze({
      ref: Object.freeze({ ...artifact.identity.ref }),
      variantId: artifact.identity.variantId,
      displayName: artifact.identity.displayName,
      declaredBytes: artifact.storageImpact.logicalBytes,
      acknowledgementLabels: Object.freeze(
        artifact.requiredAcknowledgements.map((item) => item.label)
      ),
      lifecycle: 'catalog-only' as const,
      installAvailable: false as const
    }))
  }

  return Object.freeze([...families.entries()]
    .sort(([left], [right]) => compareText(left, right))
    .map(([familyId, checkpoints]) => Object.freeze({
      familyId,
      checkpoints: Object.freeze([...checkpoints.entries()]
        .sort(([left], [right]) => compareText(left, right))
        .map(([checkpointId, variants]): OfficialCatalogCheckpointSummary =>
          Object.freeze({
            checkpointId,
            variants: Object.freeze([...variants].sort((left, right) =>
              compareText(left.variantId, right.variantId)
            ))
          })
        )
      )
    })))
}

function unavailable(
  reason: Extract<OfficialCatalogSummary, { state: 'unavailable' }>['reason']
): Extract<OfficialCatalogSummary, { state: 'unavailable' }> {
  return Object.freeze({
    state: 'unavailable',
    source: 'bundled-official',
    reason
  })
}

function mapVerificationFailure(
  code:
    | 'CATALOG_ROOT_UNRECOGNIZED'
    | 'CATALOG_SIGNATURE_INVALID'
    | 'CATALOG_SCHEMA_REJECTED'
    | 'MANIFEST_POLICY_REJECTED'
): Extract<OfficialCatalogSummary, { state: 'unavailable' }>['reason'] {
  if (code === 'CATALOG_ROOT_UNRECOGNIZED') return 'ROOT_UNRECOGNIZED'
  if (code === 'CATALOG_SIGNATURE_INVALID') return 'SIGNATURE_INVALID'
  if (code === 'MANIFEST_POLICY_REJECTED') return 'POLICY_REJECTED'
  return 'SCHEMA_REJECTED'
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}
