import assert from 'node:assert/strict'
import { createHash, randomBytes } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import http from 'node:http'
import path from 'node:path'

import { _electron as electron } from 'playwright'
import sharp from 'sharp'

if (!process.env.DAM_SKIP_BUILD) execFileSync(process.execPath, ['node_modules/electron-vite/bin/electron-vite.js', 'build'], {
  cwd: process.cwd(),
  stdio: 'inherit'
})

const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'dam-active-library-electron-e2e-')))
const profileDirectory = path.join(root, 'profile')
const libraryDirectory = path.join(root, 'library')
const evidenceDirectory = path.join(root, 'evidence')
const sourceDirectory = path.join(root, 'sources')
await Promise.all([profileDirectory, evidenceDirectory, sourceDirectory].map((directory) => fs.mkdir(directory, { recursive: true })))

const sourceFiles = [
  path.join(sourceDirectory, 'alpha-blue.png'),
  path.join(sourceDirectory, 'beta-green.jpg'),
  path.join(sourceDirectory, 'gamma-red.webp')
]
const unsupportedSource = path.join(sourceDirectory, 'excluded.txt')
await Promise.all([
  sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="3200" height="2400" viewBox="0 0 600 450"><defs><linearGradient id="s" x2="1" y2="1"><stop stop-color="#afcbd4"/><stop offset="1" stop-color="#f2d7b7"/></linearGradient></defs><rect width="600" height="450" fill="url(#s)"/><circle cx="440" cy="110" r="48" fill="#ffe7c5"/><path d="M0 290Q160 170 290 280T600 240V450H0Z" fill="#456e91"/><path d="M0 345Q230 225 390 338T600 310V450H0Z" fill="#284e72"/><path d="M0 415Q150 320 340 390T600 370V450H0Z" fill="#adc5c7"/></svg>')).png().toFile(sourceFiles[0]),
  sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 400 500"><rect width="400" height="500" fill="#d7c7b1"/><path d="M65 500V175a135 135 0 0 1 270 0v325" fill="#a4927d"/><path d="M100 500V190a100 100 0 0 1 200 0v310" fill="#526c60"/><path d="m100 500 125-305h75v305" fill="#d6c9a7"/><path d="m135 500 130-260h35v260" fill="#f0e6cf"/><path d="M0 468h400v32H0" fill="#a58d75"/></svg>')).jpeg().toFile(sourceFiles[1]),
  sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="640" viewBox="0 0 600 320"><rect width="600" height="320" fill="#e3d7c9"/><circle cx="430" cy="70" r="30" fill="#fff1d9"/><path d="M0 250Q250 70 600 220V320H0Z" fill="#c1a48a"/><path d="M0 320Q130 80 600 260V320Z" fill="#b98966"/><path d="M0 320Q130 80 600 260Q280 195 265 320Z" fill="#e8c7a1"/></svg>')).webp().toFile(sourceFiles[2]),
  fs.writeFile(unsupportedSource, 'synthetic unsupported fixture\n')
])

const sourceHashesBefore = await Promise.all(sourceFiles.map(fileSha256))
const milestones = []
const configuration = {
  rootDirectory: root,
  profileDirectory,
  libraryDirectory,
  evidenceDirectory,
  sourceSelections: [
    [unsupportedSource],
    [...sourceFiles, unsupportedSource],
    [...sourceFiles, unsupportedSource]
  ]
}

const persistentBytes = await sharp(randomBytes(1024 * 1024 * 3), { raw: { width: 1024, height: 1024, channels: 3 } }).png().toBuffer()
const persistentRequests = []
let recoveryRequests = 0
const resumeRequests = []
let visionRequests = 0; let imageRequests = 0
const fixtureServer = http.createServer(async (request, response) => {
  if (request.url === '/persistent.png') {
    persistentRequests.push({ range: request.headers.range, validator: request.headers['if-range'] })
    if (!request.headers.range && persistentRequests.length === 1) {
      response.writeHead(200, { ETag: '"persistent-v1"', 'Content-Length': persistentBytes.length, 'Content-Type': 'image/png' })
      response.write(persistentBytes.subarray(0, 1024 * 1024 + 128)); return
    }
    const offset = request.headers.range ? Number(/bytes=(\d+)-/.exec(request.headers.range)[1]) : 0
    response.writeHead(offset ? 206 : 200, { ETag: '"persistent-v1"', 'Content-Length': persistentBytes.length - offset, 'Content-Type': 'image/png', ...(offset ? { 'Content-Range': `bytes ${offset}-${persistentBytes.length - 1}/${persistentBytes.length}` } : {}) })
    response.end(persistentBytes.subarray(offset)); return
  }
  if (request.url === '/recovery.png') { recoveryRequests++; response.setHeader('Content-Type', 'image/png'); response.end(await fs.readFile(sourceFiles[0])); return }
  if (request.url === '/resume.png') {
    const image = await fs.readFile(sourceFiles[0])
    resumeRequests.push({ range: request.headers.range, validator: request.headers['if-range'] })
    if (!request.headers.range && resumeRequests.length === 1) {
      response.writeHead(200, { ETag: '"fixture-resume"', 'Content-Length': image.length, 'Content-Type': 'image/png' })
      response.write(image.subarray(0, Math.floor(image.length / 3))); return
    }
    const offset = request.headers.range ? Number(/bytes=(\d+)-/.exec(request.headers.range)[1]) : 0
    response.writeHead(offset ? 206 : 200, { ETag: '"fixture-resume"', 'Content-Length': image.length - offset, 'Content-Type': 'image/png', ...(offset ? { 'Content-Range': `bytes ${offset}-${image.length - 1}/${image.length}` } : {}) })
    response.end(image.subarray(offset)); return
  }
  if (request.url === '/fixture.png') { imageRequests++; response.setHeader('Content-Type', 'image/png'); response.end(await fs.readFile(sourceFiles[0])); return }
  if (request.url === '/v1/chat/completions' && request.method === 'POST') {
    visionRequests++; for await (const _chunk of request) { /* Consume fixture input without logging image bytes. */ }
    response.setHeader('Content-Type', 'application/json')
    response.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ caption: 'Synthetic visual description', ocrText: 'E2E VISION TEXT', prompt: 'Synthetic mountain poster prompt', tags: ['synthetic-vision-tag'] }) } }] })); return
  }
  response.writeHead(404); response.end()
})
await new Promise(resolve => fixtureServer.listen(0, '127.0.0.1', resolve))
const fixtureOrigin = `http://127.0.0.1:${fixtureServer.address().port}`
const launchOptions = {
  args: ['.', '--dam-active-library-synthetic-e2e', `--user-data-dir=${profileDirectory}`],
  env: {
    ...process.env,
    NODE_ENV: 'test',
    DAM_ACTIVE_LIBRARY_SYNTHETIC_E2E: JSON.stringify(configuration)
  }
}
let electronApp = await electron.launch(launchOptions)

