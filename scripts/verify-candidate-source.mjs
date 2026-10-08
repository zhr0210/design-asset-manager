import fs from 'node:fs/promises'
import { createReadStream } from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'

const rootOption = process.argv.slice(2).find(arg => arg.startsWith('--root='))
if (process.argv.slice(2).some(arg => !arg.startsWith('--root=')) || process.argv.slice(2).length > 1) throw Error('Expected only optional --root=')
const root = await fs.realpath(rootOption ? path.resolve(rootOption.slice(7)) : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'))
const manifestPath = path.join(root, 'SOURCE-MANIFEST.json')
const manifestInfo = await fs.lstat(manifestPath)
if (!manifestInfo.isFile() || manifestInfo.isSymbolicLink() || manifestInfo.size > 8 * 1024 ** 2) throw Error('SOURCE_MANIFEST_TYPE_REFUSED')
const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'))
if (manifest.schema !== 1 || manifest.kind !== 'portable-development-source' || !Array.isArray(manifest.files)) throw Error('SOURCE_MANIFEST_INVALID')
const hashes = {}, caseNames = new Set()
let totalBytes = 0
for (const entry of manifest.files) {
  const name = entry.path
  if (typeof name !== 'string' || name.includes('\\') || name.startsWith('/') || name.split('/').some(part => !part || part === '.' || part === '..') ||
    !/^[a-f0-9]{64}$/.test(entry.sha256) || !Number.isSafeInteger(entry.bytes) || entry.bytes < 0) throw Error('SOURCE_ENTRY_INVALID')
  if (/(^|\/)\.env|\.(db(?:-.*)?|sqlite(?:3)?(?:-.*)?|pem|key|p12|pfx|exe|dll|node|pyd|gguf|onnx|safetensors|pt|pth|ckpt)$/i.test(name) ||
    /(^|\/)(?:auth|credentials?|settings|storage_state|account|tokens?|secrets?)\.json$/i.test(name) ||
    /(^|\/)(node_modules|\.venv|venv|\.git)(\/|$)/i.test(name) ||
    !name.startsWith('src/') && /(^|\/)(profiles?|auth_states)(\/|$)/i.test(name)) throw Error('SOURCE_STATE_PATH_REFUSED')
  const folded = name.normalize('NFC').toLowerCase()
  if (caseNames.has(folded)) throw Error('SOURCE_CASE_COLLISION')
  caseNames.add(folded)
  const file = path.resolve(root, name)
  if (!file.startsWith(root + path.sep)) throw Error('SOURCE_PATH_ESCAPE')
  let parent = root
  for (const segment of name.split('/').slice(0, -1)) {
    parent = path.join(parent, segment)
    const info = await fs.lstat(parent)
    if (!info.isDirectory() || info.isSymbolicLink()) throw Error('SOURCE_PARENT_LINK_REFUSED')
  }
  const info = await fs.lstat(file)
  if (!info.isFile() || info.isSymbolicLink() || info.size !== entry.bytes) throw Error('SOURCE_FILE_TYPE_OR_SIZE:' + name)
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(file)) hash.update(chunk)
  hashes[name] = hash.digest('hex')
  if (hashes[name] !== entry.sha256) throw Error('SOURCE_HASH_MISMATCH:' + name)
  totalBytes += entry.bytes
}
const digest = createHash('sha256').update(JSON.stringify(Object.fromEntries(Object.entries(hashes).sort(([a], [b]) => a.localeCompare(b))))).digest('hex')
if (digest !== manifest.sourceSnapshotSha256) throw Error('SOURCE_SNAPSHOT_DIGEST_MISMATCH')
for (const [name, expected] of Object.entries(manifest.productInputs.includedSourceHashes)) {
  if (hashes[name] !== expected) throw Error('PRODUCT_SOURCE_CLOSURE_MISSING:' + name)
}
console.log(JSON.stringify({ status: 'SOURCE_BYTES_VERIFIED', files: manifest.files.length, bytes: totalBytes,
  sourceSnapshotSha256: digest, sourceWindowsBuild: manifest.sourceBuild.buildId,
  originalHead: manifest.originalHead, platform: process.platform, arch: process.arch,
  environmentVerified: false, uiVerified: false, modelsVerified: false,
  note: 'Verify before dependency preparation/sealing. Windows product identity is provenance, not a macOS build.' }, null, 2))
