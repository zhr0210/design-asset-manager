import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { test } from 'node:test'
import { build } from 'esbuild'
import { pathToFileURL } from 'node:url'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { createImageToolsController } from '../src/main/image-tools/image-tools-controller'
import { inspectLibraryControlStore } from '../src/main/library-lifecycle/library-open-control-store.internal'
import { openReadonlyLibraryDatabase } from '../src/main/library-lifecycle/readonly-library-database.internal'
import { readLibraryManifestDeclaration } from '../src/main/library-lifecycle/library-manifest.tracer'
import { verifyLibraryBackupSnapshot } from '../src/main/library-lifecycle/library-backup-snapshot.internal'
import { WINDOWS_BACKUP_RUNTIME_DIRECTORY } from '../src/main/platform/windows-backup-native/source-identity'
import sharp from 'sharp'
import Database from 'better-sqlite3'
import { createActiveLibraryHost } from '../src/main/library-lifecycle'
import { createProductionActiveLibraryHostDependencies } from '../src/main/library-lifecycle/production-active-library-dependencies'
import { createTagIntentController } from '../src/main/independent-tags/tag-intent-controller'
import { tagIntentSpacePolicy, withTagIntentGrowthCap, type TagIntentTestHooks } from '../src/main/independent-tags/tag-intent-backup'
import { createNewInstallAppSettingsDefaults } from '../src/main/services/settings/settings-defaults.builder'
import { enableVisualAiStorage } from '../src/main/visual-ai/visual-ai-storage'
import { enableDownloadJournal } from '../src/main/managed-download/download-journal.schema'
import { enableIntakeRecoveryStorage } from '../src/main/library-lifecycle/intake-recovery.schema'
import { enableNotebookStorage } from '../src/main/library-lifecycle/asset-notebook.schema'
import { enableOrganizationStorage } from '../src/main/library-lifecycle/library-organization.schema'
import { enableWorkSetStorage } from '../src/main/library-lifecycle/work-set.schema'
import { enableOcrStorage } from '../src/main/ocr/ocr.schema'
import { readVariantIntent } from '../src/main/library-lifecycle/image-variant-intents'
import type { TagIntentCommit } from '../src/shared/contracts/independent-tag-intent.contract'

await test('the production Host persists an explicitly reviewed intent and reads it after same-generation reopen', async () => {
  const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'dam-tag-intent-')))
  const source = path.join(root, 'generated.png'), library = path.join(root, 'library')
  await sharp({ create: { width: 100, height: 80, channels: 3, background: '#7799bb' } }).png().toFile(source)
  const host = createActiveLibraryHost(createProductionActiveLibraryHostDependencies({
    selectLibraryDirectory: async () => ({ kind: 'selected', directory: library }),
    selectLocalFiles: async () => ({ kind: 'selected', files: [{ filePath: source }] })
  }))
  try {
    const plan = await host.prepareCreate(); if (plan.kind !== 'planned') throw new Error('Missing generated create plan')
    await host.confirmCreate(plan.plan.receipt)
    const intake = await host.prepareAddAssets(); if (intake.kind !== 'planned') throw new Error('Missing generated intake plan')
    await host.dispatchAddAssets(intake.plan.receipt)
    const asset = (await host.listAssets())[0], current = host.inspect()
    const scope = { libraryIdentity: current.identity!, generation: current.generation!, assetId: asset.id }
    assert.equal(typeof host.readTagIntentContext, 'function', 'The real Host must expose the persistent-intent product boundary')
    const before = await host.readTagIntentContext(scope)
    assert.equal(before.schemaVersion, 1)
    assert.deepEqual((await host.readTagIntents(scope)).requests, [])
    const command = { ...scope, sessionToken: before.sessionToken, expectedSchemaVersion: before.schemaVersion,
      requestId: 'synthetic-request', assetRevision: asset.revision, previewGeneration: asset.thumbnailRef,
      backendId: 'synthetic', model: 'synthetic-model', backendBindingSha256: 'a'.repeat(64),
      recipeId: 'independent-tags-v1', recipeVersion: '1', allowUpgrade: false }
    await assert.rejects(host.saveTagIntent(command), /TAG_INTENT_UPGRADE_REQUIRED/)
    assert.equal((await host.readTagIntentContext(scope)).schemaVersion, 1)
    const saved = await host.saveTagIntent({ ...command, allowUpgrade: true })
    assert.equal(saved.requestId, command.requestId)
    assert.equal(saved.state, 'waiting-execution')
    assert.equal((await host.readTagIntentContext(scope)).schemaVersion, 9)
    assert.equal((await host.saveTagIntent({ ...command, allowUpgrade: true })).requestId, saved.requestId)
    assert.equal((await host.readTagIntents(scope)).requests.length, 1)
    await host.close(); await host.reopen()
    assert.equal(host.inspect().generation, scope.generation)
    const reopened = await host.readTagIntentContext(scope)
    assert.notEqual(reopened.sessionToken, before.sessionToken)
    assert.equal((await host.readTagIntents(scope)).requests[0].requestId, saved.requestId)
    await assert.rejects(host.saveTagIntent({ ...command, allowUpgrade: true }), /TAG_INTENT_SESSION_EXPIRED/)
  } finally { await host.close(); await fs.rm(root, { recursive: true, force: true }) }
})

