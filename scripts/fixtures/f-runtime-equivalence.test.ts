import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import asar from '@electron/asar'

const base = path.resolve('.scratch/f-release-scale-20261008')
const oldManifest = JSON.parse(await fs.readFile(path.join(base, 'evidence/candidate-manifest.json'), 'utf8'))
const newManifest = JSON.parse(await fs.readFile(path.join(base, 'evidence/candidate-final-manifest.json'), 'utf8'))
const oldArchive = path.join(base, 'package/win-unpacked/resources/app.asar')
const newArchive = path.join(base, 'package-final/win-unpacked/resources/app.asar')
const digest = (bytes: Uint8Array | string) => createHash('sha256').update(bytes).digest('hex')
const names = (archive: string) => asar.listPackage(archive).map(name => name.replaceAll('\\', '/').replace(/^\//, '')).filter(name => name.startsWith('out/') && !asar.statFile(archive, name.split('/').join(path.sep)).files)
const previous = names(oldArchive), current = names(newArchive)
assert.deepEqual(current, previous, 'Candidate executable entry set changed')
let unchanged = 0
for (const name of previous) {
  const oldBytes = asar.extractFile(oldArchive, name.split('/').join(path.sep))
  const newBytes = asar.extractFile(newArchive, name.split('/').join(path.sep))
  if (name === 'out/main/index.js') {
    const normalized = (text: string, build: Record<string, string>) => {
      for (const key of ['buildId', 'sourceDigest', 'builtAt']) {
        assert.ok(text.includes(build[key]), 'Exact build metadata missing: ' + key)
        text = text.replaceAll(build[key], '<BUILD_METADATA_' + key + '>')
      }
      return text
    }
    assert.equal(digest(normalized(newBytes.toString('utf8'), newManifest.build)),
      digest(normalized(oldBytes.toString('utf8'), oldManifest.build)), 'Main executable differs beyond three explicit build metadata values')
  } else { assert.equal(digest(newBytes), digest(oldBytes), 'Executable bytes changed: ' + name); unchanged++ }
}
await fs.writeFile(path.join(base, 'evidence/runtime-equivalence.json'), JSON.stringify({
  from: oldManifest.build.buildId, to: newManifest.build.buildId, unchangedExecutableResources: unchanged,
  mainDifference: 'only buildId/sourceDigest/builtAt metadata',
  scope: 'Exact executable equivalence supports applicability of fcc internal domain/runtime evidence; UI, installer and release governance require their own new-candidate checks.'
}, null, 2) + '\n')
console.log(JSON.stringify({ from: oldManifest.build.buildId, to: newManifest.build.buildId, unchanged, main: 'metadata only' }))
