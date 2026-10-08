import {
  createHash,
  createPublicKey,
  verify,
  type KeyObject
} from 'node:crypto'

import type {
  AdmittedModelCatalog,
  CreateInMemoryModelCatalogAdmissionTracerInput,
  ModelCatalogAdmission,
  ModelCatalogAdmissionBlockCode,
  ModelCatalogAdmissionDecision,
  PinnedModelCatalogTrustRoot,
  SignedModelCatalogEnvelope
} from './model-catalog-admission.tracer'
import type {
  ModelArtifactAcknowledgement,
  ModelArtifactPublicIdentity,
  ModelArtifactStorageImpact
} from './model-library'

export interface AdmittedModelCatalogArtifactRecord {
  readonly identity: ModelArtifactPublicIdentity
  readonly admissionBinding: string
  readonly files: readonly AdmittedModelCatalogFileRecord[]
  readonly storageImpact: ModelArtifactStorageImpact
  readonly requiredAcknowledgements: readonly ModelArtifactAcknowledgement[]
}

export interface AdmittedModelCatalogFileRecord {
  readonly relativePath: string
  readonly role: string
  readonly format: string
  readonly sizeBytes: number
  readonly sha256: string
}

interface AdmittedModelCatalogRecord {
  readonly binding: string
  readonly artifacts: readonly AdmittedModelCatalogArtifactRecord[]
}

export interface VerifiedModelCatalogEnvelopeRecord {
  readonly catalogId: string
  readonly keyId: string
  readonly sequence: string
  readonly trustVerifiedAt: string
  readonly binding: string
  readonly artifacts: readonly AdmittedModelCatalogArtifactRecord[]
}

export type ModelCatalogEnvelopeVerification =
  | {
      readonly kind: 'verified'
      readonly record: VerifiedModelCatalogEnvelopeRecord
    }
  | {
      readonly kind: 'blocked'
      readonly code: Exclude<
        ModelCatalogAdmissionBlockCode,
        'CATALOG_SEQUENCE_REJECTED'
      >
    }

export interface ModelCatalogEnvelopeVerifier {
  verify(envelope: SignedModelCatalogEnvelope): ModelCatalogEnvelopeVerification
}

interface TrustedRoot {
  readonly publicKey: KeyObject
  readonly fingerprint: string
}

interface AcceptedCatalogSequence {
  readonly sequence: bigint
  readonly binding: string
}

interface NormalizedModelCatalogPayload {
  readonly schemaVersion: 1
  readonly catalogId: string
  readonly keyId: string
  readonly sequence: string
  readonly trustVerifiedAt: string
  readonly artifacts: readonly NormalizedModelArtifactManifest[]
}

interface NormalizedModelArtifactManifest {
  readonly manifestId: string
  readonly familyId: string
  readonly checkpointId: string
  readonly variantId: string
  readonly displayName: string
  readonly immutableRevision: string
  readonly files: readonly NormalizedModelArtifactFile[]
  readonly requiredAcknowledgements: readonly NormalizedAcknowledgement[]
}

interface NormalizedModelArtifactFile {
  readonly path: string
  readonly role: string
  readonly format: string
  readonly sizeBytes: number
  readonly sha256: string
}

interface NormalizedAcknowledgement {
  readonly id: string
  readonly kind: 'license' | 'network-cost' | 'storage-impact' | 'gated-source'
  readonly label: string
}

const FRESH_TRUST_WINDOW_MS = 24 * 60 * 60 * 1_000
const MODEL_CATALOG_ADMISSION_POLICY_VERSION = 'model-catalog-admission-v1'
const MAX_ARTIFACTS = 128
const MAX_FILES_PER_ARTIFACT = 64
const MAX_ACKNOWLEDGEMENTS_PER_ARTIFACT = 16
const MAX_FILE_BYTES = 4 * 1024 ** 4
const MAX_ARTIFACT_BYTES = 16 * 1024 ** 4
const ALLOWED_ROLE_FORMATS = new Map<string, ReadonlySet<string>>([
  ['weights', new Set(['safetensors', 'gguf', 'onnx'])],
  ['tokenizer', new Set(['sentencepiece', 'json', 'text'])],
  ['configuration', new Set(['json'])],
  ['vocabulary', new Set(['json', 'text'])],
  ['merges', new Set(['text'])],
  ['template', new Set(['json', 'text'])],
  ['labels', new Set(['json', 'text'])],
  ['onnx-external-data', new Set(['binary'])]
])
const admittedCatalogRecords = new WeakMap<object, AdmittedModelCatalogRecord>()

