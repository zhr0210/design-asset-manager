import path from 'node:path'
import { fileURLToPath } from 'node:url'

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

const NODE_ELECTRON_EXECUTABLE_PATH_PARTS_BY_PLATFORM = {
  win32: [
    ['node_modules', 'electron', 'dist', 'electron.exe']
  ],
  darwin: [
    ['node_modules', 'electron', 'dist', 'Electron.app', 'Contents', 'MacOS', 'Electron']
  ],
  other: [
    ['node_modules', 'electron', 'dist', 'electron']
  ]
}

export function resolveNodeHostPlatformDefaults(platform) {
  const defaults = NODE_HOST_PLATFORM_DEFAULTS[platform]
    ?? NODE_HOST_PLATFORM_DEFAULTS.other
  return cloneNodeHostPlatformDefaults(defaults)
}

export function listNodeHostPlatformDefaults() {
  return Object.values(NODE_HOST_PLATFORM_DEFAULTS).map(cloneNodeHostPlatformDefaults)
}

export function resolveNodeElectronExecutableCandidates(platform, repoRoot) {
  const hostPlatform = resolveNodeHostPlatformDefaults(platform).platform
  const candidatePathParts = NODE_ELECTRON_EXECUTABLE_PATH_PARTS_BY_PLATFORM[hostPlatform]
    ?? NODE_ELECTRON_EXECUTABLE_PATH_PARTS_BY_PLATFORM.other
  return candidatePathParts.map((parts) => path.join(repoRoot, ...parts))
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

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const platformArg = process.argv.find((arg) => arg.startsWith('--platform='))
  const platform = platformArg?.replace('--platform=', '') ?? process.platform
  process.stdout.write(`${JSON.stringify(resolveNodeHostPlatformDefaults(platform))}\n`)
}
