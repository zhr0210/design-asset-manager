import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import vm from 'node:vm'
import {transform} from 'esbuild'
const source=await fs.readFile('src/main/work-mode/electron-work-window.ts','utf8')
const body=(await transform(source.slice(source.indexOf('export function')).replace('export function','function'),{loader:'ts'})).code
const calls=[],icon={resize:()=>icon};let destroyed=false
const context=vm.createContext({process:{platform:'darwin'},Buffer,URL,Response,randomUUID:()=> 'fixture',app:{focus(){}},session:{fromPartition:()=>({webRequest:{onBeforeRequest(){}},protocol:{handle(){},unhandle(){}}})},
 BrowserWindow:class{constructor(){this.webContents={mainFrame:{},setWindowOpenHandler(){},on(){},isLoadingMainFrame:()=>false,send(){},startDrag:input=>calls.push(input)}}on(){}once(){}loadURL(){return Promise.resolve()}isDestroyed(){return destroyed}},
 isTrustedLibrarySender:()=>false,workMediaResponse(){},nativeImage:{createFromBuffer:bytes=>{assert.deepEqual(bytes,Buffer.from([1,2,3]));return icon}}})
vm.runInContext(body,context)
const port=vm.runInContext("createElectronWorkWindow({entryUrl:'file:///fixture/index.html',preloadPath:'/fixture/preload',layout:{x:0,y:0,width:420,height:640,pinned:true,open:true},changed(){},closed(){},readPreview:async()=>new Uint8Array()})",context)
port.startDragFiles(['/owned/one.png','/owned/two.png'],Uint8Array.from([1,2,3]))
assert.equal(calls.length,1);assert.deepEqual(calls[0].files,['/owned/one.png','/owned/two.png']);assert.equal(calls[0].icon,icon);assert.equal(calls[0].file,'/owned/one.png')
port.startDrag('/owned/one.png',Uint8Array.from([1,2,3]));assert.equal(calls[1].file,'/owned/one.png');assert.equal('files'in calls[1],false)
destroyed=true;assert.throws(()=>port.startDragFiles(['/owned/one.png'],Uint8Array.from([1,2,3])),/WORK_WINDOW_CLOSED/);assert.equal(calls.length,2)
console.log('Actual Electron adapter: batch uses one startDrag({files,icon}) with Electron 30 required fallback file, legacy single-file remains compatible, destroyed window refuses.')
