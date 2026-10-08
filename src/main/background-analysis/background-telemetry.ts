import os from 'node:os'
import {powerMonitor} from 'electron'
import type {BackgroundTelemetry,Signal} from './background-resource-policy'
/** Read-only coarse host evidence; unsupported signals stay unknown. No Worker/Runtime/cache access. */
export function sampleBackgroundTelemetry(visible:boolean,now=performance.now()):BackgroundTelemetry{
 const known=<T>(value:T):Signal<T>=>({kind:'known',value,sampledAt:now}),read=<T>(fn:()=>T):Signal<T>=>{try{return known(fn())}catch{return{kind:'unknown'}}}
 const thermal=read(()=>powerMonitor.getCurrentThermalState()),idle=read(()=>powerMonitor.getSystemIdleState(2))
 return{memory:read(()=>({free:os.freemem(),total:os.totalmem()})),battery:read(()=>powerMonitor.isOnBatteryPower()),lowPower:{kind:'unknown'},thermal:thermal.kind==='known'&&thermal.value!=='unknown'?known(thermal.value):{kind:'unknown'},idle:idle.kind==='known'&&idle.value!=='unknown'?known(idle.value):{kind:'unknown'},visible:known(visible),gpuFree:{kind:'unknown'}}
}
