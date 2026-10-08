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
