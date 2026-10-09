import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import vm from 'node:vm'
import {transform} from 'esbuild'
const source=await fs.readFile('src/main/work-mode/electron-work-window.ts','utf8'),body=(await transform(source.slice(source.indexOf('export function')).replace('export function','function'),{loader:'ts'})).code
const iconRequests=[],drags=[],png=Buffer.from([137,80,78,71]),icon={resize:()=>icon};let destroyed=false,closeDuringIcon=false
const context=vm.createContext({process:{platform:'darwin'},Buffer,URL,Response,randomUUID:()=> 'fixture',app:{focus(){},getFileIcon:async(file,options)=>{iconRequests.push({file,options});if(closeDuringIcon)destroyed=true;return{toPNG:()=>png}}},session:{fromPartition:()=>({webRequest:{onBeforeRequest(){}},protocol:{handle(){},unhandle(){}}})},
 BrowserWindow:class{constructor(){this.webContents={mainFrame:{},setWindowOpenHandler(){},on(){},isLoadingMainFrame:()=>false,send(){},startDrag:input=>drags.push(input)}}on(){}once(){}loadURL(){return Promise.resolve()}isDestroyed(){return destroyed}},isTrustedLibrarySender:()=>false,workMediaResponse(){},nativeImage:{createFromBuffer:bytes=>{assert.deepEqual(bytes,png);return icon}}})
vm.runInContext(body,context)
const port=vm.runInContext("createElectronWorkWindow({entryUrl:'file:///fixture/index.html',preloadPath:'/fixture/preload',layout:{x:0,y:0,width:420,height:640,pinned:true,open:true},changed(){},closed(){},readPreview:async()=>new Uint8Array()})",context)
const bytes=await port.readFileIcon('/verified-owned/archive.zip');assert.deepEqual(bytes,png);assert.deepEqual(JSON.parse(JSON.stringify(iconRequests)),[{file:'/verified-owned/archive.zip',options:{size:'normal'}}])
port.startDrag('/verified-owned/archive.zip',bytes);assert.equal(drags.length,1);assert.equal(drags[0].file,'/verified-owned/archive.zip');assert.equal(drags[0].icon,icon)
port.startDragFiles(['/verified-owned/archive.zip','/verified-owned/image.png'],bytes);assert.equal(drags.length,2);assert.deepEqual(drags[1].files,['/verified-owned/archive.zip','/verified-owned/image.png']);assert.equal(drags[1].icon,icon)
closeDuringIcon=true;await assert.rejects(port.readFileIcon('/verified-owned/archive.zip'),/WORK_WINDOW_CLOSED/);assert.equal(drags.length,2)
await assert.rejects(port.readFileIcon('/verified-owned/archive.zip'),/WORK_WINDOW_CLOSED/);assert.equal(iconRequests.length,2,'destroyed window does not start another file-icon request')
console.log('Actual Electron adapter: owned file icon uses app.getFileIcon(normal).toPNG, single/batch startDrag receives that image and verified files, close during icon lookup or before request refuses. Controlled native API; actual OS icon/drop qualification separate.')
