import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createModels,InMemoryCredentialStore} from '../pi-runtime/node_modules/@earendil-works/pi-ai/dist/index.js'
import {googleProvider} from '../pi-runtime/node_modules/@earendil-works/pi-ai/dist/providers/google.js'
import {openaiChatGPTOAuth} from '../pi-runtime/node_modules/@earendil-works/pi-ai/dist/auth/oauth/openai-chatgpt.js'
const originalFetch=globalThis.fetch;let networkCalls=0;globalThis.fetch=async()=>{networkCalls++;throw Error('ISOLATED_NETWORK_DISABLED')}
try{
 await test('fixed installed Google adapter demonstrates custom-fetch conflict before any network',async()=>{
  const models=createModels({credentials:new InMemoryCredentialStore(),authContext:{env:async()=>undefined,fileExists:async()=>false}});models.setProvider(googleProvider());const model=models.getModels('google').find(m=>m.input.includes('image'))
  const stream=models.stream(model,{messages:[{role:'user',timestamp:0,content:[{type:'text',text:'generated fixture'}]}]},{apiKey:'synthetic-not-real',fetch:async()=>{networkCalls++;throw Error('ISOLATED_NETWORK_DISABLED')},maxRetries:0})
  const result=await stream.result();assert.equal(result.stopReason,'error');assert.match(result.errorMessage,/Custom fetch is not supported/);assert.equal(networkCalls,0)
 })
 for(const id of [undefined,'invalid-device-id'])await test('actual OpenAI entry rejects '+(id?'invalid':'missing')+' host ID without network',async()=>{await assert.rejects(openaiChatGPTOAuth.login({signal:new AbortController().signal,notify:()=>{throw Error('must not notify')},prompt:async()=>{throw Error('must not prompt')}},{getDeviceId:()=>id}),/device ID/);assert.equal(networkCalls,0)})
}finally{globalThis.fetch=originalFetch}
