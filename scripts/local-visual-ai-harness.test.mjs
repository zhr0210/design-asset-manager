import assert from 'node:assert/strict'
import http from 'node:http'
import {spawn} from 'node:child_process'
import fs from 'node:fs/promises'
let count=0
const server=http.createServer(async(req,res)=>{
 assert.equal(req.url,'/v1/chat/completions');assert.equal(req.method,'POST');count++
 for await(const _chunk of req){ /* Generated-only test request, do not log image bytes. */ }
 res.setHeader('Content-Type','application/json');res.end(JSON.stringify({choices:[{message:{content:JSON.stringify({caption:'合成验证图',ocrText:'FORM 2026',prompt:'Editorial composition of geometric shapes',tags:['几何','排版']})}}]}))
})
await new Promise(r=>server.listen(0,'127.0.0.1',r))
try{
 const result=await new Promise((resolve,reject)=>{
  const p=spawn(process.execPath,['scripts/run-electron-node-test.mjs','scripts/test-local-visual-ai.ts'],{env:{...process.env,DAM_LOCAL_AI_EXECUTE:'1',DAM_LOCAL_AI_ENDPOINT:`http://127.0.0.1:${server.address().port}/v1`,DAM_LOCAL_AI_MODEL:'synthetic-harness-only'},stdio:['ignore','pipe','pipe']})
  let out='',err='';p.stdout.on('data',c=>out+=c);p.stderr.on('data',c=>err+=c);p.on('error',reject);p.on('close',code=>resolve({code,out,err}))
 })
 assert.equal(result.code,0,result.err);assert.equal(count,4)
 const message=JSON.parse(result.out.trim().split('\n').at(-1)),report=JSON.parse(await fs.readFile(message.artifacts+'/report.json','utf8'))
 assert.equal(report.qualityVerdict,'requires-human-review');assert.equal(report.workSetReferences,4);assert.equal(report.restored,true)
 assert.ok(report.checks.every(c=>c.hasEvidence&&c.searchFindsOwnPrompt&&c.aiFolder))
 assert.equal(report.sourceHashesPreserved,true)
 console.log('Evaluation harness: four synthetic loopback requests, evidence/search/workset/reopen passed; no real model evaluated.')
}finally{server.closeAllConnections();await new Promise(r=>server.close(r))}
