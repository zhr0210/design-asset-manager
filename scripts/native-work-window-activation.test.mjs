import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import vm from 'node:vm'
import {transform} from 'esbuild'
const source=await fs.readFile('src/main/work-mode/electron-work-window.ts','utf8')
const body=(await transform(source.slice(source.indexOf('export function')).replace('export function','function'),{loader:'ts'})).code
for(const platform of ['darwin','win32']){
 const events=[],handlers=new Map();let options
 const context=vm.createContext({process:{platform},Buffer,URL,Response,randomUUID:()=> 'fixture',app:{focus:input=>events.push(['app-focus',input])},session:{fromPartition:()=>({webRequest:{onBeforeRequest(){}},protocol:{handle(){},unhandle(){}}})},
  BrowserWindow:class{constructor(value){options=value;this.webContents={mainFrame:{},setWindowOpenHandler(){},on(){},isLoadingMainFrame:()=>false,send(){}}}on(name,fn){handlers.set(name,fn)}once(name,fn){handlers.set(name,fn)}loadURL(){return Promise.resolve()}isDestroyed(){return false}show(){events.push(['show'])}focus(){events.push(['window-focus'])}},
  isTrustedLibrarySender:()=>false,workMediaResponse(){},nativeImage:{}})
 vm.runInContext(body,context)
 const port=vm.runInContext("createElectronWorkWindow({entryUrl:'file:///fixture/index.html',preloadPath:'/fixture/preload',layout:{x:0,y:0,width:420,height:640,pinned:true,open:true},changed(){},closed(){},readPreview:async()=>new Uint8Array()})",context)
 assert.equal(options.acceptFirstMouse,platform==='darwin'?true:undefined)
 port.show();assert.deepEqual(events.map(e=>e[0]),platform==='darwin'?['show','app-focus','window-focus']:['show','window-focus'])
 events.length=0;handlers.get('ready-to-show')();assert.deepEqual(events.map(e=>e[0]),platform==='darwin'?['show','app-focus','window-focus']:['show','window-focus'])
 assert.equal(options.webPreferences.sandbox,true);assert.equal(options.webPreferences.nodeIntegration,false)
}
console.log('Actual native adapter accepts first Mac mouse, activates its own app before window focus on explicit show/readiness, preserves sandbox and Windows behavior. Controlled API test; physical mouse separately verified.')
