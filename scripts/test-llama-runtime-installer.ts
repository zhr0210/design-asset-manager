import assert from 'assert/strict'
import http from 'http'
import {
  assertSafeZipEntries,
  createHardwareProfile,
  createInstallPlan,
  recommendAccelerator,
  sanitizeLlamaLog,
  type LlamaMirrorManifest,
  type LlamaReleaseInfo
} from '../src/main/services/llama-runtime/llama-runtime-planner.ts'
import { OpenAICompatibleProvider } from '../src/main/services/ai-worker/providers/openai-compatible.provider.ts'

const release: LlamaReleaseInfo = {
  tag_name: 'b9999',
  assets: [
    {
      name: 'llama-b9999-bin-win-cuda-13.3-x64.zip',
      browser_download_url: 'https://github.com/ggml-org/llama.cpp/releases/download/b9999/llama-b9999-bin-win-cuda-13.3-x64.zip',
      size: 10
    },
    {
      name: 'cudart-llama-bin-win-cuda-13.3-x64.zip',
      browser_download_url: 'https://github.com/ggml-org/llama.cpp/releases/download/b9999/cudart-llama-bin-win-cuda-13.3-x64.zip',
      size: 5
    },
    {
      name: 'llama-b9999-bin-win-cuda-12.4-x64.zip',
      browser_download_url: 'https://github.com/ggml-org/llama.cpp/releases/download/b9999/llama-b9999-bin-win-cuda-12.4-x64.zip'
    },
    {
      name: 'llama-b9999-bin-win-vulkan-x64.zip',
      browser_download_url: 'https://github.com/ggml-org/llama.cpp/releases/download/b9999/llama-b9999-bin-win-vulkan-x64.zip'
    }
  ]
}

const mirrorManifest: LlamaMirrorManifest = {
  mirrors: [
    {
      region: 'cn',
      source: 'local-mirror',
      files: {
        'llama-b9999-bin-win-cuda-13.3-x64.zip': 'https://mirror.example.cn/llama-b9999-bin-win-cuda-13.3-x64.zip'
      },
      checksums: {
        'llama-b9999-bin-win-cuda-13.3-x64.zip': 'a'.repeat(64)
      }
    }
  ]
}

async function withMockServer(handler: http.RequestListener, run: (baseUrl: string) => Promise<void>) {
  const server = http.createServer(handler)
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  assert(address && typeof address === 'object')
  try {
    await run(`http://127.0.0.1:${address.port}/v1`)
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
}

async function main() {
  assert.equal(recommendAccelerator('13.2', true), 'cuda13')
  assert.equal(recommendAccelerator('12.4', true), 'cuda12')
  assert.equal(recommendAccelerator(undefined, false), process.platform === 'win32' ? 'vulkan' : 'cpu')

  const profile = createHardwareProfile({
    platform: 'win32',
    arch: 'x64',
    hasNvidiaGpu: true,
    gpuName: 'NVIDIA GeForce RTX 5060 Ti',
    totalVramGB: 15.9,
    cudaVersion: '13.2',
    recommendedAccelerator: 'cuda13'
  })
  const plan = createInstallPlan({
    hardware: profile,
    release,
    mirrorManifest,
    installRoot: 'C:\\Users\\Example\\AppData\\Roaming\\Design Asset Manager\\llama-runtime'
  })
  assert.equal(plan.accelerator, 'cuda13')
  assert.equal(plan.recommendedModel.id, 'qwen3-vl-8b-instruct-q4-k-m')
  assert(plan.modelCandidates.every((model) => model.repoId.startsWith('Qwen/Qwen3-VL-')))
  assert(plan.modelCandidates.every((model) => model.supportsVision))
  assert.equal(plan.modelCandidates.length, 9)
  assert.deepEqual(
    Array.from(new Set(plan.modelCandidates.map((model) => model.quantization))).sort(),
    ['F16', 'Q4_K_M', 'Q8_0']
  )
  assert(plan.modelCandidates.some((model) => model.id === 'qwen3-vl-4b-instruct-q8-0'))
  assert.equal(plan.recommendedModel.mmprojFilename, 'mmproj-Qwen3VL-8B-Instruct-F16.gguf')
  assert.equal(plan.runtimePackages.length, 2)
  assert.equal(plan.runtimePackages[0].mirrorUrl, 'https://mirror.example.cn/llama-b9999-bin-win-cuda-13.3-x64.zip')
  assert.equal(plan.runtimePackages[0].verified, true)
  assert.equal(plan.runtimePackages[1].officialUrl.includes('cudart-llama'), true)

  assert.throws(
    () => createInstallPlan({
      hardware: { ...profile, recommendedAccelerator: 'cpu' },
      release: { tag_name: 'bad', assets: [{ name: 'not-a-runtime.zip', browser_download_url: 'https://example.invalid/not-a-runtime.zip' }] },
      installRoot: 'C:\\tmp'
    }),
    /未找到适合/
  )

  assert.doesNotThrow(() => assertSafeZipEntries(['llama-server.exe', 'bin/cuda.dll'], 'C:\\runtime\\llama'))
  assert.throws(() => assertSafeZipEntries(['../escape.exe'], 'C:\\runtime\\llama'), /不安全路径/)
  assert.throws(() => assertSafeZipEntries(['C:/escape.exe'], 'C:\\runtime\\llama'), /不安全路径|越界/)

  const redacted = sanitizeLlamaLog('api sk-secret123 data:image/png;base64,AAAA C:\\Users\\kilian\\secret\\model.gguf')
  assert(!redacted.includes('sk-secret123'))
  assert(!redacted.includes('data:image'))
  assert(!redacted.includes('C:\\Users\\kilian'))

  await withMockServer((req, res) => {
    if (req.url === '/v1/models') {
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ data: [{ id: 'Qwen3-8B-Q4_K_M.gguf' }] }))
      return
    }
    if (req.url === '/v1/chat/completions') {
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ choices: [{ message: { content: 'OK' } }] }))
      return
    }
    res.statusCode = 404
    res.end('not found')
  }, async (baseUrl) => {
    const provider = new OpenAICompatibleProvider()
    const config = {
      id: 'mock-llama',
      name: 'Mock Llama',
      type: 'llama-openai' as const,
      enabled: true,
      baseUrl,
      timeoutMs: 2000,
      capabilities: { chat: true, vision: false, embeddings: false, jsonOutput: true, modelList: true, modelManagement: false },
      priority: 1
    }
    const models = await provider.listModels(config)
    assert.equal(models.success, true)
    assert.deepEqual(models.models.map((model) => model.id), ['Qwen3-8B-Q4_K_M.gguf'])
    const chat = await provider.chat(config, {
      model: 'Qwen3-8B-Q4_K_M.gguf',
      messages: [{ role: 'user', content: 'Reply OK' }]
    })
    assert.equal(chat.success, true)
    assert.equal(chat.content, 'OK')
  })

  await withMockServer((_req, res) => {
    res.statusCode = 404
    res.end('missing')
  }, async (baseUrl) => {
    const provider = new OpenAICompatibleProvider()
    const result = await provider.listModels({
      id: 'mock-llama',
      name: 'Mock Llama',
      type: 'llama-openai',
      enabled: true,
      baseUrl,
      timeoutMs: 2000,
      capabilities: { chat: true, vision: false, embeddings: false, jsonOutput: true, modelList: true, modelManagement: false },
      priority: 1
    })
    assert.equal(result.success, false)
    assert(result.error?.code)
  })

  console.log('test-llama-runtime-installer passed')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
