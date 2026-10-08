import fs from 'node:fs/promises'
import path from 'node:path'
import { randomBytes } from 'node:crypto'
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { StringDecoder } from 'node:string_decoder'
import type { ManagedVisionConfiguration } from '../../model-library/vision-model-binding'
import type { VisionInvocation } from '../../visual-ai/openai-vision.provider'
import { MAX_VISION_RESPONSE_BYTES } from '../../visual-ai/openai-vision.provider'
import { analysisOutputSchema } from '../../visual-ai/analysis-output-contract'

async function boundedJson(response: Response, signal: AbortSignal) {
  if (!response.body) throw Error('LOCAL_RUNTIME_PROTOCOL_FAILED')
  const parts: Uint8Array[] = []; let bytes = 0
  try { for await (const part of response.body as unknown as AsyncIterable<Uint8Array>) {
    signal.throwIfAborted(); bytes += part.length
    if (bytes > MAX_VISION_RESPONSE_BYTES) throw Error('AI_RESPONSE_TOO_LARGE')
    parts.push(part)
  } } finally { await response.body.cancel().catch(() => {}) }
  try { return JSON.parse(Buffer.concat(parts).toString('utf8')) } catch { throw Error('LOCAL_RUNTIME_PROTOCOL_FAILED') }
}

/** Private loopback transport; credentials remain in this closure and an owned
 * key file, never renderer state, argv, diagnostics or model metadata. */
