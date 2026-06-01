import type { RuntimeRegistry } from './runtime-registry.types'

const RUNTIME_REGISTRY_SCHEMA_VERSION = 1

export function getRegistrySchemaVersion(): number {
  return RUNTIME_REGISTRY_SCHEMA_VERSION
}

export function isRuntimeRegistryCorrupted(input: unknown): boolean {
  return !validateRuntimeRegistry(input).valid
}

export function validateRuntimeRegistry(input: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  const value = input as Partial<RuntimeRegistry> | null

  if (!value || typeof value !== 'object') {
    return { valid: false, errors: ['Registry must be an object.'] }
  }

  if (value.schemaVersion !== RUNTIME_REGISTRY_SCHEMA_VERSION) errors.push('Unsupported schemaVersion.')
  if (typeof value.initialized !== 'boolean') errors.push('initialized must be boolean.')
  if (typeof value.platform !== 'string') errors.push('platform must be string.')
  if (typeof value.arch !== 'string') errors.push('arch must be string.')
  if (typeof value.profile !== 'string') errors.push('profile must be string.')
  if (typeof value.createdAt !== 'string') errors.push('createdAt must be string.')
  if (typeof value.updatedAt !== 'string') errors.push('updatedAt must be string.')
  if (!value.paths || typeof value.paths !== 'object') errors.push('paths must be object.')
  if (!Array.isArray(value.packages)) errors.push('packages must be array.')
  if (!Array.isArray(value.models)) errors.push('models must be array.')
  if (!Array.isArray(value.warnings)) errors.push('warnings must be array.')
  if (!value.metadata || typeof value.metadata !== 'object' || Array.isArray(value.metadata)) errors.push('metadata must be object.')

  return { valid: errors.length === 0, errors }
}

export function normalizeRuntimeRegistry(input: unknown, fallback: RuntimeRegistry): RuntimeRegistry {
  const value = input as Partial<RuntimeRegistry> | null
  if (!value || typeof value !== 'object') return fallback

  return {
    ...fallback,
    ...value,
    schemaVersion: RUNTIME_REGISTRY_SCHEMA_VERSION,
    initialized: Boolean(value.initialized),
    initializedAt: value.initializedAt ?? null,
    lastDoctorRunAt: value.lastDoctorRunAt ?? null,
    lastDoctorStatus: value.lastDoctorStatus ?? null,
    selectedProfileId: value.selectedProfileId ?? null,
    recommendedProfileId: value.recommendedProfileId ?? null,
    paths: {
      ...fallback.paths,
      ...(typeof value.paths === 'object' && value.paths ? value.paths : {})
    },
    packages: Array.isArray(value.packages) ? value.packages : [],
    models: Array.isArray(value.models) ? value.models : [],
    warnings: Array.isArray(value.warnings) ? value.warnings : [],
    metadata: typeof value.metadata === 'object' && value.metadata && !Array.isArray(value.metadata) ? value.metadata : {}
  }
}