async function fixture(hooks: TagIntentTestHooks = {}) {
  const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'dam-tag-intent-case-')))
  const source=path.join(root,'generated.png'),library=path.join(root,'library')
  await sharp({create:{width:80,height:80,channels:3,background:'#7799bb'}}).png().toFile(source)
  const host=createActiveLibraryHost({...createProductionActiveLibraryHostDependencies({selectLibraryDirectory:async()=>({kind:'selected',directory:library}),selectLocalFiles:async()=>({kind:'selected',files:[{filePath:source}]})}),tagIntentTestHooks:hooks})
  const plan=await host.prepareCreate();if(plan.kind!=='planned')throw Error('Missing fixture review');await host.confirmCreate(plan.plan.receipt)
  const intake=await host.prepareAddAssets();if(intake.kind!=='planned')throw Error('Missing fixture intake');await host.dispatchAddAssets(intake.plan.receipt)
  const asset=(await host.listAssets())[0],binding=host.inspect(),scope={libraryIdentity:binding.identity!,generation:binding.generation!,assetId:asset.id}
  const dbFile=path.join(library,'.dam','library.sqlite')
  const command=async():Promise<TagIntentCommit>=>{const c=await host.readTagIntentContext(scope);return{...scope,sessionToken:c.sessionToken,expectedSchemaVersion:c.schemaVersion,allowUpgrade:true,requestId:'request:one',assetRevision:asset.revision,previewGeneration:asset.thumbnailRef,backendId:'synthetic',model:'synthetic-model',backendBindingSha256:'a'.repeat(64),recipeId:'independent-tags-v1',recipeVersion:'1'}}
  return{root,library,host,asset,scope,dbFile,command,close:async()=>{await host.close();await fs.rm(root,{recursive:true,force:true})}}
}

for(const version of [1,2,3,4,5,6,7,8]) await test(`v${version} upgrades after verified backup and preserves the original snapshot`,async()=>{
  const f=await fixture()
  try {
    const db=new Database(f.dbFile)
    try { const enable=[undefined,undefined,enableVisualAiStorage,enableDownloadJournal,enableIntakeRecoveryStorage,enableNotebookStorage,enableOrganizationStorage,enableWorkSetStorage,enableOcrStorage][version];enable?.(db) } finally { db.close() }
    await f.host.updateAssetCaption(f.asset.id,'Preserved user caption')
    await f.host.saveTagIntent(await f.command())
    assert.equal((await f.host.readTagIntentContext(f.scope)).schemaVersion,9)
    const backups=path.join(f.library,'.dam','schema-backups'),dirs=await fs.readdir(backups)
    assert.equal(dirs.length,1)
    const copied=new Database(path.join(backups,dirs[0],'library.sqlite'),{readonly:true})
    try { assert.equal(copied.pragma('user_version',{simple:true}),version);assert.equal((copied.prepare('SELECT ai_caption AS caption FROM assets WHERE id=?').get(f.asset.id) as {caption:string}).caption,'Preserved user caption') } finally { copied.close() }
    assert.equal((await f.host.readOrganization({libraryIdentity:f.scope.libraryIdentity,generation:f.scope.generation})).revision,0,'Direct historical DDL preserves organization initialization seed')
    await f.host.close();await f.host.reopen()
    assert.equal((await f.host.listAssets())[0].aiCaption,'Preserved user caption')
  } finally { await f.close() }
})

