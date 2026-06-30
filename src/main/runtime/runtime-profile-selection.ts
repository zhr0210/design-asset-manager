import type { PlatformArch, PlatformName } from '../../shared/types/platform.types'
import type { RuntimeProfile } from './runtime-profile.types'

export interface RuntimeProfileTarget {
  platform: PlatformName
  arch: PlatformArch
}

export interface RuntimeProfileSelectionRule {
  platform?: PlatformName
  arch?: PlatformArch
}

export function runtimeProfileSupportsTarget(
  profile: Pick<RuntimeProfile, 'platform' | 'arch'>,
  target: RuntimeProfileTarget
): boolean {
  const targetMatches = runtimeProfilePartMatches(profile.platform, 'all')
    || runtimeProfilePartMatches(profile.platform, target.platform)
  return targetMatches && runtimeProfileArchSupportsTarget(profile.arch, target.arch)
}

export function runtimeProfileRuleMatchesTarget(
  rule: RuntimeProfileSelectionRule,
  target: RuntimeProfileTarget
): boolean {
  return runtimeProfileOptionalPartMatches(rule.platform, target.platform)
    && runtimeProfileOptionalPartMatches(rule.arch, target.arch)
}

function runtimeProfileArchSupportsTarget(
  actual: RuntimeProfile['arch'],
  expected: PlatformArch
): boolean {
  return runtimeProfilePartMatches(actual, 'all')
    || runtimeProfilePartMatches(actual, expected)
    || runtimeProfilePartMatches(actual, 'unknown')
}

function runtimeProfileOptionalPartMatches(
  actual: string | undefined,
  expected: string
): boolean {
  return actual === undefined || runtimeProfilePartMatches(actual, expected)
}

function runtimeProfilePartMatches(actual: string, expected: string): boolean {
  return String(actual) === String(expected)
}
