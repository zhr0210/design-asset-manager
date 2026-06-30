import path from 'node:path'
import { platformAdapterMatchesCurrentPlatform } from '../platform/platform-adapter-selection'

export interface ManagedAiPythonRuntime {
  runtimeDir: string
  venvDir: string
  pythonPath: string
  exists: boolean
}

export interface AiPythonEnvironmentHost {
  platform: NodeJS.Platform | string
  runtimeRoot: string
  environment: Record<string, string | undefined>
}

export interface AiPythonEnvironmentIo {
  exists: (candidate: string) => boolean
  readDirectory: (directory: string) => string[]
  findPythonOnPath: () => string
  canImport: (pythonExecutable: string, moduleName: string) => boolean
  log?: (message: string) => void
}

interface AiPythonEnvironmentPlatformAdapter {
  platform?: NodeJS.Platform | string
  pathApi: typeof path.posix
  managedPythonPathParts: string[]
  basePythonSearchRoots?: (host: AiPythonEnvironmentHost, pathApi: typeof path.posix) => string[]
  resolveBasePythonExecutable: (input: BasePythonResolverInput) => string | null
}

interface BasePythonResolverInput {
  host: AiPythonEnvironmentHost
  io: AiPythonEnvironmentIo
  pathApi: typeof path.posix
  searchBasePythonInstallRoots: () => string | null
  log: (message: string) => void
  errorMessage: (error: unknown) => string
  defaultPythonExecutable: () => string
}

const AI_PYTHON_ENVIRONMENT_PLATFORM_ADAPTERS: AiPythonEnvironmentPlatformAdapter[] = [
  {
    platform: 'win32',
    pathApi: path.win32,
    managedPythonPathParts: ['Scripts', 'python.exe'],
    basePythonSearchRoots: (host, pathApi) => {
      const userProfile = host.environment.USERPROFILE || host.environment.HOMEPATH || ''
      const roots = userProfile
        ? [pathApi.join(userProfile, 'AppData', 'Local', 'Programs', 'Python')]
        : []
      roots.push('C:\\Program Files\\Python', 'C:\\')
      return roots
    },
    resolveBasePythonExecutable: resolveWindowsBasePythonExecutable
  },
  {
    platform: 'darwin',
    pathApi: path.posix,
    managedPythonPathParts: ['bin', 'python'],
    resolveBasePythonExecutable: resolveMacOSHomebrewPythonExecutable
  },
  {
    pathApi: path.posix,
    managedPythonPathParts: ['bin', 'python'],
    resolveBasePythonExecutable: ({ defaultPythonExecutable }) => defaultPythonExecutable()
  }
]

// Keep the legacy directory name so existing managed environments remain usable.
const MANAGED_AI_PYTHON_DIRECTORY = 'macos-ai-python'

export class AiPythonEnvironment {
  private readonly platformAdapter: AiPythonEnvironmentPlatformAdapter

  constructor(
    private readonly host: AiPythonEnvironmentHost,
    private readonly io: AiPythonEnvironmentIo
  ) {
    this.platformAdapter = resolveAiPythonEnvironmentPlatformAdapter(host.platform)
  }

  resolveManagedRuntime(): ManagedAiPythonRuntime {
    const runtimeDir = this.pathApi.join(this.host.runtimeRoot, MANAGED_AI_PYTHON_DIRECTORY)
    const venvDir = this.pathApi.join(runtimeDir, '.venv')
    const pythonPath = this.resolveManagedPythonPath(venvDir)
    return {
      runtimeDir,
      venvDir,
      pythonPath,
      exists: this.io.exists(pythonPath)
    }
  }

  resolveBasePythonExecutable(): string {
    this.log('[resolvePythonExecutable] Resolving Python executable...')
    const environmentCandidates = [
      this.host.environment.DESIGN_ASSET_MANAGER_PYTHON,
      this.host.environment.TEXT_OCR_PYTHON,
      this.host.environment.PYTHON
    ]
    for (const [index, candidate] of environmentCandidates.entries()) {
      if (candidate?.trim()) {
        this.log(`[resolvePythonExecutable] Found env key index ${index}: ${candidate}`)
        return candidate.trim()
      }
    }

    const resolved = this.platformAdapter.resolveBasePythonExecutable({
      host: this.host,
      io: this.io,
      pathApi: this.pathApi,
      searchBasePythonInstallRoots: () => this.searchBasePythonInstallRoots(),
      log: (message) => this.log(message),
      errorMessage: (error) => this.errorMessage(error),
      defaultPythonExecutable: () => this.resolveDefaultBasePythonExecutable()
    })
    return resolved ?? this.resolveDefaultBasePythonExecutable()
  }

