import { app, shell, type WebContents } from 'electron'
import fs from 'fs'
import fsp from 'fs/promises'
import crypto from 'crypto'
import os from 'os'
import path from 'path'
import { spawn, type ChildProcessWithoutNullStreams } from 'child_process'
import {
  createHardwareProfile,
  createInstallPlan,
  DEFAULT_LLAMA_RELEASE,
  assertSafeZipEntries,
  listZipEntries,
  sanitizeLlamaLog,
  type LlamaMirrorManifest,
  type LlamaReleaseInfo
} from './llama-runtime-planner'
import { SettingsService } from '../settings.service'
import { DEFAULT_PROMPT_REVERSE_MAX_TOKENS } from '../../../shared/constants/prompt-templates.constants'
import type {
  LlamaHardwareProfile,
  LlamaInstallPlan,
  LlamaInstallProgressEvent,
  LlamaInstallStatus,
  LlamaRuntimePackage,
  LlamaServerTestResult
} from '../../../shared/types/llama-runtime.types'
import { llamaRuntimeInstallProgressChannel } from '../../../shared/contracts/llama-runtime.contract'
import type { AiBackendConfig } from '../../../shared/types/ai-backend.types'

const LLAMA_RELEASES_API = 'https://api.github.com/repos/ggml-org/llama.cpp/releases/latest'

export class LlamaRuntimeInstallService {
  private static instance: LlamaRuntimeInstallService
  private abortController: AbortController | null = null
  private serverProcess: ChildProcessWithoutNullStreams | null = null
  private status: LlamaInstallStatus = {
    phase: 'idle',
    progress: 0,
    message: '尚未开始安装。',
    baseUrl: 'http://127.0.0.1:8080/v1'
  }

  public static getInstance(): LlamaRuntimeInstallService {
    if (!LlamaRuntimeInstallService.instance) {
      LlamaRuntimeInstallService.instance = new LlamaRuntimeInstallService()
    }
    return LlamaRuntimeInstallService.instance
  }

  public async detectHardware(): Promise<LlamaHardwareProfile> {
    if (process.platform === 'darwin') {
      return this.detectMacHardware()
    }

    if (process.platform !== 'win32') {
      return createHardwareProfile({
        platform: process.platform,
        arch: process.arch,
        cpuThreads: os.cpus().length,
        totalMemoryGB: Math.round(os.totalmem() / 1024 / 1024 / 1024),
        warnings: ['当前平台将使用 llama.cpp CPU 运行包；如下载源未提供当前架构包，请手动选择已安装的 llama-server。']
      })
    }

    const warnings: string[] = []
    let gpuName: string | undefined
    let totalVramGB: number | undefined
    let driverVersion: string | undefined
    let cudaVersion: string | undefined

    try {
      const csv = await this.runCapture('nvidia-smi', ['--query-gpu=name,memory.total,driver_version', '--format=csv,noheader,nounits'], 5000)
      const first = csv.trim().split(/\r?\n/)[0]
      if (first) {
        const [name, memory, driver] = first.split(',').map((part) => part.trim())
        gpuName = name
        totalVramGB = Math.round((Number(memory) / 1024) * 10) / 10
        driverVersion = driver
      }
      const full = await this.runCapture('nvidia-smi', [], 5000)
      cudaVersion = /CUDA Version:\s*([\d.]+)/i.exec(full)?.[1]
    } catch {
      warnings.push('未检测到可用的 nvidia-smi，将回退到 Vulkan/CPU 安装建议。')
    }

    return createHardwareProfile({
      platform: process.platform,
      arch: process.arch,
      cpuThreads: os.cpus().length,
      totalMemoryGB: Math.round(os.totalmem() / 1024 / 1024 / 1024),
      hasNvidiaGpu: Boolean(gpuName),
      gpuName,
      totalVramGB,
      driverVersion,
      cudaVersion,
      warnings
    })
  }

