import os from 'os'
import path from 'path'
import type {
  LlamaHardwareProfile,
  LlamaInstallPlan,
  LlamaModelCandidate,
  LlamaRuntimeAccelerator,
  LlamaRuntimePackage
} from '../../../shared/types/llama-runtime.types'

export interface LlamaReleaseAsset {
  name: string
  browser_download_url: string
  size?: number
}

export interface LlamaReleaseInfo {
  tag_name: string
  assets: LlamaReleaseAsset[]
}

export interface LlamaMirrorEntry {
  region: string
  source: string
  files?: Record<string, string>
  baseUrl?: string
  checksums?: Record<string, string>
}

export interface LlamaMirrorManifest {
  mirrors: LlamaMirrorEntry[]
}

interface LlamaDefaultAcceleratorRule {
  platform?: NodeJS.Platform | string
  accelerator: LlamaRuntimeAccelerator
}

interface LlamaRuntimePackagePatternRule {
  platform?: NodeJS.Platform | string
  arch?: string
  accelerator?: LlamaRuntimeAccelerator
  patterns: RegExp[]
}

const DEFAULT_LLAMA_ACCELERATOR_RULES: LlamaDefaultAcceleratorRule[] = [
  { platform: 'win32', accelerator: 'vulkan' },
  { accelerator: 'cpu' }
]

const LLAMA_RUNTIME_PACKAGE_PATTERN_RULES: LlamaRuntimePackagePatternRule[] = [
  {
    platform: 'darwin',
    arch: 'arm64',
    patterns: [/^llama-.*bin-macos-arm64\.zip/i, /^llama-.*bin-macos.*arm64.*\.zip/i]
  },
  {
    platform: 'darwin',
    patterns: [/^llama-.*bin-macos-x64\.zip/i, /^llama-.*bin-macos.*x64.*\.zip/i]
  },
  {
    platform: 'linux',
    arch: 'arm64',
    patterns: [/^llama-.*bin-linux-arm64\.zip/i, /^llama-.*bin-linux.*arm64.*\.zip/i]
  },
  {
    platform: 'linux',
    patterns: [/^llama-.*bin-linux-x64\.zip/i, /^llama-.*bin-linux.*x64.*\.zip/i]
  },
  {
    accelerator: 'cuda13',
    patterns: [/^llama-.*bin-win-cuda-13[\d.]*-x64\.zip/i, /^llama-.*bin-win-cu13[\d.]*-x64\.zip/i]
  },
  {
    accelerator: 'cuda12',
    patterns: [/^llama-.*bin-win-cuda-12[\d.]*-x64\.zip/i, /^llama-.*bin-win-cu12[\d.]*-x64\.zip/i]
  },
  {
    accelerator: 'vulkan',
    patterns: [/^llama-.*bin-win-vulkan-x64\.zip/i]
  },
  {
    patterns: [/^llama-.*bin-win-cpu-x64\.zip/i]
  }
]

const DEFAULT_LLAMA_RELEASE: LlamaReleaseInfo = {
  tag_name: 'b9437',
  assets: [
    {
      name: 'llama-b9437-bin-win-cuda-13.3-x64.zip',
      browser_download_url: 'https://github.com/ggml-org/llama.cpp/releases/download/b9437/llama-b9437-bin-win-cuda-13.3-x64.zip'
    },
    {
      name: 'cudart-llama-bin-win-cuda-13.3-x64.zip',
      browser_download_url: 'https://github.com/ggml-org/llama.cpp/releases/download/b9437/cudart-llama-bin-win-cuda-13.3-x64.zip'
    },
    {
      name: 'llama-b9437-bin-win-cuda-12.4-x64.zip',
      browser_download_url: 'https://github.com/ggml-org/llama.cpp/releases/download/b9437/llama-b9437-bin-win-cuda-12.4-x64.zip'
    },
    {
      name: 'cudart-llama-bin-win-cuda-12.4-x64.zip',
      browser_download_url: 'https://github.com/ggml-org/llama.cpp/releases/download/b9437/cudart-llama-bin-win-cuda-12.4-x64.zip'
    },
    {
      name: 'llama-b9437-bin-win-vulkan-x64.zip',
      browser_download_url: 'https://github.com/ggml-org/llama.cpp/releases/download/b9437/llama-b9437-bin-win-vulkan-x64.zip'
    },
    {
      name: 'llama-b9437-bin-win-cpu-x64.zip',
      browser_download_url: 'https://github.com/ggml-org/llama.cpp/releases/download/b9437/llama-b9437-bin-win-cpu-x64.zip'
    },
    {
      name: 'llama-b9437-bin-macos-arm64.zip',
      browser_download_url: 'https://github.com/ggml-org/llama.cpp/releases/download/b9437/llama-b9437-bin-macos-arm64.zip'
    },
    {
      name: 'llama-b9437-bin-macos-x64.zip',
      browser_download_url: 'https://github.com/ggml-org/llama.cpp/releases/download/b9437/llama-b9437-bin-macos-x64.zip'
    },
    {
      name: 'llama-b9437-bin-linux-x64.zip',
      browser_download_url: 'https://github.com/ggml-org/llama.cpp/releases/download/b9437/llama-b9437-bin-linux-x64.zip'
    }
  ]
}

