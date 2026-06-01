import { execFile } from 'child_process'
import fs from 'fs/promises'
import os from 'os'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

type GpuInfo = {
  name: string
  memoryTotalMiB: number
  driverVersion: string
  cudaVersion?: string
}

type RuntimeRecommendation = {
  kind: 'cuda13' | 'cuda12' | 'vulkan' | 'cpu'
  reason: string
  assets: DownloadAsset[]
}

type ModelCandidate = {
  id: string
  url: string
  mirrors?: string[]
  task: 'text' | 'vision'
  sizeClass: 'small' | 'medium' | 'large'
  quant: string
  recommendation: string
}

type DownloadAsset = {
  name: string
  officialUrl: string
  mirrors: MirrorDownload[]
}

type MirrorDownload = {
  region: string
  source: string
  url: string
  mode: 'manifest' | 'template'
  available?: boolean
}

type MirrorManifest = {
  mirrors?: Array<{
    region: string
    source: string
    baseUrl?: string
    files?: Record<string, string>
  }>
}

const DEFAULT_BASE_URL = 'http://127.0.0.1:8080/v1'
const LLAMA_RELEASES_API = 'https://api.github.com/repos/ggml-org/llama.cpp/releases/latest'
const DEFAULT_GITHUB_MIRROR_TEMPLATES = [
  'https://gh.llkk.cc/{url}',
  'https://ghproxy.net/{url}'
]
const DEFAULT_HF_MIRROR_HOST = 'https://hf-mirror.com'
const BUILTIN_REGION_MIRRORS: Record<string, MirrorManifest['mirrors']> = {
  cn: [
    {
      region: 'cn',
      source: 'GitHub release proxy mirror',
      baseUrl: 'https://gh.llkk.cc/https://github.com/ggml-org/llama.cpp/releases/download'
    },
    {
      region: 'cn',
      source: 'GitHub release proxy mirror',
      baseUrl: 'https://ghproxy.net/https://github.com/ggml-org/llama.cpp/releases/download'
    }
  ],
  global: []
}

const CURATED_MODELS: ModelCandidate[] = [
  {
    id: 'Qwen/Qwen3-8B-GGUF',
    url: 'https://huggingface.co/Qwen/Qwen3-8B-GGUF',
    mirrors: ['https://hf-mirror.com/Qwen/Qwen3-8B-GGUF'],
    task: 'text',
    sizeClass: 'medium',
    quant: 'Q4_K_M / Q5_K_M',
    recommendation: '16GB 显存推荐文本模型，适合 prompt 润色、标签精修、摘要。'
  },
  {
    id: 'Qwen/Qwen3-4B-GGUF',
    url: 'https://huggingface.co/Qwen/Qwen3-4B-GGUF',
    mirrors: ['https://hf-mirror.com/Qwen/Qwen3-4B-GGUF'],
    task: 'text',
    sizeClass: 'small',
    quant: 'Q4_K_M / Q5_K_M',
    recommendation: '速度优先、低显存压力，适合先跑通服务。'
  },
  {
    id: 'ggml-org/gemma-3-4b-it-GGUF',
    url: 'https://huggingface.co/ggml-org/gemma-3-4b-it-GGUF',
    mirrors: ['https://hf-mirror.com/ggml-org/gemma-3-4b-it-GGUF'],
    task: 'vision',
    sizeClass: 'small',
    quant: 'Q4_K_M',
    recommendation: '小型多模态候选；只有确认 llama.cpp 当前构建支持该模型图像输入后才打开 vision。'
  },
  {
    id: 'ggml-org/gemma-3-12b-it-GGUF',
    url: 'https://huggingface.co/ggml-org/gemma-3-12b-it-GGUF',
    mirrors: ['https://hf-mirror.com/ggml-org/gemma-3-12b-it-GGUF'],
    task: 'vision',
    sizeClass: 'large',
    quant: 'Q4_K_M',
    recommendation: '16GB 显存可谨慎尝试，建议先关闭其他 GPU 任务。'
  }
]

