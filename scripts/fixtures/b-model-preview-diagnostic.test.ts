import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import Database from 'better-sqlite3'
import { createManagedVisionRuntime } from '../../src/main/services/ai-runtime/managed-vision-runtime'
import { createVisualAdmission } from '../../src/main/visual-ai/visual-admission'
import { createNewInstallAppSettingsDefaults } from '../../src/main/services/settings/settings-defaults.builder'
import { prepareVisualJpeg } from '../../src/main/visual-ai/visual-preparation'
import { safePreviewFileName } from '../../src/main/capture-intake/sharp-system-preview.adapter'
import { runIndependentTags } from '../../src/main/independent-tags/tag-recipe'
import { createAiConnectionService } from '../../src/main/ai-gateway/ai-connection-service'

// Diagnostic only: exact approved coffee preview + formal codec/provider, isolated runtime DB.
// Run only when the product Host is unloaded. Never counts as user acceptance.
const root=path.resolve('.scratch/b-model-management-20261006'), evidenceRoot=path.join(root,'evidence')
const evidence=JSON.parse(await fs.readFile(path.join(evidenceRoot,'library-latest.json'),'utf8'))
const model=evidence.models.find((m:any)=>m.ownership==='managed-download'&&m.artifact.modelId==='qwen3-vl-2b-instruct')
const db=new Database(path.join(root,'real-library-01/.dam/library.sqlite'),{readonly:true,fileMustExist:true})
const preview=db.prepare(`SELECT c.grid_thumbnail_ref ref,r.source_format format FROM assets a
 JOIN promotion_links p ON p.design_asset_identity=a.id
 JOIN asset_candidates c ON c.candidate_identity=p.candidate_identity
 JOIN capture_requests r ON r.capture_request_identity=c.capture_request_identity WHERE a.title=?`).get('public-04-coffee') as {ref:string,format:'jpeg'|'png'|'webp'}
const previous=db.prepare(`SELECT x.input_sha256 hash,x.state FROM independent_tag_executions x JOIN assets a ON a.id=x.asset_id WHERE a.title=? ORDER BY x.updated_at DESC LIMIT 1`).get('public-04-coffee')
db.close()
const source=await fs.readFile(path.join(root,'real-library-01/.dam/required-previews',safePreviewFileName(preview.ref.slice('preview:'.length),preview.format)))
const jpeg=(await prepareVisualJpeg(source,new AbortController().signal)).jpeg
const scratch=path.join(root,'preview-diagnostic');await fs.mkdir(scratch,{recursive:true})
const runtimeDb=new Database(path.join(scratch,'app.sqlite'))
const admission=createVisualAdmission({policy:{mode:'normal',reserveFraction:.05},activity:()=> 'active'})
let settings=createNewInstallAppSettingsDefaults()
const settingsPort={getSettings:()=>settings,saveSettings:(value:any)=>(settings={...settings,...value})} as any
const runtime=createManagedVisionRuntime({database:runtimeDb,admission,runner:path.join(root,'managed-worker-candidate.py'),settings:settingsPort,
 selectModel:async()=>model.artifact.root,selectPython:async()=>model.configuration.python,changed(){}})
const connections=createAiConnectionService({settings:settingsPort,managed:{owns:id=>id==='dam-local-qwen-cpu',prepare:runtime.prepare,invokeOnce:runtime.invokeOnce},vault:{} as any,runtime:{} as any,changed(){}})
const result:any={scope:'public-04-coffee exact formal preview diagnostic only',inputSha256:createHash('sha256').update(jpeg).digest('hex'),inputBytes:jpeg.length,previous}
try{
 await runtime.configure();await runtime.activate()
 const backend=settings.aiBackends!.find(b=>b.id==='dam-local-qwen-cpu')!
 const begin=Date.now(),responses:unknown[]=[]
 try{
  await connections.provider.prepare?.(backend.id,new AbortController().signal)
  result.tags=await runIndependentTags({backend,model:backend.defaultModel!,jpeg,signal:AbortSignal.timeout(120000)},
   {invokeOnce:async input=>{const value=await connections.provider.invokeOnce(input);responses.push(value);return value}})
 }catch(error){result.error=error instanceof Error?error.message:'DIAGNOSTIC_FAILED'}
 result.elapsedMs=Date.now()-begin;result.responses=responses
 await fs.writeFile(path.join(evidenceRoot,'2b-formal-preview-repetition-diagnostic.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result))
}finally{await runtime.drain();runtimeDb.close()}
