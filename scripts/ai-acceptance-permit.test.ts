import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import {spawnSync} from 'node:child_process'
import {createAcceptancePermitStore,validateAcceptancePlan,type AcceptancePlan} from '../src/main/ai-acceptance/acceptance-permit'
const root=await fs.mkdtemp(path.join(os.tmpdir(),'dam-acceptance-permit-'))
const plan=():AcceptancePlan=>({runId:'owned-run',connectionRef:'owned-connection',configurationDigest:'a'.repeat(64),credentialRevision:0,model:'synthetic',origin:'http://127.0.0.1:12345',processingLocation:'local-service',inputDigest:'b'.repeat(64),generatedOnly:true,allowUserLibrary:false,actions:['analyze'],maxPhysicalRequests:2,maxOutputTokens:3072,maxWallClockMs:1000,maxEstimatedCostUsd:0,estimatedCostPerRequestUsd:0,pricingBasis:'owned-synthetic-no-charge',expiresAt:Date.now()+60000})
try{
 await test('CLI default plan-only never imports settings, Vault, network or model; cannot mint execution approval',()=>{
  const r=spawnSync(process.execPath,['scripts/ai-service-acceptance.mjs'],{env:{LANG:'en_US.UTF-8'},encoding:'utf8'});assert.equal(r.status,0);const p=JSON.parse(r.stdout);assert.equal(p.approved,false);assert.equal(p.mode,'PLAN_ONLY');assert.equal(p.realRequestBudget,0)
  const denied=spawnSync(process.execPath,['scripts/ai-service-acceptance.mjs','--execute'],{env:{LANG:'en_US.UTF-8'},encoding:'utf8'});assert.notEqual(denied.status,0)
 })
 await test('one-use signed scope rejects edited approval, expired or target/model/input/credential changes',async()=>{
  const s=createAcceptancePermitStore(path.join(root,'scope')),p=plan(),permit=await s.issueForUserAction(p)
  await assert.rejects(s.begin({...permit,signature:'0'.repeat(64)},p));for(const changed of [{...p,model:'other'},{...p,inputDigest:'c'.repeat(64)},{...p,credentialRevision:1},{...p,origin:'http://127.0.0.1:9999'}])await assert.rejects(s.begin(permit,changed));await assert.rejects(s.begin({...permit,plan:{...p,expiresAt:0}},p));await s.begin(permit,p);await assert.rejects(s.begin(permit,p))
 })
 await test('physical budget atomic, persistent across new instance; unknown cannot refund or reuse',async()=>{
  const dir=path.join(root,'persistent'),s=createAcceptancePermitStore(dir),p=plan(),permit=await s.issueForUserAction(p);await s.begin(permit,p)
  const outcomes=await Promise.allSettled([s.reserveRequest(permit,p,1536),s.reserveRequest(permit,p,3072),s.reserveRequest(permit,p,1536)]);assert.ok(outcomes.some(o=>o.status==='fulfilled'));const restarted=createAcceptancePermitStore(dir);await assert.rejects(restarted.begin(permit,p));const completed=await restarted.complete(permit,'unknown');assert.ok(completed.spent>=1);await assert.rejects(restarted.reserveRequest(permit,p,1536));await assert.rejects(restarted.begin(permit,p))
 })
 await test('unknown paid price and nonfinite budgets are rejected; output and wallclock limits apply',async()=>{
  assert.throws(()=>validateAcceptancePlan({...plan(),origin:'https://api.openai.com',processingLocation:'external-service',pricingBasis:'documented-estimate',maxEstimatedCostUsd:0}));assert.throws(()=>validateAcceptancePlan({...plan(),maxPhysicalRequests:Infinity}));assert.throws(()=>validateAcceptancePlan({...plan(),allowUserLibrary:true} as any))
  const s=createAcceptancePermitStore(path.join(root,'limit')),p={...plan(),maxWallClockMs:1},permit=await s.issueForUserAction(p);await s.begin(permit,p);await assert.rejects(s.reserveRequest(permit,p,4096));await new Promise(r=>setTimeout(r,5));await assert.rejects(s.reserveRequest(permit,p,1536))
 })
}finally{await fs.rm(root,{recursive:true,force:true})}
