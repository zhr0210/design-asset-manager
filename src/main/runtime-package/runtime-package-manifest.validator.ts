import type { PlatformArch, PlatformName } from '../../shared/types/platform.types'
import type { RuntimePackageEntry, RuntimePackageManifest } from './runtime-package.types'

const SCHEMA_VERSION = 1
const SHA256_PATTERN = /^[a-f0-9]{64}$/i
const VERSION_PATTERN = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/

export function getRuntimePackageManifestSchemaVersion(): number {
  return SCHEMA_VERSION
}

export function validateSha256Format(value: string): boolean {
  return value === '' || SHA256_PATTERN.test(value)
}

export function validatePackageVersion(value: string): boolean {
  return VERSION_PATTERN.test(value)
}

export function validateRuntimePackageEntry(entry: RuntimePackageEntry): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  if (!entry || typeof entry !== 'object') return { valid: false, errors: ['Package entry must be an object.'] }
  if (!entry.id) errors.push('id is required.')
  if (!entry.name) errors.push('name is required.')
  if (!validatePackageVersion(entry.version)) errors.push('version must be semver-like.')
  if (!validateSha256Format(entry.sha256)) errors.push('sha256 must be empty or 64 hex characters.')
  if (!Array.isArray(entry.platforms) || entry.platforms.length === 0) errors.push('platforms must be a non-empty array.')
  if (!Array.isArray(entry.arch) || entry.arch.length === 0) errors.push('arch must be a non-empty array.')
  if (!Array.isArray(entry.profiles) || entry.profiles.length === 0) errors.push('profiles must be a non-empty array.')
  if (!Array.isArray(entry.dependencies)) errors.push('dependencies must be an array.')
  if (!Array.isArray(entry.conflicts)) errors.push('conflicts must be an array.')
  if (!Array.isArray(entry.provides)) errors.push('provides must be an array.')
  if (!Array.isArray(entry.warnings)) errors.push('warnings must be an array.')
  if (typeof entry.sizeBytes !== 'number' || entry.sizeBytes < 0) errors.push('sizeBytes must be a non-negative number.')
  return { valid: errors.length === 0, errors }
}

export function validateRuntimePackageManifest(manifest: RuntimePackageManifest): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  if (!manifest || typeof manifest !== 'object') return { valid: false, errors: ['Manifest must be an object.'] }
  if (manifest.schemaVersion !== SCHEMA_VERSION) errors.push('Unsupported schemaVersion.')
  if (!validatePackageVersion(manifest.manifestVersion)) errors.push('manifestVersion must be semver-like.')
  if (!Array.isArray(manifest.packages)) errors.push('packages must be an array.')
  if (!Array.isArray(manifest.profiles)) errors.push('profiles must be an array.')

  for (const entry of manifest.packages ?? []) {
    const result = validateRuntimePackageEntry(entry)
    if (!result.valid) errors.push(`${entry?.id ?? 'unknown'}: ${result.errors.join('; ')}`)
  }

  return { valid: errors.length === 0, errors }
}

export function validatePackageCompatibility(
  entry: RuntimePackageEntry,
  target: { platform: PlatformName; arch: PlatformArch; profileId: string }
): boolean {
  const platformMatches = entry.platforms.includes('all') || entry.platforms.includes(target.platform)
  const archMatches = entry.arch.includes('all') || entry.arch.includes(target.arch)
  const profileMatches = entry.profiles.includes(target.profileId as never)
  return platformMatches && archMatches && profileMatches
}