  private async detectMacHardware(): Promise<LlamaHardwareProfile> {
    const warnings: string[] = []
    const totalMemoryGB = Math.round(os.totalmem() / 1024 / 1024 / 1024)
    const cpuThreads = os.cpus().length
    let chipName = os.cpus()[0]?.model || 'Apple Silicon / Intel Mac'
    let coreSummary = `${cpuThreads} 线程`
    let displaySummary = ''

    try {
      const brand = await this.runCapture('sysctl', ['-n', 'machdep.cpu.brand_string'], 3000)
      if (brand.trim()) chipName = brand.trim()
    } catch {
      // Apple Silicon may not expose machdep.cpu.brand_string in all environments.
    }

    try {
      const hardware = await this.runCapture('system_profiler', ['SPHardwareDataType'], 8000)
      const chip = /Chip:\s*(.+)/i.exec(hardware)?.[1]?.trim()
      const processor = /Processor Name:\s*(.+)/i.exec(hardware)?.[1]?.trim()
      const cores = /Total Number of Cores:\s*(.+)/i.exec(hardware)?.[1]?.trim()
      const memory = /Memory:\s*(.+)/i.exec(hardware)?.[1]?.trim()
      chipName = chip || processor || chipName
      coreSummary = cores || coreSummary
      if (memory) warnings.push(`检测到统一内存：${memory}。`)
    } catch (err) {
      warnings.push(`无法读取 macOS 硬件详情，将使用 Node/os 基础信息：${err instanceof Error ? err.message : String(err)}`)
    }

    try {
      const displays = await this.runCapture('system_profiler', ['SPDisplaysDataType'], 8000)
      const chipset = /Chipset Model:\s*(.+)/i.exec(displays)?.[1]?.trim()
      const vram = /VRAM(?: \(Dynamic, Max\))?:\s*(.+)/i.exec(displays)?.[1]?.trim()
      displaySummary = [chipset, vram].filter(Boolean).join(' / ')
    } catch {
      // Display profiler data is optional for llama runtime planning.
    }

    const isAppleSilicon = process.arch === 'arm64' || /Apple\s+M\d|Apple\s+Silicon/i.test(chipName)
    const estimatedUnifiedVramGB = isAppleSilicon
      ? Math.max(4, Math.round(totalMemoryGB * 0.65 * 10) / 10)
      : undefined
    const recommendedAccelerator = isAppleSilicon ? 'metal' : 'cpu'

    return createHardwareProfile({
      platform: process.platform,
      arch: process.arch,
      cpuThreads,
      totalMemoryGB,
      hasNvidiaGpu: false,
      gpuName: displaySummary || `${chipName}${isAppleSilicon ? ' 统一内存 GPU' : ''}`,
      totalVramGB: estimatedUnifiedVramGB,
      recommendedAccelerator,
      warnings: [
        `macOS 硬件检测完成：${chipName}，${coreSummary}，系统内存约 ${totalMemoryGB} GB。`,
        ...(estimatedUnifiedVramGB ? [`按 Apple 统一内存估算可用于本地推理的显存预算约 ${estimatedUnifiedVramGB} GB。`] : []),
        ...warnings
      ]
    })
  }

  public async createInstallPlan(mirrorManifestPath?: string, requestedModelRootDir?: string, downloadSource?: 'huggingface' | 'hf-mirror'): Promise<LlamaInstallPlan> {
    const hardware = await this.detectHardware()
    const release = await this.fetchLatestRelease()
    const mirrorManifest = await this.loadMirrorManifest(mirrorManifestPath)
    const modelRootDir = requestedModelRootDir?.trim()
      || (SettingsService.getInstance().getSettings().modelRootDir ?? path.join(app.getPath('userData'), 'AIModels'))
    return createInstallPlan({
      hardware,
      release,
      mirrorManifest,
      installRoot: path.join(modelRootDir, 'llama-runtime'),
      downloadSource
    })
  }

  public getStatus(): LlamaInstallStatus {
    return {
      ...this.status,
      serverPid: this.serverProcess?.pid
    }
  }

