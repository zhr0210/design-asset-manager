import fs from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { verifiedMacExecutable, readOwnedMacProcessMemory } from '../platform/macos-owned-memory'
import { MACOS_RUNTIME_IDENTITY } from '../platform/macos-runtime-identity.generated'
import type { VisualAdmission } from '../visual-ai/visual-admission'
import type { VideoMetadata, WorkVideoRuntime } from './windows-video-runtime'

/** AVFoundation local decode. Owned-child close alone releases its shared
 * permit; a failed exit leaves a quarantined token and blocks further decode. */
export function createMacVideoRuntime(input: {admission?: VisualAdmission; directory?: string; launch?: typeof spawn}): WorkVideoRuntime {
  let queue: Promise<unknown> = Promise.resolve(), unconfirmed = false
  const operations = new Set<AbortController>()
  const execute = async (args: string[], signal: AbortSignal): Promise<VideoMetadata> => {
    signal.throwIfAborted()
    if (unconfirmed) throw Error('视频进程退出尚未确认。')
    const exe = await verifiedMacExecutable('video', input.directory)
    const permit = await input.admission?.reserveLocalWork('media', 512 * 1024 ** 2, signal)
    let handedToChild = false
    try {
      signal.throwIfAborted()
      const startedAfter = Date.now()
      const child = (input.launch ?? spawn)(exe, args, {shell:false,stdio:['ignore','pipe','pipe'],env:{LANG:'en_US.UTF-8'}})
      const startedBefore = Date.now() + 1000
      handedToChild = true
      const text = await new Promise<string>((resolve, reject) => {
        let output = '', failed = false, closed = false, killTimer: ReturnType<typeof setTimeout> | undefined, deadline: ReturnType<typeof setTimeout> | undefined
        const stop = () => {
          failed = true
          if (!closed && child.exitCode === null && child.signalCode === null) child.kill('SIGTERM')
          if (!killTimer) killTimer = setTimeout(() => { if (!closed && child.exitCode === null && child.signalCode === null) child.kill('SIGKILL') }, 250)
          if (!deadline) deadline = setTimeout(() => { if (!closed) { unconfirmed = true; reject(Error('视频进程退出尚未确认。')) } }, 2250)
        }
        const timeout = setTimeout(stop, 30000)
        let observing = false
        const monitor = setInterval(() => {
          if (closed || observing || !child.pid) return
          observing = true
          void readOwnedMacProcessMemory({pid:child.pid,startedAfter,startedBefore}, input.directory).then(value => {
            if (!closed && value.peakRamBytes > 384 * 1024 ** 2) stop()
          }, () => { if (!closed && child.exitCode === null) stop() }).finally(() => { observing = false })
        }, 250)
        child.stdout.on('data', (bytes: Buffer) => { output += bytes.toString('utf8'); if (output.length > 4096) stop() })
        child.stderr.on('data', () => {})
        child.on('error', stop)
        signal.addEventListener('abort', stop, {once:true})
        child.once('close', code => {
          closed = true; unconfirmed = false
          clearTimeout(timeout);clearTimeout(killTimer);clearTimeout(deadline);clearInterval(monitor)
          signal.removeEventListener('abort',stop);permit?.release()
          if (failed || code !== 0 || signal.aborted) reject(Error(signal.aborted ? '视频操作已取消。' : '此视频无法解码，支持未旋转的 H.264 MP4（最长1小时，最高3840×2160）。'))
          else resolve(output)
        })
        if (signal.aborted) stop()
      })
      const metadata = JSON.parse(text) as VideoMetadata
      if (metadata.protocol !== 1 || !['durationTicks','width','height','fpsNumerator','fpsDenominator','actualTicks'].every(key => Number.isSafeInteger(metadata[key as keyof VideoMetadata])) ||
          metadata.durationTicks <= 0 || metadata.durationTicks > 3600 * 1e7 || metadata.width < 1 || metadata.width > 3840 || metadata.height < 1 || metadata.height > 2160 || metadata.fpsNumerator < 1 || metadata.fpsDenominator < 1) throw Error('视频元数据不完整。')
      return metadata
    } finally { if (!handedToChild) permit?.release() }
  }
  const serial = <T>(operation: (signal: AbortSignal) => Promise<T>, signal?: AbortSignal) => {
    const controller = new AbortController();operations.add(controller)
    const effective = signal ? AbortSignal.any([signal,controller.signal]) : controller.signal
    const next = queue.then(() => { effective.throwIfAborted();return operation(effective) })
    queue = next.catch(() => {})
    return next.finally(() => operations.delete(controller))
  }
  return {identity:'macos-avfoundation:'+MACOS_RUNTIME_IDENTITY.sourceDigest,
    cancelAll() {for (const controller of operations) controller.abort()},
    probe:(file,signal)=>serial(effective=>execute([file],effective),signal),
    frame:(file,ticks,staging,signal)=>serial(async effective=>{
      if (!Number.isSafeInteger(ticks) || ticks < 0) throw Error('视频时间无效。')
      const temporary = await fs.mkdtemp(path.join(staging,'video-decode-')), output = path.join(temporary,'frame.png')
      try {
        const metadata = await execute([file,output,String(ticks)],effective), stat = await fs.lstat(output)
        if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || stat.size > 64 * 1024 ** 2 || metadata.actualTicks < ticks || metadata.actualTicks >= metadata.durationTicks) throw Error('参考帧未解码到请求位置。')
        return {metadata,png:await fs.readFile(output)}
      } finally { if (!unconfirmed) {await fs.rm(output,{force:true});await fs.rmdir(temporary)} }
    },signal)}
}
