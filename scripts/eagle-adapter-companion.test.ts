import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import fs from 'node:fs/promises'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'

import { createEagleCompanionHttpAdapter, createEagleWebApiAdapter } from '../src/main/external-connected-library'

const require = createRequire(import.meta.url)
const companionArtifact = require(path.join(process.cwd(), 'eagle-companion/js/plugin.cjs')) as {
  createHandler(options: any): { handle(request: any): Promise<any>; invalidate(): void }
  registerLifecycle(eagle: any, handler: any): void
  startLoopbackServer(options: any): Promise<{ port: number; close(): Promise<void> }>
}
const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'dam-eagle-adapter-')))
const stagingRoot = path.join(root, 'staging')
const eagleRoot = path.join(root, 'Synthetic Eagle.library')
await fs.mkdir(stagingRoot)
await fs.mkdir(eagleRoot)
const originalPath = path.join(eagleRoot, 'item-one.png')
const thumbnailPath = path.join(eagleRoot, 'item-one-thumb.png')
const stagedPath = path.join(stagingRoot, 'staged.png')
await fs.writeFile(originalPath, Buffer.from('original-v1'))
await fs.writeFile(thumbnailPath, Buffer.from('preview-v1'))
await fs.writeFile(stagedPath, Buffer.from('replacement-v2'))

const token = 'synthetic-session-token-1234'
const libraryIdentity = `eagle-library:${digest(eagleRoot)}`
const eagleItem = {
  id: 'item-one', name: 'One', ext: 'png', tags: ['base'], folders: ['folder-a'], star: 1,
  annotation: 'base', size: 11, width: 32, height: 24, modifiedAt: 1, isDeleted: false,
  filePath: originalPath, thumbnailPath,
  async replaceFile(filePath: string) {
    await fs.copyFile(filePath, originalPath)
    this.size = (await fs.stat(originalPath)).size
    this.modifiedAt += 1
    return true
  }
}
let libraryChanged: (() => void) | null = null
const fakeEagle = {
  item: { getById: async (id: string) => id === eagleItem.id ? eagleItem : null },
  onLibraryChanged: (callback: () => void) => { libraryChanged = callback },
  onPluginBeforeExit: () => undefined
}
const handler = companionArtifact.createHandler({ eagle: fakeEagle, sessionToken: token, libraryIdentity, stagingRoot })
companionArtifact.registerLifecycle(fakeEagle, handler)
const companionServer = await companionArtifact.startLoopbackServer({ handler, http, port: 0 })
const companion = createEagleCompanionHttpAdapter({ origin: `http://127.0.0.1:${companionServer.port}`, allowSyntheticLoopback: true })

