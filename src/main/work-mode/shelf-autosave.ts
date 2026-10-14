import { validateWorkValue, type WorkSetValue, type WorkWindowSnapshot } from '../../shared/contracts/work-set.contract'
import type { ShelfAction,ShelfReply } from './native-shelf-actions'

/** One serialized content writer. An old completion cannot acknowledge newer input. */
export function createShelfAutosave(deps:{current:()=>WorkWindowSnapshot;hold:(value:WorkSetValue,revision:number)=>void;save:(value:WorkSetValue,revision:number,serial:number)=>Promise<WorkWindowSnapshot>;feedback:(message:string)=>void}) {
  let serial=0,version=0,base=deps.current().set.revision,value:WorkSetValue|undefined,timer:ReturnType<typeof setTimeout>|undefined,running:Promise<ShelfReply>|undefined,blocked=false,retired=false
  const waiters=new Map<number,(reply:ShelfReply)=>void>()
  const committed=(s:WorkWindowSnapshot)=>validateWorkValue({name:s.set.name,columns:s.set.columns,assetIds:s.set.assetIds})
  const flush=():Promise<ShelfReply>=>{
    clearTimeout(timer);timer=undefined
    if(running)return running.then(reply=>!reply.ok||blocked?reply:value?flush():reply)
    if(retired)return Promise.resolve({ok:false,message:'工作窗口已结束，未提交保存。'})
    if(blocked)return Promise.resolve({ok:false,message:'上次保存未确认，草稿保留。请核对后重试保存。'})
    if(!value)return Promise.resolve({ok:true,ack:serial})
    const submitted=structuredClone(value),stamp=version,ack=serial,revision=base
    const task=(async():Promise<ShelfReply>=>{
      try{
        const saved=await deps.save(submitted,revision,ack);base=saved.set.revision
        if(version===stamp)value=undefined;else if(value)deps.hold(value,base)
        const reply:ShelfReply={ok:true,ack};for(const [id,resolve]of waiters)if(id<=ack){waiters.delete(id);resolve(reply)}
        blocked=false;return reply
      }catch(error){blocked=true;const message=error instanceof Error?error.message:'保存未确认，草稿保留。';deps.feedback(message)
        const reply={ok:false,message};for(const resolve of waiters.values())resolve(reply);waiters.clear();return reply
      }finally{running=undefined}
    })();running=task;return task
  }
  const edit=(action:Extract<ShelfAction,{kind:'edit'}>):Promise<ShelfReply>=>{
    if(retired||action.serial<=serial)return Promise.resolve({ok:false,message:'编辑请求已失效。'})
    const s=deps.current(),next=structuredClone(value??committed(s));if(!value)base=s.set.revision
    if(action.field==='remove'){
      const ids=action.value as string[];if(ids.some(id=>!s.set.assetIds.includes(id)))throw Error('MEMBERSHIP_NOT_GRANTED')
      next.assetIds=next.assetIds.filter(id=>!ids.includes(id))
    }else next.name=action.value as string
    value=validateWorkValue(next);serial=action.serial;version++;try{deps.hold(value,base)}catch(error){blocked=true;const message=error instanceof Error?error.message:'恢复记录未保存，窗口保持。';deps.feedback(message);return Promise.resolve({ok:false,message})}
    const result=new Promise<ShelfReply>(resolve=>waiters.set(serial,resolve));clearTimeout(timer)
    if(!blocked)timer=setTimeout(()=>{void flush()},300)
    else{waiters.delete(serial);return Promise.resolve({ok:false,message:'上次保存未确认，当前输入保留，请核对后重试。'})}
    return result
  }
  return{edit,flush,retry:()=>{blocked=false;return flush()},rebase:(revision:number)=>{if(running)throw Error('保存正在执行，请等待结果。');base=revision;if(value)deps.hold(value,base);blocked=false;return flush()},recover:(held:WorkSetValue,revision:number)=>{value=validateWorkValue(held);version++;base=revision;deps.hold(value,base);if(base===deps.current().set.revision)timer=setTimeout(()=>{void flush()},300);else{blocked=true;deps.feedback('恢复草稿与当前工作集版本不同，输入保留，请核对后保存。')}},pending:()=>Boolean(value||running),blocked:()=>blocked,serial:()=>serial,dispose:()=>{retired=true;clearTimeout(timer);for(const resolve of waiters.values())resolve({ok:false,message:'工作窗口已结束。'});waiters.clear()}}
}
