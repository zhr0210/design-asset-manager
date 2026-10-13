// Production FocusView/Canvas in Chromium. Controlled notebooks, no Library or
// Host, and therefore no native-window/OS acceptance claim.
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {pathToFileURL} from 'node:url'
import {build} from 'esbuild'
import {chromium} from 'playwright'
const root=await fs.mkdtemp(path.join(os.tmpdir(),'dam-focus-interaction-'))
await build({bundle:true,platform:'browser',format:'iife',outfile:path.join(root,'fixture.js'),logLevel:'silent',stdin:{resolveDir:process.cwd(),loader:'jsx',contents:`
 import React,{useState} from 'react';import {createRoot} from 'react-dom/client';
 import {FocusView} from './src/renderer/components/gallery/FocusView';
 import './src/renderer/components/gallery/tokens.css';import './src/renderer/components/gallery/gallery.css';import './src/renderer/routes/work-shelf-focus.css';
 const image='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240"><rect width="320" height="240" fill="teal"/></svg>');
 const items=[{id:'one',title:'First',src:image,kind:'image'},{id:'two',title:'Second',src:image,kind:'image'}];
 let books={},holdRead=false,release;
 const notebook={load:()=>books,hold:b=>books=b,dirty:()=>false,save:async()=>{},saveLabel:'Saved',ensure:async id=>{if(holdRead){holdRead=false;await new Promise(r=>release=r)}books={...books,[id]:{pages:[],active:null}};return books}};
 window.fixture={delayRead:()=>holdRead=true,release:()=>release?.()};
 function App(){const[id,setId]=useState('one'),[closed,setClosed]=useState(0),[shelf,setShelf]=useState(true);return <main className="gallery-design minimal-prototype native-work-surface work-shelf-focus"><button onClick={()=>setShelf(false)}>Main focus variant</button><output>{closed}</output><FocusView shelfPresentation={shelf} asset={items.find(a=>a.id===id)} items={items} change={setId} close={()=>setClosed(n=>n+1)} details={<div className="gallery-details"><div className="inspector-scroll"><input aria-label="Detail text"/><p>Details</p></div></div>} video={null} notebook={notebook}/></main>}
 createRoot(document.getElementById('root')).render(<App/>);
`}})
await fs.writeFile(path.join(root,'index.html'),'<meta charset="utf-8"><link rel="stylesheet" href="fixture.css"><div id="root"></div><script src="fixture.js"></script>')
const browser=await chromium.launch({headless:true})
try{
 const page=await browser.newPage({viewport:{width:1100,height:750}});await page.goto(pathToFileURL(path.join(root,'index.html')).href)
 const viewport=page.locator('.canvas-viewport');await viewport.waitFor();await page.waitForFunction(()=>!document.querySelector('.focus-canvas').inert)
 assert.equal(await page.getByRole('button',{name:'上一张',exact:true}).count(),0);assert.equal(await page.getByRole('button',{name:'下一张',exact:true}).count(),0)
 assert.equal(await page.locator('.focus-header .focus-title').count(),0);assert.equal(await page.locator('.focus-header>span').count(),0)
 assert.equal(await page.locator('.focus-stage>.focus-filmstrip').count(),1);assert.equal(await page.locator('.focus-details .focus-filmstrip').count(),0);assert.equal(await page.locator('.canvas-image-frame').evaluate(e=>getComputedStyle(e).borderRadius),'0px');assert.equal(await page.locator('.focus-preview-thumbnail').first().evaluate(e=>getComputedStyle(e).borderRadius),'8px')
 const box=await viewport.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2)
 const initial=await viewport.getAttribute('data-zoom');await page.mouse.wheel(0,80);assert.equal(await viewport.getAttribute('data-zoom'),initial)
 await page.keyboard.down('Shift');await page.mouse.wheel(0,80);await page.keyboard.up('Shift');await page.waitForFunction(v=>document.querySelector('.canvas-viewport').dataset.zoom!==v,initial)
 await page.getByRole('button',{name:'切换到 Second'}).focus();await page.keyboard.press('Space');assert.equal(await page.locator('output').textContent(),'1');assert.equal(await page.locator('.focus-filmstrip button[aria-current=true]').getAttribute('data-focus-id'),'one')
 await page.getByRole('textbox',{name:'Detail text'}).fill('retained');await page.keyboard.press('Space');assert.equal(await page.locator('output').textContent(),'1')
 await page.evaluate(()=>window.fixture.delayRead());await page.getByRole('button',{name:'切换到 Second'}).click();await page.waitForFunction(()=>document.querySelector('.focus-filmstrip button[aria-current=true]').dataset.focusId==='two')
 assert.equal(await page.locator('.canvas-viewport').count(),1);assert.equal(await page.getByText('正在读取笔记…',{exact:true}).count(),0)
 await page.evaluate(()=>window.fixture.release());await page.waitForFunction(()=>!document.querySelector('.focus-canvas').inert)
 // Exercise the same shared wheel rule in the main Library focus variant.
 await page.evaluate(()=>document.querySelector('button').click());await page.getByRole('button',{name:'下一张',exact:true}).waitFor()
 const mainBefore=await viewport.getAttribute('data-zoom');await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.wheel(0,80);assert.equal(await viewport.getAttribute('data-zoom'),mainBefore)
 await page.keyboard.down('Shift');await page.mouse.wheel(0,80);await page.keyboard.up('Shift');await page.waitForFunction(v=>document.querySelector('.canvas-viewport').dataset.zoom!==v,mainBefore)
 console.log('PASS production shelf Space closes without switching/button activation; editable Space retained; Shift-only zoom in shelf/main; stripped header/left filmstrip below notes, square main image/rounded shadow thumbnails; deferred notebook read preserves mounted canvas. Chromium component test only.')
}finally{await browser.close();await fs.rm(root,{recursive:true,force:true})}