try {
  const page = await electronApp.firstWindow()
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.waitForSelector('[data-testid="active-library-controls"]')
  const electronPaths = await electronApp.evaluate(({ app }) => ({
    userData: app.getPath('userData'),
    sessionData: app.getPath('sessionData'),
    logs: app.getPath('logs'),
    crashDumps: app.getPath('crashDumps')
  }))
  assert.equal(Object.values(electronPaths).every((candidate) => isInside(root, candidate)), true, 'Every application write location must remain inside the synthetic root.')
  const blockedNetwork = await page.evaluate(async () => {
    try { await fetch('https://network-must-remain-blocked.invalid/'); return false } catch { return true }
  })
  assert.equal(blockedNetwork, true)
  milestones.push('synthetic-profile-and-network-boundary')

  await page.getByTestId('library-create').click()
  await page.getByTestId('library-create-review').waitFor()
  const createSheet = page.getByRole('dialog', { name: '确认创建素材库' })
  await createSheet.waitFor()
  await page.keyboard.press('Tab')
  await page.keyboard.press('Shift+Tab')
  assert.equal(await page.getByTestId('library-create-cancel').evaluate(el => el === document.activeElement), true)
  await page.keyboard.press('Escape')
  await createSheet.waitFor({ state: 'detached' })
  await assertPathMissing(libraryDirectory, 'Cancelling creation must not create the selected Library.')
  milestones.push('create-review-cancelled-without-disk-change')

  await page.getByTestId('library-create').click()
  await page.getByTestId('library-create-confirm').click()
  await page.getByTestId('active-library-controls').getByText('已打开', { exact: true }).waitFor({state:'attached'})
  await createSheet.waitFor({ state: 'detached' })
  assert.equal(await page.getByRole('textbox', { name: '搜索素材' }).evaluate(el => el === document.activeElement), true, 'Creation should move focus to the new workspace when its original trigger disappears.')
  milestones.push('created-and-opened')

  await openLibraryManager(page)
  await page.getByTestId('library-add-assets').click()
  await page.getByTestId('library-copy-review').waitFor()
  await page.getByText('没有可收录的图片，请重新选择 PNG、JPG 或 WEBP 文件。', { exact: true }).waitFor()
  assert.equal(await page.getByTestId('library-copy-confirm').isDisabled(), true)
  await page.getByTestId('library-copy-cancel').click()
  assert.equal(await cardCount(page), 0)
  milestones.push('unsupported-copy-blocked')

  await openLibraryManager(page)
  await page.getByTestId('library-add-assets').click()
  const review = page.getByTestId('library-copy-review')
  await review.waitFor()
  await review.getByText(/可收录 3 个；排除 1 个/).waitFor()
  await page.getByTestId('library-copy-cancel').click()
  assert.equal(await cardCount(page), 0)
  milestones.push('copy-review-cancelled')

  await openLibraryManager(page)
  await page.getByTestId('library-add-assets').click()
  await review.waitFor()
  const copyReceipt = await review.getAttribute('data-plan-receipt')
  assert.ok(copyReceipt)
  await page.getByTestId('library-copy-confirm').click()
  await waitForCardCount(page, 3)
  const previewUrls = await page.locator('.lc-card img').evaluateAll((images) => images.map((image) => image.getAttribute('src')))
  assert.equal(previewUrls.every((url) => typeof url === 'string' && url.startsWith('dam-preview://preview/')), true)
  const previewStatuses = await page.evaluate(async (urls) => Promise.all(urls.map(async (url) => {
    try {
      const response = await fetch(url)
      return { status: response.status, type: response.headers.get('content-type'), denial: response.headers.get('x-dam-synthetic-denial'), bytes: (await response.arrayBuffer()).byteLength }
    } catch {
      return { status: 0, type: null, denial: null, bytes: 0 }
    }
  })), previewUrls)
  assert.equal(previewStatuses.every((result) => result.status === 200 && result.type?.startsWith('image/') && result.bytes > 0), true, JSON.stringify(previewStatuses))
  await page.waitForFunction(() => Array.from(document.querySelectorAll('.lc-card img')).every((image) => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0))
  await page.screenshot({ path: path.join(evidenceDirectory, 'active-library-ready.png'), fullPage: true, animations: 'disabled' })
  milestones.push('copied-promoted-and-previewed-three-formats')
  if((process.env.DAM_E2E_NOTEBOOKS==='1'||process.env.DAM_E2E_ORGANIZATION==='1'||process.env.DAM_E2E_WORKSETS==='1')){
    const result=await page.evaluate(async()=>{const authority=await window.damClient.library.inspect(),assets=await window.damClient.listAssets();const scope={libraryIdentity:authority.identity,generation:authority.generation,assetId:assets[0].id};const read=await window.damClient.library.notebookRead(scope);return window.damClient.library.notebookSave({...scope,sessionToken:read.value.sessionToken,sourceRef:read.value.sourceRef,expectedRevision:0,allowUpgrade:true,book:{pages:[{id:'compatibility-note',name:'Compatibility',elements:[]}],active:'compatibility-note'}})});
    assert.equal(result.success,true);milestones.push('notebook-v5-enabled-before-ai-download-and-recovery')
    if(process.env.DAM_E2E_WORKSETS==='1'){
      const result=await page.evaluate(async()=>{const a=await window.damClient.library.inspect(),scope={libraryIdentity:a.identity,generation:a.generation},c=await window.damClient.workSets.read(scope);return window.damClient.workSets.write({...scope,sessionToken:c.value.sessionToken,allowUpgrade:true,command:{kind:'create',value:{name:'Compatibility work set',note:'',assetIds:[],colors:[],columns:2}}})});assert.equal(result.success,true);milestones.push('workset-v7-enabled-before-ai-download-and-recovery')
    }

    if(process.env.DAM_E2E_ORGANIZATION==='1'){
      const result=await page.evaluate(async()=>{const a=await window.damClient.library.inspect();const scope={libraryIdentity:a.identity,generation:a.generation};const read=await window.damClient.library.organizationRead(scope);return window.damClient.library.organizationWrite({...scope,sessionToken:read.value.sessionToken,expectedRevision:read.value.revision,allowUpgrade:true,command:{kind:'create',name:'Compatibility folder',folderKind:'assets',parentId:null}})});assert.equal(result.success,true);milestones.push('organization-v6-enabled-before-ai-download-and-recovery')
    }

  }


  const navigation = page.getByRole('navigation', { name: '工作区导航' })
  await navigation.waitFor()
  const sidebarBefore = await page.getByTestId('library-sidebar').boundingBox()
  const menuButton = page.getByRole('button', { name: '更多功能菜单', exact: true })
  await menuButton.hover()
  assert.equal(await page.getByTestId('global-navigation-menu-popover').count(), 0, 'Moving across navigation must not open an accidental menu.')
  await menuButton.click()
  await page.getByRole('menuitem', { name: '切换明暗外观', exact: true }).click()
  await page.keyboard.press('Escape')
  assert.equal(await page.locator('html').evaluate(element => element.classList.contains('dark')), true)
  await page.screenshot({ path: path.join(evidenceDirectory, 'workspace-dark.png'), fullPage: true, animations: 'disabled' })
  await menuButton.click()
  await page.getByRole('menuitem', { name: '切换明暗外观', exact: true }).click()
  await page.keyboard.press('Escape')
  const density = page.getByRole('slider', { name: '缩略图大小' })
  await density.focus()
  const initialDensity = Number(await density.inputValue())
  await density.press('ArrowUp')
  assert.equal(Number(await density.inputValue()), initialDensity + 10)
  await density.press('ArrowDown')
  milestones.push('stable-navigation-theme-and-density')
  const typingSearch = page.getByRole('textbox', { name: '搜索素材' })
  await typingSearch.focus()
  await typingSearch.press('s')
  assert.equal(await typingSearch.inputValue(), 's', 'Local workspace search remains keyboard accessible.')
  await typingSearch.fill('')
  await waitForCardCount(page, 3)

  const replay = await page.evaluate(async (receipt) => window.damClient.library.addDispatch(receipt), copyReceipt)
  assert.equal(replay.state, 'complete')
  assert.equal(await cardCount(page), 3, 'Replaying the same confirmation receipt must not create duplicate Assets.')
  milestones.push('duplicate-confirmation-replayed')

  const firstCard = page.locator('.lc-card').filter({ hasText: 'alpha-blue' })
  const cardTrigger = firstCard.locator('button[id^="asset-card-open-"]')
  await cardTrigger.focus()
  await page.keyboard.press('Space')
  const quickLook = page.getByRole('dialog', { name: '专注模式' })
  await quickLook.waitFor()
  await page.screenshot({ path: path.join(evidenceDirectory, 'workspace-quick-look.png'), animations: 'disabled' })
  await page.keyboard.press('Escape')
  await quickLook.waitFor({ state: 'detached' })
  assert.equal(await cardTrigger.evaluate(el => el === document.activeElement), true)
  await page.keyboard.press('Meta+f')
  assert.equal(await typingSearch.evaluate(el => el === document.activeElement), true)
  await cardTrigger.dblclick()
  await quickLook.waitFor()
  await page.keyboard.press('Escape')
  await quickLook.waitFor({ state: 'detached' })
  await firstCard.locator('button[id^="asset-card-open-"]').click()
  await openInspectorEditor(page)
  await page.getByRole('region',{name:'素材详细分析'}).waitFor()
  const inspector = page.getByRole('region', { name: '素材详细分析' })
  await inspector.waitFor()
  const sidebarAfter = await page.getByTestId('library-sidebar').boundingBox()
  assert.ok(sidebarBefore && sidebarAfter && sidebarBefore.x === sidebarAfter.x && sidebarBefore.width === sidebarAfter.width, 'Opening the Inspector must preserve collection navigation.')
  await page.setViewportSize({ width: 1120, height: 720 })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'The minimum desktop viewport must not scroll horizontally.')
  await page.screenshot({ path: path.join(evidenceDirectory, 'workspace-inspector-minimum.png'), fullPage: true, animations: 'disabled' })
  await page.setViewportSize({ width: 1280, height: 900 })
  const tagInput = inspector.getByPlaceholder('搜索或输入后按回车快速添加标签...')
  await tagInput.fill('manual-blue')
  await tagInput.press('Enter')
  await inspector.locator('.host-editor').getByText('manual-blue', { exact: true }).waitFor()
  const firstAssetId = await firstCard.getAttribute('data-asset-id')
  assert.ok(firstAssetId)
  assert.equal((await searchByTag(page, 'manual-blue')).length, 1)
  await inspector.getByLabel('关闭素材详情').click()
  await inspector.waitFor({ state: 'detached' })
  milestones.push('manual-tag-created-and-main-search-verified')

  await page.evaluate(() => { location.hash = '/tag-manager' })
  await page.getByRole('heading', { name: '标签', exact: true }).waitFor()
  await page.getByRole('button', { name: '新建标签', exact: true }).click()
  let tagEditor = page.getByRole('dialog', { name: '新建标签', exact: true })
  await tagEditor.getByRole('textbox', { name: '标签名称', exact: true }).fill('Colors')
  await tagEditor.getByRole('button', { name: '创建标签', exact: true }).click()
  await tagEditor.waitFor({ state: 'detached' })
  await page.getByRole('button', { name: '编辑标签 manual-blue', exact: true }).click()
  tagEditor = page.getByRole('dialog', { name: '编辑标签', exact: true })
  await tagEditor.getByRole('textbox', { name: '新别名', exact: true }).fill('Ocean Blue')
  await tagEditor.getByRole('button', { name: '添加别名', exact: true }).click()
  await tagEditor.getByRole('button', { name: '移除别名 Ocean Blue', exact: true }).waitFor()
  await tagEditor.getByLabel('上级标签', { exact: true }).selectOption({ label: 'Colors' })
  await waitForAsync(() => page.evaluate(async () => {
    const tags = (await window.damClient.tagList()).tags
    const child = tags.find(t => t.name === 'manual-blue')
    return child?.parentId === tags.find(t => t.name === 'Colors')?.id
  }))
  await tagEditor.getByRole('textbox', { name: '标签名称', exact: true }).fill('Colors')
  await tagEditor.getByRole('button', { name: '保存标签', exact: true }).click()
  await tagEditor.getByRole('alert').waitFor()
  assert.equal(await tagEditor.getByRole('textbox', { name: '标签名称', exact: true }).inputValue(), 'Colors')
  await tagEditor.getByRole('textbox', { name: '标签名称', exact: true }).fill('manual-blue')
  await tagEditor.getByLabel('标签颜色', { exact: true }).selectOption({ label: '粉色' })
  await page.screenshot({ path: path.join(evidenceDirectory, 'tag-manager-edit.png'), fullPage: true, animations: 'disabled' })
  await tagEditor.getByRole('button', { name: '保存标签', exact: true }).click()
  await tagEditor.waitFor({ state: 'detached' })
  await page.getByRole('textbox', { name: '搜索标签', exact: true }).fill('Ocean Blue')
  assert.equal(await page.locator('tbody tr').count(), 1)
  await page.getByRole('textbox', { name: '搜索标签', exact: true }).fill('no-such-tag')
  await page.getByRole('button', { name: '重置筛选', exact: true }).click()
  await page.setViewportSize({ width: 1120, height: 720 })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true)
  await page.screenshot({ path: path.join(evidenceDirectory, 'tag-manager-table.png'), fullPage: true, animations: 'disabled' })
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.locator('tbody').getByRole('button', { name: 'manual-blue', exact: true }).click()
  await waitForCardCount(page, 1)
  await clearGalleryFilters(page)
  await page.getByRole('textbox', { name: '搜索素材', exact: true }).fill('Ocean Blue')
  await waitForCardCount(page, 1)
  await page.getByRole('textbox', { name: '搜索素材', exact: true }).fill('')
  await waitForCardCount(page, 3)
  milestones.push('tag-metadata-ui-alias-search-and-hierarchy')

  const lexicalSearch = page.getByRole('textbox', { name: '搜索素材' })
  await lexicalSearch.fill('beta-green')
  await waitForCardCount(page, 1)
  await page.getByRole('button', { name: '清除搜索', exact: true }).click()
  await waitForCardCount(page, 3)
  await page.getByRole('button',{name:'标签筛选',exact:true}).click()
  const sidebarTag = page.getByRole('dialog',{name:'标签筛选'}).getByRole('button', { name: /manual-blue/ })
  await sidebarTag.waitFor()
  await sidebarTag.click()
  await page.getByRole('dialog',{name:'标签筛选'}).getByRole('button',{name:'完成',exact:true}).click()
  await waitForCardCount(page, 1)
  await clearGalleryFilters(page)
  await waitForCardCount(page, 3)
  milestones.push('lexical-and-tag-filter-ui-verified')

  const allCardIds = await page.locator('.lc-card').evaluateAll((cards) => cards.map((card) => card.getAttribute('data-asset-id')))
  const cardIds = [firstAssetId, allCardIds.find((id) => id && id !== firstAssetId)]
  await selectCards(page, cardIds)
  await page.getByText('批量添加标签', { exact: true }).click()
  await page.getByRole('button', { name: /manual-blue/ }).last().click()
  await page.getByRole('button', { name: /确认执行批量修改/ }).click()
  assert.equal((await searchByTag(page, 'manual-blue')).length, 2)

  await selectCards(page, cardIds)
  await page.getByText('批量移除标签', { exact: true }).click()
  await page.getByRole('button', { name: /manual-blue/ }).last().click()
  await page.getByRole('button', { name: /确认执行批量修改/ }).click()
  assert.equal((await searchByTag(page, 'manual-blue')).length, 0)
  milestones.push('batch-add-and-remove-tags')

  await firstCard.locator('button[id^="asset-card-open-"]').click()
  await openInspectorEditor(page)
  await page.getByRole('region',{name:'素材详细分析'}).waitFor()
  await inspector.getByPlaceholder('搜索或输入后按回车快速添加标签...').fill('manual-blue')
  await inspector.getByPlaceholder('搜索或输入后按回车快速添加标签...').press('Enter')
  await inspector.locator('.host-editor').getByText('manual-blue', { exact: true }).waitFor()
  await inspector.getByText('移到回收站', { exact: true }).click()
  await page.getByTestId('asset-trash-review').waitFor()
  await page.getByText('确认移到回收站', { exact: true }).click()
  await waitForCardCount(page, 2)

  await page.getByRole('navigation',{name:'工作区导航'}).getByRole('button',{name:'回收站',exact:true}).click()
  const trashPanel = page.getByTestId('library-trash-panel')
  await trashPanel.locator('[data-trash-asset-id]').waitFor()
  await trashPanel.locator('img').evaluate((image) => new Promise((resolve, reject) => {
    if (image.complete && image.naturalWidth > 0) return resolve(true)
    image.addEventListener('load', () => resolve(true), { once: true })
    image.addEventListener('error', () => reject(new Error('Trash preview failed to load.')), { once: true })
  }))
  await page.screenshot({ path: path.join(evidenceDirectory, 'active-library-trash.png'), fullPage: true, animations: 'disabled' })
  await trashPanel.getByRole('button', { name: /恢复素材/ }).click()
  await page.getByRole('navigation',{name:'工作区导航'}).getByRole('button',{name:'全部',exact:true}).click()
  await waitForCardCount(page, 3)
  assert.equal((await searchByTag(page, 'manual-blue')).map((asset) => asset.id).includes(firstAssetId), true, 'Restore must retain manual Tag relationships.')
  milestones.push('trash-preview-and-restore')

  // The approved modes use real managed previews and a restricted native window.
  await page.getByRole('navigation',{name:'工作区导航'}).getByRole('button',{name:'全部',exact:true}).click()
  await firstCard.locator('button[id^="asset-card-open-"]').click()
  await openInspectorEditor(page)
  await page.getByRole('region',{name:'素材详细分析'}).waitFor()
  assert.equal(await page.locator('.image-tools-panel').count(), 1, 'Image tools belong inside the inspector scroll surface.')
  assert.equal(await page.locator('.inspector-ai-tools').count(), 1)
  assert.equal(await page.getByText('可以编辑标签和描述。AI 功能暂未启用。', { exact: true }).count(), 0)
  // Mode transitions use the current rail and focus overlay.
  await selectCurrentMode(page, '专注查看')
  await page.locator('[data-view-mode="focus"][data-mode-phase="idle"]').waitFor()
  await assertImagesLoaded(page.locator('.canvas-image-frame img'))
  await page.screenshot({ path: path.join(evidenceDirectory, 'production-focus.png'), animations: 'disabled' })
  await selectCurrentMode(page, '悬浮卡片')
  await page.locator('[data-view-mode="card"][data-mode-phase="idle"]').waitFor()
  await page.getByRole('button', { name: '编辑描述', exact: true }).click()
  await page.getByRole('textbox', { name: '素材描述', exact: true }).fill('Unsaved across mode and route')
  await selectCurrentMode(page, '专注查看')
  await selectCurrentMode(page, '悬浮卡片')
  await page.getByRole('textbox', { name: '素材描述', exact: true }).waitFor()
  assert.equal(await page.getByRole('textbox', { name: '素材描述', exact: true }).inputValue(), 'Unsaved across mode and route')
  await page.evaluate(() => { window.location.hash = '#/settings?section=ai' })
  await page.getByRole('heading', { name: '设置', exact: true }).waitFor()
  await page.evaluate(() => { window.location.hash = '#/library' })
  await page.getByRole('textbox', { name: '素材描述', exact: true }).waitFor()
  assert.equal(await page.getByRole('textbox', { name: '素材描述', exact: true }).inputValue(), 'Unsaved across mode and route')
  await page.locator('.asset-card-description').getByRole('button', { name: '取消', exact: true }).click()
  await page.getByRole('textbox', { name: '提示词草稿', exact: true }).fill('Synthetic main window draft')
  await page.getByRole('button', { name: '上一张素材', exact: true }).click()
  await page.getByRole('textbox', { name: '提示词草稿', exact: true }).fill('Other asset inline prompt')
  await page.getByRole('button', { name: '编辑描述', exact: true }).click()
  await page.getByRole('textbox', { name: '素材描述', exact: true }).fill('Other asset inline description')
  await selectCurrentMode(page, '专注查看')
  await selectCurrentMode(page, '资料库')
  await firstCard.locator('button[id^="asset-card-open-"]').click()
  await openInspectorEditor(page)
  await page.getByRole('region',{name:'素材详细分析'}).waitFor()
  await selectCurrentMode(page, '悬浮卡片')
  await page.getByRole('textbox', { name: '提示词草稿', exact: true }).waitFor()
  assert.equal(await page.getByRole('textbox', { name: '提示词草稿', exact: true }).inputValue(), 'Synthetic main window draft')
  const nativeWindowPromise = electronApp.waitForEvent('window')
  await page.getByRole('button', { name: '在桌面悬浮', exact: true }).click()
  const cardWindow = await nativeWindowPromise
  await cardWindow.getByRole('region', { name: '素材悬浮卡片' }).waitFor()
  await assertImagesLoaded(cardWindow.locator('.asset-card-image img'))
  assert.equal(await cardWindow.evaluate(() => typeof window.damClient), 'undefined', 'The card must not receive the full application preload.')
  assert.equal(await cardWindow.evaluate(() => typeof window.assetCardAPI?.act), 'function')
  assert.equal(await cardWindow.getByRole('textbox', { name: '提示词草稿', exact: true }).inputValue(), 'Synthetic main window draft')
  await cardWindow.getByRole('textbox', { name: '提示词草稿', exact: true }).fill('Synthetic native draft')
  await cardWindow.getByRole('button', { name: '编辑描述', exact: true }).click()
  await cardWindow.getByRole('textbox', { name: '素材描述', exact: true }).fill('Description saved from native card')
  assert.equal(await cardWindow.getByRole('button', { name: 'AI 设置', exact: true }).isDisabled(), true)
  const tokenBeforeReopen = await cardWindow.evaluate(async () => (await window.assetCardAPI.inspect()).state.token)
  await page.getByRole('button', { name: '聚焦桌面卡片', exact: true }).click()
  assert.equal(await cardWindow.evaluate(async () => (await window.assetCardAPI.inspect()).state.token), tokenBeforeReopen)
  assert.equal(await cardWindow.getByRole('textbox', { name: '素材描述', exact: true }).inputValue(), 'Description saved from native card')
  assert.equal(await cardWindow.getByRole('textbox', { name: '提示词草稿', exact: true }).inputValue(), 'Synthetic native draft')
  await cardWindow.getByRole('button', { name: '保存描述', exact: true }).click()
  await cardWindow.getByRole('textbox', { name: '素材描述', exact: true }).waitFor({ state: 'hidden' })
  const updated = await page.evaluate(async id => (await window.damClient.listAssets()).find(asset => asset.id === id), firstAssetId)
  assert.equal(updated.aiCaption ?? updated.ai_caption, 'Description saved from native card')
  await cardWindow.getByRole('button', { name: '取消窗口置顶', exact: true }).click()
  await cardWindow.getByRole('button', { name: '窗口置顶', exact: true }).waitFor()
  await cardWindow.screenshot({ path: path.join(evidenceDirectory, 'native-asset-card.png'), animations: 'disabled' })
  const manualTag = (await page.evaluate(() => window.damClient.tagList())).tags.find(tag => tag.name === 'manual-blue')
  assert.ok(manualTag)
  await page.evaluate(async id => window.damClient.tagUpdate(id, { name: 'renamed-in-main' }), manualTag.id)
  await cardWindow.getByText('renamed-in-main', { exact: true }).waitFor()
  await page.evaluate(async id => window.damClient.tagUpdate(id, { name: 'manual-blue' }), manualTag.id)
  await cardWindow.getByText('manual-blue', { exact: true }).waitFor()
  await cardWindow.getByRole('button', { name: '上一张素材', exact: true }).click()
  assert.equal(await cardWindow.getByRole('textbox', { name: '提示词草稿', exact: true }).inputValue(), 'Other asset inline prompt')
  assert.equal(await cardWindow.getByRole('textbox', { name: '素材描述', exact: true }).inputValue(), 'Other asset inline description')
  await cardWindow.locator('.asset-card-description').getByRole('button', { name: '取消', exact: true }).click()
  await cardWindow.getByRole('textbox', { name: '提示词草稿', exact: true }).fill('Second asset native draft')
  const nativeClosed = cardWindow.waitForEvent('close')
  await cardWindow.getByRole('button', { name: '返回专注查看', exact: true }).click()
  await nativeClosed
  await page.locator('[data-view-mode="focus"][data-mode-phase="idle"]').waitFor()
  await selectCurrentMode(page, '资料库')
  await firstCard.locator('button[id^="asset-card-open-"]').click()
  await openInspectorEditor(page)
  await page.getByRole('region',{name:'素材详细分析'}).waitFor()
  await selectCurrentMode(page, '悬浮卡片')
  await page.locator('[data-view-mode="card"][data-mode-phase="idle"]').waitFor()
  assert.equal(await page.getByRole('textbox', { name: '提示词草稿', exact: true }).inputValue(), 'Synthetic native draft')
  await page.evaluate(async id => window.damClient.updateAssetCaption(id, 'New committed metadata'), firstAssetId)
  await selectCurrentMode(page, '专注查看')
  await page.evaluate(() => { window.location.hash = '#/settings' })
  await page.getByRole('heading', { name: '设置', exact: true }).waitFor()
  await page.evaluate(() => { window.location.hash = '#/library' })
  await page.locator('[data-view-mode="focus"][data-mode-phase="idle"]').waitFor()
  await selectCurrentMode(page, '悬浮卡片')
  await page.getByRole('button', { name: '编辑描述', exact: true }).click()
  assert.equal(await page.getByRole('textbox', { name: '素材描述', exact: true }).inputValue(), 'New committed metadata')
  await page.locator('.asset-card-description').getByRole('button', { name: '取消', exact: true }).click()
  const revokedWindowPromise = electronApp.waitForEvent('window')
  await page.getByRole('button', { name: '在桌面悬浮', exact: true }).click()
  const revokedWindow = await revokedWindowPromise
  await revokedWindow.getByRole('region', { name: '素材悬浮卡片' }).waitFor()
  const revokedClosed = revokedWindow.waitForEvent('close')
  await openLibraryManager(page)
  await page.getByTestId('library-close').click()
  await revokedClosed
  await page.getByTestId('library-reopen').click()
  await waitForCardCount(page, 3)
  assert.equal(await page.getByRole('navigation',{name:'工作区导航'}).getByRole('button',{name:'全部',exact:true}).getAttribute('aria-pressed'),'true')
  milestones.push('production-modes-native-card-narrow-preload-drafts-caption-and-revocation')

  const stalePreviewUrl = previewUrls[0]
  const wrongGenerationStatus = await page.evaluate(async (assetId) => {
    const authority = await window.damClient.library.inspect()
    const url = `dam-preview://preview/${encodeURIComponent(authority.identity)}/${encodeURIComponent('generation:stale')}/${encodeURIComponent(assetId)}`
    try { return (await fetch(url)).status } catch { return 0 }
  }, firstAssetId)
  assert.notEqual(wrongGenerationStatus, 200, 'A mismatched generation must not serve preview bytes.')
  await openLibraryManager(page)
  await page.getByTestId('library-close').click()
  await page.getByTestId('active-library-controls').getByText('已关闭', { exact: true }).waitFor()
  assert.equal(await page.locator('.lc-card').count(), 0)
  const stalePreviewStatus = await page.evaluate(async (url) => {
    try { return (await fetch(url)).status } catch { return 0 }
  }, stalePreviewUrl)
  assert.notEqual(stalePreviewStatus, 200, 'A closed or old generation must not serve preview bytes.')

  await page.getByTestId('library-open').click()
  await page.getByTestId('active-library-controls').getByText('已打开', { exact: true }).waitFor({state:'attached'})
  await waitForCardCount(page, 3)
  assert.equal((await searchByTag(page, 'manual-blue')).length, 1)
  await openLibraryManager(page)
  await page.getByTestId('library-close').click()
  await page.getByTestId('active-library-controls').getByText('已关闭', { exact: true }).waitFor()
  await page.getByTestId('library-reopen').click()
  await page.getByTestId('active-library-controls').getByText('已打开', { exact: true }).waitFor({state:'attached'})
  await waitForCardCount(page, 3)
  assert.equal((await searchByTag(page, 'manual-blue')).length, 1)
  milestones.push('close-open-reopen-persistence-and-stale-media-rejection')
  for (const removed of ['/browser', '/search', '/sites']) {
    await page.evaluate(next => { window.location.hash = '#' + next }, removed)
    await page.waitForFunction(() => window.location.hash === '#/library')
    await waitForCardCount(page, 3)
    assert.equal(await page.getByTestId('browser-workspace').count(), 0)
  }
  await page.getByRole('button', { name: '更多功能菜单', exact: true }).click()
  const menu = page.getByRole('menu', { name: '更多功能' })
  for (const removed of ['网页采集','来源发现','网站账号']) assert.equal(await menu.getByRole('link', { name: removed, exact: true }).count(), 0)
  assert.equal(await menu.getByRole('menuitem', { name: '下载队列', exact: true }).count(), 1)
  await page.keyboard.press('Escape')
  assert.equal(await page.evaluate(() => ['browserLoadUrl','onInjectedDownloadTrigger','runSearch','listSites','extractorScanPage'].some(key => typeof window.damClient[key] === 'function')), false)
  assert.equal(await electronApp.evaluate(({ ipcMain }) => [...ipcMain._invokeHandlers.keys()].some(key => /^(browser:|sites:|search:run|extractor:)/.test(key))), false)
  milestones.push('web-routes-and-bridge-removed-local-library-and-downloads-retained')
  await page.evaluate(() => { window.location.hash = '#/settings?section=ai' })
  const backendPanel = page.getByRole('region', { name: '模型服务配置' })
  await backendPanel.getByRole('button', { name: '添加服务', exact: true }).click()
  await backendPanel.getByRole('textbox', { name: '服务名称', exact: true }).fill('Synthetic service configuration')
  await backendPanel.getByRole('button', { name: '保存服务', exact: true }).click()
  await backendPanel.getByText('服务配置已保存。', { exact: true }).waitFor()
  assert.equal((await page.evaluate(() => window.damClient.aiBackendList())).some(item => item.name === 'Synthetic service configuration'), true)
  await backendPanel.getByRole('button', { name: '移除配置', exact: true }).click()
  await backendPanel.getByRole('button', { name: '确认移除配置', exact: true }).click()
  await backendPanel.getByText('配置已移除。', { exact: true }).waitFor()
  assert.equal((await page.evaluate(() => window.damClient.aiBackendList())).some(item => item.name === 'Synthetic service configuration'), false)
  await page.screenshot({ path: path.join(evidenceDirectory, 'production-settings-ai.png'), animations: 'disabled' })
  milestones.push('ai-service-settings-crud-through-real-preload')
  milestones.push('local-settings-and-navigation-policy')

  // Only generated materials and a test-owned loopback HTTP service are used here.
  await page.evaluate(async baseUrl => window.damClient.aiBackendSave({ id: 'e2e-vision', name: 'Synthetic vision', type: 'openai-compatible', enabled: true, baseUrl, defaultModel: 'synthetic-vision', timeoutMs: 5000, priority: 1, capabilities: { chat: true, vision: true, embeddings: false, jsonOutput: true, modelList: false, modelManagement: false } }), `${fixtureOrigin}/v1`)
  await page.evaluate(() => { window.location.hash = '#/library' })
  await page.locator(`[data-asset-id="${firstAssetId}"] button[id^="asset-card-open-"]`).click()
  await selectCurrentMode(page, '悬浮卡片')
  await page.locator('[data-view-mode="card"][data-mode-phase="idle"]').waitFor()
  const visionWindowPromise = electronApp.waitForEvent('window')
  await page.getByRole('button', { name: '在桌面悬浮', exact: true }).click()
  const visionWindow = await visionWindowPromise
  await visionWindow.getByRole('region', { name: '素材悬浮卡片' }).waitFor()
  const outsideAsset = await visionWindow.evaluate(async () => {
    const current = (await window.assetCardAPI.inspect()).state
    return window.visualAiAPI.prepare({ libraryIdentity: current.context.libraryIdentity, generation: current.context.generation, assetIds: ['not-this-card'], backendId: 'e2e-vision', purpose: 'analyze' })
  })
  assert.equal(outsideAsset.ok, false, 'Native card cannot analyze another asset.')
  assert.equal(visionRequests, 0)
  const visionPanel = visionWindow.getByRole('region', { name: 'AI 分析与反推', exact: true })
  await visionPanel.getByRole('button', { name: '反推提示词', exact: true }).click()
  await visionPanel.getByRole('region', { name: '确认 AI 执行范围' }).waitFor().catch(async error => { await visionWindow.screenshot({ path: path.join(evidenceDirectory, 'visual-ai-failure.png') }); throw error })
  assert.equal(visionRequests, 0, 'Preparing in native UI must not transmit.')
  await visionPanel.getByRole('button', { name: /^(确认执行|同意发送并执行)$/ }).click()
  await visionPanel.getByText('分析完成 · 1/1', { exact: true }).waitFor()
  assert.equal(visionRequests, 1)
  await visionPanel.getByRole('button', { name: 'synthetic-vision-tag', exact: true }).click()
  await page.waitForFunction(async () => (await window.damClient.listAssets()).some(asset => asset.tags.includes('synthetic-vision-tag')))
  await visionWindow.getByRole('textbox', { name: '提示词草稿', exact: true }).fill('Keep my draft')
  await visionPanel.getByRole('button', { name: '追加到现有草稿', exact: true }).click()
  assert.equal(await visionWindow.getByRole('textbox', { name: '提示词草稿', exact: true }).inputValue(), 'Keep my draft\n\nSynthetic mountain poster prompt')
  await visionWindow.screenshot({ path: path.join(evidenceDirectory, 'production-visual-ai.png') })
  const outsideTool = await visionWindow.evaluate(async () => {
    const state = (await window.assetCardAPI.inspect()).state
    return window.imageToolsAPI.prepare({ ...state.context, assetId: 'not-this-card', options: { rotation: 0, mirror: false, crop: 'original', maxEdge: 640 } })
  })
  assert.equal(outsideTool.ok, false)
  await visionWindow.locator('.image-tools-panel > summary').click()
  const imageTools = visionWindow.getByRole('region', { name: '图片副本工具' })
  await imageTools.getByLabel('副本旋转角度').selectOption('90')
  await imageTools.getByLabel('副本裁剪比例').selectOption('square')
  await imageTools.getByLabel('副本最长边').selectOption('640')
  await imageTools.getByLabel('水平镜像').check()
  await imageTools.getByRole('button', { name: '生成副本预览', exact: true }).click()
  await assertImagesLoaded(imageTools.getByRole('img', { name: '处理后的副本预览' }))
  assert.equal((await page.evaluate(() => window.damClient.listAssets())).length, 3, 'Tool preview alone must not create an Asset.')
  await imageTools.getByText('640 × 640 · PNG', { exact: true }).waitFor()
  await visionWindow.screenshot({ path: path.join(evidenceDirectory, 'production-image-tools.png') })
  await imageTools.getByText(/恢复意图|恢复继续/).first().waitFor()
  await imageTools.getByRole('button', { name: '保存副本到资料库', exact: true }).click()
  await imageTools.getByText('副本已保存到当前资料库，来源素材保持不变。', { exact: true }).waitFor()
  const variants = await page.evaluate(async () => (await window.damClient.listAssets()).filter(asset => asset.source_site_id === 'image-tools'))
  assert.equal(variants.length, 1); assert.equal(variants[0].width, 640); assert.equal(variants[0].height, 640)
  milestones.push('native-image-tools-real-preview-one-copy-and-source-protection')

  await imageTools.getByLabel('副本输入来源', { exact: true }).selectOption('original')
  await imageTools.getByLabel('副本旋转角度', { exact: true }).selectOption('0')
  await imageTools.getByLabel('副本裁剪比例', { exact: true }).selectOption('free')
  await imageTools.getByRole('button', { name: '加载裁剪画面', exact: true }).click()
  const cropSurface = imageTools.getByRole('group', { name: '自由裁剪画面', exact: true })
  await cropSurface.getByRole('img', { name: '自由裁剪参考画面' }).waitFor()
  await cropSurface.scrollIntoViewIfNeeded()
  const cropBounds = await cropSurface.boundingBox()
  assert.ok(cropBounds)
  await visionWindow.mouse.move(cropBounds.x + cropBounds.width * 0.25, cropBounds.y + cropBounds.height * 0.25)
  await visionWindow.mouse.down()
  await visionWindow.mouse.move(cropBounds.x + cropBounds.width * 0.75, cropBounds.y + cropBounds.height * 0.75, { steps: 5 })
  await visionWindow.mouse.up()
  const drawnWidth = Number(await imageTools.getByLabel('裁剪宽度百分比', { exact: true }).inputValue())
  assert.ok(drawnWidth > 48 && drawnWidth < 52, 'Pointer drag must change the crop selection.')
  await imageTools.getByLabel('裁剪左侧百分比', { exact: true }).fill('25')
  await imageTools.getByLabel('裁剪顶部百分比', { exact: true }).fill('12.5')
  await imageTools.getByLabel('裁剪宽度百分比', { exact: true }).fill('50')
  await imageTools.getByLabel('裁剪高度百分比', { exact: true }).fill('75')
  await cropSurface.focus()
  await visionWindow.keyboard.press('ArrowRight')
  assert.equal(Number(await imageTools.getByLabel('裁剪左侧百分比', { exact: true }).inputValue()), 26)
  await visionWindow.keyboard.press('ArrowLeft')
  await cropSurface.screenshot({ path: path.join(evidenceDirectory, 'native-free-crop-selection.png') })
  await visionWindow.screenshot({ path: path.join(evidenceDirectory, 'native-free-crop-controls.png') })
  await imageTools.getByRole('button', { name: '生成副本预览', exact: true }).click()
  await imageTools.getByText('1600 × 1800 · PNG', { exact: true }).waitFor()
  await imageTools.getByText('原件分辨率副本 · 输入 3200 × 2400', { exact: true }).waitFor()
  await imageTools.getByText(/恢复意图|恢复继续/).first().waitFor()
  await imageTools.getByRole('button', { name: '保存副本到资料库', exact: true }).click()
  await imageTools.getByText('副本已保存到当前资料库，来源素材保持不变。', { exact: true }).waitFor()
  const originalVariants = await page.evaluate(async () => (await window.damClient.listAssets()).filter(asset => asset.source_site_name === '图片工具 · 原件派生副本'))
  assert.equal(originalVariants.length, 1)
  assert.equal(originalVariants[0].width, 1600); assert.equal(originalVariants[0].height, 1800)
  milestones.push('native-original-resolution-free-crop-pointer-keyboard-and-save')

  await visionWindow.close()
  await page.locator('[data-view-mode="focus"][data-mode-phase="idle"]').waitFor()
  milestones.push('native-visual-ai-consent-http-evidence-tag-refresh-and-prompt-append')

  await page.evaluate(() => { window.location.hash = '#/downloads' })
  await page.getByRole('checkbox', { name: '在当前库保留恢复检查点' }).check()
  await page.getByRole('textbox', { name: '图片下载地址', exact: true }).fill(`${fixtureOrigin}/fixture.png`)
  await page.getByRole('button', { name: '准备下载', exact: true }).click()
  await page.getByRole('region', { name: '确认下载入库' }).waitFor()
  assert.equal(imageRequests, 0)
  assert.equal(await page.getByText(/当前素材库将升级为 v3/).count(), 0, 'v4 already includes durable downloads')
  await page.screenshot({ path: path.join(evidenceDirectory, 'download-persistence-review.png'), animations: 'disabled' })
  await page.getByRole('button', { name: '确认下载并入库', exact: true }).click()
  await page.getByText('已完成文件校验与入库', { exact: true }).waitFor()
  assert.equal(imageRequests, 1)
  await page.screenshot({ path: path.join(evidenceDirectory, 'production-managed-download.png') })
  await page.evaluate(() => { window.location.hash = '#/library' })
  await selectCurrentMode(page, '资料库')
  await waitForCardCount(page, 6)
  await assertImagesLoaded(page.locator('.lc-card img'))
  milestones.push('download-ui-review-http-capture-and-library-refresh')

  await page.evaluate(() => { window.location.hash = '#/downloads' })
  await page.getByRole('textbox', { name: '图片下载地址', exact: true }).fill(`${fixtureOrigin}/resume.png`)
  await page.getByRole('button', { name: '准备下载', exact: true }).click()
  await page.getByRole('button', { name: '确认下载并入库', exact: true }).click()
  const resumedSection = page.locator('.managed-download-job').filter({ hasText: 'resume.png' })
  await waitForAsync(() => page.evaluate(async () => (await window.damClient.managedDownloads.list()).value.some(job => job.fileName === 'resume.png' && job.receivedBytes > 0)))
  await resumedSection.getByRole('button', { name: '取消下载', exact: true }).click()
  await resumedSection.getByText('已取消', { exact: true }).waitFor()
  const pausedDownload = await page.evaluate(async () => (await window.damClient.managedDownloads.list()).value.find(job => job.fileName === 'resume.png'))
  assert.equal((await page.evaluate(() => window.damClient.listAssets())).length, 6)
  await resumedSection.getByRole('button', { name: '重试下载', exact: true }).click()
  await resumedSection.getByText('已完成文件校验与入库', { exact: true }).waitFor()
  assert.equal(resumeRequests.length, 2)
  assert.equal(resumeRequests[1].range, `bytes=${pausedDownload.receivedBytes}-`)
  assert.equal(resumeRequests[1].validator, '"fixture-resume"')
  await page.screenshot({ path: path.join(evidenceDirectory, 'download-resumed.png') })
  await page.evaluate(() => { window.location.hash = '#/library' })
  await waitForCardCount(page, 7)
  await assertImagesLoaded(page.locator('.lc-card img'))
  milestones.push('download-ui-cancel-exact-range-resume-and-one-import')

  const recoveryDatabase = path.join(libraryDirectory, '.dam', 'library.sqlite')
  execFileSync('/usr/bin/sqlite3', [recoveryDatabase, "CREATE TRIGGER fixture_recovery_fault BEFORE UPDATE OF managed_original_ref ON asset_candidates BEGIN SELECT RAISE(ABORT, 'synthetic fault'); END"])
  try {
    await page.evaluate(() => { window.location.hash = '#/downloads' })
    await page.getByRole('textbox', { name: '图片下载地址', exact: true }).fill(`${fixtureOrigin}/recovery.png`)
    await page.getByRole('button', { name: '准备下载', exact: true }).click()
    await page.getByRole('button', { name: '确认下载并入库', exact: true }).click()
    await page.locator('.managed-download-job').filter({ hasText: 'recovery.png' }).getByText('需要恢复', { exact: true }).waitFor()
    assert.equal(recoveryRequests, 1)
    assert.equal((await page.evaluate(() => window.damClient.listAssets())).length, 7)
  } finally { execFileSync('/usr/bin/sqlite3', [recoveryDatabase, 'DROP TRIGGER fixture_recovery_fault']) }
  const recoverySection = page.locator('.managed-download-job').filter({ hasText: 'recovery.png' })
  await recoverySection.getByRole('button', { name: '检查并恢复入库', exact: true }).click()
  const recoveryReview = page.getByRole('dialog', { name: '恢复已下载图片入库', exact: true })
  await recoveryReview.waitFor()
  await page.screenshot({ path: path.join(evidenceDirectory, 'download-recovery-review.png'), animations: 'disabled' })
  await recoveryReview.getByRole('button', { name: '取消', exact: true }).click()
  assert.equal((await page.evaluate(() => window.damClient.listAssets())).length, 7)
  await recoverySection.getByRole('button', { name: '检查并恢复入库', exact: true }).click()
  await recoveryReview.getByRole('button', { name: '确认检查并恢复', exact: true }).click()
  await recoverySection.getByText('已完成文件校验与入库', { exact: true }).waitFor()
  assert.equal(recoveryRequests, 1, 'Recovery must use retained files, never issue another HTTP request.')
  await page.screenshot({ path: path.join(evidenceDirectory, 'download-recovered.png'), animations: 'disabled' })
  await page.evaluate(() => { window.location.hash = '#/library' })
  await waitForCardCount(page, 8)
  await assertImagesLoaded(page.locator('.lc-card img'))
  milestones.push('download-ui-reviewed-local-recovery-without-network-or-duplicate')
  await openLibraryManager(page)
  await page.getByTestId('library-close').click()
  await page.getByTestId('active-library-controls').getByText('已关闭', { exact: true }).waitFor()
  await page.getByTestId('library-reopen').click()
  await waitForCardCount(page, 8)
  await assertImagesLoaded(page.locator('.lc-card img'))
  milestones.push('v4-variant-intent-and-persistent-download-library-reopen')


  // Close the actual app with a durable prefix, then launch a fresh Main/Renderer process.
  await page.evaluate(() => { window.location.hash = '#/downloads' })
  await page.getByRole('checkbox', { name: '在当前库保留恢复检查点' }).check()
  await page.getByRole('textbox', { name: '图片下载地址', exact: true }).fill(`${fixtureOrigin}/persistent.png`)
  await page.getByRole('button', { name: '准备下载', exact: true }).click()
  await page.getByRole('button', { name: '确认下载并入库', exact: true }).click()
  await waitForAsync(() => page.evaluate(async () => (await window.damClient.managedDownloads.list()).value.some(job => job.fileName === 'persistent.png' && job.checkpointBytes >= 1024 * 1024)))
  const persistentSection = page.locator('.managed-download-job').filter({ hasText: 'persistent.png' })
  await persistentSection.getByRole('button', { name: '取消下载', exact: true }).click()
  try { await persistentSection.getByText('已取消', { exact: true }).waitFor({ timeout: 10000 }) }
  catch (error) { console.log('Cancellation diagnostics:', await page.evaluate(() => window.damClient.managedDownloads.list())); await page.screenshot({ path: path.join(evidenceDirectory, 'cancel-diagnostics.png'), animations: 'disabled' }); throw error }
  assert.equal(persistentRequests.length, 1)
  await electronApp.close()
  await waitForFile(path.join(evidenceDirectory, 'shutdown-complete'))
  await fs.unlink(path.join(evidenceDirectory, 'shutdown-complete'))
  electronApp = await electron.launch(launchOptions)
  const restarted = await electronApp.firstWindow()
  await restarted.setViewportSize({ width: 1280, height: 900 })
  await restarted.getByTestId('library-open').click()
  await restarted.getByTestId('active-library-controls').getByText('已打开', { exact: true }).waitFor({state:'attached'})
  await restarted.evaluate(() => { window.location.hash = '#/downloads' })
  const recoveredSection = restarted.locator('.managed-download-job').filter({ hasText: 'persistent.png' })
  await recoveredSection.getByRole('button', { name: '恢复下载', exact: true }).waitFor()
  assert.equal(persistentRequests.length, 1, 'App restart and discovery cannot initiate HTTP')
  await recoveredSection.getByRole('button', { name: '恢复下载', exact: true }).click()
  const resumedReview = restarted.getByRole('region', { name: '确认下载入库' })
  await resumedReview.getByText(/已验证 1024 KB/).waitFor()
  await restarted.screenshot({ path: path.join(evidenceDirectory, 'download-restart-review.png'), animations: 'disabled' })
  await resumedReview.getByRole('button', { name: '取消', exact: true }).click()
  assert.equal(persistentRequests.length, 1)
  await recoveredSection.getByRole('button', { name: '恢复下载', exact: true }).click()
  await resumedReview.getByRole('button', { name: '确认恢复下载', exact: true }).click()
  await recoveredSection.getByText('已完成文件校验与入库', { exact: true }).waitFor()
  assert.deepEqual(persistentRequests, [{ range: undefined, validator: undefined }, { range: 'bytes=1048576-', validator: '"persistent-v1"' }])
  await restarted.evaluate(() => { window.location.hash = '#/library' })
  await waitForCardCount(restarted, 9)
  await assertImagesLoaded(restarted.locator('.lc-card img'))
  milestones.push('actual-electron-process-restart-reviewed-checkpoint-range-and-import')



} catch(error) {
  console.error('E2E failed after:',milestones.at(-1),String(error))
  await fs.writeFile(path.join(evidenceDirectory,'failure.txt'),String(error))
  try { const current=await electronApp.firstWindow();await current.screenshot({path:path.join(evidenceDirectory,'failure.png')});await electronApp.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().forEach(w=>w.destroy())) } catch {}
  throw error
} finally {
  await electronApp.close()
  fixtureServer.closeAllConnections(); await new Promise(resolve => fixtureServer.close(resolve))
}

