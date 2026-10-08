import assert from 'node:assert/strict'
import http from 'node:http'
import path from 'node:path'

export async function exerciseAiDiscovery(page,app,evidence){
 let calls=0,version=1,invalid=false
 const server=http.createServer(async(req,res)=>{
  if(req.method!=='POST'||req.url!=='/v1/chat/completions'){res.writeHead(404);res.end();return}
  calls++;for await(const _chunk of req){ /* Consume generated test previews without logging bytes. */ }
  res.setHeader('Content-Type','application/json')
  const output={caption:'晨雾中的山间海报',ocrText:'MORNING EDITION',prompt:'Editorial mountain composition with rimlight',tags:version===1?['山间','编辑设计']:['自然','编辑设计']}
  res.end(JSON.stringify({choices:[{message:{content:invalid?'not-valid-output':JSON.stringify(output)}}]}))
 })
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
 try{
  await page.getByRole('button',{name:'全部',exact:true}).click()
  const assets=await page.evaluate(()=>window.damClient.listAssets()),asset=assets[0]
  await page.evaluate(async baseUrl=>window.damClient.aiBackendSave({id:'ai-discovery-fixture',name:'隔离分析验证',type:'openai-compatible',enabled:true,baseUrl,defaultModel:'fixture-vision',timeoutMs:5000,priority:1,capabilities:{chat:true,vision:true,embeddings:false,jsonOutput:true,modelList:false,modelManagement:false}}),`http://127.0.0.1:${server.address().port}/v1`)
  await page.evaluate(id=>window.damClient.updateAssetCaption(id,'保留我编辑的说明'),asset.id)
  const open=page.locator(`[id="asset-card-open-${asset.id}"]`)
  await open.click();await page.getByText('AI 分析与提示词反推',{exact:true}).click()
  let panel=page.getByRole('region',{name:'AI 分析与反推',exact:true})
  const run=async()=>{
   const before=calls
   await panel.getByRole('button',{name:'分析 1 个素材',exact:true}).click()
   await panel.getByRole('region',{name:'确认 AI 执行范围'}).waitFor()
   assert.equal(calls,before,'Review sends no preview')
   await panel.getByRole('button',{name:'确认执行',exact:true}).click()
  }
  await run();await panel.getByText('分析完成 · 1/1',{exact:true}).waitFor()
  assert.equal(calls,1)
  await page.getByRole('button',{name:'确认 AI 标签 山间',exact:true}).waitFor()
  const read=()=>page.evaluate(id=>window.damClient.listAssets().then(rows=>rows.find(a=>a.id===id)),asset.id)
  assert.equal((await read()).ai_caption,'保留我编辑的说明')
  assert.deepEqual((await read()).visualAi.pendingTags,['山间','编辑设计'])
  await page.getByRole('button',{name:'关闭素材详情',exact:true}).click()
  const search=page.getByRole('textbox',{name:'搜索素材',exact:true})
  for(const [query,label] of [['山间','AI 建议标签'],['rimlight','反推提示词'],['晨雾','AI 画面描述'],['MORNING','OCR'],['保留我编辑','描述']]){
   await search.fill(query);await page.waitForFunction(()=>document.querySelectorAll('.lc-card').length===1)
   await page.waitForFunction(label=>document.querySelector('.lc-match')?.textContent.includes(label),label)
   assert.equal(await page.locator('.lc-card').first().getAttribute('data-asset-id'),asset.id)
  }
  await search.fill('');await page.getByRole('button',{name:'按标签筛选 山间',exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('.lc-card').length===1);await page.getByRole('button',{name:'取消筛选 tag:山间',exact:true}).click();await page.waitForFunction(n=>document.querySelectorAll('.lc-card').length===n,assets.length)
  await page.getByRole('button',{name:'文件夹',exact:true}).click()
  await page.getByRole('button',{name:'打开文件夹 山间',exact:true}).waitFor()
  const card=page.getByRole('button',{name:'打开文件夹 山间',exact:true})
  assert.match(await card.innerText(),/1 份内容.*AI 动态分类/s)
  await page.screenshot({path:path.join(evidence,'ai-folders-light.png')})
  await page.getByRole('button',{name:'切换明暗外观',exact:true}).click()
  await page.screenshot({path:path.join(evidence,'ai-folders-dark.png')})
  await page.getByRole('button',{name:'切换明暗外观',exact:true}).click()
  await card.click();assert.equal(await page.locator('.lc-card').count(),1)
  await search.fill('rimlight');assert.equal(await page.locator('.lc-card').count(),1);await search.fill('')
  await open.click();await page.getByRole('button',{name:'确认 AI 标签 山间',exact:true}).click()
  await page.waitForFunction(async id=>(await window.damClient.listAssets()).find(a=>a.id===id)?.tags.includes('山间'),asset.id)
  await page.getByRole('button',{name:'确认 AI 标签 山间',exact:true}).waitFor({state:'detached'})
  assert.deepEqual((await read()).visualAi.pendingTags,['编辑设计'])
  await page.getByRole('button',{name:'展开反推提示词',exact:true}).click()
  assert.match(await page.getByRole('textbox',{name:'反推提示词',exact:true}).inputValue(),/rimlight/)
  await page.screenshot({path:path.join(evidence,'ai-details-light.png')})
  // Complete another job after its inspector has been closed; Main events must refresh the library.
  await page.getByText('AI 分析与提示词反推',{exact:true}).click()
  panel=page.getByRole('region',{name:'AI 分析与反推',exact:true})
  version=2;await run();await page.getByRole('button',{name:'关闭素材详情',exact:true}).click()
  await page.getByRole('button',{name:'文件夹',exact:true}).click()
  await page.getByRole('button',{name:'打开文件夹 自然',exact:true}).waitFor()
  assert.equal(await page.getByRole('button',{name:'打开文件夹 山间',exact:true}).count(),0,'Old AI membership is replaced, confirmed tag retained')
  assert.ok((await read()).tags.includes('山间'))
  assert.equal((await page.evaluate(()=>window.damClient.listAssets())).length,assets.length,'No extra assets created')
  await page.setViewportSize({width:1024,height:900});assert.ok(await page.locator('.workspace-shell').evaluate(el=>el.getBoundingClientRect().width<=innerWidth));await page.screenshot({path:path.join(evidence,'ai-folders-compact.png')});await page.setViewportSize({width:1379,height:1042})
  await page.getByRole('button',{name:'全部',exact:true}).click();await open.click();await page.getByText('AI 分析与提示词反推',{exact:true}).click()
  panel=page.getByRole('region',{name:'AI 分析与反推',exact:true});invalid=true
  await run();await panel.getByText('分析失败 · 0/1',{exact:true}).waitFor()
  assert.deepEqual((await read()).visualAi.tags,['自然','编辑设计'],'Failure keeps last committed evidence')
  await page.getByRole('button',{name:'关闭素材详情',exact:true}).click()
  return {assetId:asset.id,count:assets.length}
 }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve))}
}
export async function verifyAiDiscoveryRestored(page,saved){
 const assets=await page.evaluate(()=>window.damClient.listAssets()),asset=assets.find(a=>a.id===saved.assetId)
 assert.equal(assets.length,saved.count);assert.equal(asset.ai_caption,'保留我编辑的说明');assert.deepEqual(asset.visualAi.tags,['自然','编辑设计'])
 await page.getByRole('button',{name:'文件夹',exact:true}).click();await page.getByRole('button',{name:'打开文件夹 自然',exact:true}).click()
 assert.equal(await page.locator('.lc-card').count(),1)
 await page.getByRole('textbox',{name:'搜索素材',exact:true}).fill('rimlight');assert.equal(await page.locator('.lc-card').count(),1)
 await page.getByRole('button',{name:'全部',exact:true}).click()
}
