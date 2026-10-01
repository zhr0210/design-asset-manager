import {BrowserWindow,session} from 'electron'
import {randomUUID} from 'node:crypto'
import type {WorkWindowLayout,WorkWindowSnapshot} from '../../shared/contracts/work-set.contract'
import {WORK_WINDOW_STATE} from '../../shared/contracts/work-set.contract'
import {isTrustedLibrarySender} from '../trusted-sender'
import type {WorkWindowPort} from './work-window-controller'
export function createElectronWorkWindow(input:{entryUrl:string;preloadPath:string;layout:WorkWindowLayout;changed:()=>void;closed:()=>void;readPreview:(url:string)=>Promise<Uint8Array>}):WorkWindowPort {
 const isolated=session.fromPartition('work-window:'+randomUUID()),entry=new URL(input.entryUrl)
 isolated.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*']},(details,callback)=>{let allowed=false;try{allowed=entry.protocol.startsWith('http')&&new URL(details.url).origin===entry.origin}catch{}callback({cancel:!allowed})})
 isolated.protocol.handle('dam-preview',async request=>{try{const bytes=await input.readPreview(request.url);return new Response(Buffer.from(bytes),{headers:{'Content-Type':bytes[0]===137?'image/png':bytes[0]===255?'image/jpeg':'image/webp','Cache-Control':'no-store'}})}catch{return new Response('Unavailable',{status:403})}})
 const w=new BrowserWindow({...input.layout,minWidth:290,minHeight:310,frame:false,transparent:true,roundedCorners:true,show:false,alwaysOnTop:input.layout.pinned,backgroundColor:'#00000000',autoHideMenuBar:true,
 // CSS backdrop-filter cannot soften other applications behind a transparent native window.
 ...(process.platform==='darwin'?{vibrancy:'under-window' as const,visualEffectState:'active' as const}:{}),
 webPreferences:{preload:input.preloadPath,session:isolated,contextIsolation:true,nodeIntegration:false,sandbox:true}})
 let latest:WorkWindowSnapshot|null=null,revoked=false
 const frame=w.webContents.mainFrame,publish=()=>{if(!w.isDestroyed()&&!w.webContents.isLoadingMainFrame()){if(latest)w.setTitle(latest.set.name);w.webContents.send(WORK_WINDOW_STATE,latest)}}
 w.webContents.setWindowOpenHandler(()=>({action:'deny'}));w.webContents.on('will-navigate',e=>e.preventDefault());w.webContents.on('did-finish-load',publish)
 w.once('ready-to-show',()=>{if(!w.isDestroyed())w.show()});w.on('move',input.changed);w.on('resize',input.changed)
 // Closing the reference surface hides it, keeping its unsaved draft available for restore.
 w.on('close',event=>{if(!revoked){event.preventDefault();w.hide()}})
 w.once('closed',()=>{isolated.protocol.unhandle('dam-preview');input.closed()})
 void w.loadURL(input.entryUrl.split('#')[0]+'#/work-window').catch(()=>{revoked=true;w.destroy()})
 return{publish:value=>{latest=value;publish()},show:()=>{if(!w.isDestroyed()){w.show();w.focus()}},hide:()=>{if(!w.isDestroyed())w.hide()},destroy:()=>{revoked=true;if(!w.isDestroyed())w.destroy()},setPinned:p=>{if(!w.isDestroyed())w.setAlwaysOnTop(p)},bounds:()=>({...w.getBounds(),pinned:w.isAlwaysOnTop(),open:true}),setBounds:b=>{if(!w.isDestroyed())w.setBounds({x:b.x,y:b.y,width:b.width,height:b.height})},isTrusted:event=>isTrustedLibrarySender(event as Parameters<typeof isTrustedLibrarySender>[0],w,input.entryUrl,frame)}
}