export function createInMemoryModelCatalogAdmissionTracer(
  input: CreateInMemoryModelCatalogAdmissionTracerInput
): ModelCatalogAdmission {
  const verifier = createModelCatalogEnvelopeVerifier(input.trustRoots)
  const acceptedSequences = new Map<string, AcceptedCatalogSequence>()

  return Object.freeze({
    admit(envelope: SignedModelCatalogEnvelope): ModelCatalogAdmissionDecision {
      try {
        const verification = verifier.verify(envelope)
        if (verification.kind === 'blocked') return blocked(verification.code)
        const verified = verification.record
        const sequence = BigInt(verified.sequence)
        const previouslyAccepted = acceptedSequences.get(verified.catalogId)
        if (
          previouslyAccepted &&
          (
            sequence < previouslyAccepted.sequence ||
            (
              sequence === previouslyAccepted.sequence &&
              verified.binding !== previouslyAccepted.binding
            )
          )
        ) {
          return blocked('CATALOG_SEQUENCE_REJECTED')
        }
        const verifiedAt = Date.parse(verified.trustVerifiedAt)
        const now = input.nowEpochMs()
        if (
          !Number.isFinite(verifiedAt) ||
          !Number.isFinite(now) ||
          verifiedAt > now ||
          now - verifiedAt > FRESH_TRUST_WINDOW_MS
        ) {
          return Object.freeze({
            kind: 'waiting',
            code: 'FRESH_TRUST_REQUIRED',
            retry: 'refresh-trust'
          })
        }

        if (!previouslyAccepted || sequence > previouslyAccepted.sequence) {
          acceptedSequences.set(verified.catalogId, {
            sequence,
            binding: verified.binding
          })
        }

        const catalog = Object.freeze({
          catalogId: verified.catalogId,
          sequence: verified.sequence,
          binding: verified.binding
        }) as AdmittedModelCatalog
        admittedCatalogRecords.set(catalog, Object.freeze({
          binding: verified.binding,
          artifacts: verified.artifacts
        }))
        return Object.freeze({ kind: 'admitted', catalog })
      } catch {
        return blocked('CATALOG_SCHEMA_REJECTED')
      }
    }
  })
}

/**
 * @internal Pure signed-envelope verification shared by online admission and
 * release-bundled metadata projection. It does not assess freshness, persist a
 * sequence floor, or mint an install-capable AdmittedModelCatalog.
 */
