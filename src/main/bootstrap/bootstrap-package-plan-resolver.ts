import type { PlatformArch, PlatformName } from '../../shared/types/platform.types'
import type { RuntimeCapability, RuntimeProfileRecommendation } from '../../shared/types/runtime-profile.types'
import type { RuntimePackageManifest } from '../../shared/types/runtime-package.types'
import type { BootstrapPackagePlan } from './bootstrap.types'
import { selectPackagesForRuntimeProfile } from '../runtime-package/runtime-package-resolver'

export interface BootstrapPackagePlanInput {
  manifest: RuntimePackageManifest
  recommendation: RuntimeProfileRecommendation
  platform: PlatformName
  arch: PlatformArch
  capabilities: RuntimeCapability[]
  includeExperimental?: boolean
  includeDeprecated?: boolean
}

export function resolveBootstrapPackagePlan(input: BootstrapPackagePlanInput): BootstrapPackagePlan {
  const selection = selectPackagesForRuntimeProfile(input.manifest, {
    profileId: input.recommendation.recommendedProfileId,
    platform: input.platform,
    arch: input.arch,
    capabilities: input.capabilities,
    includeExperimental: input.includeExperimental,
    includeDeprecated: input.includeDeprecated
  })

  return {
    profileId: selection.profileId,
    requiredPackages: selection.requiredPackages,
    recommendedPackages: selection.recommendedPackages,
    optionalPackages: selection.optionalPackages,
    warnings: selection.warnings,
    blockingIssues: selection.blockingIssues,
    manifestVersion: input.manifest.manifestVersion,
    generatedAt: input.manifest.generatedAt
  }
}

export function explainBootstrapPackagePlan(input: BootstrapPackagePlanInput): string {
  const plan = resolveBootstrapPackagePlan(input)
  return `${plan.requiredPackages.length} required, ${plan.recommendedPackages.length} recommended, ${plan.optionalPackages.length} optional package metadata entries for ${plan.profileId}.`
}
