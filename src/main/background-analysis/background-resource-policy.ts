export type Signal<T>={kind:'known';value:T;sampledAt:number}|{kind:'unknown'}
export interface BackgroundTelemetry {memory:Signal<{free:number;total:number}>;battery:Signal<boolean>;lowPower:Signal<boolean>;thermal:Signal<'nominal'|'fair'|'serious'|'critical'>;idle:Signal<'active'|'idle'|'locked'>;visible:Signal<boolean>;gpuFree:Signal<number>}
/** A trusted adapter must supply qualification. B01 production supplies null, never a backend URL. */
export interface QualifiedBackgroundEnvelope {ownership:'host-owned'|'unowned';verified:boolean;peakRamBytes:number;accelerator:'cpu'|'gpu';peakGpuBytes?:number;lightOnBattery:boolean}
export const BACKGROUND_RESOURCE_PROFILE=Object.freeze({version:'background-readiness-v1',freshMs:10000,memoryReserveBytes:512*1024*1024,memoryReserveFraction:.1})
export function evaluateBackgroundReadiness(t:BackgroundTelemetry,envelope:QualifiedBackgroundEnvelope|null,now:number){
 const reasons:string[]=[],fresh=<T>(s:Signal<T>):T|undefined=>s.kind==='known'&&Number.isFinite(s.sampledAt)&&Number.isFinite(now)&&now>=s.sampledAt&&now-s.sampledAt<=BACKGROUND_RESOURCE_PROFILE.freshMs?s.value:undefined
 const memory=fresh(t.memory),battery=fresh(t.battery),low=fresh(t.lowPower),thermal=fresh(t.thermal),idle=fresh(t.idle),visible=fresh(t.visible)
 const validMemory=memory&&Number.isSafeInteger(memory.free)&&Number.isSafeInteger(memory.total)&&memory.total>0&&memory.free>=0&&memory.free<=memory.total
 if(!envelope)reasons.push('automatic-executor-not-integrated')
 else if(envelope.ownership!=='host-owned')reasons.push('runtime-not-owned')
 const qualified=envelope?.verified===true&&['cpu','gpu'].includes(envelope.accelerator)&&typeof envelope.lightOnBattery==='boolean'&&Number.isSafeInteger(envelope.peakRamBytes)&&envelope.peakRamBytes>0
 if(envelope&&!qualified)reasons.push('execution-envelope-unknown')
 if(!validMemory)reasons.push('memory-unknown')
 else if(qualified&&memory.free<envelope!.peakRamBytes+Math.max(BACKGROUND_RESOURCE_PROFILE.memoryReserveBytes,Math.ceil(memory.total*BACKGROUND_RESOURCE_PROFILE.memoryReserveFraction)))reasons.push('memory-insufficient')
 if(typeof battery!=='boolean')reasons.push('power-unknown');else if(battery&&!envelope?.lightOnBattery)reasons.push('waiting-external-power')
 if(typeof low!=='boolean')reasons.push('low-power-mode-unknown');else if(low)reasons.push('low-power-mode')
 if(thermal===undefined)reasons.push('thermal-unknown');else if(thermal!=='nominal')reasons.push('thermal-pressure')
 if(idle===undefined)reasons.push('interaction-unknown');else if(idle!=='idle')reasons.push(idle==='locked'?'session-locked':'foreground-active')
 if(typeof visible!=='boolean')reasons.push('visibility-unknown');else if(!visible)reasons.push('no-visible-window')
 if(envelope?.accelerator==='gpu'){const gpu=fresh(t.gpuFree);if(gpu===undefined||!Number.isSafeInteger(gpu)||gpu<0)reasons.push('gpu-memory-unknown');else if(!Number.isSafeInteger(envelope.peakGpuBytes)||envelope.peakGpuBytes!<=0)reasons.push('gpu-envelope-unknown');else if(gpu<envelope.peakGpuBytes!)reasons.push('gpu-memory-insufficient')}
 return{policyAllows:reasons.length===0,reasons,availableMemoryMiB:validMemory?Math.floor(memory.free/1048576):null}
}
