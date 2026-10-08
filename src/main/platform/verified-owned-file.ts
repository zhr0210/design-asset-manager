import fs from 'node:fs/promises'
import { constants } from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { assertExistingDirectoryInsideManagedRoot } from './filesystem-guard'
import { isInsideDirectory } from './path-normalizer'

/** Main-only bounded read. The caller supplies an owned role and independently recorded digest. */
export async function readVerifiedOwnedFile(input: {
  root: string; role: string; relative: string; expectedSize: number; expectedDigest: string; maximumBytes: number
  /** Owned staging recovery only: Windows requires a writable handle to flush. No bytes are written. */
  sync?: boolean
}): Promise<{ bytes: Uint8Array; fileIdentity: string; directoryIdentities: string[] }> {
  const { root, role, relative, expectedSize, expectedDigest, maximumBytes } = input
  if (!relative || /[\\:\u0000-\u001f]/.test(relative) || relative.split('/').some(part => !part || part === '.' || part === '..') ||
    !Number.isSafeInteger(expectedSize) || expectedSize <= 0 || expectedSize > maximumBytes ||
    !Number.isSafeInteger(maximumBytes) || maximumBytes <= 0 || !/^[a-f0-9]{64}$/.test(expectedDigest)) throw unavailable()
  const file = path.resolve(role, relative)
  if (!isInsideDirectory(role, file)) throw unavailable()
  const parent = path.dirname(file)
  await assertExistingDirectoryInsideManagedRoot(root, parent)
  const directories = [root]
  for (const part of path.relative(root, parent).split(path.sep).filter(Boolean)) directories.push(path.join(directories.at(-1)!, part))
  const beforeDirectories = await Promise.all(directories.map(directoryStamp))
  const before = await fs.lstat(file, { bigint: true })
  if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1n || before.size !== BigInt(expectedSize)) throw unavailable()
  const handle = await fs.open(file, (input.sync ? constants.O_RDWR : constants.O_RDONLY) | (constants.O_NOFOLLOW ?? 0))
  try {
    const opened = await handle.stat({ bigint: true })
    if (!opened.isFile() || fileStamp(opened) !== fileStamp(before)) throw unavailable()
    const checkedDirectories = await Promise.all(directories.map(directoryStamp))
    if (beforeDirectories.some((stamp, index) => stamp !== checkedDirectories[index])) throw unavailable()
    if (input.sync) await handle.sync()
    const bytes = Buffer.alloc(expectedSize + 1)
    let offset = 0
    while (offset < bytes.length) {
      const result = await handle.read(bytes, offset, bytes.length - offset, offset)
      if (!result.bytesRead) break
      offset += result.bytesRead
    }
    const after = await handle.stat({ bigint: true })
    const named = await fs.lstat(file, { bigint: true })
    await assertExistingDirectoryInsideManagedRoot(root, parent)
    const afterDirectories = await Promise.all(directories.map(directoryStamp))
    if (offset !== expectedSize || fileStamp(opened) !== fileStamp(after) || fileStamp(opened) !== fileStamp(named) || named.isSymbolicLink() ||
      beforeDirectories.some((stamp, index) => stamp !== afterDirectories[index])) throw unavailable()
    const content = bytes.subarray(0, offset)
    if (createHash('sha256').update(content).digest('hex') !== expectedDigest) throw unavailable()
    return { bytes: content, fileIdentity: fileStamp(opened), directoryIdentities: beforeDirectories }
  } finally { await handle.close() }
}

type FileStat = { dev: bigint; ino: bigint; mode: bigint; size: bigint; mtimeNs: bigint; ctimeNs: bigint; birthtimeNs: bigint; nlink: bigint }
function fileStamp(stat: FileStat) { return [stat.dev, stat.ino, stat.mode, stat.size, stat.mtimeNs, stat.ctimeNs, stat.birthtimeNs, stat.nlink].join(':') }
async function directoryStamp(directory: string) {
  const stat = await fs.lstat(directory, { bigint: true })
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw unavailable()
  return [stat.dev, stat.ino, stat.mode, stat.birthtimeNs].join(':')
}
function unavailable() { return new Error('Verified owned file unavailable.') }
