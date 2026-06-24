import path from 'node:path'

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

interface ManagedPythonPathAdapter {
  platform?: NodeJS.Platform | string
  pathParts: string[]
}

interface BasePythonResolver {
  platform?: NodeJS.Platform | string
  resolve: () => string | null
}

const MANAGED_PYTHON_PATH_ADAPTERS: ManagedPythonPathAdapter[] = [
  { platform: 'win32', pathParts: ['Scripts', 'python.exe'] },
  { pathParts: ['bin', 'python'] }
]

// Keep the legacy directory name so existing managed environments remain usable.
const MANAGED_AI_PYTHON_DIRECTORY = 'macos-ai-python'

export class AiPythonEnvironment {
  private readonly pathApi: typeof path.posix

  constructor(
    private readonly host: AiPythonEnvironmentHost,
    private readonly io: AiPythonEnvironmentIo
  ) {
    this.pathApi = host.platform === 'win32' ? path.win32 : path.posix
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

    const resolvers: BasePythonResolver[] = [
      { platform: 'win32', resolve: () => this.resolveWindowsBasePythonExecutable() },
      { platform: 'darwin', resolve: () => this.resolveMacOSHomebrewPythonExecutable() },
      { resolve: () => this.resolveDefaultBasePythonExecutable() }
    ]
    for (const resolver of resolvers) {
      if (resolver.platform && resolver.platform !== this.host.platform) continue
      const resolved = resolver.resolve()
      if (resolved) return resolved
    }
    return 'python'
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
    const adapter = MANAGED_PYTHON_PATH_ADAPTERS.find((candidate) => {
      return !candidate.platform || candidate.platform === this.host.platform
    })!
    return this.pathApi.join(venvDir, ...adapter.pathParts)
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

  private resolveWindowsBasePythonExecutable(): string | null {
    try {
      this.log('[resolvePythonExecutable] platform is win32, running "where python"...')
      const output = this.io.findPythonOnPath()
      this.log(`[resolvePythonExecutable] "where python" raw output:\n${output}`)
      const resolved = output
        .split(/\r?\n/)
        .map((line) => line.trim())
        .find((line) => {
          const normalized = line.toLowerCase()
          return normalized.endsWith('python.exe') && !normalized.includes('microsoft\\windowsapps')
        })
      if (resolved) {
        this.log(`[resolvePythonExecutable] WindowsApps bypass resolved: ${resolved}`)
        return resolved
      }
    } catch (error) {
      this.log(`[resolvePythonExecutable] "where python" failed: ${this.errorMessage(error)}`)
    }

    return this.searchWindowsPythonPaths()
  }

  private searchWindowsPythonPaths(): string | null {
    const userProfile = this.host.environment.USERPROFILE || this.host.environment.HOMEPATH || ''
    const roots = userProfile
      ? [this.pathApi.join(userProfile, 'AppData', 'Local', 'Programs', 'Python')]
      : []
    roots.push('C:\\Program Files\\Python', 'C:\\')

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

  private resolveMacOSHomebrewPythonExecutable(): string {
    const candidates = ['/opt/homebrew/bin/python3.13', '/opt/homebrew/bin/python3']
    const resolved = candidates.find((candidate) => this.io.exists(candidate))
    if (resolved) {
      this.log(`[resolvePythonExecutable] Found Homebrew Python: ${resolved}`)
      return resolved
    }
    return this.resolveDefaultBasePythonExecutable()
  }

  private resolveDefaultBasePythonExecutable(): string {
    this.log('[resolvePythonExecutable] Falling back to default "python"')
    return 'python'
  }

  private log(message: string): void {
    this.io.log?.(message)
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error)
  }
}
