import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { createReadStream } from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'

// Exact byte diversity of the authorized public Originals, not semantic variety.
const base = path.resolve('.scratch/f-release-scale-20261008')
const results = []
for (const [alias, root] of [['inherited-D', path.resolve('.scratch/d-work-mode-20261008/library/Originals')],
  ['F-load-copy', path.join(base, 'library-10000/Originals')]] as const) {
  const contents = new Map<string, number>()
  let fileCount = 0, bytes = 0
  await walk(root)
  results.push({ alias, fileCount, uniqueByteContents: contents.size, bytes,
    duplicateCopies: [...contents.values()].reduce((sum, count) => sum + count - 1, 0) })
  async function walk(directory: string) {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      assert.equal(entry.isSymbolicLink(), false)
      const file = path.join(directory, entry.name)
      if (entry.isDirectory()) await walk(file)
      else if (entry.isFile()) {
        const hash = createHash('sha256')
        for await (const chunk of createReadStream(file)) hash.update(chunk)
        const digest = hash.digest('hex')
        contents.set(digest, (contents.get(digest) ?? 0) + 1)
        bytes += (await fs.stat(file)).size; fileCount++
      }
    }
  }
}
await fs.writeFile(path.join(base, 'evidence/source-diversity.json'), JSON.stringify({ results,
  limitation: 'Distinct byte contents include derived versions; not an independent semantic quality set. Scale copies add no new content diversity.' }, null, 2) + '\n')
console.log(JSON.stringify(results))
