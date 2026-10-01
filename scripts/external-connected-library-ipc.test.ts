import assert from 'node:assert/strict'
import { registerExternalConnectedLibraryIpc } from '../src/main/ipc/external-connected-library.ipc'

const projection={state:'ready',evidenceLevel:'synthetic-protocol',provider:'eagle',providerIdentity:'provider:eagle',libraryIdentity:'library:eagle',generation:'generation:one',displayName:'Synthetic',originalAuthority:'eagle-single-original',scope:{kind:'all'},grant:'read-write',capabilities:{webApiV2:true,progressiveIndex:true,metadataRead:true,metadataWrite:true,trash:true,restore:true,fileReplace:true,permanentDelete:true},counts:{indexed:1,inScope:1,pending:0,conflicts:0,trashed:0,cleanupCandidates:0},cursor:null,indexingComplete:true} as const
const item={key:'connected-item:one'}
const calls:any[]=[]
const host=new Proxy({inspect:()=>projection,prepareConnection:async(input:any)=>{calls.push(input);return{kind:'planned',review:{}}},readPreview:async()=>new Uint8Array([1,2,3])},{get:(target,key)=>key in target?(target as any)[key]:async(input:any)=>{calls.push({key,input});return[]}}) as any
const legacyProjection={state:'ready',evidenceLevel:'synthetic-read-only',identity:'legacy:one',generation:'legacy-generation:one',counts:{assets:1,tags:0,relations:0},limitations:[]} as const
const legacy=new Proxy({inspect:()=>legacyProjection,readPreview:async()=>new Uint8Array([4,5])},{get:(target,key)=>key in target?(target as any)[key]:async()=>[]}) as any
const handlers=new Map<string,(event:any,request?:unknown)=>Promise<any>>()
registerExternalConnectedLibraryIpc({host,legacy,isTrustedSender:(event)=>event.trusted===true},(channel,handler)=>handlers.set(channel,handler as any))
const invoke=(channel:string,request?:unknown,event:any={trusted:true})=>handlers.get(channel)!(event,request)

assert.equal((await invoke('connected-library:inspect')).success,true)
assert.equal((await invoke('connected-library:prepare',{scope:{kind:'all'},requestedGrant:'read-write'})).success,true)
assert.deepEqual(calls[0],{scope:{kind:'all'},requestedGrant:'read-write'})
assert.equal((await invoke('connected-library:queue-metadata',{itemKey:item.key,clientReceipt:'receipt:one',patch:{tags:['two words'],rating:4}})).success,true)
assert.equal((await invoke('connected-library:prepare-new')).success,true)
assert.equal((await invoke('connected-library:media-preview',{itemKey:item.key,libraryIdentity:'library:eagle',generation:'generation:one'})).value,'AQID')
assert.equal((await invoke('legacy-readonly:media-preview',{assetId:'asset:one',identity:'legacy:one',generation:'legacy-generation:one'})).value,'BAU=')

for(const [channel,request] of [
  ['connected-library:prepare',{scope:{kind:'all'},requestedGrant:'read-write',path:'/private'}],
  ['connected-library:queue-metadata',{itemKey:item.key,clientReceipt:'receipt:bad',patch:{name:'x',filePath:'/private'}}],
  ['connected-library:media-preview',{itemKey:item.key,libraryIdentity:'library:eagle',generation:'generation:old'}],
  ['connected-library:prepare-file',{itemKey:item.key,path:'/private'}],
  ['legacy-readonly:confirm',{receipt:'legacy:review',databasePath:'/private'}]
] as const){const result=await invoke(channel,request);assert.equal(result.success,false);assert.equal(String(result.error).includes('/private'),false)}
assert.equal((await invoke('connected-library:list',undefined,{trusted:false})).code,'UNTRUSTED_SENDER')
assert.equal([...handlers.keys()].filter((channel)=>channel.startsWith('connected-library:')).length,18)
assert.equal([...handlers.keys()].filter((channel)=>channel.startsWith('legacy-readonly:')).length,7)
console.log('External Connected Library IPC boundary passed')