export function createModelCatalogEnvelopeVerifier(
  trustRoots: readonly PinnedModelCatalogTrustRoot[]
): ModelCatalogEnvelopeVerifier {
  if (!Array.isArray(trustRoots) || trustRoots.length === 0) {
    throw new Error('MODEL_CATALOG_TRUST_ROOT_INVALID')
  }
  const roots = new Map<string, TrustedRoot>()
  const catalogRoots = new Set<string>()
  for (const root of trustRoots) {
    if (!isOpaqueId(root.catalogId) || !isOpaqueId(root.keyId)) {
      throw new Error('MODEL_CATALOG_TRUST_ROOT_INVALID')
    }
    const rootAddress = trustRootKey(root.catalogId, root.keyId)
    if (catalogRoots.has(root.catalogId)) {
      throw new Error('MODEL_CATALOG_TRUST_ROOT_INVALID')
    }
    const publicKey = parsePinnedEd25519PublicKey(root.publicKeySpkiBase64)
    const normalizedPublicKey = publicKey.export({
      format: 'der',
      type: 'spki'
    }) as Buffer
    roots.set(rootAddress, {
      publicKey,
      fingerprint: createHash('sha256').update(normalizedPublicKey).digest('hex')
    })
    catalogRoots.add(root.catalogId)
  }

  return Object.freeze({
    verify(
      envelope: SignedModelCatalogEnvelope
    ): ModelCatalogEnvelopeVerification {
      try {
        const normalizedEnvelope = normalizeSignedCatalogEnvelope(envelope)
        if (!normalizedEnvelope) {
          return blockedVerification('CATALOG_SCHEMA_REJECTED')
        }
        const root = roots.get(trustRootKey(
          normalizedEnvelope.catalogId,
          normalizedEnvelope.keyId
        ))
        if (!root) return blockedVerification('CATALOG_ROOT_UNRECOGNIZED')

        const payload = normalizeCatalogPayload(normalizedEnvelope.payload)
        if (
          !payload ||
          payload.catalogId !== normalizedEnvelope.catalogId ||
          payload.keyId !== normalizedEnvelope.keyId
        ) {
          return blockedVerification('CATALOG_SCHEMA_REJECTED')
        }

        const canonicalPayload = canonicalJson(payload)
        const signature = decodeEd25519Signature(normalizedEnvelope.signatureBase64)
        if (!signature) {
          return blockedVerification('CATALOG_SIGNATURE_INVALID')
        }
        if (!verify(
          null,
          Buffer.from(canonicalPayload, 'utf8'),
          root.publicKey,
          signature
        )) {
          return blockedVerification('CATALOG_SIGNATURE_INVALID')
        }
        if (!manifestDeclarationsAreDataOnly(payload.artifacts)) {
          return blockedVerification('MANIFEST_POLICY_REJECTED')
        }

        const binding = `admission:${createHash('sha256')
          .update(canonicalJson([
            MODEL_CATALOG_ADMISSION_POLICY_VERSION,
            root.fingerprint,
            canonicalPayload
          ]))
          .digest('hex')}`
        const admittedRecord = createAdmittedCatalogRecord(payload, binding)
        return Object.freeze({
          kind: 'verified' as const,
          record: Object.freeze({
            catalogId: payload.catalogId,
            keyId: payload.keyId,
            sequence: payload.sequence,
            trustVerifiedAt: payload.trustVerifiedAt,
            binding,
            artifacts: admittedRecord.artifacts
          })
        })
      } catch {
        return blockedVerification('CATALOG_SCHEMA_REJECTED')
      }
    }
  })
}

/** @internal Non-issuing consumer seam for the sibling Model Library tracer. */
export function readAdmittedModelCatalog(
  catalog: object
): AdmittedModelCatalogRecord | undefined {
  const record = admittedCatalogRecords.get(catalog)
  if (!record) return undefined
  return {
    binding: record.binding,
    artifacts: record.artifacts.map((artifact) => ({
      identity: {
        ...artifact.identity,
        ref: { ...artifact.identity.ref }
      },
      admissionBinding: artifact.admissionBinding,
      files: artifact.files.map((file) => ({ ...file })),
      storageImpact: { ...artifact.storageImpact },
      requiredAcknowledgements: artifact.requiredAcknowledgements.map((item) => ({ ...item }))
    }))
  }
}

function normalizeSignedCatalogEnvelope(
  value: unknown
): SignedModelCatalogEnvelope | undefined {
  const record = readExactDataRecord(value, [
    'catalogId',
    'keyId',
    'payload',
    'signatureBase64'
  ])
  if (!record) return undefined
  if (
    !isOpaqueId(record.catalogId) ||
    !isOpaqueId(record.keyId) ||
    typeof record.signatureBase64 !== 'string'
  ) return undefined
  return {
    catalogId: record.catalogId,
    keyId: record.keyId,
    payload: record.payload,
    signatureBase64: record.signatureBase64
  }
}

function createAdmittedCatalogRecord(
  payload: NormalizedModelCatalogPayload,
  catalogBinding: string
): AdmittedModelCatalogRecord {
  return Object.freeze({
    binding: catalogBinding,
    artifacts: Object.freeze(payload.artifacts.map((artifact) => {
      const logicalBytes = artifact.files.reduce((total, file) => total + file.sizeBytes, 0)
      return Object.freeze({
        identity: Object.freeze({
          ref: Object.freeze({
            catalogId: payload.catalogId,
            manifestId: artifact.manifestId
          }),
          familyId: artifact.familyId,
          checkpointId: artifact.checkpointId,
          variantId: artifact.variantId,
          displayName: artifact.displayName,
          immutableRevision: artifact.immutableRevision
        }),
        admissionBinding: `artifact-admission:${createHash('sha256')
          .update(canonicalJson([
            catalogBinding,
            artifact.manifestId,
            artifact.immutableRevision
          ]))
          .digest('hex')}`,
        files: Object.freeze(artifact.files.map((file) => Object.freeze({
          relativePath: file.path,
          role: file.role,
          format: file.format,
          sizeBytes: file.sizeBytes,
          sha256: file.sha256
        }))),
        storageImpact: Object.freeze({
          logicalBytes,
          alreadyPresentSharedBytes: 0,
          transferRequiredBytes: logicalBytes,
          additionalPhysicalBytes: logicalBytes
        }),
        requiredAcknowledgements: Object.freeze(
          artifact.requiredAcknowledgements.map((item) => Object.freeze({ ...item }))
        )
      })
    }))
  })
}

