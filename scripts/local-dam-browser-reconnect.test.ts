import assert from 'node:assert/strict'
const commands:string[]=[]
let failedSnapshot = false
let stream:any
class Events {
  handlers=new Map<string,Function>();onerror?:Function
  constructor(){stream=this}
  addEventListener(name:string,handler:Function){this.handlers.set(name,handler)}
  close(){}
}
;(globalThis as any).window={addEventListener(){}}
;(globalThis as any).EventSource=Events
;(globalThis as any).fetch=async(url:string,options?:any)=>{
  if(url==='/api/session-info')return new Response(JSON.stringify({csrf:'test',clientId:'test'}))
  const command=JSON.parse(options.body).command
  commands.push(command)
  return new Response(JSON.stringify({value:failedSnapshot && command==='download:jobs'?{ok:false}:{success:true}}))
}
const {createBrowserTransport}=await import('../src/renderer/browser-transport')
const transport=await createBrowserTransport()
let release!:()=>void
const barrier=new Promise<void>(resolve=>{release=resolve})
transport.onReconcile!(()=>barrier)
stream.handlers.get('connected')()
await new Promise(resolve=>setImmediate(resolve))
await transport.invoke('download:jobs')
await transport.invoke('work-windows:list',{libraryIdentity:'synthetic-library',generation:'synthetic-generation'})
await transport.invoke('asset-tag:list-by-asset',{assetId:'one'})
await transport.invoke('tag-search:untagged')
await assert.rejects(transport.invoke('unknown:list'),/尚未校准/)
await assert.rejects(transport.invoke('settings:save',{concurrency:2}),/尚未校准/)
assert.equal(commands.includes('settings:save'),false)
release();await new Promise(resolve=>setImmediate(resolve))
assert.equal(transport.connectionState!().connected,true)
await transport.invoke('settings:save',{concurrency:2})
assert.equal(commands.filter(name=>name==='settings:save').length,1)
stream.onerror()
await assert.rejects(transport.invoke('library:open'),/尚未校准/)
assert.equal(commands.includes('library:open'),false)
failedSnapshot=true
stream.handlers.get('connected')()
await new Promise(resolve=>setImmediate(resolve))
assert.equal(transport.connectionState!().connected,false,'failed authoritative snapshot must keep writes blocked')
await assert.rejects(transport.invoke('settings:save'),/尚未校准/)
console.log('PASS reconnection reads Host snapshots and waits for mounted clients before admitting writes; offline writes are never replayed')