const qwen3VlSizes = [
  {
    parameterSize: '2B',
    repoId: 'Qwen/Qwen3-VL-2B-Instruct-GGUF',
    filePrefix: 'Qwen3VL-2B-Instruct',
    minVramByQuant: { Q4_K_M: 6, Q8_0: 8, F16: 10 },
    sizeByQuant: { Q4_K_M: 1.5, Q8_0: 2.2, F16: 3.9 },
    officialReleaseDate: '2025-09-22',
    reason: '低显存和轻量快速场景，适合先体验本地视觉反推。'
  },
  {
    parameterSize: '4B',
    repoId: 'Qwen/Qwen3-VL-4B-Instruct-GGUF',
    filePrefix: 'Qwen3VL-4B-Instruct',
    minVramByQuant: { Q4_K_M: 8, Q8_0: 10, F16: 14 },
    sizeByQuant: { Q4_K_M: 3.2, Q8_0: 5.1, F16: 8.9 },
    officialReleaseDate: '2025-10-14',
    reason: '平衡质量与速度，适合作为多数本地视觉反推用户的默认选择。'
  },
  {
    parameterSize: '8B',
    repoId: 'Qwen/Qwen3-VL-8B-Instruct-GGUF',
    filePrefix: 'Qwen3VL-8B-Instruct',
    minVramByQuant: { Q4_K_M: 12, Q8_0: 16, F16: 24 },
    sizeByQuant: { Q4_K_M: 6.2, Q8_0: 9.6, F16: 17.4 },
    officialReleaseDate: '2025-10-14',
    reason: '高质量视觉理解选择，适合更细致的素材理解与 OCR 场景。'
  }
] as const

const officialQwen3VlQuants = [
  { quantization: 'Q4_K_M', label: 'Q4_K_M 省显存' },
  { quantization: 'Q8_0', label: 'Q8_0 高质量' },
  { quantization: 'F16', label: 'F16 原始精度' }
] as const

export const QWEN3_VL_GGUF_CANDIDATES: LlamaModelCandidate[] = qwen3VlSizes.flatMap((size) =>
  officialQwen3VlQuants.map((quant) => {
    const filename = `${size.filePrefix}-${quant.quantization}.gguf`
    return {
      id: `qwen3-vl-${size.parameterSize.toLowerCase()}-instruct-${quant.quantization.toLowerCase().replace(/_/g, '-')}`,
      name: `Qwen3-VL ${size.parameterSize} Instruct ${quant.label}`,
      repoId: size.repoId,
      filename,
      url: `https://huggingface.co/${size.repoId}/resolve/main/${filename}`,
      mmprojFilename: `mmproj-${size.filePrefix}-F16.gguf`,
      mmprojUrl: `https://huggingface.co/${size.repoId}/resolve/main/mmproj-${size.filePrefix}-F16.gguf`,
      quantization: quant.quantization,
      parameterSize: size.parameterSize,
      estimatedSizeGB: size.sizeByQuant[quant.quantization],
      recommendedMinVramGB: size.minVramByQuant[quant.quantization],
      supportsVision: true,
      officialReleaseDate: size.officialReleaseDate,
      reason: `${size.reason} 当前档位为 ${quant.label}。`
    }
  })
)

export function createHardwareProfile(input: Partial<LlamaHardwareProfile> = {}): LlamaHardwareProfile {
  const totalMemoryGB = input.totalMemoryGB ?? Math.round(os.totalmem() / 1024 / 1024 / 1024)
  const recommendedAccelerator = input.recommendedAccelerator ?? recommendAccelerator(input.cudaVersion, input.hasNvidiaGpu)
  return {
    platform: input.platform ?? process.platform,
    arch: input.arch ?? process.arch,
    cpuThreads: input.cpuThreads ?? os.cpus().length,
    totalMemoryGB,
    hasNvidiaGpu: input.hasNvidiaGpu ?? false,
    gpuName: input.gpuName,
    totalVramGB: input.totalVramGB,
    driverVersion: input.driverVersion,
    cudaVersion: input.cudaVersion,
    recommendedAccelerator,
    warnings: input.warnings ?? []
  }
}

