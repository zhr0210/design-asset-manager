import assert from 'node:assert/strict'
import http from 'node:http'
import {
  createGeneratedVisionProbeDataUrl,
  probeLlamaServer
} from '../src/main/services/llama-runtime/llama-runtime-server-probe'
import {
  getFreshLlamaMultimodalProbe,
  recordLlamaMultimodalProbe
} from '../src/main/services/ai-runtime/llama-multimodal-evidence.store'

async function withServer(
  handler: http.RequestListener,
  run: (baseUrl: string) => Promise<void>
): Promise<void> {
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

const generatedImage = await createGeneratedVisionProbeDataUrl()
assert.match(generatedImage, /^data:image\/png;base64,/)
assert.ok(generatedImage.length > 100)

const requestBodies: any[] = []
await withServer((req, res) => {
  if (req.url === '/v1/models') {
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ data: [{ id: 'Qwen3VL-2B-Instruct-Q4_K_M.gguf' }] }))
    return
  }

  if (req.url === '/v1/chat/completions') {
    const chunks: Buffer[] = []
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
    req.on('end', () => {
      requestBodies.push(JSON.parse(Buffer.concat(chunks).toString('utf8')))
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({
        choices: [{ message: { content: requestBodies.length === 1 ? 'OK' : 'VISION_OK red blue' } }]
      }))
    })
    return
  }

  res.statusCode = 404
  res.end('not found')
}, async (baseUrl) => {
  const result = await probeLlamaServer(baseUrl, {
    createVisionImageDataUrl: async () => 'data:image/png;base64,TEST_FIXTURE'
  })

  assert.equal(result.success, true)
  assert.equal(result.chatOk, true)
  assert.equal(result.visionOk, true)
  assert.equal(result.visionInput, 'generated_fixture')
  assert.equal(result.modelId, 'Qwen3VL-2B-Instruct-Q4_K_M.gguf')
  assert.ok(Number.isFinite(Date.parse(result.checkedAt)))
})

assert.equal(requestBodies.length, 2)
assert.equal(typeof requestBodies[0].messages[0].content, 'string')
assert.ok(Array.isArray(requestBodies[1].messages[0].content))
assert.equal(requestBodies[1].messages[0].content[1].type, 'image_url')
assert.equal(
  requestBodies[1].messages[0].content[1].image_url.url,
  'data:image/png;base64,TEST_FIXTURE'
)

await withServer((req, res) => {
  if (req.url === '/v1/models') {
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ data: [{ id: 'text-only.gguf' }] }))
    return
  }

  if (req.url === '/v1/chat/completions') {
    const chunks: Buffer[] = []
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
    req.on('end', () => {
      const body = JSON.parse(Buffer.concat(chunks).toString('utf8'))
      const isVision = Array.isArray(body.messages[0].content)
      res.statusCode = isVision ? 400 : 200
      res.setHeader('Content-Type', 'application/json')
      res.end(isVision
        ? JSON.stringify({ error: { message: 'vision unavailable' } })
        : JSON.stringify({ choices: [{ message: { content: 'OK' } }] }))
    })
    return
  }

  res.statusCode = 404
  res.end('not found')
}, async (baseUrl) => {
  const result = await probeLlamaServer(baseUrl, {
    createVisionImageDataUrl: async () => 'data:image/png;base64,TEST_FIXTURE'
  })
  assert.equal(result.success, false)
  assert.equal(result.chatOk, true)
  assert.equal(result.visionOk, false)
  assert.equal(result.error?.code, 'LLAMA_VISION_FAILED')
})

const cachedAt = '2026-06-06T00:00:00.000Z'
recordLlamaMultimodalProbe({
  success: true,
  baseUrl: 'http://127.0.0.1:8080/v1',
  models: ['test.gguf'],
  modelId: 'test.gguf',
  chatOk: true,
  visionOk: true,
  visionInput: 'generated_fixture',
  checkedAt: cachedAt
})
assert.equal(
  getFreshLlamaMultimodalProbe(Date.parse(cachedAt) + 60_000)?.visionOk,
  true
)
assert.equal(
  getFreshLlamaMultimodalProbe(Date.parse(cachedAt) + 6 * 60_000),
  null
)

console.log('llama-runtime-server-probe passed')
