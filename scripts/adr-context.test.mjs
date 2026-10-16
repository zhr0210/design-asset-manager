import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {test} from 'node:test'
import {loadAdrCatalog, routeAdrMetadata, validateAdrCatalog} from './adr-context.mjs'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const catalog=loadAdrCatalog(root)

test('all decisions have classified topic metadata without loading original ADR bodies',()=>{
  assert.ok(catalog.entries.length>0)
  assert.deepEqual(validateAdrCatalog(catalog,root),[])
  assert.equal(new Set(catalog.entries.map(e=>e.id)).size,catalog.entries.length)
  assert.ok(catalog.entries.every(e=>!Object.hasOwn(e,'body') && e.topics.length>0))
  const actual=fs.readdirSync(path.join(root,'docs/adr')).filter(p=>/^\d{4}-.*\.md$/.test(p)).sort()
  assert.deepEqual(catalog.entries.map(e=>path.basename(e.path)).sort(),actual)
})

test('a task type alone never falls back to every Core decision',()=>{
  const result=routeAdrMetadata(catalog,{kind:'design'})
  assert.equal(result.scope,'needs-scope')
  assert.deepEqual(result.candidates,[])
  assert.equal(result.totalMatches,0)
})

test('task type changes reading focus but never excludes relevant data or ownership decisions',()=>{
  const ids=kind=>routeAdrMetadata(catalog,{kind,topic:'work-mode',limit:8}).candidates.map(c=>c.id).sort()
  assert.deepEqual(ids('design'),['0485','0489','0493','0494'])
  assert.deepEqual(ids('research'),ids('design'))
  assert.deepEqual(ids('operations'),ids('design'))
  const fixture=structuredClone(catalog)
  fixture.entries=[{...catalog.entries[0],id:'0001',topics:['workspace'],facets:['presentation']},
                   {...catalog.entries[1],id:'0002',topics:['workspace'],facets:['data']}]
  assert.equal(routeAdrMetadata(fixture,{kind:'design',topic:'workspace'}).candidates[0].id,'0001')
  assert.equal(routeAdrMetadata(fixture,{kind:'operations',topic:'workspace'}).candidates[0].id,'0002')
  assert.equal(routeAdrMetadata(fixture,{kind:'design',topic:'workspace'}).totalMatches,2)
})

test('new task kinds retain the general relevance path and do not create a whitelist',()=>{
  const result=routeAdrMetadata(catalog,{kind:'new-task-kind',topic:'work-mode'})
  assert.equal(result.taskType.resolved,'general')
  assert.equal(result.totalMatches,4)
})

test('default output is bounded, preserves whole metadata records and exposes deferred choices',()=>{
  const result=routeAdrMetadata(catalog,{kind:'requirements',topic:'custom-fields'})
  assert.equal(result.candidates.length,3)
  assert.ok(result.totalMatches>3)
  assert.equal(result.deferred,result.totalMatches-result.candidates.length)
  assert.ok(Buffer.byteLength(JSON.stringify(result,null,2))<=result.limits.maxOutputBytes)
  assert.ok(result.candidates.every(c=>c.id && c.title && c.path && c.status))
  assert.throws(()=>routeAdrMetadata(catalog,{topic:'custom-fields',limit:100}),/LIMIT_INVALID/)
})

test('historical/proposed metadata remains explicit and detailed contracts are linked, not copied',()=>{
  const normal=routeAdrMetadata(catalog,{topic:'workspace',task:'0010',limit:8})
  assert.ok(normal.candidates.every(c=>c.id!=='0010'))
  const history=routeAdrMetadata(catalog,{topic:'workspace',task:'0010',includeHistory:true})
  assert.equal(history.candidates[0].id,'0010')
  assert.equal(history.candidates[0].status,'superseded')
  const proposed=routeAdrMetadata(catalog,{topic:'modern-boundaries',task:'0492'})
  assert.equal(proposed.candidates[0].status,'proposed')
  const detail=routeAdrMetadata(catalog,{topic:'workspace',task:'0023'})
  assert.equal(detail.candidates[0].detail,'docs/product/specs/workspace.md#adr-0023')
})

test('unknown scope is observable and source metadata cannot point outside the decision corpus',()=>{
  assert.equal(routeAdrMetadata(catalog,{kind:'research',task:'unmatched-quux-xyz'}).scope,'no-match-refine-scope')
  assert.throws(()=>routeAdrMetadata(catalog,{topic:'unknown-topic'}),/TOPIC_UNKNOWN/)
  const bad=structuredClone(catalog);bad.entries[0].path='../../private.md'
  assert.ok(validateAdrCatalog(bad).some(e=>e.includes('ENTRY_INVALID')))
})

 test('Chinese subject terms select precise decisions inside a broader topic',()=>{
  const library=routeAdrMetadata(catalog,{kind:'operations',topic:'library-storage',task:'检查资料库的独占锁与开库检查'})
  assert.equal(library.candidates[0].id,'0276')
  const retrieval=routeAdrMetadata(catalog,{kind:'research',topic:'retrieval',task:'比较持久向量与索引重建'})
  assert.equal(retrieval.candidates[0].id,'0183')
 })