  resolvePythonExecutable(): string {
    const explicit = this.host.environment.DESIGN_ASSET_MANAGER_PYTHON
    if (explicit?.trim()) return explicit.trim()

    const managedRuntime = this.resolveManagedRuntime()
    if (!managedRuntime.exists) return this.resolveBasePythonExecutable()

    if (this.io.canImport(managedRuntime.pythonPath, 'torch')) {
      this.log('[resolvePythonExecutable] Using managed AI Python runtime.')
      return managedRuntime.pythonPath
    }

    this.log('[resolvePythonExecutable] Managed venv missing torch, trying fallback...')
    const fallback = this.resolveFallbackVenvPython()
    if (fallback) return fallback
    this.log('[resolvePythonExecutable] Fallback also missing torch, using managed venv.')
    return managedRuntime.pythonPath
  }

  private resolveManagedPythonPath(venvDir: string): string {
    return this.pathApi.join(venvDir, ...this.platformAdapter.managedPythonPathParts)
  }

  private resolveFallbackVenvPython(): string | null {
    const fallbackVenvDir = this.pathApi.join(
      this.host.runtimeRoot,
      MANAGED_AI_PYTHON_DIRECTORY,
      '.venv.old'
    )
    const pythonPath = this.resolveManagedPythonPath(fallbackVenvDir)
    if (!this.io.exists(pythonPath)) return null
    if (!this.io.canImport(pythonPath, 'torch')) return null
    this.log('[resolvePythonExecutable] Fallback old venv has torch, preferring it.')
    return pythonPath
  }

  private searchBasePythonInstallRoots(): string | null {
    const roots = this.platformAdapter.basePythonSearchRoots?.(this.host, this.pathApi) ?? []
    for (const root of roots) {
      try {
        if (root !== 'C:\\' && !this.io.exists(root)) continue
        const directories = this.io.readDirectory(root)
          .filter((directory) => directory.toLowerCase().startsWith('python'))
          .sort((left, right) => right.localeCompare(left, undefined, { numeric: true, sensitivity: 'base' }))
        for (const directory of directories) {
          const pythonPath = this.pathApi.join(root, directory, 'python.exe')
          if (this.io.exists(pythonPath)) {
            this.log(`[resolvePythonExecutable] Found Windows Python: ${pythonPath}`)
            return pythonPath
          }
        }
      } catch (error) {
        this.log(`[resolvePythonExecutable] Error reading Python directory: ${this.errorMessage(error)}`)
      }
    }
    return null
  }

  private resolveDefaultBasePythonExecutable(): string {
    this.log('[resolvePythonExecutable] Falling back to default "python"')
    return 'python'
  }

  private log(message: string): void {
    this.io.log?.(message)
  }

  private get pathApi(): typeof path.posix {
    return this.platformAdapter.pathApi
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error)
  }
}

function resolveAiPythonEnvironmentPlatformAdapter(platform: NodeJS.Platform | string): AiPythonEnvironmentPlatformAdapter {
  return AI_PYTHON_ENVIRONMENT_PLATFORM_ADAPTERS.find((candidate) =>
    platformAdapterMatchesCurrentPlatform(candidate, { currentPlatform: platform })
  )!
}

function resolveWindowsBasePythonExecutable(input: BasePythonResolverInput): string | null {
  try {
    input.log('[resolvePythonExecutable] platform is win32, running "where python"...')
    const output = input.io.findPythonOnPath()
    input.log(`[resolvePythonExecutable] "where python" raw output:\n${output}`)
    const resolved = output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => {
        const normalized = line.toLowerCase()
        return normalized.endsWith('python.exe') && !normalized.includes('microsoft\\windowsapps')
      })
    if (resolved) {
      input.log(`[resolvePythonExecutable] WindowsApps bypass resolved: ${resolved}`)
      return resolved
    }
  } catch (error) {
    input.log(`[resolvePythonExecutable] "where python" failed: ${input.errorMessage(error)}`)
  }

  return input.searchBasePythonInstallRoots()
}

function resolveMacOSHomebrewPythonExecutable(input: BasePythonResolverInput): string {
  const candidates = ['/opt/homebrew/bin/python3.13', '/opt/homebrew/bin/python3']
  const resolved = candidates.find((candidate) => input.io.exists(candidate))
  if (resolved) {
    input.log(`[resolvePythonExecutable] Found Homebrew Python: ${resolved}`)
    return resolved
  }
  return input.defaultPythonExecutable()
}
