import assert from 'node:assert/strict'
import path from 'node:path'
import {
  ensureSafeJoin,
  fromPortablePath,
  isInsideDirectory,
  normalizePath,
  sanitizeFilename,
  toPortablePath
} from '../src/main/platform/path-normalizer'

const illegal = sanitizeFilename('bad<name>:with*chars?.png')
assert.equal(illegal, 'bad_name__with_chars_.png')

const chinese = '海报 设计稿 01.png'
assert.equal(sanitizeFilename(chinese), chinese)

const spacedPath = normalizePath(path.join(process.cwd(), 'folder with spaces', 'file name.png'))
assert.match(spacedPath, /folder with spaces/)
assert.match(spacedPath, /file name\.png/)

const root = path.join(process.cwd(), 'dist-temp', 'platform-tests', 'root')
const inside = ensureSafeJoin(root, 'nested', 'asset.png')
assert.equal(isInsideDirectory(root, inside), true)

assert.throws(() => ensureSafeJoin(root, '..', 'escape.png'), /outside managed root/)
assert.equal(isInsideDirectory(root, path.join(root, '..', 'escape.png')), false)

const portable = toPortablePath(path.join(process.cwd(), '含中文 path', 'asset.png'))
assert.equal(typeof portable, 'string')
assert.equal(fromPortablePath(portable).length > 0, true)
