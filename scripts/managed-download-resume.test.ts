import assert from 'node:assert/strict'
import http from 'node:http'
import { gzipSync } from 'node:zlib'
import { createResumableImageTransfer } from '../src/main/managed-download/resumable-image-transfer'
import { createManagedDownloads } from '../src/main/managed-download/managed-download'

const bytes = Buffer.from(Array.from({ length: 32768 }, (_, index) => index % 251))
const replacement = Buffer.from(Array.from({ length: 32768 }, (_, index) => (index + 37) % 251))
const cut = 8192
const requests = new Map<string, { range?: string; validator?: string }[]>()
const server = http.createServer((request, response) => {
  const mode = request.url!.slice(1)
  const calls = requests.get(mode) ?? []; requests.set(mode, calls)
  calls.push({ range: request.headers.range, validator: request.headers['if-range'] as string | undefined })
  assert.equal(request.headers.cookie, undefined)
  assert.equal(request.headers.authorization, undefined)
  assert.deepEqual([...new Set(request.headers['accept-encoding']?.split(',').map(value => value.trim()))], ['identity'])
  const tag = mode === 'weak' ? 'W/"v1"' : mode === 'missing' ? undefined : '"v1"'
  if (calls.length === 1) {
    response.writeHead(200, { 'Content-Length': bytes.length, ...(tag ? { ETag: tag } : {}) })
    response.write(bytes.subarray(0, cut))
    return // Client abort closes this synthetic connection after the prefix arrives.
  }
  const payload = ['changed', 'changed-206'].includes(mode) ? replacement : bytes
  if (request.headers.range) {
    const start = Number(/bytes=(\d+)-/.exec(request.headers.range)![1])
    assert.equal(request.headers['if-range'], '"v1"')
    if (mode === 'changed' || mode === 'ignore') {
      response.writeHead(200, { 'Content-Length': payload.length, ETag: mode === 'changed' ? '"v2"' : '"v1"' }); response.end(payload); return
    }
    if (mode === '416') { response.writeHead(416, { 'Content-Range': `bytes */${payload.length}` }); response.end(); return }
    const rangeStart = mode === 'bad-range' ? start + 1 : start
    const end = mode === 'segments' ? Math.min(payload.length - 1, start + 4095) : payload.length - 1
    const raw = payload.subarray(rangeStart, end + 1)
    const body = mode === 'encoded-range' ? gzipSync(raw) : raw
    response.writeHead(206, {
      'Content-Length': body.length, 'Content-Range': `bytes ${rangeStart}-${end}/${payload.length}`,
      ETag: mode === 'changed-206' ? '"v2"' : '"v1"', ...(mode === 'encoded-range' ? { 'Content-Encoding': 'gzip' } : {})
    }); response.end(body); return
  }
  response.writeHead(200, { 'Content-Length': payload.length, ETag: '"v2"' }); response.end(payload)
})
await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
const address = server.address(); if (!address || typeof address === 'string') throw new Error('fixture address unavailable')
const origin = `http://127.0.0.1:${address.port}`
try {
  for (const mode of ['resume', 'segments', 'changed', 'ignore', 'bad-range', 'changed-206', 'encoded-range', '416', 'weak', 'missing']) {
    const transfer = createResumableImageTransfer(`${origin}/${mode}`)
    const abort = new AbortController()
    await assert.rejects(transfer.read(abort.signal, received => { if (received >= cut) abort.abort() }))
    assert.equal(transfer.retainedByteLength(), ['weak', 'missing'].includes(mode) ? 0 : cut)
    const progress: number[] = []
    const result = await transfer.read(new AbortController().signal, received => { progress.push(received) })
    assert.equal(Buffer.from(result).equals(['changed', 'changed-206'].includes(mode) ? replacement : bytes), true, `Exact bytes for ${mode}`)
    assert.equal(transfer.retainedByteLength(), 0)
    const calls = requests.get(mode)!
    if (['weak', 'missing'].includes(mode)) { assert.equal(calls[1].range, undefined); assert.equal(calls[1].validator, undefined) }
    else assert.equal(calls[1].range, `bytes=${cut}-`)
    if (['bad-range', 'changed-206', 'encoded-range', '416'].includes(mode)) { assert.equal(calls.length, 3); assert.equal(calls[2].range, undefined) }
    if (mode === 'changed' || mode === 'ignore') { assert.equal(calls.length, 2); assert.ok(progress.includes(0)) }
  }

  for (const response of [
    () => new Response(new Uint8Array([1, 2, 3]), { status: 206, headers: { 'Content-Range': 'bytes 0-2/3', ETag: '"v1"' } }),
    () => new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { 'Content-Length': '2', ETag: '"v1"' } }),
    () => new Response(new Uint8Array([1]), { status: 200, headers: { 'Content-Length': String(33 * 1024 * 1024), ETag: '"v1"' } })
  ]) {
    const transfer = createResumableImageTransfer('https://fixture.invalid/never-contacted', async () => response())
    await assert.rejects(transfer.read(new AbortController().signal, () => {}))
    assert.equal(transfer.retainedByteLength(), 0)
  }

  // A controller retry consumes the same task identity and records the actual retry count.
  let imported = 0; let importedBytes: Uint8Array | undefined; let retryCount = -1
  let generation = 'generation:one'
  const downloader = createManagedDownloads({
    host: {
      inspect: () => ({ state: 'ready', identity: 'library:fixture', generation }),
      importDownloadedImage: async input => { imported++; importedBytes = input.bytes; return { assetId: `asset:${input.requestId}` } }
    },
    history: { saveTask: task => { retryCount = task.retry_count; return { ...task, created_at: 'fixture', updated_at: 'fixture' } } },
    onImported: () => {}
  })
  const job = downloader.run(downloader.prepare({ url: `${origin}/controller` }).receipt)
  await eventually(() => downloader.list().find(item => item.id === job.id)!.receivedBytes >= cut)
  downloader.cancel(job.id)
  await eventually(() => downloader.list().find(item => item.id === job.id)!.state === 'cancelled')
  downloader.retry(job.id)
  assert.throws(() => downloader.retry(job.id))
  await eventually(() => downloader.list().find(item => item.id === job.id)!.state === 'completed')
  assert.equal(imported, 1); assert.equal(Buffer.from(importedBytes!).equals(bytes), true); assert.equal(retryCount, 1)
  assert.throws(() => downloader.cancel(job.id)); assert.throws(() => downloader.retry(job.id))
  const old = downloader.run(downloader.prepare({ url: `${origin}/old-scope` }).receipt)
  await eventually(() => downloader.list().find(item => item.id === old.id)!.receivedBytes >= cut)
  generation = 'generation:two'; downloader.invalidate()
  await eventually(() => downloader.list().find(item => item.id === old.id)!.state === 'cancelled')
  assert.throws(() => downloader.retry(old.id)); assert.equal(imported, 1)
  downloader.invalidate()
  // Exercise the aggregate retained-data budget with bounded in-memory HTTP fixtures.
  const prefixSize = 22 * 1024 * 1024; const objectSize = 23 * 1024 * 1024
  const cacheCalls = new Map<string, (string | null)[]>()
  const prefix = new Uint8Array(prefixSize)
  const bounded = createManagedDownloads({
    host: { inspect: () => ({ state: 'ready', identity: 'library:cache', generation: 'generation:cache' }), importDownloadedImage: async input => ({ assetId: `asset:${input.requestId}` }) },
    history: { saveTask: task => ({ ...task, created_at: 'fixture', updated_at: 'fixture' }) }, onImported: () => {},
    fetch: async (url, init) => {
      const key = String(url); const calls = cacheCalls.get(key) ?? []; cacheCalls.set(key, calls)
      const range = new Headers(init?.headers).get('range'); calls.push(range)
      if (calls.length === 1) {
        let remove = () => {}
        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(prefix)
            const abort = () => controller.error(init!.signal!.reason)
            init!.signal!.addEventListener('abort', abort, { once: true })
            remove = () => init!.signal!.removeEventListener('abort', abort)
          }, cancel() { remove() }
        })
        return new Response(stream, { headers: { ETag: '"cache"', 'Content-Length': String(objectSize) } })
      }
      const offset = range ? Number(/bytes=(\d+)-/.exec(range)![1]) : 0
      return new Response(new Uint8Array(objectSize - offset), { status: range ? 206 : 200, headers: {
        ETag: '"cache"', 'Content-Length': String(objectSize - offset), ...(range ? { 'Content-Range': `bytes ${offset}-${objectSize - 1}/${objectSize}` } : {})
      } })
    }
  })
  const cached: string[] = []
  for (let index = 0; index < 3; index++) {
    const item = bounded.run(bounded.prepare({ url: `https://cache-fixture.invalid/${index}` }).receipt); cached.push(item.id)
    await eventually(() => bounded.list().find(job => job.id === item.id)!.receivedBytes === prefixSize)
    bounded.cancel(item.id)
    await eventually(() => bounded.list().find(job => job.id === item.id)!.state === 'cancelled')
  }
  bounded.retry(cached[0])
  await eventually(() => bounded.list().find(job => job.id === cached[0])!.state === 'completed')
  assert.equal(cacheCalls.get('https://cache-fixture.invalid/0')![1], null, 'Oldest prefix is released when retained data exceeds 64 MiB.')
  bounded.retry(cached[2])
  await eventually(() => bounded.list().find(job => job.id === cached[2])!.state === 'completed')
  assert.equal(cacheCalls.get('https://cache-fixture.invalid/2')![1], `bytes=${prefixSize}-`)
  bounded.invalidate()
  // A host may ignore the fetch signal once it returns headers. Body cancellation must still settle.
  const ignoredAbort = new AbortController()
  let cancelBody = 0
  const ignoredTransfer = createResumableImageTransfer('https://fixture.invalid/ignore-abort', (async () => new Response(new ReadableStream({
    start(controller) { controller.enqueue(new Uint8Array([1, 2, 3])) },
    cancel() { cancelBody++ }
  }), { headers: { ETag: '"body-v1"', 'Content-Length': '99' } })) as typeof fetch)
  const interrupted = ignoredTransfer.read(ignoredAbort.signal, n => { if (n) setTimeout(() => ignoredAbort.abort(), 5) })
  let bodyDeadline: ReturnType<typeof setTimeout>
  try { await assert.rejects(Promise.race([interrupted, new Promise((_, reject) => { bodyDeadline = setTimeout(() => reject(new Error('body cancellation timed out')), 1000) })]), error => error instanceof Error && error.name === 'AbortError') }
  finally { clearTimeout(bodyDeadline!) }
  assert.equal(cancelBody, 1)

  console.log('Managed download resume passed: exact Range/If-Range bytes, version/full fallback, malformed ranges, size/framing, cancellation, one task and generation boundaries.')
} finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())) }

async function eventually(done: () => boolean) {
  for (let attempt = 0; attempt < 300; attempt++) { if (done()) return; await new Promise(resolve => setTimeout(resolve, 10)) }
  throw new Error('fixture timed out')
}