await test('v9 keeps OCR correction, notebook, work set, organization and download journal read/write usable',async()=>{
  const f=await fixture()
  try {
    await f.host.saveTagIntent(await f.command())
    const scope={libraryIdentity:f.scope.libraryIdentity,generation:f.scope.generation}
    const o=await f.host.readOcr(f.scope)
    const saved=await f.host.commitOcr({...f.scope,sessionToken:o.sessionToken,expectedRevision:o.revision,allowUpgrade:false,evidence:{id:'ocr:v9',assetId:f.asset.id,assetRevision:f.asset.revision,sourceRef:f.asset.thumbnailRef,inputSha256:'e'.repeat(64),createdAt:new Date().toISOString(),observation:{engine:'rapidocr-onnxruntime',version:'1.4.4',recipe:'rapidocr-preview-v1',modelSha256:{det:'a'.repeat(64),cls:'b'.repeat(64),rec:'c'.repeat(64)},width:80,height:80,elapsedMs:1,threshold:.5,blocks:[]}}})
    await f.host.correctOcr({...f.scope,sessionToken:saved.sessionToken,expectedRevision:saved.revision,evidenceId:'ocr:v9',text:'User OCR retained'})
    const note=await f.host.readNotebook(f.scope)
    await f.host.saveNotebook({...f.scope,sessionToken:note.sessionToken,sourceRef:note.sourceRef,expectedRevision:note.revision,allowUpgrade:false,book:note.book})
    const org=await f.host.readOrganization(scope)
    await f.host.writeOrganization({...scope,sessionToken:org.sessionToken,expectedRevision:org.revision,allowUpgrade:false,command:{kind:'create',name:'Preserved folder',folderKind:'assets',parentId:null,assetIds:[f.asset.id]}})
    const work=await f.host.readWorkSets(scope,'device:synthetic')
    await f.host.writeWorkSet({...scope,sessionToken:work.sessionToken,allowUpgrade:false,command:{kind:'create',value:{name:'Preserved set',assetIds:[f.asset.id],note:'User note',colors:[],columns:1}}},'device:synthetic')
    const intent=await f.host.downloadJournal({kind:'create',generation:scope.generation,taskId:'download-synthetic',url:'https://fixture.invalid/not-requested.png',fileName:'generated.png'})
    assert.equal(intent.version,9)
    await f.host.close();await f.host.reopen()
    assert.equal((await f.host.readOcr(f.scope)).editedText,'User OCR retained')
    assert.equal((await f.host.readNotebook(f.scope)).revision,1)
    assert.equal((await f.host.readOrganization(scope)).folders[0].name,'Preserved folder')
    assert.equal((await f.host.readWorkSets(scope,'device:synthetic')).sets[0].note,'User note')
    assert.equal((await f.host.downloadJournal({kind:'list',generation:scope.generation})).intents!.length,1)
    assert.equal((await f.host.readTagIntentContext(f.scope)).schemaVersion,9)
  } finally { await f.close() }
})

for(const cut of ['space-before-backup','space-before-ddl','after-ddl','before-commit','growth-cap'] as const)await test(`${cut} rejects without a partially upgraded library`,async()=>{
  let measurements=0
  const hooks:TagIntentTestHooks=cut==='space-before-backup'?{availableBytes:async()=>0n}:cut==='space-before-ddl'?{availableBytes:async()=>++measurements===1?2n**60n:0n}:cut==='after-ddl'?{afterDdl:()=>{throw Error('synthetic')}}:cut==='before-commit'?{beforeCommit:()=>{throw Error('synthetic')}}:{growthLimitBytes:0}
  const f=await fixture(hooks)
  try {
    await assert.rejects(f.host.saveTagIntent(await f.command()))
    assert.equal((await f.host.readTagIntentContext(f.scope)).schemaVersion,1)
    assert.equal((await f.host.readTagIntents(f.scope)).requests.length,0)
    await f.host.close();await f.host.reopen()
    assert.equal((await f.host.listAssets()).length,1)
  } finally { await f.close() }
})

await test('backup maintenance refuses ordinary writes and a later close waits without deadlock',async()=>{
  let release!:()=>void,entered!:()=>void
  const atBackup=new Promise<void>(resolve=>{entered=resolve}),gate=new Promise<void>(resolve=>{release=resolve})
  const f=await fixture({afterBackup:async()=>{entered();await gate}})
  try {
    const saving=f.host.saveTagIntent(await f.command())
    await atBackup
    await assert.rejects(f.host.updateAssetCaption(f.asset.id,'must not interleave'))
    let closed=false;const closing=f.host.close().then(()=>{closed=true})
    await new Promise<void>(resolve=>setImmediate(resolve));assert.equal(closed,false)
    release();await saving;await closing
    await f.host.reopen();assert.equal((await f.host.readTagIntents(f.scope)).requests.length,1)
  } finally { release?.();await f.close() }
})

