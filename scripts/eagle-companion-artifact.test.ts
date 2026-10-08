import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import extract from 'extract-zip'

const manifest=JSON.parse(await fs.readFile('eagle-companion/manifest.json','utf8'))
const html=await fs.readFile('eagle-companion/index.html','utf8')
const source=await fs.readFile('eagle-companion/js/plugin.cjs','utf8')
assert.equal(manifest.id,'DAMCONNECTEDLIBRARY')
assert.equal(manifest.main.serviceMode,true)
assert.equal(manifest.main.runAfterInstall,false)
assert.equal(manifest.devTools,false)
assert.match(html,/Pairing required/)
assert.match(source,/item\.replaceFile/)
assert.match(source,/onLibraryChanged/)
assert.match(source,/127\.0\.0\.1/)
assert.match(source,/STAGING_PATH_REJECTED/)
assert.doesNotMatch(source,/metadata\.json/)
assert.doesNotMatch(source,/0\.0\.0\.0|listen\([^,]+\)|eval\(|new Function|child_process|exec\(|spawn\(/)
assert.doesNotMatch(source,/https?:\/\/(?!127\.0\.0\.1)/)
assert.doesNotMatch(JSON.stringify(manifest)+html+source,/synthetic-e2e-session-token|api[_-]?key|authorizationHeader/i)
const gateway=await fs.readFile('eagle-companion/js/pairing.cjs','utf8')
assert.match(gateway,/request\.headers\.origin/)
assert.match(gateway,/request\.headers\['sec-fetch-site'\]/)
assert.doesNotMatch(gateway,/metadata\.json|0\.0\.0\.0|eval\(|child_process|exec\(|spawn\(/)
const archive='build/eagle-companion/DAM-Eagle-Companion-0.2.0.eagleplugin'
const packaged='out/main/eagle-companion/DAM-Eagle-Companion-0.2.0.eagleplugin'
assert.deepEqual(await fs.readFile(packaged),await fs.readFile(archive),'running artifact must be the exact built package')
const unpack=await fs.mkdtemp(path.join(os.tmpdir(),'dam-eagle-package-'))
try {
  await extract(path.resolve(archive),{dir:unpack})
  assert.deepEqual((await fs.readdir(unpack)).sort(),['README.md','index.html','js','manifest.json'])
  assert.deepEqual((await fs.readdir(path.join(unpack,'js'))).sort(),['pairing.cjs','plugin.cjs'])
  for(const file of ['manifest.json','index.html','js/plugin.cjs','js/pairing.cjs','README.md'])
    assert.deepEqual(await fs.readFile(path.join(unpack,file)),await fs.readFile(path.join('eagle-companion',file)),file+' must match current source')
} finally { await fs.rm(unpack,{recursive:true,force:true}) }
console.log('Eagle companion artifact governance passed')
