/** Known Managed profiles only. Feature presence never grants write authority. */
export const CURRENT_MANAGED_SCHEMA_VERSION = 13
export function isKnownLibrarySchemaVersion(version: unknown, minimum = 1): version is number {
  return typeof version === 'number' && Number.isInteger(version) && version >= minimum && version <= CURRENT_MANAGED_SCHEMA_VERSION
}
