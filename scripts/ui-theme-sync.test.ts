import assert from 'node:assert/strict'
import {test} from 'node:test'

const saved=new Map([['app-theme','dark']])
const classes=new Set<string>()
const listeners=new Map<string,(event:{key:string;newValue:string|null})=>void>()
Object.defineProperty(globalThis,'localStorage',{value:{getItem:(key:string)=>saved.get(key)??null,setItem:(key:string,value:string)=>saved.set(key,value)},configurable:true})
Object.defineProperty(globalThis,'window',{value:{document:{documentElement:{classList:{add:(s:string)=>classes.add(s),remove:(s:string)=>classes.delete(s)}}},addEventListener:(key:string,handler:any)=>listeners.set(key,handler)},configurable:true})
const {useUIStore}=await import('../src/renderer/stores/ui.store')
await test('native reference surface initializes with the existing application theme',()=>{
  assert.equal(useUIStore.getState().theme,'dark');assert.ok(classes.has('dark'))
})
await test('another same-origin window changes appearance without writing settings or changing unrelated storage',()=>{
  assert.ok(listeners.has('storage'),'shared surfaces need an appearance storage listener')
  listeners.get('storage')!({key:'app-theme',newValue:'light'})
  assert.equal(useUIStore.getState().theme,'light');assert.equal(classes.has('dark'),false)
  listeners.get('storage')!({key:'unrelated',newValue:'dark'})
  assert.equal(useUIStore.getState().theme,'light')
  listeners.get('storage')!({key:'app-theme',newValue:'invalid'})
  assert.equal(useUIStore.getState().theme,'light')
})
