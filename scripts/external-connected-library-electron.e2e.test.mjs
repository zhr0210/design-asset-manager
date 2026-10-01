import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import fs from 'node:fs/promises'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'

import { _electron as electron } from 'playwright'
import sharp from 'sharp'

execFileSync(process.execPath,['node_modules/electron-vite/bin/electron-vite.js','build'],{cwd:process.cwd(),stdio:'inherit'})
const require=createRequire(import.meta.url)
const companionArtifact=require(path.join(process.cwd(),'eagle-companion/js/plugin.cjs'))
const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'dam-connected-electron-e2e-')))
const profile=path.join(root,'profile'),evidence=path.join(root,'evidence'),eagleRoot=path.join(root,'Synthetic Eagle.library'),staging=path.join(profile,'connected-libraries','eagle','edit-staging')
await Promise.all([profile,evidence,eagleRoot,staging].map((directory)=>fs.mkdir(directory,{recursive:true})))
const token='synthetic-e2e-session-token-1234'
const libraryIdentity=`eagle-library:${digest(eagleRoot)}`
const editFile=path.join(root,'edited.png')
await sharp({create:{width:48,height:48,channels:4,background:'#9944ee'}}).png().toFile(editFile)
const editHashBefore=await fileDigest(editFile)

const items=new Map()
items.set('blue-item',await createItem('blue-item','Blue Poster','#2255dd',false,Date.now()))
items.set('green-item',await createItem('green-item','Green Card','#22aa66',false,Date.now()+1))
items.set('old-trash',await createItem('old-trash','Old Trash','#cc5544',true,Date.now()-35*86_400_000))
let libraryChangedCallback=null
const fakeEagle={item:{getById:async(id)=>items.get(id)??null},onLibraryChanged:(callback)=>{libraryChangedCallback=callback},onPluginBeforeExit:()=>undefined}
const companionHandler=companionArtifact.createHandler({eagle:fakeEagle,sessionToken:token,libraryIdentity,stagingRoot:staging})
companionArtifact.registerLifecycle(fakeEagle,companionHandler)
const companionServer=await companionArtifact.startLoopbackServer({handler:companionHandler,http,port:0})

let webOnline=true
let loseNextAddResponse=false,addCalls=0
const webRequests=[]
const webServer=http.createServer(async(request,response)=>{
  if(!webOnline){request.socket.destroy();return}
  const url=new URL(request.url??'/','http://127.0.0.1');webRequests.push(url.pathname)
  if(url.searchParams.get('token')!==token)return send(response,401,{status:'error'})
  if(request.method==='GET'&&url.pathname==='/api/v2/app/info')return send(response,200,{status:'success',data:{version:'4.0.0',buildVersion:'build21',platform:'darwin'}})
  if(request.method==='GET'&&url.pathname==='/api/v2/library/info')return send(response,200,{status:'success',data:{name:'Synthetic Eagle',path:eagleRoot,modificationTime:1}})
  const body=request.method==='POST'?await readJson(request):{}
  if(request.method==='POST'&&url.pathname==='/api/v2/item/get'){
    const all=[...items.values()].sort((a,b)=>a.id.localeCompare(b.id)).filter((item)=>!Array.isArray(body.ids)||body.ids.includes(item.id)).map(webItem)
    const offset=Number(body.offset??0),limit=Number(body.limit??50)
    return send(response,200,{status:'success',data:{data:all.slice(offset,offset+limit),total:all.length,offset,limit}})
  }
  if(request.method==='POST'&&url.pathname==='/api/v2/item/update'){
    const item=items.get(body.id);if(!item)return send(response,404,{status:'error'})
    if(typeof body.name==='string')item.name=body.name
    if(Array.isArray(body.tags))item.tags=[...body.tags]
    if(Array.isArray(body.folders))item.folders=[...body.folders]
    if(typeof body.annotation==='string')item.annotation=body.annotation
    if(Number.isInteger(body.star))item.star=body.star
    if(typeof body.isDeleted==='boolean')item.isDeleted=body.isDeleted
    item.modifiedAt=Date.now();return send(response,200,{status:'success',data:webItem(item)})
  }
  if(request.method==='POST'&&url.pathname==='/api/v2/item/add'){
    if(items.has(body.id))return send(response,409,{status:'error'});const target=path.join(eagleRoot,`${body.id}.png`);await fs.copyFile(body.path,target);const thumbnail=path.join(eagleRoot,`${body.id}-thumb.png`);await fs.copyFile(target,thumbnail);const created={id:body.id,name:body.name??body.id,ext:'png',tags:body.tags??[],folders:body.folders??[],star:0,annotation:body.annotation??'',size:(await fs.stat(target)).size,width:48,height:48,modifiedAt:Date.now(),isDeleted:false,filePath:target,thumbnailPath:thumbnail,async replaceFile(source){await fs.copyFile(source,this.filePath);this.size=(await fs.stat(this.filePath)).size;this.modifiedAt=Date.now();await fs.copyFile(this.filePath,this.thumbnailPath);return true}};items.set(created.id,created);addCalls+=1;if(loseNextAddResponse){loseNextAddResponse=false;request.socket.destroy();return}return send(response,200,{status:'success',data:{id:created.id}})
  }
  if(request.method==='POST'&&url.pathname==='/synthetic/v1/permanent-delete'){
    items.delete(body.id);return send(response,200,{status:'success',data:{deleted:true}})
  }
  send(response,404,{status:'error'})
})
await new Promise((resolve,reject)=>{webServer.once('error',reject);webServer.listen(0,'127.0.0.1',resolve)})
const webAddress=webServer.address();if(!webAddress||typeof webAddress==='string')throw new Error('Fake Eagle server failed.')

