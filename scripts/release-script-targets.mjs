export const RELEASE_SCRIPT_PLATFORMS = ['windows', 'macos']
export const RELEASE_SCRIPT_ARCHES = ['x64', 'arm64']

export function requireReleaseScriptPlatform(value, flag = '--platform') {
  return requireChoice(value, RELEASE_SCRIPT_PLATFORMS, flag)
}

export function requireReleaseScriptArch(value, flag = '--arch') {
  return requireChoice(value, RELEASE_SCRIPT_ARCHES, flag)
}

export function parseReleaseScriptTarget(options) {
  return {
    platform: requireReleaseScriptPlatform(options.platform),
    arch: requireReleaseScriptArch(options.arch)
  }
}

export function releaseScriptTargetSuffix(target) {
  return `${target.platform}-${target.arch}`
}

export function releaseScriptEvidenceFileName(prefix, target) {
  return `${prefix}-${releaseScriptTargetSuffix(target)}.json`
}

export function requireChoice(value, choices, flag) {
  if (!choices.includes(value)) {
    throw new Error(`${flag} must be one of: ${choices.join(', ')}`)
  }
  return value
}
