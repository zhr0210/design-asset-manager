import assert from 'node:assert/strict'
import {createShelfAutosave} from '../src/main/work-mode/shelf-autosave'
import {parseShelfAction} from '../src/main/work-mode/native-shelf-actions'
import type {WorkWindowSnapshot,WorkSetValue} from '../src/shared/contracts/work-set.contract'
const initial:WorkSetValue={name:'Fixture',columns:2,assetIds:['asset:one','asset:two']}
let current:WorkWindowSnapshot={token:'token',scope:{libraryIdentity:'lib',generation:'gen'},set:{...initial,id:'set',revision:1,unavailableIds:[],layout:null},assets:[],pinned:true,geometry:{x:0,y:0,width:290,height:310,open:true,pinned:true},theme:'light'}
let release:(()=>void)|undefined,block=false,fail=false,calls=0;const holds:WorkSetValue[]=[],messages:string[]=[]
const writer=createShelfAutosave({current:()=>current,hold:(value,revision)=>{holds.push(structuredClone(value));current={...current,draft:value,draftRevision:revision}},feedback:message=>messages.push(message),save:async(value,revision)=>{calls++;assert.equal(revision,current.set.revision);if(fail)throw Error('unknown submission');if(block)await new Promise<void>(resolve=>{release=resolve});current={...current,set:{...current.set,...value,revision:revision+1}};return current}})
const p1=writer.edit({kind:'edit',field:'name',value:'one',serial:1});block=true;const flush=writer.flush();await Promise.resolve()
const p2=writer.edit({kind:'edit',field:'name',value:'two',serial:2});release!();block=false
assert.equal((await p1).ack,1);assert.equal((await flush).ack,1);assert.equal(current.draft?.name,'two');assert.equal(writer.pending(),true)
assert.equal((await writer.flush()).ack,2);assert.equal((await p2).ack,2);assert.equal(current.set.name,'two')
fail=true;const p3=writer.edit({kind:'edit',field:'remove',value:['asset:one'],serial:3});assert.equal((await writer.flush()).ok,false);await p3
const before=calls;assert.equal((await writer.flush()).ok,false);assert.equal(calls,before);assert.deepEqual(current.draft?.assetIds,['asset:two'])
fail=false;assert.equal((await writer.retry()).ok,true);assert.deepEqual(current.set.assetIds,['asset:two'])
const p4=writer.edit({kind:'edit',field:'name',value:'New input after recovered save',serial:4});await writer.flush();assert.equal((await p4).ack,4);assert.equal(current.set.name,'New input after recovered save')
assert.throws(()=>parseShelfAction({kind:'promise',assetId:'one',destination:'/tmp/new',shell:'arbitrary'}))
assert.throws(()=>parseShelfAction({kind:'members',transfer:{libraryIdentity:'lib',generation:'gen',assetIds:['one','one']}}))
assert.equal(parseShelfAction({kind:'promise',assetId:'one',destination:'/tmp/new'}).kind,'promise')
assert.throws(()=>parseShelfAction({kind:'file-action',id:'handoff:one',operation:'copy',destination:'/tmp/test',name:'ignored'}))
assert.throws(()=>parseShelfAction({kind:'window-settings',pinned:true,indicatorColor:null,alwaysShowIndicator:false,currentSpaceOnly:false,id:'ignored'}))
writer.dispose();assert.equal((await writer.flush()).ok,false)
console.log('Production shelf autosave: newer input survives old completion; monotonic acknowledgement; unknown submission blocks automatic retries; removal preserves other references; owned pipe rejects extra authority.')