function normalizeCatalogPayload(value: unknown): NormalizedModelCatalogPayload | undefined {
  const record = readExactDataRecord(value, [
    'schemaVersion',
    'catalogId',
    'keyId',
    'sequence',
    'trustVerifiedAt',
    'artifacts'
  ])
  if (!record) return undefined
  const artifactsInput = readExactDataArray(record.artifacts, MAX_ARTIFACTS)
  if (
    record.schemaVersion !== 1 ||
    !isOpaqueId(record.catalogId) ||
    !isOpaqueId(record.keyId) ||
    typeof record.sequence !== 'string' ||
    !/^[1-9][0-9]{0,38}$/.test(record.sequence) ||
    !isCanonicalIsoDate(record.trustVerifiedAt) ||
    !artifactsInput ||
    artifactsInput.length === 0
  ) return undefined

  const artifacts: NormalizedModelArtifactManifest[] = []
  const manifestIds = new Set<string>()
  for (const artifactValue of artifactsInput) {
    const artifact = normalizeArtifactManifest(artifactValue)
    if (!artifact || manifestIds.has(artifact.manifestId)) return undefined
    manifestIds.add(artifact.manifestId)
    artifacts.push(artifact)
  }
  artifacts.sort((left, right) => compareText(left.manifestId, right.manifestId))

  return {
    schemaVersion: 1,
    catalogId: record.catalogId,
    keyId: record.keyId,
    sequence: record.sequence,
    trustVerifiedAt: record.trustVerifiedAt,
    artifacts
  }
}

function normalizeArtifactManifest(value: unknown): NormalizedModelArtifactManifest | undefined {
  const record = readExactDataRecord(value, [
    'manifestId',
    'familyId',
    'checkpointId',
    'variantId',
    'displayName',
    'immutableRevision',
    'files',
    'requiredAcknowledgements'
  ])
  if (!record) return undefined
  const filesInput = readExactDataArray(record.files, MAX_FILES_PER_ARTIFACT)
  const acknowledgementsInput = readExactDataArray(
    record.requiredAcknowledgements,
    MAX_ACKNOWLEDGEMENTS_PER_ARTIFACT
  )
  if (
    !isOpaqueId(record.manifestId) ||
    !isOpaqueId(record.familyId) ||
    !isOpaqueId(record.checkpointId) ||
    !isOpaqueId(record.variantId) ||
    !isSafeText(record.displayName, 256) ||
    typeof record.immutableRevision !== 'string' ||
    !/^(?:sha256:[a-f0-9]{64}|git:[a-f0-9]{40,64})$/.test(record.immutableRevision) ||
    !filesInput ||
    filesInput.length === 0 ||
    !acknowledgementsInput
  ) return undefined

  const files: NormalizedModelArtifactFile[] = []
  for (const fileValue of filesInput) {
    const file = normalizeArtifactFile(fileValue)
    if (!file) return undefined
    files.push(file)
  }
  files.sort((left, right) => compareText(left.path, right.path))

  const requiredAcknowledgements: NormalizedAcknowledgement[] = []
  const acknowledgementIds = new Set<string>()
  for (const acknowledgementValue of acknowledgementsInput) {
    const acknowledgement = normalizeAcknowledgement(acknowledgementValue)
    if (!acknowledgement || acknowledgementIds.has(acknowledgement.id)) return undefined
    acknowledgementIds.add(acknowledgement.id)
    requiredAcknowledgements.push(acknowledgement)
  }
  requiredAcknowledgements.sort((left, right) => compareText(left.id, right.id))

  return {
    manifestId: record.manifestId,
    familyId: record.familyId,
    checkpointId: record.checkpointId,
    variantId: record.variantId,
    displayName: record.displayName,
    immutableRevision: record.immutableRevision,
    files,
    requiredAcknowledgements
  }
}