await waitForFile(path.join(evidenceDirectory, 'shutdown-complete'))
const sourceHashesAfter = await Promise.all(sourceFiles.map(fileSha256))
assert.deepEqual(sourceHashesAfter, sourceHashesBefore, 'Copy Into Library must preserve every source file byte-for-byte.')

const databasePath = path.join(libraryDirectory, '.dam', 'library.sqlite')
const databaseSummary = execFileSync('/usr/bin/sqlite3', [databasePath, "SELECT (SELECT COUNT(*) FROM assets),(SELECT COUNT(*) FROM asset_lifecycle WHERE lifecycle_state='active'),(SELECT COUNT(*) FROM asset_lifecycle WHERE lifecycle_state='trash'),(SELECT COUNT(*) FROM tags),(SELECT COUNT(*) FROM asset_tags WHERE status='confirmed');"], { encoding: 'utf8' }).trim()
assert.equal(databaseSummary, '9|9|0|3|2')
assert.equal(execFileSync('/usr/bin/sqlite3', [databasePath, 'PRAGMA user_version; SELECT COUNT(*) FROM visual_ai_evidence; SELECT COUNT(*) FROM managed_download_intents WHERE phase="completed";'], { encoding: 'utf8' }).trim(), `${process.env.DAM_E2E_WORKSETS==='1'?7:process.env.DAM_E2E_ORGANIZATION==='1'?6:process.env.DAM_E2E_NOTEBOOKS==='1'?5:4}\n1\n2`)
const tagMetadataSummary = execFileSync('/usr/bin/sqlite3', [databasePath, "SELECT a.alias,p.name FROM tags t JOIN tag_aliases a ON a.tag_id=t.id JOIN tags p ON p.id=t.parent_id WHERE t.name='manual-blue';"], { encoding: 'utf8' }).trim()
assert.equal(tagMetadataSummary, 'Ocean Blue|Colors')
milestones.push('sqlite-and-source-hash-postconditions')