export function recommendAccelerator(cudaVersion?: string, hasNvidiaGpu = false): LlamaRuntimeAccelerator {
  if (!hasNvidiaGpu) {
    return DEFAULT_LLAMA_ACCELERATOR_RULES.find((rule) => !rule.platform || rule.platform === process.platform)?.accelerator ?? 'cpu'
  }
  const major = Number((cudaVersion ?? '').split('.')[0])
  if (major >= 13) return 'cuda13'
  if (major >= 12) return 'cuda12'
  return 'vulkan'
}

export function selectModelCandidate(profile: LlamaHardwareProfile): LlamaModelCandidate {
  const vram = profile.totalVramGB ?? 0
  const preferred = vram >= 14
    ? 'qwen3-vl-8b-instruct-q4-k-m'
    : vram >= 10
      ? 'qwen3-vl-4b-instruct-q4-k-m'
      : 'qwen3-vl-2b-instruct-q4-k-m'
  return QWEN3_VL_GGUF_CANDIDATES.find((model) => model.id === preferred) ?? QWEN3_VL_GGUF_CANDIDATES[0]
}

function runtimePatterns(accelerator: LlamaRuntimeAccelerator, platform: string = process.platform, arch: string = process.arch): RegExp[] {
  const rule = LLAMA_RUNTIME_PACKAGE_PATTERN_RULES.find((candidate) => {
    return (!candidate.platform || candidate.platform === platform)
      && (!candidate.arch || candidate.arch === arch)
      && (!candidate.accelerator || candidate.accelerator === accelerator)
  })
  return rule?.patterns ?? []
}

function cudaRuntimePatterns(accelerator: LlamaRuntimeAccelerator): RegExp[] {
  if (accelerator === 'cuda13') {
    return [/^cudart-llama-bin-win-cuda-13[\d.]*-x64\.zip/i, /^cudart-llama-bin-win-cu13[\d.]*-x64\.zip/i]
  }
  if (accelerator === 'cuda12') {
    return [/^cudart-llama-bin-win-cuda-12[\d.]*-x64\.zip/i, /^cudart-llama-bin-win-cu12[\d.]*-x64\.zip/i]
  }
  return []
}

function findAsset(release: LlamaReleaseInfo, patterns: RegExp[]): LlamaReleaseAsset | null {
  return release.assets.find((asset) => patterns.some((pattern) => pattern.test(asset.name))) ?? null
}

function applyMirror(asset: LlamaReleaseAsset, releaseTag: string, manifest?: LlamaMirrorManifest): Pick<LlamaRuntimePackage, 'mirrorUrl' | 'sourceRegion' | 'checksumSha256' | 'verified'> {
  for (const mirror of manifest?.mirrors ?? []) {
    const direct = mirror.files?.[asset.name]
    if (direct) {
      return {
        mirrorUrl: direct,
        sourceRegion: mirror.region,
        checksumSha256: mirror.checksums?.[asset.name],
        verified: Boolean(mirror.checksums?.[asset.name])
      }
    }
    if (mirror.baseUrl) {
      return {
        mirrorUrl: `${mirror.baseUrl.replace(/\/$/, '')}/${releaseTag}/${asset.name}`,
        sourceRegion: mirror.region,
        checksumSha256: mirror.checksums?.[asset.name],
        verified: Boolean(mirror.checksums?.[asset.name])
      }
    }
  }
  return { verified: false }
}

function toRuntimePackage(asset: LlamaReleaseAsset, release: LlamaReleaseInfo, accelerator: LlamaRuntimeAccelerator, role: LlamaRuntimePackage['role'], manifest?: LlamaMirrorManifest): LlamaRuntimePackage {
  return {
    id: `${role}:${asset.name}`,
    role,
    accelerator,
    version: release.tag_name,
    filename: asset.name,
    officialUrl: asset.browser_download_url,
    sizeBytes: asset.size,
    ...applyMirror(asset, release.tag_name, manifest)
  }
}