function normalizeArtifactFile(value: unknown): NormalizedModelArtifactFile | undefined {
  const record = readExactDataRecord(value, ['path', 'role', 'format', 'sizeBytes', 'sha256'])
  if (!record) return undefined
  if (
    !isSafeText(record.path, 512) ||
    !isOpaqueId(record.role) ||
    !isOpaqueId(record.format) ||
    !Number.isSafeInteger(record.sizeBytes) ||
    (record.sizeBytes as number) <= 0 ||
    typeof record.sha256 !== 'string' ||
    !/^[a-f0-9]{64}$/.test(record.sha256)
  ) return undefined
  return {
    path: record.path,
    role: record.role,
    format: record.format,
    sizeBytes: record.sizeBytes as number,
    sha256: record.sha256
  }
}

function normalizeAcknowledgement(value: unknown): NormalizedAcknowledgement | undefined {
  const record = readExactDataRecord(value, ['id', 'kind', 'label'])
  if (!record) return undefined
  if (
    !isOpaqueId(record.id) ||
    !['license', 'network-cost', 'storage-impact', 'gated-source'].includes(String(record.kind)) ||
    !isSafeText(record.label, 256)
  ) return undefined
  return {
    id: record.id,
    kind: record.kind as NormalizedAcknowledgement['kind'],
    label: record.label
  }
}

function readExactDataRecord(
  value: unknown,
  expectedKeys: readonly string[]
): Record<string, unknown> | undefined {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined
  const prototype = Object.getPrototypeOf(value)
  if (prototype !== Object.prototype && prototype !== null) return undefined
  const descriptors = Object.getOwnPropertyDescriptors(value)
  if (Reflect.ownKeys(descriptors).some((key) => typeof key === 'symbol')) return undefined
  const keys = Object.keys(descriptors).sort(compareText)
  const expected = [...expectedKeys].sort(compareText)
  if (
    keys.length !== expected.length ||
    !keys.every((key, index) =>
      key === expected[index] &&
      descriptors[key].enumerable === true &&
      'value' in descriptors[key]
    )
  ) return undefined
  return Object.fromEntries(keys.map((key) => [key, descriptors[key].value]))
}

function readExactDataArray(
  value: unknown,
  maximumLength: number
): unknown[] | undefined {
  if (!Array.isArray(value)) return undefined
  const descriptors = Object.getOwnPropertyDescriptors(value) as Record<
    string,
    PropertyDescriptor | undefined
  >
  const lengthDescriptor = descriptors['length']
  if (!lengthDescriptor || lengthDescriptor.get || lengthDescriptor.set) return undefined
  const length: unknown = lengthDescriptor.value
  if (
    typeof length !== 'number' ||
    !Number.isSafeInteger(length) ||
    length < 0 ||
    length > maximumLength
  ) return undefined
  const itemCount = length as number
  const ownKeys = Reflect.ownKeys(descriptors as object)
  if (
    ownKeys.length !== itemCount + 1 ||
    ownKeys.some((key) => typeof key === 'symbol')
  ) return undefined
  const items: unknown[] = []
  for (let index = 0; index < itemCount; index += 1) {
    const descriptor = descriptors[String(index)]
    if (!descriptor || descriptor.enumerable !== true || !('value' in descriptor)) return undefined
    items.push(descriptor.value)
  }
  return items
}

function isOpaqueId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-z0-9][a-z0-9._:@+-]{0,127}$/.test(value)
}

function isSafeText(value: unknown, maximumLength: number): value is string {
  return typeof value === 'string' &&
    value.length > 0 &&
    value.length <= maximumLength &&
    value.normalize('NFC') === value &&
    !/[\u0000-\u001f\u007f]/.test(value)
}

function isCanonicalIsoDate(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value
}

function decodeEd25519Signature(value: unknown): Buffer | undefined {
  if (
    typeof value !== 'string' ||
    !/^[A-Za-z0-9+/]{86}==$/.test(value)
  ) return undefined
  const decoded = Buffer.from(value, 'base64')
  if (decoded.length !== 64 || decoded.toString('base64') !== value) return undefined
  return decoded
}

