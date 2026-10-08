import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {createHash} from 'node:crypto'
import Database from 'better-sqlite3'
import sharp from 'sharp'
import {createActiveLibraryHost,type ActiveLibraryHostDependencies} from '../src/main/library-lifecycle'
import type {LibraryCreationQualificationInput} from '../src/main/library-lifecycle/library-creation-planner.tracer'
import type {LibraryOpenQualificationInput} from '../src/main/library-lifecycle/library-open-inspection.tracer'
import {validateNotebook,type AssetNotebook} from '../src/shared/contracts/asset-notebook.contract'
import {registerActiveLibraryIpc} from '../src/main/ipc/active-library.ipc'
const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'dam-notebook-host-')))
let selected=path.join(root,'library-a');const source=path.join(root,'source.png')
await sharp({create:{width:80,height:90,channels:3,background:'#596a7b'}}).png().toFile(source)
const hash=async()=>createHash('sha256').update(await fs.readFile(source)).digest('hex'),before=await hash()
const dependencies:ActiveLibraryHostDependencies={selectLibraryDirectory:async()=>({kind:'selected',directory:selected}),selectLocalFiles:async()=>({kind:'selected',files:[{filePath:source}]}),
  targetPlatform: {
    platform: process.platform,
    targetNameIsSupported: (name) => name.length > 0 && !name.startsWith('.'),
    inspectAccess: async () => 'read-write'
  },
  creationQualification: {
    inspect: (input: LibraryCreationQualificationInput) => ({
      targetGeneration: input.targetGeneration,
      qualificationGeneration: 'qualification:synthetic-1',
      filesystem: {
        kind: 'qualified', scopeIdentity: input.scopeIdentity,
        maxComponentUtf8Bytes: 255, maxCompletePathUtf16Units: 4096,
        atomicReplace: 'qualified', durableCommit: 'qualified', mountBoundary: 'qualified'
      },
      access: { kind: 'read-write', scopeIdentity: input.accessScopeIdentity },
      exclusiveLock: 'qualified',
      capacity: { availableBytes: 1024 * 1024 * 1024, requiredBytes: 1, safetyReserveBytes: 1 }
    })
  },
  openQualification: {
    inspect: (input: LibraryOpenQualificationInput) => ({
      inspectionIdentity: input.inspectionIdentity,
      generation: input.generation,
      filesystem: {
        kind: 'qualified', scopeIdentity: input.scopeIdentity,
        maxComponentUtf8Bytes: 255, maxCompletePathUtf16Units: 4096,
        atomicReplace: 'qualified', durableCommit: 'qualified', mountBoundary: 'qualified'
      },
      access: 'read-write', lock: 'available'
    })
  }
}
let host=createActiveLibraryHost(dependencies)
async function create(){const plan=await host.prepareCreate();assert.equal(plan.kind,'planned');if(plan.kind!=='planned')throw Error();await host.confirmCreate(plan.plan.receipt);const add=await host.prepareAddAssets();if(add.kind!=='planned')throw Error();await host.dispatchAddAssets(add.plan.receipt);return (await host.listAssets())[0]}
const asset=await create(),projection=host.inspect(),scope={libraryIdentity:projection.identity!,generation:projection.generation!,assetId:asset.id}
const dbPath=path.join(selected,'.dam','library.sqlite')
const version=()=>{const db=new Database(path.join(selected,'.dam','library.sqlite'),{readonly:true});try{return db.pragma('user_version',{simple:true})}finally{db.close()}}
const initial=await host.readNotebook(scope);assert.equal(initial.revision,0);assert.equal(version(),1)
const book:AssetNotebook={pages:[{id:'page-one',name:'构图',elements:[{id:'rect-one',kind:'rect',x:20,y:30,width:50,height:70,color:'#aabbcc',stroke:3},{id:'sticky-one',kind:'sticky',x:200,y:150,text:'留白',color:'#334455',stroke:3}]},{id:'page-two',name:'颜色',elements:[]}],active:'page-one'}
const request={...scope,sessionToken:initial.sessionToken,sourceRef:initial.sourceRef,expectedRevision:0,allowUpgrade:false,book}
await assert.rejects(host.saveNotebook(request),e=>(e as any).code==='notebook-upgrade-required');assert.equal(version(),1)
const saved=await host.saveNotebook({...request,allowUpgrade:true});assert.equal(version(),5);assert.equal(saved.revision,1);assert.deepEqual(saved.book,book)
await assert.rejects(host.saveNotebook({...request,allowUpgrade:true}),e=>(e as any).code==='notebook-conflict')
await assert.rejects(host.saveNotebook({...request,expectedRevision:1,sourceRef:'preview:other'}));assert.deepEqual((await host.readNotebook(scope)).book,book)
const malformed=structuredClone(book);malformed.pages[0].elements[0].x=Infinity;await assert.rejects(host.saveNotebook({...request,expectedRevision:1,book:malformed}));assert.equal((await host.readNotebook(scope)).revision,1)
assert.throws(()=>validateNotebook({...book,unknown:'field'}));assert.throws(()=>validateNotebook({...book,pages:Array(101).fill(book.pages[0])}))
const handlers=new Map<string,Function>();registerActiveLibraryIpc({host,isTrustedSender:e=>(e as any).ok===true},(channel,handler)=>{handlers.set(channel,handler)})
assert.equal((await handlers.get('library-notebook:save')!({ok:false},request)).code,'UNTRUSTED_SENDER')
assert.equal((await handlers.get('library-notebook:save')!({ok:true},{...request,arbitraryPath:'/nope'})).success,false)
const trashInfo=await host.inspectTrash(asset.id);const plan=await host.prepareTrash({designAssetIdentity:asset.id,expectedRevision:trashInfo.revision});const trashed=await host.dispatchTrash({kind:'confirm-plan',planReceipt:plan.plan.receipt})
assert.deepEqual((await host.readNotebook(scope)).book,book);await assert.rejects(host.saveNotebook({...request,expectedRevision:1}))
await host.dispatchTrash({kind:'restore-design-asset',designAssetIdentity:asset.id,expectedRevision:trashed.revision});assert.deepEqual((await host.readNotebook(scope)).book,book)
await host.close();await assert.rejects(host.readNotebook(scope));await host.reopen();const reopened=await host.readNotebook(scope);assert.notEqual(reopened.sessionToken,initial.sessionToken);assert.deepEqual(reopened.book,book)
await assert.rejects(host.saveNotebook({...request,expectedRevision:1}),e=>(e as any).code==='library-generation-conflict')
await host.close();host=createActiveLibraryHost(dependencies);await host.open();assert.deepEqual((await host.readNotebook(scope)).book,book)
// Real SQLite failure rolls back and leaves the committed notebook readable.
const fault=new Database(dbPath);fault.exec("CREATE TEMP TABLE irrelevant(x)");fault.exec("CREATE TRIGGER fail_notebook BEFORE UPDATE ON asset_notebooks BEGIN SELECT RAISE(ABORT,'SYNTHETIC_WRITE_FAILURE'); END;")
const current=await host.readNotebook(scope);await assert.rejects(host.saveNotebook({...request,sessionToken:current.sessionToken,expectedRevision:current.revision,book:{...book,active:'page-two'}}));assert.deepEqual((await host.readNotebook(scope)).book,book);fault.exec('DROP TRIGGER fail_notebook');fault.close()
await host.close();selected=path.join(root,'library-b');await create();await assert.rejects(host.readNotebook(scope));assert.equal(version(),1)
await host.close();selected=path.join(root,'library-a');await host.open();assert.deepEqual((await host.readNotebook(scope)).book,book);await host.close()
assert.equal(await hash(),before)
console.log('Notebook host: upgrade consent, v5 reopen, restart, revisions, stale sessions, library isolation, trash restore, write failure, validation and trusted IPC passed; source hash unchanged')
