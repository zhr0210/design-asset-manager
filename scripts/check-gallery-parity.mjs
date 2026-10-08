// Visual tracer: generated artwork only. This is separate from formal Electron data-chain acceptance.
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import assert from 'node:assert/strict'
import {createServer} from 'vite'
import react from '@vitejs/plugin-react'
import {chromium} from 'playwright'
import sharp from 'sharp'
import yaml from 'js-yaml'
import tailwind from 'tailwindcss'
import autoprefixer from 'autoprefixer'
const repo=process.cwd(),root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'dam-gallery-parity-')))
await fs.symlink(path.join(repo,'node_modules'),path.join(root,'node_modules'),'dir')
await fs.writeFile(path.join(root,'index.html'),'<html><body style="margin:0"><div id="root"></div><script type="module" src="/entry.tsx"></script></body></html>')
const frozen=process.env.DAM_GALLERY_REFERENCE
const referenceRoot=frozen||repo
if(frozen){await fs.symlink(path.join(repo,'node_modules'),path.join(frozen,'node_modules'),'dir').catch(()=>{})}
const referenceTokens=yaml.load((await fs.readFile(path.join(referenceRoot,frozen?'mobbin.md':'DESIGN.md'),'utf8')).split(/^---\s*$/m)[1])
const tokenCss=Object.entries(referenceTokens.colors).map(([k,v])=>`--${k}:${v};`).join('')+Object.entries(referenceTokens.rounded).map(([k,v])=>`--radius-${k}:${v};`).join('')
const at=p=>JSON.stringify('/@fs/'+repo+'/'+p)
await fs.writeFile(path.join(root,'entry.tsx'),`
import React,{useState}from'react';import{createRoot}from'react-dom/client';import{MemoryRouter}from'react-router-dom';
const Prototype=React.lazy(()=>import(${JSON.stringify('/@fs/'+referenceRoot+'/src/renderer/routes/work-mode-prototype/WorkModePrototype.tsx')}));
if(location.search.includes('formal'))await import(${at('src/renderer/styles/globals.css')});
import{LibraryFocus}from ${at('src/renderer/components/library/canvas/LibraryFocus.tsx')};
import{LibraryCanvas}from ${at('src/renderer/components/library/canvas/LibraryCanvas.tsx')};
import{assets as demos}from ${at('src/renderer/routes/work-mode-prototype/fixtures.ts')};
const groupNames={'a0':'品牌与视觉','a4':'品牌与视觉','a1':'网页与动效','a3':'网页与动效','a2':'平面设计'};
const assets=demos.filter(a=>a.id!=='a7').map(a=>({...a,tags:[...a.tags,...(groupNames[a.id]?[groupNames[a.id]]:[])],dominantColor:a.colors[0],fileType:a.kind==='video'?'视频':a.format||'SVG',sourceSiteName:a.category,fileUrl:'dam-preview://preview/test/gen/'+a.id}));
window.damClient={library:{trashList:async()=>[]}};
function Formal(){const [focus,setFocus]=useState(null),[selected,pick]=useState(null),[query,setQuery]=useState(''),[tags,setTags]=useState([]);const matched=assets.filter(a=>(!query||a.title.includes(query))&&tags.every(t=>a.tags.includes(t.slice(4))));return <div style={{height:'100vh'}}><LibraryCanvas organization={{snapshot:{revision:1,sessionToken:'test',requiresUpgrade:false,folders:['品牌与视觉','网页与动效','平面设计'].map(name=>({id:name,name,kind:'assets',parentId:null,assetIds:assets.filter(a=>a.tags.includes(name)).map(a=>a.id),colors:[]}))},loading:false,busy:false,error:'',refresh:async()=>{},write:async()=>{throw Error('visual tracer read only')}}} scope="test" authority={{state:'ready',identity:'test',generation:'gen'}} assets={assets} matches={matched.map(asset=>({asset}))} tags={['品牌与视觉','网页与动效','平面设计'].map(name=>({id:name,name,usageCount:1}))} selected={selected} pick={pick} openFocus={setFocus} query={query} setQuery={setQuery} tagQueries={tags} addTag={t=>setTags(v=>[...v,t])} removeTag={t=>setTags(v=>v.filter(x=>x!==t))} clearFilters={()=>{setQuery('');setTags([])}} bulkIds={[]} toggleBulk={()=>{}} clearBulk={()=>{}} bulkAction={()=>{}} status="ready" error={null} loaded retry={async()=>{}} controls={null} details={null} work={null} workMode={false} showWork={()=>{}} showAll={()=>{}} register={()=>{}}/>{focus&&<LibraryFocus asset={focus} items={assets} change={id=>setFocus(assets.find(a=>a.id===id))} close={()=>setFocus(null)} details={null} notebook={{load:()=>({}),hold:()=>{},save:()=>{},dirty:()=>false,saveLabel:'fixture'}}/>}</div>}
const style=document.createElement('style');style.textContent=${JSON.stringify('.work-prototype{'+tokenCss+'}')};document.head.append(style);
createRoot(document.getElementById('root')).render(<MemoryRouter><React.Suspense>{location.search.includes('formal')?<Formal/>:<Prototype/>}</React.Suspense></MemoryRouter>);
`)
const server=await createServer({configFile:false,root,plugins:[{name:'isolated-synthetic-media',enforce:'pre',load(id){if(id.endsWith('/canvas/LibraryMedia.tsx'))return `import React from'react';import{assets}from ${at('src/renderer/routes/work-mode-prototype/fixtures.ts')};export function controlledPreview(a){return assets.find(x=>x.id===a.id)?.src||''}export function LibraryMedia({asset}){return <img src={controlledPreview(asset)} alt={asset.title} draggable={false}/>}`}},react()],css:{postcss:{plugins:[tailwind({config:path.join(repo,'tailwind.config.js')}),autoprefixer()]}},resolve:{dedupe:['react','react-dom']},server:{host:'127.0.0.1',port:0,fs:{allow:[root,referenceRoot,path.join(repo,'src'),path.join(repo,'node_modules')]}}})
await server.listen();const url=`http://127.0.0.1:${server.httpServer.address().port}`
const browser=await chromium.launch(),errors=[],checks=[]
try{
 for(const width of [1379,1440,1024]){
  const context=await browser.newContext({viewport:{width,height:1042},reducedMotion:'reduce'}),reference=await context.newPage(),formal=await context.newPage()
  for(const p of [reference,formal])p.on('pageerror',e=>errors.push(e.message))
  await reference.goto(url);await formal.goto(url+'?formal');await reference.locator('.grid-slot').first().waitFor();await formal.locator('.grid-slot').first().waitFor();await new Promise(r=>setTimeout(r,300))
  for(const selector of ['.icon-rail','.main-view','.bottom-dock','.dock-search-row','.layout-slider','.grid-slot','.asset-art','.asset-meta']){
   const r=await reference.locator(selector).first().boundingBox(),f=await formal.locator(selector).first().boundingBox();assert.ok(r&&f,selector)
   for(const key of ['x','y','width','height'])assert.ok(Math.abs(r[key]-f[key])<=1,`${width} ${selector}.${key}: ${r[key]} vs ${f[key]}`)
  }
  for(const p of [reference,formal]){
   assert.equal(await p.locator('.context-heading').count(),0);
   assert.equal(await p.getByRole('button',{name:'添加图片',exact:true}).count(),1);
   await p.getByRole('textbox',{name:'搜索素材'}).focus();
   assert.equal(await p.locator('.dock-search').evaluate(e=>getComputedStyle(e).boxShadow),'none');
   assert.equal(await p.locator('.dock-search input').evaluate(e=>getComputedStyle(e).outlineStyle),'none');
   assert.equal(await p.locator('.floating-navigation button').first().evaluate(e=>getComputedStyle(e).borderRadius),'50%');
   assert.equal((await p.locator('.library-content').boundingBox()).y,0);
   await p.locator('.library-content').evaluate(e=>{e.scrollTop=150});
   assert.ok((await p.locator('.asset-art').first().boundingBox()).y<0,'scroll passes behind floating navigation to window edge');
   await p.locator('.library-content').evaluate(e=>{e.scrollTop=0});
   await p.getByRole('textbox',{name:'搜索素材'}).evaluate(e=>e.blur());
  }
  const selectors=['.dock-search-row','.dock-tag-row>button','.asset-overlay-tags>button','.icon-rail button']
  for(const selector of selectors){const get=p=>p.locator(selector).first().evaluate(e=>{const c=getComputedStyle(e);return ['backgroundColor','backdropFilter','borderTopWidth','borderRadius','fontSize'].map(k=>c[k])});assert.deepEqual(await get(formal),await get(reference),selector)}
  if(width===1379){const currentReference=await reference.screenshot({path:path.join(root,'prototype-all.png')});
   const goldenPath='docs/design/artifacts/edge-canvas-20260915/prototype-all.png';if(process.env.DAM_RECORD_GALLERY_BASELINE==='1'){await fs.mkdir(path.dirname(goldenPath),{recursive:true});await fs.writeFile(goldenPath,currentReference)}
   const golden=await sharp(goldenPath).raw().toBuffer({resolveWithObject:true});const current=await sharp(currentReference).raw().toBuffer({resolveWithObject:true});assert.deepEqual(current.info,golden.info);let changed=0;for(let i=0;i<current.data.length;i++)if(Math.abs(current.data[i]-golden.data[i])>4)changed++;assert.ok(changed/current.data.length<.005,'Approved reference screenshot drifted');await formal.screenshot({path:path.join(root,'formal-all.png')});
   const r=await reference.locator('.asset-art').first().screenshot(),f=await formal.locator('.asset-art').first().screenshot();const ra=await sharp(r).raw().toBuffer({resolveWithObject:true}),fa=await sharp(f).raw().toBuffer({resolveWithObject:true});assert.deepEqual(ra.info,fa.info);let differences=0;for(let i=0;i<ra.data.length;i++)if(Math.abs(ra.data[i]-fa.data[i])>4)differences++;const ratio=differences/ra.data.length;await fs.writeFile(path.join(root,'pixel-metric.json'),JSON.stringify({assetCardDifferentChannelsRatio:ratio}));assert.ok(ratio<.01,`card pixel delta ${ratio}`)
  }
  checks.push(`${width}px geometry, borderless glass tokens and type sizes`);
  const compare=async(selector)=>{const r=await reference.locator(selector).first().boundingBox(),f=await formal.locator(selector).first().boundingBox();assert.ok(r&&f,selector);for(const key of ['x','y','width','height'])assert.ok(Math.abs(r[key]-f[key])<=1,`${width} ${selector}.${key}: ${r[key]} vs ${f[key]}`)}
  await reference.locator('.asset-open').first().click();await formal.locator('.asset-open').first().click();await new Promise(r=>setTimeout(r,500));await compare('.side-inspector');await compare('.grid-slot');checks.push(`${width}px side-rail and shrink-to-fit packing`)
  await reference.getByRole('button',{name:'全部',exact:true}).click();await formal.getByRole('button',{name:'全部',exact:true}).click()
  await reference.getByRole('button',{name:'文件夹',exact:true}).click();await formal.getByRole('button',{name:'文件夹',exact:true}).click();await compare('.folder-object');await compare('.folder-front');if(width===1379){await reference.screenshot({path:path.join(root,'prototype-folders.png')});await formal.screenshot({path:path.join(root,'formal-folders.png')})}checks.push(`${width}px folder object and front-cover geometry`)
  await reference.getByRole('button',{name:'全部',exact:true}).click();await formal.getByRole('button',{name:'全部',exact:true}).click()
  await reference.locator('.asset-open').first().focus();await reference.keyboard.press('Space');await formal.locator('.asset-open').first().focus();await formal.keyboard.press('Space');await new Promise(r=>setTimeout(r,300));
  for(const selector of ['.focus-mode','.focus-header','.focus-stage','.focus-details','.canvas-tools','.canvas-viewport','.note-page-strip','.focus-filmstrip'])await compare(selector)
  await reference.getByRole('button',{name:'添加笔记',exact:true}).click();await formal.getByRole('button',{name:'添加笔记',exact:true}).click();await compare('.note-page-strip');if(width===1379){await reference.screenshot({path:path.join(root,'prototype-focus.png')});await formal.screenshot({path:path.join(root,'formal-focus.png')})}checks.push(`${width}px focus, tools, notes and filmstrip geometry`)
  await reference.keyboard.press('Escape');await formal.keyboard.press('Escape');
  await reference.getByRole('button',{name:'切换明暗外观',exact:true}).click();await formal.getByRole('button',{name:'切换明暗外观',exact:true}).click();
  for(const selector of selectors){const get=p=>p.locator(selector).first().evaluate(e=>{const c=getComputedStyle(e);return [c.backgroundColor,c.backdropFilter,c.borderTopWidth,c.color]});assert.deepEqual(await get(formal),await get(reference),selector+' dark')}
  await reference.getByRole('button',{name:'更多功能菜单',exact:true}).click();await formal.getByRole('button',{name:'更多功能菜单',exact:true}).click();const popupStyle=p=>p.locator('.dock-menu').evaluate(e=>{const c=getComputedStyle(e);return [c.width,c.backgroundColor,c.backdropFilter,c.borderRadius,c.borderTopWidth]});assert.deepEqual(await popupStyle(formal),await popupStyle(reference));if(width===1379){await reference.screenshot({path:path.join(root,'prototype-dark-menu.png')});await formal.screenshot({path:path.join(root,'formal-dark-menu.png')})}checks.push(`${width}px dark materials and menu`)
  await context.close()
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({checks,errors,frozenReference:Boolean(frozen),evidence:root},null,2))
}finally{await browser.close();await server.close()}
