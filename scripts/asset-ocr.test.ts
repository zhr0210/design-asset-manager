import assert from 'node:assert/strict'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs/promises'
import {validateOcrObservation,ocrText} from '../src/shared/contracts/asset-ocr.contract'
import {runLocalOcr} from '../src/main/ocr/local-ocr-process'
const empty={engine:'rapidocr-onnxruntime',version:'1.4.4',recipe:'rapidocr-preview-v1',modelSha256:{det:'a'.repeat(64),cls:'b'.repeat(64),rec:'c'.repeat(64)},width:100,height:100,elapsedMs:1,threshold:.5,blocks:[]}
assert.equal(ocrText(validateOcrObservation(empty)),'')
assert.throws(()=>validateOcrObservation({...empty,blocks:null}))
assert.throws(()=>validateOcrObservation({...empty,elapsedMs:NaN}))
assert.throws(()=>validateOcrObservation({...empty,width:2000}))
const block={text:'OCR 2026',confidence:.9,polygon:[[0,0],[1,0],[1,1],[0,1]]}
assert.equal(ocrText(validateOcrObservation({...empty,blocks:[block]})),'OCR 2026')
assert.throws(()=>validateOcrObservation({...empty,blocks:[{...block,confidence:.1}]}))
assert.throws(()=>validateOcrObservation({...empty,blocks:[{...block,polygon:[[NaN,0],[1,0],[1,1],[0,1]]}]}))
const root=await fs.mkdtemp(path.join(os.tmpdir(),'dam-ocr-process-test-'))
const runner=path.join(root,'runner.py'),signal=new AbortController().signal
// Uses only stdlib Python fixture, not an OCR installation or model.
const python='/usr/bin/python3'
await fs.writeFile(runner,`import sys,json\nsys.stdin.buffer.read()\nprint(json.dumps(${JSON.stringify({ok:true,value:empty}).replaceAll('true','True')}))`)
assert.equal(ocrText(await runLocalOcr({python,runner,signal,preview:new Uint8Array([1,2,3])})), '')
await fs.writeFile(runner,"import sys\nsys.stdin.buffer.read()\nprint('{bad-json')")
await assert.rejects(runLocalOcr({python,runner,signal,preview:new Uint8Array([1])}),/OCR_RESULT_INVALID/)
await fs.writeFile(runner,"import sys,time\nsys.stdin.buffer.read()\ntime.sleep(30)")
await assert.rejects(runLocalOcr({python,runner,signal,timeoutMs:20,preview:new Uint8Array([1])}),/OCR_TIMEOUT/)
const cancelled=new AbortController();cancelled.abort()
await assert.rejects(runLocalOcr({python,runner,signal:cancelled.signal,preview:new Uint8Array([1])}),/OCR_CANCELLED/)
const active=new AbortController(),pending=runLocalOcr({python,runner,signal:active.signal,preview:new Uint8Array([1])});setTimeout(()=>active.abort(),20)
await assert.rejects(pending,/OCR_CANCELLED/)
console.log('OCR contract/process: valid empty, bounded text/geometry, malformed output, timeout and cancellation passed; no models loaded')