const legacyDatabase=path.join(root,'legacy.sqlite'),legacyPreview=path.join(root,'legacy-preview.png')
await sharp({create:{width:40,height:30,channels:4,background:'#ddaa22'}}).png().toFile(legacyPreview)
createLegacyFixture(legacyDatabase,legacyPreview)
const activeSource=path.join(root,'active-source.png');await sharp({create:{width:8,height:8,channels:4,background:'#333333'}}).png().toFile(activeSource)
const baseConfig={rootDirectory:root,profileDirectory:profile,libraryDirectory:path.join(root,'unused-active-library'),evidenceDirectory:evidence,sourceSelections:[[activeSource]]}
const connectedConfig={rootDirectory:root,eagleBaseUrl:`http://127.0.0.1:${webAddress.port}`,companionOrigin:`http://127.0.0.1:${companionServer.port}`,token,libraryIdentity,volumeIdentity:'eagle-volume:synthetic',editFile,legacyDatabase}

let application=await launch()
try{
  let page=await application.firstWindow();await page.setViewportSize({width:1280,height:900});await page.waitForSelector('[data-testid="active-library-controls"]');await navigate(page,'/connected-libraries')
  await page.getByTestId('connected-prepare').click();await page.getByTestId('connected-review').waitFor();await page.getByTestId('connected-review').getByText('Eagle 是唯一正式原件存储，不复制整库。',{exact:true}).waitFor();await page.getByTestId('connected-confirm').click()
  await page.getByTestId('connected-index').click();await waitItems(page,3);await page.waitForFunction(()=>Array.from(document.querySelectorAll('[data-connected-item] img')).every((image)=>image.complete&&image.naturalWidth>0))
  await page.screenshot({path:path.join(evidence,'connected-ready.png'),fullPage:true})
  const blueCard=page.locator('[data-connected-item]').filter({hasText:'Blue Poster'});const greenCard=page.locator('[data-connected-item]').filter({hasText:'Green Card'})
  const blueKey=await blueCard.getAttribute('data-connected-item');assert.ok(blueKey)
  await blueCard.locator('img').evaluate(image => image.dispatchEvent(new Event('error')))
  await blueCard.getByText('预览不可用', { exact: true }).waitFor()
  await page.getByTestId('connected-refresh').click()
  await blueCard.locator('img').waitFor()
  await page.waitForFunction(() => Array.from(document.querySelectorAll('[data-connected-item] img')).every(image => image.complete && image.naturalWidth > 0))

  const blueName=blueCard.getByLabel('编辑名称 Blue Poster');await blueName.fill('Local Blue');await blueCard.getByText('保存名称',{exact:true}).click()
  mutateRemote('blue-item',{tags:['remote-different-field']});await page.getByTestId('connected-sync').click();await waitFor(()=>items.get('blue-item').name==='Local Blue');assert.deepEqual(items.get('blue-item').tags,['remote-different-field'])

  const refreshedBlue=page.locator('[data-connected-item]').filter({hasText:'Local Blue'});await refreshedBlue.getByLabel('编辑名称 Local Blue').fill('Local Conflict');await refreshedBlue.getByText('保存名称',{exact:true}).click();mutateRemote('blue-item',{name:'Eagle Conflict'});await page.getByTestId('connected-sync').click();await page.getByTestId('connected-conflicts').waitFor();await page.screenshot({path:path.join(evidence,'connected-conflict.png'),fullPage:true});const useEagle=page.getByTestId('connected-conflicts').getByText('使用 Eagle',{exact:true});await useEagle.click();await useEagle.waitFor({state:'detached'})
  assert.equal(await page.getByLabel('编辑名称 Eagle Conflict').inputValue(), 'Eagle Conflict', 'Choosing Eagle must discard the rejected local name draft.')

  const refreshedGreen=page.locator('[data-connected-item]').filter({hasText:'Green Card'});webOnline=false;await refreshedGreen.getByLabel('编辑名称 Green Card').fill('Queued Offline');await refreshedGreen.getByText('保存名称',{exact:true}).click();await page.getByTestId('connected-add-new').click();await page.getByTestId('connected-sync').click();await page.getByText('Eagle 离线',{exact:true}).waitFor();webOnline=true;loseNextAddResponse=true;await page.getByTestId('connected-sync').click();await waitFor(()=>items.get('green-item').name==='Queued Offline');await waitFor(()=>addCalls===1);await page.getByTestId('connected-sync').click();assert.equal(addCalls,1,'Lost add response must verify the exact custom ID before retrying.')

  const offlineGreen=page.locator('[data-connected-item]').filter({hasText:'Queued Offline'});await offlineGreen.getByText('选择替换文件',{exact:true}).click();await page.getByTestId('connected-sync').click();await waitFor(async()=>await fileDigest(items.get('green-item').filePath)===editHashBefore)
  await offlineGreen.getByText('移到 Eagle 回收站',{exact:true}).click();await page.getByTestId('connected-sync').click();await waitFor(()=>items.get('green-item').isDeleted===true)
  const trashedGreen=page.locator('[data-connected-item]').filter({hasText:'Queued Offline'});await trashedGreen.getByText('从回收站恢复',{exact:true}).click();await page.getByTestId('connected-sync').click();await waitFor(()=>items.get('green-item').isDeleted===false)

  const cleanupButton=page.getByText('确认永久清理',{exact:true}).filter({visible:true}).first();await cleanupButton.click();await waitFor(()=>!items.has('old-trash'))
  items.delete('blue-item');await page.getByTestId('connected-index').click();await page.locator(`[data-connected-item="${blueKey}"]`).getByText(/原件已不存在/).waitFor()

  const projection=await page.evaluate(()=>window.electronAPI.connectedLibrary.inspect());const wrongGeneration=await page.evaluate(async({identity,itemKey})=>{try{return(await fetch(`dam-connected-preview://preview/${encodeURIComponent(identity)}/${encodeURIComponent('generation:stale')}/${encodeURIComponent(itemKey)}`)).status}catch{return 0}},{identity:projection.libraryIdentity,itemKey:blueKey});assert.notEqual(wrongGeneration,200)

  await navigate(page,'/legacy-library');await page.getByTestId('legacy-prepare').click();await page.getByTestId('legacy-review').waitFor();await page.getByTestId('legacy-confirm').click();await page.getByText('旧 DAM 库已只读打开',{exact:true}).waitFor();await page.locator('img[alt="Legacy Fixture"]').evaluate((image)=>new Promise((resolve,reject)=>{if(image.complete&&image.naturalWidth>0)return resolve(true);image.addEventListener('load',()=>resolve(true),{once:true});image.addEventListener('error',reject,{once:true})}));await page.getByPlaceholder('搜索旧素材标题、文件名或标签').fill('archive');await page.getByText('Legacy Fixture',{exact:true}).waitFor();await page.screenshot({path:path.join(evidence,'legacy-readonly.png'),fullPage:true})
  await page.locator('img[alt="Legacy Fixture"]').evaluate(image => image.dispatchEvent(new Event('error')))
  await page.getByText('预览不可用', { exact: true }).waitFor()
  await page.getByTestId('legacy-refresh').click()
  await page.locator('img[alt="Legacy Fixture"]').waitFor()
  await page.waitForFunction(() => { const image=document.querySelector('img[alt="Legacy Fixture"]'); return image && image.complete && image.naturalWidth > 0 })
}finally{await application.close()}

