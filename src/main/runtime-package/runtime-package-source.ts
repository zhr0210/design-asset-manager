import path from 'path'
import type { RuntimePackageSource, RuntimePackageSourceResolution } from './runtime-package.types'

export function createLocalRuntimePackageSource(id: string, directoryPath: string): RuntimePackageSource {
  return {
    id,
    type: 'local',
    label: 'Local runtime package source',
    uri: path.resolve(directoryPath),
    access: 'filesystem',
    enabled: true,
    trusted: false,
    networkAccess: 'never',
    warnings: ['Local sources are metadata-only until downloader and verifier phases are complete.'],
    metadata: {}
  }
}

export function createBundledRuntimePackageSource(id: string, resourcePath: string): RuntimePackageSource {
  return {
    id,
    type: 'bundled',
    label: 'Bundled runtime package source',
    uri: resourcePath,
    access: 'app-resource',
    enabled: true,
    trusted: true,
    networkAccess: 'never',
    warnings: ['Bundled sources are resolved as app resources and are not downloaded.'],
    metadata: {}
  }
}

export function createReservedRemoteRuntimePackageSource(id: string, url: string): RuntimePackageSource {
  return {
    id,
    type: 'remote',
    label: 'Reserved remote runtime package source',
    uri: url,
    access: 'reserved-remote',
    enabled: false,
    trusted: false,
    networkAccess: 'reserved',
    warnings: ['Remote runtime package sources are reserved metadata only; network access is disabled in Phase 10A.'],
    metadata: {}
  }
}

export function resolveRuntimePackageSources(sources: RuntimePackageSource[]): RuntimePackageSourceResolution {
  const warnings: string[] = []
  const blockingIssues: string[] = []
  const activeSources: RuntimePackageSource[] = []
  const reservedRemoteSources: RuntimePackageSource[] = []

  for (const source of sources) {
    if (!source.id.trim()) blockingIssues.push('Runtime package source id is required.')
    if (source.type === 'remote') {
      reservedRemoteSources.push(source)
      if (source.enabled) blockingIssues.push(`${source.id} is remote and must remain disabled in Phase 10A.`)
      if (source.networkAccess !== 'reserved') blockingIssues.push(`${source.id} must use reserved network access.`)
      continue
    }

    if (source.networkAccess !== 'never') blockingIssues.push(`${source.id} must not request network access.`)
    if (source.enabled) activeSources.push(source)
    warnings.push(...source.warnings)
  }

  return {
    sources,
    activeSources,
    reservedRemoteSources,
    warnings,
    blockingIssues
  }
}
