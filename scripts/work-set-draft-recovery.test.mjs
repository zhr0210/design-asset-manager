// Executable React component regression on a private Electron profile and synthetic client boundaries.
// This is component/wiring verification; it is not formal product Computer Use acceptance.
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {build} from 'esbuild'
import {_electron as electron} from 'playwright'

const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'dam-work-set-recovery-')))
const profile = path.join(root, 'profile')
await fs.mkdir(profile)
const fixture = path.join(root, 'fixture.js')
await build({
  absWorkingDir: process.cwd(), bundle: true, platform: 'browser', format: 'iife', outfile: fixture,
  stdin: {resolveDir: process.cwd(), loader: 'jsx', contents: `
    import React from 'react'
    import {createRoot} from 'react-dom/client'
    import {WorkSetModal} from './src/renderer/components/library/canvas/WorkSetModal'
    import {installWorkspaceClient} from './src/renderer/workspace-client'
    import {rememberRecoveredDraft,clearWorkspaceDraftView,flushWorkspaceDrafts,holdWorkspaceDraft,suspendRecoveredWorkspaceDraft,currentWorkspaceDraft,isWorkspaceDraftLoaded} from './src/renderer/workspace-drafts'
    const drafts = new Map(), writes = []
    const scope = {libraryIdentity:'library:fixture',generation:'generation:fixture'}
    const original = {name:'Original set',note:'Original saved note',assetIds:['asset:one'],colors:['#112233'],columns:2}
    const recovered = {...original,name:'Recovered set',note:'Recovered unsaved note'}
    const baseline = {revision:7,value:original}
    const key = s => JSON.stringify([s.libraryIdentity,s.generation,s.kind,s.entityId])
    let revision = 0, closed = 0, acceptWrite = false, version = 0, intent = {kind:'edit',id:'work-set:missing'}
    let catalog = {sets:[],sessionToken:'session:fixture',requiresUpgrade:false}
    const clone = v => structuredClone(v)
    installWorkspaceClient({transitions:{ready:async()=>{}},drafts:{
      put:async input => {const record={...clone(input),id:'draft:fixture',revision:++revision,updatedAt:1,clientKind:'browser',owned:true,activeElsewhere:false};drafts.set(key(input),record);return clone(record)},
      remove:async input => {drafts.delete(key(input))},list:async()=>clone([...drafts.values()])
    }})
    const app = createRoot(document.getElementById('root'))
    const render = () => app.render(<WorkSetModal key={version} model={{scope,catalog,loading:false,busy:false,error:'',refresh:async()=>{},write:async command=>{writes.push(clone(command));if(!acceptWrite)throw Error('Synthetic conflict');},open:async()=>{},restore:async()=>{},recover:async()=>{},hideLibrary:async()=>{}}} intent={intent} assets={[{id:'asset:one',title:'Existing reference'},{id:'asset:two',title:'New reference'}]} close={()=>{closed++;app.render(null)}}/>)
    window.fixture = {
      flush:flushWorkspaceDrafts,
      inspect:()=>clone({drafts:[...drafts.values()],writes,closed,catalog,local:currentWorkspaceDraft({...scope,kind:'work-set',entityId:'work-set:missing'}),loaded:isWorkspaceDraftLoaded({...scope,kind:'work-set',entityId:'work-set:missing'}),newLoaded:isWorkspaceDraftLoaded({...scope,kind:'work-set',entityId:'work-set:new'})}),
      accept:()=>{acceptWrite=true},
      reopen:()=>{version++;render()},
      removeTarget:()=>{catalog={...catalog,sets:[]};render()},
      reset:async mode => {
        app.render(null);await new Promise(resolve=>setTimeout(resolve,0));clearWorkspaceDraftView();drafts.clear();writes.length=0;closed=0;acceptWrite=false;version++;
        const additive=mode==='add-target'||mode==='add-choose'||mode==='add-clean-choose';
        intent=additive?{kind:'add',assetIds:mode==='add-clean-choose'?['asset:one']:['asset:two','asset:one'],colors:mode==='add-clean-choose'?['#112233']:['#445566','#112233'],...(mode==='add-target'?{targetId:'work-set:missing'}:{})}:mode==='new'?{kind:'new'}:{kind:'edit',id:'work-set:missing'};
        catalog={...catalog,sets:mode===true||additive?[{...original,id:'work-set:missing',revision:9,note:'A newer saved note',unavailableIds:[],layout:null}]:[]};
        const record={...scope,kind:'work-set',entityId:'work-set:missing',value:mode==='add-clean-choose'?clone(original):recovered,base:baseline,id:'draft:fixture',revision:1,updatedAt:1,clientKind:'browser',owned:true,activeElsewhere:false};
        if(additive){holdWorkspaceDraft(record,record.value,record.base);await flushWorkspaceDrafts();suspendRecoveredWorkspaceDraft(record)}
        else if(mode!=='new'){drafts.set(key(record),clone(record));rememberRecoveredDraft(record)}render()
      }
    }
  `}, logLevel: 'silent'
})
await fs.writeFile(path.join(root, 'index.html'), '<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src \'self\'; script-src \'self\'; connect-src \'none\'"><div id="root"></div><script src="fixture.js"></script>')
await fs.writeFile(path.join(root, 'main.cjs'), `
  const {app,BrowserWindow,session}=require('electron');
  for(const name of ['userData','sessionData','logs','crashDumps'])app.setPath(name,${JSON.stringify(profile)});
  app.whenReady().then(()=>{session.defaultSession.webRequest.onBeforeRequest((request,done)=>done({cancel:!request.url.startsWith('file:')}));const window=new BrowserWindow({show:false,webPreferences:{contextIsolation:true,nodeIntegration:false}});window.loadFile(${JSON.stringify(path.join(root,'index.html'))})});
`)
const app = await electron.launch({args:[path.join(root,'main.cjs')],env:{...process.env,NODE_ENV:'test'}})
try {
  const page = await app.firstWindow(), errors = [], nativeDialogs = []
  page.setDefaultTimeout(6000)
  page.on('pageerror',error=>errors.push(error.message))
  page.on('dialog',async dialog=>{nativeDialogs.push(dialog.type());await dialog.dismiss()})
  await page.waitForFunction(()=>Boolean(window.fixture))
  const reset = async mode => {await page.evaluate(mode=>window.fixture.reset(mode),mode);await page.getByRole('dialog',{name:mode==='new'||String(mode).startsWith('add-')?'加入工作集':'编辑工作集',exact:true}).waitFor()}
  const inspect = async () => {await page.evaluate(()=>window.fixture.flush());return page.evaluate(()=>window.fixture.inspect())}
  const originalBaseline = {revision:7,value:{name:'Original set',note:'Original saved note',assetIds:['asset:one'],colors:['#112233'],columns:2}}
  await reset(false)
  await page.getByRole('textbox',{name:'工作集备注',exact:true}).fill('Edited recovered note')
  const missing = await inspect()
  assert.deepEqual(missing.drafts[0].base,originalBaseline,'missing recovered target keeps its original save baseline')
  assert.equal(missing.drafts[0].value.note,'Edited recovered note')
  assert.equal(await page.getByRole('button',{name:'保存工作集',exact:true}).isDisabled(),true,'an absent existing target cannot silently become a create command')
  await page.getByText('原工作集已不存在或暂不可用，当前输入仍保留。可以另存工作集，或取消放弃这份草稿。',{exact:true}).waitFor()
  assert.equal(await page.getByRole('button',{name:'另存工作集',exact:true}).isVisible(),true)
  await page.locator('form').evaluate(form=>form.requestSubmit())
  const blocked = await inspect()
  assert.deepEqual(blocked.writes,[],'submit handler also rejects a missing target')
  assert.equal(blocked.closed,0)
  await page.getByRole('button',{name:'另存工作集',exact:true}).click()
  assert.equal(await page.getByRole('textbox',{name:'工作集名称',exact:true}).inputValue(),'Recovered set 副本')
  assert.equal(await page.getByRole('textbox',{name:'工作集备注',exact:true}).inputValue(),'Edited recovered note')
  const alternate = await inspect()
  assert.deepEqual(alternate.drafts.find(draft=>draft.entityId==='work-set:missing')?.base,originalBaseline,'choosing another save destination does not discard the original recovery before a commit')
  assert.deepEqual(alternate.drafts.find(draft=>draft.entityId==='work-set:new')?.base,{revision:0,value:null})
  await page.getByRole('button',{name:'保存工作集',exact:true}).click()
  await page.getByRole('alert').getByText('Synthetic conflict',{exact:true}).waitFor()
  const failedSave = await inspect()
  assert.equal(failedSave.writes[0].kind,'create','only explicit Save As requests creation')
  assert.equal(failedSave.closed,0)
  assert.equal(failedSave.drafts.length,2,'both recoverable records remain while saving failed')
  await page.evaluate(()=>window.fixture.accept())
  await page.getByRole('button',{name:'保存工作集',exact:true}).click()
  await page.getByRole('dialog',{name:'编辑工作集',exact:true}).waitFor({state:'detached'})
  assert.deepEqual((await inspect()).drafts,[],'a successful alternate commit clears the recovery records')

  await reset(true)
  await page.getByRole('textbox',{name:'工作集备注',exact:true}).fill('Further recovered edit')
  assert.deepEqual((await inspect()).drafts[0].base,originalBaseline,'a newer catalog does not silently rebase recovery')
  await page.getByRole('button',{name:'保存工作集',exact:true}).click()
  await page.getByRole('alert').getByText('Synthetic conflict',{exact:true}).waitFor()
  assert.deepEqual((await inspect()).writes[0],{kind:'save',id:'work-set:missing',expectedRevision:7,value:{name:'Recovered set',note:'Further recovered edit',assetIds:['asset:one'],colors:['#112233'],columns:2}})
  await page.evaluate(()=>window.fixture.removeTarget())
  await page.getByText('原工作集已不存在或暂不可用，当前输入仍保留。可以另存工作集，或取消放弃这份草稿。',{exact:true}).waitFor()
  assert.equal(await page.getByRole('button',{name:'保存工作集',exact:true}).isDisabled(),true,'a target deleted while editing also blocks saving')
  assert.deepEqual((await inspect()).drafts[0].base,originalBaseline)
  await page.getByRole('button',{name:'取消',exact:true}).click()
  assert.deepEqual((await inspect()).drafts,[],'explicit cancellation discards the recovered record')

  await reset(false)
  await page.getByRole('button',{name:'另存工作集',exact:true}).click()
  assert.equal((await inspect()).drafts.length,2)
  await page.getByRole('button',{name:'取消',exact:true}).click()
  assert.deepEqual((await inspect()).drafts,[],'cancelling an alternate save discards both records')

  await reset('new')
  await page.getByRole('textbox',{name:'工作集名称',exact:true}).fill('Ordinary new set')
  await page.evaluate(()=>window.fixture.accept())
  await page.getByRole('button',{name:'保存工作集',exact:true}).click()
  await page.getByRole('dialog',{name:'加入工作集',exact:true}).waitFor({state:'detached'})
  const fresh = await inspect()
  assert.deepEqual(fresh.writes,[{kind:'create',value:{name:'Ordinary new set',note:'',assetIds:[],colors:[],columns:2}}])
  assert.deepEqual(fresh.drafts,[])

  // A local draft left by the reference view must not swallow a later Add intent.
  // Exercise both opening with a selected target and selecting it in the visible chooser.
  const additiveFailures=[]
  for(const mode of ['add-target','add-choose']){
    await reset(mode)
    if(mode==='add-choose'){
      await page.getByRole('textbox',{name:'工作集备注',exact:true}).fill('Keep input until a reviewed switch')
      const beforeSwitch=await inspect()
      await page.getByRole('combobox',{name:'目标工作集',exact:true}).selectOption('work-set:missing')
      await page.getByRole('alertdialog',{name:'切换工作集',exact:true}).waitFor()
      assert.deepEqual((await inspect()).drafts,beforeSwitch.drafts,'asking to switch cannot discard either draft')
      assert.deepEqual((await inspect()).writes,[])
      await page.getByRole('button',{name:'继续编辑',exact:true}).click()
      assert.equal(await page.getByRole('textbox',{name:'工作集备注',exact:true}).inputValue(),'Keep input until a reviewed switch')
      assert.equal(await page.getByRole('combobox',{name:'目标工作集',exact:true}).inputValue(),'','cancel preserves the current target')
      await page.getByRole('combobox',{name:'目标工作集',exact:true}).selectOption('work-set:missing')
      await page.getByRole('alertdialog',{name:'切换工作集',exact:true}).waitFor()
      await page.keyboard.press('Escape')
      assert.equal(await page.getByRole('textbox',{name:'工作集备注',exact:true}).inputValue(),'Keep input until a reviewed switch','Escape cancels review rather than closing or discarding the editor')
      assert.deepEqual((await inspect()).drafts,beforeSwitch.drafts)
      await page.getByRole('combobox',{name:'目标工作集',exact:true}).selectOption('work-set:missing')
      await page.getByRole('button',{name:'放弃草稿并切换',exact:true}).click()
      const switched=await inspect()
      assert.equal(switched.drafts.some(draft=>draft.entityId==='work-set:new'),false,'only explicit confirmation discards the previous target draft')
      assert.deepEqual(switched.catalog,beforeSwitch.catalog,'switching never writes the saved work set')
      assert.deepEqual(switched.writes,[])
    }
    assert.equal(await page.getByRole('textbox',{name:'工作集备注',exact:true}).inputValue(),'Recovered unsaved note','the reopened local draft keeps the earlier note')
    await page.getByRole('button',{name:'保存工作集',exact:true}).click()
    await page.getByRole('alert').getByText('Synthetic conflict',{exact:true}).waitFor()
    const additive=await inspect()
    assert.deepEqual(additive.drafts.find(draft=>draft.entityId==='work-set:missing')?.base,originalBaseline,'adding into a local draft preserves the original CAS baseline')
    assert.equal(additive.writes[0].expectedRevision,7)
    assert.equal(additive.writes[0].value.note,'Recovered unsaved note')
    try{
      assert.deepEqual(additive.writes[0].value.assetIds,['asset:one','asset:two'],mode+' merges requested references without duplicates')
      assert.deepEqual(additive.writes[0].value.colors,['#112233','#445566'],mode+' merges requested colors without duplicates')
    }catch(error){additiveFailures.push(error.message)}
  }
  assert.deepEqual(additiveFailures,[],'both additive entry paths preserve existing input and add the requested members/colors')

  await reset('add-clean-choose')
  await page.getByRole('combobox',{name:'目标工作集',exact:true}).selectOption('work-set:missing')
  await page.getByRole('button',{name:'放弃草稿并切换',exact:true}).click()
  const cleanChoice=await inspect()
  assert.equal(cleanChoice.drafts.length,1,'choosing a clean local recovery does not silently remove its record')
  assert.deepEqual(cleanChoice.drafts[0].base,originalBaseline,'the selected target keeps its older recovery baseline')
  assert.deepEqual(cleanChoice.drafts[0].value,originalBaseline.value)
  assert.equal(await page.getByRole('textbox',{name:'工作集备注',exact:true}).inputValue(),'Original saved note')
  await page.getByText('工作集已在另一界面变化。当前输入及原保存基准保留。',{exact:true}).waitFor()
  await page.getByRole('button',{name:'取消',exact:true}).click()
  assert.deepEqual((await inspect()).drafts,[],'explicit cancellation can discard the selected clean recovery')

  await reset(true)
  await page.getByRole('textbox',{name:'工作集备注',exact:true}).fill('Reviewed recovered note')
  await page.getByText('核对当前已保存的工作集',{exact:true}).click()
  await page.getByText('A newer saved note',{exact:true}).waitFor()
  await page.getByRole('button',{name:'核对后采用当前工作集为基准',exact:true}).click()
  const adopted=await inspect()
  assert.deepEqual(adopted.drafts[0].base,{revision:9,value:{...originalBaseline.value,note:'A newer saved note'}})
  assert.equal(await page.getByRole('textbox',{name:'工作集备注',exact:true}).inputValue(),'Reviewed recovered note','explicit adoption changes the expected baseline while preserving typed input')
  assert.equal(await page.getByRole('textbox',{name:'工作集名称',exact:true}).inputValue(),'Recovered set')
  await page.evaluate(()=>window.fixture.accept())
  await page.getByRole('button',{name:'保存工作集',exact:true}).click()
  await page.getByRole('dialog',{name:'编辑工作集',exact:true}).waitFor({state:'detached'})
  const adoptedSave=await inspect()
  assert.equal(adoptedSave.writes[0].expectedRevision,9)
  assert.equal(adoptedSave.writes[0].value.note,'Reviewed recovered note')
  assert.deepEqual(adoptedSave.drafts,[])

  await reset(true)
  await page.getByRole('textbox',{name:'工作集备注',exact:true}).fill('Modal kept by X')
  await page.getByRole('button',{name:'关闭并保留工作集草稿',exact:true}).click()
  await page.getByRole('dialog',{name:'编辑工作集',exact:true}).waitFor({state:'detached'})
  const left=await inspect()
  assert.equal(left.drafts[0].value.note,'Modal kept by X')
  assert.deepEqual(left.drafts[0].base,originalBaseline)
  assert.equal(left.local.value.note,'Modal kept by X')
  assert.equal(left.loaded,false,'leaving suspends the loaded marker while preserving the record')
  assert.deepEqual(left.writes,[],'closing X is not a formal save')
  await page.evaluate(()=>window.fixture.reopen())
  await page.getByRole('dialog',{name:'编辑工作集',exact:true}).waitFor()
  assert.equal(await page.getByRole('textbox',{name:'工作集备注',exact:true}).inputValue(),'Modal kept by X','reopening the modal restores the local input')
  assert.deepEqual((await inspect()).drafts[0].base,originalBaseline)
  await page.getByRole('button',{name:'取消',exact:true}).click()
  const discarded=await inspect()
  assert.deepEqual(discarded.drafts,[])
  assert.equal(discarded.local,undefined,'explicit Cancel also removes the local record')
  assert.equal(discarded.loaded,false)

  await reset(false)
  await page.getByRole('button',{name:'另存工作集',exact:true}).click()
  await page.getByRole('button',{name:'关闭并保留工作集草稿',exact:true}).click()
  await page.getByRole('dialog',{name:'编辑工作集',exact:true}).waitFor({state:'detached'})
  const abandonedAlternate=await inspect()
  assert.equal(abandonedAlternate.drafts.length,2,'leaving Save As preserves both records until an explicit later choice')
  assert.deepEqual(abandonedAlternate.drafts.find(record=>record.entityId==='work-set:missing').base,originalBaseline)
  assert.equal(abandonedAlternate.newLoaded,false,'the alternate draft is no longer displayed')
  assert.equal(abandonedAlternate.loaded,false,'the absent source draft also stops being marked active when its Save As editor closes')
  assert.deepEqual(errors,[])
  assert.deepEqual(nativeDialogs,[],'all switch decisions must use the page confirmation')
  console.log('PASS work-set recovery preserves the baseline, blocks absent targets, supports explicit Save As/discard, retains ordinary new-set creation, merges later Add intents, protects clean target recovery, adopts reviewed baselines, reopens drafts after closing X, and requires page confirmation before a dirty target switch while cancel/Escape preserve input and saved content')
} finally { await app.close() }