await test('cancel during verified backup prevents DDL and preserves a verifiable backup record',async()=>{
  const abort=new AbortController(),f=await fixture({afterBackup:async()=>{abort.abort()}})
  try {
    await assert.rejects(f.host.saveTagIntent(await f.command(),abort.signal),/TAG_INTENT_SESSION_EXPIRED/)
    assert.equal((await f.host.readTagIntentContext(f.scope)).schemaVersion,1)
    const dir=path.join(f.library,'.dam','schema-backups'),op=(await fs.readdir(dir))[0]
    if(process.platform==='win32') {
      // Windows uses append-only records. A cancelled HELD target may retain
      // verified + no finish, or verified + an explicit noncommitted finish.
      // Neither may be interpreted as a committed migration.
      const operation=path.join(dir,op),files=await fs.readdir(operation)
      const verified=JSON.parse(await fs.readFile(path.join(operation,'status-verified.json'),'utf8'))
      const bindingBytes=await fs.readFile(path.join(operation,'binding.json'))
      assert.equal(verified.protocol,1);assert.equal(verified.phase,'target-verified')
      assert.match(verified.imageSha256,/^[a-f0-9]{64}$/)
      assert.equal(verified.bindingSha256,createHash('sha256').update(bindingBytes).digest('hex'))
      const binding=JSON.parse(bindingBytes.toString('utf8'))
      assert.equal(binding.operation,op);assert.equal(binding.connection.schemaVersion,1)
      assert.equal(binding.imageSha256,verified.imageSha256)
      if(files.includes('status-finished.json')) {
        const finished=JSON.parse(await fs.readFile(path.join(operation,'status-finished.json'),'utf8'))
        assert.equal(finished.protocol,1);assert.equal(finished.phase,'finished')
        assert.equal(finished.mainDeclaredCommitted,false)
        assert.equal(finished.imageSha256,verified.imageSha256)
        assert.equal(finished.bindingSha256,verified.bindingSha256)
      }
      const declaration=readLibraryManifestDeclaration(new Uint8Array(await fs.readFile(path.join(f.library,'.dam','library.manifest.json'))))
      if(declaration.kind!=='compatible')throw Error('Missing generated interrupted-backup declaration')
      const image=await fs.readFile(path.join(operation,'library.sqlite'))
      verifyLibraryBackupSnapshot(image,{declaration:declaration.declaration,generation:f.scope.generation,
        schemaVersion:1,nativeReadbackSha256:verified.imageSha256})
      const backup=new Database(image,{readonly:true})
      try {assert.equal(backup.prepare('SELECT count(*) FROM assets WHERE id=?').pluck().get(f.asset.id),1)}finally{backup.close()}
      assert.equal(f.host.inspect().state,'ready','Known physical cancellation leaves ordinary Host admission available')
    } else {
      const status=JSON.parse(await fs.readFile(path.join(dir,op,'status.json'),'utf8'))
      assert.equal(status.phase,'verified-operation-interrupted');assert.match(status.sha256,/^[a-f0-9]{64}$/)
    }
  } finally { await f.close() }
})

await test('postcommit acknowledgement loss is resolved by current-scope idempotent lookup, not another migration',async()=>{
  let once=true;const f=await fixture({afterCommit:()=>{if(once){once=false;throw Error('synthetic lost ack')}}})
  try {
    const command=await f.command()
    await assert.rejects(f.host.saveTagIntent(command),/TAG_INTENT_ACK_UNCERTAIN/)
    assert.equal((await f.host.saveTagIntent(command)).requestGeneration,1)
    await assert.rejects(f.host.saveTagIntent({...command,model:'changed-model'}),/TAG_INTENT_REQUEST_CONFLICT/)
    assert.equal((await f.host.readTagIntents(f.scope)).requests.length,1)
    assert.equal((await fs.readdir(path.join(f.library,'.dam','schema-backups'))).length,1)
  } finally { await f.close() }
})

await test('variant recovery reads v8 and v9 rather than hiding a pending intent',async()=>{
  const f=await fixture()
  try {
    const db=new Database(f.dbFile)
    try { enableOcrStorage(db);db.prepare("INSERT INTO image_variant_intents VALUES('variant:test',?,'generated.png',1,?,'{}','pending',?)").run(f.scope.libraryIdentity,'a'.repeat(64),new Date().toISOString());assert.equal(readVariantIntent(db,f.scope.libraryIdentity,'variant:test')?.state,'pending') } finally {db.close()}
    await f.host.saveTagIntent(await f.command())
    assert.ok((await f.host.listIntakeRecovery()).items.some(x=>x.id==='variant:variant:test'))
  } finally { await f.close() }
})

await test('space arithmetic rejects unknown bounds and native page/spill settings restore after failure',()=>{
  assert.throws(()=>tagIntentSpacePolicy(1,123,4096n),/SPACE_UNKNOWN/)
  assert.throws(()=>tagIntentSpacePolicy(Number.MAX_SAFE_INTEGER,4096,4096n),/SPACE_UNKNOWN/)
  const policy=tagIntentSpacePolicy(10,4096,40960n)
  assert.equal(policy.beforeBackup-policy.beforeDdl,40960n)
  const db=new Database(':memory:')
  try {
    const cap=db.pragma('max_page_count',{simple:true}),spill=db.pragma('cache_spill',{simple:true})
    assert.throws(()=>withTagIntentGrowthCap(db,10,()=>{throw Error('synthetic rollback')}),/synthetic rollback/)
    assert.equal(db.pragma('max_page_count',{simple:true}),cap);assert.equal(db.pragma('cache_spill',{simple:true}),spill)
  } finally {db.close()}
})

