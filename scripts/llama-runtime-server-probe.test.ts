import assert from 'node:assert/strict'
import http from 'node:http'
import {
  createGeneratedVisionProbeDataUrl,
  matchesGeneratedVisionProbe,
  probeLlamaServer
} from '../src/main/services/llama-runtime/llama-runtime-server-probe'

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
        choices: [{ message: { content: requestBodies.length === 1 ? 'OK' : JSON.stringify({left:'red',right:'blue'}) } }]
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

console.log('llama-runtime-server-probe passed')

assert.equal(matchesGeneratedVisionProbe('I cannot see the image.'),false)
assert.equal(matchesGeneratedVisionProbe('VISION_OK red blue'),false)
assert.equal(matchesGeneratedVisionProbe('{"left":"blue","right":"red"}'),false)
assert.equal(matchesGeneratedVisionProbe('{"left":"RED","right":"Blue"}'),true)
assert.equal(matchesGeneratedVisionProbe('```json\n{"left":"red","right":"blue"}\n```'),true)
for (const content of ['I cannot process images.','VISION_OK','{"left":"green","right":"blue"}']) {
 let requests=0
 const result=await probeLlamaServer('http://127.0.0.1:8080/v1',{
  createVisionImageDataUrl:async()=>generatedImage,
  fetchImpl:async(_url,init)=>{
   assert.equal(init?.redirect,'error')
   requests++
   return new Response(JSON.stringify(requests===1?{data:[{id:'synthetic'}]}:{choices:[{message:{content:requests===2?'OK':content}}]}),{status:200})
  }
 })
 assert.equal(result.chatOk,true)
 assert.equal(result.visionOk,false,'An HTTP 200 with a refusal or wrong observation cannot establish visual capability')
 assert.equal(result.success,false)
}
console.log('Vision probe rejects nonempty refusal, wrong colors and reversed halves')

let emptyModelCalls=0
const emptyModels=await probeLlamaServer('http://127.0.0.1:8080/v1',{fetchImpl:async()=>{emptyModelCalls++;return new Response(JSON.stringify({data:[{}, {id:null}]}),{status:200})}})
assert.equal(emptyModels.success,false)
assert.equal(emptyModels.error?.code,'LLAMA_MODELS_EMPTY')
assert.equal(emptyModelCalls,1,'No invented model name is submitted for inference')
