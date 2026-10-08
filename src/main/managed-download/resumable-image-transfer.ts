const MAX_BYTES = 32 * 1024 * 1024
const MAX_RESPONSES = 16

type Range = { start: number; end: number; total: number }

export interface TransferCheckpoints {
  load(): Promise<{ bytes: Uint8Array; etag: string | null; total: number | null }>
  reset(etag: string | null, total: number | null): Promise<void>
  append(bytes: Uint8Array): Promise<void>
}
/** The optional checkpoint port owns durability; transport owns HTTP version validation. */
export function createResumableImageTransfer(url: string, request: typeof fetch = fetch, checkpoints?: TransferCheckpoints) {
  let chunks: Uint8Array[] = []
  let received = 0
  let total: number | null = null
  let etag: string | null = null
  let reading = false
  const discard = () => { chunks = []; received = 0; total = null; etag = null }
  const resumable = () => !!etag && received > 0 && (total === null || received < total)
  return {
    discard,
    retainedByteLength: () => resumable() ? received : 0,
    async read(signal: AbortSignal, onProgress: (received: number, total: number | null) => void): Promise<Uint8Array> {
      if (reading) throw new Error('下载正在进行。')
      reading = true
      let fallbackUsed = false
      const pending = Buffer.alloc(checkpoints ? 1024 * 1024 : 0)
      let pendingLength = 0
      let checkpointFailed = false
      const flushCheckpoint = async () => {
        if (!checkpoints || !pendingLength) return
        try { await checkpoints.append(pending.subarray(0, pendingLength)); pendingLength = 0 }
        catch (error) { checkpointFailed = true; throw error }
      }
      try {
        if (checkpoints) {
          const saved = await checkpoints.load()
          chunks = saved.bytes.length ? [saved.bytes] : []; received = saved.bytes.length; total = saved.total; etag = saved.etag
        }
        for (let attempt = 0; attempt < MAX_RESPONSES; attempt++) {
          signal.throwIfAborted()
          const offset = resumable() ? received : 0
          if (!offset) discard()
          onProgress(received, total)
          const response = await request(url, {
            method: 'GET', redirect: 'error', credentials: 'omit', signal,
            headers: { 'Accept-Encoding': 'identity', ...(offset ? { Range: `bytes=${offset}-`, 'If-Range': etag! } : {}) }
          })
          const identityEncoding = !response.headers.get('content-encoding') || response.headers.get('content-encoding')?.toLowerCase() === 'identity'
          const length = contentLength(response.headers.get('content-length'))
          let range: Range | null = null
          if (offset && response.status === 206) {
            range = parseRange(response.headers.get('content-range'))
            if (!identityEncoding || !range || range.start !== offset || range.total > MAX_BYTES ||
              (total !== null && range.total !== total) || strongETag(response.headers.get('etag')) !== etag ||
              (length !== null && length !== range.end - range.start + 1) ||
              response.headers.get('content-type')?.toLowerCase().startsWith('multipart/')) range = null
          }
          if (offset && (response.status === 416 || (response.status === 206 && !range))) {
            await response.body?.cancel()
            discard(); onProgress(0, null)
            if (fallbackUsed) throw new Error('下载来源未能提供一致的数据，请稍后重新下载。')
            fallbackUsed = true
            continue // A single bounded full restart, never append uncertain bytes.
          }
          if (length !== null && (length < 0 || length > MAX_BYTES)) { await response.body?.cancel(); throw new Error('图片长度无效或超过限制。') }
          if (response.status === 200) {
            // Range was ignored or If-Range no longer matched: replace the old prefix.
            discard(); pendingLength = 0
            etag = identityEncoding ? strongETag(response.headers.get('etag')) : null
            total = identityEncoding ? length : null
            await checkpoints?.reset(etag, total)
          } else if (range) total = range.total
          else { await response.body?.cancel(); throw new Error('下载来源暂时不可用。') }
          if (length !== null && (!Number.isSafeInteger(length) || length < 0 || length > MAX_BYTES)) {
            discard(); await response.body?.cancel(); throw new Error('图片大小超过限制或长度无效。')
          }
          onProgress(received, total)
          const reader = response.body?.getReader()
          if (!reader) { discard(); throw new Error('下载未返回图片数据。') }
          // Own body cancellation as well as request cancellation: an idle reader must not
          // keep cancellation or Library shutdown waiting.
          const abortReader = () => { void reader.cancel().catch(() => {}) }
          signal.addEventListener('abort', abortReader, { once: true })
          if (signal.aborted) abortReader()
          const before = received
          const expectedBodyLength = range ? range.end - range.start + 1 : identityEncoding ? length : null
          let finished = false
          try {
            while (true) {
              signal.throwIfAborted()
              const part = await reader.read()
              signal.throwIfAborted()
              if (part.done) { finished = true; break }
              if (received + part.value.byteLength > MAX_BYTES ||
                (expectedBodyLength !== null && received - before + part.value.byteLength > expectedBodyLength)) {
                discard(); throw new Error('下载数据超出声明范围，已丢弃临时数据。')
              }
              chunks.push(new Uint8Array(part.value)); received += part.value.byteLength
              if (checkpoints) for (let at = 0; at < part.value.byteLength;) {
                signal.throwIfAborted()
                const length = Math.min(pending.length - pendingLength, part.value.byteLength - at)
                pending.set(part.value.subarray(at, at + length), pendingLength)
                pendingLength += length; at += length
                if (pendingLength === pending.length) await flushCheckpoint()
              }
              onProgress(received, total)
            }
          } finally {
            signal.removeEventListener('abort', abortReader)
            if (!finished) await reader.cancel().catch(() => {})
            reader.releaseLock()
          }
          signal.throwIfAborted()
          if (expectedBodyLength !== null && received - before !== expectedBodyLength) throw new Error('下载未完成，请重试继续。')
          await flushCheckpoint()
          if (total !== null && received < total) continue // A valid server-selected subrange.
          if (!received) { discard(); throw new Error('下载未返回图片数据。') }
          const bytes = Buffer.concat(chunks, received)
          discard()
          return bytes
        }
        throw new Error('本次分段下载尚未完成，请重试继续。')
      } catch (error) {
        // A network failure may preserve a validated tail. Cancellation leaves at most 1 MiB uncommitted.
        if (resumable() && !signal.aborted && !checkpointFailed) await flushCheckpoint()
        if (!resumable()) discard()
        throw error
      } finally { reading = false }
    }
  }
}

function contentLength(value: string | null): number | null {
  if (value === null) return null
  return /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) ? Number(value) : -1
}
function strongETag(value: string | null): string | null {
  return value !== null && value.length <= 1024 && /^"[\x21\x23-\x7e\x80-\xff]*"$/.test(value) ? value : null
}
function parseRange(value: string | null): Range | null {
  const match = /^bytes (\d+)-(\d+)\/(\d+)$/i.exec(value ?? '')
  if (!match) return null
  const [start, end, total] = match.slice(1).map(Number)
  return [start, end, total].every(Number.isSafeInteger) && start >= 0 && end >= start && end < total ? { start, end, total } : null
}
