import assert from 'node:assert/strict'
import http from 'node:http'
import { test } from 'node:test'
import type { AiBackendConfig } from '../src/shared/types/ai-backend.types'
import { runVisionRequest } from '../src/main/visual-ai/openai-vision.transport'
import { parseVisionOutput } from '../src/main/visual-ai/vision-response'

const output = { caption: '蓝色几何版式', ocrText: '', prompt: 'A blue geometric composition with "quoted" text and {curves}.', tags: [' 蓝色 ', '蓝色', '几何'] }
const expected = { ...output, tags: ['蓝色', '几何'] }
const envelope = (content: unknown, finishReason: string | undefined = 'stop') => ({ choices: [{ finish_reason: finishReason, message: { content } }] })
const json = JSON.stringify(output)

await test('complete response wrappers preserve fields and normalize duplicate suggestions', () => {
  for (const text of [json, `\uFEFF${json}`, `\`\`\`json\n${json}\n\`\`\``, `分析结果如下：\n${json}\n以上为画面概述。`]) {
    assert.deepEqual(parseVisionOutput(envelope(text)), expected)
  }
  assert.deepEqual(parseVisionOutput(envelope([{ type: 'text', text: json.slice(0, 30) }, { type: 'text', text: json.slice(30) }])), expected)
  assert.deepEqual(parseVisionOutput({ choices: [{ text: json }] }), expected)
  assert.deepEqual(parseVisionOutput(envelope(json, undefined)), expected)
})

await test('partial, ambiguous, refused and malformed results never become successful evidence', () => {
  for (const payload of [
    envelope(json, 'length'), envelope('{"caption":"部分结果","prompt":"unfinished'),
    envelope('说明：```json\n{"caption":"partial"'),
  ]) assert.throws(() => parseVisionOutput(payload), /AI_RESPONSE_TRUNCATED/)
  for (const payload of [
    envelope('not JSON'), envelope(`${json}\n${json}`), envelope(`[${json}]`),
    envelope(json, 'content_filter'), envelope(json, 'tool_calls'), envelope(null),
    envelope([{ type: 'image_url', text: json }]), envelope('{}'), envelope('{"prompt":"p",}'),
    envelope(JSON.stringify({ ...output, tags: [''] })), envelope(JSON.stringify({ ...output, tags: Array(31).fill('标签') })),
    envelope(JSON.stringify({ ...output, prompt: ' ' })), envelope(JSON.stringify({ ...output, caption: 'x'.repeat(16_001) })),
    envelope(JSON.stringify({ ...output, ocrText: null })), { choices: [] }
  ]) assert.throws(() => parseVisionOutput(payload), /AI_RESPONSE_INVALID/)
})

type Request = { model: string; temperature: number; max_tokens: number; messages: any[] }
async function withService(run: (call: (signal?: AbortSignal) => ReturnType<typeof runVisionRequest>, requests: Request[]) => Promise<void>, respond: (res: http.ServerResponse, index: number) => void) {
  const requests: Request[] = []
  const server = http.createServer(async (req, res) => {
    assert.equal(req.url, '/v1/chat/completions')
    assert.equal(req.method, 'POST')
    assert.equal(req.headers.authorization, 'Bearer synthetic-key')
    const chunks: Buffer[] = []
    for await (const chunk of req) chunks.push(Buffer.from(chunk))
    requests.push(JSON.parse(Buffer.concat(chunks).toString()))
    respond(res, requests.length)
  })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const backend: AiBackendConfig = { id: 'synthetic', name: 'synthetic', type: 'openai-compatible', enabled: true,
    baseUrl: `http://127.0.0.1:${(server.address() as { port: number }).port}/v1/`, apiKey: ' synthetic-key ', defaultModel: 'synthetic', timeoutMs: 1000, priority: 1,
    capabilities: { chat: true, vision: true, embeddings: false, jsonOutput: true, modelList: true, modelManagement: false } }
  try {
    await run((signal = new AbortController().signal) => runVisionRequest({ backend, model: 'synthetic', purpose: 'reverse', jpeg: new Uint8Array([1, 2, 3]), signal }), requests)
  } finally {
    server.closeAllConnections()
    await new Promise<void>(resolve => server.close(() => resolve()))
  }
}

await test('truncation retries once with more output room and identical reviewed input', async () => {
  for (const first of [envelope(json, 'length'), envelope('{"caption":"unfinished')]) {
    await withService(async (call, requests) => {
      assert.deepEqual(await call(), expected)
      assert.equal(requests.length, 2)
      assert.deepEqual(requests.map(request => request.max_tokens), [1536, 3072])
      for (const request of requests) {
        assert.deepEqual(Object.keys(request).sort(), ['max_tokens', 'messages', 'model', 'temperature'])
        assert.equal(request.temperature, .2)
      }
      assert.equal(requests[0].model, requests[1].model)
      assert.deepEqual(requests[0].messages[1].content[1], requests[1].messages[1].content[1])
      assert.match(requests[0].messages[0].content, /中文/)
      assert.match(requests[0].messages[0].content, /专用OCR/)
    }, (res, index) => res.end(JSON.stringify(index === 1 ? first : envelope(json))))
  }
})

await test('repeated truncation ends after two attempts', async () => {
  await withService(async (call, requests) => {
    await assert.rejects(call(), /AI_RESPONSE_TRUNCATED/)
    assert.equal(requests.length, 2)
  }, res => res.end(JSON.stringify(envelope(json, 'length'))))
})

await test('invalid results, oversized bodies, HTTP failures and redirects are not retried', async () => {
  for (const [respond, error] of [
    [(res: http.ServerResponse) => res.end(JSON.stringify(envelope('not json'))), /AI_RESPONSE_INVALID/],
    [(res: http.ServerResponse) => res.end('broken outer JSON'), /AI_RESPONSE_INVALID/],
    [(res: http.ServerResponse) => res.end('x'.repeat(512_001)), /AI_RESPONSE_TOO_LARGE/],
    [(res: http.ServerResponse) => { res.writeHead(401); res.end('private service detail') }, /AI_HTTP_401/],
    [(res: http.ServerResponse) => { res.writeHead(400); res.end('context budget exceeded') }, /AI_HTTP_400/],
    [(res: http.ServerResponse) => { res.writeHead(429); res.end() }, /AI_HTTP_429/],
    [(res: http.ServerResponse) => { res.writeHead(302, { Location: '/v1/chat/completions' }); res.end() }, /fetch failed/]
  ] as const) {
    await withService(async (call, requests) => {
      await assert.rejects(call(), error)
      assert.equal(requests.length, 1)
    }, respond)
  }
})

await test('the shared deadline aborts response reading on the retry', async () => {
  let retryStarted!: () => void
  const retry = new Promise<void>(resolve => { retryStarted = resolve })
  await withService(async (call, requests) => {
    const abort = new AbortController()
    const result = call(abort.signal)
    const rejected = assert.rejects(result, error => error instanceof Error && error.name === 'AbortError')
    await retry
    abort.abort()
    await rejected
    assert.equal(requests.length, 2)
  }, (res, index) => {
    if (index === 1) res.end(JSON.stringify(envelope(json, 'length')))
    else { res.writeHead(200); res.write('{'); retryStarted() }
  })
})

await test('already cancelled requests never transmit', async () => {
  await withService(async (call, requests) => {
    const abort = new AbortController(); abort.abort()
    await assert.rejects(call(abort.signal), error => error instanceof Error && error.name === 'AbortError')
    assert.equal(requests.length, 0)
  }, res => res.end(JSON.stringify(envelope(json))))
})
