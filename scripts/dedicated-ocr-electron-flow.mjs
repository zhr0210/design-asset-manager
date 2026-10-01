import assert from 'node:assert/strict'
import path from 'node:path'
export async function exerciseDedicatedOcr(page,app,evidence){
 const all=page.getByRole('button',{name:'全部',exact:true});await all.click()
 const assets=await page.evaluate(()=>window.electronAPI.listAssets()),chinese=assets.find(a=>a.title==='ocr-chinese'),blank=assets.find(a=>a.title==='ocr-blank');assert.ok(chinese&&blank)
 const scope=await page.evaluate(()=>window.electronAPI.library.inspect()),binding={libraryIdentity:scope.identity,generation:scope.generation}
 const get=()=>page.evaluate(id=>window.electronAPI.listAssets().then(a=>a.find(x=>x.id===id)),chinese.id)
 const open=()=>page.locator(`[id="asset-card-open-${chinese.id}"]`).click()
 await open();const panel=page.getByRole('region',{name:'专用文字识别',exact:true})
 await panel.getByRole('button',{name:'选择本地 OCR 环境',exact:true}).click()
 const run=async()=>{await panel.getByRole('button',{name:/^(识别文字|重新识别文字)$/}).click();await panel.getByRole('region',{name:'确认本地 OCR'}).waitFor();await panel.getByRole('button',{name:'确认识别并保存'}).click();await page.waitForFunction(async id=>(await window.electronAPI.assetOcr.status()).value?.job?.state!=='running'&&(await window.electronAPI.listAssets()).some(a=>a.id===id&&a.ocr),chinese.id);await panel.getByText(/OCR 识别完成/).waitFor()}
 await panel.getByRole('button',{name:'识别文字',exact:true}).click();await panel.getByText(/升级到 v8/).waitFor();await panel.getByRole('button',{name:'取消识别',exact:true}).click()
 assert.equal((await page.evaluate(s=>window.electronAPI.assetOcr.read(s),{...binding,assetId:chinese.id})).value.requiresUpgrade,true)
 await run();assert.match((await get()).ocr.text,/设计素材/)
 await panel.getByRole('button',{name:'修订识别文字',exact:true}).click();await panel.getByRole('textbox',{name:'修订识别文字'}).fill('校对文字 2026')
 await app.evaluate(({ipcMain})=>{globalThis.__ocrCorrect=ipcMain._invokeHandlers.get('asset-ocr:correct');ipcMain.removeHandler('asset-ocr:correct');ipcMain.handle('asset-ocr:correct',()=>({ok:false,error:'模拟保存失败'}))})
 await panel.getByRole('button',{name:'保存文字修订'}).click();await panel.getByRole('alert').waitFor()
 await page.getByRole('button',{name:'关闭素材详情'}).click();await open();await panel.getByRole('textbox',{name:'修订识别文字'}).waitFor();assert.equal(await panel.getByRole('textbox',{name:'修订识别文字'}).inputValue(),'校对文字 2026')
 await app.evaluate(({ipcMain})=>{ipcMain.removeHandler('asset-ocr:correct');ipcMain.handle('asset-ocr:correct',globalThis.__ocrCorrect);delete globalThis.__ocrCorrect})
 await panel.getByRole('button',{name:'保存文字修订'}).click();await page.waitForFunction(async id=>(await window.electronAPI.listAssets()).find(a=>a.id===id)?.ocr?.text==='校对文字 2026',chinese.id)
 await run();assert.equal((await get()).ocr.text,'校对文字 2026');assert.equal((await get()).ocr.edited,true)
 await page.screenshot({path:path.join(evidence,'dedicated-ocr-corrected.png')})
 await page.getByRole('button',{name:'关闭素材详情'}).click();const search=page.getByRole('textbox',{name:'搜索素材',exact:true});await search.fill('校对文字');await page.waitForFunction(()=>document.querySelectorAll('.lc-card').length===1);assert.match(await page.locator('.lc-match').innerText(),/OCR/);await search.fill('')
 await page.locator(`[id="asset-card-open-${blank.id}"]`).click();await panel.getByRole('button',{name:'识别文字',exact:true}).click();await panel.getByRole('button',{name:'确认识别并保存'}).click();await panel.getByText('当前预览未检出文字。',{exact:true}).waitFor();await panel.getByText(/OCR 识别完成/).waitFor();await page.screenshot({path:path.join(evidence,'dedicated-ocr-empty.png')})
 const receipt=await page.evaluate(s=>window.electronAPI.assetOcr.prepare({...s,assetIds:[s.assetId]}),{...binding,assetId:chinese.id});
 // Strict input rejects extra keys; obtain an actual valid receipt separately.
 assert.equal(receipt.ok,false)
 const plan=await page.evaluate(s=>window.electronAPI.assetOcr.prepare(s),{...binding,assetIds:[chinese.id]});assert.equal(plan.ok,true)
 await page.getByRole('link',{name:'资料库管理'}).click();await page.getByTestId('library-close').click();await page.getByTestId('library-reopen').click();await page.locator('.lc-card').first().waitFor()
 assert.equal((await page.evaluate(r=>window.electronAPI.assetOcr.run(r),plan.value.receipt)).ok,false,'Closed/reopened sessions revoke pending OCR confirmation')
 const restored=await page.evaluate(async id=>{const a=(await window.electronAPI.listAssets()).find(x=>x.id===id);const p=await window.electronAPI.library.trashPrepare({designAssetIdentity:id,expectedRevision:a.revision});if(p.kind!=='planned')throw Error('Trash preparation failed');await window.electronAPI.library.trashDispatch({kind:'confirm-plan',planReceipt:p.plan.receipt});const row=(await window.electronAPI.library.trashList()).find(x=>x.id===id);await window.electronAPI.library.trashDispatch({kind:'restore-design-asset',designAssetIdentity:id,expectedRevision:row.revision});return(await window.electronAPI.listAssets()).find(x=>x.id===id)},chinese.id)
 assert.equal(restored.ocr.text,'校对文字 2026','Restoring the same preview preserves OCR and user corrections')
 await all.click()
 return{chinese:chinese.id,blank:blank.id}
}
export async function verifyDedicatedOcrRestored(page,saved){
 const rows=await page.evaluate(()=>window.electronAPI.listAssets());assert.equal(rows.find(a=>a.id===saved.chinese)?.ocr.text,'校对文字 2026');assert.equal(rows.find(a=>a.id===saved.blank)?.ocr.text,'')
 assert.equal((await page.evaluate(()=>window.electronAPI.assetOcr.status())).value.configured,true)
 await page.locator(`[id="asset-card-open-${saved.chinese}"]`).click();await page.getByRole('region',{name:'专用文字识别',exact:true}).getByText('校对文字 2026',{exact:true}).waitFor();await page.getByRole('button',{name:'关闭素材详情'}).click()
}