const webState = {
  version: '4.0.0', buildVersion: 'build21', libraryPath: eagleRoot, libraryName: 'Synthetic Eagle',
  modificationTime: 1, item: eagleItem, failAfterNextUpdate: false,
  nextGetFailure: null as null | 'http-500' | 'timeout' | 'bad-json',
  receivedPaths: [] as string[]
}
const webServer = http.createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', 'http://127.0.0.1')
  webState.receivedPaths.push(url.pathname)
  if (url.searchParams.get('token') !== token) return send(response, 401, { status:'error' })
  if (request.method === 'GET' && url.pathname === '/api/v2/app/info') return send(response,200,{status:'success',data:{version:webState.version,buildVersion:webState.buildVersion,platform:'darwin'}})
  if (request.method === 'GET' && url.pathname === '/api/v2/library/info') return send(response,200,{status:'success',data:{name:webState.libraryName,path:webState.libraryPath,modificationTime:webState.modificationTime}})
  const body = request.method === 'POST' ? await readJson(request) : {}
  if (request.method === 'POST' && url.pathname === '/api/v2/item/get') {
    const failure=webState.nextGetFailure
    webState.nextGetFailure=null
    if(failure==='http-500')return send(response,500,{status:'error'})
    if(failure==='bad-json'){response.writeHead(200,{'Content-Type':'application/json'});response.end('{');return}
    if(failure==='timeout'){setTimeout(()=>{if(!response.writableEnded)send(response,200,{status:'success',data:{data:[webItem(eagleItem)],total:1}})},500);return}
    const ids = Array.isArray(body.ids) ? body.ids : null
    const all = ids && !ids.includes(eagleItem.id) ? [] : [webItem(eagleItem)]
    const offset = Number(body.offset ?? 0), limit = Number(body.limit ?? 50)
    return send(response,200,{status:'success',data:{data:all.slice(offset,offset+limit),total:all.length,offset,limit}})
  }
  if (request.method === 'POST' && url.pathname === '/api/v2/item/update') {
    if (body.id !== eagleItem.id) return send(response,404,{status:'error'})
    if (typeof body.name === 'string') eagleItem.name=body.name
    if (Array.isArray(body.tags)) eagleItem.tags=[...body.tags]
    if (Array.isArray(body.folders)) eagleItem.folders=[...body.folders]
    if (typeof body.annotation === 'string') eagleItem.annotation=body.annotation
    if (Number.isInteger(body.star)) eagleItem.star=body.star
    if (typeof body.isDeleted === 'boolean') eagleItem.isDeleted=body.isDeleted
    eagleItem.modifiedAt+=1;webState.modificationTime+=1
    if(webState.failAfterNextUpdate){webState.failAfterNextUpdate=false;request.socket.destroy();return}
    return send(response,200,{status:'success',data:webItem(eagleItem)})
  }
  if(request.method==='POST'&&url.pathname==='/api/v2/item/add')return send(response,400,{status:'error'})
  send(response,404,{status:'error'})
})
await new Promise<void>((resolve,reject)=>{webServer.once('error',reject);webServer.listen(0,'127.0.0.1',()=>resolve())})
const address=webServer.address();if(!address||typeof address==='string')throw new Error('missing fake server')

const adapter = createEagleWebApiAdapter({
  token, baseUrl:`http://127.0.0.1:${address.port}`, allowSyntheticLoopback:true, companion,
  timeoutMs:250,
  resolveTrustedIdentity:async()=>({
    providerIdentity:'eagle-provider:synthetic',
    libraryIdentity,
    volumeIdentity:'eagle-volume:synthetic'
  })
})
const negotiated=await adapter.negotiate()
assert.ok(negotiated)
assert.equal(negotiated?.buildVersion,21)
assert.equal(negotiated?.capabilities.fileReplace,true)
assert.equal(negotiated?.capabilities.permanentDelete,false)
assert.equal(JSON.stringify(negotiated).includes(eagleRoot),false,'Library path must not cross the Adapter.')

const page=await adapter.listPage({cursor:null,limit:100,scope:{kind:'folders',folderIds:['folder-a']}})
assert.equal(page.complete,true)
assert.equal(page.items[0].contentFingerprint,null,'Progressive listing must not hash every Original.')
const loaded=await adapter.getItem('item-one')
assert.equal(loaded.kind,'found')
assert.equal(loaded.kind==='found'?loaded.item.contentFingerprint:null,digest(Buffer.from('original-v1')))
assert.deepEqual(Buffer.from((await adapter.readPreview('item-one'))!),Buffer.from('preview-v1'))

for(const failure of ['http-500','timeout','bad-json'] as const){
  webState.nextGetFailure=failure
  const unavailable=await adapter.getItem('item-one')
  assert.equal(unavailable.kind,'unavailable',`${failure} must not be reported as an observed missing item.`)
}

const metadata=await adapter.updateMetadata('item-one',{name:'Updated',tags:['new'],rating:5,annotation:'changed',folderIds:['folder-b']})
assert.equal(metadata.kind,'applied')
assert.equal(eagleItem.name,'Updated')
assert.deepEqual(eagleItem.folders,['folder-b'])
assert.equal(eagleItem.star,5)