function parseArgs() {
  const args = new Set(process.argv.slice(2))
  const getValue = (name: string, fallback: string) => {
    const idx = process.argv.indexOf(name)
    return idx >= 0 && process.argv[idx + 1] ? process.argv[idx + 1] : fallback
  }
  return {
    json: args.has('--json'),
    skipNetwork: args.has('--offline'),
    testServer: args.has('--test-server'),
    baseUrl: getValue('--base-url', DEFAULT_BASE_URL),
    model: getValue('--model', ''),
    region: getValue('--region', 'cn'),
    mirrorManifestPath: getValue('--mirror-manifest', ''),
    checkMirrors: args.has('--check-mirrors'),
    mirrorTemplates: getMirrorTemplates(getValue('--mirror-template', ''))
  }
}

function getMirrorTemplates(cliTemplate: string): string[] {
  const envTemplates = process.env.LLAMA_DOCTOR_GITHUB_MIRRORS
    ? process.env.LLAMA_DOCTOR_GITHUB_MIRRORS.split(';').map((item) => item.trim()).filter(Boolean)
    : []
  const templates = [
    cliTemplate,
    ...envTemplates,
    ...DEFAULT_GITHUB_MIRROR_TEMPLATES
  ].filter(Boolean)
  return Array.from(new Set(templates))
}

async function detectGpu(): Promise<GpuInfo | null> {
  try {
    const query = await execFileAsync('nvidia-smi', [
      '--query-gpu=name,memory.total,driver_version',
      '--format=csv,noheader'
    ])
    const [name, memoryRaw, driverVersion] = query.stdout.trim().split(',').map((part) => part.trim())
    const summary = await execFileAsync('nvidia-smi', [])
    const cudaVersion = summary.stdout.match(/CUDA Version:\s*([0-9.]+)/)?.[1]
    return {
      name,
      memoryTotalMiB: Number(memoryRaw.replace(/[^\d]/g, '')),
      driverVersion,
      cudaVersion
    }
  } catch {
    return null
  }
}

async function fetchJson(url: string): Promise<any | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'DesignAssetManager-llama-doctor'
      },
      signal: AbortSignal.timeout(10000)
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

async function fetchLatestRelease(skipNetwork: boolean): Promise<any | null> {
  if (skipNetwork) return null
  return fetchJson(LLAMA_RELEASES_API)
}

async function loadMirrorManifest(pathValue: string): Promise<MirrorManifest> {
  if (!pathValue) return {}
  try {
    const raw = await fs.readFile(pathValue, 'utf8')
    return JSON.parse(raw)
  } catch (error: any) {
    return {
      mirrors: [
        {
          region: 'invalid-manifest',
          source: `读取镜像清单失败: ${String(error?.message ?? error)}`
        }
      ]
    }
  }
}

function toMirrorUrl(officialUrl: string, template: string): string {
  const encoded = encodeURIComponent(officialUrl)
  if (template.includes('{url_encoded}')) return template.replace('{url_encoded}', encoded)
  if (template.includes('{url}')) return template.replace('{url}', officialUrl)
  return `${template.replace(/\/+$/, '')}/${officialUrl}`
}

