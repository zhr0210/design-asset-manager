import {test} from 'node:test'
import assert from 'node:assert/strict'
import {githubCopilotOAuth} from '../pi-runtime/node_modules/@earendil-works/pi-ai/dist/auth/oauth/github-copilot.js'
import {githubCopilotProvider} from '../pi-runtime/node_modules/@earendil-works/pi-ai/dist/providers/github-copilot.js'
const modelId=githubCopilotProvider().getModels()[0].id
let calls=[],original=globalThis.fetch
try{
 globalThis.fetch=async(resource,options={})=>{
  const url=new URL(typeof resource==='string'?resource:resource.url),method=options.method??'GET';calls.push({method,path:url.pathname});const json=v=>new Response(JSON.stringify(v),{status:200,headers:{'content-type':'application/json'}})
  if(url.href==='https://github.com/login/device/code'&&method==='POST')return json({device_code:'synthetic-device',user_code:'SYNTHETIC',verification_uri:'https://github.com/login/device',interval:0,expires_in:60})
  if(url.href==='https://github.com/login/oauth/access_token'&&method==='POST')return json({access_token:'synthetic-github-token'})
  if(url.href==='https://api.github.com/copilot_internal/v2/token')return json({token:'synthetic-token;proxy-ep=proxy.individual.githubcopilot.com;',expires_at:Date.now()/1000+3600})
  if(url.href==='https://api.individual.githubcopilot.com/models'&&method==='GET')return json({data:[{id:modelId,model_picker_enabled:false,policy:{state:'unconfigured'}}]})
  if(url.href==='https://api.individual.githubcopilot.com/models/'+modelId+'/policy'&&method==='POST'){assert.deepEqual(JSON.parse(options.body),{state:'enabled'});return json({})}
  throw Error('ISOLATED_DESTINATION_REJECTED')
 }
 await test('actual fixed Copilot OAuth conditional model-policy side effect is reproduced only on synthetic network',async()=>{
  const credential=await githubCopilotOAuth.login({signal:new AbortController().signal,prompt:async p=>{assert.equal(p.type,'text');return''},notify:()=>{}});assert.equal(credential.type,'oauth');assert.equal(calls.filter(c=>c.path.endsWith('/policy')).length,1)
 })
}finally{globalThis.fetch=original}