await test('controller review is owner-bound, read-only and does not call a provider or network',async()=>{
  const f=await fixture(),settings=createNewInstallAppSettingsDefaults();let network=0
  const oldFetch=globalThis.fetch;globalThis.fetch=async()=>{network++;throw Error('Unexpected synthetic test network')}
  settings.aiBackends=[{id:'synthetic',name:'Synthetic',type:'openai-compatible',enabled:true,baseUrl:'http://127.0.0.1:1/v1',defaultModel:'synthetic-model',priority:1,timeoutMs:1000,capabilities:{chat:true,vision:true,embeddings:false,jsonOutput:true,modelList:true,modelManagement:false}}]
  const controller=createTagIntentController({host:f.host,settings:()=>settings,changed:()=>{throw Error('notification fault')}})
  try {
    const review=await controller.prepare('card:one',{...f.scope,backendId:'synthetic',requestId:'ui:one'})
    assert.equal(review.requiresUpgrade,true);assert.equal((await f.host.readTagIntentContext(f.scope)).schemaVersion,1)
    await assert.rejects(controller.confirm('card:other',review.receipt))
    assert.equal((await controller.confirm('card:one',review.receipt)).state,'waiting-execution')
    assert.equal(network,0)
    const stale=await controller.prepare('card:one',{...f.scope,backendId:'synthetic',requestId:'ui:two'})
    controller.cancelOwner('card:one');await assert.rejects(controller.confirm('card:one',stale.receipt))
    assert.equal((await controller.read(f.scope)).requests.length,1)
  } finally {controller.invalidate();globalThis.fetch=oldFetch;await f.close()}
})

await test('a native settings restoration exception quarantines the Host and still attempts both settings',async()=>{
  const f=await fixture(),original=Database.prototype.pragma
  let restoredCap=false,injected=false
  try {
    Database.prototype.pragma=function(sql:string,options?:any):any {
      if(sql.startsWith('cache_spill = ')&&!sql.endsWith('OFF')&&!injected){injected=true;throw Error('synthetic native restoration fault')}
      if(injected&&sql.startsWith('max_page_count = '))restoredCap=true
      return original.call(this,sql,options)
    }
    await assert.rejects(f.host.saveTagIntent(await f.command()),/TAG_INTENT_SETTINGS_RESTORE_FAILED/)
    assert.equal(restoredCap,true)
    assert.equal(f.host.inspect().state,'recovery-required')
    await assert.rejects(f.host.updateAssetCaption(f.asset.id,'must not write'))
  } finally {Database.prototype.pragma=original;await f.close()}
})

await test('Trash refuses tag operations; restoration retains intent history and invalidates the old source receipt',async()=>{
  const f=await fixture()
  try {
    const old=await f.command();await f.host.saveTagIntent(old)
    const info=await f.host.inspectTrash(f.asset.id)
    const plan=await f.host.prepareTrash({designAssetIdentity:f.asset.id,expectedRevision:info.revision})
    const trashed=await f.host.dispatchTrash({kind:'confirm-plan',planReceipt:plan.plan.receipt})
    await assert.rejects(f.host.readTagIntents(f.scope))
    await assert.rejects(f.host.saveTagIntent({...old,requestId:'after-trash'}))
    await f.host.dispatchTrash({kind:'restore-design-asset',designAssetIdentity:f.asset.id,expectedRevision:trashed.revision})
    assert.equal((await f.host.readTagIntents(f.scope)).requests.length,1)
    await assert.rejects(f.host.saveTagIntent({...old,requestId:'after-restore'}))
  } finally {await f.close()}
})

