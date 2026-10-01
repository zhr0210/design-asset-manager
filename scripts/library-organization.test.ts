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
const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'dam-organization-host-')))
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

const asset=await create(),authority=host.inspect(),scope={libraryIdentity:authority.identity!,generation:authority.generation!}
const version=()=>{const db=new Database(path.join(selected,'.dam','library.sqlite'),{readonly:true});try{return db.pragma('user_version',{simple:true})}finally{db.close()}}
let snapshot=await host.readOrganization(scope);assert.equal(version(),1);assert.deepEqual(snapshot.folders,[])
const write=async(command:any,allowUpgrade=true)=>{snapshot=await host.writeOrganization({...scope,sessionToken:snapshot.sessionToken,expectedRevision:snapshot.revision,allowUpgrade,command});return snapshot}
await assert.rejects(write({kind:'create',name:'References',folderKind:'assets',parentId:null},false));assert.equal(version(),1)
await write({kind:'create',name:'References',folderKind:'assets',parentId:null,assetIds:[asset.id]});const parent=snapshot.folders[0].id;assert.equal(version(),6);assert.equal((await host.listAssets()).length,1)
await write({kind:'add-assets',folderId:parent,assetIds:[asset.id,asset.id]});assert.equal(snapshot.folders[0].assetIds.length,1)
await write({kind:'create',name:'Child',folderKind:'assets',parentId:parent});const child=snapshot.folders.find(f=>f.name==='Child')!.id
await assert.rejects(write({kind:'move',folderId:parent,parentId:child}));await assert.rejects(write({kind:'delete',folderId:parent}));
await write({kind:'update',folderId:child,name:'Nested',parentId:parent});assert.equal(snapshot.folders.find(f=>f.id===child)?.name,'Nested')
await write({kind:'create',name:'Other',folderKind:'assets',parentId:null,assetIds:[asset.id]});const other=snapshot.folders.find(f=>f.name==='Other')!.id
await write({kind:'remove-assets',folderId:parent,assetIds:[asset.id]});assert.equal((await host.listAssets()).length,1);assert.deepEqual(snapshot.folders.find(f=>f.id===other)?.assetIds,[asset.id])
await write({kind:'create',name:'Palette',folderKind:'palette',parentId:null,color:{hex:'#aabbcc',sourceAssetId:asset.id}});const palette=snapshot.folders.find(f=>f.kind==='palette')!.id
await write({kind:'add-color',folderId:palette,hex:'#AABBCC',sourceAssetId:null});assert.equal(snapshot.folders.find(f=>f.id===palette)?.colors.length,1);assert.equal(snapshot.folders.find(f=>f.id===palette)?.colors[0].hex,'#AABBCC')
await assert.rejects(write({kind:'add-assets',folderId:palette,assetIds:[asset.id]}));await assert.rejects(write({kind:'add-color',folderId:other,hex:'#FFFFFF',sourceAssetId:null}));await assert.rejects(write({kind:'move',folderId:palette,parentId:other}))
const stale={...scope,sessionToken:snapshot.sessionToken,expectedRevision:snapshot.revision-1,allowUpgrade:true,command:{kind:'rename' as const,folderId:palette,name:'Stale'}}
await assert.rejects(host.writeOrganization(stale),e=>(e as any).code==='organization-conflict')
await assert.rejects(write({kind:'add-assets',folderId:other,assetIds:['asset:missing']}));await assert.rejects(write({kind:'create',name:'Other',folderKind:'assets',parentId:null}))
// Real write failure must roll back revision and names.
const db=new Database(path.join(selected,'.dam','library.sqlite'));db.exec("CREATE TRIGGER fail_folder BEFORE UPDATE ON library_folders BEGIN SELECT RAISE(ABORT,'SYNTHETIC_WRITE_FAILURE'); END;")
const revision=snapshot.revision;await assert.rejects(write({kind:'rename',folderId:other,name:'Should not save'}));assert.equal((await host.readOrganization(scope)).revision,revision);db.exec('DROP TRIGGER fail_folder');db.close()
const t=await host.inspectTrash(asset.id),plan=await host.prepareTrash({designAssetIdentity:asset.id,expectedRevision:t.revision}),trashed=await host.dispatchTrash({kind:'confirm-plan',planReceipt:plan.plan.receipt})
assert.deepEqual((await host.readOrganization(scope)).folders.find(f=>f.id===other)?.assetIds,[]);await assert.rejects(write({kind:'add-assets',folderId:other,assetIds:[asset.id]}));assert.equal((await host.readOrganization(scope)).folders.find(f=>f.id===palette)?.colors.length,1)
await host.dispatchTrash({kind:'restore-design-asset',designAssetIdentity:asset.id,expectedRevision:trashed.revision});snapshot=await host.readOrganization(scope);assert.deepEqual(snapshot.folders.find(f=>f.id===other)?.assetIds,[asset.id])
const colors=await host.measurePreviewColors({...scope,assetId:asset.id});assert.equal(colors.source,'controlled-preview');assert.equal(colors.colors.reduce((n,c)=>n+c.percentage,0),100)
const note=await host.readNotebook({...scope,assetId:asset.id});await host.saveNotebook({...scope,assetId:asset.id,sessionToken:note.sessionToken,sourceRef:note.sourceRef,expectedRevision:0,allowUpgrade:false,book:{pages:[{id:'page',name:'Notes still work',elements:[]}],active:'page'}});assert.equal(version(),6)
const oldToken=snapshot.sessionToken;await host.close();await host.reopen();snapshot=await host.readOrganization(scope);assert.notEqual(snapshot.sessionToken,oldToken);assert.equal(snapshot.folders.find(f=>f.id===palette)?.colors.length,1)
await assert.rejects(host.writeOrganization({...stale,expectedRevision:snapshot.revision,sessionToken:oldToken}),e=>(e as any).code==='library-generation-conflict')
await host.close();host=createActiveLibraryHost(dependencies);await host.open();snapshot=await host.readOrganization(scope);assert.equal(snapshot.folders.find(f=>f.id===child)?.parentId,parent)
await write({kind:'move',folderId:child,parentId:null});await write({kind:'delete',folderId:parent});assert.equal((await host.listAssets()).length,1)
await write({kind:'remove-color',folderId:palette,hex:'#aabbcc'});assert.equal(snapshot.folders.find(f=>f.id===palette)?.colors.length,0)
await write({kind:'delete',folderId:other});assert.equal((await host.listAssets()).length,1)
const handlers=new Map<string,Function>();registerActiveLibraryIpc({host,isTrustedSender:e=>(e as any).trusted===true},(c,h)=>{handlers.set(c,h)});assert.equal((await handlers.get('library-organization:read')!({},scope)).code,'UNTRUSTED_SENDER');assert.equal((await handlers.get('library-organization:write')!({trusted:true},{...stale,unknown:'field'})).success,false)
await host.close();selected=path.join(root,'library-b');await create();assert.deepEqual((await host.readOrganization({libraryIdentity:host.inspect().identity!,generation:host.inspect().generation!})).folders,[]);await assert.rejects(host.readOrganization(scope));await host.close()
assert.equal(await hash(),before);console.log('Organization: v6 upgrade/reopen, hierarchy/cycles, reference-only membership, Trash recovery, palette dedup, conflict/session guards, rollback, notebook compatibility, measured preview colors and trusted IPC passed')