export function createInstallPlan(input: {
  hardware: LlamaHardwareProfile
  release?: LlamaReleaseInfo
  mirrorManifest?: LlamaMirrorManifest
  installRoot: string
  downloadSource?: 'huggingface' | 'hf-mirror' | 'production-cdn'
}): LlamaInstallPlan {
  const release = input.release?.assets?.length ? input.release : DEFAULT_LLAMA_RELEASE
  const accelerator = input.hardware.recommendedAccelerator
  const runtimeAsset = findAsset(release, runtimePatterns(accelerator, input.hardware.platform, input.hardware.arch))
  if (!runtimeAsset) {
    throw new Error(`未找到适合 ${input.hardware.platform}/${input.hardware.arch}/${accelerator} 的 llama.cpp 安装包。`)
  }

  const packages = [toRuntimePackage(runtimeAsset, release, accelerator, 'runtime', input.mirrorManifest)]
  const cudaAsset = findAsset(release, cudaRuntimePatterns(accelerator))
  if (cudaAsset) {
    packages.push(toRuntimePackage(cudaAsset, release, accelerator, 'cuda-runtime', input.mirrorManifest))
  }

  const downloadSource = input.downloadSource ?? 'hf-mirror'
  const sourceHost = downloadSource === 'production-cdn'
    ? 'https://cdn.design-asset-manager.com'
    : downloadSource === 'hf-mirror'
      ? 'https://hf-mirror.com'
      : 'https://huggingface.co'

  const candidates = QWEN3_VL_GGUF_CANDIDATES.map((m) => {
    return {
      ...m,
      url: m.url.replace('https://huggingface.co', sourceHost),
      mmprojUrl: m.mmprojUrl?.replace('https://huggingface.co', sourceHost)
    }
  })

  const modelRaw = selectModelCandidate(input.hardware)
  const model = candidates.find((c) => c.id === modelRaw.id) || candidates[0]

  const modelDir = path.join(input.installRoot, 'models', 'gguf', model.id)
  const warnings = [...input.hardware.warnings]
  if (!packages.some((item) => item.verified)) {
    warnings.push('安装包未提供 SHA256 校验值；会校验下载完整性，但无法做强来源校验。')
  }
  warnings.push('模型列表仅包含 Qwen3-VL Instruct GGUF；视觉输入需要 LLM GGUF 与 mmproj 文件同时下载。')

  return {
    installId: `llama-${Date.now()}`,
    createdAt: new Date().toISOString(),
    runtimeVersion: release.tag_name,
    accelerator,
    runtimePackages: packages,
    modelCandidates: candidates,
    recommendedModel: model,
    installRoot: input.installRoot,
    runtimeDir: path.join(input.installRoot, 'runtimes', 'llama.cpp', release.tag_name),
    modelDir,
    baseUrl: 'http://127.0.0.1:8080/v1',
    warnings,
    downloadSource
  }
}

export function sanitizeLlamaLog(value: string): string {
  return value
    .replace(/sk-[A-Za-z0-9_-]+/g, '[REDACTED_API_KEY]')
    .replace(/data:image\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=]+/gi, '[REDACTED_IMAGE_DATA_URL]')
    .replace(/[A-Za-z]:\\Users\\[^\\\s]+/g, '[USER_HOME]')
}

export function assertSafeZipEntries(entries: string[], destinationDir: string): void {
  const root = path.resolve(destinationDir)
  for (const entry of entries) {
    const normalized = entry.replace(/\\/g, '/')
    if (!normalized || normalized.endsWith('/')) continue
    if (path.isAbsolute(normalized) || /^[A-Za-z]:\//.test(normalized) || normalized.includes('../')) {
      throw new Error(`ZIP 包含不安全路径: ${entry}`)
    }
    const target = path.resolve(root, normalized)
    if (target !== root && !target.startsWith(root + path.sep)) {
      throw new Error(`ZIP 解压路径越界: ${entry}`)
    }
  }
}

export function listZipEntries(buffer: Buffer): string[] {
  const eocdSignature = 0x06054b50
  const centralSignature = 0x02014b50
  let eocdOffset = -1
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65557); i -= 1) {
    if (buffer.readUInt32LE(i) === eocdSignature) {
      eocdOffset = i
      break
    }
  }
  if (eocdOffset < 0) throw new Error('无法解析 ZIP 中央目录。')

  const entryCount = buffer.readUInt16LE(eocdOffset + 10)
  let offset = buffer.readUInt32LE(eocdOffset + 16)
  const entries: string[] = []
  for (let index = 0; index < entryCount; index += 1) {
    if (buffer.readUInt32LE(offset) !== centralSignature) {
      throw new Error('ZIP 中央目录结构无效。')
    }
    const nameLength = buffer.readUInt16LE(offset + 28)
    const extraLength = buffer.readUInt16LE(offset + 30)
    const commentLength = buffer.readUInt16LE(offset + 32)
    entries.push(buffer.subarray(offset + 46, offset + 46 + nameLength).toString('utf8'))
    offset += 46 + nameLength + extraLength + commentLength
  }
  return entries
}

export { DEFAULT_LLAMA_RELEASE }
