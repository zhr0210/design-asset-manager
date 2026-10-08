/** Bounded wire profile for the owned synthetic tracer, not a production IPC contract. */
import { TextDecoder } from 'node:util'

export const PROFILE = Object.freeze({
  frameBytes: 8192,
  pendingFrames: 8,
  textBytes: 256,
  receipts: 128,
  pageSize: 4096,
  maxPages: 256,
  deadlineMs: 10000,
})

/** The newline counts toward the frame bound. */
export function encodeFrame(value) {
  const serialized = JSON.stringify(value)
  if (serialized === undefined) throw new Error('FRAME_ENCODING')
  const frame = Buffer.from(`${serialized}\n`, 'utf8')
  if (frame.length > PROFILE.frameBytes) throw new Error('FRAME_OVERSIZE')
  return frame
}

/** Fail closed once. No raw frame or parser error is handed to diagnostics. */
export function createFrameDecoder(onFrame, onError) {
  let pending = Buffer.alloc(0)
  let closed = false
  const utf8 = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true })
  const fail = (code) => {
    if (closed) return
    closed = true
    pending = Buffer.alloc(0)
    onError(code)
  }
  return {
    push(chunk) {
      if (closed) return
      if (!Buffer.isBuffer(chunk) && typeof chunk !== 'string' && !(chunk instanceof Uint8Array)) {
        fail('FRAME_ENCODING')
        return
      }
      // Examine the incoming chunk before copying it. Allocation remains bounded by one frame.
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
      let offset = 0
      while (offset < bytes.length && !closed) {
        const newline = bytes.indexOf(10, offset)
        const end = newline < 0 ? bytes.length : newline + 1
        const segment = bytes.subarray(offset, end)
        if (pending.length + segment.length > PROFILE.frameBytes) {
          fail('FRAME_OVERSIZE')
          return
        }
        pending = pending.length ? Buffer.concat([pending, segment]) : Buffer.from(segment)
        offset = end
        if (newline < 0) return
        const line = pending.subarray(0, pending.length - 1)
        pending = Buffer.alloc(0)
        if (!line.length) {
          fail('FRAME_ENCODING')
          return
        }
        let value
        try {
          value = JSON.parse(utf8.decode(line))
        } catch {
          fail('FRAME_ENCODING')
          return
        }
        if (value === null || typeof value !== 'object' || Array.isArray(value)) {
          fail('FRAME_ENCODING')
          return
        }
        onFrame(value)
      }
    },
    end() {
      if (closed) return
      if (pending.length) fail('FRAME_TRUNCATED')
      else closed = true
    },
  }
}
