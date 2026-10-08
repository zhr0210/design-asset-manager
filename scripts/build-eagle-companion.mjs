import fs from 'node:fs/promises'
import { createWriteStream } from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import archiver from 'archiver'

// Eagle's documented Pack Plugin produces a ZIP with manifest at its root.
// An explicit allowlist keeps credentials, local sessions and development files out.
export const EAGLE_COMPANION_FILES = ['manifest.json', 'index.html', 'js/plugin.cjs', 'js/pairing.cjs', 'README.md']
export const EAGLE_COMPANION_NAME = 'DAM-Eagle-Companion-0.2.0.eagleplugin'
await fs.mkdir('build/eagle-companion', { recursive: true })
const target = path.resolve('build/eagle-companion', EAGLE_COMPANION_NAME)
const archive = archiver('zip', { zlib: { level: 9 } })
const output = createWriteStream(target)
archive.pipe(output)
const completed = new Promise((resolve, reject) => { output.on('close', resolve); output.on('error', reject); archive.on('error', reject) })
for (const name of EAGLE_COMPANION_FILES) {
  const file = path.join('eagle-companion', name)
  const stat = await fs.lstat(file)
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 1024 * 1024) throw Error('EAGLE_COMPANION_SOURCE_INVALID')
  archive.append(await fs.readFile(file), { name, date: new Date('1980-01-01T00:00:00Z'), mode: 0o644 })
}
await archive.finalize()
await completed
const bytes = await fs.readFile(target)
console.log(JSON.stringify({ file: EAGLE_COMPANION_NAME, bytes: bytes.length,
  sha256: createHash('sha256').update(bytes).digest('hex'), installed: false }))
