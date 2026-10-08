// Isolated real WorkspaceConnection + workspace-input-lock regression.
// Synthetic connection state and private Chromium context; no Host/profile/library access.
import assert from 'node:assert/strict'
import {test} from 'node:test'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {pathToFileURL} from 'node:url'
import {build} from 'esbuild'
import {chromium} from 'playwright'

const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'dam-connection-view-')))
await build({absWorkingDir:process.cwd(),bundle:true,platform:'browser',format:'iife',outfile:path.join(root,'fixture.js'),logLevel:'silent',stdin:{resolveDir:process.cwd(),loader:'jsx',contents:`
 import React from'react';import{createRoot}from'react-dom/client';
 import WorkspaceConnection from'./src/renderer/components/layout/WorkspaceConnection';
 import WorkspaceTransitions from'./src/renderer/components/layout/WorkspaceTransitions';
 import{installWorkspaceClient}from'./src/renderer/workspace-client';
 import{freezeWorkspaceInput,lockWorkspaceInput}from'./src/renderer/workspace-input-lock';
 import'./src/renderer/components/gallery/tokens.css';import'./src/renderer/styles/file-picker.css';
 const listeners=new Set(),reviewListeners=new Set(),transitionListeners=new Set(),reviewReads=[],cancelled=[];
 let state={connected:true,reconciling:false},releaseModal,connectOnSubscribe=false;
 installWorkspaceClient({connectionState:()=>state,onConnectionChanged:listener=>{listeners.add(listener);if(connectOnSubscribe){connectOnSubscribe=false;state={connected:true,reconciling:false}}return()=>listeners.delete(listener)},transitions:{
  pending:()=>new Promise(resolve=>reviewReads.push(resolve)),cancel:async id=>{cancelled.push(id)},confirm:async()=>{},quit:async()=>{},
  onReview:listener=>{reviewListeners.add(listener);return()=>reviewListeners.delete(listener)},onState:listener=>{transitionListeners.add(listener);return()=>transitionListeners.delete(listener)}
 }});
 const app=createRoot(document.getElementById('root'));
 const mount=()=>app.render(<><input aria-label="Synthetic editable draft" defaultValue="Synthetic draft"/><div className="workspace-recovery-banner" data-testid="recovery-banner">Synthetic recovery notice</div><WorkspaceConnection/></>);
 window.fixture={mount,unmount:()=>app.render(null),freeze:freezeWorkspaceInput,
  mountReconciliationRace:()=>{state={connected:false,reconciling:true};connectOnSubscribe=true;mount()},
  state:next=>{state=next;for(const listener of listeners)listener(next)},
  listeners:()=>listeners.size,
  mountTransitions:()=>app.render(<WorkspaceTransitions/>),
  reviewEvent:()=>{for(const listener of reviewListeners)listener()},
  resolveReview:(index,value)=>reviewReads[index](value),
  reviewState:()=>({reads:reviewReads.length,cancelled:[...cancelled],listeners:reviewListeners.size+transitionListeners.size}),
  modalLock:()=>{releaseModal=lockWorkspaceInput([document.getElementById('root')])},
  releaseModal:()=>{releaseModal?.();releaseModal=null}
 };mount();
`}})
await fs.writeFile(path.join(root,'index.html'),`<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'none'"><link rel="stylesheet" href="fixture.css"><style>body{margin:0}#root{padding:100px 20px}</style><div id="root"></div><script src="fixture.js"></script>`)
const browser=await chromium.launch({headless:true})
try{
 const context=await browser.newContext({viewport:{width:960,height:640}}),page=await context.newPage(),errors=[],external=[]
 page.on('pageerror',error=>errors.push(error.message))
 await context.route('**/*',route=>{if(route.request().url().startsWith('file:'))return route.continue();external.push(new URL(route.request().url()).origin);return route.abort()})
 await page.goto(pathToFileURL(path.join(root,'index.html')).href)
 await page.waitForFunction(()=>window.fixture?.listeners()===1)
 const cdp=await context.newCDPSession(page)
 await cdp.send('Accessibility.enable')
 const accessibility=async selector=>{
  const {root:document}=await cdp.send('DOM.getDocument')
  const {nodeId}=await cdp.send('DOM.querySelector',{nodeId:document.nodeId,selector})
  const {nodes}=await cdp.send('Accessibility.getPartialAXTree',{nodeId,fetchRelatives:false})
  return nodes[0]
 }
 const business=page.locator('#root'),banner=()=>page.locator('.workspace-connection-banner')

 await test('disconnect status stays accessible outside the frozen business root and avoids the recovery notice',async()=>{
  await page.evaluate(()=>{window.fixture.freeze(true);window.fixture.state({connected:false,reconciling:false})})
  const status=page.getByRole('status');await status.waitFor({state:'visible'})
  assert.match(await status.innerText(),/本机 DAM 连接已中断/)
  assert.equal(await business.evaluate(element=>element.inert),true)
  assert.equal(await banner().evaluate(element=>element.parentElement===document.body&&element.hasAttribute('data-workspace-transition-surface')&&!element.inert&&!element.closest('[inert]')),true)
  const connectionBounds=await banner().boundingBox(),recoveryBounds=await page.getByTestId('recovery-banner').boundingBox()
  assert.ok(connectionBounds&&recoveryBounds&&recoveryBounds.y+recoveryBounds.height<connectionBounds.y,'notices must not overlap')
  assert.ok(connectionBounds.y+connectionBounds.height<=620&&connectionBounds.x>=20&&connectionBounds.x+connectionBounds.width<=940)
  // The Chromium AX tree honors inert. Playwright's DOM-derived ariaSnapshot
  // can include inert descendants, so it cannot verify the original AX failure.
  const noticeAX=await accessibility('.workspace-connection-banner')
  assert.equal(noticeAX.ignored,false);assert.equal(noticeAX.role.value,'status')
  assert.equal((await accessibility('#root input')).ignored,true)
  const input=business.locator('input'),bounds=await input.boundingBox()
  await page.mouse.click(bounds.x+10,bounds.y+10);await page.keyboard.type('blocked input')
  assert.equal(await input.inputValue(),'Synthetic draft','connection feedback must not unlock edits')
 })

 await test('reconciliation and reconnection update the notice without releasing the Host freeze',async()=>{
  await page.evaluate(()=>window.fixture.state({connected:false,reconciling:true}))
  await page.getByRole('status').filter({hasText:'正在重新读取本机状态'}).waitFor()
  assert.equal(await business.evaluate(element=>element.inert),true)
  await page.evaluate(()=>window.fixture.state({connected:true,reconciling:false}))
  await banner().waitFor({state:'detached'})
  assert.equal(await business.evaluate(element=>element.inert),true,'connected UI is not authority to release a Host freeze')
  await page.evaluate(()=>window.fixture.freeze(false))
  assert.equal(await business.evaluate(element=>element.inert),false)
  await page.getByRole('textbox',{name:'Synthetic editable draft'}).fill('Synthetic input after Host unfreeze')
  assert.equal(await business.locator('input').inputValue(),'Synthetic input after Host unfreeze')
 })

 await test('a new disconnect portal is excluded from freeze observation while independent modal ownership survives',async()=>{
  await page.evaluate(()=>{window.fixture.modalLock();window.fixture.freeze(true);window.fixture.state({connected:false,reconciling:false})})
  await page.getByRole('status').filter({hasText:'连接已中断'}).waitFor()
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(resolve)))
  assert.equal(await banner().evaluate(element=>element.inert),false)
  await page.evaluate(()=>window.fixture.freeze(false))
  assert.equal(await business.evaluate(element=>element.inert),true,'Host unfreeze must preserve modal input lock')
  await page.evaluate(()=>window.fixture.releaseModal())
  assert.equal(await business.evaluate(element=>element.inert),false)
 })

 await test('unmount removes the portal and connection listener without unfreezing business input',async()=>{
  await page.evaluate(()=>{window.fixture.freeze(true);window.fixture.unmount()})
  await banner().waitFor({state:'detached'});await page.waitForFunction(()=>window.fixture.listeners()===0)
  assert.equal(await business.evaluate(element=>element.inert),true)
  await page.evaluate(()=>window.fixture.state({connected:false,reconciling:true}))
  assert.equal(await banner().count(),0)
  await page.evaluate(()=>window.fixture.freeze(false))
  assert.equal(await business.evaluate(element=>element.inert),false)
 })

 const review={id:'transition:synthetic',action:'quit',drafts:1,nativeDrafts:0,accounts:0,changed:false}
 await test('reconciliation completed between render and subscription cannot leave a stale connection banner',async()=>{
  await page.evaluate(()=>window.fixture.mountReconciliationRace())
  await page.waitForFunction(()=>window.fixture.listeners()===1)
  await banner().waitFor({state:'detached'})
  assert.equal(await business.evaluate(element=>element.inert),false)
  await page.evaluate(()=>window.fixture.unmount())
  await page.waitForFunction(()=>window.fixture.listeners()===0)
 })
 const settle=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))))
 await test('late pending review cannot revive the dialog after cancellation and the authoritative empty reply',async()=>{
  await page.evaluate(()=>window.fixture.mountTransitions());await page.waitForFunction(()=>window.fixture.reviewState().listeners===2)
  await page.evaluate(()=>window.fixture.reviewEvent());await page.waitForFunction(()=>window.fixture.reviewState().reads===1)
  await page.evaluate(review=>window.fixture.resolveReview(0,review),review)
  await page.getByRole('dialog',{name:'退出整个 DAM',exact:true}).waitFor()
  await page.evaluate(()=>window.fixture.reviewEvent());await page.waitForFunction(()=>window.fixture.reviewState().reads===2)
  await page.getByRole('button',{name:'继续编辑',exact:true}).click();await page.waitForFunction(()=>window.fixture.reviewState().reads===3)
  await page.evaluate(()=>window.fixture.resolveReview(2,null));await page.getByRole('dialog').waitFor({state:'detached'})
  await page.evaluate(review=>window.fixture.resolveReview(1,review),review);await settle()
  assert.equal(await page.getByRole('dialog').count(),0)
  assert.deepEqual(await page.evaluate(()=>window.fixture.reviewState().cancelled),['transition:synthetic'])
 })

 await test('earlier pending response cannot replace the newest review counts',async()=>{
  await page.evaluate(()=>{window.fixture.reviewEvent();window.fixture.reviewEvent()});await page.waitForFunction(()=>window.fixture.reviewState().reads===5)
  await page.evaluate(review=>window.fixture.resolveReview(4,{...review,drafts:7,changed:true}),review)
  const counts=page.getByText('暂存草稿 7 项 · 原生窗口未保存状态 0 项 · 正在登录的账号任务 0 项',{exact:true})
  await counts.waitFor()
  await page.evaluate(review=>window.fixture.resolveReview(3,review),review);await settle()
  assert.equal(await counts.isVisible(),true)
 })

 await test('transition unmount unregisters listeners and ignores its outstanding pending response',async()=>{
  await page.evaluate(()=>window.fixture.reviewEvent());await page.waitForFunction(()=>window.fixture.reviewState().reads===6)
  await page.evaluate(()=>window.fixture.unmount());await page.waitForFunction(()=>window.fixture.reviewState().listeners===0)
  await page.evaluate(review=>window.fixture.resolveReview(5,review),review);await settle()
  assert.equal(await page.getByRole('dialog').count(),0)
 })
 assert.deepEqual(errors,[]);assert.deepEqual(external,[])
 await context.close()
}finally{await browser.close();await fs.rm(root,{recursive:true,force:true})}