await fs.writeFile(path.join(evidenceDirectory, 'events.json'), JSON.stringify({
  suite: 'active-library-electron-e2e',
  result: 'passed',
  milestones,
  screenshots: ['active-library-ready.png', 'active-library-trash.png'],
  sourceBytesPreserved: true,
  sqliteSummary: { assets: 9, active: 9, trash: 0, tags: 3, confirmedRelations: 2 },
  shutdownDrainCompleted: true
}, null, 2))

console.log(`Active Library Electron E2E passed. Evidence: ${evidenceDirectory}`)

async function cardCount(page) {
  return page.locator('.lc-card').count()
}

async function waitForCardCount(page, count) {
  await page.waitForFunction((expected) => document.querySelectorAll('.lc-card').length === expected, count)
  const close=page.getByRole('button',{name:'关闭资料库管理',exact:true});if(await close.isVisible())await close.click()
}

async function searchByTag(page, tag) {
  const response = await page.evaluate(async (query) => window.damClient.tagSearchAssets([`tag:${query}`]), tag)
  assert.equal(response.success, true)
  return response.assets
}

async function selectCards(page, assetIds) {
  for (const assetId of assetIds) {
    assert.ok(assetId)
    await page.locator(`[data-asset-id="${assetId}"] input[type="checkbox"]`).click()
  }
}

