// Actual Backend settings + Pi connections + TaskModelSettings in Chromium.
// Synthetic WorkspaceClient only: no Host, provider probe, login, or real data.
// This is Renderer regression evidence, not formal product Computer Use.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { build } from 'esbuild'
import { chromium } from 'playwright'

const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'dam-backend-conflict-view-')))
assert.equal(path.dirname(root).toLowerCase(), (await fs.realpath(os.tmpdir())).toLowerCase())
// A fixed Git tree can supply complete actual caller blobs for historical red.
// The optional override never writes source, index, or an exported candidate.
const sourceTree = process.env.DAM_BACKEND_REGRESSION_SOURCE_TREE
const sourceBlobs = process.env.DAM_BACKEND_REGRESSION_SOURCE_BLOBS ? JSON.parse(process.env.DAM_BACKEND_REGRESSION_SOURCE_BLOBS) : null
assert.ok(!(sourceTree && sourceBlobs), 'use one complete-source override mechanism')
const sourcePaths = [
  'src/renderer/components/settings/AiBackendSettingsPanel.tsx',
  'src/renderer/components/asset/PiConnectionsPanel.tsx',
  'src/renderer/components/asset/TaskModelSettings.tsx'
]
const sources = new Map()
const sha256 = value => createHash('sha256').update(value).digest('hex')
console.log('Actual caller source identity: ' + (sourceTree ? 'git-tree ' + sourceTree + ' (shared imports from working tree)' : sourceBlobs ? 'fixed git blobs (shared imports from working tree)' : 'working-tree snapshot'))
for (const sourcePath of sourcePaths) {
  const blob = sourceBlobs?.[sourcePath]
  if (sourceBlobs) assert.match(blob, /^[0-9a-f]{40}$/)
  const contents = sourceTree || blob ? execFileSync('git', ['show', blob ?? sourceTree + ':' + sourcePath], { encoding: 'utf8' }) : await fs.readFile(sourcePath, 'utf8')
  sources.set(path.resolve(sourcePath).toLowerCase(), contents)
  console.log(sourcePath + (blob ? ' git-blob=' + blob : '') + ' sha256=' + sha256(contents))
}
await build({ absWorkingDir: process.cwd(), bundle: true, platform: 'browser', format: 'iife', outfile: path.join(root, 'fixture.js'), logLevel: 'silent', plugins: [{ name: 'complete-actual-caller-snapshot', setup(builder) {
  builder.onLoad({ filter: /(?:AiBackendSettingsPanel|PiConnectionsPanel|TaskModelSettings)\.tsx$/ }, args => {
    const contents = sources.get(path.resolve(args.path).toLowerCase())
    if (contents === undefined) throw Error('CALLER_SNAPSHOT_MISSING')
    return { contents, loader: 'tsx', resolveDir: path.dirname(args.path) }
  })
} }], stdin: { resolveDir: process.cwd(), loader: 'jsx', contents: `
 import React from 'react';import {createRoot} from 'react-dom/client';
 import {installWorkspaceClient} from './src/renderer/workspace-client';
 import {WorkspaceConnectionError} from './src/shared/client/workspace-connection-error';
 import {hasTransientWorkspaceEdits} from './src/renderer/workspace-edit-guards';
 import './src/renderer/components/gallery/tokens.css';
 const clone=value=>structuredClone(value),writes=[],reads=[],listeners=new Set(),reconcilers=new Set(),forbidden=[];
 const canonical=value=>JSON.stringify(value,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.keys(item).sort().map(key=>[key,item[key]])):item);
 const original=[{id:'backend:one',name:'Original service',type:'openai-compatible',enabled:false,baseUrl:'http://127.0.0.1:1234/v1',defaultModel:'original-model',timeoutMs:120000,priority:10,
  transport:'pi',providerKind:'openai-compatible',authMode:'none',processingLocation:'local-service',notes:'Original public note',
  capabilities:{chat:true,vision:true,embeddings:false,jsonOutput:true,modelList:true,modelManagement:false},
  credentialRef:'SYNTHETIC_HIDDEN_REFERENCE',credentialRevision:83,apiKey:'SYNTHETIC_LEGACY_VALUE',
  modelValidation:{model:'original-model',bindingSha256:'synthetic-binding',vision:true,jsonOutput:true,testedAt:'synthetic-test-time',generatedInput:true}},
 {id:'backend:two',name:'Other service',type:'openai-compatible',enabled:false,baseUrl:'http://127.0.0.1:1235/v1',defaultModel:'other-model',timeoutMs:30000,priority:20,
  transport:'pi',providerKind:'openai-compatible',authMode:'api-key',processingLocation:'local-service',
  capabilities:{chat:true,vision:false,embeddings:false,jsonOutput:false,modelList:true,modelManagement:false}}];
 const originalTasks={analyze:{backendId:'backend:one',model:'original-model'}};
 let saved=clone(original),failNext=false,loseNextReply=false,settingsDefaults,taskChoices=clone(originalTasks),taskWrites=[],holdTask=false,pendingTask=false,releaseTask=null,holdRead=false,pendingRead=false,readWaiters=[],holdSettingsRead=false,pendingSettingsRead=false,settingsWaiters=[],settingsReads=0,holdStatusRead=false,pendingStatusRead=false,releaseStatusRead=null,reconcileResult='none';
 const deny=name=>async()=>{forbidden.push(name);throw Error('SYNTHETIC_ACTION_FORBIDDEN')};
 const notify=()=>{for(const callback of listeners)callback({source:'synthetic-peer'})};
 installWorkspaceClient({
  aiBackendList:async()=>{reads.push(saved.map(item=>item.id));const snapshot=clone(saved);if(holdRead){holdRead=false;pendingRead=true;await new Promise(resolve=>readWaiters.push(resolve));pendingRead=readWaiters.length>0}return snapshot},
  aiBackendSave:async(config,expected)=>{
   writes.push({config:clone(config),expected:clone(expected)});
   const current=saved.find(item=>item.id===config.id)??null;
   if(expected===undefined||canonical(current)!==canonical(expected))throw Error('SYNTHETIC_BACKEND_CONFLICT');
   if(failNext){failNext=false;throw Error('SYNTHETIC_SAVE_FAILED')}
   const next=clone(config);delete next.apiKey;delete next.credentialRef;delete next.credentialRevision;delete next.modelValidation;
   if(current){for(const key of ['apiKey','credentialRef','credentialRevision'])if(current[key]!==undefined)next[key]=current[key]}
   saved=current?saved.map(item=>item.id===config.id?next:item):[...saved,next];
   if(loseNextReply){loseNextReply=false;throw new WorkspaceConnectionError('连接中断，操作结果尚未确认。请重新连接并检查保存结果，勿重复提交。')}
   return clone(saved);
  },
  aiBackendDelete:deny('delete'),aiBackendHealthCheck:deny('health'),aiBackendListModels:deny('model-list'),
  settingsLoad:async()=>{settingsReads++;const snapshot={...clone(settingsDefaults),aiBackends:clone(saved),aiTaskModels:clone(taskChoices)};if(holdSettingsRead){holdSettingsRead=false;pendingSettingsRead=true;await new Promise(resolve=>settingsWaiters.push(resolve));pendingSettingsRead=settingsWaiters.length>0}return snapshot},
  settingsSave:async(patch,expected)=>{
   if(Object.keys(patch).length!==1||!Object.hasOwn(patch,'aiTaskModels'))return deny('settings-save')();
   taskWrites.push({patch:clone(patch),expected:clone(expected)});
   if(canonical(taskChoices)!==canonical(expected?.aiTaskModels))throw Error('SYNTHETIC_TASK_CONFLICT');
   taskChoices=clone(patch.aiTaskModels);
   if(loseNextReply){loseNextReply=false;throw new WorkspaceConnectionError('未收到完整回执。请检查保存结果，勿重复提交。')}
   if(holdTask){pendingTask=true;await new Promise(resolve=>releaseTask=resolve);pendingTask=false}
   return {...clone(settingsDefaults),aiBackends:clone(saved),aiTaskModels:clone(taskChoices)};
  },
  onSettingsChanged:callback=>{listeners.add(callback);return()=>listeners.delete(callback)},
  onReconcile:callback=>{reconcilers.add(callback);return()=>reconcilers.delete(callback)},
  aiConnections:{credentialStatus:async()=>{const snapshot={configured:false,legacyPresent:false,storageAvailable:true,revision:0};if(holdStatusRead){holdStatusRead=false;pendingStatusRead=true;await new Promise(resolve=>releaseStatusRead=resolve);pendingStatusRead=false}return snapshot},currentLogin:async()=>null,
   discardValidation:deny('discard-validation'),prepareValidation:deny('prepare-validation'),confirmValidation:deny('confirm-validation'),
   setApiKey:deny('set-api-key'),migrateCredential:deny('migrate-credential'),clearCredential:deny('clear-credential'),
   login:deny('login'),loginStatus:deny('login-status'),cancelLogin:deny('cancel-login'),answerLogin:deny('answer-login'),openAuthUrl:deny('open-auth-url'),authDiagnostic:deny('auth-diagnostic')}
 });
 Promise.all([import('./src/renderer/components/settings/AiBackendSettingsPanel'),import('./src/renderer/components/asset/PiConnectionsPanel'),import('./src/renderer/components/asset/TaskModelSettings'),import('./src/renderer/stores/settings.store')]).then(([generic,pi,tasks,store])=>{
  const Backend=generic.default,Pi=pi.default,Tasks=tasks.default,settingsStore=store.useSettingsStore,app=createRoot(document.getElementById('root'));
  settingsDefaults=clone(settingsStore.getState().settings);
  window.fixture={inspect:()=>clone({saved,writes,reads,forbidden,taskChoices,taskWrites,pendingTask,pendingRead,pendingSettingsRead,pendingStatusRead,pendingReadCount:readWaiters.length,pendingSettingsCount:settingsWaiters.length,settingsReads,reconcileResult,editing:hasTransientWorkspaceEdits()}),
   peer:(patch,emit=true)=>{saved=saved.map(item=>item.id==='backend:one'?{...item,...clone(patch)}:item);if(emit)notify()},
   deletePeer:(emit=true)=>{saved=saved.filter(item=>item.id!=='backend:one');if(emit)notify()},fail:()=>{failNext=true},loseReply:()=>{loseNextReply=true},
   peerTasks:(next,emit=true)=>{taskChoices=clone(next);if(emit)notify()},holdTask:()=>{holdTask=true},releaseTask:()=>{holdTask=false;releaseTask?.();releaseTask=null},
   holdRead:()=>{holdRead=true},releaseRead:()=>{readWaiters.shift()?.()},holdSettingsRead:()=>{holdSettingsRead=true},releaseSettingsRead:()=>{settingsWaiters.shift()?.()},holdStatusRead:()=>{holdStatusRead=true},releaseStatusRead:()=>{releaseStatusRead?.();releaseStatusRead=null},
   startReconcile:()=>{reconcileResult='pending';void Promise.all([...reconcilers].map(callback=>Promise.resolve().then(()=>callback()))).then(()=>{reconcileResult='resolved'},()=>{reconcileResult='rejected'})},
   reset:async(kind,deferInitialRead=false,initialConnectionRef=undefined)=>{app.render(null);await new Promise(resolve=>setTimeout(resolve,0));saved=clone(original);if(kind==='tasks')saved=saved.map(item=>({...item,enabled:true}));writes.length=0;reads.length=0;failNext=false;loseNextReply=false;taskChoices=clone(originalTasks);taskWrites=[];holdTask=false;pendingTask=false;releaseTask=null;holdRead=deferInitialRead;pendingRead=false;readWaiters=[];holdSettingsRead=false;pendingSettingsRead=false;settingsWaiters=[];settingsReads=0;holdStatusRead=false;pendingStatusRead=false;releaseStatusRead=null;reconcileResult='none';settingsStore.setState({settings:clone(settingsDefaults)});app.render(kind==='backend'?<Backend/>:kind==='pi'?<Pi initialConnectionRef={initialConnectionRef}/>:<Tasks/>)}
  };
 });
` } })
console.log('Actual Renderer fixture bundle sha256=' + sha256(await fs.readFile(path.join(root, 'fixture.js'))))
await fs.writeFile(path.join(root, 'index.html'), '<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src \'self\'; script-src \'self\'; style-src \'self\' \'unsafe-inline\'; connect-src \'none\'"><link rel="stylesheet" href="fixture.css"><div id="root"></div><script src="fixture.js"></script>')
const browser = await chromium.launch({ headless: true })
try {
  const context = await browser.newContext({ viewport: { width: 1100, height: 1000 } })
  const page = await context.newPage(), errors = [], external = []
  page.setDefaultTimeout(3500)
  page.on('pageerror', error => errors.push(error.message))
  await context.route('**/*', route => { if (route.request().url().startsWith('file:')) return route.continue(); external.push(route.request().url()); return route.abort() })
  await page.goto(pathToFileURL(path.join(root, 'index.html')).href)
  await page.waitForFunction(() => Boolean(window.fixture))
  const inspect = () => page.evaluate(() => window.fixture.inspect())
  const panels = [
    { kind: 'backend', section: '模型服务配置', name: '服务名称', url: 'API 地址', model: '默认模型', save: '保存服务', refresh: '重新读取已保存的服务配置', cancel: '撤销更改', create: ['添加服务'] },
    { kind: 'pi', section: '连接与账号', name: '连接名称', url: '服务地址', model: '模型名称', save: '保存连接', refresh: '刷新连接', cancel: '取消修改', create: ['连接本机服务', '使用模型 API', '使用 ChatGPT 账号'] }
  ]
  const region = panel => page.getByRole('region', { name: panel.section, exact: true })
  const field = (panel, key) => region(panel).getByRole(key === 'model' ? 'combobox' : 'textbox', { name: panel[key], exact: true })
  const button = (panel, name) => region(panel).getByRole('button', { name, exact: true })
  const save = panel => button(panel, panel.save)
  const adopt = panel => button(panel, '核对后采用当前服务配置为基准')
  const reset = async panel => {
    await page.evaluate(kind => window.fixture.reset(kind), panel.kind)
    await region(panel).getByRole('button', { name: /^Original service/ }).waitFor()
    if (panel.kind === 'pi') await region(panel).getByRole('button', { name: /^Original service/ }).click()
    await field(panel, 'name').waitFor()
    await page.waitForFunction(() => !window.fixture.inspect().editing)
    assert.equal(await field(panel, 'name').inputValue(), 'Original service')
  }
  const edit = async (panel, name = 'My retained service') => {
    await field(panel, 'name').fill(name); await field(panel, 'url').fill('http://127.0.0.1:4567/v1'); await field(panel, 'model').fill('my-local-model')
    await page.waitForFunction(() => window.fixture.inspect().editing)
  }
  const retained = async (panel, name = 'My retained service') => {
    assert.equal(await field(panel, 'name').inputValue(), name); assert.equal(await field(panel, 'url').inputValue(), 'http://127.0.0.1:4567/v1'); assert.equal(await field(panel, 'model').inputValue(), 'my-local-model')
  }
  const compare = async (panel, peerName) => {
    await region(panel).getByText('核对当前已保存的服务配置', { exact: true }).click()
    await region(panel).getByText(peerName, { exact: false }).filter({ hasNot: page.locator('button') }).last().waitFor()
    const text = await region(panel).innerText()
    assert.ok(text.includes('http://127.0.0.1:8901/v1')); assert.ok(text.includes('peer-model')); assert.ok(text.includes('Peer public note'))
    assert.equal(text.includes('SYNTHETIC_HIDDEN_REFERENCE'), false); assert.equal(text.includes('SYNTHETIC_LEGACY_VALUE'), false)
  }
  const peerPatch = name => ({ name, baseUrl: 'http://127.0.0.1:8901/v1', defaultModel: 'peer-model', notes: 'Peer public note', timeoutMs: 90000, priority: 35, enabled: true })
  const awaitReadsAfter = async count => page.waitForFunction(count => window.fixture.inspect().reads.length > count, count)
  const attemptUnreviewedSave = async panel => { if (await save(panel).isEnabled()) await save(panel).click() }

  for (const panel of panels) {
    await test(panel.kind + ': missed peer event rejects stale CAS; reread and explicit adoption preserve editable input', async () => {
      await reset(panel); await edit(panel)
      await page.evaluate(patch => window.fixture.peer(patch, false), peerPatch('Peer service after missed event'))
      await save(panel).click(); await region(panel).getByRole('alert').waitFor(); await retained(panel)
      const rejected = await inspect(); assert.equal(rejected.writes.length, 1); assert.equal(rejected.writes[0].expected.name, 'Original service')
      const count = rejected.reads.length; await button(panel, panel.refresh).click(); await awaitReadsAfter(count); await retained(panel)
      await compare(panel, 'Peer service after missed event'); await attemptUnreviewedSave(panel)
      assert.equal((await inspect()).writes.length, 1, 'current peer configuration needs explicit adoption before another write')
      await adopt(panel).click(); await retained(panel); await save(panel).click()
      await page.waitForFunction(() => window.fixture.inspect().saved.find(item => item.id === 'backend:one')?.name === 'My retained service')
      const final = await inspect(); assert.equal(final.writes.length, 2); assert.equal(final.writes[1].expected.name, 'Peer service after missed event')
      assert.equal(final.writes[1].expected.baseUrl, 'http://127.0.0.1:8901/v1'); assert.equal(final.writes[1].expected.credentialRevision, 83)
      assert.equal(final.saved.find(item => item.id === 'backend:one').credentialRef, 'SYNTHETIC_HIDDEN_REFERENCE'); assert.equal(final.editing, false)
    })

    await test(panel.kind + ': a second peer configuration invalidates the adopted baseline', async () => {
      await reset(panel); await edit(panel, 'Input across two peers')
      let count = (await inspect()).reads.length; await page.evaluate(patch => window.fixture.peer(patch), peerPatch('First peer service')); await awaitReadsAfter(count)
      await compare(panel, 'First peer service'); await adopt(panel).click(); await retained(panel, 'Input across two peers')
      count = (await inspect()).reads.length; await page.evaluate(patch => window.fixture.peer(patch), peerPatch('Second peer service')); await awaitReadsAfter(count)
      await region(panel).getByText('核对当前已保存的服务配置', { exact: true }).waitFor()
      await attemptUnreviewedSave(panel); assert.deepEqual((await inspect()).writes, [], 'previous adoption cannot authorize the later peer configuration')
      await retained(panel, 'Input across two peers'); await compare(panel, 'Second peer service'); await adopt(panel).click(); await save(panel).click()
      await page.waitForFunction(() => window.fixture.inspect().writes.length === 1 && !window.fixture.inspect().editing)
      const state = await inspect(); assert.equal(state.writes[0].expected.name, 'Second peer service'); assert.equal(state.saved.find(item => item.id === 'backend:one').name, 'Input across two peers')
    })

    await test(panel.kind + ': peer deletion never revives its ID; save as new strips secure and validation metadata', async () => {
      await reset(panel); await edit(panel, 'Input after peer deletion'); const count = (await inspect()).reads.length
      await page.evaluate(() => window.fixture.deletePeer()); await awaitReadsAfter(count)
      await region(panel).getByText('此服务配置已在另一界面移除', { exact: false }).waitFor(); await attemptUnreviewedSave(panel)
      assert.deepEqual((await inspect()).writes, []); await retained(panel, 'Input after peer deletion')
      await button(panel, '将输入另存为新服务').click(); await retained(panel, 'Input after peer deletion'); await save(panel).click()
      await page.waitForFunction(() => window.fixture.inspect().writes.length === 1 && !window.fixture.inspect().editing)
      const state = await inspect(), write = state.writes[0]
      assert.notEqual(write.config.id, 'backend:one'); assert.match(write.config.id, /^(backend|pi)-[0-9a-f]{8}-[0-9a-f-]{27}$/)
      assert.equal(write.expected, null); assert.equal(write.config.name, 'Input after peer deletion'); assert.equal(write.config.baseUrl, 'http://127.0.0.1:4567/v1'); assert.equal(write.config.defaultModel, 'my-local-model')
      for (const key of ['apiKey', 'credentialRef', 'credentialRevision', 'modelValidation']) assert.equal(Object.hasOwn(write.config, key), false, 'new service must not carry ' + key)
      assert.equal(state.saved.some(item => item.id === 'backend:one'), false); assert.equal(state.saved.filter(item => item.name === 'Input after peer deletion').length, 1)
    })

    await test(panel.kind + ': dirty navigation and creation cannot discard input; explicit cancel restores the latest saved configuration', async () => {
      await reset(panel); await edit(panel); const count = (await inspect()).reads.length
      await page.evaluate(patch => window.fixture.peer(patch), peerPatch('Latest saved service')); await awaitReadsAfter(count)
      assert.equal(await region(panel).getByRole('button', { name: /^Latest saved service/ }).isDisabled(), true, 'reselecting the same saved service must not discard dirty input')
      assert.equal(await region(panel).getByRole('button', { name: /^Other service/ }).isDisabled(), true)
      for (const name of panel.create) assert.equal(await button(panel, name).isDisabled(), true)
      await retained(panel); await button(panel, panel.cancel).click(); await page.waitForFunction(() => !window.fixture.inspect().editing)
      assert.equal(await field(panel, 'name').inputValue(), 'Latest saved service'); assert.equal(await field(panel, 'url').inputValue(), 'http://127.0.0.1:8901/v1'); assert.deepEqual((await inspect()).writes, [])
    })

    await test(panel.kind + ': ordinary save failure and reread preserve input; retry keeps the unchanged CAS baseline', async () => {
      await reset(panel); await edit(panel, 'Input survives ordinary failure'); await page.evaluate(() => window.fixture.fail())
      await save(panel).click(); await region(panel).getByRole('alert').waitFor(); await retained(panel, 'Input survives ordinary failure')
      const count = (await inspect()).reads.length; await button(panel, panel.refresh).click(); await awaitReadsAfter(count); await retained(panel, 'Input survives ordinary failure')
      await save(panel).click(); await page.waitForFunction(() => window.fixture.inspect().writes.length === 2 && !window.fixture.inspect().editing)
      const state = await inspect(); assert.deepEqual(state.writes.map(write => write.expected.name), ['Original service', 'Original service']); assert.equal(state.saved.find(item => item.id === 'backend:one').name, 'Input survives ordinary failure')
    })

    await test(panel.kind + ': a committed save with a lost receipt is unknown, keeps input and is checked without resubmitting', async () => {
      await reset(panel); await edit(panel, 'Committed before lost response'); await page.evaluate(() => window.fixture.loseReply())
      await save(panel).click(); await region(panel).getByRole('alert').waitFor(); await retained(panel, 'Committed before lost response')
      const notice = await region(panel).getByRole('alert').innerText()
      assert.match(notice, /操作结果尚未确认/); assert.match(notice, /检查保存结果，勿重复提交/)
      assert.equal(notice.includes('操作未完成'), false); assert.equal((await inspect()).writes.length, 1)
      const reads = (await inspect()).reads.length; await button(panel, panel.refresh).click(); await awaitReadsAfter(reads)
      await retained(panel, 'Committed before lost response')
      assert.equal((await inspect()).saved.find(item => item.id === 'backend:one').name, 'Committed before lost response')
      await button(panel, panel.cancel).click(); await page.waitForFunction(() => !window.fixture.inspect().editing)
      assert.equal(await field(panel, 'name').inputValue(), 'Committed before lost response'); assert.equal((await inspect()).writes.length, 1)
    })
  }

  await test('pi: visible cancel clears a new unsaved connection without restoring a removed ID', async () => {
    const panel = panels[1]; await reset(panel); await button(panel, '连接本机服务').click(); await field(panel, 'name').fill('Cancelled fresh input')
    await page.waitForFunction(() => window.fixture.inspect().editing); await button(panel, '取消修改').click()
    await page.getByRole('region', { name: '编辑模型连接', exact: true }).waitFor({ state: 'detached' }); await page.waitForFunction(() => !window.fixture.inspect().editing)
    assert.deepEqual((await inspect()).writes, []); assert.equal((await inspect()).saved.length, 2)
  })

  const taskRegion = () => page.getByRole('region', { name: '任务默认模型', exact: true })
  const taskModel = () => taskRegion().getByRole('textbox', { name: '视觉分析与标签模型', exact: true })
  const taskConnection = () => taskRegion().getByRole('combobox', { name: '视觉分析与标签连接', exact: true })
  const taskSave = () => taskRegion().getByRole('button', { name: '保存任务默认模型', exact: true })
  const taskRefresh = () => taskRegion().getByRole('button', { name: '重新读取任务默认模型', exact: true })
  const taskAdopt = () => taskRegion().getByRole('button', { name: '核对后采用当前任务设置为基准', exact: true })
  const taskReset = async () => {
    await page.evaluate(() => window.fixture.reset('tasks')); await taskModel().waitFor()
    await page.waitForFunction(() => document.querySelector('input[aria-label="视觉分析与标签模型"]').value === 'original-model' && !window.fixture.inspect().editing)
  }
  const taskCompare = async model => {
    await taskRegion().getByText('核对当前已保存的任务默认模型', { exact: true }).click()
    assert.ok((await taskRegion().innerText()).includes(model), 'comparison must show the currently saved task model')
  }
  const taskPeer = model => ({ analyze: { backendId: 'backend:two', model } })

  await test('tasks: missed peer event rejects stale CAS; reread/adoption retain local task choices', async () => {
    await taskReset(); await taskModel().fill('retained-task-model')
    await page.evaluate(next => window.fixture.peerTasks(next, false), taskPeer('peer-task-model'))
    await taskSave().click(); await taskRegion().getByRole('status').filter({ hasText: '未能保存' }).waitFor()
    assert.equal(await taskModel().inputValue(), 'retained-task-model'); assert.equal((await inspect()).taskWrites[0].expected.aiTaskModels.analyze.model, 'original-model')
    const count = (await inspect()).reads.length; await taskRefresh().click(); await awaitReadsAfter(count); await taskCompare('peer-task-model')
    if (await taskSave().isEnabled()) await taskSave().click()
    assert.equal((await inspect()).taskWrites.length, 1, 'unreviewed current task settings must not be submitted')
    await taskAdopt().click(); assert.equal(await taskModel().inputValue(), 'retained-task-model'); assert.equal(await taskConnection().inputValue(), 'backend:one')
    await taskSave().click(); await page.waitForFunction(() => window.fixture.inspect().taskWrites.length === 2 && !window.fixture.inspect().editing)
    const state = await inspect(); assert.deepEqual(state.taskWrites[1].expected.aiTaskModels, taskPeer('peer-task-model')); assert.deepEqual(state.taskChoices, { analyze: { backendId: 'backend:one', model: 'retained-task-model' } })
  })

  await test('tasks: a second peer save requires a fresh adoption and keeps local model input', async () => {
    await taskReset(); await taskModel().fill('input-across-task-peers'); let count = (await inspect()).reads.length
    await page.evaluate(next => window.fixture.peerTasks(next), taskPeer('first-peer-task')); await awaitReadsAfter(count); await taskCompare('first-peer-task'); await taskAdopt().click()
    count = (await inspect()).reads.length; await page.evaluate(next => window.fixture.peerTasks(next), taskPeer('second-peer-task')); await awaitReadsAfter(count)
    await taskRegion().getByText('核对当前已保存的任务默认模型', { exact: true }).waitFor()
    if (await taskSave().isEnabled()) await taskSave().click()
    assert.deepEqual((await inspect()).taskWrites, []); assert.equal(await taskModel().inputValue(), 'input-across-task-peers')
    await taskCompare('second-peer-task'); await taskAdopt().click(); await taskSave().click(); await page.waitForFunction(() => window.fixture.inspect().taskWrites.length === 1 && !window.fixture.inspect().editing)
    assert.deepEqual((await inspect()).taskWrites[0].expected.aiTaskModels, taskPeer('second-peer-task'))
  })

  await test('tasks: a delayed save receipt preserves later input with an explicit unsaved notice and the submitted CAS baseline', async () => {
    await taskReset(); await taskModel().fill('submitted-task-model'); await page.evaluate(() => window.fixture.holdTask()); await taskSave().click()
    await page.waitForFunction(() => window.fixture.inspect().pendingTask); await taskModel().fill('later-task-input'); await page.evaluate(() => window.fixture.releaseTask())
    await taskRegion().getByRole('status').filter({ hasText: '未保存' }).waitFor(); assert.equal(await taskModel().inputValue(), 'later-task-input'); assert.equal((await inspect()).editing, true)
    await taskSave().click(); await page.waitForFunction(() => window.fixture.inspect().taskWrites.length === 2 && !window.fixture.inspect().editing)
    const state = await inspect(); assert.equal(state.taskWrites[1].expected.aiTaskModels.analyze.model, 'submitted-task-model'); assert.equal(state.taskChoices.analyze.model, 'later-task-input')
  })

  await test('tasks: selecting unassigned removes that task key and saves an empty task mapping', async () => {
    await taskReset(); await taskConnection().selectOption(''); assert.equal(await taskConnection().inputValue(), ''); assert.equal(await taskModel().inputValue(), '')
    await taskSave().click(); await page.waitForFunction(() => window.fixture.inspect().taskWrites.length === 1 && !window.fixture.inspect().editing)
    const state = await inspect(); assert.deepEqual(state.taskWrites[0].patch, { aiTaskModels: {} }); assert.deepEqual(state.taskChoices, {}); assert.equal(Object.hasOwn(state.taskChoices, 'analyze'), false)
  })

  await test('tasks: a committed save with a truncated receipt stays unknown until a read confirms it, without replay', async () => {
    await taskReset(); await taskModel().fill('task-committed-before-lost-response'); await page.evaluate(() => window.fixture.loseReply())
    await taskSave().click(); await taskRegion().getByRole('status').waitFor()
    const notice = await taskRegion().getByRole('status').innerText()
    assert.match(notice, /未收到完整回执/); assert.match(notice, /检查保存结果，勿重复提交/); assert.equal(notice.includes('未能保存'), false)
    assert.equal(await taskModel().inputValue(), 'task-committed-before-lost-response'); assert.equal((await inspect()).taskWrites.length, 1)
    await taskRefresh().click(); await taskCompare('task-committed-before-lost-response'); await taskAdopt().click()
    assert.equal((await inspect()).editing, false); assert.equal((await inspect()).taskWrites.length, 1)
    assert.equal((await inspect()).taskChoices.analyze.model, 'task-committed-before-lost-response')
  })

  await test('backend: a late initial list never overwrites a newly entered unsaved service', async () => {
    const panel = panels[0]; await page.evaluate(() => window.fixture.reset('backend', true)); await page.waitForFunction(() => window.fixture.inspect().pendingRead)
    await button(panel, '添加服务').click(); await edit(panel, 'New input during initial read'); await page.evaluate(() => window.fixture.releaseRead())
    await region(panel).getByRole('button', { name: /^Original service/ }).waitFor(); await retained(panel, 'New input during initial read')
    assert.equal((await inspect()).editing, true); assert.deepEqual((await inspect()).writes, [])
    await save(panel).click(); await page.waitForFunction(() => window.fixture.inspect().writes.length === 1 && !window.fixture.inspect().editing)
    const state = await inspect(); assert.equal(state.writes[0].expected, null); assert.notEqual(state.writes[0].config.id, 'backend:one'); assert.equal(state.saved.find(item => item.id === 'backend:one').name, 'Original service')
    assert.equal(state.saved.filter(item => item.name === 'New input during initial read').length, 1)
  })

  await test('backend: a post-save stale required list rejects calibration and preserves the committed form', async () => {
    const panel = panels[0]; await reset(panel); await edit(panel, 'Service committed before old read')
    await page.evaluate(() => { window.fixture.holdRead(); window.fixture.startReconcile() }); await page.waitForFunction(() => window.fixture.inspect().pendingRead)
    await save(panel).click(); await page.waitForFunction(() => window.fixture.inspect().writes.length === 1 && !window.fixture.inspect().editing)
    assert.equal((await inspect()).saved.find(item => item.id === 'backend:one').name, 'Service committed before old read')
    await page.evaluate(async () => { window.fixture.releaseRead(); await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))) })
    await page.waitForFunction(() => window.fixture.inspect().reconcileResult !== 'pending')
    await retained(panel, 'Service committed before old read'); const state = await inspect()
    assert.equal(state.reconcileResult, 'rejected', 'a still-mounted required read superseded by a save must reject admission')
    assert.equal(state.editing, false); assert.equal(state.writes.length, 1)
  })

  await test('tasks: a post-save stale required settings read rejects calibration and preserves committed choices', async () => {
    await taskReset(); await taskModel().fill('task-committed-before-old-read')
    await page.evaluate(() => { window.fixture.holdSettingsRead(); window.fixture.startReconcile() }); await page.waitForFunction(() => window.fixture.inspect().pendingSettingsRead)
    await taskSave().click(); await page.waitForFunction(() => window.fixture.inspect().taskWrites.length === 1 && !window.fixture.inspect().editing)
    assert.equal((await inspect()).taskChoices.analyze.model, 'task-committed-before-old-read')
    await page.evaluate(async () => { window.fixture.releaseSettingsRead(); await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))) })
    await page.waitForFunction(() => window.fixture.inspect().reconcileResult !== 'pending')
    assert.equal(await taskModel().inputValue(), 'task-committed-before-old-read'); const state = await inspect()
    assert.equal(state.reconcileResult, 'rejected', 'a superseded required settings read must not admit a stale task configuration')
    assert.equal(state.editing, false); assert.equal(state.taskWrites.length, 1)
  })

  await test('pi: initial connection intent is consumed once and peer refresh cannot discard a later selected/new form or typed key', async () => {
    const panel = panels[1]
    for (const mode of ['other', 'new']) {
      await page.evaluate(() => window.fixture.reset('pi', false, 'backend:one')); await field(panel, 'name').waitFor()
      await field(panel, 'name').fill('Input explicitly cancelled at initial connection'); await button(panel, '取消修改').click()
      await page.waitForFunction(() => !window.fixture.inspect().editing); assert.equal(await field(panel, 'name').inputValue(), 'Original service')
      if (mode === 'other') await region(panel).getByRole('button', { name: /^Other service/ }).click()
      else { await button(panel, '连接本机服务').click(); await region(panel).getByRole('combobox', { name: '认证方式', exact: true }).selectOption('api-key') }
      const localName = 'Input after initial intent ' + mode; await edit(panel, localName)
      await region(panel).getByRole('textbox', { name: 'API Key', exact: true }).fill('SYNTHETIC_TYPED_VALUE')
      const count = (await inspect()).reads.length; await page.evaluate(patch => window.fixture.peer(patch), peerPatch('Peer updates the initial service')); await awaitReadsAfter(count)
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
      await retained(panel, localName); assert.equal(await region(panel).getByRole('textbox', { name: 'API Key', exact: true }).inputValue(), 'SYNTHETIC_TYPED_VALUE')
      assert.equal((await inspect()).editing, true); assert.deepEqual((await inspect()).writes, [])
    }
  })

  for (const stage of ['list', 'status']) await test('pi: a post-save stale required ' + stage + ' reply rejects calibration and preserves the committed connection', async () => {
    const panel = panels[1]; await reset(panel); await edit(panel, 'Pi committed before old ' + stage)
    await page.evaluate(stage => { if (stage === 'list') window.fixture.holdRead(); else window.fixture.holdStatusRead(); window.fixture.startReconcile() }, stage)
    await page.waitForFunction(stage => stage === 'list' ? window.fixture.inspect().pendingRead : window.fixture.inspect().pendingStatusRead, stage)
    await save(panel).click(); await page.waitForFunction(() => window.fixture.inspect().writes.length === 1 && !window.fixture.inspect().editing)
    await page.evaluate(async stage => { if (stage === 'list') window.fixture.releaseRead(); else window.fixture.releaseStatusRead(); await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))) }, stage)
    await page.waitForFunction(() => window.fixture.inspect().reconcileResult !== 'pending')
    await retained(panel, 'Pi committed before old ' + stage); const state = await inspect()
    assert.equal(state.reconcileResult, 'rejected', 'a superseded still-mounted Pi required ' + stage + ' read must reject readiness')
    assert.equal(state.saved.find(item => item.id === 'backend:one').name, 'Pi committed before old ' + stage); assert.equal(state.editing, false); assert.equal(state.writes.length, 1)
  })

  for (const kind of ['backend', 'pi', 'tasks']) await test(kind + ': required read supersession by a pending ordinary settings read cannot report false readiness', async () => {
    const panel = panels.find(value => value.kind === kind), tasks = kind === 'tasks'
    if (tasks) await taskReset(); else await reset(panel)
    await page.evaluate(tasks => { if (tasks) window.fixture.holdSettingsRead(); else window.fixture.holdRead(); window.fixture.startReconcile() }, tasks)
    await page.waitForFunction(tasks => tasks ? window.fixture.inspect().pendingSettingsCount === 1 : window.fixture.inspect().pendingReadCount === 1, tasks)
    await page.evaluate(({ tasks, backend, task }) => { if (tasks) { window.fixture.holdSettingsRead(); window.fixture.peerTasks(task) } else { window.fixture.holdRead(); window.fixture.peer(backend) } }, { tasks, backend: peerPatch('Latest ordinary-read service'), task: taskPeer('latest-ordinary-read-task') })
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    const before = await inspect(), countBefore = tasks ? before.settingsReads : before.reads.length, queued = tasks ? before.pendingSettingsCount : before.pendingReadCount
    assert.ok([1, 2].includes(queued)); assert.equal(before.reconcileResult, 'pending', 'readiness must wait for its required response')
    await page.evaluate(async tasks => { if (tasks) window.fixture.releaseSettingsRead(); else window.fixture.releaseRead(); await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))) }, tasks)
    const interim = await inspect()
    if (queued === 1) {
      // Deferring an ordinary refresh preserves the required request's epoch.
      // Its real response may complete admission; the queued refresh must then run.
      assert.ok(['resolved', 'rejected'].includes(interim.reconcileResult)); assert.ok((tasks ? interim.settingsReads : interim.reads.length) > countBefore)
      assert.equal(tasks ? interim.pendingSettingsCount : interim.pendingReadCount, 1)
    } else if (interim.reconcileResult === 'resolved') assert.ok((tasks ? interim.settingsReads : interim.reads.length) > countBefore, 'required readiness needs a new latest read while the ordinary replacement is still pending')
    else assert.ok(['pending', 'rejected'].includes(interim.reconcileResult))
    await page.evaluate(async tasks => { if (tasks) window.fixture.releaseSettingsRead(); else window.fixture.releaseRead(); await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))) }, tasks)
    await page.waitForFunction(() => window.fixture.inspect().reconcileResult !== 'pending')
    if (tasks) assert.equal(await taskModel().inputValue(), 'latest-ordinary-read-task')
    else assert.equal(await field(panel, 'name').inputValue(), 'Latest ordinary-read service')
    const state = await inspect(); assert.ok(['resolved', 'rejected'].includes(state.reconcileResult)); assert.deepEqual(state.writes, []); assert.deepEqual(state.taskWrites, []); assert.equal(state.editing, false)
  })
  assert.deepEqual(errors, [], 'actual panels must not emit React/runtime errors'); assert.deepEqual(external, [], 'fixture must make no network requests')
  assert.deepEqual((await inspect()).forbidden, [], 'no probe, catalog, credentials, login, deletion, or validation operation may run')
  await context.close()
} finally { await browser.close(); await fs.rm(root, { recursive: true, force: true }) }
