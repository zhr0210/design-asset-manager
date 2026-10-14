import { app, screen } from 'electron'
import {createShelfMotionTrace} from './shelf-motion-trace'
import { parseShelfAction, type ShelfAction, type ShelfReply } from './native-shelf-actions'
import { spawn } from 'node:child_process'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { createHash, randomUUID } from 'node:crypto'
import { join } from 'node:path'
import { createInterface } from 'node:readline'
import { createElectronWorkWindow } from './electron-work-window'
import type { WorkWindowPort } from './work-window-controller'
import { validateWorkLayout, type WorkWindowLayout, type WorkWindowSnapshot } from '../../shared/contracts/work-set.contract'
import { SHELF_CANDIDATE_IDENTITY } from './shelf-candidate-identity.generated'
import {nativeShelfLayout} from './work-window-bounds'

export type NativeShelfIntent = { kind: 'dock'; edge: 'left' | 'right'; gestureId?:number;deltaX?:number } |
  {kind:'undock';gestureId?:number;restore?:{x:number;y:number;width:number;height:number}} | { kind: 'close' | 'hide' } | { kind: 'pin'; pinned: boolean }

/** Owned child pipes carry UI intent, never general IPC, paths or library SQL. */
export function createNativeShelfWorkWindow(
  input: Parameters<typeof createElectronWorkWindow>[0]
): WorkWindowPort {
  if (process.platform !== 'darwin' || process.arch !== SHELF_CANDIDATE_IDENTITY.arch) {
    throw Error('NATIVE_SHELF_PLATFORM_UNAVAILABLE')
  }
  const binary = join(__dirname, 'shelf-candidates/DAM Shelf B.app/Contents/MacOS/Shelf')
  if (createHash('sha256').update(readFileSync(binary)).digest('hex') !== SHELF_CANDIDATE_IDENTITY.binaryDigest) {
    throw Error('NATIVE_SHELF_RUNTIME_CHANGED')
  }
  const root = join(app.getPath('userData'), 'native-shelf-ui', randomUUID())
  mkdirSync(root, { recursive: true })
  let destroyed = false
  let ready = false
  let visible = false
  let sequence = 0
  let motionVersion=0
  const previewCache=new Map<string,string>(),metadataCache=new Map<string,{width:number|null;height:number|null}>()
  let previewBytes=0
  // Native compact presentation has its own actual geometry. The React detail
  // surface retains the original editor size; neither lies about OS bounds.
  let geometry = nativeShelfLayout(input.layout,screen.getAllDisplays().map(d=>d.workArea))
  const savedLayout=input.legacyLayout??input.layout
  if(!savedLayout.presentation||JSON.stringify(savedLayout)!==JSON.stringify(geometry))writeFileSync(join(root,'legacy-layout.json'),JSON.stringify(savedLayout),{flag:'wx',mode:0o600})
  let gestureVersion=0
  const motions=new Map<number,{resolve:()=>void;reject:(error:Error)=>void;timer:ReturnType<typeof setTimeout>;target:WorkWindowLayout}>()
  let dockTarget: WorkWindowLayout | undefined
  let handler: ((intent: NativeShelfIntent) => void) | undefined
  let actionHandler: ((action:ShelfAction)=>Promise<ShelfReply>) | undefined
  const freezing=new Map<string,{resolve:()=>void;reject:(error:Error)=>void}>()
  let focusAssetId:string|undefined
  let closedNotified = false
  let childClosed=false,finishExit!:()=>void,retirement:Promise<void>|undefined
  const actualExit=new Promise<void>(resolve=>{finishExit=resolve})
  const notifyClosed = () => { if (!closedNotified) { closedNotified = true; input.closed() } }
  const child = spawn(binary, ['--mode=b', `--state-root=${root}`], {
    stdio: ['pipe', 'pipe', 'pipe'], windowsHide: false,
    env: { PATH: '/usr/bin:/bin:/usr/sbin:/sbin', TMPDIR: app.getPath('temp'), LANG: 'en_US.UTF-8' }
  })
  const queued: Record<string, unknown>[] = []
  const trace=createShelfMotionTrace(root),recordMotion=trace.record
  const send = (value: Record<string, unknown>) => {
    if (destroyed || child.stdin.destroyed) return
    if (!ready) { queued.push(value); return }
    const command=value.op==='bounds'?{...value,motionId:value.motionId??++motionVersion,gestureId:value.gestureId??gestureVersion}:value
    if(command.op==='bounds')recordMotion({phase:'command',frameSource:'requested',motionId:command.motionId,gestureId:command.gestureId,deltaX:command.deltaX,x:command.x,y:command.y,width:command.width,height:command.height,docked:command.docked})
    child.stdin.write(JSON.stringify(command) + '\n')
  }
  const geometryCommand = (layout: WorkWindowLayout) => ({
    op: 'bounds', x: layout.x, y: layout.y, width: layout.width, height: layout.height,
    ...(layout.expansion?{expansion:layout.expansion}:{}),presentation:layout.presentation??'compact',docked: Boolean(layout.dock), ...(layout.dock ? { normal: layout.dock.normalBounds } : {})
  })
  // The existing sandboxed renderer remains the complex editing surface; its
  // authenticated frame/member APIs are not exposed to the native child.
  let detail: WorkWindowPort | undefined
  let latestSnapshot: WorkWindowSnapshot | null = null
  const ensureDetail = () => {
    if (destroyed) throw Error('WORK_WINDOW_CLOSED')
    if (!detail) {
      const area=screen.getDisplayMatching(geometry).workArea
      const width=Math.min(1200,Math.round(area.width*.9)),height=Math.min(780,Math.round(area.height*.9))
      detail = createElectronWorkWindow({ ...input,
        layout: { x:Math.round(area.x+(area.width-width)/2),y:Math.round(area.y+(area.height-height)/2),width,height,open:true,pinned:true },
        initiallyHidden: true,
        changed: () => {}, closed: () => { detail=undefined } })
      detail.publish(latestSnapshot ? {...latestSnapshot,focusOnly:true,focusAssetId} : null)
    }
    return detail
  }
  const lines = createInterface({ input: child.stdout })
  lines.on('line', line => {
    if (destroyed) return
    if (line.length > 65536) { port.destroy(); return }
    try {
      const event: unknown = JSON.parse(line)
      if (!event || typeof event !== 'object' || Array.isArray(event)) throw Error()
      const e = event as Record<string, unknown>
      if (e.event === 'ready' && e.version === 3 && !ready) {
        ready = true
        child.stdin.write(JSON.stringify({ op: 'pin', pinned: geometry.pinned }) + '\n')
        if(!queued.some(command=>command.op==='bounds'))send(geometryCommand(geometry))
        for (const command of queued.splice(0)) send(command)
      } else if(e.event==='motionAck'){
        const pending=motions.get(Number(e.motionId));if(!pending)return
        motions.delete(Number(e.motionId));clearTimeout(pending.timer)
        recordMotion({phase:'ack',...e})
        try{
         if(e.status==='failed')throw Object.assign(Error('原生窗口拒绝了运动请求，布局未保存。'),{code:'WORK_MOTION_FAILED'})
         if(e.status!=='completed'||e.gestureId!==gestureVersion)throw Object.assign(Error('窗口移动已由新输入接管。'),{code:'WORK_MOTION_CANCELED'})
         geometry=validateWorkLayout({x:e.x,y:e.y,width:e.width,height:e.height,...(e.expansion?{expansion:e.expansion}:{}),presentation:e.presentation,pinned:geometry.pinned,open:true,...(e.docked&&dockTarget?.dock?{dock:dockTarget.dock}:{})})
         if(['x','y','width','height'].some(key=>Math.abs(Number(geometry[key as keyof WorkWindowLayout])-Number(pending.target[key as keyof WorkWindowLayout]))>1))throw Object.assign(Error('实际窗口位置与目标不符，未保存布局。'),{code:'WORK_MOTION_FRAME_MISMATCH'})
         pending.resolve()
        }catch(error){pending.reject(error instanceof Error?error:Error('INVALID_MOTION_ACK'))}
      } else if (e.event === 'geometry') {
        recordMotion({phase:'geometry',motionId:e.motionId,currentMotionId:motionVersion,x:e.x,y:e.y,width:e.width,height:e.height,docked:e.docked})
        if(e.motionId!==motionVersion||Number(e.gestureId)<gestureVersion)return
        const next = validateWorkLayout({ x: e.x, y: e.y, width: e.width, height: e.height,
          open: true, pinned: geometry.pinned,presentation:e.presentation,...(e.expansion?{expansion:e.expansion}:{}),
          ...(e.docked === true && dockTarget?.dock ? { dock: dockTarget.dock } : {}) })
        geometry = next
        input.changed()
      } else if(e.event==='motion'&&typeof e.phase==='string'){
        if(e.phase==='begin'&&Number.isSafeInteger(e.gestureId)){gestureVersion=Math.max(gestureVersion,Number(e.gestureId))}
        recordMotion({...e,phase:'native-'+e.phase})
      } else if (e.event === 'visibility' && typeof e.visible === 'boolean') {
        visible = e.visible
        input.changed()
      } else if(e.event==='frozen'&&typeof e.requestId==='string'){
        const pending=freezing.get(e.requestId);freezing.delete(e.requestId)
        if(e.ok===true)pending?.resolve();else pending?.reject(Error('请先结束文字输入，并等待拖入任务返回；窗口保留。'))
      } else if(e.event==='action') {
        if(typeof e.requestId!=='string'||e.requestId.length>100)throw Error()
        const {event:_event,requestId,...value}=e
        const action=parseShelfAction(value)
        if(!actionHandler)throw Error('NATIVE_SHELF_HANDLER_UNAVAILABLE')
        void actionHandler(action).then(reply=>send({op:'reply',requestId,...reply})).catch(()=>send({op:'reply',requestId,ok:false,message:'操作未完成，当前内容保留。'}))
      } else if (e.event === 'dockIntent' && (e.edge === 'left' || e.edge === 'right')) {
        recordMotion({phase:'dockIntent',edge:e.edge})
        if(!Number.isSafeInteger(e.gestureId)||e.gestureId!==gestureVersion||typeof e.deltaX!=='number'||!Number.isFinite(e.deltaX))return
        handler?.({ kind: 'dock', edge: e.edge,gestureId:e.gestureId as number,deltaX:e.deltaX })
      } else if (e.event === 'undockIntent') {
        const restore=e.restore===undefined?undefined:validateWorkLayout({...e.restore as Record<string,unknown>,pinned:geometry.pinned,open:true})
        recordMotion({phase:'undockIntent',...(restore?{restore:{x:restore.x,y:restore.y,width:restore.width,height:restore.height}}:{})})
        if(!Number.isSafeInteger(e.gestureId)||e.gestureId!==gestureVersion)return
        handler?.({kind:'undock',gestureId:e.gestureId as number,...(restore?{restore:{x:restore.x,y:restore.y,width:restore.width,height:restore.height}}:{})})
      }
      else if (e.event === 'pin' && typeof e.pinned === 'boolean') handler?.({ kind: 'pin', pinned: e.pinned })
      else if (e.event === 'closeRequested') handler?.({ kind: 'close' })
      else if (e.event === 'hidden') { visible = false; handler?.({ kind: 'hide' }) }
    } catch {
      send({ op: 'feedback', message: '窗口状态无效，未提交保存。' })
    }
  })
  // Drain stderr without exposing process environment or uncontrolled logs.
  // Bounded diagnostics from this owned AppKit helper, without environment/memory dumps.
  let nativeDiagnostic=''
  child.stderr.on('data', data => { nativeDiagnostic=(nativeDiagnostic+String(data)).slice(-4096) })
  child.stdin.on('error',()=>{if(!destroyed){destroyed=true;detail?.destroy();child.kill('SIGTERM')}})
  child.once('error', () => { if (!destroyed) { destroyed = true; detail?.destroy() } })
  child.once('close', (code,signal) => {childClosed=true;for(const pending of motions.values()){clearTimeout(pending.timer);pending.reject(Error('WORK_WINDOW_CLOSED'))};motions.clear();void trace.flush();finishExit();notifyClosed(); lines.close();if(!destroyed)writeFileSync(join(root,'native-failure.json'),JSON.stringify({code,signal,diagnostic:nativeDiagnostic})); if (!destroyed) { destroyed = true; detail?.destroy(); notifyClosed() } })
  const publish = (snapshot: WorkWindowSnapshot | null) => {
    latestSnapshot = snapshot
    detail?.publish(snapshot ? {...snapshot,focusOnly:true,focusAssetId} : null)
    const current = ++sequence
    if (!snapshot) { send({ op: 'hide' }); return }
    const value=snapshot.draft??snapshot.set
    const itemValues=()=>value.assetIds.map(id=>{
      const asset=snapshot.assets.find(a=>a.id===id)
      return {id,fileName:asset?.fileName??'不可用参考',fileType:asset?.fileType??'png',imageKey:asset?[asset.revision,asset.thumbnailRef].join('|'):'',width:asset?.width,height:asset?.height,available:Boolean(asset)&&!snapshot.set.unavailableIds.includes(id)}
    })
    const assetKey=(id:string)=>{const a=snapshot.assets.find(a=>a.id===id);return a?[id,a.revision,a.thumbnailRef].join('|'):id}
    const validKeys=new Set(snapshot.assets.map(a=>assetKey(a.id)))
    for(const [key,encoded]of previewCache)if(!validKeys.has(key)){previewBytes-=Buffer.byteLength(encoded,'base64');previewCache.delete(key)}
    for(const key of metadataCache.keys())if(!validKeys.has(key))metadataCache.delete(key)
    const cachedItems=()=>itemValues().map(item=>({...item,...metadataCache.get(assetKey(item.id)),...(previewCache.has(assetKey(item.id))?{preview:previewCache.get(assetKey(item.id))}:{})}))
    send({ op: 'publish', libraryIdentity:snapshot.scope.libraryIdentity,generation:snapshot.scope.generation,name: value.name, colors: value.colors,note:value.note,ack:snapshot.nativeSaveSerial??0,items:cachedItems() })
    void (async () => {
      for (const asset of snapshot.assets.slice(0, 200)) {
        if (snapshot.set.unavailableIds.includes(asset.id)) continue
        const url = `dam-preview://preview/${encodeURIComponent(snapshot.scope.libraryIdentity)}/${encodeURIComponent(snapshot.scope.generation)}/${encodeURIComponent(asset.id)}`
        try {
          const key=assetKey(asset.id)
          if((!asset.width||!asset.height)&&input.readMetadata&&!metadataCache.has(key))metadataCache.set(key,await input.readMetadata(asset.id))
          if(!previewCache.has(key)){
           const bytes = await input.readPreview(url)
           if (bytes.byteLength <= 8 * 1024 * 1024 && previewBytes + bytes.byteLength <= 8 * 1024 * 1024) {
            previewBytes += bytes.byteLength
            previewCache.set(key,Buffer.from(bytes).toString('base64'))
           }
          }
        } catch { /* Unavailable member stays unavailable; no arbitrary file fallback. */ }
        if (destroyed || sequence !== current) return
      }
      if (!destroyed && sequence === current) send({ op: 'publish', libraryIdentity:snapshot.scope.libraryIdentity,generation:snapshot.scope.generation,name: value.name, colors: value.colors,note:value.note,ack:snapshot.nativeSaveSerial??0,
        items:cachedItems() })
    })()
  }
  const port: WorkWindowPort = {
    traceLayoutSave:layout=>{const identity={motionId:motionVersion,gestureId:gestureVersion,x:layout.x,y:layout.y,width:layout.width,height:layout.height,presentation:layout.presentation,docked:Boolean(layout.dock)};recordMotion({phase:'host-save-request',...identity});return status=>recordMotion({phase:'host-save-'+status,...identity})},
    publish,
    bindNativeIntents: listener => { handler = listener },
    bindShelfActions: listener => { actionHandler=listener },
    openFocus: assetId=>{if(detail?.visible()){detail.hide();send({op:'show',focus:true});return}focusAssetId=assetId;const surface=ensureDetail();surface.publish(latestSnapshot?{...latestSnapshot,focusOnly:true,focusAssetId}:null);surface.show()},
    closeFocus:()=>{detail?.hide();send({op:'show',focus:true})},
    feedback: message=>send({op:'feedback',message}),
    freeze:value=>{
      if(destroyed)return childClosed?Promise.resolve():Promise.reject(Error('原生窗口进程尚未结束。'))
      const requestId=randomUUID()
      return new Promise<void>((resolve,reject)=>{
        const timer=setTimeout(()=>{freezing.delete(requestId);reject(Error('原生窗口输入冻结尚未确认，当前窗口保留。'))},3000)
        freezing.set(requestId,{resolve:()=>{clearTimeout(timer);resolve()},reject:error=>{clearTimeout(timer);reject(error)}})
        send({op:'freeze',value,requestId})
      })
    },
    show: () => { send({ op: 'show' }) },
    showDetail: () => send({op:'show'}),
    hide: () => { send({ op: 'hide' }); detail?.hide() },
    destroy: () => {
      if(retirement)return retirement
      if(childClosed)return Promise.resolve()
      ready=true;send({op:'destroy'});destroyed=true;sequence++;handler=undefined;actionHandler=undefined;visible=false
      detail?.destroy();latestSnapshot=null;child.stdin.end()
      retirement=new Promise<void>((resolve,reject)=>{
        const terminate=setTimeout(()=>{if(!childClosed)child.kill('SIGTERM')},2000)
        const deadline=setTimeout(()=>{if(!childClosed)reject(Error('原生窗口进程尚未确认退出，未释放窗口资格。'))},5000)
        terminate.unref();deadline.unref()
        void actualExit.then(()=>{clearTimeout(terminate);clearTimeout(deadline);resolve()})
      })
      return retirement
    },
    setPinned: value => { geometry = { ...geometry, pinned: value }; send({ op: 'pin', pinned: value }); detail?.setPinned(value) },
    bounds: () => ({ ...geometry, ...(geometry.dock ? { dock: { ...geometry.dock, normalBounds: { ...geometry.dock.normalBounds } } } : {}) }),
    setBounds: value => { dockTarget = value; send(geometryCommand(value)) },
    edgeDock:true,
    configureDock: (value,options) => {
      if(options?.gestureId!==undefined&&options.gestureId!==gestureVersion)return Promise.reject(Object.assign(Error('旧拖动已失效。'),{code:'WORK_MOTION_CANCELED'}))
      const next=nativeShelfLayout(value,screen.getAllDisplays().map(d=>d.workArea))
      dockTarget=next
      const id=++motionVersion
      return new Promise<void>((resolve,reject)=>{
        const timer=setTimeout(()=>{motions.delete(id);reject(Error('原生窗口运动未确认，位置未提交保存。'))},3000)
        motions.set(id,{resolve,reject,timer,target:next});send({...geometryCommand(next),motionId:id,deltaX:options?.deltaX??0})
      })
    },
    visible: () => visible && !destroyed,
    isTrusted: event => !destroyed && detail?.isTrusted(event) === true,
    readFileIcon: async file => {
      const surface = ensureDetail()
      if (!surface.readFileIcon) throw Error('NATIVE_FILE_ICON_UNAVAILABLE')
      return surface.readFileIcon(file)
    },
    startDrag: (file, icon) => {
      const surface = ensureDetail()
      if (!surface.startDrag) throw Error('NATIVE_DRAG_UNAVAILABLE')
      surface.startDrag(file, icon)
    },
    startDragFiles: (files, icon) => {
      const surface = ensureDetail()
      if (!surface.startDragFiles) throw Error('NATIVE_DRAG_UNAVAILABLE')
      surface.startDragFiles(files, icon)
    }
  }
  return port
}