  public async getStatusWithHealth(baseUrl?: string): Promise<LlamaInstallStatus> {
    const status = this.getStatus()
    const health = await this.checkServerHealth(baseUrl ?? status.baseUrl)
    return {
      ...status,
      phase: health.running && status.phase === 'idle' ? 'complete' : status.phase,
      message: health.running && status.phase === 'idle' ? 'llama-server 已在本机运行。' : status.message,
      serverRunning: health.running,
      serverModels: health.models,
      serverHealthCheckedAt: new Date().toISOString(),
      error: health.running
        ? status.error
        : status.serverPid
          ? {
              code: 'LLAMA_SERVER_HEALTH_FAILED',
              message: health.error ?? 'llama-server process exists but health check failed.'
            }
          : status.error
    }
  }

  public async startInstall(plan: LlamaInstallPlan, sender: WebContents): Promise<LlamaInstallStatus> {
    if (this.abortController) {
      throw new Error('已有 Llama 安装任务正在运行。')
    }
    this.abortController = new AbortController()
    this.emit(sender, plan.installId, 'downloading', 1, '开始安装 Llama 本地服务。')

    try {
      await fsp.mkdir(plan.runtimeDir, { recursive: true })
      await fsp.mkdir(plan.modelDir, { recursive: true })
      const cacheDir = path.join(plan.installRoot, 'downloads')
      await fsp.mkdir(cacheDir, { recursive: true })

      for (let i = 0; i < plan.runtimePackages.length; i += 1) {
        const pkg = plan.runtimePackages[i]
        const targetZip = path.join(cacheDir, pkg.filename)
        await this.downloadPackage(pkg, targetZip, sender, plan.installId, 5 + i * 20)
        this.emit(sender, plan.installId, 'extracting', 25 + i * 20, `正在解压 ${pkg.role === 'runtime' ? 'llama.cpp' : 'CUDA 运行库'}。`)
        await this.extractZip(targetZip, plan.runtimeDir)
      }

      const modelPath = path.join(plan.modelDir, plan.recommendedModel.filename)
      await this.downloadUrl(
        plan.recommendedModel.mirrorUrl ?? plan.recommendedModel.url,
        plan.recommendedModel.url,
        modelPath,
        plan.recommendedModel.checksumSha256,
        sender,
        plan.installId,
        58,
        `正在下载 ${plan.recommendedModel.name} LLM GGUF。`
      )
      let mmprojPath: string | undefined
      if (plan.recommendedModel.mmprojFilename && plan.recommendedModel.mmprojUrl) {
        mmprojPath = path.join(plan.modelDir, plan.recommendedModel.mmprojFilename)
        await this.downloadUrl(
          plan.recommendedModel.mmprojUrl,
          plan.recommendedModel.mmprojUrl,
          mmprojPath,
          undefined,
          sender,
          plan.installId,
          78,
          `正在下载 ${plan.recommendedModel.name} 视觉编码器 mmproj。`
        )
      }

      await this.updateLlamaBackend(plan, modelPath)
      this.emit(sender, plan.installId, 'complete', 100, 'Llama 本地服务安装完成，已写入后端配置。')
      this.status = {
        installId: plan.installId,
        phase: 'complete',
        progress: 100,
        message: 'Llama 本地服务安装完成。',
        installRoot: plan.installRoot,
        runtimeDir: plan.runtimeDir,
        modelPath,
        mmprojPath,
        baseUrl: plan.baseUrl
      }
      return this.getStatus()
    } catch (err: any) {
      const phase = this.abortController?.signal.aborted ? 'cancelled' : 'error'
      this.emit(sender, plan.installId, phase, this.status.progress, phase === 'cancelled' ? '安装已取消。' : '安装失败。', {
        code: phase === 'cancelled' ? 'LLAMA_INSTALL_CANCELLED' : 'LLAMA_INSTALL_FAILED',
        message: sanitizeLlamaLog(err?.message ?? String(err))
      })
      this.status = {
        installId: plan.installId,
        phase,
        progress: this.status.progress,
        message: phase === 'cancelled' ? '安装已取消。' : '安装失败。',
        installRoot: plan.installRoot,
        runtimeDir: plan.runtimeDir,
        baseUrl: plan.baseUrl,
        error: {
          code: phase === 'cancelled' ? 'LLAMA_INSTALL_CANCELLED' : 'LLAMA_INSTALL_FAILED',
          message: sanitizeLlamaLog(err?.message ?? String(err))
        }
      }
      return this.getStatus()
    } finally {
      this.abortController = null
    }
  }

