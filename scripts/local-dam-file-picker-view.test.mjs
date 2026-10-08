// Actual shared selector with synthetic deferred Client only. No Host, disk browsing,
// model, external request or native dialog; this is not Computer Use.
import assert from 'node:assert/strict'
import {test} from 'node:test'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {pathToFileURL} from 'node:url'
import {createHash} from 'node:crypto'
import {build} from 'esbuild'
import {chromium} from 'playwright'

const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'dam-file-picker-view-')))
assert.equal(path.dirname(root).toLowerCase(),(await fs.realpath(os.tmpdir())).toLowerCase())
const sourcePath='src/renderer/components/layout/FileSelectionOverlay.tsx'
const sourceRoot=process.env.DAM_FILE_PICKER_VIEW_SOURCE_ROOT
const source=await fs.readFile(sourceRoot?path.join(sourceRoot,sourcePath):sourcePath,'utf8')
const sha256=value=>createHash('sha256').update(value).digest('hex')
console.log(sourcePath+' '+(sourceRoot?'frozen-source-root':'working-tree')+' sha256='+sha256(source))
console.log('File picker regression source sha256='+sha256(await fs.readFile(new URL(import.meta.url))))
await build({absWorkingDir:process.cwd(),bundle:true,platform:'browser',format:'iife',outfile:path.join(root,'fixture.js'),logLevel:'silent',plugins:[{name:'actual-file-picker-caller',setup(builder){builder.onLoad({filter:/FileSelectionOverlay\.tsx$/},args=>({contents:source,loader:'tsx',resolveDir:path.dirname(args.path)}))}}],stdin:{resolveDir:process.cwd(),loader:'jsx',contents:`
 import React from'react';import{createRoot}from'react-dom/client';import{installWorkspaceClient}from'./src/renderer/workspace-client';import FileSelectionOverlay from'./src/renderer/components/layout/FileSelectionOverlay';
 import'./src/renderer/components/gallery/tokens.css';
 const clone=value=>structuredClone(value),picker=id=>({id,title:id,mode:'directory',multiple:false,directory:'/synthetic/'+id,directoryId:'entry:'+id,parentId:null,roots:[],entries:[{id:'folder:'+id,name:id+' child',kind:'directory'}],truncated:false});
 let current,callback,holds=[],replies=[],calls=[],pendingCalls=0;const app=createRoot(document.getElementById('root'));
 const emit=()=>callback?.();
 const defer=(kind,id,result)=>{
  calls.push({kind,id});const held=holds.indexOf(kind);if(held===-1)return Promise.resolve(clone(result));holds.splice(held,1);
  return new Promise((resolve,reject)=>replies.push({kind,id,resolve:()=>resolve(clone(result)),reject:()=>reject(Error('Synthetic selector operation failed'))}));
 };
 installWorkspaceClient({files:{pending:async()=>{pendingCalls++;return clone(current)},onRequested:fn=>{callback=fn;return()=>{if(callback===fn)callback=null}},
  cancel:async id=>{current=null;emit();return defer('cancel',id,{success:true})},
  confirm:async request=>{current=null;emit();return defer('confirm',request.session,{success:true})},
  browse:async request=>{const result={...picker(request.session),directory:'/synthetic/'+request.session+'/browsed'};return defer('browse',request.session,result)},
  createDirectory:async request=>{const initial=picker(request.session),result={...initial,entries:[...initial.entries,{id:'created:'+request.session,name:request.name,kind:'directory'}]};return defer('createDirectory',request.session,result)}
 }});
 window.fixture={
  open:async(id='Old picker')=>{app.render(null);await new Promise(resolve=>setTimeout(resolve,0));holds=[];calls=[];pendingCalls=0;current=picker(id);app.render(<FileSelectionOverlay/>)},
  hold:kind=>holds.push(kind),replace:id=>{current=picker(id);emit()},expire:()=>{current=null;emit()},
  reopen:async id=>{app.render(null);await new Promise(resolve=>setTimeout(resolve,0));current=picker(id);app.render(<FileSelectionOverlay/>)},
  release:(kind,failed=false)=>{const index=replies.findIndex(item=>item.kind===kind);if(index<0)throw Error('Missing held '+kind);const [reply]=replies.splice(index,1);failed?reply.reject():reply.resolve()},
  releaseAll:()=>{for(const reply of replies.splice(0))reply.resolve()},
  inspect:()=>({current:clone(current),calls:clone(calls),pendingCalls,replies:replies.map(({kind,id})=>({kind,id}))})
 };
`}})
console.log('File picker fixture bundle sha256='+sha256(await fs.readFile(path.join(root,'fixture.js'))))
await fs.writeFile(path.join(root,'index.html'),'<meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src \'self\';script-src \'self\';style-src \'self\' \'unsafe-inline\';connect-src \'none\'"><link rel="stylesheet" href="fixture.css"><div id="root"></div><script src="fixture.js"></script>')
const browser=await chromium.launch({headless:true})
try{
 const context=await browser.newContext({viewport:{width:1280,height:720}}),page=await context.newPage(),errors=[],external=[];
 page.setDefaultTimeout(3500);await context.route('**/*',route=>{if(route.request().url().startsWith('file:'))return route.continue();external.push(route.request().url());return route.abort()});page.on('pageerror',error=>errors.push(error.message));
 await page.goto(pathToFileURL(path.join(root,'index.html')).href);await page.waitForFunction(()=>Boolean(window.fixture));
 const dialog=(id='Old picker')=>page.getByRole('dialog',{name:id,exact:true}),confirm=(id='Old picker')=>dialog(id).getByRole('button',{name:'选择此文件夹',exact:true}),inspect=()=>page.evaluate(()=>window.fixture.inspect());
 const render=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const open=async()=>{await page.evaluate(()=>{window.fixture.releaseAll();return window.fixture.open()});await dialog().waitFor();await render()};
 const held=kind=>page.waitForFunction(kind=>window.fixture.inspect().replies.some(reply=>reply.kind===kind),kind);
 const release=async(kind,failed=false)=>{await page.evaluate(({kind,failed})=>window.fixture.release(kind,failed),{kind,failed});await render()};
 const replace=async()=>{await page.evaluate(()=>window.fixture.replace('New picker'));await dialog('New picker').waitFor();await render()};
 const holdAndStart=async kind=>{
  await page.evaluate(kind=>window.fixture.hold(kind),kind);
  if(kind==='cancel')await dialog().getByRole('button',{name:'取消',exact:true}).click();
  else if(kind==='confirm')await confirm().click();
  else if(kind==='browse')await dialog().getByRole('button',{name:'打开文件夹 Old picker child',exact:true}).click();
  else{await dialog().getByRole('button',{name:'新建文件夹',exact:true}).click();await dialog().getByLabel('新文件夹名称',{exact:true}).fill('Synthetic new directory');await dialog().getByRole('button',{name:'创建文件夹',exact:true}).click()}
  await held(kind);
 };
 for(const kind of ['cancel','confirm'])await test('late '+kind+' reply cannot close a replacement selection',async()=>{
  await open();await holdAndStart(kind);await dialog().waitFor({state:'hidden'});await replace();await release(kind);
  assert.equal(await dialog('New picker').isVisible(),true);assert.equal((await inspect()).current.id,'New picker');assert.equal(await confirm('New picker').isEnabled(),true);assert.equal(await dialog('New picker').getByRole('alert').count(),0);
 });
 await test('a replacement session does not inherit the old pending action busy lock',async()=>{
  await open();await holdAndStart('cancel');await dialog().waitFor({state:'hidden'});await replace();
  assert.equal(await confirm('New picker').isEnabled(),true);assert.equal(await dialog('New picker').getByRole('button',{name:'取消',exact:true}).isEnabled(),true);assert.deepEqual((await inspect()).replies,[{kind:'cancel',id:'Old picker'}]);await release('cancel');
 });
 await test('late old finally cannot unlock a pending action owned by the new session',async()=>{
  await open();await holdAndStart('cancel');await dialog().waitFor({state:'hidden'});await replace();assert.equal(await confirm('New picker').isEnabled(),true);
  await page.evaluate(()=>window.fixture.hold('browse'));await dialog('New picker').getByRole('button',{name:'打开文件夹 New picker child',exact:true}).click();await held('browse');assert.equal(await confirm('New picker').isDisabled(),true);
  await release('cancel');assert.equal(await dialog('New picker').isVisible(),true);assert.equal(await confirm('New picker').isDisabled(),true);assert.deepEqual((await inspect()).replies,[{kind:'browse',id:'New picker'}]);
  await release('browse');assert.equal(await confirm('New picker').isEnabled(),true);assert.equal(await dialog('New picker').getByLabel('目录路径',{exact:true}).inputValue(),'/synthetic/New picker/browsed');
 });
 for(const kind of ['browse','createDirectory'])for(const failed of [false,true])await test('expired '+kind+' '+(failed?'failure':'success')+' cannot rewrite the replacement picker or its feedback',async()=>{
  await open();await holdAndStart(kind);await page.evaluate(()=>window.fixture.expire());await dialog().waitFor({state:'hidden'});await replace();await release(kind,failed);
  assert.equal(await dialog('New picker').isVisible(),true);assert.equal(await dialog('New picker').getByLabel('目录路径',{exact:true}).inputValue(),'/synthetic/New picker');assert.equal(await dialog('New picker').getByRole('alert').count(),0);assert.equal(await confirm('New picker').isEnabled(),true);assert.equal((await inspect()).current.id,'New picker');
 });
 for(const failed of [false,true])await test('an unmounted picker reply '+(failed?'failure':'success')+' cannot change a reopened selection or unlock its pending action',async()=>{
  await open();await holdAndStart('browse');await page.evaluate(()=>window.fixture.reopen('New picker'));await dialog('New picker').waitFor();await render();assert.equal(await confirm('New picker').isEnabled(),true);
  await page.evaluate(()=>window.fixture.hold('createDirectory'));await dialog('New picker').getByRole('button',{name:'新建文件夹',exact:true}).click();await dialog('New picker').getByLabel('新文件夹名称',{exact:true}).fill('Synthetic current directory');await dialog('New picker').getByRole('button',{name:'创建文件夹',exact:true}).click();await held('createDirectory');
  await release('browse',failed);assert.equal(await dialog('New picker').isVisible(),true);assert.equal(await confirm('New picker').isDisabled(),true);assert.equal(await dialog('New picker').getByRole('alert').count(),0);
  await release('createDirectory');assert.equal(await confirm('New picker').isEnabled(),true);assert.equal(await dialog('New picker').getByLabel('目录路径',{exact:true}).inputValue(),'/synthetic/New picker');assert.equal(await dialog('New picker').getByRole('button',{name:'Synthetic current directory',exact:true}).count(),1);
 });
 await test('same-session failures retain safe feedback and enable retry, then one successful action settles normally',async()=>{
  await open();await holdAndStart('browse');await release('browse',true);assert.equal(await dialog().isVisible(),true);assert.equal(await confirm().isEnabled(),true);assert.equal(await dialog().getByRole('alert').innerText(),'无法使用所选位置，请检查名称和权限，或选择其它目录。');assert.equal(await dialog().getByLabel('目录路径',{exact:true}).inputValue(),'/synthetic/Old picker');
  await dialog().getByRole('button',{name:'打开文件夹 Old picker child',exact:true}).click();await render();assert.equal(await dialog().getByLabel('目录路径',{exact:true}).inputValue(),'/synthetic/Old picker/browsed');assert.equal(await dialog().getByRole('alert').count(),0);assert.equal(await confirm().isEnabled(),true);assert.equal((await inspect()).calls.filter(call=>call.kind==='browse').length,2);
 });
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
}finally{await browser.close()}
