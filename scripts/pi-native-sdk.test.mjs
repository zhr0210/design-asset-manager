import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import {spawn} from 'node:child_process'
import sharp from 'sharp'
import {createPiContractFixture} from './pi-contract-fixture.mjs'
import {openaiProvider} from '../pi-runtime/node_modules/@earendil-works/pi-ai/dist/providers/openai.js'
import {anthropicProvider} from '../pi-runtime/node_modules/@earendil-works/pi-ai/dist/providers/anthropic.js'
const jpeg='data:image/jpeg;base64,'+(await sharp({create:{width:64,height:32,channels:3,background:'#7799bb'}}).jpeg().toBuffer()).toString('base64')
const root=await fs.mkdtemp(path.join(os.tmpdir(),'dam-pi-native-contract-'))
async function run(provider,mode,authMode='api-key',key='synthetic-not-real'){
 const dir=path.join(root,provider+'-'+mode);await fs.mkdir(dir);const f=await createPiContractFixture(dir,{provider,mode}),factory=provider==='anthropic'?anthropicProvider():openaiProvider(),model=factory.getModels().find(m=>m.input.includes('image'));
 const child=spawn(path.resolve('pi-runtime/runtime/darwin-arm64/node'),[f.bootstrap],{shell:false,env:{HOME:dir,TMPDIR:dir,LANG:'en_US.UTF-8'},stdio:['pipe','pipe','pipe']});let output='',stderr='';const messages=[];let killTimer;
 child.stdout.on('data',chunk=>{output+=chunk;let i;while((i=output.indexOf('\n'))>=0){const m=JSON.parse(output.slice(0,i));output=output.slice(i+1);messages.push(m);if(mode==='hang'&&m.type==='interaction'&&m.event.type==='contract-network'){child.kill('SIGTERM');killTimer=setTimeout(()=>child.kill('SIGKILL'),1000)}}});child.stderr.on('data',c=>{stderr+=c});
 const closed=new Promise(r=>child.on('close',code=>{clearTimeout(killTimer);r(code)}));child.stdin.write(JSON.stringify({kind:'infer',connection:{id:'synthetic',providerKind:provider,authMode,baseUrl:factory.baseUrl},credential:{type:'api_key',key},model:model.id,systemPrompt:'Return JSON',userPrompt:'Generated fixture only',imageDataUrl:jpeg,maxTokens:128,temperature:0})+'\n');const code=await closed;assert.equal(stderr,'');return{messages,code}
}
try{
 for(const provider of ['openai','anthropic'])for(const mode of ['valid','429','redirect','oversize','hang'])await test('actual '+provider+' SDK Worker '+mode,async()=>{
  const r=await run(provider,mode),calls=r.messages.filter(m=>m.type==='interaction'&&m.event.type==='contract-network');assert.equal(calls.length,1);
  if(mode==='valid'){assert.equal(r.code,0);const result=r.messages.find(m=>m.type==='result').value;assert.equal(result.choices[0].finish_reason,'stop');assert.equal(JSON.parse(result.choices[0].message.content).caption,'SDK原生隔离描述')}
  else{assert.equal(r.messages.some(m=>m.type==='result'),false);assert.ok(r.messages.some(m=>m.type==='error'));if(mode==='hang')assert.equal(r.messages.find(m=>m.type==='error').code,'AI_CANCELLED')}
 })
 for(const[provider,authMode,code]of [['google','api-key','AI_GOOGLE_TRANSPORT_UNAVAILABLE'],['openai','oauth','AI_AUTH_METHOD_MISMATCH'],['anthropic','oauth','AI_ANTHROPIC_SUBSCRIPTION_UNAVAILABLE'],['openai-codex','oauth','AI_CODEX_AUTH_NETWORK_UNVERIFIED'],['github-copilot','oauth','AI_COPILOT_AUTH_NETWORK_UNVERIFIED'],['github-copilot','api-key','AI_COPILOT_AUTH_NETWORK_UNVERIFIED']])await test('production Worker admission '+provider+' '+authMode+' prevents auth/refresh/inference network',async()=>{
  const r=await run(provider,'blocked-'+authMode,authMode);assert.equal(r.messages.filter(m=>m.type==='interaction'&&m.event.type==='contract-network').length,0);assert.equal(r.messages.some(m=>m.type==='credential'||m.type==='result'),false);assert.equal(r.messages.find(m=>m.type==='error').code,code)
 })
 await test('production Worker rejects SDK-detected Anthropic subscription token disguised as API key',async()=>{const r=await run('anthropic','disguised','api-key','sk-ant-oat-synthetic-not-real');assert.equal(r.messages.filter(m=>m.type==='interaction'&&m.event.type==='contract-network').length,0);assert.equal(r.messages.find(m=>m.type==='error').code,'AI_ANTHROPIC_SUBSCRIPTION_UNAVAILABLE')})
}finally{await fs.rm(root,{recursive:true,force:true})}