await test('lease identity replacement during backup refuses DDL and seals Host admission',async()=>{
  let control='',replacementDenied:string|undefined,originalLock:Buffer|undefined
  const f=await fixture({afterBackup:async()=>{const lock=path.join(control,'exclusive-library-lock.sqlite');originalLock=await fs.readFile(lock);try{await fs.rename(lock,lock+'.synthetic-displaced')}catch(error){replacementDenied=(error as NodeJS.ErrnoException).code;throw error}await fs.copyFile(lock+'.synthetic-displaced',lock)}})
  control=path.join(f.library,'.dam')
  try {
    await assert.rejects(f.host.saveTagIntent(await f.command()))
    if(process.platform==='win32'){
      assert.match(replacementDenied??'',/^(EPERM|EBUSY|EACCES)$/,'Windows denies replacement of the actually held native lock file')
      assert.deepEqual(await fs.readFile(path.join(control,'exclusive-library-lock.sqlite')),originalLock)
      await assert.rejects(fs.access(path.join(control,'exclusive-library-lock.sqlite.synthetic-displaced')))
      assert.equal(f.host.inspect().state,'ready','Unchanged held lease remains valid after the OS refused displacement')
      await f.host.updateAssetCaption(f.asset.id,'Still held after denied lock replacement')
    }else assert.equal(f.host.inspect().state,'recovery-required')
    const db=new Database(f.dbFile,{readonly:true});try {assert.equal(db.pragma('user_version',{simple:true}),1);assert.equal(db.prepare("SELECT count(*) AS n FROM sqlite_schema WHERE name='independent_tag_requests'").pluck().get(),0)}finally{db.close()}
  } finally {await f.close()}
})

