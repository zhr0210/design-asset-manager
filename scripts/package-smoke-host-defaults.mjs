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

function combinePackageSmokeHostDefaults(nodeDefaults) {
  const packageDefaults = PACKAGE_SMOKE_HOST_DEFAULTS_BY_PLATFORM[nodeDefaults.platform]
  return {
    ...packageDefaults,
    npmCommand: nodeDefaults.npmCommand,
    pathExecutableExtensions: [...nodeDefaults.pathExecutableExtensions]
  }
}
