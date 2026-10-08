// Explicit real local OCR Adapter test; temporary DB, designated public inputs.
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import Database from 'better-sqlite3'
import {createOcrRuntime} from '../src/main/ocr/ocr-runtime'
import {createVisualAdmission} from '../src/main/visual-ai/visual-admission'
import {createLocalAiDeviceSampler} from '../src/main/local-ai-resources/device-sampler'
import {ocrText} from '../src/shared/contracts/asset-ocr.contract'
const dir=await fs.mkdtemp(path.resolve('.scratch/macos-migration-20261009/runtime-package-test/real-ocr-'))
const db=new Database(path.join(dir,'isolated.sqlite')),sampler=createLocalAiDeviceSampler()
await sampler.refresh()
const admission=createVisualAdmission({memory:()=>sampler.memory(),devices:()=>sampler.read(),activity:()=> 'unknown'})
const runtime=createOcrRuntime({database:db,runner:path.resolve('ai-service/tools/local_ocr_worker.py'),selectRoot:async()=>path.resolve('.scratch/macos-migration-20261009/ocr'),reserve:(bytes,signal)=>admission.reserveLocalWork('media',bytes,signal)})
try {
 await runtime.configure();const handle=await runtime.current();assert.ok(handle?.qualification)
 const publicResult=await handle.run(await fs.readFile('.scratch/macos-migration-20261009/public-sources/public-page.png'),new AbortController().signal)
 assert.ok(publicResult.blocks.length>0);const text=ocrText(publicResult)
 const empty=await handle.run(await fs.readFile('.scratch/macos-migration-20261009/public-sources/public-coffee.png'),new AbortController().signal)
 const result={kind:'internal-real-ocr',qualification:handle.qualification,text,blocks:publicResult.blocks.length,coffeeBlocks:empty.blocks.length,publicSource:'scikit-image v0.19.3 page/coffee',userPathAcceptance:false,activeProfileDbWrites:0}
 await fs.writeFile('.scratch/macos-migration-20261009/evidence/macos-real-ocr-internal.json',JSON.stringify(result,null,2))
 console.log(JSON.stringify(result))
}finally {await runtime.suspendAndDrain?.();await sampler.stop();db.close()}
