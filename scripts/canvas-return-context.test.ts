import {test} from 'node:test'
import assert from 'node:assert/strict'
import {holdCanvasSession,readCanvasSession,clearCanvasSession} from '../src/renderer/components/library/canvas/canvas-session'
import {useLibraryViewStore} from '../src/renderer/stores/library-view.store'
await test('same verified scope returns folder/filter/viewport context while different session and close clear it',()=>{
 const scope='["fixture-library","session-1"]';useLibraryViewStore.getState().setScope(scope)
 const value={history:[{destination:'all' as const},{destination:'folders' as const,folder:'folder-1'}],cursor:1,density:300,quick:['untagged'],category:'图片',scrollTop:234}
 holdCanvasSession(scope,value);assert.deepEqual(readCanvasSession(scope),value)
 const copy=readCanvasSession(scope)!;copy.quick.push('changed');assert.deepEqual(readCanvasSession(scope),value)
 assert.equal(readCanvasSession('["fixture-library","session-2"]'),null)
 useLibraryViewStore.getState().setScope(null);assert.equal(readCanvasSession(scope),null)
 holdCanvasSession('unopened',value);assert.equal(readCanvasSession('unopened'),null);clearCanvasSession()
})
