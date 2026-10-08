import {
  evaluateOfficialModelCatalogRelease,
  type OfficialModelCatalogReleaseEvaluation
} from './official-model-catalog.release'
import type {
  BundledOfficialCatalogPackage,
  OfficialCatalogPinnedTrustRoot
} from './model-library-workspace'

export interface PreparedOfficialModelCatalogReleaseInput {
  readonly schemaVersion: 1
  readonly pinnedTrustRoot: OfficialCatalogPinnedTrustRoot
  readonly bundledCatalog: BundledOfficialCatalogPackage
}

export type OfficialModelCatalogReleasePreparation =
  | {
      readonly state: 'ready'
      readonly candidate: PreparedOfficialModelCatalogReleaseInput
      readonly summary: Extract<
        OfficialModelCatalogReleaseEvaluation,
        { state: 'ready' }
      >
    }
  | {
      readonly state: 'blocked'
      readonly reason: Extract<
        OfficialModelCatalogReleaseEvaluation,
        { state: 'blocked' }
      >['reason']
    }

export function prepareOfficialModelCatalogReleaseInput(input: {
  readonly pinnedTrustRoot: unknown
  readonly bundledCatalog: unknown
}): OfficialModelCatalogReleasePreparation {
  const trustRoot = normalizeJsonValue(input.pinnedTrustRoot)
  const bundledCatalog = normalizeJsonValue(input.bundledCatalog)
  if (!trustRoot.ok || !bundledCatalog.ok) {
    return blocked('RELEASE_INPUT_INVALID')
  }
  const candidate = Object.freeze({
    schemaVersion: 1 as const,
    pinnedTrustRoot: trustRoot.value,
    bundledCatalog: bundledCatalog.value
  })
  const summary = evaluateOfficialModelCatalogRelease(candidate)
  if (summary.state === 'blocked') return blocked(summary.reason)
  return Object.freeze({
    state: 'ready',
    candidate: candidate as PreparedOfficialModelCatalogReleaseInput,
    summary
  })
}

function blocked(
  reason: Extract<
    OfficialModelCatalogReleasePreparation,
    { state: 'blocked' }
  >['reason']
): Extract<
  OfficialModelCatalogReleasePreparation,
  { state: 'blocked' }
> {
  return Object.freeze({ state: 'blocked', reason })
}

type NormalizedJsonValue =
  | { readonly ok: true; readonly value: unknown }
  | { readonly ok: false }

function normalizeJsonValue(
  value: unknown,
  depth = 0,
  seen: WeakSet<object> = new WeakSet()
): NormalizedJsonValue {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean'
  ) return { ok: true, value }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? { ok: true, value } : { ok: false }
  }
  if (typeof value !== 'object' || depth > 32 || seen.has(value)) {
    return { ok: false }
  }
  const prototype = Object.getPrototypeOf(value)
  if (
    prototype !== Object.prototype &&
    prototype !== Array.prototype
  ) return { ok: false }
  const descriptors = Object.getOwnPropertyDescriptors(value)
  if (Reflect.ownKeys(descriptors).some((key) => typeof key === 'symbol')) {
    return { ok: false }
  }
  seen.add(value)
  if (Array.isArray(value)) {
    const ownKeys = Reflect.ownKeys(descriptors)
    if (
      ownKeys.length !== value.length + 1 ||
      !ownKeys.includes('length')
    ) return { ok: false }
    const normalized: unknown[] = []
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = descriptors[String(index)]
      if (!descriptor?.enumerable || !('value' in descriptor)) {
        return { ok: false }
      }
      const item = normalizeJsonValue(descriptor.value, depth + 1, seen)
      if (!item.ok) return item
      normalized.push(item.value)
    }
    return { ok: true, value: Object.freeze(normalized) }
  }
  const normalized: Record<string, unknown> = {}
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (!descriptor.enumerable || !('value' in descriptor)) {
      return { ok: false }
    }
    const item = normalizeJsonValue(descriptor.value, depth + 1, seen)
    if (!item.ok) return item
    Object.defineProperty(normalized, key, {
      value: item.value,
      enumerable: true,
      configurable: false,
      writable: false
    })
  }
  return { ok: true, value: Object.freeze(normalized) }
}
