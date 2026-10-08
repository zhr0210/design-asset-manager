import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import {test} from 'node:test'
import {createHash} from 'node:crypto'
import {createRequire} from 'node:module'
import sharp from 'sharp'
import Database from 'better-sqlite3'
import {createActiveLibraryHost} from '../src/main/library-lifecycle'
import {createProductionActiveLibraryHostDependencies} from '../src/main/library-lifecycle/production-active-library-dependencies'
import {qualifyLocalVolume, isQualifiedWindowsVolumeEvidence} from '../src/main/library-lifecycle/local-volume-qualification'
import type {TagIntentTestHooks} from '../src/main/independent-tags/tag-intent-backup'

async function fixture(hooks: TagIntentTestHooks = {}, missingRuntime = false) {
  const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'dam-win-backup-')))
  const library = path.join(root, 'library'), source = path.join(root, 'generated.png')
  await sharp({create: {width: 24, height: 16, channels: 3, background: '#7799bb'}}).png().toFile(source)
  const host = createActiveLibraryHost({...createProductionActiveLibraryHostDependencies({
    selectLibraryDirectory: async () => ({kind: 'selected', directory: library}),
    selectLocalFiles: async () => ({kind: 'selected', files: [{filePath: source}]})
  }, missingRuntime ? {backupBundleDirectory: path.join(root, 'absent-runtime')} : {}), tagIntentTestHooks: hooks})
  const create = await host.prepareCreate(); if (create.kind !== 'planned') throw Error('synthetic create')
  await host.confirmCreate(create.plan.receipt)
  const add = await host.prepareAddAssets(); if (add.kind !== 'planned') throw Error('synthetic add')
  await host.dispatchAddAssets(add.plan.receipt)
  const asset = (await host.listAssets())[0], state = host.inspect()
  const scope = {libraryIdentity: state.identity!, generation: state.generation!, assetId: asset.id}
  const control = path.join(library, '.dam'), file = path.join(control, 'library.sqlite')
  const intent = async () => {
    const current = await host.readTagIntentContext(scope)
    return {...scope, sessionToken: current.sessionToken, expectedSchemaVersion: current.schemaVersion, allowUpgrade: true,
      requestId: 'synthetic-win-intent', assetRevision: asset.revision, previewGeneration: asset.thumbnailRef,
      backendId: 'synthetic', model: 'synthetic', backendBindingSha256: 'a'.repeat(64), recipeId: 'independent-tags-v1', recipeVersion: '1'}
  }
  return {root, library, host, scope, asset, file, control, intent, close: async () => {
    await host.close()
    assert.equal(path.dirname(root), path.resolve(os.tmpdir())); assert.ok(path.basename(root).startsWith('dam-win-backup-'))
    await fs.rm(root, {recursive: true, force: true, maxRetries: 10, retryDelay: 100})
  }}
}


// Successful transient Windows adapter runs are retained as a WITHDRAWN TRACER
// in .scratch/windows-qualification-20261003. They do not qualify production.
await test('local fixed NTFS and installed runtime/native prerequisites are measured, not a backup grant', async () => {
  const f=await fixture()
  try {
    assert.equal(process.platform,'win32');assert.equal(process.arch,'x64')
    assert.equal(process.versions.electron,'30.5.1');assert.equal(process.versions.node,'20.16.0');assert.equal(process.versions.modules,'123')
    assert.equal((await qualifyLocalVolume(f.control,f.scope.libraryIdentity)).kind,'qualified')
    assert.equal((await qualifyLocalVolume('\\\\synthetic.invalid\\never-contact','synthetic')).kind,'unsupported')
    for(const evidence of [{type:4,format:'NTFS',writable:true},{type:3,format:'ReFS',writable:true},{type:3,format:'NTFS',writable:false},{}])assert.equal(isQualifiedWindowsVolumeEvidence(evidence),false)
    const native=createRequire(import.meta.url).resolve('better-sqlite3/build/Release/better_sqlite3.node')
    assert.equal(createHash('sha256').update(await fs.readFile(native)).digest('hex'),'258341bfff296ac7a779c1dfc35e0b781c18c1a1b9ec3406551dbb473b4fe359')
    const db=new Database(':memory:')
    try {assert.equal(db.prepare('SELECT sqlite_version()').pluck().get(),'3.53.1');assert.equal(db.prepare('SELECT sqlite_source_id()').pluck().get(),'2026-05-05 10:34:17 c88b22011a54b4f6fbd149e9f8e4de77658ce58143a1af0e3785e4e6475127e9')}
    finally{db.close()}
  } finally{await f.close()}
})

await test('production Windows without its pinned Runtime refuses before backup writes; ordinary data and reopen remain usable',async()=>{
  const f=await fixture({},true)
  try{
    await f.host.updateAssetCaption(f.asset.id,'Preserved synthetic user caption')
    await assert.rejects(f.host.saveTagIntent(await f.intent()),/TAG_INTENT_BACKUP_UNSUPPORTED/)
    assert.equal((await f.host.readTagIntentContext(f.scope)).schemaVersion,1)
    assert.deepEqual((await f.host.readTagIntents(f.scope)).requests,[])
    await assert.rejects(fs.access(path.join(f.control,'schema-backups')))
    assert.equal(f.host.inspect().state,'ready')
    await f.host.updateAssetCaption(f.asset.id,'Ordinary use after capability refusal')
    await f.host.close();await f.host.reopen()
    assert.equal((await f.host.listAssets())[0].aiCaption,'Ordinary use after capability refusal')
    assert.equal((await f.host.readTagIntentContext(f.scope)).schemaVersion,1)
  }finally{await f.close()}
})

await test('space/fault hooks cannot grant a Windows backup qualification',async()=>{
  let entered=false
  const f=await fixture({availableBytes:async()=>2n**60n,afterBackup:async()=>{entered=true}},true)
  try{
    await assert.rejects(f.host.saveTagIntent(await f.intent()),/TAG_INTENT_BACKUP_UNSUPPORTED/)
    assert.equal(entered,false);assert.equal((await f.host.readTagIntentContext(f.scope)).schemaVersion,1)
    await assert.rejects(fs.access(path.join(f.control,'schema-backups')))
  }finally{await f.close()}
})

await test('a pre-existing backup junction never reaches a Windows publication or mutates its outside target',async()=>{
  const f=await fixture(),outside=path.join(f.root,'outside-library')
  try{
    await fs.mkdir(outside);await fs.writeFile(path.join(outside,'status.json'),'Retained outside target')
    await fs.symlink(outside,path.join(f.control,'schema-backups'),'junction')
    await assert.rejects(f.host.saveTagIntent(await f.intent()),/TAG_INTENT_BACKUP_UNSUPPORTED/)
    assert.deepEqual(await fs.readdir(outside),['status.json'])
    assert.equal(await fs.readFile(path.join(outside,'status.json'),'utf8'),'Retained outside target')
    assert.equal((await f.host.readTagIntentContext(f.scope)).schemaVersion,1)
  }finally{await f.close()}
})