async function frozenV8(name:string) {
  // Archived source identity is its original LF text; Windows checkout CRLF must not rebaseline the frozen code.
  const folder=path.resolve('scripts/fixtures/independent-tags-v8'),source=(await fs.readFile(path.join(folder,name+'.txt'),'utf8')).replace(/\r\n/g,'\n')
  const manifest=JSON.parse(await fs.readFile(path.join(folder,'manifest.json'),'utf8'))
  assert.equal(createHash('sha256').update(source).digest('hex'),manifest[name].sha256)
  const result=await build({stdin:{contents:source,loader:'ts',resolveDir:path.resolve('src/main/library-lifecycle')},bundle:true,platform:'node',format:'esm',packages:'external',write:false})
  const output=path.resolve('dist-temp/tests','frozen-'+name+'.mjs');await fs.writeFile(output,result.outputFiles[0].text)
  return import(pathToFileURL(output).href)
}
await test('frozen v8 inspector rejects v9 without writes and the new inspector refuses unknown higher versions',async()=>{
  const f=await fixture()
  try {
    await f.host.saveTagIntent(await f.command());await f.host.close()
    const declaration=readLibraryManifestDeclaration(new Uint8Array(await fs.readFile(path.join(f.library,'.dam','library.manifest.json'))))
    if(declaration.kind!=='compatible')throw Error('fixture manifest')
    const previous=await frozenV8('library-open-control-store.internal.ts')
    const before=await fs.readFile(f.dbFile),db=openReadonlyLibraryDatabase(f.dbFile)
    try {assert.equal(previous.inspectLibraryControlStore(db,declaration.declaration).kind,'unsupported')}finally{db.close()}
    assert.deepEqual(await fs.readFile(f.dbFile),before)
    const setup=new Database(f.dbFile);setup.pragma('user_version = 99');setup.close()
    const unknown=await fs.readFile(f.dbFile),reader=openReadonlyLibraryDatabase(f.dbFile)
    try {assert.equal(inspectLibraryControlStore(reader,declaration.declaration).kind,'unsupported')}finally{reader.close()}
    await assert.rejects(f.host.reopen(),(error:any)=>error.code==='library-recovery-required');assert.notEqual(f.host.inspect().state,'ready');assert.deepEqual(await fs.readFile(f.dbFile),unknown)
  } finally {await f.close()}
})
await test('frozen pre-C02B v8 variant reader demonstrates the missing pending-intent regression',async()=>{
  const f=await fixture()
  try {
    const prior=await frozenV8('image-variant-intents.ts'),db=new Database(f.dbFile)
    try {
      enableOcrStorage(db);db.prepare("INSERT INTO image_variant_intents VALUES('variant:baseline',?,'generated.png',1,?,'{}','pending',?)").run(f.scope.libraryIdentity,'a'.repeat(64),new Date().toISOString())
      assert.equal(prior.readVariantIntent(db,f.scope.libraryIdentity,'variant:baseline'),undefined,'Frozen old code hides v8 intent')
      assert.equal(readVariantIntent(db,f.scope.libraryIdentity,'variant:baseline')?.state,'pending')
    } finally {db.close()}
  } finally {await f.close()}
})
await test('backup transfer failure records the observed partial state and never upgrades',async()=>{
  const f=await fixture(),original=Database.prototype.backup
  const localRequire=createRequire(import.meta.url)
  const nodeModule=localRequire('node:module') as {_load:(request:string,parent:unknown,isMain:boolean)=>any}
  const originalLoad=nodeModule._load
  let cut=false,partialWritten=false,observed=''
  try {
    const before=await fs.readFile(f.dbFile)
    if(process.platform==='win32') {
      const supervisorFile=path.resolve('build/windows-backup-runtime/win32-x64',WINDOWS_BACKUP_RUNTIME_DIRECTORY,'supervisor.node')
      // Keep manifest/artifact/source checks and the actual native transport.
      // Intercept its load only after the production loader acquired admission;
      // truncate the real image write, then close the actual input pipe.
      nodeModule._load=function(request:string,parent:unknown,isMain:boolean):any {
        const native=originalLoad.call(this,request,parent,isMain)
        if(request!==supervisorFile)return native
        const transport=Object.fromEntries(Object.getOwnPropertyNames(native).map(key=>[key,native[key]]))
        transport.write=(owner:object,bytes:Buffer,callback:(error:Error|null)=>void)=>{
          if(cut||bytes.subarray(0,16).toString('binary')!=='SQLite format 3\0')return native.write(owner,bytes,callback)
          assert.ok(bytes.length>4096,'The controlled image must have a genuinely truncated body')
          cut=true
          return native.write(owner,bytes.subarray(0,4096),(error:Error|null)=>{
            if(error)return callback(error)
            partialWritten=true
            try {native.end(owner);callback(null)}catch(failure){callback(failure as Error)}
          })
        }
        transport.poll=(owner:object,discard?:boolean)=>{
          const result=native.poll(owner,discard)
          observed+=result.stdout
          return result
        }
        return transport
      }
    } else Database.prototype.backup=async function(destination:string):Promise<any>{cut=true;await fs.writeFile(destination,'synthetic incomplete backup');throw Error('synthetic transfer fault')}
    await assert.rejects(f.host.saveTagIntent(await f.command()))
    assert.equal(cut,true,'The platform-specific native transfer fault must actually be reached')
    assert.equal((await f.host.readTagIntentContext(f.scope)).schemaVersion,1)
    const parent=path.join(f.library,'.dam','schema-backups')
    if(process.platform==='win32') {
      assert.equal(partialWritten,true,'Partial bytes passed through the real native pipe before EOF')
      assert.match(observed,/"Reason":"TRUNCATED_IMAGE"/,'The actual target must diagnose the truncated frame')
      // This target reads the complete frame before creating status or target.
      // The observed partial state is absent; no manufactured status/hash is
      // allowed to turn the failed transfer into a verified backup.
      await assert.rejects(fs.access(parent),(error:NodeJS.ErrnoException)=>error.code==='ENOENT')
      assert.deepEqual(await fs.readFile(f.dbFile),before,'No DDL or source write may follow the failed transfer')
      const database=new Database(f.dbFile,{readonly:true})
      try {assert.equal(database.prepare("SELECT count(*) FROM sqlite_schema WHERE name='independent_tag_requests'").pluck().get(),0)}finally{database.close()}
      assert.equal(f.host.inspect().state,'ready','Known target EOF does not quarantine ordinary library use')
    } else {
      const op=(await fs.readdir(parent))[0],status=JSON.parse(await fs.readFile(path.join(parent,op,'status.json'),'utf8'))
      assert.equal(status.phase,'failed-or-cancelled');assert.equal(status.partial,'surviving-unverified');assert.equal(status.sha256,undefined)
      assert.equal(await fs.readFile(path.join(parent,op,'library.sqlite'),'utf8'),'synthetic incomplete backup')
    }
  } finally {nodeModule._load=originalLoad;Database.prototype.backup=original;await f.close()}
})
await test('v9 visual evidence, confirmed tags, palette, layout and owned download/variant recovery remain usable',async()=>{
  const f=await fixture()
  try {
    await f.host.saveTagIntent(await f.command())
    const scope={libraryIdentity:f.scope.libraryIdentity,generation:f.scope.generation}
    await f.host.updateAssetCaption(f.asset.id,'User caption')
    for(const purpose of ['analyze','reverse'] as const)await f.host.saveVisualAiEvidence({id:'evidence:'+purpose,assetId:f.asset.id,assetRevision:f.asset.revision,previewGeneration:f.asset.thumbnailRef,inputSha256:'a'.repeat(64),backendId:'synthetic',providerOrigin:'http://127.0.0.1:1',model:'fixture',purpose,inputScope:'controlled-preview-rgb',recipe:'visual-ai-v1',createdAt:new Date().toISOString(),output:{caption:'AI caption',ocrText:'',prompt:'Synthetic prompt',tags:['蓝色']}})
    await f.host.confirmVisualAiTag(f.asset.id,'evidence:reverse','蓝色')
    const org=await f.host.readOrganization(scope)
    await f.host.writeOrganization({...scope,sessionToken:org.sessionToken,expectedRevision:org.revision,allowUpgrade:false,command:{kind:'create',name:'Colors',folderKind:'palette',parentId:null,color:{hex:'#AABBCC',sourceAssetId:f.asset.id}}})
    const w=await f.host.readWorkSets(scope,'device:test'),saved=await f.host.writeWorkSet({...scope,sessionToken:w.sessionToken,allowUpgrade:false,command:{kind:'create',value:{name:'Layout',note:'',assetIds:[f.asset.id],colors:[],columns:1}}},'device:test')
    const layout={x:20,y:20,width:400,height:500,pinned:true,open:true}
    await f.host.writeWorkLayout({...scope,sessionToken:w.sessionToken,id:saved.sets[0].id,layout},'device:test')
    const bytes=await fs.readFile(path.join(f.root,'generated.png')),download={requestId:'v9-recovery',generation:scope.generation,fileName:'recovered.png',sourceUrl:'https://fixture.invalid/not-requested',bytes}
    const db=new Database(f.dbFile)
    const fault=()=>db.exec("CREATE TRIGGER synthetic_failure BEFORE INSERT ON promotion_links BEGIN SELECT RAISE(ABORT,'fixture'); END")
    const clear=()=>db.exec('DROP TRIGGER synthetic_failure')
    try {
      fault();await assert.rejects(f.host.importDownloadedImage(download));clear()
      const imported=await f.host.recoverDownloadedImage(download)
      assert.ok((await f.host.listAssets()).some(a=>a.id===imported.assetId))
      const images=createImageToolsController({host:f.host,onSaved(){}})
      const review=await images.prepare('test',{...f.scope,options:{rotation:90,mirror:false,crop:'original',maxEdge:640}})
      fault();await assert.rejects(images.save('test',review.receipt));clear()
      const pending=(await f.host.listIntakeRecovery()).items.find(i=>i.kind==='variant')!
      const recovery=await f.host.prepareIntakeRecovery({id:pending.id});if(recovery.kind==='cancelled')throw Error('fixture cancelled')
      const recovered=await f.host.runIntakeRecovery(recovery.receipt);assert.ok((await f.host.listAssets()).some(a=>a.id===recovered.assetId))
      assert.equal((await f.host.listIntakeRecovery()).items.length,0)
    } finally {db.close()}
    await f.host.close();await f.host.reopen()
    assert.equal((await f.host.listVisualAiEvidence(f.asset.id)).length,2)
    const asset=(await f.host.listAssets()).find(a=>a.id===f.asset.id)!
    assert.equal(asset.aiCaption,'User caption');assert.deepEqual(asset.tags,['蓝色'])
    assert.deepEqual((await f.host.readWorkSets(scope,'device:test')).sets[0].layout,layout)
    assert.equal((await f.host.readOrganization(scope)).folders[0].colors[0].hex,'#AABBCC')
  } finally {await f.close()}
})