  public cancelInstall(): LlamaInstallStatus {
    this.abortController?.abort()
    this.status = { ...this.status, phase: 'cancelled', message: '正在取消安装。' }
    return this.getStatus()
  }

  public async startServer(plan?: LlamaInstallPlan, modelPath?: string): Promise<LlamaInstallStatus> {
    if (this.serverProcess && !this.serverProcess.killed) {
      return this.getStatus()
    }
    
    let runtimeDir = plan?.runtimeDir ?? this.status.runtimeDir
    const ggufPath = modelPath ?? this.status.modelPath
    
    // Robust fallback: if runtimeDir is missing (e.g. after app restart), reconstruct and scan install directories
    if (!runtimeDir) {
      const modelRootDir = SettingsService.getInstance().getSettings().modelRootDir
        || path.join(app.getPath('userData'), 'AIModels')
      const installRoot = path.join(modelRootDir, 'llama-runtime')
      const runtimesBaseDir = path.join(installRoot, 'runtimes', 'llama.cpp')
      if (fs.existsSync(runtimesBaseDir)) {
        try {
          const files = fs.readdirSync(runtimesBaseDir)
          for (const f of files) {
            const fullPath = path.join(runtimesBaseDir, f)
            if (fs.statSync(fullPath).isDirectory() && this.findServerExecutable(fullPath)) {
              runtimeDir = fullPath
              break
            }
          }
        } catch (e) {
          // ignore
        }
      }
      if (!runtimeDir) {
        runtimeDir = path.join(installRoot, 'runtimes', 'llama.cpp', DEFAULT_LLAMA_RELEASE.tag_name)
      }
    }

    if (!runtimeDir || !ggufPath) {
      throw new Error('缺少 llama.cpp 安装目录或 GGUF 模型路径。')
    }
    
    const exePath = this.findServerExecutable(runtimeDir)
    
    let mmprojPath = plan?.recommendedModel.mmprojFilename
      ? path.join(plan.modelDir, plan.recommendedModel.mmprojFilename)
      : this.status.mmprojPath

    // Robust fallback: if mmprojPath is missing, automatically search for mmproj file in GGUF model directory
    if (!mmprojPath && ggufPath) {
      const modelDir = path.dirname(ggufPath)
      try {
        if (fs.existsSync(modelDir)) {
          const files = fs.readdirSync(modelDir)
          const mmprojFile = files.find(f => f.toLowerCase().includes('mmproj') && f.toLowerCase().endsWith('.gguf'))
          if (mmprojFile) {
            mmprojPath = path.join(modelDir, mmprojFile)
          }
        }
      } catch (e) {
        // ignore
      }
    }

    if (!exePath || !fs.existsSync(exePath)) {
      throw new Error(process.platform === 'win32' ? '未找到 llama-server.exe，请先完成安装。' : '未找到 llama-server，请先完成安装。')
    }
    if (!fs.existsSync(ggufPath)) {
      throw new Error('未找到 GGUF 模型文件，请先完成模型下载。')
    }

    const args = ['-m', ggufPath]
    if (mmprojPath && fs.existsSync(mmprojPath)) {
      args.push('--mmproj', mmprojPath)
    }
    args.push('--host', '127.0.0.1', '--port', '8080', '-c', '4096', '-ngl', '999')
    if (process.platform !== 'win32') {
      try {
        fs.chmodSync(exePath, 0o755)
      } catch {
        // Ignore chmod failures; spawn will report the real error if it is not executable.
      }
    }
    this.serverProcess = spawn(exePath, args, { cwd: runtimeDir, shell: false })
    this.serverProcess.on('exit', () => {
      this.serverProcess = null
    })
    this.status = {
      ...this.status,
      phase: 'starting',
      message: 'llama-server 已启动，正在等待服务就绪。',
      runtimeDir,
      modelPath: ggufPath,
      mmprojPath,
      baseUrl: plan?.baseUrl ?? this.status.baseUrl
    }
    for (let attempt = 0; attempt < 20; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      const result = await this.testServer(this.status.baseUrl)
      if (result.success) {
        this.status = {
          ...this.status,
          phase: 'complete',
          message: `llama-server 已启动并通过连接验证：${result.models.join(', ') || 'local-model'}。`
        }
        return this.getStatus()
      }
    }
    this.status = {
      ...this.status,
      phase: 'error',
      message: 'llama-server 已启动，但连接验证超时。',
      error: {
        code: 'LLAMA_SERVER_VERIFY_TIMEOUT',
        message: '请稍后手动点击测试连接，或检查模型是否仍在加载。'
      }
    }
    return this.getStatus()
  }

