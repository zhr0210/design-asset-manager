import fs from 'node:fs/promises'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import { createHash } from 'node:crypto'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { MACOS_RUNTIME_IDENTITY } from './macos-runtime-identity.generated'
import type { OwnedWindowsLaunch } from './windows-process-memory.internal'
const run = promisify(execFile)
export async function verifiedMacExecutable(name: 'owned-memory' | 'video', selectedDirectory?: string) {
  if (process.platform !== 'darwin' || process.arch !== MACOS_RUNTIME_IDENTITY.arch) throw Error('LOCAL_RUNTIME_PLATFORM_UNSUPPORTED')
  const directory = selectedDirectory ?? path.join(path.dirname(fileURLToPath(import.meta.url)).replace(/(^|[\\/])app\.asar([\\/])/, '$1app.asar.unpacked$2'), 'macos-runtime')
  const exe = path.join(directory, name)
  const stat = await fs.lstat(exe)
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 8 * 1024 ** 2 || createHash('sha256').update(await fs.readFile(exe)).digest('hex') !== MACOS_RUNTIME_IDENTITY.files[name]) throw Error('LOCAL_RUNTIME_CHANGED')
  // Vite emits data resources without executable mode. Enable only verified bytes.
  await fs.chmod(exe, 0o700)
  return exe
}
export async function readOwnedMacProcessMemory(launch: OwnedWindowsLaunch, directory?: string) {
  if (!Number.isSafeInteger(launch.pid) || launch.pid < 1 || !Number.isSafeInteger(launch.startedAfter) || !Number.isSafeInteger(launch.startedBefore) || launch.startedAfter < 1 || launch.startedBefore < launch.startedAfter) throw Error('LOCAL_RESOURCE_OBSERVATION_INVALID')
  const exe = await verifiedMacExecutable('owned-memory', directory)
  const {stdout} = await run(exe, [String(launch.pid)], {shell: false, timeout: 2000, maxBuffer: 2048})
  const data = JSON.parse(stdout)
  if (data.pid !== launch.pid || !Number.isSafeInteger(data.created) || data.created < launch.startedAfter - 1 || data.created > launch.startedBefore ||
      !Number.isSafeInteger(data.current) || data.current <= 0 || !Number.isSafeInteger(data.peak) || data.peak < data.current) throw Error('LOCAL_RESOURCE_OBSERVATION_INVALID')
  return {rssBytes: data.current, peakRamBytes: data.peak, helperPeak: 0}
}
