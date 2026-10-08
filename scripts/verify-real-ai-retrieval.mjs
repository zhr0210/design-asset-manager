// Read a previous generated-only evaluation library; do not re-run inference to obtain a passing answer.
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {_electron as electron} from 'playwright'
const root=await fs.realpath(process.env.DAM_REAL_AI_RESULT_ROOT||'missing')
if(path.dirname(root)!==await fs.realpath(os.tmpdir())||!path.basename(root).startsWith('dam-library-canvas-e2e-'))throw Error('GENERATED_SCOPE_REQUIRED')
const previous=JSON.parse(await fs.readFile(path.join(root,'evidence','real-local-ai-report.json'),'utf8'));if(previous.generatedOnly!==true||previous.realLocalInference!==true||!previous.allVisualJobsCompleted)throw Error('SUCCESSFUL_REAL_RESULT_REQUIRED')
const sources=(await fs.readdir(path.join(root,'sources'))).filter(f=>/\.(png|jpg|webp)$/.test(f)).map(f=>path.join(root,'sources',f))
const config={rootDirectory:root,profileDirectory:path.join(root,'profile'),libraryDirectory:path.join(root,'library'),evidenceDirectory:path.join(root,'evidence'),sourceSelections:[sources]}
const app=await electron.launch({args:['.','--dam-active-library-synthetic-e2e',`--user-data-dir=${config.profileDirectory}`],env:{...process.env,NODE_ENV:'test',DAM_ACTIVE_LIBRARY_SYNTHETIC_E2E:JSON.stringify(config)}})
try{
 const page=await app.firstWindow();await page.getByTestId('formal-library-canvas').waitFor()
 if(await page.getByTestId('library-reopen').isVisible())await page.getByTestId('library-reopen').click();else if(await page.getByTestId('library-open').isVisible())await page.getByTestId('library-open').click()
 await page.locator('.lc-card').first().waitFor();const rows=await page.evaluate(()=>window.damClient.listAssets()),poster=rows.find(a=>a.title==='sample-2');assert.ok(poster?.visualAi?.tags.length)
 const tag=poster.visualAi.tags[0],token=poster.visualAi.prompt.match(/[a-z]{4,}/gi)?.find(word=>!poster.visualAi.tags.some(tag=>tag.toLowerCase().includes(word.toLowerCase())))
 assert.ok(token,'Need a real prompt term distinct from tag labels for attribution')
 await page.getByRole('button',{name:'文件夹',exact:true}).click();await page.getByRole('button',{name:'打开文件夹 '+tag,exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('.lc-card').length===1);assert.equal(await page.locator('.lc-card').getAttribute('data-asset-id'),poster.id)
 await page.getByRole('textbox',{name:'搜索素材'}).fill(token);await page.waitForFunction(()=>document.querySelector('.lc-match')?.textContent.includes('反推提示词'));assert.equal(await page.locator('.lc-card').count(),1)
 const explanation=await page.locator('.lc-match').innerText()
 await page.screenshot({path:path.join(config.evidenceDirectory,'real-result-folder-and-prompt-search.png')})
 const after=await page.evaluate(()=>window.damClient.listAssets());assert.deepEqual(after,rows)
 await fs.writeFile(path.join(config.evidenceDirectory,'real-retrieval-report.json'),JSON.stringify({generatedOnly:true,reusedSuccessfulRealRun:true,newInferenceCalls:0,realTagFolderVerified:true,promptSearchVerified:true,explanation,assetMetadataUnchanged:true},null,2))
 console.log('Stored real AI results: tag folder, attributed prompt search and no metadata mutation passed; no new inference.')
}finally{await app.close()}
