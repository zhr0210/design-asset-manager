import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import {pathToFileURL} from 'node:url'
import {createHash} from 'node:crypto'
import {_electron as electron} from 'playwright'
import sharp from 'sharp'
const sleep=ms=>new Promise(r=>setTimeout(r,ms))
const wait=async(check)=>{for(let i=0;i<300;i++){if(await check())return;await sleep(25)}throw Error('formal predicate timeout')}
for(const qualified of [false,true])await test(`formal OCR session consent with ${qualified?'synthetic qualified':'production unqualified'} resource path`,async()=>{
 const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'dam-approved-ocr-background-'))),profile=path.join(root,'profile'),library=path.join(root,'library'),evidence=path.join(root,'evidence'),entry=path.join(root,'entry'),runs=path.join(root,'runs'),runtime=path.join(root,'runtime');let app
 try{
  for(const dir of [profile,evidence,entry,path.join(runtime,'bin')])await fs.mkdir(dir,{recursive:true})
  const sources=[];for(let i=0;i<2;i++){const source=path.join(root,`generated-${i}.png`);await sharp({create:{width:80+i,height:80,channels:3,background:'#778899'}}).png().toFile(source);sources.push(source)}
  const hashes=async()=>Promise.all(sources.map(async p=>createHash('sha256').update(await fs.readFile(p)).digest('hex'))),before=await hashes(),models={det:'a'.repeat(64),cls:'b'.repeat(64),rec:'c'.repeat(64)},value={engine:'rapidocr-onnxruntime',version:'1.4.4',recipe:'rapidocr-preview-v1',modelSha256:models,width:80,height:80,elapsedMs:1,threshold:.5,blocks:[]}
  const python=path.join(runtime,'bin','python3');await fs.writeFile(python,`#!/usr/bin/python3\nimport sys\nsys.stdin.buffer.read()\nwith open(${JSON.stringify(runs)},'a') as f:f.write('run\\n')\nprint(${JSON.stringify(JSON.stringify({ok:true,value}))})\n`);await fs.chmod(python,0o700)
  await fs.writeFile(path.join(root,'ocr-runtime.json'),JSON.stringify({schema:1,engine:'rapidocr-onnxruntime',version:'1.4.4',platform:process.platform,arch:process.arch,pythonRelative:'runtime/bin/python3',modelSha256:models}));await fs.writeFile(path.join(entry,'package.json'),JSON.stringify({name:'dam-background-ocr',type:'module',main:'main.mjs'}));await fs.writeFile(path.join(entry,'main.mjs'),`import ${JSON.stringify(pathToFileURL(path.resolve('out/main/index.js')).href)};`)
  const config={rootDirectory:root,profileDirectory:profile,libraryDirectory:library,evidenceDirectory:evidence,sourceSelections:sources.map(p=>[p])},env=Object.fromEntries(Object.entries(process.env).filter(([k])=>!k.startsWith('DAM_')&&!['NODE_OPTIONS','ELECTRON_RUN_AS_NODE','ELECTRON_RENDERER_URL'].includes(k)))
  app=await electron.launch({args:[entry,'--dam-active-library-synthetic-e2e',`--user-data-dir=${profile}`],env:{...env,NODE_ENV:'test',DAM_ACTIVE_LIBRARY_SYNTHETIC_E2E:JSON.stringify(config),DAM_SYNTHETIC_OCR_RUNTIME:root,...(qualified?{DAM_SYNTHETIC_BACKGROUND_OCR:'1'}:{})}})
  assert.ok((await app.evaluate(({app})=>['userData','sessionData','logs','crashDumps'].map(p=>app.getPath(p)))).every(p=>p.startsWith(root+path.sep)))
  const page=await app.firstWindow();page.setDefaultTimeout(12000);await page.setViewportSize({width:1450,height:1050});await page.getByTestId('formal-library-canvas').waitFor();await page.getByTestId('library-create').click();await page.getByTestId('library-create-confirm').click()
  const add=async()=>{await page.evaluate(()=>location.hash='/library');await page.getByRole('button',{name:'添加图片',exact:true}).click();await page.getByTestId('library-copy-confirm').click();await page.locator('.lc-card').first().waitFor()}
  await add();const scope=await page.evaluate(async()=>{const s=await window.damClient.library.inspect();return{libraryIdentity:s.identity,generation:s.generation}});const old=(await page.evaluate(()=>window.damClient.listAssets()))[0];await page.evaluate(()=>location.hash='/ai-console')
  const plan=page.getByRole('region',{name:'后台基础分析计划',exact:true});await plan.getByRole('checkbox',{name:'收集新素材分析计划'}).check();await plan.getByRole('button',{name:'保存新素材计划设置'}).click();await plan.getByRole('button',{name:'确认保存后台计划'}).click();await plan.getByRole('region',{name:'确认后台计划设置'}).waitFor({state:'detached'})
  await add();await wait(async()=>(await page.evaluate(()=>window.damClient.listAssets())).length===2);const asset=(await page.evaluate(()=>window.damClient.listAssets())).find(a=>a.id!==old.id);assert.ok(asset)
  assert.equal((await page.evaluate(()=>window.damClient.assetOcr.configure())).ok,true);await page.evaluate(()=>location.hash='/ai-console');const panel=page.getByRole('region',{name:'后台 OCR 执行许可',exact:true});await panel.getByText('本次开库尚未授权',{exact:false}).waitFor();assert.equal(await fs.readFile(runs,'utf8').catch(()=>''),'')
  await panel.getByRole('button',{name:'核对后台 OCR 授权'}).click();await panel.getByRole('button',{name:'确认授权后台 OCR'}).click();await panel.getByRole('region',{name:'确认后台 OCR 授权'}).waitFor({state:'detached'})
  try{await wait(async()=>{const r=await page.evaluate(s=>window.damClient.backgroundOcr.read(s),scope);return r.ok&&r.value.authorized})}catch{throw Error(JSON.stringify({stage:'permission',view:await page.evaluate(s=>window.damClient.backgroundOcr.read(s),scope),panel:await panel.innerText()}))};assert.equal((await page.evaluate(s=>window.damClient.backgroundOcr.read(s),scope)).value.schemaVersion,13)
  if(qualified){await wait(async()=>(await page.evaluate(s=>window.damClient.backgroundOcr.read(s),scope)).value.attempts.some(a=>a.state==='succeeded'));assert.equal(await fs.readFile(runs,'utf8'),'run\n');const o=(await page.evaluate(s=>window.damClient.assetOcr.read(s),{...scope,assetId:asset.id})).value;assert.ok(o.evidence);const correction=await page.evaluate(s=>window.damClient.assetOcr.correct(s),{...scope,assetId:asset.id,sessionToken:o.sessionToken,expectedRevision:o.revision,evidenceId:o.evidence.id,text:'Kept correction'});assert.equal(correction.ok,true)}
  else{await panel.getByText('生产执行资源资格尚未验证',{exact:true}).waitFor();await sleep(250);assert.equal(await fs.readFile(runs,'utf8').catch(()=>''),'');assert.equal((await page.evaluate(s=>window.damClient.backgroundOcr.read(s),scope)).value.attempts.length,0)}
  assert.equal((await page.evaluate(s=>window.damClient.assetOcr.read(s),{...scope,assetId:old.id})).value.evidence,null)
  await panel.getByRole('button',{name:'刷新 OCR 状态'}).click();if(qualified){await panel.locator('summary').click();await panel.getByText('已保存 · 第 1 次',{exact:true}).waitFor()}
  if(process.env.BACKGROUND_OCR_EVIDENCE_DIR){await fs.mkdir(process.env.BACKGROUND_OCR_EVIDENCE_DIR,{recursive:true});await panel.screenshot({path:path.join(process.env.BACKGROUND_OCR_EVIDENCE_DIR,qualified?'qualified.png':'waiting.png')})}
  await page.evaluate(()=>window.damClient.library.close());await page.evaluate(()=>window.damClient.library.reopen());assert.equal((await page.evaluate(s=>window.damClient.backgroundOcr.read(s),scope)).value.authorized,false);await sleep(100);assert.equal(await fs.readFile(runs,'utf8').catch(()=>''),qualified?'run\n':'');if(qualified)assert.equal((await page.evaluate(s=>window.damClient.assetOcr.read(s),{...scope,assetId:asset.id})).value.editedText,'Kept correction');assert.deepEqual(await hashes(),before)
 }finally{if(app)await app.close();await fs.rm(root,{recursive:true,force:true})}
})
