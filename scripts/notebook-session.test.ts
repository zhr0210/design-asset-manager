import assert from 'node:assert/strict'
import {createNotebookSession} from '../src/renderer/components/library/canvas/notebook-session'
import type {NotebookSnapshot,AssetNotebook} from '../src/shared/contracts/asset-notebook.contract'
const book:AssetNotebook={pages:[],active:null},scope={libraryIdentity:'lib',generation:'gen'}
let reads=0,fail=false,resolveSave:(value:any)=>void=()=>{};let snapshot:NotebookSnapshot={book,revision:0,sessionToken:'s',sourceRef:'preview:a',requiresUpgrade:true}
const api={notebookRead:async()=>{reads++;return{success:true,value:structuredClone(snapshot)}},notebookSave:async(input:any)=>{if(fail)return{success:false,code:'WRITE_FAILED',error:'保存失败'};return await new Promise<any>(resolve=>{resolveSave=()=>{snapshot={...snapshot,book:structuredClone(input.book),revision:snapshot.revision+1,requiresUpgrade:false};resolve({success:true,value:structuredClone(snapshot)})}})}}
const session=createNotebookSession(scope,()=>api)
await Promise.all([session.ensure!('a'),session.ensure!('a')]);assert.equal(reads,1)
const first={pages:[{id:'p',name:'First',elements:[]}],active:'p'};session.hold({a:first});assert.equal(session.dirty('a'),true)
const save=session.save(session.load(),'a',true);session.hold({a:{...first,pages:[{...first.pages[0],name:'New edit while saving'}]}});resolveSave(null);await save
assert.equal(session.dirty('a'),true);assert.equal(session.load().a.pages[0].name,'New edit while saving');assert.equal(snapshot.book.pages[0].name,'First')
fail=true;await assert.rejects(session.save(session.load(),'a'));assert.equal(session.dirty('a'),true);assert.equal(session.hasUnsaved(),true)
fail=false;const retry=session.save(session.load(),'a');resolveSave(null);await retry;assert.equal(session.dirty('a'),false)
snapshot={...snapshot,revision:snapshot.revision+1,book:{...snapshot.book,pages:[{...snapshot.book.pages[0],name:'Saved from another window'}]}};await session.ensure!('a');assert.equal(session.load().a.pages[0].name,'Saved from another window');
session.dispose();await assert.rejects(session.ensure!('a'));await assert.rejects(session.save({a:first},'a'))
let release:(v:any)=>void=()=>{};const late=createNotebookSession(scope,()=>({...api,notebookRead:()=>new Promise(resolve=>{release=resolve})}));const pending=late.ensure!('a');late.dispose();release({success:true,value:snapshot});await assert.rejects(pending);assert.deepEqual(late.load(),{})
console.log('Notebook session: deduplicated read, edits during save remain dirty, failure/retry, disposal and stale response isolation passed')
// A conflicting remote version never overwrites local edits; reconciliation appends draft copies.
let remote:NotebookSnapshot={book:{pages:[{id:'p',name:'Base',elements:[]}],active:'p'},revision:1,sessionToken:'s',sourceRef:'preview:a',requiresUpgrade:false}
const conflict=createNotebookSession(scope,()=>({notebookRead:async()=>({success:true,value:structuredClone(remote)}),notebookSave:async()=>({success:false,code:'notebook-conflict',error:'conflict'})}))
await conflict.ensure!('a');conflict.hold({a:{pages:[{id:'p',name:'Local draft',elements:[]}],active:'p'}})
remote={...remote,revision:2,book:{pages:[{id:'p',name:'Remote edit',elements:[]}],active:'p'}}
await assert.rejects(conflict.save(conflict.load(),'a'));const combined=await conflict.reconcile!('a');assert.equal(combined.a.pages.length,2);assert.equal(combined.a.pages[0].name,'Remote edit');assert.match(combined.a.pages[1].name,/Local draft/);assert.notEqual(combined.a.pages[0].id,combined.a.pages[1].id);assert.equal(conflict.dirty('a'),true);conflict.dispose()
console.log('Conflict reconciliation retains latest committed pages and local draft copies')
