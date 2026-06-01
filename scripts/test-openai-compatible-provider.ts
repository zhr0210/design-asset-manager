import http from 'http'
import assert from 'assert'
import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { OpenAICompatibleProvider, __openAiCompatibleTestUtils } from '../src/main/services/ai-worker/providers/openai-compatible.provider.ts'
import type { AiBackendConfig } from '../src/shared/types/ai-backend.types.ts'

function baseConfig(port: number): AiBackendConfig {
  return {
    id: 'test-openai-compatible',
    name: 'Test OpenAI-compatible',
    type: 'openai-compatible',
    enabled: true,
    baseUrl: `http://127.0.0.1:${port}/v1`,
    apiKey: 'secret-token',
    defaultModel: 'test-model',
    timeoutMs: 1000,
    capabilities: {
      chat: true,
      vision: true,
      embeddings: false,
      jsonOutput: true,
      modelList: true,
      modelManagement: false
    },
    priority: 1
  }
}

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
  const filePath = path.join(os.tmpdir(), `openai-compatible-test-${Date.now()}.png`)
  const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII='
  await fs.writeFile(filePath, Buffer.from(pngBase64, 'base64'))
  return filePath
}

async function main() {
  const provider = new OpenAICompatibleProvider()

  const invalid = await provider.listModels({ ...baseConfig(1), baseUrl: '' })
  assert.equal(invalid.error?.code, 'BACKEND_INVALID_BASE_URL')

  const unreachable = await provider.listModels({ ...baseConfig(9), baseUrl: 'http://127.0.0.1:9/v1' })
  assert.equal(unreachable.error?.code, 'BACKEND_CONNECTION_FAILED')

  await withServer((req, res) => {
    if (req.url === '/v1/models') {
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ data: [{ id: 'model-a' }] }))
      return
    }
    if (req.url === '/v1/chat/completions') {
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ choices: [{ message: { content: 'hello' } }] }))
      return
    }
    res.statusCode = 404
    res.end('not found')
  }, async (port) => {
    const config = baseConfig(port)
    const models = await provider.listModels(config)
    assert.equal(models.success, true)
    assert.equal(models.models[0].id, 'model-a')

    const chat = await provider.chat(config, { messages: [{ role: 'user', content: 'hi' }] })
    assert.equal(chat.success, true)
    assert.equal(chat.content, 'hello')
  })

  await withServer((_req, res) => {
    res.setHeader('Content-Type', 'text/plain')
    res.end('plain text')
  }, async (port) => {
    const result = await provider.listModels(baseConfig(port))
    assert.equal(result.error?.code, 'BACKEND_RESPONSE_PARSE_FAILED')
  })

  await withServer((_req, res) => {
    setTimeout(() => {
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ data: [] }))
    }, 100)
  }, async (port) => {
    const result = await provider.listModels({ ...baseConfig(port), timeoutMs: 10 })
    assert.equal(result.error?.code, 'BACKEND_TIMEOUT')
  })

  let visionPayload: any = null
  const imagePath = await createTinyPng()
  await withServer((req, res) => {
    if (req.url === '/v1/chat/completions') {
      let body = ''
      req.on('data', (chunk) => {
        body += chunk.toString()
      })
      req.on('end', () => {
        visionPayload = JSON.parse(body)
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  englishPrompt: 'minimal red square',
                  chineseDescription: '红色方块',
                  shortCaption: 'red square',
                  styleTags: ['minimal'],
                  subjectTags: ['square'],
                  compositionTags: [],
                  colorTags: ['red'],
                  usageTags: [],
                  negativePromptSuggestion: ''
                })
              }
            }
          ]
        }))
      })
      return
    }
    res.statusCode = 404
    res.end('not found')
  }, async (port) => {
    const result = await provider.runPromptReverse(baseConfig(port), {
      assetId: 'asset-1',
      filePath: imagePath,
      modelId: 'vision-model',
      maxImageSize: 768
    })
    assert.equal(result.success, true)
    const content = visionPayload.messages[1].content
    assert.equal(content[1].type, 'image_url')
    assert(content[1].image_url.url.startsWith('data:image/png;base64,'))
    assert.equal(result.data?.englishPrompt, 'minimal red square')
  })

  const truncatedPromptJson = `{ "englishPrompt": "A minimalist and elegant product flavor guide poster with four horizontal food photography panels.", "chineseDescription": "这是一张高端简约风格的风味描述海报。", "shortCaption": "风味描述", "styleTags": ["极简主义", "高端食品摄影"], "usageTags": ["咖啡产品包装", "食品品牌`
  const partial = __openAiCompatibleTestUtils.normalizePromptReverseData(truncatedPromptJson, baseConfig(1), 'vision-model')
  assert.equal(partial.englishPrompt, 'A minimalist and elegant product flavor guide poster with four horizontal food photography panels.')
  assert.equal(partial.chineseDescription, '这是一张高端简约风格的风味描述海报。')
  assert.deepEqual(partial.styleTags, ['极简主义', '高端食品摄影'])
  assert.deepEqual(partial.usageTags, ['咖啡产品包装'])
  assert.equal(partial.rawResponse, truncatedPromptJson)

  let retryCalls = 0
  let firstMaxTokens = 0
  let secondMaxTokens = 0
  const retryImagePath = await createTinyPng()
  await withServer((req, res) => {
    if (req.url === '/v1/chat/completions') {
      let body = ''
      req.on('data', (chunk) => {
        body += chunk.toString()
      })
      req.on('end', () => {
        retryCalls += 1
        const payload = JSON.parse(body)
        if (retryCalls === 1) {
          firstMaxTokens = payload.max_tokens
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ choices: [{ message: { content: truncatedPromptJson } }] }))
          return
        }

        secondMaxTokens = payload.max_tokens
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  englishPrompt: 'complete retry prompt',
                  chineseDescription: '重试后完整结果',
                  shortCaption: 'retry',
                  styleTags: ['完整'],
                  subjectTags: [],
                  compositionTags: [],
                  colorTags: [],
                  usageTags: ['食品品牌'],
                  negativePromptSuggestion: 'low quality'
                })
              }
            }
          ]
        }))
      })
      return
    }
    res.statusCode = 404
    res.end('not found')
  }, async (port) => {
    const result = await provider.runPromptReverse(baseConfig(port), {
      assetId: 'asset-retry',
      filePath: retryImagePath,
      modelId: 'vision-model',
      maxImageSize: 768,
      maxTokens: 512
    })

    assert.equal(result.success, true)
    assert.equal(retryCalls, 2)
    assert.equal(firstMaxTokens, 1536)
    assert.equal(secondMaxTokens, 3072)
    assert.equal(result.data?.englishPrompt, 'complete retry prompt')
    assert.deepEqual(result.data?.usageTags, ['食品品牌'])
  })

  const redacted = __openAiCompatibleTestUtils.sanitizeDetail('Bearer secret-token data:image/png;base64,AAAA')
  assert(!redacted?.includes('secret-token'))
  assert(!redacted?.includes('AAAA'))

  console.log('OpenAI-compatible provider script checks passed.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
