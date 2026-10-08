import assert from 'node:assert/strict'
import {test} from 'node:test'
import {createGgufLoadPlan} from '../src/main/local-ai-resources/gguf-load-plan'
import type {HuggingFaceModelBundle} from '../src/shared/contracts/managed-model-library.contract'
const GiB=1024**3
// Published complete 8B Q4_K_M / Q8_0 file sizes, independently observed
// Windows b11429 CPU load/qualification peak on the real product: 8.82 GiB.
// This fixture is a budget regression, never a runtime qualification.
const bundle:HuggingFaceModelBundle={id:'cpu-observation-8b',repository:'Qwen/Qwen3-VL-8B-Instruct-GGUF',revision:'a'.repeat(40),
 size:'8B',variant:'Instruct',languageQuantization:'Q4_K_M',projectorQuantization:'Q8_0',bytes:5780074528,
 files:[{name:'Qwen3VL-8B-Instruct-Q4_K_M.gguf',bytes:5027784800,sha256:'b'.repeat(64),downloadUrl:null},
  {name:'mmproj-Qwen3VL-8B-Instruct-Q8_0.gguf',bytes:752289728,sha256:'c'.repeat(64),downloadUrl:null}],support:'managed-gguf'}
await test('CPU envelope admits the observed 8B load with headroom and keeps the input/output plan intact',()=>{
 const plan=createGgufLoadPlan(bundle,'cpu')
 assert.ok(plan.cost.ramBytes>=8.82*GiB*1.1,'Known CPU working set must fit its declared envelope with headroom')
 assert.ok(plan.cost.ramBytes<11*GiB,'A CPU budget correction must remain bounded rather than reserve the whole device')
 assert.equal(plan.context,4096);assert.equal(plan.batch,512);assert.equal(plan.microBatch,128)
 assert.equal(plan.gpuLayers,0);assert.equal(plan.kvType,'f16');assert.deepEqual(plan.cost.gpuBytes,{})
})
