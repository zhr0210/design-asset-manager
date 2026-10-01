export interface PinnedModelCatalogTrustRoot {
  readonly catalogId: string
  readonly keyId: string
  readonly publicKeySpkiBase64: string
}

export interface SignedModelCatalogEnvelope {
  readonly catalogId: string
  readonly keyId: string
  readonly payload: unknown
  readonly signatureBase64: string
}

declare const admittedModelCatalogBrand: unique symbol

export interface AdmittedModelCatalog {
  readonly catalogId: string
  readonly sequence: string
  readonly binding: string
  readonly [admittedModelCatalogBrand]: true
}

export type ModelCatalogAdmissionBlockCode =
  | 'CATALOG_ROOT_UNRECOGNIZED'
  | 'CATALOG_SIGNATURE_INVALID'
  | 'CATALOG_SEQUENCE_REJECTED'
  | 'CATALOG_SCHEMA_REJECTED'
  | 'MANIFEST_POLICY_REJECTED'

export type ModelCatalogAdmissionDecision =
  | {
      readonly kind: 'admitted'
      readonly catalog: AdmittedModelCatalog
    }
  | {
      readonly kind: 'waiting'
      readonly code: 'FRESH_TRUST_REQUIRED'
      readonly retry: 'refresh-trust'
    }
  | {
      readonly kind: 'blocked'
      readonly code: ModelCatalogAdmissionBlockCode
      readonly retry: 'not-retryable'
    }

export interface ModelCatalogAdmission {
  admit(envelope: SignedModelCatalogEnvelope): ModelCatalogAdmissionDecision
}

export interface CreateInMemoryModelCatalogAdmissionTracerInput {
  readonly trustRoots: readonly PinnedModelCatalogTrustRoot[]
  readonly nowEpochMs: () => number
}

export { createInMemoryModelCatalogAdmissionTracer } from './model-catalog-admission.internal'
