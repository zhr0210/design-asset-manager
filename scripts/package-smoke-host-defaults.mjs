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

  if (hostDefaults.platform === 'win32') {
    return clonePackageSmokeArtifactPlan({
      platform: hostDefaults.platform,
      arch,
      installerPath: path.join(input.distDir, `${input.productName} Setup ${input.version}.exe`),
      unpackedArtifactPath: path.join(input.distDir, windowsUnpackedDir, `${input.productName}.exe`),
      unpackedBinaryCandidates: [
        path.join(input.distDir, windowsUnpackedDir, `${input.productName}.exe`),
        path.join(input.distDir, windowsUnpackedFallbackDir, `${input.productName}.exe`)
      ],
      scanDmgFiles: false,
      scanMacUnpackedDirs: false,
      sandboxUnpackedDir: windowsUnpackedDir,
      sandboxUnpackedExecutablePath: path.join(input.distDir, windowsUnpackedDir, `${input.productName}.exe`)
    })
  }

  return clonePackageSmokeArtifactPlan({
    platform: hostDefaults.platform,
    arch,
    installerPath: path.join(input.distDir, `${input.productName}-${input.version}-${arch}.dmg`),
    unpackedArtifactPath: path.join(input.distDir, `mac-${arch}`, `${input.productName}.app`),
    unpackedBinaryCandidates: [
      path.join(input.distDir, 'mac', `${input.productName}.app`, 'Contents', 'MacOS', input.productName),
      path.join(input.distDir, 'mac-arm64', `${input.productName}.app`, 'Contents', 'MacOS', input.productName)
    ],
    scanDmgFiles: true,
    scanMacUnpackedDirs: true,
    macUnpackedDirectoryPrefix: 'mac',
    sandboxUnpackedDir: windowsUnpackedDir,
    sandboxUnpackedExecutablePath: path.join(input.distDir, windowsUnpackedDir, `${input.productName}.exe`)
  })
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