function parsePinnedEd25519PublicKey(value: unknown): KeyObject {
  try {
    if (typeof value !== 'string' || value.length === 0 || value.length > 512) {
      throw new Error('invalid')
    }
    const decoded = Buffer.from(value, 'base64')
    if (decoded.length === 0 || decoded.toString('base64') !== value) {
      throw new Error('invalid')
    }
    const publicKey = createPublicKey({ key: decoded, format: 'der', type: 'spki' })
    if (publicKey.asymmetricKeyType !== 'ed25519') throw new Error('invalid')
    return publicKey
  } catch {
    throw new Error('MODEL_CATALOG_TRUST_ROOT_INVALID')
  }
}

function manifestDeclarationsAreDataOnly(
  artifacts: readonly NormalizedModelArtifactManifest[]
): boolean {
  return artifacts.every((artifact) => {
    const normalizedPaths = new Set<string>()
    let declaredBytes = 0
    let hasWeights = false
    let hasOnnxWeights = false
    let hasOnnxExternalData = false

    for (const file of artifact.files) {
      const allowedFormats = ALLOWED_ROLE_FORMATS.get(file.role)
      if (!allowedFormats?.has(file.format) || !isSafeRelativeArtifactPath(file.path)) {
        return false
      }
      if (!pathExtensionMatchesFormat(file.path, file.format)) return false

      const normalizedPath = file.path.toLowerCase()
      if (normalizedPaths.has(normalizedPath)) return false
      normalizedPaths.add(normalizedPath)

      if (file.sizeBytes > MAX_FILE_BYTES) return false
      declaredBytes += file.sizeBytes
      if (!Number.isSafeInteger(declaredBytes) || declaredBytes > MAX_ARTIFACT_BYTES) return false

      if (file.role === 'weights') {
        hasWeights = true
        if (file.format === 'onnx') hasOnnxWeights = true
      }
      if (file.role === 'onnx-external-data') hasOnnxExternalData = true
    }

    return hasWeights && (!hasOnnxExternalData || hasOnnxWeights)
  })
}

function isSafeRelativeArtifactPath(value: string): boolean {
  if (
    value.length > 512 ||
    value.startsWith('/') ||
    value.includes('\\') ||
    value.includes(':') ||
    value.normalize('NFC') !== value ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) return false

  const segments = value.split('/')
  return segments.length > 0 &&
    segments.length <= 16 &&
    segments.every((segment) =>
      /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(segment) &&
      segment !== '.' &&
      segment !== '..' &&
      !isWindowsReservedPathSegment(segment) &&
      !segment.endsWith('.') &&
      !segment.endsWith(' ')
    )
}

function isWindowsReservedPathSegment(segment: string): boolean {
  const basename = segment.split('.', 1)[0].toUpperCase()
  return /^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/.test(basename)
}

function pathExtensionMatchesFormat(path: string, format: string): boolean {
  const normalized = path.toLowerCase()
  const extensions: Record<string, readonly string[]> = {
    safetensors: ['.safetensors'],
    gguf: ['.gguf'],
    onnx: ['.onnx'],
    sentencepiece: ['.model', '.spm'],
    json: ['.json'],
    text: ['.txt', '.vocab', '.merges', '.jinja', '.tmpl'],
    binary: ['.data']
  }
  return extensions[format]?.some((extension) => normalized.endsWith(extension)) ?? false
}

function blocked(code: ModelCatalogAdmissionBlockCode): ModelCatalogAdmissionDecision {
  return Object.freeze({ kind: 'blocked', code, retry: 'not-retryable' })
}

function blockedVerification(
  code: Exclude<ModelCatalogAdmissionBlockCode, 'CATALOG_SEQUENCE_REJECTED'>
): ModelCatalogEnvelopeVerification {
  return Object.freeze({ kind: 'blocked', code })
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    const encoded = JSON.stringify(value)
    if (encoded === undefined) throw new Error('Unsupported canonical value.')
    return encoded
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(',')}]`
  }
  const record = value as Record<string, unknown>
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
    .join(',')}}`
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

function trustRootKey(catalogId: string, keyId: string): string {
  return `${catalogId}\u0000${keyId}`
}
