import fs from 'node:fs/promises'
import path from 'node:path'
import Database from 'better-sqlite3'
import sharp from 'sharp'
import { createManagedVisionRuntime } from '../../src/main/services/ai-runtime/managed-vision-runtime'
import { createVisualAdmission } from '../../src/main/visual-ai/visual-admission'
import { createNewInstallAppSettingsDefaults } from '../../src/main/services/settings/settings-defaults.builder'
import { runCaption } from '../../src/main/visual-ai/caption-recipe'
import { runIndependentTags } from '../../src/main/independent-tags/tag-recipe'

// A diagnostic, never product acceptance. The product Host is unloaded first.
// Reads only the already authorized public model and coffee image, in an isolated DB.
const evidenceRoot = path.resolve('.scratch/b-model-management-20261006/evidence')
const evidence = JSON.parse(await fs.readFile(path.join(evidenceRoot,'library-latest.json'),'utf8'))
const model = evidence.models.find((m: any) => m.artifact.modelId === 'qwen3-vl-2b-instruct')
const libraryRoot = path.resolve('.scratch/b-model-management-20261006/real-library-01')
const library = new Database(path.join(libraryRoot,'.dam/library.sqlite'),{readonly:true,fileMustExist:true})
const image = library.prepare('SELECT file_path FROM assets WHERE title=?').get('public-04-coffee') as {file_path:string}
library.close()
const originalMarker = path.sep + 'Originals' + path.sep
const originalIndex = image.file_path.lastIndexOf(originalMarker)
if (originalIndex < 0) throw Error('DIAGNOSTIC_SOURCE_OUTSIDE_PUBLIC_COPY')
const imagePath = path.resolve(libraryRoot,'Originals',image.file_path.slice(originalIndex+originalMarker.length))
if (!imagePath.startsWith(path.join(libraryRoot,'Originals') + path.sep)) throw Error('DIAGNOSTIC_SOURCE_OUTSIDE_PUBLIC_COPY')
const diagnosticRoot = path.resolve('.scratch/b-model-management-20261006/response-diagnostic')
await fs.mkdir(diagnosticRoot,{recursive:true})
const db = new Database(path.join(diagnosticRoot,'app.sqlite'))
let activity:'idle'|'active'='idle'
const admission = createVisualAdmission({policy:{mode:'normal',reserveFraction:.05},activity:()=>activity})
let settings = createNewInstallAppSettingsDefaults()
const runtime = createManagedVisionRuntime({database:db,admission,
  runner:path.resolve('dist-packages/win-unpacked/resources/ai-service/tools/managed_vision_worker.py'),
  settings:{getSettings:()=>settings,saveSettings:value=>(settings={...settings,...value})} as any,
  selectModel:async()=>model.artifact.root,selectPython:async()=>model.configuration.python,changed(){}})
try {
  await runtime.configure(); await runtime.activate()
  const backend = settings.aiBackends!.find(b=>b.id==='dam-local-qwen-cpu')!
  const jpeg = await sharp(imagePath).resize({width:1024,height:1024,fit:'inside',withoutEnlargement:true}).jpeg().toBuffer()
  const output:unknown[]=[]
  try {
    const result = await runCaption({backend,model:backend.defaultModel!,jpeg,signal:new AbortController().signal},
      {invokeOnce:async input=>{const value=await runtime.invokeOnce(input);output.push(value);return value}})
    output.push({parsed:result})
  } catch (error) { output.push({parseError:error instanceof Error?error.message:'DIAGNOSTIC_FAILED'}) }
  await fs.writeFile(path.join(evidenceRoot,'2b-response-diagnostic-repaired.json'),JSON.stringify({scope:'public-04-coffee diagnostic only',output},null,2))
  const tagOutput:unknown[]=[]
  activity='active'
  const began=Date.now()
  try {
    const tags=await runIndependentTags({backend,model:backend.defaultModel!,jpeg,signal:AbortSignal.timeout(125000)},
      {invokeOnce:async input=>{const value=await runtime.invokeOnce(input);tagOutput.push(value);return value}})
    tagOutput.push({parsed:tags})
  } catch (error) { tagOutput.push({parseError:error instanceof Error?error.message:'DIAGNOSTIC_FAILED'}) }
  await fs.writeFile(path.join(evidenceRoot,'2b-tag-thread-change-diagnostic.json'),JSON.stringify({scope:'public-04-coffee diagnostic only; initialized at 4 threads, next work unit at 2',elapsedMs:Date.now()-began,output:tagOutput},null,2))
  console.log(JSON.stringify({scope:'public-04-coffee diagnostic only; thread change 4 to 2',elapsedMs:Date.now()-began,output:tagOutput}))
} finally { await runtime.drain();db.close() }
