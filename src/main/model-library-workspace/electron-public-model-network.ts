import type { ClientRequest, ClientRequestConstructorOptions } from 'electron'
import { assertPublicModelUrl, type PublicModelFetch } from './huggingface-model-source'

/** Electron 30 fetch rejects manual redirects rather than returning their response.
 * URLRequest lets Main inspect each target before synchronously approving it. */
export function createPublicModelFetch(requestFactory: (options: ClientRequestConstructorOptions) => ClientRequest,
  approveUrl: (url: string) => void = assertPublicModelUrl): PublicModelFetch {
  return async (url, options) => {
    approveUrl(url)
    if (options.method && options.method !== 'GET' || options.body || options.credentials !== 'omit') throw Error('MODEL_SOURCE_REQUEST_REJECTED')
    options.signal?.throwIfAborted()
    return new Promise<Response>((resolve, reject) => {
      const request = requestFactory({ url, method: 'GET', redirect: 'manual', credentials: 'omit',
        useSessionCookies: false, cache: 'no-store', referrerPolicy: 'no-referrer' })
      let redirects = 0, bodyController: ReadableStreamDefaultController<Uint8Array> | undefined, ended = false
      const stopBody = (error: Error) => { if (!ended) { ended = true; bodyController?.error(error) } }
      const abort = () => { request.abort(); stopBody(Error('MODEL_TRANSFER_CANCELLED')); reject(Error('MODEL_TRANSFER_CANCELLED')) }
      options.signal?.addEventListener('abort', abort, { once: true })
      const removeAbort = () => options.signal?.removeEventListener('abort', abort)
      request.on('error', () => { removeAbort(); stopBody(Error('MODEL_SOURCE_UNAVAILABLE')); reject(Error('MODEL_SOURCE_UNAVAILABLE')) })
      request.on('redirect', (_status, method, target) => {
        try {
          if (options.redirect === 'error' || method !== 'GET' || ++redirects > 5) throw Error('MODEL_SOURCE_REDIRECT_REJECTED')
          approveUrl(target); request.followRedirect()
        } catch (error) { request.abort(); removeAbort(); reject(error) }
      })
      request.on('response', incoming => {
        const body = new ReadableStream<Uint8Array>({
          start(controller) {
            bodyController = controller
            incoming.on('data', chunk => {
              if (ended) return
              controller.enqueue(chunk)
              // Electron's event response has no documented pause API. Bound queued bytes even if the disk slows.
              if ((controller.desiredSize ?? 0) < -8 * 1024 ** 2) { stopBody(Error('MODEL_TRANSFER_BUFFER_LIMIT')); request.abort() }
            })
            incoming.once('end', () => { if (!ended) { ended = true; controller.close() }; removeAbort() })
            incoming.once('error', () => { stopBody(Error('MODEL_SOURCE_UNAVAILABLE')); removeAbort() })
          },
          cancel() { ended = true; request.abort(); removeAbort() },
        }, { highWaterMark: 512 * 1024, size: chunk => chunk.byteLength })
        const headers = new Headers()
        for (const [name, value] of Object.entries(incoming.headers)) if (value) headers.set(name, Array.isArray(value) ? value.join(', ') : value)
        try { resolve(new Response(body, { status: incoming.statusCode, headers })) }
        catch { abort() }
      })
      try {
        for (const [name, value] of new Headers(options.headers)) request.setHeader(name, value)
        options.signal?.throwIfAborted(); request.end()
      } catch { abort() }
    })
  }
}
