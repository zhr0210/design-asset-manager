import path from 'path'
import fs from 'fs'
import { spawn, execSync } from 'child_process'
import { app, type WebContents } from 'electron'
import { SettingsService } from './settings.service'
import { resolveManagedPaths } from '../platform/path-resolver'
import { resolveDebugLogPath } from '../platform/log-path-resolver'
import type { OcrEnvPayload } from '../../shared/contracts/ocr-dependency.contract'
import {
  CHANNEL_OCR_INSTALL_LOG_UPDATE
} from '../../shared/contracts/ocr-dependency.contract'
import { resolveAiServicePath } from './ai-service-paths'

interface OcrManagedPythonRuntimeAdapter {
  platform?: NodeJS.Platform | string
  pythonPathParts: string[]
}

const OCR_MANAGED_PYTHON_RUNTIME_ADAPTERS: OcrManagedPythonRuntimeAdapter[] = [
  { platform: 'win32', pythonPathParts: ['Scripts', 'python.exe'] },
  { pythonPathParts: ['bin', 'python'] }
]

function redactDebugMessage(msg: string): string {
  const homeLikeValues = [
    process.env.USERPROFILE,
    process.env.HOME,
    process.env.HOMEPATH
  ].filter((value): value is string => Boolean(value && value.trim()))

  return homeLikeValues.reduce((current, value) => {
    return current.split(value).join('<user-home>')
  }, msg)
}

