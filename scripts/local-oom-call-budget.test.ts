import assert from 'node:assert/strict'
import {test} from 'node:test'
import {runCaption} from '../src/main/visual-ai/caption-recipe'
import {runVisionRequest} from '../src/main/visual-ai/openai-vision.transport'
import {ConfirmedLocalOomError} from '../src/main/visual-ai/local-oom-recovery'
import type {VisionProvider} from '../src/main/visual-ai/openai-vision.provider'
import type {AiBackendConfig} from '../src/shared/types/ai-backend.types'
const backend:AiBackendConfig={id:'owned',name:'owned local',type:'llama-openai',baseUrl:'http://127.0.0.1/owned',defaultModel:'model',enabled:true,priority:1,timeoutMs:120000,capabilities:{vision:true,chat:true,jsonOutput:true,embeddings:false,modelList:false,modelManagement:false}}
const failure=()=>new ConfirmedLocalOomError({id:'failure-1',backendId:'owned',model:'model',executionId:'exec-1',fingerprint:'a'.repeat(64)})
const input=()=>({backend,model:'model',jpeg:new Uint8Array([1,2,3]),signal:new AbortController().signal,mayRecover:async()=>true,operationId:'audited-attempt'})
await test('an uncommitted owned OOM uses one recovery and the original request without escaping the two-call budget',async()=>{
  const requests:any[]=[],events:string[]=[]
  const provider:VisionProvider={invokeOnce:async request=>{requests.push(request);if(requests.length===1)throw failure();return{choices:[{finish_reason:'stop',message:{content:'{"caption":"有效描述"}'}}],usage:{prompt_tokens:3,completion_tokens:2}}},
    recoverLocal:async()=>{events.push('recovered');return true}}
  const value=await runCaption(input(),provider)
  assert.equal(value.physicalCalls,2);assert.equal(value.caption,'有效描述');assert.deepEqual(events,['recovered'])
  assert.equal(requests[0].imageDataUrl,requests[1].imageDataUrl);assert.equal(requests[0].maxTokens,requests[1].maxTokens);assert.equal(requests[0].systemPrompt,requests[1].systemPrompt)
  assert.equal(requests[0].signal,requests[1].signal);assert.equal(value.usage?.inputTokens,null,'The failed call has unknown usage and cannot disappear from totals')
})
await test('saved or unknown outcomes and a second failure cannot trigger more local calls',async()=>{
  for(const reason of ['saved','unknown','second-oom','truncated-after-recovery'] as const){
    let calls=0,recoveries=0
    const provider:VisionProvider={invokeOnce:async()=>{calls++;if(reason==='unknown')throw Error('LOCAL_RUNTIME_EXITED')
      if(calls===1||reason==='second-oom')throw failure()
      return{choices:[{finish_reason:'length',message:{content:'{"caption":"'}}]}},recoverLocal:async()=>{recoveries++;return true}}
    await assert.rejects(runCaption({...input(),mayRecover:async()=>reason!=='saved'},provider))
    assert.equal(calls,reason==='saved'||reason==='unknown'?1:2);assert.equal(recoveries,reason==='saved'||reason==='unknown'?0:1)
  }
})
await test('cancellation or a failed Host recheck preserves the definite first-call OOM and its terminal audit',async()=>{
  for(const cancelled of [false,true]){
    const abort=new AbortController(),known=failure(),outcomes:any[]=[];let calls=0,recoveries=0
    const provider:VisionProvider={invokeOnce:async()=>{calls++;throw known},recoverLocal:async()=>{recoveries++;return true},finishLocalRecovery:(_e,v)=>outcomes.push(v)}
    await assert.rejects(runCaption({...input(),signal:abort.signal,mayRecover:async()=>{if(cancelled)abort.abort();throw Error(cancelled?'LOCAL_RECOVERY_CANCELLED':'HOST_SESSION_CHANGED')}},provider),e=>e===known)
    assert.equal(calls,1);assert.equal(recoveries,0);assert.equal(outcomes[0].state,'not-retried');assert.equal(outcomes[0].physicalCalls,1)
  }
})
await test('the existing reverse recipe shares the OOM and formatting two-call ceiling',async()=>{
 let calls=0,recoveries=0
 const provider:VisionProvider={invokeOnce:async()=>{calls++;if(calls===1)throw failure();return{choices:[{finish_reason:'length',message:{content:'{"caption":"'}}]}},recoverLocal:async()=>{recoveries++;return true}}
 await assert.rejects(runVisionRequest({...input(),purpose:'reverse'},provider),/AI_RESPONSE_TRUNCATED/)
 assert.equal(calls,2);assert.equal(recoveries,1)
})
