import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import {
  assertInsideManagedRoot,
  ensureDirectory,
  isWritableDirectory,
  safeRemoveInsideRoot
} from '../src/main/platform/filesystem-guard'

const base = path.join(process.cwd(), 'dist-temp', 'platform-tests', 'filesystem-guard')
const root = path.join(base, 'root')
const inside = path.join(root, 'inside')
const outside = path.join(base, 'outside')

await fs.rm(base, { recursive: true, force: true })
await ensureDirectory(inside)
await ensureDirectory(outside)

assert.equal(await isWritableDirectory(root), true)
assert.doesNotThrow(() => assertInsideManagedRoot(root, inside))
assert.throws(() => assertInsideManagedRoot(root, outside), /outside managed root/)
assert.rejects(() => safeRemoveInsideRoot(root, root), /managed root itself/)
await assert.rejects(() => safeRemoveInsideRoot(root, outside), /outside managed root/)

const removable = path.join(inside, 'remove-me')
await ensureDirectory(removable)
await safeRemoveInsideRoot(root, removable)
await assert.rejects(() => fs.stat(removable))

await fs.rm(base, { recursive: true, force: true })
