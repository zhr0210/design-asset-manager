const NODE_HOST_PLATFORM_DEFAULTS = {
  win32: {
    platform: 'win32',
    npmCommand: 'npm.cmd',
    pathExecutableExtensions: ['.exe', '.cmd', '.bat', ''],
    pythonUnitTestCandidates: [
      { command: 'py', args: ['-3'] },
      { command: 'python', args: [] },
      { command: 'python3', args: [] }
    ]
  },
  darwin: {
    platform: 'darwin',
    npmCommand: 'npm',
    pathExecutableExtensions: [''],
    pythonUnitTestCandidates: [
      { command: 'python3', args: [] },
      { command: 'python', args: [] }
    ]
  },
  other: {
    platform: 'other',
    npmCommand: 'npm',
    pathExecutableExtensions: [''],
    pythonUnitTestCandidates: [
      { command: 'python3', args: [] },
      { command: 'python', args: [] }
    ]
  }
}

export function resolveNodeHostPlatformDefaults(platform) {
  const defaults = NODE_HOST_PLATFORM_DEFAULTS[platform]
    ?? NODE_HOST_PLATFORM_DEFAULTS.other
  return cloneNodeHostPlatformDefaults(defaults)
}

export function listNodeHostPlatformDefaults() {
  return Object.values(NODE_HOST_PLATFORM_DEFAULTS).map(cloneNodeHostPlatformDefaults)
}

function cloneNodeHostPlatformDefaults(defaults) {
  return {
    ...defaults,
    pathExecutableExtensions: [...defaults.pathExecutableExtensions],
    pythonUnitTestCandidates: defaults.pythonUnitTestCandidates.map((candidate) => ({
      ...candidate,
      args: [...candidate.args]
    }))
  }
}