async function fileSha256(filePath) {
  return createHash('sha256').update(await fs.readFile(filePath)).digest('hex')
}

async function assertPathMissing(target, message) {
  try {
    await fs.access(target)
  } catch {
    return
  }
  assert.fail(message)
}

async function waitForFile(target) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      await fs.access(target)
      return
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
  }
  assert.fail('Shutdown drain did not complete.')
}

function isInside(parent, candidate) {
  const relative = path.relative(parent, candidate)
  return relative.length > 0 && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative)
}

async function assertImagesLoaded(locator) {
  await locator.first().waitFor()
  for (const image of await locator.all()) {
    await image.evaluate(element => new Promise((resolve, reject) => {
      if (element.complete) return element.naturalWidth > 0 ? resolve(true) : reject(new Error('Managed preview failed'))
      element.addEventListener('load', () => resolve(true), { once: true })
      element.addEventListener('error', () => reject(new Error('Managed preview failed')), { once: true })
    }))
  }
}

// Playwright's installed waitForFunction treats a Promise predicate as truthy. Await IPC explicitly.
async function waitForAsync(check) {
  const deadline = Date.now() + 20000
  while (!(await check())) {
    if (Date.now() > deadline) throw new Error('Synthetic asynchronous condition did not settle')
    await new Promise(resolve => setTimeout(resolve, 40))
  }
}