function createDownloadAsset(asset: any, mirrorTemplates: string[], manifest: MirrorManifest, region: string): DownloadAsset {
  const officialUrl = String(asset.browser_download_url ?? '')
  const fileName = String(asset.name ?? '')
  const releaseTag = officialUrl.match(/\/download\/([^/]+)\//)?.[1] ?? ''
  const manifestMirrors = [
    ...(BUILTIN_REGION_MIRRORS[region] ?? []),
    ...(manifest.mirrors ?? [])
  ]
    .flatMap((mirror) => {
      if (!mirror) return []
      const exact = mirror.files?.[fileName]
      if (exact) {
        return [{ region: mirror.region, source: mirror.source, url: exact, mode: 'manifest' as const }]
      }
      if (mirror.baseUrl && releaseTag) {
        return [{
          region: mirror.region,
          source: mirror.source,
          url: `${mirror.baseUrl.replace(/\/+$/, '')}/${releaseTag}/${fileName}`,
          mode: 'manifest' as const
        }]
      }
      return []
    })

  return {
    name: fileName,
    officialUrl,
    mirrors: [
      ...manifestMirrors,
      ...(officialUrl ? mirrorTemplates.map((template) => ({
        region,
        source: 'URL template mirror',
        url: toMirrorUrl(officialUrl, template),
        mode: 'template' as const
      })) : [])
    ]
  }
}

function chooseRuntime(gpu: GpuInfo | null, release: any | null, mirrorTemplates: string[], manifest: MirrorManifest, region: string): RuntimeRecommendation {
  const assets = Array.isArray(release?.assets) ? release.assets : []
  const findAssets = (patterns: RegExp[]) => assets
    .filter((asset: any) => patterns.some((pattern) => pattern.test(asset.name)))
    .map((asset: any) => createDownloadAsset(asset, mirrorTemplates, manifest, region))

  if (gpu?.name.toLowerCase().includes('nvidia')) {
    const cudaMajor = Number(gpu.cudaVersion?.split('.')[0] ?? 0)
    if (cudaMajor >= 13) {
      const cuda13Assets = findAssets([
        /llama-.*bin-win-cuda-13[\d.]*-x64\.zip/i,
        /cudart-llama-bin-win-cuda-13[\d.]*-x64\.zip/i,
        /llama-.*bin-win-cu13[\d.]*-x64\.zip/i,
        /cudart-llama-bin-win-cu13[\d.]*-x64\.zip/i
      ])
      return {
        kind: 'cuda13',
        reason: `检测到 ${gpu.name}，显存 ${(gpu.memoryTotalMiB / 1024).toFixed(1)}GB，CUDA ${gpu.cudaVersion ?? 'unknown'}；优先推荐 Windows CUDA 13 包。`,
        assets: cuda13Assets
      }
    }

    const cuda12Assets = findAssets([
      /llama-.*bin-win-cuda-12[\d.]*-x64\.zip/i,
      /cudart-llama-bin-win-cuda-12[\d.]*-x64\.zip/i,
      /llama-.*bin-win-cu12[\d.]*-x64\.zip/i,
      /cudart-llama-bin-win-cu12[\d.]*-x64\.zip/i
    ])
    return {
      kind: 'cuda12',
      reason: `检测到 NVIDIA GPU，但 CUDA 主版本低于 13 或未知；推荐 Windows CUDA 12.4 包。`,
      assets: cuda12Assets
    }
  }

  const vulkanAssets = findAssets([/llama-.*bin-win-vulkan-x64\.zip/i])
  if (vulkanAssets.length > 0 || os.platform() === 'win32') {
    return {
      kind: 'vulkan',
      reason: '未检测到可用 NVIDIA CUDA 信息；推荐 Windows Vulkan 包作为 GPU/兼容性折中方案。',
      assets: vulkanAssets
    }
  }

  return {
    kind: 'cpu',
    reason: '未检测到 GPU 加速条件；仅推荐 CPU 包，速度会明显慢。',
    assets: findAssets([/llama-.*bin-win-cpu-x64\.zip/i])
  }
}

async function fetchHfCandidates(skipNetwork: boolean): Promise<ModelCandidate[]> {
  if (skipNetwork) return []
  const searches = [
    { query: 'Qwen3 GGUF', task: 'text' as const },
    { query: 'gemma-3 GGUF', task: 'vision' as const },
    { query: 'llava GGUF', task: 'vision' as const }
  ]

  const results: ModelCandidate[] = []
  for (const search of searches) {
    const payload = await fetchJson(`https://huggingface.co/api/models?search=${encodeURIComponent(search.query)}&limit=8`)
    if (!Array.isArray(payload)) continue
    for (const model of payload) {
      const id = String(model.id ?? '')
      if (!id || results.some((candidate) => candidate.id === id)) continue
      results.push({
        id,
        url: `https://huggingface.co/${id}`,
        mirrors: [`${DEFAULT_HF_MIRROR_HOST}/${id}`],
        task: search.task,
        sizeClass: inferSizeClass(id),
        quant: '查看 Files 中的 Q4_K_M / Q5_K_M / Q8_0 GGUF',
        recommendation: search.task === 'vision'
          ? '候选多模态模型；下载前确认 llama.cpp 当前构建支持该架构的图像输入。'
          : '候选文本 GGUF；适合文本任务，不应用于图片高级反推。'
      })
    }
  }
  return results
}

function inferSizeClass(id: string): ModelCandidate['sizeClass'] {
  const lower = id.toLowerCase()
  if (/(0\.5b|1b|2b|3b|4b)/.test(lower)) return 'small'
  if (/(7b|8b|9b)/.test(lower)) return 'medium'
  return 'large'
}

function rankModels(gpu: GpuInfo | null, models: ModelCandidate[]) {
  const vramGb = (gpu?.memoryTotalMiB ?? 0) / 1024
  return models
    .filter((model) => !isNoisyModel(model.id))
    .map((model) => {
      let score = 0
      if (/^(qwen|ggml-org|cjpais)\//i.test(model.id)) score += 2
      if (model.sizeClass === 'small') score += 3
      if (model.sizeClass === 'medium') score += vramGb >= 10 ? 4 : 1
      if (model.sizeClass === 'large') score += vramGb >= 16 ? 0 : -2
      if (model.task === 'vision') score += vramGb >= 12 ? 1 : -2
      return { ...model, score }
    })
    .sort((a, b) => b.score - a.score)
}

function isNoisyModel(id: string): boolean {
  return /(uncensored|heretic|roleplay|mtp|abliterated|merge|neo-code)/i.test(id)
}

async function testOpenAiServer(baseUrl: string, model: string) {
  try {
    const modelsRes = await fetch(`${baseUrl.replace(/\/+$/, '')}/models`, {
      signal: AbortSignal.timeout(5000)
    })
    const modelsText = await modelsRes.text()
    if (!modelsRes.ok) {
      return { success: false, code: 'BACKEND_MODEL_LIST_FAILED', message: modelsText }
    }

    const modelsPayload = JSON.parse(modelsText)
    const modelIds = Array.isArray(modelsPayload.data) ? modelsPayload.data.map((item: any) => item.id).filter(Boolean) : []
    const selectedModel = model || modelIds[0]
    if (!selectedModel) {
      return { success: false, code: 'BACKEND_MODEL_NOT_SELECTED', models: modelIds }
    }

    const chatRes = await fetch(`${baseUrl.replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({
        model: selectedModel,
        messages: [{ role: 'user', content: 'Reply with one short sentence.' }],
        temperature: 0.1,
        max_tokens: 32
      })
    })
    const chatText = await chatRes.text()
    if (!chatRes.ok) {
      return { success: false, code: 'BACKEND_CHAT_FAILED', models: modelIds, message: chatText }
    }

    const chatPayload = JSON.parse(chatText)
    return {
      success: true,
      models: modelIds,
      selectedModel,
      chatPreview: chatPayload?.choices?.[0]?.message?.content ?? ''
    }
  } catch (error: any) {
    return { success: false, code: 'BACKEND_CONNECTION_FAILED', message: String(error?.message ?? error) }
  }
}

async function checkMirrorAvailability(runtime: RuntimeRecommendation): Promise<RuntimeRecommendation> {
  const checkedAssets = []
  for (const asset of runtime.assets) {
    const checkedMirrors = []
    for (const mirror of asset.mirrors) {
      checkedMirrors.push({
        ...mirror,
        available: await canHead(mirror.url)
      })
    }
    checkedAssets.push({ ...asset, mirrors: checkedMirrors })
  }
  return { ...runtime, assets: checkedAssets }
}

async function canHead(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(8000)
    })
    return res.ok
  } catch {
    return false
  }
}

function startupCommand(runtime: RuntimeRecommendation, modelPath = 'C:\\Models\\your-model.gguf') {
  const gpuLayers = runtime.kind === 'cpu' ? 0 : 999
  return [
    '.\\llama-server.exe',
    `  -m "${modelPath}"`,
    '  --host 127.0.0.1',
    '  --port 8080',
    '  -c 4096',
    `  -ngl ${gpuLayers}`
  ].join(' `\n')
}

async function main() {
  const args = parseArgs()
  const gpu = await detectGpu()
  const release = await fetchLatestRelease(args.skipNetwork)
  const manifest = await loadMirrorManifest(args.mirrorManifestPath)
  const runtimeRaw = chooseRuntime(gpu, release, args.mirrorTemplates, manifest, args.region)
  const runtime = args.checkMirrors ? await checkMirrorAvailability(runtimeRaw) : runtimeRaw
  const hfCandidates = await fetchHfCandidates(args.skipNetwork)
  const models = rankModels(gpu, [...CURATED_MODELS, ...hfCandidates])
  const serverTest = args.testServer ? await testOpenAiServer(args.baseUrl, args.model) : null

  const result = {
    hardware: {
      os: `${os.type()} ${os.release()} ${os.arch()}`,
      gpu
    },
    runtime,
    mirrors: {
      githubTemplates: args.mirrorTemplates,
      region: args.region,
      manifestPath: args.mirrorManifestPath || null,
      huggingFaceHost: DEFAULT_HF_MIRROR_HOST,
      policy: '官方 release asset 是基准；地区镜像通过文件名/版本清单或 baseUrl 派生，保持一一对应；脚本不自动下载。'
    },
    models: models.slice(0, 12),
    command: startupCommand(runtime),
    serverTest,
    notes: [
      '只做推荐和检测，不自动下载 llama.cpp，不自动下载 GGUF，不自动启动服务。',
      '纯文本 GGUF 不要开启 vision；只有多模态模型确认支持图片输入后才开启。',
      'Design Asset Manager 设置页 Base URL 建议填写 http://127.0.0.1:8080/v1。'
    ]
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
    return
  }

  console.log('\nllama-doctor 结果')
  console.log('================')
  console.log(`系统: ${result.hardware.os}`)
  console.log(`GPU: ${gpu ? `${gpu.name}, ${(gpu.memoryTotalMiB / 1024).toFixed(1)}GB, driver ${gpu.driverVersion}, CUDA ${gpu.cudaVersion ?? 'unknown'}` : '未检测到 NVIDIA GPU'}`)
  console.log(`\n推荐运行时: ${runtime.kind}`)
  console.log(runtime.reason)
  if (runtime.assets.length > 0) {
    console.log('\n推荐下载包:')
    runtime.assets.forEach((asset) => {
      console.log(`- ${asset.name}`)
      console.log(`  official: ${asset.officialUrl}`)
      asset.mirrors.forEach((mirror, index) => {
        const availability = typeof mirror.available === 'boolean' ? ` [${mirror.available ? 'OK' : '不可用'}]` : ''
        console.log(`  mirror${index + 1}:  ${mirror.url}${availability}`)
        console.log(`            region=${mirror.region}, source=${mirror.source}, mode=${mirror.mode}`)
      })
    })
  } else {
    console.log('\n未能在线拉取 release asset；请手动打开 https://github.com/ggml-org/llama.cpp/releases 选择对应 Windows 包。')
    console.log('镜像规则仍可用：拿到 official asset 文件名后可用 --mirror-manifest 指向本地/地区镜像清单。')
  }

  console.log('\n推荐模型候选:')
  models.slice(0, 8).forEach((model, index) => {
    console.log(`${index + 1}. [${model.task}] ${model.id} (${model.quant})`)
    console.log(`   ${model.recommendation}`)
    console.log(`   official: ${model.url}`)
    model.mirrors?.forEach((mirror, mirrorIndex) => console.log(`   mirror${mirrorIndex + 1}:  ${mirror}`))
  })

  console.log('\n启动命令模板:')
  console.log(startupCommand(runtime))

  if (serverTest) {
    console.log('\n服务连接测试:')
    console.log(JSON.stringify(serverTest, null, 2))
  } else {
    console.log(`\n服务测试未执行。需要测试时运行: npm.cmd run llama-doctor -- --test-server --base-url ${DEFAULT_BASE_URL}`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
