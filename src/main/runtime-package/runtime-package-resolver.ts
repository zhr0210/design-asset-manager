import type { RuntimePackageEntry, RuntimePackageManifest, RuntimePackageSelection, RuntimePackageSelectionInput } from './runtime-package.types'
import { validatePackageCompatibility } from './runtime-package-manifest.validator'

function isSelectable(entry: RuntimePackageEntry, input: RuntimePackageSelectionInput): boolean {
  if (entry.status === 'disabled') return false
  if (entry.status === 'deprecated' && !input.includeDeprecated) return false
  if (entry.status === 'experimental' && !input.includeExperimental) return false
  return validatePackageCompatibility(entry, input)
}

function matchingPackages(manifest: RuntimePackageManifest, input: RuntimePackageSelectionInput): RuntimePackageEntry[] {
  return manifest.packages.filter((entry) => isSelectable(entry, input))
}

export function selectPackagesForRuntimeProfile(manifest: RuntimePackageManifest, input: RuntimePackageSelectionInput): RuntimePackageSelection {
  const selected = matchingPackages(manifest, input)
  const selectedIds = new Set(selected.map((entry) => entry.id))
  const warnings: string[] = []
  const blockingIssues: string[] = []

  for (const entry of selected) {
    for (const dependencyId of entry.dependencies) {
      if (!selectedIds.has(dependencyId)) {
        const dependency = manifest.packages.find((candidate) => candidate.id === dependencyId)
        if (dependency && isSelectable(dependency, input)) {
          selected.push(dependency)
          selectedIds.add(dependency.id)
        } else {
          blockingIssues.push(`${entry.id} requires missing dependency ${dependencyId}.`)
        }
      }
    }

    for (const conflictId of entry.conflicts) {
      if (selectedIds.has(conflictId)) {
        warnings.push(`${entry.id} conflicts with ${conflictId}.`)
      }
    }
  }

  return {
    profileId: input.profileId,
    platform: input.platform,
    arch: input.arch,
    requiredPackages: selected.filter((entry) => entry.requirement === 'required'),
    recommendedPackages: selected.filter((entry) => entry.requirement === 'recommended'),
    optionalPackages: selected.filter((entry) => entry.requirement === 'optional'),
    warnings,
    blockingIssues
  }
}

export function getRequiredPackagesForProfile(manifest: RuntimePackageManifest, profileId: RuntimePackageSelectionInput['profileId']): RuntimePackageEntry[] {
  return manifest.packages.filter((entry) => entry.profiles.includes(profileId) && entry.requirement === 'required' && entry.status !== 'disabled')
}

export function getRecommendedPackagesForProfile(manifest: RuntimePackageManifest, profileId: RuntimePackageSelectionInput['profileId']): RuntimePackageEntry[] {
  return manifest.packages.filter((entry) => entry.profiles.includes(profileId) && entry.requirement === 'recommended' && entry.status !== 'disabled')
}

export function getOptionalPackagesForProfile(manifest: RuntimePackageManifest, profileId: RuntimePackageSelectionInput['profileId']): RuntimePackageEntry[] {
  return manifest.packages.filter((entry) => entry.profiles.includes(profileId) && entry.requirement === 'optional' && entry.status !== 'disabled')
}

export function explainPackageSelection(manifest: RuntimePackageManifest, input: RuntimePackageSelectionInput): string {
  const selection = selectPackagesForRuntimeProfile(manifest, input)
  return `${selection.requiredPackages.length} required, ${selection.recommendedPackages.length} recommended, ${selection.optionalPackages.length} optional packages selected for ${input.profileId}.`
}
