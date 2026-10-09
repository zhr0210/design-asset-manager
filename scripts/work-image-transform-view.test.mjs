// Actual React form/cache regression with a controlled bridge. No pixel or OS-drop qualification.
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {build} from 'esbuild'
import {_electron as electron} from 'playwright'
const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'dam-image-transform-view-')))
await build({absWorkingDir:process.cwd(),bundle:true,platform:'browser',format:'iife',outfile:path.join(root,'fixture.js'),logLevel:'silent',stdin:{resolveDir:process.cwd(),loader:'jsx',contents:`
import React,{useState,useMemo,useCallback}from'react';import{createRoot}from'react-dom/client';
import{WorkFileHandoffPanel}from'./src/renderer/components/library/canvas/WorkFileHandoffPanel';import{useWorkHandoffs}from'./src/renderer/routes/use-work-handoffs';
const requests=[],waiting=[];let delayed=false,sequence=0,changeScope;
const reply=input=>{const n=++sequence,t=input.request.imageTransform;return{success:true,value:{id:'handoff:'+n,fileName:'fixture-'+input.request.assetId.slice(6)+'-'+n+'.'+(t?.format||'png'),bytes:512,sha256:'a'.repeat(64),kind:input.request.kind,status:'prepared',message:'Controlled fixture prepared',...(t?{image:{width:33,height:25,format:t.format,hasAlpha:false,autoOriented:true,qualityApplied:t.format!=='png',jpegAlphaFlattened:t.format==='jpeg',metadataPolicy:t.stripMetadata?'stripped':'partial',retainedMetadata:t.stripMetadata?[]:['icc']}}:{})}}};
const api={fileHandoff:async input=>{requests.push(input);if(delayed)return new Promise(resolve=>waiting.push({input,resolve}));return reply(input)}};
function Fixture(){const[assetId,setAssetId]=useState('asset:alpha');changeScope=setAssetId;
 const scope={libraryIdentity:'library:fixture',generation:'generation:fixture',setId:'work-set:fixture',assetId};
 const snapshot={token:'native:'+assetId,scope:{libraryIdentity:scope.libraryIdentity,generation:scope.generation},set:{id:scope.setId,assetIds:['asset:alpha','asset:beta'],unavailableIds:[]},assets:['alpha','beta'].map(id=>({id:'asset:'+id,revision:'one',thumbnailRef:'fixture'}))};
 const handoffs=useWorkHandoffs(api,snapshot,snapshot.set.assetIds),changed=useCallback(()=>handoffs.invalidate(assetId),[assetId,handoffs.invalidate]);
 const actions=useMemo(()=>({handoff:handoffs.handoff,read:async()=>({success:false,error:'NOT_USED'}),write:async()=>({success:false,error:'NOT_USED'}),cancel:async()=>({success:false,error:'NOT_USED'})}),[handoffs.handoff]);
 return <WorkFileHandoffPanel scope={scope} actions={actions} onKindChange={changed}/>;
}
window.fixture={inspect:()=>structuredClone(requests),waiting:()=>waiting.length,delay:value=>{delayed=value},resolve:()=>{const next=waiting.shift();if(!next)throw Error('NO_PENDING');next.resolve(reply(next.input))},scope:id=>changeScope(id)};
createRoot(document.getElementById('root')).render(<Fixture/>);
`}})
await fs.writeFile(path.join(root,'index.html'),'<meta charset="utf-8"><link rel="stylesheet" href="fixture.css"><div id="root"></div><script src="fixture.js"></script>')
await fs.writeFile(path.join(root,'main.cjs'),`const{app,BrowserWindow,session}=require('electron');app.setPath('userData',${JSON.stringify(path.join(root,'profile'))});app.whenReady().then(()=>{session.defaultSession.webRequest.onBeforeRequest((r,done)=>done({cancel:!r.url.startsWith('file:')}));new BrowserWindow({show:false,width:900,height:1000,webPreferences:{contextIsolation:true,nodeIntegration:false}}).loadFile(${JSON.stringify(path.join(root,'index.html'))})});app.on('window-all-closed',()=>app.quit())`)
const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>!k.startsWith('DAM_')&&!['ELECTRON_RUN_AS_NODE','NODE_OPTIONS','ELECTRON_RENDERER_URL'].includes(k)))
const app=await electron.launch({args:[path.join(root,'main.cjs')],env})
try{
 const page=await app.firstWindow();page.setDefaultTimeout(6000)
 const prepare=()=>page.getByRole('button',{name:'准备交付副本',exact:true})
 const requests=()=>page.evaluate(()=>window.fixture.inspect())
 const output=()=>page.getByRole('combobox',{name:'图像输出格式',exact:true})
 const quality=()=>page.getByRole('spinbutton',{name:'图像压缩质量',exact:true})
 const kind=()=>page.getByRole('combobox',{name:'交付内容',exact:true})
 const status=()=>page.getByRole('status')
 await kind().selectOption('processed-image');assert.equal(await quality().isDisabled(),true,'PNG must not suggest a lossy quality setting')
 await page.getByText('PNG 为无损格式，不应用压缩质量参数。',{exact:true}).waitFor()
 await page.getByRole('checkbox',{name:'限制图像尺寸',exact:true}).check()
 await page.getByRole('spinbutton',{name:'图像最大宽度',exact:true}).fill('40');await page.getByRole('spinbutton',{name:'图像最大高度',exact:true}).fill('30')
 await prepare().click();await status().filter({hasText:'33 × 25 · PNG · 元数据已删除'}).waitFor()
 const first=(await requests())[0]
 assert.deepEqual(first.request.imageTransform,{format:'png',quality:85,stripMetadata:true,resize:{fit:'inside',width:40,height:30}})
 assert.equal(first.request.kind,'processed-image');assert.equal(first.request.assetId,'asset:alpha')
 assert.equal(await page.getByRole('link',{name:'下载交付副本',exact:true}).count(),1)
 await prepare().click();assert.equal((await requests()).length,1,'identical transform preparation reuses the confirmed receipt')
 await output().selectOption('jpeg');assert.equal(await quality().isDisabled(),false);assert.equal(await page.getByRole('link',{name:'下载交付副本',exact:true}).count(),0,'changed format retires prior receipt')
 await quality().fill('72');await page.getByRole('checkbox',{name:'删除图像元数据',exact:true}).uncheck()
 await prepare().click();await status().filter({hasText:'33 × 25 · JPEG · 实际保留元数据：icc · 透明区域已转白底'}).waitFor()
 assert.deepEqual((await requests())[1].request.imageTransform,{format:'jpeg',quality:72,stripMetadata:false,resize:{fit:'inside',width:40,height:30}})
 await quality().fill('73');assert.equal(await page.getByRole('link',{name:'下载交付副本',exact:true}).count(),0,'changed quality retires prior receipt')
 await prepare().click();await status().filter({hasText:'fixture-alpha-3.jpeg'}).waitFor();assert.equal((await requests()).length,3,'different transforms do not share a cache entry')
 await quality().fill('72');await prepare().click();await status().filter({hasText:'fixture-alpha-2.jpeg'}).waitFor();assert.equal((await requests()).length,3,'canonical earlier transform recovers only its own cached receipt')
 await page.getByRole('checkbox',{name:'删除图像元数据',exact:true}).check();assert.equal(await page.getByRole('link',{name:'下载交付副本',exact:true}).count(),0,'metadata change retires prior receipt')
 await prepare().click();await status().filter({hasText:'33 × 25 · JPEG · 元数据已删除'}).waitFor();assert.equal((await requests())[3].request.imageTransform.stripMetadata,true)
 // An in-flight old member may complete, but its response must not become the new member's UI.
 await output().selectOption('webp');await page.evaluate(()=>window.fixture.delay(true));await prepare().click();await page.waitForFunction(()=>window.fixture.waiting()===1)
 assert.equal(await prepare().isDisabled(),true);await page.evaluate(()=>window.fixture.scope('asset:beta'))
 await kind().selectOption('processed-image');assert.equal(await prepare().isDisabled(),false,'scope change releases obsolete busy UI')
 await page.evaluate(()=>window.fixture.resolve());await page.waitForFunction(()=>window.fixture.waiting()===0)
 assert.equal(await page.getByRole('link',{name:'下载交付副本',exact:true}).count(),0,'late old-member receipt never appears on new member')
 assert.equal(await prepare().isDisabled(),false,'late old result must not leave the new member locked')
 await page.evaluate(()=>window.fixture.delay(false));await prepare().click();await status().filter({hasText:'fixture-beta-6.webp'}).waitFor()
 assert.equal((await requests())[5].request.assetId,'asset:beta')
 console.log('Actual image form and handoff hook: PNG quality disabled; inside 40×30, JPEG quality and metadata options dispatched; actual returned size/format/metadata feedback; parameter retirement, distinct canonical caches and late-scope busy/receipt protection. Controlled response only; production pixel qualification separate.')
}finally{await app.close();assert.equal(path.dirname(root),await fs.realpath(os.tmpdir()));assert.ok(path.basename(root).startsWith('dam-image-transform-view-'));await fs.rm(root,{recursive:true,force:true})}
