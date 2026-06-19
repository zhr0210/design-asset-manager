const PACKAGE_SMOKE_HOST_DEFAULTS_BY_PLATFORM = {
  win32: {
    platform: 'win32',
    npmCommand: 'npm.cmd',
    unpackedCheckId: 'winUnpackedExe',
    pathExecutableExtensions: ['.exe', '.cmd', '.bat', ''],
    authenticodeAvailable: true
  },
  darwin: {
    platform: 'darwin',
    npmCommand: 'npm',
    unpackedCheckId: 'macUnpackedApp',
    pathExecutableExtensions: [''],
    authenticodeAvailable: false
  },
  other: {
    platform: 'other',
    npmCommand: 'npm',
    unpackedCheckId: 'macUnpackedApp',
    pathExecutableExtensions: [''],
    authenticodeAvailable: false
  }
}

export function resolvePackageSmokeHostDefaults(platform) {
  const defaults = PACKAGE_SMOKE_HOST_DEFAULTS_BY_PLATFORM[platform]
    ?? PACKAGE_SMOKE_HOST_DEFAULTS_BY_PLATFORM.other

  return {
    ...defaults,
    pathExecutableExtensions: [...defaults.pathExecutableExtensions]
  }
}

export function listPackageSmokeHostDefaults() {
  return Object.values(PACKAGE_SMOKE_HOST_DEFAULTS_BY_PLATFORM).map((defaults) => ({
    ...defaults,
    pathExecutableExtensions: [...defaults.pathExecutableExtensions]
  }))
}
