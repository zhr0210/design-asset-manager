import {test} from 'node:test'
import assert from 'node:assert/strict'
import {piProviderAdmission,backendInferenceAdmission} from '../src/shared/constants/pi-provider-admission'
import {supportsPiAuthentication,supportsPiProductAuthentication} from '../src/shared/constants/pi-provider-presets'
import {createAiConnectionService} from '../src/main/ai-gateway/ai-connection-service'
import {createNewInstallAppSettingsDefaults} from '../src/main/services/settings/settings-defaults.builder'
for(const[provider,mode]of [['google','api-key'],['anthropic','oauth'],['openai-codex','oauth'],['github-copilot','oauth']]as const)await test(provider+' unavailable path rejects before credential, network, or probe material',async()=>{
 let calls=0;const b={...createNewInstallAppSettingsDefaults().aiBackends![0],transport:'pi' as const,providerKind:provider,authMode:mode,defaultModel:'fixture',enabled:true};const settings={...createNewInstallAppSettingsDefaults(),aiBackends:[b]}
 const service=createAiConnectionService({settings:{getSettings:()=>settings,saveSettings:()=>{throw Error('must not write')}},vault:{resolve:async()=>{calls++;throw Error('must not read')}} as any,runtime:{execute:async()=>{calls++;throw Error('must not spawn')},inspect:()=>({unknown:0})} as any,changed:()=>{},reserveProbe:async()=>{calls++;throw Error('must not allocate')}})
 assert.equal(piProviderAdmission(provider,mode,'infer').allowed,false);assert.equal(piProviderAdmission(provider,mode,'models').allowed,true)
 assert.throws(()=>service.prepareValidation(b.id),/AI_/)
 if(mode==='oauth')await assert.rejects(service.login(b.id),/AI_/)
 await assert.rejects(service.provider.invokeOnce({backendId:b.id,endpoint:b.baseUrl.replace(/\/+$/,'')+'/chat/completions',model:'fixture',imageDataUrl:'data:image/jpeg;base64,AA==',systemPrompt:'fixture',userPrompt:'fixture',maxTokens:128,temperature:0,signal:new AbortController().signal}),/AI_/)
 assert.equal(calls,0)
})
await test('upstream technical support and product Anthropic permission are distinct',()=>{assert.equal(supportsPiAuthentication('anthropic','oauth'),true);assert.equal(supportsPiProductAuthentication('anthropic','oauth'),false);assert.equal(piProviderAdmission('anthropic','api-key','infer').allowed,true);assert.equal(piProviderAdmission('openai','api-key','infer').allowed,true);assert.equal(piProviderAdmission('openai-compatible','none','infer').allowed,true)})

await test('switching a saved subscription connection to legacy transport cannot advertise executable inference',()=>{const b={...createNewInstallAppSettingsDefaults().aiBackends![0],transport:'legacy' as const,providerKind:'anthropic' as const,authMode:'oauth' as const};assert.equal(backendInferenceAdmission(b).allowed,false);assert.equal(backendInferenceAdmission({...b,authMode:'api-key'}).allowed,true)})

await test('Anthropic known subscription token cannot be stored or used as an API key, old records are preserved',async()=>{
 const b={...createNewInstallAppSettingsDefaults().aiBackends![0],transport:'pi' as const,providerKind:'anthropic' as const,authMode:'api-key' as const,baseUrl:'https://api.anthropic.com'},settings={...createNewInstallAppSettingsDefaults(),aiBackends:[b]};let writes=0,spawns=0
 const service=createAiConnectionService({settings:{getSettings:()=>settings,saveSettings:()=>{writes++;return settings}},vault:{set:async()=>{writes++},resolve:async()=>({type:'api_key',key:'sk-ant-oat-synthetic-not-real'})} as any,runtime:{execute:async()=>{spawns++},inspect:()=>({unknown:0})} as any,changed:()=>{}})
 await assert.rejects(service.setApiKey({backendId:b.id,key:'sk-ant-oat-synthetic-not-real'}),/AI_ANTHROPIC_SUBSCRIPTION_UNAVAILABLE/)
 await assert.rejects(service.provider.invokeOnce({backendId:b.id,endpoint:b.baseUrl+'/chat/completions',model:'fixture',imageDataUrl:'data:image/jpeg;base64,AA==',systemPrompt:'fixture',userPrompt:'fixture',maxTokens:128,temperature:0,signal:new AbortController().signal}),/AI_ANTHROPIC_SUBSCRIPTION_UNAVAILABLE/)
 assert.equal(writes,0);assert.equal(spawns,0)
})

await test('guarded ChatGPT admission allows user login but inference without a credential cannot request API-key billing',async()=>{assert.equal(piProviderAdmission('openai','oauth','login').allowed,true);assert.equal(piProviderAdmission('openai','oauth','infer').allowed,true)})
