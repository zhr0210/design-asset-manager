import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import assert from 'node:assert/strict'
import {createServer} from 'vite'
import react from '@vitejs/plugin-react'
import {chromium} from 'playwright'
const repo=process.cwd(),root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'dam-org-state-')))
await fs.symlink(path.join(repo,'node_modules'),path.join(root,'node_modules'),'dir')
await fs.writeFile(path.join(root,'index.html'),'<html><body><div id="root"></div><script type="module" src="/entry.tsx"></script></body></html>')
await fs.writeFile(path.join(root,'entry.tsx'),`import React,{useState}from'react';import{createRoot}from'react-dom/client';import{useLibraryOrganization}from ${JSON.stringify('/@fs/'+repo+'/src/renderer/components/library/canvas/useLibraryOrganization.ts')};
window.reads=[];window.writes=[];window.electronAPI={library:{organizationRead:input=>new Promise(resolve=>window.reads.push({input,resolve})),organizationWrite:input=>new Promise(resolve=>window.writes.push({input,resolve}))}};
const epoch=[];function App(){const [id,setId]=useState('A');window.select=setId;const model=useLibraryOrganization(id?{state:'ready',identity:id,generation:'gen'}:{state:'closed',identity:null,generation:null},epoch);window.model=model;return <div id="state" data-scope={id} data-revision={model.snapshot?.revision??-1} data-busy={model.busy} data-loading={model.loading}>{model.error}</div>};createRoot(document.getElementById('root')).render(<App/>);`)
const server=await createServer({configFile:false,root,plugins:[react()],resolve:{dedupe:['react','react-dom']},server:{host:'127.0.0.1',port:0,fs:{allow:[root,path.join(repo,'src'),path.join(repo,'node_modules')]}}});await server.listen();const browser=await chromium.launch(),page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message))
const settle=async(channel,index,revision)=>page.evaluate(({channel,index,revision})=>window[channel][index].resolve({success:true,value:{folders:[],revision,sessionToken:'session:'+window[channel][index].input.libraryIdentity,requiresUpgrade:false}}),{channel,index,revision})
const length=async(channel,n)=>page.waitForFunction(({channel,n})=>window[channel].length===n,{channel,n})
const revision=async(n)=>page.waitForFunction(n=>document.getElementById('state').dataset.revision===String(n),n)
try{
 await page.goto(`http://127.0.0.1:${server.httpServer.address().port}`);await length('reads',1);await page.evaluate(()=>window.select('B'));await length('reads',2);await settle('reads',1,5);await revision(5);await settle('reads',0,99);assert.equal(await page.locator('#state').getAttribute('data-revision'),'5')
 await page.evaluate(()=>{window.oldWrite=window.model.write({kind:'delete',folderId:'f'}).then(()=>false,()=>true)});await length('writes',1);await page.evaluate(()=>window.select('A'));await length('reads',3);await settle('reads',2,1);await revision(1)
 await page.evaluate(()=>{window.newWrite=window.model.write({kind:'delete',folderId:'f'}).catch(()=>null)});await length('writes',2);await settle('writes',0,6);assert.equal(await page.evaluate(()=>window.oldWrite),true);assert.equal(await page.locator('#state').getAttribute('data-busy'),'true');await settle('writes',1,2);await revision(2)
 // A refresh taken while a save is pending cannot overwrite the committed response.
 await page.evaluate(()=>{window.pending=window.model.write({kind:'delete',folderId:'f'}).catch(()=>null);void window.model.refresh()});await length('writes',3);await length('reads',4);await settle('writes',2,3);await revision(3);await settle('reads',3,2);assert.equal(await page.locator('#state').getAttribute('data-revision'),'3')
 // Reopening the same persistent identity does not let an old UI response through.
 await page.evaluate(()=>{window.stale=window.model.write({kind:'delete',folderId:'f'}).then(()=>false,()=>true);window.select('')});await length('writes',4);await page.waitForFunction(()=>window.model.snapshot===null);await page.evaluate(()=>window.select('A'));await length('reads',5);await settle('reads',4,4);await revision(4);await settle('writes',3,100);assert.equal(await page.evaluate(()=>window.stale),true);assert.equal(await page.locator('#state').getAttribute('data-revision'),'4');assert.deepEqual(errors,[])
 console.log('Organization React state: late reads, library switch, concurrent busy ownership, save/refresh ordering and same-identity reopen guards passed')
}finally{await browser.close();await server.close()}
