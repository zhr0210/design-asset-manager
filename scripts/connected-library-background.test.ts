import assert from 'node:assert/strict'
import { ConnectedLibraryBackgroundCoordinator } from '../src/main/external-connected-library'

let grant:'none'|'read-write'='none'
let state:any='unconfigured'
let indexCalls=0,syncCalls=0
let release:()=>void=()=>{}
let block=false
const host={
  inspect:()=>({grant,state}),
  indexNextPage:async()=>{indexCalls+=1;if(block)await new Promise<void>((resolve)=>{release=resolve})},
  synchronize:async()=>{syncCalls+=1}
} as any
const projections:any[]=[]
const coordinator=new ConnectedLibraryBackgroundCoordinator({host,intervalMs:60_000,onProjection:(projection)=>projections.push(projection)})
coordinator.start()
await coordinator.tick()
assert.equal(indexCalls,0)
grant='read-write';state='ready'
await coordinator.tick()
assert.equal(indexCalls,1);assert.equal(syncCalls,1)
block=true
const pending=coordinator.tick()
const drain=coordinator.drain()
await new Promise((resolve)=>setTimeout(resolve,0))
let drained=false;void drain.then(()=>{drained=true})
assert.equal(drained,false)
release();await pending;await drain
assert.equal(drained,true)
assert.equal(projections.length>=2,true)
console.log('Connected Library background coordinator passed')
