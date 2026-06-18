import {
  listReleasePlatformTargets,
  RELEASE_PACKAGING_ARCHES,
  type ReleasePackagingArch,
  type ReleasePlatform
} from './release-flow-governance'

export interface ReleaseTargetSelection {
  platform: ReleasePlatform
  arch: ReleasePackagingArch
}

export function releasePlatformChoices(): ReleasePlatform[] {
  return listReleasePlatformTargets().map((target) => target.platform)
}

export function releaseArchChoices(): ReleasePackagingArch[] {
  return [...RELEASE_PACKAGING_ARCHES]
}

export function requireReleasePlatform(
  value: string | undefined,
  flag = '--platform'
): ReleasePlatform {
  return requireChoice(value, releasePlatformChoices(), flag)
}

export function requireReleasePackagingArch(
  value: string | undefined,
  flag = '--arch'
): ReleasePackagingArch {
  return requireChoice(value, releaseArchChoices(), flag)
}

export function parseReleaseTargetSelection(
  values: { platform?: string, arch?: string },
  flags: { platform?: string, arch?: string } = {}
): ReleaseTargetSelection {
  return {
    platform: requireReleasePlatform(values.platform, flags.platform ?? '--platform'),
    arch: requireReleasePackagingArch(values.arch, flags.arch ?? '--arch')
  }
}

export function releaseTargetSuffix(target: ReleaseTargetSelection): string {
  return `${target.platform}-${target.arch}`
}

export function releaseEvidenceFileName(
  prefix: string,
  target: ReleaseTargetSelection
): string {
  return `${prefix}-${releaseTargetSuffix(target)}.json`
}

export function createDefaultReleaseEvidenceBundleRequirements(): ReleaseTargetSelection[] {
  return listReleasePlatformTargets().map((target) => ({
    platform: target.platform,
    arch: target.defaultEvidenceBundleArch
  }))
}

export function formatReleaseEvidenceBundleRequirements(
  requirements: ReleaseTargetSelection[]
): string {
  return requirements.map((target) => `${target.platform}:${target.arch}`).join(',')
}

export function parseReleaseEvidenceBundleRequirements(value: string): ReleaseTargetSelection[] {
  const requirements = value.split(',').filter(Boolean).map((entry) => {
    const [platform, arch] = entry.split(':')
    return parseReleaseTargetSelection(
      { platform, arch },
      { platform: '--required platform', arch: '--required arch' }
    )
  })

  if (requirements.length === 0) {
    throw new Error('--required must include at least one platform:arch entry.')
  }

  return requirements
}

function requireChoice<T extends string>(
  value: string | undefined,
  choices: readonly T[],
  flag: string
): T {
  if (!choices.includes(value as T)) {
    throw new Error(`${flag} must be one of: ${choices.join(', ')}`)
  }
  return value as T
}
