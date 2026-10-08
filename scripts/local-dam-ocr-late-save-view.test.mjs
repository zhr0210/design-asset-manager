// Actual DedicatedOcrPanel with a synthetic deferred correction boundary.
// No Host, SQLite, model, account or external service; this is not formal CU.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { createHash } from 'node:crypto'
import { build } from 'esbuild'
import { chromium } from 'playwright'

const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'dam-ocr-late-save-view-')))
assert.equal(path.dirname(root).toLowerCase(), (await fs.realpath(os.tmpdir())).toLowerCase())
const callerPath = 'src/renderer/components/library/canvas/DedicatedOcrPanel.tsx'
const callerSnapshot = process.env.DAM_OCR_CALLER_SOURCE || callerPath
const callerSource = await fs.readFile(callerSnapshot, 'utf8')
const sha256 = value => createHash('sha256').update(value).digest('hex')
console.log('Actual OCR caller snapshot: ' + callerSnapshot)
console.log(callerPath + ' actual source snapshot sha256=' + sha256(callerSource))
await build({ absWorkingDir: process.cwd(), bundle: true, platform: 'browser', format: 'iife', outfile: path.join(root, 'fixture.js'), logLevel: 'silent', plugins: [{ name: 'actual-ocr-caller-snapshot', setup(builder) {
  builder.onLoad({ filter: /DedicatedOcrPanel\.tsx$/ }, args => ({ contents: callerSource, loader: 'tsx', resolveDir: path.dirname(args.path) }))
} }], stdin: { resolveDir: process.cwd(), loader: 'jsx', contents: `
 import React,{useState} from 'react';import {createRoot} from 'react-dom/client';
 import {installWorkspaceClient} from './src/renderer/workspace-client';
 import {currentWorkspaceDraft,flushWorkspaceDrafts} from './src/renderer/workspace-drafts';
 import {getOcrDraft,ocrDraftKey,hasUnsavedOcrDrafts} from './src/renderer/components/library/canvas/ocr-drafts';
 import './src/renderer/components/gallery/tokens.css';
 const clone=value=>structuredClone(value),scope={libraryIdentity:'library:fixture',generation:'generation:fixture',assetId:'asset:one'},draftScope={...scope,kind:'ocr',entityId:scope.assetId};
 const evidence={id:'evidence:one',assetId:scope.assetId,assetRevision:'asset-revision:one',sourceRef:'source:fixture',inputSha256:'1'.repeat(64),createdAt:'2026-10-02T00:00:00.000Z',observation:{engine:'rapidocr-onnxruntime',version:'1.4.4',recipe:'rapidocr-preview-v1',modelSha256:{det:'2'.repeat(64),cls:'3'.repeat(64),rec:'4'.repeat(64)},width:100,height:100,elapsedMs:1,threshold:.5,blocks:[{text:'Original recognition',confidence:.9,polygon:[[0,0],[1,0],[1,1],[0,1]]}]}};
 let saved={sessionToken:'session:fixture',revision:1,requiresUpgrade:false,evidence,editedText:null},pending=null,holdRead=0;const pendingReads=[],reads=[],writes=[],draftPuts=[],draftRemoves=[],listeners=new Set();let show=()=>{},reopen=()=>{};
 const asset=()=>({id:scope.assetId,title:'Synthetic OCR asset',aiOcrText:saved.editedText??'Original recognition',ocr:{evidenceId:evidence.id,revision:saved.revision,text:saved.editedText??'Original recognition',sourceText:'Original recognition',edited:saved.editedText!==null,engine:'rapidocr-onnxruntime',version:'1.4.4',createdAt:evidence.createdAt,blockCount:1}});
 const api={
  status:async()=>({ok:true,value:{configured:true,label:'Synthetic OCR environment',job:null}}),
  read:async()=>{const snapshot=clone(saved);reads.push({revision:snapshot.revision,text:snapshot.editedText});if(holdRead){holdRead--;return new Promise(resolve=>{pendingReads.push({snapshot,resolve})})}return{ok:true,value:snapshot}},
  onChanged:listener=>{listeners.add(listener);return()=>listeners.delete(listener)},
  correct:input=>{writes.push(clone(input));if(pending)throw Error('SYNTHETIC_CORRECTION_BUSY');if(input.expectedRevision!==saved.revision||input.evidenceId!==evidence.id)return Promise.resolve({ok:false,error:'SYNTHETIC_OCR_CONFLICT'});return new Promise(resolve=>{pending={input:clone(input),resolve}})},
  configure:async()=>({ok:true,value:{configured:true,label:'Synthetic OCR environment',job:null}})
 };
 installWorkspaceClient({assetOcr:api,transitions:{ready:async()=>{}},drafts:{put:async input=>{draftPuts.push(clone(input));return input},remove:async input=>{draftRemoves.push(clone(input));return{success:true}}}});
 import('./src/renderer/components/library/canvas/DedicatedOcrPanel').then(({DedicatedOcrPanel})=>{
  function App(){const [current,setCurrent]=useState(asset()),[epoch,setEpoch]=useState(0);show=()=>setCurrent(asset());reopen=()=>{setCurrent(asset());setEpoch(value=>value+1)};return <DedicatedOcrPanel key={epoch} asset={current} scope={scope}/>}
  window.fixture={inspect:()=>clone({saved,reads,writes,draftPuts,draftRemoves,pending:Boolean(pending),pendingRead:pendingReads.length>0,pendingReads:pendingReads.map(value=>value.snapshot.revision),ocrDraft:getOcrDraft(ocrDraftKey(scope))??null,workspaceDraft:currentWorkspaceDraft(draftScope)??null,unsaved:hasUnsavedOcrDrafts()}),flush:()=>flushWorkspaceDrafts(),reopen:()=>reopen(),
   notify:()=>{for(const listener of listeners)listener(scope)},
   peer:text=>{saved={...saved,revision:saved.revision+1,editedText:text};show();for(const listener of listeners)listener(scope)},holdRead:()=>{holdRead++},
   releaseRead:(index=0)=>{const operation=pendingReads.splice(index,1)[0];if(!operation)throw Error('NO_PENDING_READ');operation.resolve({ok:true,value:clone(operation.snapshot)})},
   release:(notify=false)=>{if(!pending)throw Error('NO_PENDING_CORRECTION');const operation=pending;pending=null;saved={...saved,revision:saved.revision+1,editedText:operation.input.text};show();if(notify)for(const listener of listeners)listener(scope);operation.resolve({ok:true,value:clone(saved)})},
   reject:()=>{if(!pending)throw Error('NO_PENDING_CORRECTION');const operation=pending;pending=null;operation.resolve({ok:false,error:'SYNTHETIC_CORRECTION_FAILED'})}
  };
  createRoot(document.getElementById('root')).render(<App/>);
 });
` } })
console.log('Actual OCR Renderer fixture bundle sha256=' + sha256(await fs.readFile(path.join(root, 'fixture.js'))))
await fs.writeFile(path.join(root, 'index.html'), '<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src \'self\'; script-src \'self\'; style-src \'self\' \'unsafe-inline\'; connect-src \'none\'"><link rel="stylesheet" href="fixture.css"><div id="root"></div><script src="fixture.js"></script>')
const browser = await chromium.launch({ headless: true })
try {
  const context = await browser.newContext({ viewport: { width: 1100, height: 900 } }), errors = [], external = []
  await context.route('**/*', route => { if (route.request().url().startsWith('file:')) return route.continue(); external.push(route.request().url()); return route.abort() })
  const withPanel = async run => {
    const page = await context.newPage(); page.setDefaultTimeout(3500); page.on('pageerror', error => errors.push(error.message))
    try {
      await page.goto(pathToFileURL(path.join(root, 'index.html')).href); await page.waitForFunction(() => Boolean(window.fixture))
      await page.getByRole('button', { name: '修订识别文字', exact: true }).click()
      const input = () => page.getByRole('textbox', { name: '修订识别文字', exact: true })
      const save = () => page.getByRole('button', { name: '保存文字修订', exact: true })
      const inspect = () => page.evaluate(() => window.fixture.inspect())
      const settled = () => page.waitForFunction(() => ![...document.querySelectorAll('button')].find(button => button.textContent === '选择本地 OCR 环境')?.disabled)
      const rendered = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
      const flush = () => page.evaluate(() => window.fixture.flush())
      await run({ page, input, save, inspect, settled, rendered, flush })
    } finally { await page.close() }
  }

  await test('a correction reply preserves later input and drafts, advances the committed baseline, and saves the later version on retry', async () => withPanel(async ({ page, input, save, inspect, settled, flush }) => {
    await input().fill('Submitted correction'); await save().click(); await page.waitForFunction(() => window.fixture.inspect().pending)
    await input().fill('Later unsaved correction'); await flush(); const before = await inspect()
    assert.equal(before.writes[0].text, 'Submitted correction'); assert.equal(before.writes[0].expectedRevision, 1)
    assert.equal(before.ocrDraft.text, 'Later unsaved correction'); assert.equal(before.workspaceDraft.value, 'Later unsaved correction')
    await page.evaluate(() => window.fixture.release(true)); await settled()
    assert.equal(await input().count(), 1, 'a reply for the submitted version must not close the later editor')
    assert.equal(await input().inputValue(), 'Later unsaved correction'); const after = await inspect()
    assert.equal(after.saved.editedText, 'Submitted correction'); assert.equal(after.saved.revision, 2)
    assert.equal(after.ocrDraft?.text, 'Later unsaved correction', 'the submitted reply cannot remove a later OCR draft')
    assert.deepEqual(after.ocrDraft?.base, { revision: 2, evidenceId: 'evidence:one' })
    assert.equal(after.ocrDraft?.mismatch, false); assert.equal(after.workspaceDraft?.value, 'Later unsaved correction')
    assert.deepEqual(after.workspaceDraft?.base, { revision: 2, evidenceId: 'evidence:one' })
    assert.ok(after.workspaceDraft.sequence > before.workspaceDraft.sequence, 'the surviving input must be checkpointed against the returned baseline')
    assert.equal(after.unsaved, true); assert.equal(await save().isEnabled(), true)
    await save().click(); await page.waitForFunction(() => window.fixture.inspect().pending); const retry = await inspect()
    assert.equal(retry.writes[1].text, 'Later unsaved correction'); assert.equal(retry.writes[1].expectedRevision, 2)
    await page.evaluate(() => window.fixture.release()); await settled(); assert.equal(await input().count(), 0)
    await flush(); assert.equal((await inspect()).workspaceDraft, null); assert.equal((await inspect()).ocrDraft, null)
    await page.evaluate(() => window.fixture.reopen()); await page.getByRole('button', { name: '修订识别文字', exact: true }).click()
    assert.equal(await input().inputValue(), 'Later unsaved correction')
  }))

  await test('a correction without later edits clears only its committed draft and reopens the saved text', async () => withPanel(async ({ page, input, save, inspect, settled, flush }) => {
    await input().fill('Ordinary saved correction'); await flush(); await save().click(); await page.waitForFunction(() => window.fixture.inspect().pending)
    await page.evaluate(() => window.fixture.release(true)); await settled(); assert.equal(await input().count(), 0)
    await flush(); const state = await inspect(); assert.equal(state.saved.editedText, 'Ordinary saved correction'); assert.equal(state.saved.revision, 2)
    assert.equal(state.ocrDraft, null); assert.equal(state.workspaceDraft, null); assert.equal(state.unsaved, false)
    await page.evaluate(() => window.fixture.reopen()); await page.getByRole('button', { name: '修订识别文字', exact: true }).click()
    assert.equal(await input().inputValue(), 'Ordinary saved correction'); assert.equal(await save().isEnabled(), false)
  }))

  await test('newer input that returns to the submitted text has the committed baseline and no falsely unsaved content', async () => withPanel(async ({ page, input, save, inspect, settled, flush }) => {
    await input().fill('Same committed text'); await save().click(); await page.waitForFunction(() => window.fixture.inspect().pending)
    const submitted = (await inspect()).workspaceDraft.sequence
    await input().fill('Intermediate newer text'); await input().fill('Same committed text'); await flush()
    assert.ok((await inspect()).workspaceDraft.sequence > submitted, 'typing the same final value is still a later input version')
    await page.evaluate(() => window.fixture.release(true)); await settled(); const state = await inspect()
    assert.equal(state.saved.editedText, 'Same committed text'); assert.equal(state.saved.revision, 2)
    assert.equal(state.unsaved, false, 'later typing equal to the returned committed value must not create a phantom unsaved OCR draft')
    if (await input().count()) { assert.equal(await input().inputValue(), 'Same committed text'); assert.equal(await save().isEnabled(), false) }
    if (state.ocrDraft) { assert.equal(state.ocrDraft.text, 'Same committed text'); assert.deepEqual(state.ocrDraft.base, { revision: 2, evidenceId: 'evidence:one' }); assert.equal(state.ocrDraft.mismatch, false) }
    if (state.workspaceDraft) { assert.equal(state.workspaceDraft.value, 'Same committed text'); assert.deepEqual(state.workspaceDraft.base, { revision: 2, evidenceId: 'evidence:one' }) }
    await page.evaluate(() => window.fixture.reopen())
    await page.waitForFunction(() => document.querySelector('textarea[aria-label="修订识别文字"]') || [...document.querySelectorAll('button')].some(button => button.textContent === '修订识别文字'))
    const edit = page.getByRole('button', { name: '修订识别文字', exact: true }); if (await edit.count()) await edit.click()
    assert.equal(await input().inputValue(), 'Same committed text'); assert.equal(await save().isEnabled(), false)
  }))

  await test('a rejected correction preserves later input and its original baseline for an explicit retry', async () => withPanel(async ({ page, input, save, inspect, settled, flush }) => {
    await input().fill('Rejected submitted correction'); await save().click(); await page.waitForFunction(() => window.fixture.inspect().pending)
    await input().fill('Later input after failed correction'); await page.evaluate(() => window.fixture.reject()); await settled()
    await page.getByRole('alert').filter({ hasText: 'SYNTHETIC_CORRECTION_FAILED' }).waitFor()
    assert.equal(await input().inputValue(), 'Later input after failed correction'); await flush(); const state = await inspect()
    assert.equal(state.saved.revision, 1); assert.equal(state.saved.editedText, null); assert.equal(state.ocrDraft.text, 'Later input after failed correction')
    assert.deepEqual(state.ocrDraft.base, { revision: 1, evidenceId: 'evidence:one' }); assert.equal(state.workspaceDraft.value, 'Later input after failed correction')
    await save().click(); await page.waitForFunction(() => window.fixture.inspect().pending); const retry = await inspect()
    assert.equal(retry.writes[1].text, 'Later input after failed correction'); assert.equal(retry.writes[1].expectedRevision, 1)
    await page.evaluate(() => window.fixture.release()); await settled(); assert.equal(await input().count(), 0)
  }))

  await test('a deferred baseline adoption retains newer input in both draft owners and after closing/reopening the actual panel', async () => withPanel(async ({ page, input, save, inspect, settled, flush }) => {
    await input().fill('Text before adopting peer'); await flush(); await page.evaluate(() => window.fixture.peer('Peer saved correction'))
    const adopt = () => page.getByRole('button', { name: '核对后采用当前识别版本', exact: true })
    await adopt().waitFor(); assert.equal((await inspect()).ocrDraft.mismatch, true)
    await page.evaluate(() => window.fixture.holdRead()); await adopt().click(); await page.waitForFunction(() => window.fixture.inspect().pendingRead)
    await input().fill('Input typed during adoption'); await flush(); const before = await inspect()
    assert.equal(before.ocrDraft.text, 'Input typed during adoption'); assert.equal(before.workspaceDraft.value, 'Input typed during adoption'); assert.equal(before.ocrDraft.base.revision, 1)
    await page.evaluate(() => window.fixture.releaseRead()); await settled(); await flush(); assert.equal(await input().inputValue(), 'Input typed during adoption')
    const after = await inspect(); assert.equal(after.saved.editedText, 'Peer saved correction'); assert.equal(after.saved.revision, 2); assert.deepEqual(after.writes, [])
    assert.equal(after.ocrDraft.text, 'Input typed during adoption', 'adoption must checkpoint the input present when its read returns')
    assert.deepEqual(after.ocrDraft.base, { revision: 2, evidenceId: 'evidence:one' }); assert.equal(after.ocrDraft.mismatch, false)
    assert.equal(after.workspaceDraft.value, 'Input typed during adoption'); assert.deepEqual(after.workspaceDraft.base, { revision: 2, evidenceId: 'evidence:one' })
    assert.ok(after.workspaceDraft.sequence > before.workspaceDraft.sequence); assert.equal(after.unsaved, true)
    await page.evaluate(() => window.fixture.reopen()); await input().waitFor(); await settled()
    assert.equal(await input().inputValue(), 'Input typed during adoption'); const reopened = await inspect()
    assert.equal(reopened.ocrDraft.text, 'Input typed during adoption'); assert.equal(reopened.workspaceDraft.value, 'Input typed during adoption'); assert.equal(reopened.ocrDraft.base.revision, 2)
    await save().click(); await page.waitForFunction(() => window.fixture.inspect().pending); const retry = await inspect()
    assert.equal(retry.writes[0].text, 'Input typed during adoption'); assert.equal(retry.writes[0].expectedRevision, 2)
    await page.evaluate(() => window.fixture.release()); await settled(); await flush(); assert.equal((await inspect()).ocrDraft, null); assert.equal((await inspect()).workspaceDraft, null)
  }))

  await test('a read captured before a successful correction cannot restore its old text or save revision afterward', async () => withPanel(async ({ page, input, save, inspect, settled, rendered, flush }) => {
    await input().fill('Committed correction survives old read')
    await page.evaluate(() => { window.fixture.holdRead(); window.fixture.notify() })
    await page.waitForFunction(() => window.fixture.inspect().pendingRead); assert.deepEqual((await inspect()).pendingReads, [1])
    await save().click(); await page.waitForFunction(() => window.fixture.inspect().pending)
    await page.evaluate(() => window.fixture.release()); await settled(); await flush(); assert.equal(await input().count(), 0)
    assert.equal((await inspect()).saved.revision, 2)
    await page.evaluate(() => window.fixture.releaseRead()); await rendered()
    await page.getByRole('button', { name: '修订识别文字', exact: true }).click()
    assert.equal(await input().inputValue(), 'Committed correction survives old read', 'a late pre-save read cannot restore revision-one text')
    await input().fill('Second correction after old read'); await save().click(); await rendered()
    const state = await inspect(); assert.equal(state.writes[1]?.expectedRevision, 2, 'the next save must use the returned committed baseline')
    assert.equal(state.pending, true); await page.evaluate(() => window.fixture.release()); await settled()
  }))

  await test('an old read cannot mark later input against a successfully committed correction as mismatched', async () => withPanel(async ({ page, input, save, inspect, settled, rendered, flush }) => {
    await input().fill('Submitted before the captured read')
    await page.evaluate(() => { window.fixture.holdRead(); window.fixture.notify() }); await page.waitForFunction(() => window.fixture.inspect().pendingRead)
    await save().click(); await page.waitForFunction(() => window.fixture.inspect().pending); await input().fill('Later input after the captured read')
    await page.evaluate(() => window.fixture.release()); await settled(); await flush()
    assert.deepEqual((await inspect()).ocrDraft.base, { revision: 2, evidenceId: 'evidence:one' })
    await page.evaluate(() => window.fixture.releaseRead()); await rendered(); await flush(); const state = await inspect()
    assert.equal(await input().inputValue(), 'Later input after the captured read'); assert.equal(state.ocrDraft.mismatch, false, 'obsolete authority cannot invalidate the committed baseline')
    assert.deepEqual(state.ocrDraft.base, { revision: 2, evidenceId: 'evidence:one' }); assert.equal(state.workspaceDraft.value, 'Later input after the captured read')
    assert.equal(await save().isEnabled(), true)
  }))

  await test('a read older than explicit adoption cannot restore mismatch or replace the adopted draft baseline', async () => withPanel(async ({ page, input, save, inspect, settled, rendered, flush }) => {
    await input().fill('Local input retained across explicit adoption')
    await page.evaluate(() => { window.fixture.holdRead(); window.fixture.notify() }); await page.waitForFunction(() => window.fixture.inspect().pendingRead)
    await page.evaluate(() => window.fixture.peer('Latest peer correction'))
    const adopt = page.getByRole('button', { name: '核对后采用当前识别版本', exact: true }); await adopt.waitFor(); await adopt.click(); await settled(); await flush()
    assert.deepEqual((await inspect()).ocrDraft.base, { revision: 2, evidenceId: 'evidence:one' }); assert.equal((await inspect()).ocrDraft.mismatch, false)
    await page.evaluate(() => window.fixture.releaseRead()); await rendered(); await flush(); const state = await inspect()
    assert.equal(await input().inputValue(), 'Local input retained across explicit adoption'); assert.equal(state.ocrDraft.mismatch, false, 'explicitly adopted current authority supersedes the older read')
    assert.deepEqual(state.workspaceDraft.base, { revision: 2, evidenceId: 'evidence:one' }); assert.equal(await adopt.count(), 0); assert.equal(await save().isEnabled(), true)
  }))

  await test('reverse ordinary read replies keep the newest visible OCR text and expected correction revision', async () => withPanel(async ({ page, input, save, inspect, settled, rendered }) => {
    await page.evaluate(() => { window.fixture.holdRead(); window.fixture.peer('Obsolete peer correction') }); await page.waitForFunction(() => window.fixture.inspect().pendingReads.length === 1)
    await page.evaluate(() => { window.fixture.holdRead(); window.fixture.peer('Newest peer correction') }); await page.waitForFunction(() => window.fixture.inspect().pendingReads.length === 2)
    assert.deepEqual((await inspect()).pendingReads, [2, 3])
    await page.evaluate(() => window.fixture.releaseRead(1)); await rendered(); assert.equal(await input().inputValue(), 'Newest peer correction')
    await page.evaluate(() => window.fixture.releaseRead()); await rendered(); assert.equal(await input().inputValue(), 'Newest peer correction', 'an older read cannot replace the newer read result')
    await input().fill('Correction from revision three'); await save().click(); await rendered(); const state = await inspect()
    assert.equal(state.writes[0]?.expectedRevision, 3); assert.equal(state.pending, true); await page.evaluate(() => window.fixture.release()); await settled()
  }))
  assert.deepEqual(errors, []); assert.deepEqual(external, []); await context.close()
} finally { await browser.close(); await fs.rm(root, { recursive: true, force: true }) }