function writeDebugLog(msg: string): void {
  try {
    const managedPaths = resolveManagedPaths()
    const logPath = resolveDebugLogPath('ocr-dependency', {
      managedPaths,
      fileName: 'ocr-dependency.log'
    })
    const dir = path.dirname(logPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    const timestamp = new Date().toISOString()
    fs.appendFileSync(logPath, `[${timestamp}] ${redactDebugMessage(msg)}\n`, 'utf8')
  } catch (err) {
    // Ignore
  }
}

function resolveElectronManagedPaths() {
  return resolveManagedPaths({
    getPath: (name) => app.getPath(name)
  })
}

function findEnvCheckScriptPath(): string {
  return resolveAiServicePath(['tools', 'check_ocr_env.py'])
}

function searchWindowsPythonPaths(): string | null {
  if (process.platform !== 'win32') return null

  const userProfile = process.env.USERPROFILE || process.env.HOMEPATH || ''
  if (!userProfile) return null

  writeDebugLog('[resolvePythonExecutable] Searching in common Windows programs Python directories...')

  // 1. Check User Local Programs Python directory
  const localProgramsPythonDir = path.join(userProfile, 'AppData', 'Local', 'Programs', 'Python')
  if (fs.existsSync(localProgramsPythonDir)) {
    try {
      const dirs = fs.readdirSync(localProgramsPythonDir)
      dirs.sort((a, b) => b.localeCompare(a, undefined, { numeric: true, sensitivity: 'base' }))
      for (const dir of dirs) {
        if (dir.toLowerCase().startsWith('python')) {
          const exePath = path.join(localProgramsPythonDir, dir, 'python.exe')
          if (fs.existsSync(exePath)) {
            writeDebugLog(`[resolvePythonExecutable] Found Python in User Programs: ${exePath}`)
            return exePath
          }
        }
      }
    } catch (err: any) {
      writeDebugLog(`[resolvePythonExecutable] Error reading local programs Python dir: ${err.message}`)
    }
  }

  // 2. Check System Program Files Python directory
  const programFilesPythonDir = 'C:\\Program Files\\Python'
  if (fs.existsSync(programFilesPythonDir)) {
    try {
      const dirs = fs.readdirSync(programFilesPythonDir)
      dirs.sort((a, b) => b.localeCompare(a, undefined, { numeric: true, sensitivity: 'base' }))
      for (const dir of dirs) {
        if (dir.toLowerCase().startsWith('python')) {
          const exePath = path.join(programFilesPythonDir, dir, 'python.exe')
          if (fs.existsSync(exePath)) {
            writeDebugLog(`[resolvePythonExecutable] Found Python in Program Files: ${exePath}`)
            return exePath
          }
        }
      }
    } catch (err: any) {
      writeDebugLog(`[resolvePythonExecutable] Error reading Program Files Python dir: ${err.message}`)
    }
  }

  // 3. Check C:\Python* common root paths
  try {
    const rootDirs = fs.readdirSync('C:\\')
    const pyDirs = rootDirs.filter(d => d.toLowerCase().startsWith('python'))
    pyDirs.sort((a, b) => b.localeCompare(a, undefined, { numeric: true, sensitivity: 'base' }))
    for (const dir of pyDirs) {
      const exePath = path.join('C:\\', dir, 'python.exe')
      if (fs.existsSync(exePath)) {
        writeDebugLog(`[resolvePythonExecutable] Found Python in C:\\ root: ${exePath}`)
        return exePath
      }
    }
  } catch (err: any) {
    writeDebugLog(`[resolvePythonExecutable] Error reading C:\\ root dir: ${err.message}`)
  }

  return null
}

function resolveManagedVenvPythonPath(venvDir: string): string {
  return path.join(venvDir, ...resolveManagedVenvPythonPathParts())
}

function resolveManagedVenvPythonPathParts(): string[] {
  const adapter = OCR_MANAGED_PYTHON_RUNTIME_ADAPTERS.find((item) => !item.platform || item.platform === process.platform)
  return adapter?.pythonPathParts ?? ['bin', 'python']
}

export function resolveMacOSAiPythonRuntime(): {
  runtimeDir: string
  venvDir: string
  pythonPath: string
  exists: boolean
} {
  const managedPaths = resolveElectronManagedPaths()
  const runtimeDir = path.join(managedPaths.runtimeDir, 'macos-ai-python')
  const venvDir = path.join(runtimeDir, '.venv')
  const pythonPath = resolveManagedVenvPythonPath(venvDir)

  return {
    runtimeDir,
    venvDir,
    pythonPath,
    exists: fs.existsSync(pythonPath)
  }
}

/** Resolve an older venv that already has torch installed as a fallback. */
function resolveFallbackVenvPython(): string | null {
  const managedPaths = resolveElectronManagedPaths()
  const oldVenvPython = path.join(
    managedPaths.runtimeDir,
    'macos-ai-python',
    '.venv.old',
    ...resolveManagedVenvPythonPathParts()
  )
  if (!fs.existsSync(oldVenvPython)) return null
  try {
    execSync(`"${oldVenvPython}" -c "import torch"`, { timeout: 5000, stdio: 'ignore' })
    writeDebugLog('[resolvePythonExecutable] Fallback old venv has torch, preferring it.')
    return oldVenvPython
  } catch {
    return null
  }
}

export function resolveBasePythonExecutable(): string {
  writeDebugLog('[resolvePythonExecutable] Resolving Python executable...')
  const envs = [
    process.env.DESIGN_ASSET_MANAGER_PYTHON,
    process.env.TEXT_OCR_PYTHON,
    process.env.PYTHON
  ]
  for (const [idx, env] of envs.entries()) {
    if (env && env.trim()) {
      writeDebugLog(`[resolvePythonExecutable] Found env key index ${idx}: ${env}`)
      return env.trim()
    }
  }

  if (process.platform === 'win32') {
    try {
      writeDebugLog('[resolvePythonExecutable] platform is win32, running execSync("where python")...')
      const output = execSync('where python', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
      writeDebugLog(`[resolvePythonExecutable] "where python" raw output:\n${output}`)
      const lines = output.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
      for (const line of lines) {
        if (line.toLowerCase().endsWith('python.exe') && !line.toLowerCase().includes('microsoft\\windowsapps')) {
          writeDebugLog(`[resolvePythonExecutable] WindowsApps bypass resolved: ${line}`)
          return line
        }
      }
    } catch (e: any) {
      writeDebugLog(`[resolvePythonExecutable] execSync("where python") failed: ${e?.message || String(e)}`)
    }

    const searchedPath = searchWindowsPythonPaths()
    if (searchedPath) {
      return searchedPath
    }
  }

  writeDebugLog('[resolvePythonExecutable] Falling back to default "python"')

  if (process.platform === "darwin") {
    const homebrewPython313 = "/opt/homebrew/bin/python3.13"
    if (fs.existsSync(homebrewPython313)) {
      writeDebugLog("[resolvePythonExecutable] Found Homebrew Python 3.13")
      return homebrewPython313
    }
    const homebrewPython3 = "/opt/homebrew/bin/python3"
    if (fs.existsSync(homebrewPython3)) {
      writeDebugLog("[resolvePythonExecutable] Found Homebrew Python 3")
      return homebrewPython3
    }
  }

  return 'python'
}

export function resolvePythonExecutable(): string {
  const explicit = process.env.DESIGN_ASSET_MANAGER_PYTHON
  if (explicit && explicit.trim()) return explicit.trim()

  const managedRuntime = resolveMacOSAiPythonRuntime()
  if (managedRuntime.exists) {
    try {
      execSync(`"${managedRuntime.pythonPath}" -c "import torch"`, {
        timeout: 5000,
        stdio: 'ignore'
      })
      writeDebugLog('[resolvePythonExecutable] Using managed macOS AI Python runtime.')
      return managedRuntime.pythonPath
    } catch {
      writeDebugLog('[resolvePythonExecutable] Managed venv missing torch, trying fallback...')
      const fallback = resolveFallbackVenvPython()
      if (fallback) return fallback
      writeDebugLog('[resolvePythonExecutable] Fallback also missing torch, using managed venv.')
      return managedRuntime.pythonPath
    }
  }

  return resolveBasePythonExecutable()
}

export async function ensureMacOSAiPythonRuntime(): Promise<{
  success: boolean
  pythonPath: string
  runtimeDir: string
  created: boolean
  error?: string
}> {
  const managedRuntime = resolveMacOSAiPythonRuntime()
  if (managedRuntime.exists) {
    return {
      success: true,
      pythonPath: managedRuntime.pythonPath,
      runtimeDir: managedRuntime.runtimeDir,
      created: false
    }
  }

  const basePython = resolveBasePythonExecutable()
  fs.mkdirSync(managedRuntime.runtimeDir, { recursive: true })

  return new Promise((resolve) => {
    const child = spawn(basePython, ['-m', 'venv', managedRuntime.venvDir], {
      shell: false,
      env: {
        ...process.env,
        PYTHONPYCACHEPREFIX: process.env.PYTHONPYCACHEPREFIX || path.join(resolveElectronManagedPaths().tempDir, 'pycache')
      }
    })
    let errorOutput = ''

    child.stderr?.on('data', (chunk) => {
      errorOutput += chunk.toString()
    })

    child.on('error', (err) => {
      resolve({
        success: false,
        pythonPath: managedRuntime.pythonPath,
        runtimeDir: managedRuntime.runtimeDir,
        created: false,
        error: err.message
      })
    })

    child.on('close', (code) => {
      const exists = fs.existsSync(managedRuntime.pythonPath)
      resolve({
        success: code === 0 && exists,
        pythonPath: managedRuntime.pythonPath,
        runtimeDir: managedRuntime.runtimeDir,
        created: code === 0 && exists,
        error: code === 0 && exists ? undefined : (errorOutput.slice(-1000) || `venv exited with code ${code}`)
      })
    })
  })
}

export class OcrDependencyService {
  private static instance: OcrDependencyService
  private installProcess: ReturnType<typeof spawn> | null = null
  private installLogs = ''
  private checkTimeoutMs = 15000

  private constructor() {}

  public static getInstance(): OcrDependencyService {
    if (!OcrDependencyService.instance) {
      OcrDependencyService.instance = new OcrDependencyService()
    }
    return OcrDependencyService.instance
  }

  /**
   * Run the check environment Python tool.
   */
  public async checkEnvironment(): Promise<OcrEnvPayload> {
    const scriptPath = findEnvCheckScriptPath()
    const pythonExe = resolvePythonExecutable()
    const settingsService = SettingsService.getInstance()
    const settings = settingsService.getSettings()

    const defaultPayload = (): OcrEnvPayload => ({
      python: {
        available: false,
        version: null,
        path: null
      },
      providers: {
        easyocr: { installed: false, version: null, available: false, installCommand: `${pythonExe} -m pip install easyocr opencv-python numpy` },
        rapidocr: { installed: false, version: null, available: false },
        paddleocr: { installed: false, version: null, available: false, installCommand: `${pythonExe} -m pip install paddleocr opencv-python numpy` }
      },
      selectedProvider: settings.textBoxProvider ?? 'easyocr',
      selectedProviderAvailable: false,
      checkedAt: new Date().toISOString()
    })

    if (!fs.existsSync(scriptPath)) {
      console.warn(`[OcrDependencyService] Environment check script not found at: ${scriptPath}`)
      return defaultPayload()
    }

    return new Promise<OcrEnvPayload>((resolve) => {
      let stdoutData = ''
      let killed = false
      let child: ReturnType<typeof spawn>

      try {
        child = spawn(pythonExe, [scriptPath], { shell: false })
      } catch (err) {
        console.warn(`[OcrDependencyService] Failed to spawn python check tool synchronously:`, err)
        resolve(defaultPayload())
        return
      }

      const timeoutId = setTimeout(() => {
        killed = true
        try { child.kill('SIGKILL') } catch {}
        resolve(defaultPayload())
      }, this.checkTimeoutMs)

      child.stdout?.on('data', (chunk) => {
        stdoutData += chunk.toString()
      })

      child.on('error', () => {
        if (killed) return
        clearTimeout(timeoutId)
        resolve(defaultPayload())
      })

      child.on('close', (code) => {
        if (killed) return
        clearTimeout(timeoutId)

        const trimmed = stdoutData.trim()
        if (code !== 0 || !trimmed) {
          resolve(defaultPayload())
          return
        }

        try {
          const firstBrace = trimmed.indexOf('{')
          const lastBrace = trimmed.lastIndexOf('}')
          if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
            throw new Error('No JSON payload found in stdout output.')
          }
          const jsonStr = trimmed.substring(firstBrace, lastBrace + 1)
          const parsed = JSON.parse(jsonStr)
          
          const isEasyAvailable = parsed.easyocr?.installed === true
          const isRapidAvailable = parsed.rapidocr?.installed === true
          const isPaddleAvailable = parsed.paddleocr?.installed === true

          const pythonVersion = parsed.python?.version ?? '3.11.9'
          const realPythonPath = parsed.python?.executable ?? pythonExe

          const selectedProvider = settings.textBoxProvider ?? 'easyocr'
          let selectedProviderAvailable = false
          if (selectedProvider === 'easyocr') selectedProviderAvailable = isEasyAvailable
          else if (selectedProvider === 'rapidocr') selectedProviderAvailable = isRapidAvailable
          else if (selectedProvider === 'paddleocr') selectedProviderAvailable = isPaddleAvailable
          else if (selectedProvider === 'mock') selectedProviderAvailable = true

          const payload: OcrEnvPayload = {
            python: {
              available: true,
              version: pythonVersion,
              path: realPythonPath
            },
            providers: {
              easyocr: {
                installed: isEasyAvailable,
                version: parsed.easyocr?.version ?? null,
                available: isEasyAvailable,
                installCommand: `${pythonExe} -m pip install easyocr opencv-python numpy`
              },
              rapidocr: {
                installed: isRapidAvailable,
                version: parsed.rapidocr?.version ?? null,
                available: isRapidAvailable
              },
              paddleocr: {
                installed: isPaddleAvailable,
                version: parsed.paddleocr?.version ?? null,
                available: isPaddleAvailable,
                installCommand: `${pythonExe} -m pip install paddleocr opencv-python numpy`
              }
            },
            selectedProvider,
            selectedProviderAvailable,
            checkedAt: new Date().toISOString()
          }

          // Cache environment check status
          settingsService.saveSettings({
            lastOcrEnvCheckAt: payload.checkedAt,
            cachedOcrEnvStatus: payload
          })

          resolve(payload)
        } catch (err) {
          console.warn(`[OcrDependencyService] Failed to parse check environment JSON output:`, err)
          resolve(defaultPayload())
        }
      })
    })
  }

  /**
   * Retrieves the cached environment check payload.
   */
  public getCachedOcrEnvironment(): OcrEnvPayload {
    const settingsService = SettingsService.getInstance()
    const settings = settingsService.getSettings()
    if (settings.cachedOcrEnvStatus) {
      return settings.cachedOcrEnvStatus as OcrEnvPayload
    }

    const pythonExe = resolvePythonExecutable()
    return {
      python: {
        available: false,
        version: null,
        path: null
      },
      providers: {
        easyocr: { installed: false, version: null, available: false, installCommand: `${pythonExe} -m pip install easyocr opencv-python numpy` },
        rapidocr: { installed: false, version: null, available: false },
        paddleocr: { installed: false, version: null, available: false, installCommand: `${pythonExe} -m pip install paddleocr opencv-python numpy` }
      },
      selectedProvider: settings.textBoxProvider ?? 'easyocr',
      selectedProviderAvailable: false,
      checkedAt: ""
    }
  }

  /**
   * Spawns an asynchronous python pip installer to install easyocr and other core ocr dependencies.
   * Feeds log output directly to the active web contents and buffers it.
   */
  public async installEasyOcr(sender: WebContents): Promise<void> {
    if (this.installProcess) {
      console.warn(`[OcrDependencyService] Installation already in progress.`)
      return
    }

    this.installLogs = ''
    const pythonExe = resolvePythonExecutable()
    const args = ['-m', 'pip', 'install', 'easyocr', 'opencv-python', 'numpy']

    this.logAndSend(sender, `[SYSTEM] Initiating installation: ${pythonExe} ${args.join(' ')}\n`)

    try {
      this.installProcess = spawn(pythonExe, args, { shell: false })
    } catch (err) {
      this.logAndSend(sender, `[SYSTEM ERROR] Failed to spawn pip installer synchronously: ${String(err)}\n`)
      this.installProcess = null
      return
    }

    this.installProcess.stdout?.on('data', (chunk) => {
      this.logAndSend(sender, chunk.toString())
    })

    this.installProcess.stderr?.on('data', (chunk) => {
      this.logAndSend(sender, chunk.toString())
    })

    this.installProcess.on('error', (err) => {
      this.logAndSend(sender, `\n[SYSTEM ERROR] Spawn error occurred: ${String(err)}\n`)
    })

    this.installProcess.on('close', (code) => {
      this.installProcess = null
      if (code === 0) {
        this.logAndSend(sender, `\n[SYSTEM] Installation finished successfully (Exit Code: 0).\n`)
        // Auto check environment
        this.checkEnvironment().then((newEnv) => {
          this.logAndSend(sender, `[SYSTEM] Auto environment check finished: ${newEnv.providers.easyocr.installed ? 'EasyOCR is now INSTALLED' : 'EasyOCR is still MISSING'}\n`)
        })
      } else {
        this.logAndSend(sender, `\n[SYSTEM WARNING] Installation finished with non-zero exit code: ${code}.\n`)
      }
    })
  }

  /**
   * Spawns an asynchronous python pip installer to install compressed-tensors.
   * Feeds log output directly to the active web contents and buffers it.
   */
  public async installCompressedTensors(sender: WebContents): Promise<void> {
    if (this.installProcess) {
      console.warn(`[OcrDependencyService] Installation already in progress.`)
      return
    }

    this.installLogs = ''
    const pythonExe = resolvePythonExecutable()
    const args = ['-m', 'pip', 'install', 'compressed-tensors']

    this.logAndSend(sender, `[SYSTEM] Initiating installation: ${pythonExe} ${args.join(' ')}\n`)

    try {
      this.installProcess = spawn(pythonExe, args, { shell: false })
    } catch (err) {
      this.logAndSend(sender, `[SYSTEM ERROR] Failed to spawn pip installer synchronously: ${String(err)}\n`)
      this.installProcess = null
      return
    }

    this.installProcess.stdout?.on('data', (chunk) => {
      this.logAndSend(sender, chunk.toString())
    })

    this.installProcess.stderr?.on('data', (chunk) => {
      this.logAndSend(sender, chunk.toString())
    })

    this.installProcess.on('error', (err) => {
      this.logAndSend(sender, `\n[SYSTEM ERROR] Spawn error occurred: ${String(err)}\n`)
    })

    this.installProcess.on('close', (code) => {
      this.installProcess = null
      if (code === 0) {
        this.logAndSend(sender, `\n[SYSTEM] Installation finished successfully (Exit Code: 0).\n`)
      } else {
        this.logAndSend(sender, `\n[SYSTEM WARNING] Installation finished with non-zero exit code: ${code}.\n`)
      }
    })
  }

  /**
   * Install macOS AI runtime dependencies (torch, transformers, onnxruntime, etc.)
   * through the Python install_macos_ai_deps.py script.
   */
  public async installMacOSAiDeps(sender: WebContents): Promise<void> {
    if (this.installProcess) {
      console.warn('[OcrDependencyService] macOS AI dep installation already in progress.')
      return
    }

    this.installLogs = ''
    const pythonExe = resolvePythonExecutable()
    const installScript = resolveAiServicePath(['tools', 'install_macos_ai_deps.py'])

    this.logAndSend(sender, `[SYSTEM] Starting macOS AI dependency installation via ${installScript}\n`)

    try {
      this.installProcess = spawn(pythonExe, [installScript], { shell: false })
    } catch (err) {
      this.logAndSend(sender, `[SYSTEM ERROR] Failed to spawn macOS AI dep installer: ${String(err)}\n`)
      this.installProcess = null
      return
    }

    this.installProcess.stdout?.on('data', (chunk: Buffer) => {
      const text = chunk.toString()
      // Try to parse JSON progress events
      for (const line of text.split('\n').filter(Boolean)) {
        try {
          const evt = JSON.parse(line.trim())
          this.logAndSend(sender, `[${evt.type}] ${evt.message}\n`)
        } catch {
          this.logAndSend(sender, text)
        }
      }
    })

    this.installProcess.stderr?.on('data', (chunk: Buffer) => {
      this.logAndSend(sender, chunk.toString())
    })

    this.installProcess.on('error', (err: Error) => {
      this.logAndSend(sender, `\n[SYSTEM ERROR] Spawn error: ${String(err)}\n`)
    })

    this.installProcess.on('close', (code: number | null) => {
      this.installProcess = null
      if (code === 0) {
        this.logAndSend(sender, '\n[SYSTEM] macOS AI dependencies installed successfully.\n')
      } else {
        this.logAndSend(sender, `\n[SYSTEM WARNING] macOS AI dep install exited with code: ${code}.\n`)
      }
    })
  }

  /**
   * Cancel the currently executing installer process.
   */
  public cancelInstall(): void {
    if (!this.installProcess) {
      console.warn(`[OcrDependencyService] No active installation to cancel.`)
      return
    }

    try {
      this.installProcess.kill('SIGKILL')
      this.installLogs += `\n[SYSTEM] Installation cancelled by user.\n`
    } catch (err) {
      console.warn(`[OcrDependencyService] Failed to kill installation process:`, err)
    }
    this.installProcess = null
  }

  /**
   * Retrieve the accumulated logs.
   */
  public getInstallLog(): string {
    return this.installLogs
  }

  private logAndSend(sender: WebContents, message: string): void {
    this.installLogs += message
    if (!sender.isDestroyed()) {
      sender.send(CHANNEL_OCR_INSTALL_LOG_UPDATE, message)
    }
  }
}
