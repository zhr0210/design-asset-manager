import fs from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import Database from 'better-sqlite3'
import sharp from 'sharp'
import {DAM_BUILD_IDENTITY} from '../src/shared/build-identity.generated'

// Read-only oracle for the explicitly authorized public source and D copy.
// UI actions, downloads and saves happen through the ordinary application.
const base = path.resolve('.scratch/d-work-mode-20261008'), sourceRoot = path.resolve('.scratch/c-search-20261007/library'), root = path.join(base, 'library')
const profile = path.resolve('.scratch/wc01-real-model-library-20261005/run-U4eFuo/profile-04')
const source = new Database(path.join(sourceRoot, '.dam/library.sqlite'), {readonly: true, fileMustExist: true})
const db = new Database(path.join(root, '.dam/library.sqlite'), {readonly: true, fileMustExist: true})
const digest = (bytes: Uint8Array | string) => createHash('sha256').update(bytes).digest('hex')
const output: Record<string, unknown> = {at: new Date().toISOString(),client: 'Browser',build: DAM_BUILD_IDENTITY.buildId}
try {
  assert.equal(db.pragma('integrity_check', {simple: true}), 'ok'); assert.equal(db.pragma('user_version', {simple: true}), 15)
  assert.deepEqual(db.pragma('foreign_key_check'), [])
  const tables = (source.prepare("SELECT name FROM sqlite_schema WHERE type='table' ORDER BY name").all() as {name: string}[]).map(row => row.name)
    .filter(name => /^(assets|asset_tags|asset_lifecycle|capture_requests|asset_candidates|promotion_links|basic_analysis_.+|independent_tag_.+|background_analysis_.+|background_ocr_.+|work_sets|work_set_members)$/.test(name))
  for (const name of tables) {
    const old = source.prepare(`SELECT * FROM "${name}" ORDER BY 1,2`).all(), current = db.prepare(`SELECT * FROM "${name}" ORDER BY 1,2`).all()
    const preserved = new Set(current.map(row => JSON.stringify(row)))
    for (const row of old) assert.ok(preserved.has(JSON.stringify(row)), `${name}: every old row must remain byte-for-byte in its columns`)
    if (/^(basic_analysis_|independent_tag_|background_|asset_tags$)/.test(name)) assert.deepEqual(current, old, `${name}: D must not silently run image analysis on the video`)
  }
  output.preservedTables = tables.length; output.originalAssets = 165; output.currentAssets = db.prepare('SELECT COUNT(*) FROM assets').pluck().get()
  const before = JSON.parse(await fs.readFile(path.join(base, 'evidence/pre-import-with-vectors.json'), 'utf8')) as {files: Record<string,string>; retrieval: unknown}
  for (const [relative, hash] of Object.entries(before.files)) assert.equal(digest(await fs.readFile(path.join(root, relative))), hash)
  output.originalFilesPreserved = Object.keys(before.files).length
  const registry = JSON.parse(await fs.readFile(path.join(root, '.dam/.dam-asset-retrieval.json'), 'utf8')) as {canonical: string}
  assert.match(registry.canonical, /^asset-vectors-[a-f0-9-]{36}\.sqlite$/)
  const vectors = new Database(path.join(root, '.dam', registry.canonical), {readonly:true, fileMustExist:true})
  try {
    const rows = vectors.prepare('SELECT * FROM vectors ORDER BY space,id,view').all(), jobs = vectors.prepare('SELECT * FROM jobs ORDER BY id').all()
    const result = {active: String(vectors.prepare("SELECT value FROM meta WHERE key='active'").pluck().get()),vectors: rows.length,vectorsSha256:digest(JSON.stringify(rows)),jobs:jobs.length,jobsSha256:digest(JSON.stringify(jobs))}
    assert.deepEqual(result, before.retrieval); output.retrieval = result
  } finally {vectors.close()}
  const frames = db.prepare('SELECT requested_ticks,actual_ticks,time_base,position,note,png_sha256,method,transform FROM work_reference_frames WHERE active=1 ORDER BY position').all() as {requested_ticks:number;actual_ticks:number;png_sha256:string;note:string}[]
  assert.equal(frames.length, 2); assert.equal(frames[0].actual_ticks,1204583333); assert.equal(frames[1].actual_ticks,301250000)
  assert.ok(frames[0].note.includes('motion reference')); assert.ok(frames[1].note.includes('林间环境')); output.frames = frames
  const handed: Array<Record<string, unknown>> = []
  const deliveries = [
    {id:'96837d2b-d8f9-4e83-8332-0a374e8be196',kind:'reference-frame',name:'公开短片 Big Buck Bunny 参考帧 120.4583333s.png'},
    {id:'335b5e96-2ddf-4737-a7cb-8a591a070cf9',kind:'original',name:'公开短片 Big Buck Bunny 原件副本.mp4'},
    {id:'048d3921-6073-407d-b570-26d4efc2265d',kind:'preview',name:'公开短片 Big Buck Bunny 预览副本.png'},
    {id:'97df590b-7d09-4b0b-bb01-c935572decd0',kind:'compatible-png',name:'public-04-coffee 兼容导出.png'}
  ]
  for (const item of deliveries) {
    const directory = path.join(profile, 'work-file-handoffs', item.id)
    const receipt = JSON.parse(await fs.readFile(path.join(directory, 'receipt.json'), 'utf8')) as {receipt: {id:string;kind:string;fileName:string;sha256:string;bytes:number};scope:{assetId:string};provenance: unknown}
    assert.equal(receipt.receipt.id, 'handoff:'+item.id); assert.equal(receipt.receipt.kind,item.kind); assert.equal(receipt.receipt.fileName,item.name)
    const bytes = await fs.readFile(path.join('C:/Users/kilian/Downloads', item.name))
    assert.equal(bytes.length,receipt.receipt.bytes); assert.equal(digest(bytes), receipt.receipt.sha256); assert.deepEqual(bytes, await fs.readFile(path.join(directory,item.name)))
    const result: Record<string, unknown> = {kind:item.kind,fileName:item.name,bytes:bytes.length,sha256:digest(bytes),provenance:receipt.provenance}
    if (item.kind === 'original') assert.equal(digest(bytes), 'f78f39603e6774907f2faafabf26a667f4a6fc31769ec304a8a8f7c62d280508')
    else {
      const meta = await sharp(bytes).metadata(); assert.equal(meta.format,'png'); result.dimensions=[meta.width,meta.height]
      if (item.kind === 'reference-frame') {assert.equal(digest(bytes),frames[0].png_sha256); assert.deepEqual(result.dimensions,[320,180])}
      if (item.kind === 'compatible-png') {
        const row = db.prepare('SELECT c.managed_original_ref AS ref FROM promotion_links p JOIN asset_candidates c ON c.candidate_identity=p.candidate_identity WHERE p.design_asset_identity=?').get(receipt.scope.assetId) as {ref:string}
        assert.ok(row.ref.startsWith('managed-original:')); const relative=row.ref.slice(17); assert.ok(!relative.includes('..')&&!path.isAbsolute(relative))
        const original=await sharp(await fs.readFile(path.join(root,'Originals',relative))).metadata()
        assert.deepEqual(result.dimensions,[original.width,original.height])
      }
    }
    handed.push(result)
  }
  output.downloads=handed
  await fs.writeFile(path.join(base,'evidence/downloads-and-preservation.json'),JSON.stringify(output,null,2)+'\n')
  process.stdout.write(JSON.stringify({result:'PASS',tables:tables.length,files:output.originalFilesPreserved,frames:frames.length,downloads:handed.length,retrieval:output.retrieval})+'\n')
} finally {db.close();source.close()}
