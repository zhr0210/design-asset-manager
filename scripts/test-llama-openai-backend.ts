import assert from 'assert'
import http from 'http'
import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { LlamaOpenAIProvider } from '../src/main/services/ai-worker/providers/llama-openai.provider.ts'
import { resolvePromptReverseRoute } from '../src/main/services/ai-worker/prompt-reverse-router.ts'

async function withServer(handler: http.RequestListener, run: (port: number) => Promise<void>) {
  const server = http.createServer(handler)
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const port = (server.address() as any).port
  try {
    await run(port)
  } finally {
    server.close()
  }
}

async function createTinyPng(): Promise<string> {
  const filePath = path.join(os.tmpdir(), `llama-openai-test-${Date.now()}.png`)
  const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII='
  await fs.writeFile(filePath, Buffer.from(pngBase64, 'base64'))
  return filePath
}

async function main() {
  const provider = new LlamaOpenAIProvider()
  const config = provider.getDefaultConfig()

  assert.equal(config.id, 'llama-local-openai')
  assert.equal(config.type, 'llama-openai')
  assert.equal(config.enabled, false)
  assert.equal(config.capabilities.vision, false)

  const blocked = await provider.runPromptReverse(
    { ...config, enabled: true, defaultModel: 'text-only-gguf' },
    { assetId: 'asset-1', filePath: 'missing.png', modelId: 'text-only-gguf' }
  )

  assert.equal(blocked.success, false)
  assert.equal(blocked.error?.code, 'BACKEND_VISION_NOT_SUPPORTED')

  const missingImage = await provider.runPromptReverse(
    {
      ...config,
      enabled: true,
      defaultModel: 'vision-model',
      capabilities: { ...config.capabilities, vision: true }
    },
    { assetId: 'asset-1', filePath: 'missing.png', modelId: 'vision-model' }
  )

  assert.equal(missingImage.success, false)
  assert.equal(missingImage.error?.code, 'IMAGE_ENCODE_FAILED')

  let visionPayload: any = null
  const imagePath = await createTinyPng()
  await withServer((req, res) => {
    if (req.url === '/v1/models') {
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ data: [{ id: 'llava-gguf' }] }))
      return
    }

    if (req.url === '/v1/chat/completions') {
      let body = ''
      req.on('data', (chunk) => {
        body += chunk.toString()
      })
      req.on('end', () => {
        visionPayload = JSON.parse(body)
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({
          choices: [{ message: { content: '{"englishPrompt":"llama vision prompt"}' } }]
        }))
      })
      return
    }

    res.statusCode = 404
    res.end('not found')
  }, async (port) => {
    const enabledVisionConfig = {
      ...config,
      enabled: true,
      baseUrl: `http://127.0.0.1:${port}/v1`,
      defaultModel: 'llava-gguf',
      capabilities: { ...config.capabilities, vision: true }
    }

    const health = await provider.healthCheck(enabledVisionConfig)
    assert.equal(health.success, true)
    assert.deepEqual(health.models, ['llava-gguf'])

    const result = await provider.runPromptReverse(enabledVisionConfig, {
      assetId: 'asset-1',
      filePath: imagePath,
      modelId: 'llava-gguf'
    })
    assert.equal(result.success, true)
    assert.equal(result.provider, 'prompt.llama-openai')
    assert.equal(result.data?.englishPrompt, 'llama vision prompt')
    assert(visionPayload.messages[1].content[1].image_url.url.startsWith('data:image/png;base64,'))
  })

  const routeConfig = {
    ...config,
    enabled: true,
    defaultModel: 'route-model',
    capabilities: { ...config.capabilities, vision: true }
  }

  assert.equal(resolvePromptReverseRoute({
    aiBackends: [routeConfig],
    promptReverseSettings: { backendMode: 'native-qwen3vl', maxNewTokens: 512, maxImageSize: 1024, temperature: 0.6, topP: 0.9 }
  }).mode, 'native-qwen3vl')

  const llamaRoute = resolvePromptReverseRoute({
    aiBackends: [routeConfig],
    promptReverseSettings: {
      backendMode: 'llama-openai',
      selectedExternalBackendId: routeConfig.id,
      maxNewTokens: 512,
      maxImageSize: 1024,
      temperature: 0.6,
      topP: 0.9
    }
  })
  assert.equal(llamaRoute.mode, 'llama-openai')
  assert.equal(llamaRoute.backend?.id, routeConfig.id)

  const openAiRoute = resolvePromptReverseRoute({
    aiBackends: [{ ...routeConfig, type: 'openai-compatible' }],
    promptReverseSettings: {
      backendMode: 'openai-compatible',
      selectedExternalBackendId: routeConfig.id,
      maxNewTokens: 512,
      maxImageSize: 1024,
      temperature: 0.6,
      topP: 0.9
    }
  })
  assert.equal(openAiRoute.mode, 'openai-compatible')
  assert.equal(openAiRoute.backend?.type, 'openai-compatible')

  console.log('Llama OpenAI backend script checks passed.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