async function selectCurrentMode(page, mode) {
 await page.getByTestId('formal-library-canvas').waitFor()
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))))
 const focus=page.getByRole('dialog',{name:'专注模式',exact:true})
 if(await focus.count())await focus.getByRole('button',{name:'关闭专注模式',exact:true}).click()
 const nav=page.getByRole('navigation',{name:'工作区导航'})
 if(mode==='悬浮卡片'){await nav.getByRole('button',{name:'工作模式',exact:true}).click();if(await page.locator('.legacy-work-card').getAttribute('open')===null)await page.locator('.legacy-work-card>summary').click();await page.getByRole('button',{name:'打开文件夹 桌面参考',exact:true}).click();return}
 if(mode==='资料库'){await nav.getByRole('button',{name:'全部',exact:true}).click();return}
 let title=''
 const cardTitle=page.locator('.asset-card-chrome > span')
 if(await cardTitle.count())title=await cardTitle.first().innerText()
 if(await page.locator('.native-reference-content').count())await nav.getByRole('button',{name:'全部',exact:true}).click()
 const selected=page.locator('.lc-card.inspected .lc-card-open')
 const trigger=title?page.getByRole('button',{name:`查看 ${title}`,exact:true}):await selected.count()?selected:page.locator('.lc-card-open').first()
 await trigger.click();await page.getByRole('region',{name:'素材详细分析'}).waitFor()
 await trigger.focus();await page.keyboard.press('Space')
}

async function openLibraryManager(page){const panel=page.getByRole('dialog',{name:'资料库管理',exact:true});if(!await panel.isVisible())await page.getByRole('link',{name:'资料库管理',exact:true}).click()}
async function openInspectorEditor(page){const summary=page.locator('.lc-side-details .detail-editing>summary');await summary.waitFor();const open=await summary.evaluate(e=>e.parentElement.open);if(!open)await summary.click();await page.locator('.host-editor').waitFor()}

async function clearGalleryFilters(page){await page.getByRole('button',{name:'更多功能菜单',exact:true}).click();await page.getByRole('menuitem',{name:'清除所有筛选',exact:true}).click()}
