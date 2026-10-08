import type {MainIpcHandleRegistrar} from './ipc-registrar'
import type {MainInvokeContext} from '../local-host/client-context'
import type {createWorkMediaController} from '../work-mode/work-media-controller'
export function registerWorkMediaIpc(input:{controller?:ReturnType<typeof createWorkMediaController>;handle:MainIpcHandleRegistrar;isMain:(event:MainInvokeContext)=>boolean;owner:(event:MainInvokeContext)=>string}) {
  const denied={success:false,error:'当前会话没有此操作权限。',code:'UNTRUSTED_SENDER'}
  input.handle('work-files:list',(event,value)=>input.isMain(event)?input.controller?.listFiles(value)??{success:false,error:'交付服务尚未就绪。'}:denied)
  for(const name of ['status','enable','read','write','cancel','handoff','clear'] as const){
    const channel=name==='handoff'?'work-files:handoff':name==='clear'?'work-files:clear':'work-media:'+name
    input.handle(channel,(event,value)=>{
      if(!input.isMain(event))return denied
      const controller=input.controller;if(!controller)return{success:false,error:'视频与交付服务尚未就绪。',code:'CAPABILITY_UNAVAILABLE'}
      return name==='write'||name==='cancel'||name==='handoff'?controller[name](input.owner(event),value):controller[name](value)
    })
  }
}