webState.failAfterNextUpdate=true
const uncertain=await adapter.updateMetadata('item-one',{annotation:'applied-before-disconnect'})
assert.equal(['unavailable','timeout'].includes(uncertain.kind),true)
const afterDisconnect=await adapter.getItem('item-one')
assert.equal(afterDisconnect.kind==='found'?afterDisconnect.item.annotation:null,'applied-before-disconnect')

const replaced=await adapter.replaceFile(
  'item-one',
  stagedPath,
  digest(Buffer.from('original-v1')),
  digest(await fs.readFile(stagedPath))
)
assert.equal(replaced.kind,'applied')
assert.equal(digest(await fs.readFile(originalPath)),digest(await fs.readFile(stagedPath)))
assert.equal((await adapter.setDeleted('item-one',true)).kind,'applied')
assert.equal(eagleItem.isDeleted,true)
assert.equal((await adapter.setDeleted('item-one',false)).kind,'applied')
assert.equal(eagleItem.isDeleted,false)
assert.equal((await adapter.permanentlyDelete('item-one')).kind,'unsupported')
assert.equal(webState.receivedPaths.every((entry)=>['/api/v2/app/info','/api/v2/library/info','/api/v2/item/get','/api/v2/item/update'].includes(entry)),true)

assert.deepEqual(await handler.handle({kind:'snapshot-item',sessionToken:'wrong-session-token',libraryIdentity,itemId:'item-one'}),{ok:false,code:'UNAUTHORIZED'})
assert.deepEqual(await handler.handle({kind:'snapshot-item',sessionToken:token,libraryIdentity,itemId:'item-one',path:'/private'}),{ok:false,code:'INVALID_REQUEST'})
const outside=path.join(root,'outside.png');await fs.writeFile(outside,Buffer.from('outside'))
const rejectedPath=await handler.handle({kind:'replace-file',sessionToken:token,libraryIdentity,itemId:'item-one',stagedFilePath:outside,expectedFingerprint:digest(await fs.readFile(originalPath)),desiredFingerprint:digest(await fs.readFile(outside))})
assert.deepEqual(rejectedPath,{ok:false,code:'STAGING_PATH_REJECTED'})
const symlink=path.join(stagingRoot,'escape.stage');await fs.symlink(outside,symlink)
const rejectedSymlink=await handler.handle({kind:'replace-file',sessionToken:token,libraryIdentity,itemId:'item-one',stagedFilePath:symlink,expectedFingerprint:digest(await fs.readFile(originalPath)),desiredFingerprint:digest(await fs.readFile(outside))})
assert.deepEqual(rejectedSymlink,{ok:false,code:'STAGING_PATH_REJECTED'})
const shortReadHandler=companionArtifact.createHandler({eagle:fakeEagle,sessionToken:'another-synthetic-session',libraryIdentity,stagingRoot,fs:{...fs,lstat:async()=>({isFile:()=>true,isSymbolicLink:()=>false,size:100}),readFile:async()=>Buffer.from('short'),realpath:fs.realpath}})
assert.deepEqual(await shortReadHandler.handle({kind:'snapshot-item',sessionToken:'another-synthetic-session',libraryIdentity,itemId:'item-one'}),{ok:false,code:'ITEM_UNAVAILABLE'})

let raceReplaceCalls=0
const raceEagle={item:{getById:async()=>({...eagleItem,replaceFile:async()=>{raceReplaceCalls+=1;return true}})}}
let raceHandler:any
const raceFs={...fs,readFile:async(filePath:string)=>{const bytes=await fs.readFile(filePath);raceHandler.invalidate();return bytes}}
raceHandler=companionArtifact.createHandler({eagle:raceEagle,sessionToken:'race-synthetic-session',libraryIdentity,stagingRoot,fs:raceFs})
const raceResult=await raceHandler.handle({kind:'replace-file',sessionToken:'race-synthetic-session',libraryIdentity,itemId:'item-one',stagedFilePath:stagedPath,expectedFingerprint:digest(await fs.readFile(originalPath)),desiredFingerprint:digest(await fs.readFile(stagedPath))})
assert.deepEqual(raceResult,{ok:false,code:'LIBRARY_CHANGED'})
assert.equal(raceReplaceCalls,0,'A library change after an awaited fingerprint must block replaceFile.')

