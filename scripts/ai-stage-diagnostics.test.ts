import assert from 'node:assert/strict'
import {test} from 'node:test'
import Database from 'better-sqlite3'
import {createAiDiagnostics,measureAiStage} from '../src/main/local-ai-resources/ai-diagnostics'
await test('bounded stage diagnostics keep failure evidence without queries or changing a completed result',async()=>{
 const db=new Database(':memory:');try{
  const diagnostics=createAiDiagnostics(db,'build-fixture')
  for(let i=0;i<205;i++)await measureAiStage(diagnostics.record,'request:'+i,'index-query',async()=>i,{language:'mixed'})
  assert.equal(db.prepare('SELECT COUNT(*) FROM ai_stage_diagnostics').pluck().get(),200)
  await assert.rejects(measureAiStage(diagnostics.record,'attempt:failed','inference',async()=>{throw Error('provider secret text')}),/provider secret text/)
  assert.equal(diagnostics.read()[0].errorCode,'OPERATION_FAILED');assert.equal(JSON.stringify(diagnostics.read()).includes('provider secret text'),false)
  assert.equal(await measureAiStage(()=>{throw Error('storage unavailable')},'attempt:committed','validate-and-commit',async()=>42),42)
  assert.equal(diagnostics.read().length,100)
 }finally{db.close()}
})
await test('release provenance is bounded and excludes arbitrary nested data',async()=>{
 const db=new Database(':memory:');try{
  const d=createAiDiagnostics(db,'release-fixture'),base={operationId:'owned:1',stage:'cancel-and-release' as const,startedAt:new Date().toISOString(),durationMs:5000,outcome:'failed' as const,errorCode:'LOCAL_RUNTIME_EXIT_UNCONFIRMED',fingerprint:null,mode:'cpu',language:null}
  d.record({...base,release:{cause:'observation-failed',triggerCode:'LOCAL_RESOURCE_OBSERVATION_FAILED',pid:123,signalRequested:true,physicalCloseSeen:false,inferenceOperationId:'attempt:2',privateText:'MUST_NOT_PERSIST'} as any})
  assert.equal(d.read()[0].release?.physicalCloseSeen,false);assert.equal(d.read()[0].release?.cause,'observation-failed');assert.ok(!JSON.stringify(d.read()).includes('MUST_NOT_PERSIST'))
  d.record({...base,release:{cause:'observation-failed',triggerCode:'unsafe provider detail',pid:123,signalRequested:true,physicalCloseSeen:false,inferenceOperationId:'attempt:2'}})
  assert.equal(d.read()[0].release,undefined);assert.ok(!JSON.stringify(d.read()).includes('unsafe provider detail'))
 }finally{db.close()}
})