await waitForFile(path.join(evidence,'shutdown-complete'))
application=await launch()
try{const page=await application.firstWindow();await page.waitForSelector('[data-testid="active-library-controls"]');await navigate(page,'/connected-libraries');await page.getByText(/已索引/).waitFor();const projection=await page.evaluate(()=>window.electronAPI.connectedLibrary.inspect());assert.equal(projection.counts.indexed,4);assert.equal(projection.grant,'read-write')}finally{await application.close()}

assert.equal(await fileDigest(editFile),editHashBefore,'The edit source fixture must remain unchanged.')
const db=path.join(profile,'connected-libraries','eagle','connected-library.sqlite')
const sqlite=execFileSync('/usr/bin/sqlite3',[db,"SELECT (SELECT COUNT(*) FROM connected_library_items),(SELECT COUNT(*) FROM connected_library_outbox),(SELECT COUNT(*) FROM connected_library_conflicts WHERE conflict_state='unresolved');"],{encoding:'utf8'}).trim();assert.match(sqlite,/^4\|[1-9]\d*\|0$/)
assert.ok(libraryChangedCallback)
assert.equal(webRequests.every((entry)=>['/api/v2/app/info','/api/v2/library/info','/api/v2/item/get','/api/v2/item/update','/api/v2/item/add','/synthetic/v1/permanent-delete'].includes(entry)),true)
await companionServer.close();await new Promise((resolve,reject)=>webServer.close((error)=>error?reject(error):resolve()))
await fs.writeFile(path.join(evidence,'events.json'),JSON.stringify({suite:'external-connected-library-electron-e2e',result:'passed',evidenceLevel:'synthetic-protocol',realEagleConnected:false,pluginInstalled:false,itemsPersisted:4,offlineAddVerifiedByExactCustomId:true,legacyReadOnly:true,sourceEditPreserved:true,screenshots:['connected-ready.png','connected-conflict.png','legacy-readonly.png']},null,2))
console.log(`External Connected Library Electron E2E passed. Evidence: ${evidence}`)