await test('failure after historical DDL but before new tables rolls all schema changes back',async()=>{
  const f=await fixture(),original=Database.prototype.exec;let cut=false
  try {
    Database.prototype.exec=function(sql:string){if(sql.startsWith('CREATE TABLE independent_tag_requests')){cut=true;throw Error('synthetic new-DDL fault')}return original.call(this,sql)}
    await assert.rejects(f.host.saveTagIntent(await f.command()));assert.equal(cut,true)
    assert.equal((await f.host.readTagIntentContext(f.scope)).schemaVersion,1)
    const db=new Database(f.dbFile,{readonly:true});try {assert.equal(db.prepare("SELECT count(*) FROM sqlite_schema WHERE name IN ('visual_ai_evidence','ocr_evidence','independent_tag_requests')").pluck().get(),0)}finally{db.close()}
  }finally{Database.prototype.exec=original;await f.close()}
})
await test('unqualified SQLite source refuses upgrade before backup without disabling ordinary library operations',async()=>{
  const f=await fixture(),original=Database.prototype.prepare
  let sourceQueryHit=false
  try {
    Database.prototype.prepare=function(sql:string):any{if(sql==='SELECT sqlite_source_id() AS source'){sourceQueryHit=true;return original.call(this,"SELECT 'unqualified-build' AS source")}return original.call(this,sql)}
    await assert.rejects(f.host.saveTagIntent(await f.command()),/TAG_INTENT_BACKUP_UNSUPPORTED/)
    assert.equal(sourceQueryHit,true,'The actual qualification query must observe the unqualified SQLite source')
    assert.equal(f.host.inspect().state,'ready');assert.equal((await f.host.readTagIntentContext(f.scope)).schemaVersion,1)
    await assert.rejects(fs.access(path.join(f.library,'.dam','schema-backups')))
    await f.host.updateAssetCaption(f.asset.id,'Ordinary use remains available')
    assert.equal((await f.host.listAssets())[0].aiCaption,'Ordinary use remains available')
  }finally{Database.prototype.prepare=original;await f.close()}
})