export async function launchManagedGguf(configuration: ManagedVisionConfiguration, signal: AbortSignal) {
  const native = configuration.native, bundle = configuration.gguf
  if (!native || !bundle) throw Error('LOCAL_RUNTIME_UNCONFIGURED')
  const { binding, plan } = native
  const requestDirectory = await fs.mkdtemp(path.join(path.dirname(binding.root), 'request-'))
  const keyFile = path.join(requestDirectory, 'api-key'), key = randomBytes(32).toString('hex')
  await fs.writeFile(keyFile, key, { flag: 'wx', mode: 0o600 })
  const language = bundle.files.find(file => !file.name.split('/').at(-1)!.startsWith('mmproj-'))!
  const projector = bundle.files.find(file => file.name.split('/').at(-1)!.startsWith('mmproj-'))!
  const args = ['--host', '127.0.0.1', '--port', '0', '--no-webui', '--api-key-file', keyFile,
    '--model', path.join(configuration.root, language.name), '--mmproj', path.join(configuration.root, projector.name),
    '--alias', configuration.model!, '--fit', 'off', '--parallel', '1', '--ctx-size', String(plan.context),
    '--batch-size', String(plan.batch), '--ubatch-size', String(plan.microBatch), '--gpu-layers', String(plan.gpuLayers),
    '--cache-type-k', plan.kvType, '--cache-type-v', plan.kvType, '--threads', String(native.threads),
    '--threads-batch', String(native.threads), '--image-max-tokens', '256', '--cache-ram', '0',
    // INFO=3 carries the bound ephemeral port. TRACE=4 is deliberately excluded.
    '--no-cache-prompt', '--no-context-shift', '--sleep-idle-seconds', '-1', '--log-verbosity', '3']
  if (plan.deviceIndex !== null) args.push('--device', `CUDA${plan.deviceIndex}`)
  if (!plan.projectorOnGpu) args.push('--no-mmproj-offload')
  if (!plan.kvOnGpu) args.push('--no-kv-offload')
  let child: ChildProcessWithoutNullStreams
  const startedAfter = Date.now()
  try {
    signal.throwIfAborted()
    child = spawn(binding.executable, args, { cwd: binding.root, shell: false, windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'], env: { SystemRoot: process.env.SystemRoot, PATH: binding.root } })
  } catch (error) { await fs.unlink(keyFile); await fs.rmdir(requestDirectory); throw error }
  const startedBefore = Date.now() + 1000
  let baseUrl: string | undefined, resolvePort!: () => void, rejectPort!: (error: Error) => void
  const port = new Promise<void>((resolve, reject) => { resolvePort = resolve; rejectPort = reject })
  let logBytes = 0, oom = false, closed = false, gpuAllocationBytes = 0
  const decoders = [new StringDecoder('utf8'), new StringDecoder('utf8')], buffers = ['', '']
  const ingest = (data: Buffer, stream: number) => {
    logBytes += data.length
    if (logBytes > 2 * 1024 ** 2) { rejectPort(Error('LOCAL_RUNTIME_LOG_LIMIT')); child.kill(); return }
    buffers[stream] += decoders[stream].write(data)
    if (Buffer.byteLength(buffers[stream]) > 65536) { rejectPort(Error('LOCAL_RUNTIME_PROTOCOL_FAILED')); child.kill(); return }
    for (let end = buffers[stream].indexOf('\n'); end >= 0; end = buffers[stream].indexOf('\n')) {
      const line = buffers[stream].slice(0, end); buffers[stream] = buffers[stream].slice(end + 1)
      if (/out of memory|CUDA error.*alloc|failed to allocate/i.test(line)) oom = true
      const listening = /listening (?:on|at) http:\/\/127\.0\.0\.1:(\d{1,5})/.exec(line) ??
        /hostname: 127\.0\.0\.1, port: (\d{1,5})/.exec(line)
      if (listening) {
        const value = Number(listening[1])
        if (value < 1 || value > 65535 || (baseUrl && baseUrl !== `http://127.0.0.1:${value}`)) {
          rejectPort(Error('LOCAL_RUNTIME_PROTOCOL_FAILED')); child.kill(); return
        }
        baseUrl = `http://127.0.0.1:${value}`; resolvePort()
      }
      const allocated = /CUDA\d+.*buffer size\s*=\s*([0-9.]+) MiB/.exec(line)
      if (allocated) gpuAllocationBytes += Math.ceil(Number(allocated[1]) * 1024 ** 2)
    }
  }
  child.stdout.on('data', data => ingest(data, 0)); child.stderr.on('data', data => ingest(data, 1))
  child.once('error', () => rejectPort(Error('LOCAL_RUNTIME_START_FAILED')))
  child.once('close', () => { closed = true; rejectPort(Error(oom ? 'LOCAL_OOM' : 'LOCAL_RUNTIME_EXITED')) })
  const cancel = () => { rejectPort(Error('LOCAL_RUNTIME_CANCELLED')); child.kill() }
  signal.addEventListener('abort', cancel, { once: true })
  const request = async (endpoint: string, init: RequestInit, requestSignal: AbortSignal) => {
    if (closed || !baseUrl) throw Error('LOCAL_RUNTIME_EXITED')
    const response = await fetch(baseUrl + endpoint, { ...init, signal: requestSignal, redirect: 'error', credentials: 'omit',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` } })
    const value = await boundedJson(response, requestSignal)
    if (!response.ok) {
      const message = typeof value?.error?.message === 'string' ? value.error.message : ''
      throw Error(/out of memory|failed to allocate/i.test(message) ? 'LOCAL_OOM' : `LOCAL_HTTP_${response.status}`)
    }
    return value
  }
  const ready = (async () => {
    await port
    for (;;) {
      signal.throwIfAborted()
      if (closed) throw Error(oom ? 'LOCAL_OOM' : 'LOCAL_RUNTIME_EXITED')
      const response = await fetch(baseUrl! + '/health', { signal, credentials: 'omit', redirect: 'error' })
      const status = response.status; await response.body?.cancel()
      if (status === 200) break
      if (status !== 503) throw Error('LOCAL_RUNTIME_PROTOCOL_FAILED')
      await new Promise<void>((resolve, reject) => {
        const abort = () => { clearTimeout(timer); reject(Error('LOCAL_RUNTIME_CANCELLED')) }
        const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve() }, 150)
        signal.addEventListener('abort', abort, { once: true })
      })
    }
    const models = await request('/v1/models', { method: 'GET' }, signal)
    if (!models?.data?.some((model: any) => model.id === configuration.model)) throw Error('LOCAL_RUNTIME_BINDING_CHANGED')
  })()
  // The owner awaits ready after attaching close/error accounting.
  void ready.catch(() => {})
  return { child, ready, launch: { startedAfter, startedBefore }, gpuAllocation: () => gpuAllocationBytes,
    async invoke(input: Pick<VisionInvocation, 'systemPrompt' | 'userPrompt' | 'imageDataUrl' | 'maxTokens' | 'signal' | 'outputContract'>) {
      input.signal.throwIfAborted()
      return request('/v1/chat/completions', { method: 'POST', body: JSON.stringify({ model: configuration.model,
        temperature: 0, max_tokens: input.maxTokens, stream: false, response_format: { type: 'json_object',
          ...(input.outputContract ? { schema: analysisOutputSchema(input.outputContract) } : {}) },
        messages: [{ role: 'system', content: input.systemPrompt }, { role: 'user', content: [
          { type: 'text', text: input.userPrompt }, { type: 'image_url', image_url: { url: input.imageDataUrl } },
        ] }] }) }, input.signal)
    },
    async dispose() {
      signal.removeEventListener('abort', cancel)
      if (!closed && child.pid) throw Error('LOCAL_RUNTIME_EXIT_PENDING')
      await fs.unlink(keyFile); await fs.rmdir(requestDirectory)
    },
  }
}