function launch(){return electron.launch({args:['.','--dam-active-library-synthetic-e2e',`--user-data-dir=${profile}`],env:{...process.env,NODE_ENV:'test',DAM_ACTIVE_LIBRARY_SYNTHETIC_E2E:JSON.stringify(baseConfig),DAM_CONNECTED_LIBRARY_SYNTHETIC_E2E:JSON.stringify(connectedConfig)}})}
async function navigate(page,route){for(let attempt=0;attempt<3;attempt++){await page.evaluate((value)=>{location.hash=value},route);await page.waitForTimeout(350);if(new URL(page.url()).hash===`#${route}`)return}throw new Error('Synthetic route navigation failed.')}
async function waitItems(page,count){await page.waitForFunction((expected)=>document.querySelectorAll('[data-connected-item]').length===expected,count)}
async function waitFor(predicate){for(let attempt=0;attempt<100;attempt++){if(await predicate())return;await new Promise((resolve)=>setTimeout(resolve,50))}assert.fail('Synthetic condition did not settle.')}
async function waitForFile(filePath){await waitFor(async()=>{try{await fs.access(filePath);return true}catch{return false}})}
async function createItem(id,name,color,isDeleted,modifiedAt){const filePath=path.join(eagleRoot,`${id}.png`),thumbnailPath=path.join(eagleRoot,`${id}-thumb.png`);await sharp({create:{width:64,height:48,channels:4,background:color}}).png().toFile(filePath);await fs.copyFile(filePath,thumbnailPath);return{id,name,ext:'png',tags:['base'],folders:['folder-a'],star:0,annotation:'',size:(await fs.stat(filePath)).size,width:64,height:48,modifiedAt,isDeleted,filePath,thumbnailPath,async replaceFile(source){await fs.copyFile(source,this.filePath);this.size=(await fs.stat(this.filePath)).size;this.modifiedAt=Date.now();await fs.copyFile(this.filePath,this.thumbnailPath);return true}}}
function mutateRemote(id,patch){const item=items.get(id);Object.assign(item,patch);item.modifiedAt=Date.now()+Math.floor(Math.random()*1000)}
function webItem(item){return{id:item.id,name:item.name,ext:item.ext,tags:item.tags,folders:item.folders,star:item.star,annotation:item.annotation,size:item.size,width:item.width,height:item.height,modificationTime:item.modifiedAt,isDeleted:item.isDeleted}}
function digest(value){return createHash('sha256').update(value).digest('hex')}
async function fileDigest(filePath){return digest(await fs.readFile(filePath))}
function send(response,status,body){const bytes=Buffer.from(JSON.stringify(body));response.writeHead(status,{'Content-Type':'application/json','Content-Length':String(bytes.length)});response.end(bytes)}
async function readJson(request){const chunks=[];for await(const chunk of request)chunks.push(Buffer.from(chunk));return JSON.parse(Buffer.concat(chunks).toString('utf8'))}
function createLegacyFixture(databasePath,previewPath){const escaped=previewPath.replaceAll("'","''");const sql=`CREATE TABLE assets(id TEXT PRIMARY KEY,title TEXT NOT NULL,file_name TEXT NOT NULL,thumbnail_path TEXT NOT NULL,created_at TEXT NOT NULL);CREATE TABLE tags(id TEXT PRIMARY KEY,name TEXT NOT NULL);CREATE TABLE asset_tags(id TEXT PRIMARY KEY,asset_id TEXT NOT NULL,tag_id TEXT NOT NULL,status TEXT);INSERT INTO assets VALUES('legacy-one','Legacy Fixture','legacy.png','${escaped}','2026-09-10T00:00:00.000Z');INSERT INTO tags VALUES('legacy-tag','archive');INSERT INTO asset_tags VALUES('legacy-rel','legacy-one','legacy-tag','confirmed');`;execFileSync('/usr/bin/sqlite3',[databasePath,sql])}
