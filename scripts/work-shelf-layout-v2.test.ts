import assert from 'node:assert/strict'
import {validateWorkLayout} from '../src/shared/contracts/work-set.contract'
import {nativeShelfLayout,dockWorkBounds,expandedWorkBounds} from '../src/main/work-mode/work-window-bounds'
const area={x:0,y:40,width:2240,height:1300},normal={x:200,y:71,width:290,height:310,pinned:true,open:true,presentation:'compact' as const}
for(const edge of ['left','right'] as const){
 const target=dockWorkBounds(normal,edge,[area],'edge-slide')
 assert.equal(target.width,290);assert.equal(target.height,310);assert.equal(target.x,Math.round(edge==='left'?-243.6:2193.6))
 assert.deepEqual(validateWorkLayout(JSON.parse(JSON.stringify(target))),target)
 const restored=expandedWorkBounds(target,[area]);assert.equal(restored.x,edge==='left'?12:1938);assert.equal(restored.presentation,'compact');assert.equal(restored.y,71)
 assert.throws(()=>validateWorkLayout({...target,presentation:'expanded'}))
 assert.throws(()=>validateWorkLayout({...target,width:72,height:160}))
 const legacy={...normal,width:72,height:160,presentation:undefined,dock:{edge,normalBounds:{x:200,y:71,width:290,height:310}}}
 const migrated=nativeShelfLayout(legacy,[area]);assert.equal(migrated.dock?.style,'edge-slide');assert.equal(migrated.presentation,'compact')
 const large=nativeShelfLayout({...legacy,dock:{edge,normalBounds:{x:200,y:71,width:640,height:520}}},[area]);assert.equal(large.presentation,'expanded');assert.equal(large.width,640);assert.equal(large.dock,undefined)
}
const negative={x:-1200,y:40,width:1200,height:800};const left=dockWorkBounds({...normal,x:-900},'left',[negative,area],'edge-slide');assert.equal(left.x,-1444)
assert.equal(nativeShelfLayout(left,[negative,area]).x,-1385)
// B compact geometry survives the public layout parser and persisted recovery.
const compact=nativeShelfLayout(normal,[area])
assert.deepEqual(compact,{...normal,width:220,height:240})
assert.deepEqual(validateWorkLayout(compact),compact)
assert.deepEqual(nativeShelfLayout({x:40,y:70,width:420,height:640,pinned:true,open:true},[area]),{x:40,y:70,width:220,height:240,pinned:true,open:true,presentation:'compact'})
for(const edge of ['left','right'] as const){
 const migrated=nativeShelfLayout(dockWorkBounds(normal,edge,[area],'edge-slide'),[area])
 assert.equal(migrated.width,220);assert.equal(migrated.height,240)
 assert.deepEqual(migrated.dock?.normalBounds,{x:200,y:71,width:220,height:240})
 assert.deepEqual(validateWorkLayout(migrated),migrated)
 const restored=expandedWorkBounds(migrated,[area])
 assert.equal(restored.width,220);assert.equal(restored.height,240)
 assert.equal(restored.x,edge==='left'?12:2008)
}
assert.throws(()=>validateWorkLayout({...compact,width:219}))
assert.throws(()=>validateWorkLayout({...compact,height:239}))
assert.throws(()=>validateWorkLayout({...compact,presentation:undefined}))
console.log('PASS v2 B layout: same-size ratio, 12pt compact restoration, strict presentation, old compact/large capsule conversion, negative display origin. Geometry only; physical multidisplay separately qualified.')
