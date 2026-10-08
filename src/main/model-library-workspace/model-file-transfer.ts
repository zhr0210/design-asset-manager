import fs from 'node:fs/promises'
import { constants } from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import type { VisionModelFile } from '../model-library/vision-model-artifact'
import { openUpstreamFile, type PublicModelFetch, type UpstreamModelRelease } from './huggingface-model-source'

export async function verifyTransferredFile(filePath: string, expected: VisionModelFile, signal: AbortSignal) {
  const stat = await fs.lstat(filePath)
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size !== expected.bytes) throw Error('MODEL_FILE_INTEGRITY_FAILED')
  const handle = await fs.open(filePath, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0))
  const digest = createHash('sha256')
  try {
    const before = await handle.stat()
    if (before.ino !== stat.ino || before.dev !== stat.dev || before.size !== stat.size) throw Error('MODEL_FILE_INTEGRITY_FAILED')
    for await (const chunk of handle.createReadStream({ autoClose: false })) { signal.throwIfAborted(); digest.update(chunk) }
    const after = await handle.stat(), named = await fs.lstat(filePath)
    if (after.size !== before.size || after.mtimeMs !== before.mtimeMs || after.ctimeMs !== before.ctimeMs ||
      named.isSymbolicLink() || named.ino !== before.ino || named.dev !== before.dev || digest.digest('hex') !== expected.sha256)
      throw Error('MODEL_FILE_INTEGRITY_FAILED')
  } finally { await handle.close() }
}

async function partialHandle(file: string, limit: number) {
  try {
    const stat = await fs.lstat(file)
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > limit) throw Error('MODEL_STAGING_UNSAFE')
    const handle = await fs.open(file, constants.O_RDWR | (constants.O_NOFOLLOW ?? 0))
    const held = await handle.stat()
    if (held.ino !== stat.ino || held.dev !== stat.dev || held.size !== stat.size) { await handle.close(); throw Error('MODEL_STAGING_UNSAFE') }
    return { handle, offset: stat.size }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    return { handle: await fs.open(file, 'wx', 0o600), offset: 0 }
  }
}

async function writeAll(handle: fs.FileHandle, chunk: Uint8Array, position: number) {
  for (let written = 0; written < chunk.length;) {
    const value = await handle.write(chunk, written, chunk.length - written, position + written)
    if (value.bytesWritten <= 0) throw Error('MODEL_TRANSFER_FAILED')
    written += value.bytesWritten
  }
}

/** Owns just the named task's .part file. Partial bytes are never installation evidence. */
export async function transferModelFile(input: {
  file: VisionModelFile; stage: string; sourceRoot?: string; release?: UpstreamModelRelease; fetch: PublicModelFetch;
  signal: AbortSignal; progress(bytes: number): void;
  open?: (offset: number, signal: AbortSignal) => Promise<Response>;
}) {
  const { file, signal } = input
  const destination = path.join(input.stage, file.name)
  let parent = input.stage
  for (const part of file.name.split('/').slice(0, -1)) {
    if (!/^[A-Za-z0-9._-]+$/.test(part) || part === '.' || part === '..') throw Error('MODEL_STAGING_UNSAFE')
    parent = path.join(parent, part)
    await fs.mkdir(parent, { recursive: true, mode: 0o700 })
    const directory = await fs.lstat(parent)
    if (!directory.isDirectory() || directory.isSymbolicLink()) throw Error('MODEL_STAGING_UNSAFE')
  }
  try { await verifyTransferredFile(destination, file, signal); input.progress(file.bytes); return }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }
  const part = destination + '.part', opened = await partialHandle(part, file.bytes)
  let offset = opened.offset
  try {
    if (offset < file.bytes) {
      if (input.sourceRoot) {
        const source = path.join(input.sourceRoot, file.name), stat = await fs.lstat(source)
        if (!stat.isFile() || stat.isSymbolicLink() || stat.size !== file.bytes) throw Error('LOCAL_MODEL_CHANGED')
        const reader = await fs.open(source, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0))
        try {
          const held = await reader.stat()
          if (held.dev !== stat.dev || held.ino !== stat.ino || held.size !== stat.size) throw Error('LOCAL_MODEL_CHANGED')
          for await (const chunk of reader.createReadStream({ start: offset, autoClose: false })) {
            signal.throwIfAborted(); await writeAll(opened.handle, chunk, offset); offset += chunk.length; input.progress(offset)
          }
          const after = await reader.stat()
          if (after.size !== held.size || after.mtimeMs !== held.mtimeMs || after.ctimeMs !== held.ctimeMs) throw Error('LOCAL_MODEL_CHANGED')
        } finally { await reader.close() }
      } else {
        if (!input.release && !input.open) throw Error('MODEL_SOURCE_UNAVAILABLE')
        const response = input.open ? await input.open(offset, signal) : await openUpstreamFile(input.release!, file, offset, input.fetch, signal)
        try {
          if (response.status !== 200 && response.status !== 206 || !response.body) throw Error('MODEL_TRANSFER_FAILED')
          if (response.headers.get('content-encoding') && response.headers.get('content-encoding') !== 'identity') throw Error('MODEL_TRANSFER_ENCODING_REJECTED')
          if (response.status === 206) {
            const match = /^bytes (\d+)-(\d+)\/(\d+)$/.exec(response.headers.get('content-range') ?? '')
            if (!match || Number(match[1]) !== offset || Number(match[3]) !== file.bytes || Number(match[2]) !== file.bytes - 1)
              throw Error('MODEL_TRANSFER_RANGE_REJECTED')
          } else if (offset) { await opened.handle.truncate(0); offset = 0 }
          const declared = response.headers.get('content-length')
          if (declared && Number(declared) !== file.bytes - offset) throw Error('MODEL_TRANSFER_LENGTH_REJECTED')
          for await (const chunk of response.body as unknown as AsyncIterable<Uint8Array>) {
            signal.throwIfAborted()
            if (offset + chunk.length > file.bytes) throw Error('MODEL_TRANSFER_LENGTH_REJECTED')
            await writeAll(opened.handle, chunk, offset); offset += chunk.length; input.progress(offset)
          }
        } finally { await response.body?.cancel().catch(() => {}) }
      }
    }
    signal.throwIfAborted()
    if (offset !== file.bytes) throw Error('MODEL_TRANSFER_LENGTH_REJECTED')
    await opened.handle.sync()
  } finally { await opened.handle.close() }
  await verifyTransferredFile(part, file, signal)
  // No overwrite: an existing final file is a collision, even inside our task.
  await fs.link(part, destination)
  await fs.unlink(part)
}