const serializedOriginal=path.join(eagleRoot,'serialized.png')
const serializedStage=path.join(stagingRoot,'serialized.stage')
await fs.writeFile(serializedOriginal,Buffer.from('serialized-before'))
await fs.writeFile(serializedStage,Buffer.from('serialized-after'))
let serializedReplaceCalls=0
const serializedItem={
  id:'serialized-item',filePath:serializedOriginal,ext:'png',
  async replaceFile(filePath:string){serializedReplaceCalls+=1;await fs.copyFile(filePath,serializedOriginal);return true}
}
const serializedHandler=companionArtifact.createHandler({eagle:{item:{getById:async()=>serializedItem}},sessionToken:'serialized-session-token',libraryIdentity,stagingRoot})
const serializedRequest={kind:'replace-file',sessionToken:'serialized-session-token',libraryIdentity,itemId:'serialized-item',stagedFilePath:serializedStage,expectedFingerprint:digest(Buffer.from('serialized-before')),desiredFingerprint:digest(Buffer.from('serialized-after'))}
const serializedResults=await Promise.all([serializedHandler.handle(serializedRequest),serializedHandler.handle(serializedRequest)])
assert.equal(serializedResults[0].state,'applied')
assert.equal(serializedResults[1].state,'conflict')
assert.equal(serializedReplaceCalls,1,'The companion must serialize its own write handlers.')

assert.ok(libraryChanged)
libraryChanged!()
assert.deepEqual(await handler.handle({kind:'negotiate',sessionToken:token,libraryIdentity}),{ok:false,code:'LIBRARY_CHANGED'})
assert.equal((await fetch(`http://127.0.0.1:${companionServer.port}/unknown`)).status,404)

assert.throws(()=>createEagleWebApiAdapter({token,baseUrl:'http://example.com:41595',allowSyntheticLoopback:true}),/EAGLE_ORIGIN_INVALID/)
const oldAdapter=createEagleWebApiAdapter({token,baseUrl:`http://127.0.0.1:${address.port}`,allowSyntheticLoopback:true})
webState.buildVersion='build20'
assert.equal(await oldAdapter.negotiate(),null)
webState.buildVersion='build21'
const unpairedAdapter=createEagleWebApiAdapter({token,baseUrl:`http://127.0.0.1:${address.port}`,allowSyntheticLoopback:true})
const unpaired=await unpairedAdapter.negotiate()
assert.ok(unpaired)
assert.equal(unpaired?.capabilities.metadataRead,true)
assert.equal(unpaired?.capabilities.metadataWrite,false)
assert.equal(unpaired?.capabilities.fileReplace,false)
assert.equal((await unpairedAdapter.updateMetadata('item-one',{name:'blocked'})).kind,'unsupported')

await adapter.disconnect()
await companionServer.close()
await new Promise<void>((resolve,reject)=>webServer.close((error)=>error?reject(error):resolve()))
console.log('Eagle Web API Adapter and companion handler protocol passed')

function webItem(item:typeof eagleItem){return{id:item.id,name:item.name,ext:item.ext,tags:item.tags,folders:item.folders,star:item.star,annotation:item.annotation,size:item.size,width:item.width,height:item.height,modificationTime:item.modifiedAt,isDeleted:item.isDeleted}}
function digest(value:string|Uint8Array){return createHash('sha256').update(value).digest('hex')}
function send(response:http.ServerResponse,status:number,body:unknown){const bytes=Buffer.from(JSON.stringify(body));response.writeHead(status,{'Content-Type':'application/json','Content-Length':String(bytes.length)});response.end(bytes)}
async function readJson(request:http.IncomingMessage):Promise<any>{const chunks:Buffer[]=[];for await(const chunk of request)chunks.push(Buffer.from(chunk));return JSON.parse(Buffer.concat(chunks).toString('utf8'))}
