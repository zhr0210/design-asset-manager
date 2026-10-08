// Actual FocusView + FocusCanvas + NotebookSession with deferred synthetic reads.
// No Host, database, source media, account, model or provider. This is not formal CU.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { createHash } from 'node:crypto'
import { build } from 'esbuild'
import { chromium } from 'playwright'

const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'dam-notebook-reconcile-view-')))
assert.equal(path.dirname(root).toLowerCase(), (await fs.realpath(os.tmpdir())).toLowerCase())
const sourceRoot = process.env.DAM_NOTEBOOK_RECONCILE_VIEW_SOURCE_ROOT
const evidenceRoot = process.env.DAM_NOTEBOOK_RECONCILE_VIEW_EVIDENCE_ROOT
if (evidenceRoot) await fs.mkdir(evidenceRoot, { recursive: true })
const sha256 = value => createHash('sha256').update(value).digest('hex')
const sourcePaths = [
  'src/renderer/components/gallery/FocusView.tsx',
  'src/renderer/components/gallery/FocusCanvas.tsx',
  'src/renderer/components/gallery/focus-notes.ts',
  'src/renderer/components/library/canvas/notebook-session.ts',
  'src/renderer/workspace-drafts.ts',
  'src/renderer/workspace-client.ts',
  'src/shared/contracts/asset-notebook.contract.ts'
]
const sources = new Map(), sourceHashes = []
console.log('Actual notebook caller source identity: ' + (sourceRoot ? 'frozen-source-root ' + sourceRoot : 'working-tree snapshot'))
for (const sourcePath of sourcePaths) {
  const contents = await fs.readFile(sourceRoot ? path.join(sourceRoot, sourcePath) : sourcePath, 'utf8')
  sources.set(path.resolve(sourcePath).toLowerCase(), contents)
  const hash = sha256(contents); sourceHashes.push({ file: sourcePath, sha256: hash })
  console.log(sourcePath + ' sha256=' + hash)
}
console.log('Frozen caller identity sha256=' + sha256(JSON.stringify(sourceHashes)))
console.log('Regression test source sha256=' + sha256(await fs.readFile(new URL(import.meta.url))))
await build({ absWorkingDir: process.cwd(), bundle: true, platform: 'browser', format: 'iife', outfile: path.join(root, 'fixture.js'), logLevel: 'silent', plugins: [{ name: 'actual-notebook-caller-snapshot', setup(builder) {
  builder.onLoad({ filter: /\.tsx?$/ }, args => {
    const contents = sources.get(path.resolve(args.path).toLowerCase())
    if (contents !== undefined) return { contents, loader: args.path.endsWith('.tsx') ? 'tsx' : 'ts', resolveDir: path.dirname(args.path) }
  })
} }], stdin: { resolveDir: process.cwd(), loader: 'jsx', contents: `
 import React,{useState} from 'react';import {createRoot} from 'react-dom/client';
 import {FocusView} from './src/renderer/components/gallery/FocusView';
 import {createNotebookSession} from './src/renderer/components/library/canvas/notebook-session';
 import {installWorkspaceClient} from './src/renderer/workspace-client';
 import {currentWorkspaceDraft,flushWorkspaceDrafts} from './src/renderer/workspace-drafts';
 import {WorkspaceConnectionError} from './src/shared/client/workspace-connection-error';
 import './src/renderer/components/gallery/tokens.css';import './src/renderer/components/gallery/gallery.css';
 const clone=value=>structuredClone(value),scope={libraryIdentity:'library:fixture',generation:'generation:fixture'},writes=[],reads=[],draftPuts=[];
 const book=(id,name)=>({pages:[{id,name,elements:[]}],active:id});
 const make=(id,name)=>({book:book(id,name),revision:1,sessionToken:'session:fixture',sourceRef:'preview:fixture',requiresUpgrade:false});
 const saved={'asset:one':make('page:one','Original first page'),'asset:two':make('page:two','Original second page')};
 let holdNextRead=false,pendingRead=null,viewId='asset:one',loseNextReply=false;
 const api={notebookRead:async input=>{reads.push(clone(input));const snapshot=clone(saved[input.assetId]);if(holdNextRead){holdNextRead=false;return new Promise(resolve=>{pendingRead={assetId:input.assetId,snapshot,resolve}})}return{success:true,value:snapshot}},
  notebookSave:async input=>{writes.push(clone(input));const current=saved[input.assetId];if(input.expectedRevision!==current.revision)return{success:false,code:'notebook-conflict',error:'SYNTHETIC_NOTEBOOK_CONFLICT'};
   saved[input.assetId]={...current,revision:current.revision+1,book:clone(input.book)};
   if(loseNextReply){loseNextReply=false;throw new WorkspaceConnectionError('未收到完整回执。请检查保存结果，勿重复提交。')}
   return{success:true,value:clone(saved[input.assetId])}}};
 installWorkspaceClient({library:api,transitions:{ready:async()=>{}},drafts:{put:async input=>{draftPuts.push(clone(input));return input},remove:async()=>({success:true})}});
 const session=createNotebookSession(scope,()=>api),src='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="480" height="560"><rect width="480" height="560" fill="#eeeeee"/></svg>');
 const items=[{id:'asset:one',title:'Synthetic first notebook',src,kind:'image'},{id:'asset:two',title:'Synthetic second notebook',src,kind:'image'}];
 function App(){const [active,setActive]=useState('asset:one');viewId=active;return <div className="gallery-design minimal-prototype"><button onClick={()=>setActive('asset:one')}>重新打开第一张</button><button onClick={()=>setActive('asset:two')}>重新打开第二张</button>{active&&<FocusView asset={items.find(value=>value.id===active)} items={items} change={setActive} close={()=>setActive(null)} notebook={session} video={null} details={<p>Controlled synthetic notebook</p>}/>}</div>}
 window.fixture={inspect:()=>clone({saved,writes,reads,draftPuts,books:session.load(),dirty:session.dirty(),transient:session.hasTransient(),viewId,pendingRead:Boolean(pendingRead),workspaceDraft:currentWorkspaceDraft({...scope,kind:'notebook',entityId:'asset:one'})??null}),
  flush:()=>flushWorkspaceDrafts(),peer:()=>{saved['asset:one']={...saved['asset:one'],revision:2,book:book('page:one','Peer committed first page')}},holdRead:()=>{holdNextRead=true},loseReply:()=>{loseNextReply=true},
  releaseRead:()=>{if(!pendingRead)throw Error('NO_PENDING_NOTEBOOK_READ');const operation=pendingRead;pendingRead=null;operation.resolve({success:true,value:clone(operation.snapshot)})}};
 createRoot(document.getElementById('root')).render(<App/>);
` } })
console.log('Actual notebook fixture bundle sha256=' + sha256(await fs.readFile(path.join(root, 'fixture.js'))))
await fs.writeFile(path.join(root, 'index.html'), '<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src \'self\'; script-src \'self\'; style-src \'self\' \'unsafe-inline\'; img-src \'self\' data:; connect-src \'none\'"><link rel="stylesheet" href="fixture.css"><div id="root"></div><script src="fixture.js"></script>')
const browser = await chromium.launch({ headless: true })
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } }), errors = [], external = []
  await context.route('**/*', route => { if (route.request().url().startsWith('file:')) return route.continue(); external.push(route.request().url()); return route.abort() })
  const withNotebook = async run => {
    const page = await context.newPage(); page.setDefaultTimeout(3500); page.on('pageerror', error => errors.push(error.message))
    try {
      await page.goto(pathToFileURL(path.join(root, 'index.html')).href)
      const name = () => page.locator('input[aria-label="笔记名称"]')
      const annotation = () => page.getByRole('textbox', { name: '标注文字内容', exact: true })
      const reconcile = () => page.getByRole('button', { name: '保留草稿并载入最新笔记', exact: true })
      const inspect = () => page.evaluate(() => window.fixture.inspect())
      const flush = () => page.evaluate(() => window.fixture.flush())
      const screenshot = async label => { if (evidenceRoot) await page.screenshot({ path: path.join(evidenceRoot, label + '.png') }) }
      const realClick = async (locator, position) => { const box = await locator.boundingBox(); assert.ok(box, 'the actual blocked control must have a visible bounding box'); await page.mouse.click(box.x + (position?.x ?? box.width / 2), box.y + (position?.y ?? box.height / 2)) }
      await name().waitFor(); await name().fill('Local conflicted first page')
      await page.evaluate(() => window.fixture.peer()); await page.getByRole('button', { name: '保存笔记', exact: true }).click(); await reconcile().waitFor()
      assert.equal((await inspect()).writes[0].expectedRevision, 1)
      const startAnnotation = async kind => { await page.getByRole('button', { name: kind === 'sticky' ? '便签' : '文字', exact: true }).click(); await page.getByLabel('笔记绘图层', { exact: true }).click({ position: { x: 90, y: 90 } }); await annotation().waitFor() }
      const release = async () => { await page.evaluate(() => window.fixture.releaseRead()); await page.waitForFunction(() => !window.fixture.inspect().pendingRead); await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))) }
      const assertPreserved = async text => {
        const state = await inspect()
        const inBook = state.books['asset:one'].pages.some(page => page.elements.some(element => element.text === text))
        if (await annotation().count()) assert.equal(await annotation().inputValue(), text, 'the accepted unfinished annotation input must survive reconciliation')
        else assert.equal(inBook, true, 'reconciliation must preserve accepted unfinished annotation input or block the operation')
      }
      await run({ page, name, annotation, reconcile, inspect, flush, screenshot, startAnnotation, release, assertPreserved, realClick })
    } finally { await page.close() }
  }

  for (const kind of ['text', 'sticky']) await test('reconciliation blocks or preserves an already unfinished ' + kind + ' annotation', async () => withNotebook(async ({ annotation, reconcile, inspect, screenshot, startAnnotation, release, assertPreserved, page, realClick }) => {
    const text = 'Unfinished ' + kind + ' before review'
    await startAnnotation(kind); await annotation().fill(text); await screenshot('active-' + kind + '-before')
    await page.evaluate(() => window.fixture.holdRead()); if (await reconcile().isEnabled()) await reconcile().click(); else await realClick(reconcile())
    if ((await inspect()).pendingRead) await release()
    await screenshot('active-' + kind + '-after'); await assertPreserved(text)
  }))

  for (const kind of ['text', 'sticky']) await test('a deferred reconciliation blocks new ' + kind + ' annotation input or preserves accepted input', async () => withNotebook(async ({ page, annotation, reconcile, inspect, screenshot, startAnnotation, release, assertPreserved, realClick }) => {
    const text = 'Unfinished ' + kind + ' during pending review'
    await page.evaluate(() => window.fixture.holdRead()); await reconcile().click(); await page.waitForFunction(() => window.fixture.inspect().pendingRead)
    const tool = page.locator('.annotation-tools button[aria-label="' + (kind === 'sticky' ? '便签' : '文字') + '"]')
    let accepted = false
    if (await tool.count() && await tool.evaluate(element => Boolean(element.closest('[inert]')))) {
      await realClick(tool); await realClick(page.locator('svg[aria-label="笔记绘图层"]'), { x: 90, y: 90 })
      assert.equal(await annotation().count(), 0, 'real clicks on the inert tool and canvas must not accept an unfinished annotation')
      assert.equal((await inspect()).transient, false)
    } else if (await tool.count() && await tool.isEnabled()) {
      await startAnnotation(kind); await annotation().fill(text); accepted = true
    } else if (await tool.count()) {
      await realClick(tool); assert.equal(await annotation().count(), 0, 'a disabled tool must not accept annotation input')
    }
    await screenshot('pending-' + kind + '-before'); await release(); await screenshot('pending-' + kind + '-after')
    if (accepted) await assertPreserved(text)
    else assert.equal((await inspect()).books['asset:one'].pages[0].name, 'Peer committed first page', 'blocked input must still allow the reviewed notebook to appear')
  }))

  await test('committed input typed during reconciliation keeps the reviewed baseline and checkpoints the visible pages', async () => withNotebook(async ({ page, name, reconcile, inspect, flush, release, realClick }) => {
    await page.evaluate(() => window.fixture.holdRead()); await reconcile().click(); await page.waitForFunction(() => window.fixture.inspect().pendingRead)
    if (await name().evaluate(element => Boolean(element.closest('[inert]')))) {
      const before = await name().inputValue(); await realClick(name()); await page.keyboard.type('Attempted blocked input')
      assert.equal(await name().inputValue(), before, 'real keyboard input cannot change an inert page name')
      assert.equal((await inspect()).books['asset:one'].pages[0].name, before)
    } else if (await name().isEnabled()) await name().fill('Latest pending page input')
    const expectedName = await name().inputValue(); await release(); await flush()
    const state = await inspect(),book = state.books['asset:one']
    assert.equal(book.pages[0].name, 'Peer committed first page'); assert.equal(book.pages.some(page => page.name.startsWith(expectedName)), true)
    assert.deepEqual(state.workspaceDraft.value, book); assert.equal(state.workspaceDraft.base.revision, 2)
    await page.getByRole('button', { name: '保存笔记', exact: true }).click()
    await page.waitForFunction(() => window.fixture.inspect().writes.length === 2); const saved = await inspect()
    assert.equal(saved.writes[1].expectedRevision, 2); assert.deepEqual(saved.saved['asset:one'].book, book)
  }))

  await test('a pending old-asset reconciliation cannot replace current second-asset input after navigation', async () => withNotebook(async ({ page, name, reconcile, inspect, release, realClick }) => {
    await page.evaluate(() => window.fixture.holdRead()); await reconcile().click(); await page.waitForFunction(() => window.fixture.inspect().pendingRead)
    const next = page.getByRole('button', { name: '下一张', exact: true })
    if (await next.isEnabled()) await next.click(); else { await realClick(next); assert.equal((await inspect()).viewId, 'asset:one') }
    if ((await inspect()).viewId === 'asset:two') {
      await name().waitFor(); await name().fill('Second asset input retained')
      await release(); assert.equal(await name().inputValue(), 'Second asset input retained')
      assert.equal((await inspect()).books['asset:two'].pages[0].name, 'Second asset input retained')
    } else {
      await release(); await next.click(); await name().waitFor(); assert.equal(await name().inputValue(), 'Original second page')
    }
  }))
  await test('closing and reopening during reconciliation cannot let a new view revert the reviewed first-asset pages', async () => withNotebook(async ({ page, name, reconcile, inspect, release, screenshot, realClick }) => {
    await page.evaluate(() => window.fixture.holdRead()); await reconcile().click(); await page.waitForFunction(() => window.fixture.inspect().pendingRead)
    const close = () => page.getByRole('button', { name: '关闭专注模式', exact: true })
    if (await close().isEnabled()) await close().click(); else { await realClick(close()); assert.equal((await inspect()).viewId, 'asset:one') }
    if ((await inspect()).viewId === null) {
      await page.getByRole('button', { name: '重新打开第二张', exact: true }).click(); await name().waitFor()
      assert.equal(await name().inputValue(), 'Original second page'); await release()
    } else {
      await release(); await close().click(); await page.waitForFunction(() => window.fixture.inspect().viewId === null)
      await page.getByRole('button', { name: '重新打开第二张', exact: true }).click(); await name().waitFor()
    }
    const reviewed = (await inspect()).books['asset:one']
    assert.equal(reviewed.pages[0].name, 'Peer committed first page'); assert.equal(reviewed.pages.length, 2)
    await screenshot('close-reopen-before-second-edit'); await name().fill('New view second asset input')
    await screenshot('close-reopen-after-second-edit'); const state = await inspect()
    assert.equal(state.books['asset:two'].pages[0].name, 'New view second asset input')
    assert.deepEqual(state.books['asset:one'], reviewed, 'editing the newly opened view must not replace reviewed first-asset pages with its stale notebook map')
  }))
  await test('a committed notebook with a lost receipt preserves its pages and never encourages blind retry', async () => withNotebook(async ({ page, name, reconcile, inspect }) => {
    await reconcile().click();await page.getByText('已载入最新版本，改动保留为冲突草稿页。请核对后保存。',{exact:true}).waitFor()
    await name().fill('Notebook committed before lost response');await page.evaluate(()=>window.fixture.loseReply())
    await page.getByRole('button',{name:'保存笔记',exact:true}).click();await page.getByRole('status').filter({hasText:'未收到完整回执'}).waitFor()
    const notice=await page.getByRole('status').filter({hasText:'未收到完整回执'}).innerText()
    assert.match(notice,/检查保存结果，勿重复提交/);assert.equal(notice.includes('可重试'),false)
    assert.equal(await name().inputValue(),'Notebook committed before lost response');const state=await inspect()
    assert.equal(state.writes.length,2);assert.equal(state.saved['asset:one'].revision,3);assert.deepEqual(state.saved['asset:one'].book,state.books['asset:one']);assert.equal(state.dirty,true)
  }))
  assert.deepEqual(errors, []); assert.deepEqual(external, []); await context.close()
} finally { await browser.close(); await fs.rm(root, { recursive: true, force: true }) }
