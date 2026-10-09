import assert from 'node:assert/strict'
import {validateWorkLayout} from '../src/shared/contracts/work-set.contract'
import {visibleWorkBounds,dockWorkBounds,expandedWorkBounds} from '../src/main/work-mode/work-window-bounds'
const area={x:0,y:24,width:1200,height:800},normal={x:200,y:100,width:420,height:640,pinned:true,open:true}
assert.deepEqual(validateWorkLayout(normal),normal,'old JSON layout gains no extra fields')
const left=dockWorkBounds(normal,'left',[area]);assert.equal(left.x,0);assert.equal(left.width,72);assert.equal(left.height,160);assert.deepEqual(left.dock,{edge:'left',normalBounds:{x:200,y:100,width:420,height:640}})
assert.deepEqual(validateWorkLayout(JSON.parse(JSON.stringify(left))),left)
assert.deepEqual(expandedWorkBounds(left,[area]),normal)
const right=dockWorkBounds(normal,'right',[area]);assert.equal(right.x,1128)
const relocated=visibleWorkBounds({...right,x:9999,y:9999},[{x:40,y:50,width:800,height:600}]);assert.equal(relocated.x,768);assert.equal(relocated.y,490);assert.deepEqual(relocated.dock,right.dock,'recovery retains original expansion record')
const expanded=expandedWorkBounds(relocated,[{x:40,y:50,width:800,height:600}]);assert.equal(expanded.width,420);assert.equal(expanded.height,600);assert.equal(expanded.y,50);assert.equal('dock'in expanded,false)
for(const invalid of [{...normal,width:72},{...normal,height:160},{...left,width:73},{...left,dock:{edge:'top',normalBounds:normal}},{...left,dock:{edge:'left',normalBounds:{x:0,y:0,width:72,height:160}}},{...left,dock:{...left.dock!,unexpected:true}},{...left,dock:{...left.dock!,normalBounds:{...left.dock!.normalBounds,x:NaN}}}])assert.throws(()=>validateWorkLayout(invalid))
console.log('Dock layout parser/bounds: unchanged old JSON, strict compact/normal bounds and edge, reversible expansion, bounded work-area recovery retaining expansion record. Pure geometry fixture; no physical display qualification.')