  public stopServer(): LlamaInstallStatus {
    if (this.serverProcess && !this.serverProcess.killed) {
      try {
        this.serverProcess.kill()
      } catch (e) {
        // ignore
      }
      this.serverProcess = null
    }
    
    // Synchronously launch taskkill in background to force close any dangling llama-server.exe processes
    if (process.platform === 'win32') {
      try {
        spawn('taskkill', ['/F', '/IM', 'llama-server.exe'], { shell: true })
      } catch (e) {
        // ignore
      }
    }
    
    this.status = { 
      ...this.status, 
      phase: 'idle', 
      message: 'llama-server 已停止并释放显存。',
      serverPid: undefined
    }
    return this.getStatus()
  }

  public async testServer(baseUrl = 'http://127.0.0.1:8080/v1'): Promise<LlamaServerTestResult> {
    try {
      const modelsResponse = await fetch(`${baseUrl.replace(/\/$/, '')}/models`, {
        signal: AbortSignal.timeout(8000)
      })
      if (!modelsResponse.ok) {
        return { success: false, baseUrl, models: [], chatOk: false, error: { code: 'LLAMA_MODELS_FAILED', message: `HTTP ${modelsResponse.status}` } }
      }
      const modelsJson: any = await modelsResponse.json()
      const models = Array.isArray(modelsJson?.data) ? modelsJson.data.map((item: any) => String(item.id)).filter(Boolean) : []
      const chatResponse = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: models[0] ?? 'local-model',
          messages: [{ role: 'user', content: 'Reply with OK.' }],
          max_tokens: 8,
          temperature: 0
        }),
        signal: AbortSignal.timeout(15000)
      })
      return {
        success: chatResponse.ok,
        baseUrl,
        models,
        chatOk: chatResponse.ok,
        error: chatResponse.ok ? undefined : { code: 'LLAMA_CHAT_FAILED', message: `HTTP ${chatResponse.status}` }
      }
    } catch (err: any) {
      return {
        success: false,
        baseUrl,
        models: [],
        chatOk: false,
        error: {
          code: err?.name === 'TimeoutError' ? 'LLAMA_SERVER_TIMEOUT' : 'LLAMA_SERVER_CONNECTION_FAILED',
          message: sanitizeLlamaLog(err?.message ?? String(err))
        }
      }
    }
  }

  public async checkServerHealth(baseUrl = 'http://127.0.0.1:8080/v1'): Promise<{ running: boolean; models: string[]; error?: string }> {
    const normalizedBase = baseUrl.replace(/\/+$/, '')
    try {
      const modelsResponse = await fetch(`${normalizedBase}/models`, {
        headers: { Authorization: 'Bearer local' },
        signal: AbortSignal.timeout(5000)
      })
      if (!modelsResponse.ok) {
        return { running: false, models: [], error: `HTTP ${modelsResponse.status}` }
      }
      const modelsJson: any = await modelsResponse.json()
      const models = Array.isArray(modelsJson?.data) ? modelsJson.data.map((item: any) => String(item.id)).filter(Boolean) : []
      return { running: true, models }
    } catch (err: any) {
      return { running: false, models: [], error: sanitizeLlamaLog(err?.message ?? String(err)) }
    }
  }

  public async openInstallRoot(): Promise<void> {
    const modelRootDir = SettingsService.getInstance().getSettings().modelRootDir
      ?? path.join(app.getPath('userData'), 'AIModels')
    const installRoot = this.status.installRoot ?? path.join(modelRootDir, 'llama-runtime')
    await fsp.mkdir(installRoot, { recursive: true })
    await shell.openPath(installRoot)
  }

  private async fetchLatestRelease(): Promise<LlamaReleaseInfo> {
    try {
      const response = await fetch(LLAMA_RELEASES_API, {
        headers: { 'User-Agent': 'DesignAssetManager-llama-installer' },
        signal: AbortSignal.timeout(10000)
      })
      if (!response.ok) return DEFAULT_LLAMA_RELEASE
      const payload: any = await response.json()
      return {
        tag_name: payload.tag_name,
        assets: Array.isArray(payload.assets)
          ? payload.assets.map((asset: any) => ({
              name: asset.name,
              browser_download_url: asset.browser_download_url,
              size: asset.size
            }))
          : []
      }
    } catch {
      return DEFAULT_LLAMA_RELEASE
    }
  }

  private async loadMirrorManifest(manifestPath?: string): Promise<LlamaMirrorManifest | undefined> {
    const candidates = [
      manifestPath,
      process.env.LLAMA_RUNTIME_MIRROR_MANIFEST
    ].filter(Boolean) as string[]

    for (const candidate of candidates) {
      try {
        const parsed = JSON.parse(await fsp.readFile(candidate, 'utf8')) as LlamaMirrorManifest
        if (Array.isArray(parsed.mirrors)) return parsed
      } catch {
        // Missing or invalid local mirror config is non-fatal.
      }
    }
    return undefined
  }

  private runCapture(command: string, args: string[], timeoutMs: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, { shell: false })
      let stdout = ''
      let stderr = ''
      const timer = setTimeout(() => {
        child.kill()
        reject(new Error('Command timeout'))
      }, timeoutMs)
      child.stdout.on('data', (chunk) => { stdout += chunk.toString() })
      child.stderr.on('data', (chunk) => { stderr += chunk.toString() })
      child.on('error', reject)
      child.on('close', (code) => {
        clearTimeout(timer)
        if (code === 0) resolve(stdout)
        else reject(new Error(stderr || `Exit ${code}`))
      })
    })
  }

  private async downloadPackage(pkg: LlamaRuntimePackage, targetPath: string, sender: WebContents, installId: string, progressBase: number): Promise<void> {
    await this.downloadUrl(pkg.mirrorUrl ?? pkg.officialUrl, pkg.officialUrl, targetPath, pkg.checksumSha256, sender, installId, progressBase, `正在下载 ${pkg.filename}。`)
  }

  private async downloadUrl(primaryUrl: string, fallbackUrl: string, targetPath: string, checksum: string | undefined, sender: WebContents, installId: string, progressBase: number, message: string): Promise<void> {
    try {
      await this.downloadOnce(primaryUrl, targetPath, checksum, sender, installId, progressBase, message)
    } catch (err) {
      if (primaryUrl !== fallbackUrl) {
        this.emit(sender, installId, 'downloading', progressBase, '镜像下载失败，已回退官方源。')
        await this.downloadOnce(fallbackUrl, targetPath, checksum, sender, installId, progressBase, message)
        return
      }
      throw err
    }
  }

  private async downloadOnce(url: string, targetPath: string, checksum: string | undefined, sender: WebContents, installId: string, progressBase: number, message: string): Promise<void> {
    const controller = this.abortController
    if (!controller) throw new Error('安装任务不存在。')

    const formatBytes = (bytes: number): string => {
      if (bytes === 0) return '0 B'
      const k = 1024
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
    }

    if (fs.existsSync(targetPath)) {
      if (checksum) {
        this.emit(sender, installId, 'downloading', progressBase, `正在校验已存在的 ${path.basename(targetPath)} 文件...`)
        const isOk = await this.verifyFileChecksum(targetPath, checksum)
        if (isOk) {
          const stats = await fsp.stat(targetPath).catch(() => null)
          const sizeStr = stats ? ` (${formatBytes(stats.size)})` : ''
          this.emit(sender, installId, 'downloading', progressBase + 20, `${message}已存在且校验通过，跳过下载。${sizeStr}`)
          return
        }
      } else {
        const headResponse = await fetch(url, { method: 'HEAD', signal: controller.signal }).catch(() => null)
        if (headResponse && headResponse.ok) {
          const total = Number(headResponse.headers.get('content-length') ?? 0)
          if (total > 0) {
            const stats = await fsp.stat(targetPath).catch(() => null)
            if (stats && stats.size === total) {
              this.emit(sender, installId, 'downloading', progressBase + 20, `${message}已存在且大小匹配 (${formatBytes(total)})，跳过下载。`)
              return
            }
          }
        }
      }
    }

    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok || !response.body) {
      throw new Error(`下载失败 HTTP ${response.status}`)
    }
    await fsp.mkdir(path.dirname(targetPath), { recursive: true })
    const tempPath = `${targetPath}.part`
    const total = Number(response.headers.get('content-length') ?? 0)
    let downloaded = 0
    const hash = crypto.createHash('sha256')
    const file = fs.createWriteStream(tempPath)
    const reader = response.body.getReader()

    const startTime = Date.now()
    let lastEmitTime = 0

    try {
      while (true) {
        const { value, done } = await reader.read()
        if (done) {
          const now = Date.now()
          const speed = downloaded / ((now - startTime) / 1000 || 1)
          const formattedSpeed = formatBytes(speed)
          const formattedDownloaded = formatBytes(downloaded)
          const formattedTotal = total > 0 ? formatBytes(total) : '未知大小'
          const detailPercent = total > 0 ? ' (100.0%)' : ''
          const progressMsg = `${message}已下载: ${formattedDownloaded} / ${formattedTotal}${detailPercent}，速度: ${formattedSpeed}/s`
          const percent = total > 0 ? progressBase + 20 : progressBase
          this.emit(sender, installId, 'downloading', percent, progressMsg)
          break
        }
        if (controller.signal.aborted) throw new Error('安装已取消。')
        const chunk = Buffer.from(value)
        downloaded += chunk.length
        hash.update(chunk)
        if (!file.write(chunk)) {
          await new Promise<void>((resolve) => file.once('drain', resolve))
        }
        const percent = total > 0 ? progressBase + Math.min(20, Math.round((downloaded / total) * 20)) : progressBase
        const now = Date.now()
        if (now - lastEmitTime >= 300) {
          lastEmitTime = now
          const speed = downloaded / ((now - startTime) / 1000 || 1)
          const formattedSpeed = formatBytes(speed)
          const formattedDownloaded = formatBytes(downloaded)
          const formattedTotal = total > 0 ? formatBytes(total) : '未知大小'
          const detailPercent = total > 0 ? ` (${((downloaded / total) * 100).toFixed(1)}%)` : ''
          const progressMsg = `${message}已下载: ${formattedDownloaded} / ${formattedTotal}${detailPercent}，速度: ${formattedSpeed}/s`
          this.emit(sender, installId, 'downloading', percent, progressMsg)
        }
      }
    } finally {
      await new Promise<void>((resolve) => file.end(resolve))
    }

    const digest = hash.digest('hex')
    if (checksum && digest.toLowerCase() !== checksum.toLowerCase()) {
      await fsp.rm(tempPath, { force: true })
      throw new Error('下载文件 SHA256 校验失败。')
    }
    await fsp.rename(tempPath, targetPath)
  }

  private async verifyFileChecksum(filePath: string, expectedChecksum: string): Promise<boolean> {
    try {
      const hash = crypto.createHash('sha256')
      const stream = fs.createReadStream(filePath)
      return new Promise<boolean>((resolve) => {
        stream.on('data', (chunk) => hash.update(chunk))
        stream.on('end', () => {
          const digest = hash.digest('hex')
          resolve(digest.toLowerCase() === expectedChecksum.toLowerCase())
        })
        stream.on('error', () => resolve(false))
      })
    } catch {
      return false
    }
  }

  private async extractZip(zipPath: string, destinationDir: string): Promise<void> {
    const buffer = await fsp.readFile(zipPath)
    assertSafeZipEntries(listZipEntries(buffer), destinationDir)
    await fsp.mkdir(destinationDir, { recursive: true })
    if (process.platform !== 'win32') {
      await new Promise<void>((resolve, reject) => {
        const child = spawn('unzip', ['-o', zipPath, '-d', destinationDir], { shell: false })
        let stderr = ''
        child.stderr.on('data', (chunk) => { stderr += chunk.toString() })
        child.on('error', reject)
        child.on('close', (code) => {
          if (code === 0) resolve()
          else reject(new Error(sanitizeLlamaLog(stderr || `unzip failed with ${code}`)))
        })
      })
      return
    }
    await new Promise<void>((resolve, reject) => {
      const powershellCmd = `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${destinationDir.replace(/'/g, "''")}' -Force`
      const child = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', powershellCmd], { shell: false })
      let stderr = ''
      child.stderr.on('data', (chunk) => { stderr += chunk.toString() })
      child.on('error', reject)
      child.on('close', (code) => {
        if (code === 0) resolve()
        else reject(new Error(sanitizeLlamaLog(stderr || `Expand-Archive failed with ${code}`)))
      })
    })
  }

  private findServerExecutable(runtimeDir: string): string | null {
    const executableName = process.platform === 'win32' ? 'llama-server.exe' : 'llama-server'
    const directCandidates = [
      path.join(runtimeDir, executableName),
      path.join(runtimeDir, 'bin', executableName),
      path.join(runtimeDir, 'build', 'bin', executableName)
    ]
    for (const candidate of directCandidates) {
      if (fs.existsSync(candidate)) return candidate
    }

    const stack = [runtimeDir]
    while (stack.length) {
      const current = stack.pop()!
      let entries: fs.Dirent[]
      try {
        entries = fs.readdirSync(current, { withFileTypes: true })
      } catch {
        continue
      }
      for (const entry of entries) {
        const fullPath = path.join(current, entry.name)
        if (entry.isDirectory()) {
          stack.push(fullPath)
        } else if (entry.name === executableName) {
          return fullPath
        }
      }
    }
    return null
  }

  private async updateLlamaBackend(plan: LlamaInstallPlan, modelPath: string): Promise<void> {
    const settingsService = SettingsService.getInstance()
    const settings = settingsService.getSettings()
    const defaultBackend: AiBackendConfig = {
      id: 'llama-local-openai',
      name: 'Llama 本地量化模型服务',
      type: 'llama-openai',
      enabled: true,
      baseUrl: plan.baseUrl,
      apiKey: 'local',
      defaultModel: path.basename(modelPath),
      timeoutMs: 120000,
      capabilities: {
        chat: true,
        vision: Boolean(plan.recommendedModel.supportsVision && plan.recommendedModel.mmprojFilename),
        embeddings: false,
        jsonOutput: true,
        modelList: true,
        modelManagement: false
      },
      priority: 50,
      notes: `由 Llama 本地服务安装向导自动配置：${plan.recommendedModel.name}。`
    }
    const current = settings.aiBackends ?? []
    const next = current.some((backend) => backend.id === defaultBackend.id)
      ? current.map((backend: AiBackendConfig) => backend.id === defaultBackend.id ? { ...backend, ...defaultBackend } : backend)
      : [defaultBackend, ...current]
    settingsService.saveSettings({
      modelRootDir: path.dirname(plan.installRoot),
      aiBackends: next,
      promptReverseSettings: {
        ...(settings.promptReverseSettings ?? {
          backendMode: 'llama-openai',
          maxNewTokens: DEFAULT_PROMPT_REVERSE_MAX_TOKENS,
          maxImageSize: 1024,
          temperature: 0.6,
          topP: 0.9
        }),
        backendMode: 'llama-openai',
        selectedExternalBackendId: defaultBackend.id,
        selectedExternalModel: defaultBackend.defaultModel
      }
    })
  }

  private emit(sender: WebContents, installId: string, phase: LlamaInstallProgressEvent['phase'], progress: number, message: string, error?: LlamaInstallProgressEvent['error']): void {
    const event: LlamaInstallProgressEvent = {
      installId,
      phase,
      progress,
      message: sanitizeLlamaLog(message),
      error
    }
    this.status = {
      ...this.status,
      installId,
      phase,
      progress,
      message: event.message,
      error
    }
    if (!sender.isDestroyed()) {
      sender.send(llamaRuntimeInstallProgressChannel(installId), event)
    }
  }
}
