import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {pathToFileURL} from 'node:url'
import {createHash} from 'node:crypto'
import {_electron as electron} from 'playwright'
import sharp from 'sharp'
const sleep=ms=>new Promise(r=>setTimeout(r,ms))
async function waitFile(file){for(let i=0;i<300;i++){try{return await fs.readFile(file,'utf8')}catch{await sleep(10)}}throw Error('synthetic child marker missing')}
await test('formal OCR save/correction, close/reopen and quit await an owned synthetic child',async()=>{
 const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'dam-approved-ocr-exit-'))),profile=path.join(root,'profile'),library=path.join(root,'library'),evidence=path.join(root,'evidence'),entry=path.join(root,'entry'),runtime=path.join(root,'runtime'),ready=path.join(root,'ready'),mode=path.join(root,'mode');let app
 const hashes={det:'a'.repeat(64),cls:'b'.repeat(64),rec:'c'.repeat(64)},value={engine:'rapidocr-onnxruntime',version:'1.4.4',recipe:'rapidocr-preview-v1',modelSha256:hashes,width:80,height:80,elapsedMs:1,threshold:.5,blocks:[]}
 try{
  for(const dir of [profile,evidence,entry,path.join(runtime,'bin')])await fs.mkdir(dir,{recursive:true})
  const source=path.join(root,'generated.png');await sharp({create:{width:80,height:80,channels:3,background:'#7799bb'}}).png().toFile(source);const original=createHash('sha256').update(await fs.readFile(source)).digest('hex')
  // This executable is a stdlib transport fixture, never the OCR worker or a model.
  const python=path.join(runtime,'bin','python3');await fs.writeFile(python,`#!/usr/bin/python3\nimport os,sys,time,signal\ndef stop(*args):\n time.sleep(0.15)\n print(${JSON.stringify(JSON.stringify({ok:true,value}))},flush=True)\n sys.exit(0)\nsignal.signal(signal.SIGTERM,stop)\nsys.stdin.buffer.read()\nif open(${JSON.stringify(mode)}).read()=='wait':\n open(${JSON.stringify(ready)},'w').write(str(os.getpid()))\n time.sleep(30)\nelse:\n print(${JSON.stringify(JSON.stringify({ok:true,value}))},flush=True)\n`);await fs.chmod(python,0o700)
  await fs.writeFile(path.join(root,'ocr-runtime.json'),JSON.stringify({schema:1,engine:'rapidocr-onnxruntime',version:'1.4.4',platform:process.platform,arch:process.arch,pythonRelative:'runtime/bin/python3',modelSha256:hashes}));await fs.writeFile(mode,'success')
  await fs.writeFile(path.join(entry,'package.json'),JSON.stringify({name:'dam-ocr-exit-test',type:'module',main:'main.mjs'}));await fs.writeFile(path.join(entry,'main.mjs'),`import ${JSON.stringify(pathToFileURL(path.resolve('out/main/index.js')).href)};`)
  const config={rootDirectory:root,profileDirectory:profile,libraryDirectory:library,evidenceDirectory:evidence,sourceSelections:[[source]]},env=Object.fromEntries(Object.entries(process.env).filter(([k])=>!k.startsWith('DAM_')&&!['NODE_OPTIONS','ELECTRON_RUN_AS_NODE','ELECTRON_RENDERER_URL'].includes(k)))
  app=await electron.launch({args:[entry,'--dam-active-library-synthetic-e2e',`--user-data-dir=${profile}`],env:{...env,NODE_ENV:'test',DAM_ACTIVE_LIBRARY_SYNTHETIC_E2E:JSON.stringify(config),DAM_SYNTHETIC_OCR_RUNTIME:root}})
  assert.ok((await app.evaluate(({app})=>['userData','sessionData','logs','crashDumps'].map(p=>app.getPath(p)))).every(p=>p.startsWith(root+path.sep)))
  const page=await app.firstWindow();page.setDefaultTimeout(15000);await page.getByTestId('formal-library-canvas').waitFor();await page.getByTestId('library-create').click();await page.getByTestId('library-create-confirm').click();await page.getByRole('button',{name:'添加图片',exact:true}).click();await page.getByTestId('library-copy-confirm').click();await page.locator('.lc-card').first().waitFor()
  const scope=await page.evaluate(async()=>{const s=await window.damClient.library.inspect(),a=(await window.damClient.listAssets())[0];return{libraryIdentity:s.identity,generation:s.generation,assetId:a.id}})
  assert.equal((await page.evaluate(()=>window.damClient.assetOcr.configure())).ok,true)
  const start=async()=>{const review=await page.evaluate(s=>window.damClient.assetOcr.prepare({libraryIdentity:s.libraryIdentity,generation:s.generation,assetIds:[s.assetId]}),scope);assert.equal(review.ok,true);const job=await page.evaluate(r=>window.damClient.assetOcr.run(r),review.value.receipt);assert.equal(job.ok,true)}
  await start();let completed=false;for(let i=0;i<200;i++){const s=await page.evaluate(()=>window.damClient.assetOcr.status());if(s.ok&&s.value.job?.state==='completed'){completed=true;break}await sleep(10)}assert.equal(completed,true,'formal job must complete before reading saved evidence')
  let snapshot=(await page.evaluate(s=>window.damClient.assetOcr.read(s),scope)).value
  assert.ok(snapshot.evidence,JSON.stringify({stage:'after success',revision:snapshot.revision,requiresUpgrade:snapshot.requiresUpgrade,status:await page.evaluate(()=>window.damClient.assetOcr.status())}));
  const corrected=await page.evaluate(s=>window.damClient.assetOcr.correct(s),{...scope,sessionToken:snapshot.sessionToken,expectedRevision:snapshot.revision,evidenceId:snapshot.evidence.id,text:'Synthetic user correction'});assert.equal(corrected.ok,true);const revision=corrected.value.revision
  await fs.writeFile(mode,'wait');await start();const pid=Number(await waitFile(ready));let closed=false;const closing=page.evaluate(()=>window.damClient.library.close()).then(r=>{closed=true;return r});await sleep(35);assert.equal(closed,false);process.kill(pid,0);await closing;assert.throws(()=>process.kill(pid,0),{code:'ESRCH'});assert.equal((await page.evaluate(()=>window.damClient.library.inspect())).state,'closed')
  await page.evaluate(()=>window.damClient.library.reopen());snapshot=(await page.evaluate(s=>window.damClient.assetOcr.read(s),scope)).value;assert.equal(snapshot.revision,revision);assert.equal(snapshot.editedText,'Synthetic user correction')
  await fs.unlink(ready);await start();const quitPid=Number(await waitFile(ready)),quit=app.waitForEvent('close');await app.evaluate(({app})=>{app.quit()});await quit;app=null;assert.throws(()=>process.kill(quitPid,0),{code:'ESRCH'});assert.equal(await fs.readFile(path.join(evidence,'shutdown-complete'),'utf8'),'complete\n');assert.equal(createHash('sha256').update(await fs.readFile(source)).digest('hex'),original)
 }finally{if(app)await app.close();await fs.rm(root,{recursive:true,force:true})}
})
