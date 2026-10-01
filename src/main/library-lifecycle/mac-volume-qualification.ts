import { statfs } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import path from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export interface MacLocalVolumeQualification {
  kind: 'qualified' | 'unsupported' | 'not-assessed'
  scopeIdentity?: string
  qualificationGeneration?: string
  maxComponentUtf8Bytes?: number
  maxCompletePathUtf16Units?: number
  atomicReplace?: 'qualified' | 'unsupported' | 'not-assessed'
  durableCommit?: 'qualified' | 'unsupported' | 'not-assessed'
  mountBoundary?: 'qualified' | 'unsupported' | 'not-assessed'
  availableBytes?: number
}

/** Real macOS volume evidence; unknown mount output fails closed. */
export async function qualifyMacLocalVolume(directory: string, scopeIdentity: string): Promise<MacLocalVolumeQualification> {
  if (process.platform !== 'darwin') return { kind: 'unsupported' }
  try {
    const volume = await statfs(directory)
    if (!Number.isSafeInteger(volume.bsize) || volume.bsize <= 0 || !Number.isSafeInteger(volume.bavail) || volume.bavail < 0) return { kind: 'not-assessed' }
    const { stdout: dfOutput } = await execFileAsync('/bin/df', ['-P', directory])
    const mountPoint = String(dfOutput).trim().split('\n').pop()?.trim().split(/\s+/u).pop()
    if (!mountPoint) return { kind: 'not-assessed' }
    const { stdout } = await execFileAsync('/sbin/mount', [])
    const mounts = String(stdout).split('\n').map((line) => {
      const match = line.match(/ on (.+) \(([^)]*)\)$/u)
      return match ? { mountPoint: match[1], flags: match[2] } : null
    }).filter((value): value is { mountPoint: string; flags: string } => Boolean(value))
    const mount = mounts.find((candidate) => candidate.mountPoint === mountPoint)
    if (!mount || !/\b(?:apfs|hfs)\b/iu.test(mount.flags) || !/\blocal\b/iu.test(mount.flags) || /\b(?:read-only|rdonly)\b/iu.test(mount.flags)) return { kind: 'unsupported' }
    const availableBytes = volume.bavail * volume.bsize
    if (!Number.isSafeInteger(availableBytes)) return { kind: 'not-assessed' }
    return { kind: 'qualified', scopeIdentity, qualificationGeneration: `runtime:mac:${mount.mountPoint.replace(/[^A-Za-z0-9._~-]/gu, '-')}`, maxComponentUtf8Bytes: 255, maxCompletePathUtf16Units: 4096, atomicReplace: 'qualified', durableCommit: 'qualified', mountBoundary: 'qualified', availableBytes }
  } catch {
    return { kind: 'not-assessed' }
  }
}
