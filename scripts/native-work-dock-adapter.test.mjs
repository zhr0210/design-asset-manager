import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import vm from 'node:vm'
import {transform} from 'esbuild'
const source=await fs.readFile('src/main/work-mode/electron-work-window.ts','utf8')
const body=(await transform(source.slice(source.indexOf('export function')).replace('export function','function'),{loader:'ts'})).code
for(const initiallyDocked of [false,true]){
 const events=[];let options,bounds,destroyed=false,resizable
 const normal={x:200,y:100,width:420,height:640,pinned:true,open:true},compact={x:0,y:100,width:72,height:160,pinned:true,open:true,dock:{edge:'left',normalBounds:{x:200,y:100,width:420,height:640}}},layout=initiallyDocked?compact:normal
 const context=vm.createContext({process:{platform:'darwin'},Buffer,URL,Response,randomUUID:()=> 'fixture',app:{focus(){}},session:{fromPartition:()=>({webRequest:{onBeforeRequest(){}},protocol:{handle(){},unhandle(){}}})},
 BrowserWindow:class{constructor(value){options=value;bounds={x:value.x,y:value.y,width:value.width,height:value.height};resizable=value.resizable;this.webContents={mainFrame:{},setWindowOpenHandler(){},on(){},isLoadingMainFrame:()=>false,send(){}}}on(){}once(){}loadURL(){return Promise.resolve()}isDestroyed(){return destroyed}setMinimumSize(w,h){events.push(['minimum',w,h])}setResizable(value){resizable=value;events.push(['resizable',value])}setBounds(value){bounds={...value};events.push(['bounds',value])}getBounds(){return{...bounds}}isAlwaysOnTop(){return true}},
 isTrustedLibrarySender:()=>false,workMediaResponse(){},nativeImage:{}})
 vm.runInContext(body,context)
 context.layout=layout
 const port=vm.runInContext("createElectronWorkWindow({entryUrl:'file:///fixture/index.html',preloadPath:'/fixture/preload',layout,changed(){},closed(){},readPreview:async()=>new Uint8Array()})",context)
 assert.equal(options.minWidth,initiallyDocked?72:290);assert.equal(options.minHeight,initiallyDocked?160:310);assert.equal(resizable,!initiallyDocked)
 port.configureDock(compact);assert.deepEqual(events.slice(0,2),[['minimum',72,160],['resizable',false]]);assert.deepEqual(JSON.parse(JSON.stringify(port.bounds())),compact)
 const altered=port.bounds();if(altered.dock)altered.dock.normalBounds.x=9999;assert.equal(port.bounds().dock.normalBounds.x,200,'metadata snapshots cannot mutate retained expansion bounds')
 port.configureDock(normal);assert.deepEqual(events.slice(3,5),[['minimum',290,310],['resizable',true]]);assert.deepEqual(JSON.parse(JSON.stringify(port.bounds())),normal)
 destroyed=true;assert.throws(()=>port.configureDock(compact),/WORK_WINDOW_CLOSED/)
 assert.equal(options.webPreferences.sandbox,true);assert.equal(options.webPreferences.nodeIntegration,false)
}
console.log('Actual Electron dock adapter: constructor restores compact min/resize mode, configure changes physical window min/resize/bounds, expands to normal min, owned bounds metadata stays immutable, destroyed window refuses. Controlled native API; physical screen/drop separate.')
