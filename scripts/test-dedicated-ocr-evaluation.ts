import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {createHash} from 'node:crypto'
import {runLocalOcr} from '../src/main/ocr/local-ocr-process'
import {ocrText} from '../src/shared/contracts/asset-ocr.contract'

const normalize=(s:string)=>s.normalize('NFKC').replace(/\s/gu,'').toLowerCase()
function distance(left:string,right:string){const a=Array.from(left),b=Array.from(right);let row=b.map((_,i)=>i+1);row.unshift(0);for(let i=1;i<=a.length;i++){const next=[i];for(let j=1;j<=b.length;j++)next.push(Math.min(row[j]+1,next[j-1]+1,row[j-1]+(a[i-1]===b[j-1]?0:1)));row=next}return row[b.length]}
if(process.env.DAM_OCR_EXECUTE!=='1')console.log(JSON.stringify({state:'requires-approved-runtime',inferenceCalls:0}))
else{
 const runtime=JSON.parse(await fs.readFile('/tmp/dam-approved-ocr-evaluation-state.json','utf8'))
 const fixtureState=JSON.parse(await fs.readFile('/tmp/dam-ocr-fixtures-state.json','utf8'))
 const root=await fs.realpath(fixtureState.root),temp=await fs.realpath(os.tmpdir())
 if(!root.startsWith(temp+path.sep)||!path.basename(root).startsWith('dam-ocr-fixtures-')||runtime.verified!==true)throw Error('EVALUATION_SCOPE_INVALID')
 const manifest=JSON.parse(await fs.readFile(path.join(root,'manifest.json'),'utf8'))
 if(manifest.generatedOnly!==true||manifest.fixtures.length>16)throw Error('EVALUATION_SCOPE_INVALID')
 const rows=[]
 for(const fixture of manifest.fixtures){
  if(path.basename(fixture.file)!==fixture.file||typeof fixture.expected!=='string')throw Error('EVALUATION_SCOPE_INVALID')
  const file=await fs.realpath(path.join(root,fixture.file));if(!file.startsWith(root+path.sep))throw Error('EVALUATION_SCOPE_INVALID')
  const bytes=await fs.readFile(file),hash=createHash('sha256').update(bytes).digest('hex'),started=performance.now()
  try{
   const result=await runLocalOcr({python:runtime.python,runner:path.resolve('ai-service/tools/local_ocr_worker.py'),preview:bytes,signal:new AbortController().signal})
   const actual=ocrText(result),expected=normalize(fixture.expected),recognized=normalize(actual)
   rows.push({id:fixture.id,status:'completed',inputSha256:hash,expected:fixture.expected,actual,normalizedExact:recognized===expected,normalizedCharacterErrorRate:expected?distance(expected,recognized)/Array.from(expected).length:null,falsePositiveOnEmpty:!expected&&!!recognized,wallMs:Math.round(performance.now()-started),result})
  }catch(error){rows.push({id:fixture.id,status:'failed',inputSha256:hash,expected:fixture.expected,error:error instanceof Error&&/^OCR_[A-Z_]+$/.test(error.message)?error.message:'OCR_FAILURE'})}
  if(createHash('sha256').update(await fs.readFile(file)).digest('hex')!==hash)throw Error('GENERATED_SOURCE_CHANGED')
 }
 const report={generatedOnly:true,realUserMaterials:false,runtimeInstalledFrom:runtime.manifest,qualityVerdict:'requires-human-review',normalization:'NFKC, ignore whitespace and case; punctuation retained',processesCompleted:rows.filter(r=>r.status==='completed').length,fixtureCount:rows.length,exactNormalized:rows.filter(r=>'normalizedExact'in r&&r.normalizedExact).length,emptyFalsePositives:rows.filter(r=>'falsePositiveOnEmpty'in r&&r.falsePositiveOnEmpty).length,rows}
 await fs.writeFile(path.join(root,'report.json'),JSON.stringify(report,null,2))
 console.log(JSON.stringify({state:report.processesCompleted===rows.length?'completed':'partial',cases:rows.length,exactNormalized:report.exactNormalized,emptyFalsePositives:report.emptyFalsePositives,report:path.join(root,'report.json')}))
 if(report.processesCompleted!==rows.length)process.exitCode=1
}
