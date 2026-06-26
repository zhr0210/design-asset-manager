import path from 'node:path'
import {
  listNodeHostPlatformDefaults,
  resolveNodeHostPlatformDefaults
} from './node-host-platform-defaults.mjs'

const PACKAGE_SMOKE_HOST_DEFAULTS_BY_PLATFORM = {
  win32: {
    platform: 'win32',
    unpackedCheckId: 'winUnpackedExe',
    authenticodeAvailable: true
  },
  darwin: {
    platform: 'darwin',
    unpackedCheckId: 'macUnpackedApp',
    authenticodeAvailable: false
  },
  other: {
    platform: 'other',
    unpackedCheckId: 'macUnpackedApp',
    authenticodeAvailable: false
  }
}

const PACKAGE_SMOKE_ARTIFACT_PLAN_BUILDERS_BY_PLATFORM = {
  win32: createWindowsPackageSmokeArtifactPlan,
  darwin: createMacPackageSmokeArtifactPlan,
  other: createMacPackageSmokeArtifactPlan
}

export function resolvePackageSmokeHostDefaults(platform) {
  return combinePackageSmokeHostDefaults(resolveNodeHostPlatformDefaults(platform))
}

export function listPackageSmokeHostDefaults() {
  return listNodeHostPlatformDefaults().map(combinePackageSmokeHostDefaults)
}

export function resolvePackageSmokeArtifactPlan(platform, input) {
  const hostDefaults = resolvePackageSmokeHostDefaults(platform)
  const arch = requirePackageSmokeArch(input.arch)
  const windowsUnpackedDir = arch === 'arm64' ? 'win-arm64-unpacked' : 'win-unpacked'
  const windowsUnpackedFallbackDir = arch === 'arm64' ? 'win-unpacked' : 'win-x64-unpacked'
  const artifactPlanBuilder = PACKAGE_SMOKE_ARTIFACT_PLAN_BUILDERS_BY_PLATFORM[hostDefaults.platform]

  return clonePackageSmokeArtifactPlan(artifactPlanBuilder({
    hostDefaults,
    input,
    arch,
    windowsUnpackedDir,
    windowsUnpackedFallbackDir
  }))
}

function createWindowsPackageSmokeArtifactPlan(context) {
  return {
    platform: context.hostDefaults.platform,
    arch: context.arch,
    installerPath: path.join(context.input.distDir, `${context.input.productName} Setup ${context.input.version}.exe`),
    unpackedArtifactPath: path.join(context.input.distDir, context.windowsUnpackedDir, `${context.input.productName}.exe`),
    unpackedBinaryCandidates: [
      path.join(context.input.distDir, context.windowsUnpackedDir, `${context.input.productName}.exe`),
      path.join(context.input.distDir, context.windowsUnpackedFallbackDir, `${context.input.productName}.exe`)
    ],
    scanDmgFiles: false,
    scanMacUnpackedDirs: false,
    sandboxUnpackedDir: context.windowsUnpackedDir,
    sandboxUnpackedExecutablePath: path.join(context.input.distDir, context.windowsUnpackedDir, `${context.input.productName}.exe`)
  }
}

function createMacPackageSmokeArtifactPlan(context) {
  return {
    platform: context.hostDefaults.platform,
    arch: context.arch,
    installerPath: path.join(context.input.distDir, `${context.input.productName}-${context.input.version}-${context.arch}.dmg`),
    unpackedArtifactPath: path.join(context.input.distDir, `mac-${context.arch}`, `${context.input.productName}.app`),
    unpackedBinaryCandidates: [
      path.join(context.input.distDir, 'mac', `${context.input.productName}.app`, 'Contents', 'MacOS', context.input.productName),
      path.join(context.input.distDir, 'mac-arm64', `${context.input.productName}.app`, 'Contents', 'MacOS', context.input.productName)
    ],
    scanDmgFiles: true,
    scanMacUnpackedDirs: true,
    macUnpackedDirectoryPrefix: 'mac',
    sandboxUnpackedDir: context.windowsUnpackedDir,
    sandboxUnpackedExecutablePath: path.join(context.input.distDir, context.windowsUnpackedDir, `${context.input.productName}.exe`)
  }
}

function combinePackageSmokeHostDefaults(nodeDefaults) {
  const packageDefaults = PACKAGE_SMOKE_HOST_DEFAULTS_BY_PLATFORM[nodeDefaults.platform]
  return {
    ...packageDefaults,
    npmCommand: nodeDefaults.npmCommand,
    pathExecutableExtensions: [...nodeDefaults.pathExecutableExtensions]
  }
}

function requirePackageSmokeArch(value) {
  if (!['x64', 'arm64'].includes(value)) {
    throw new Error('--arch must be x64 or arm64.')
  }
  return value
}

function clonePackageSmokeArtifactPlan(plan) {
  return {
    ...plan,
    unpackedBinaryCandidates: [...plan.unpackedBinaryCandidates]
  }
}
