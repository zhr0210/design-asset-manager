const RELEASE_SCRIPT_PLATFORM_TARGETS = [
  {
    platform: 'windows',
    primaryArtifactExtension: '.exe',
    artifactExtensions: ['.exe', '.blockmap'],
    brandingIconFileName: 'icon.ico',
    brandingIconFormat: 'ico',
    brandingEvidenceIconCheckId: 'windows_icon'
  },
  {
    platform: 'macos',
    primaryArtifactExtension: '.dmg',
    artifactExtensions: ['.dmg', '.blockmap'],
    brandingIconFileName: 'icon.icns',
    brandingIconFormat: 'icns',
    brandingEvidenceIconCheckId: 'macos_icon'
  }
]

export const RELEASE_SCRIPT_PLATFORMS = RELEASE_SCRIPT_PLATFORM_TARGETS.map((target) => target.platform)
export const RELEASE_SCRIPT_ARCHES = ['x64', 'arm64']

export function resolveReleaseScriptPlatformTarget(platform) {
  const resolvedPlatform = requireReleaseScriptPlatform(platform)
  const target = RELEASE_SCRIPT_PLATFORM_TARGETS.find((item) => item.platform === resolvedPlatform)
  if (!target) throw new Error(`Unsupported release script platform: ${resolvedPlatform}`)
  return {
    ...target,
    artifactExtensions: [...target.artifactExtensions]
  }
}

export function listReleaseScriptPlatformTargets() {
  return RELEASE_SCRIPT_PLATFORM_TARGETS.map((target) => ({
    ...target,
    artifactExtensions: [...target.artifactExtensions]
  }))
}

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
