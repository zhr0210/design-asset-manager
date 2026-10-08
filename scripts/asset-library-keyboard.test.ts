import os from 'node:os'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { chromium, type Browser } from 'playwright'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import AssetWaterfallGrid from '../src/renderer/components/library/AssetWaterfallGrid'
import type { Asset } from '../src/renderer/stores/asset.store'
import type { AssetDiscoveryMatch } from '../src/shared/workflows/asset-discovery.workflow'

function createSyntheticAsset(id: string, overrides: Partial<Asset> = {}): Asset {
  return {
    id,
    title: `Asset Title ${id}`,
    fileName: `${id}.png`,
    filePath: `/data/${id}.png`,
    thumbnailPath: `local-file:///data/thumb_${id}.png`,
    fileUrl: `local-file:///data/${id}.png`,
    sourceSiteId: 'dribbble',
    sourceSiteName: 'Dribbble',
    sourcePageUrl: 'https://dribbble.com/shots/1234',
    originalUrl: 'https://dribbble.com/original.png',
    width: 1920,
    height: 1080,
    fileSize: 204800,
    fileType: 'PNG',
    dominantColor: '#336699',
    aiTagStatus: 'not_started',
    aiTaggedAt: '',
    aiPromptStatus: 'not_started',
    aiPrompt: '',
    aiCaption: 'Detailed descriptive caption of the asset artwork.',
    aiAnalysisStatus: 'not_started',
    aiAnalysisJson: '',
    lastTagUpdatedAt: '',
    tags: ['design', 'ui'],
    createdAt: '2026-09-09T00:00:00.000Z',
    ...overrides
  }
}

function createMockMatch(id: string, title?: string): AssetDiscoveryMatch<Asset> {
  const asset = createSyntheticAsset(id, title ? { title } : {})
  return {
    asset,
    explanation: {
      lane: 'lexical',
      evidence: [{ kind: 'title', match: 'exact', label: `标题：${asset.title}` }]
    }
  }
}

async function runRenderContractTests() {
  console.log('[Contract Layer] Running render-only contract assertions...')

  const html = renderToStaticMarkup(
    React.createElement(AssetWaterfallGrid, {
      matches: [createMockMatch('ast-c1', 'Card Alpha')],
      selectedAsset: null,
      bulkSelectedAssetIds: [],
      setSelectedAsset: () => {},
      toggleBulkSelectedAssetId: () => {},
      assetLoadStatus: 'ready',
      hasLoadedAssets: true,
      isFiltered: false
    })
  )
  assert.ok(html.includes('id="asset-card-open-ast-c1"'))
  assert.ok(html.includes('aria-label="查看素材详情：Card Alpha"'))
  assert.ok(html.includes('id="asset-card-select-ast-c1"'))
  assert.ok(html.includes('role="checkbox"'))
  assert.ok(html.includes('aria-checked="false"'))
  assert.ok(html.includes('aria-label="选择素材：Card Alpha"'))
  assert.ok(!/<button\b[^>]*>(?:(?!<\/button>)[\s\S])*?<button\b/i.test(html))

  const loading = renderToStaticMarkup(
    React.createElement(AssetWaterfallGrid, {
      matches: [], selectedAsset: null, bulkSelectedAssetIds: [],
      setSelectedAsset: () => {}, toggleBulkSelectedAssetId: () => {},
      assetLoadStatus: 'loading', hasLoadedAssets: false
    })
  )
  assert.ok(loading.includes('正在读取素材列表...'))
  assert.ok(loading.includes('role="status"'))

  const error = renderToStaticMarkup(
    React.createElement(AssetWaterfallGrid, {
      matches: [], selectedAsset: null, bulkSelectedAssetIds: [],
      setSelectedAsset: () => {}, toggleBulkSelectedAssetId: () => {},
      assetLoadStatus: 'error', assetLoadError: '服务异常，请检查并重试',
      hasLoadedAssets: false, onRetry: () => {}
    })
  )
  assert.ok(error.includes('素材库加载失败'))
  assert.ok(error.includes('重试加载'))

  const noMatch = renderToStaticMarkup(
    React.createElement(AssetWaterfallGrid, {
      matches: [], selectedAsset: null, bulkSelectedAssetIds: [],
      setSelectedAsset: () => {}, toggleBulkSelectedAssetId: () => {},
      assetLoadStatus: 'ready', hasLoadedAssets: true, isFiltered: true,
      onClearFilters: () => {}
    })
  )
  assert.ok(noMatch.includes('没有找到符合筛选条件的素材资产'))
  assert.ok(noMatch.includes('清除所有筛选'))
  console.log('[Contract Layer] All contract assertions PASSED.')
}

type LibraryQaWindow = Window & {
  __libraryQA?: {
    store?: { getState: () => any }
  }
}

function createRouteEntry(repoRoot: string): string {
  const routePath = `/@fs/${repoRoot}/src/renderer/routes/Library.tsx`
  return `
import React from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

const rows = [
  {
    id: 'fixture-blue', title: 'Blue poster', file_name: 'blue.png',
    file_path: 'https://fixture.invalid/blue.svg', thumbnail_path: 'https://fixture.invalid/blue.svg',
    source_site_id: 'fixture', source_site_name: 'Fixture', source_page_url: 'https://fixture.invalid/blue',
    original_url: 'https://fixture.invalid/blue.svg', width: 320, height: 200, file_size: 100,
    file_type: 'SVG', dominant_color: '#336699', ai_caption: 'Blue fixture caption',
    ai_caption_is_user_edited: 0, ai_analysis_json: '', tags: [], created_at: '2026-09-08T00:00:00.000Z'
  },
  {
    id: 'fixture-red', title: 'Red cover', file_name: 'red.png',
    file_path: 'https://fixture.invalid/red.svg', thumbnail_path: 'https://fixture.invalid/red.svg',
    source_site_id: 'fixture', source_site_name: 'Fixture', source_page_url: 'https://fixture.invalid/red',
    original_url: 'https://fixture.invalid/red.svg', width: 320, height: 200, file_size: 100,
    file_type: 'SVG', dominant_color: '#993333', ai_caption: 'Red fixture caption',
    ai_caption_is_user_edited: 0, ai_analysis_json: '', tags: [], created_at: '2026-09-07T00:00:00.000Z'
  }
]

const qa = { rows, calls: [] as unknown[], listeners: {} as Record<string, (value: any) => unknown>,
  projection: {state:'ready',identity:'qa-library',generation:'qa-generation'} as any,
  inspect: () => Promise.resolve(qa.projection) }
const subscribers = new Map<string, Set<(value: any) => unknown>>()
const listen = (name: string) => (callback: (value: any) => unknown) => {
  const group=subscribers.get(name)??new Set();subscribers.set(name,group);group.add(callback)
  qa.listeners[name]=(value:any)=>Promise.all([...group].map(cb=>cb(value)))
  return () => { group.delete(callback) }
}
const settings = {
  selectedPromptModelId: '', promptReverseTemplates: [], aiBackends: [],
  promptReverseSettings: {
    backendMode: 'llama-openai', selectedExternalModel: '', selectedExternalBackendId: '',
    maxNewTokens: 256, maxImageSize: 1024, temperature: 0.6, topP: 0.9
  }
}
;(window as any).damClient = {
  connectionState: () => ({connected:true,reconciling:false}),
  onConnectionChanged: listen('connection'), onWorkspaceChanged: listen('workspace'),
  onSettingsChanged: listen('settings'), onNavigate: listen('navigate'),
  onDraftsChanged: listen('drafts'),
  drafts: {list:async()=>[],put:async()=>({}),remove:async()=>{}},
  onReconcile: () => () => {},
  library: { inspect: () => qa.inspect(), close: async () => { qa.projection={state:'closed',identity:null,generation:null};return {success:true} }, notebookRead: async () => ({success:true,value:{book:{pages:[],active:null},revision:0,sessionToken:'qa-session',sourceRef:'preview:qa',requiresUpgrade:false}}) },
  managedDownloads: { onImported: listen('download') }, imageTools: { onSaved: listen('tools') },
  assetOcr: { onChanged: listen('ocr'), read: async()=>({ok:false,error:'Synthetic OCR unavailable'}), status: async()=>({ok:false,error:'Synthetic OCR unavailable'}) },
  visualAi: { onChanged: listen('ai'), backends: async()=>({ok:true,value:[]}), results: async()=>({ok:true,value:[]}) },
  assetCard: { onChanged: listen('card'), onReturn: listen('return'), updateDraft: async () => ({ok:true,state:null}) },
  listAssets: async (request: unknown) => { qa.calls.push(request); return qa.rows },
  tagList: async () => ({ success: true, tags: [] }),
  assetTagListByAsset: async () => ({ success: true, relations: [] }),
  onAiTaskSynced: () => () => {},
  settingsLoad: async () => settings,
  aiModelList: async () => [],
  llamaRuntimeListLocalModels: async () => [],
  assetsGetCustomCategory: async () => ({ success: false }),
  aiRoutingPreview: async () => ({ success: false }),
  updateAssetCaption: async () => ({ success: true }),
  resetAssetCaptionEdited: async () => ({ success: true }),
  assetsSaveCustomCategory: async () => ({ success: true }),
  showItemInFolder: () => {}
}

const { useAssetStore } = await import(${JSON.stringify(`/@fs/${repoRoot}/src/renderer/stores/asset.store.ts`)})
const { default: Library } = await import(${JSON.stringify(routePath)})
const { default: AppShell } = await import(${JSON.stringify(`/@fs/${repoRoot}/src/renderer/components/layout/AppShell.tsx`)})
const { useLibraryViewStore } = await import(${JSON.stringify(`/@fs/${repoRoot}/src/renderer/stores/library-view.store.ts`)})
;(window as any).__libraryQA = { store: useAssetStore, view: useLibraryViewStore, qa }
createRoot(document.getElementById('root')!).render(React.createElement(MemoryRouter, {initialEntries:['/library']},
  React.createElement(Routes, null, React.createElement(Route, {element:React.createElement(AppShell)},
    React.createElement(Route, {path:'/library',element:React.createElement(Library)})))))
`
}

async function runRealLibraryBrowserTests() {
  const repoRoot = process.cwd()
  const tempRoot = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'dam-library-keyboard-real-')))
  await fs.writeFile(path.join(tempRoot, 'index.html'), '<!doctype html><html lang="zh-CN"><body><div id="root" style="height:100vh"></div><script type="module" src="/entry.tsx"></script></body></html>')
  await fs.writeFile(path.join(tempRoot, 'entry.tsx'), createRouteEntry(repoRoot))
  await fs.symlink(path.join(repoRoot, 'node_modules'), path.join(tempRoot, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir')

  const require = createRequire(path.join(repoRoot, 'package.json'))
  const vitePackage = require.resolve('vite/package.json')
  const { createServer } = await import(pathToFileURL(path.join(path.dirname(vitePackage), 'dist/node/index.js')).href)
  const server = await createServer({
    configFile: false,
    root: tempRoot,
    cacheDir: path.join(tempRoot, 'vite-cache'),
    logLevel: 'error',
    resolve: { dedupe: ['react', 'react-dom'] },
    server: { host: '127.0.0.1', port: 0, fs: { allow: [tempRoot, repoRoot] } }
  })
  await server.listen()
  const address = server.httpServer.address()
  assert.ok(address && typeof address !== 'string')
  const url = `http://127.0.0.1:${address.port}`
  let browser: Browser | undefined
  const pageErrors: string[] = []
  try {
    browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] })
    const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } })
    await context.route('**/*', (route) => {
      const requestUrl = new URL(route.request().url())
      if (requestUrl.hostname === '127.0.0.1') return route.continue()
      if (requestUrl.hostname === 'fixture.invalid') {
        return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200"><rect width="320" height="200" fill="#94a3b8"/></svg>' })
      }
      return route.abort()
    })
    const page = await context.newPage()
    page.on('pageerror', (error) => pageErrors.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error') pageErrors.push(`console: ${message.text()}`)
    })
    const response = await page.goto(url)
    assert.ok(response?.ok(), `Vite harness index did not load: ${response?.status()}`)

    const cardOpen = page.locator('#asset-card-open-fixture-blue')
    await cardOpen.waitFor({ state: 'visible', timeout: 15000 })
    const search = page.getByRole('textbox', { name: '搜索素材' })
    await search.waitFor({ state: 'visible' })
    const inspector = page.locator('.lc-side-details div[role="region"][aria-label="素材详细分析"]')
    const dismiss = page.locator('button[aria-label="关闭素材详情"]')

    // Tab through the actual Library route until the card trigger is reached.
    await search.focus()
    let reachedOpen = false
    for (let i = 0; i < 80; i += 1) {
      await page.keyboard.press('Tab')
      if (await page.evaluate(() => document.activeElement?.id === 'asset-card-open-fixture-blue')) {
        reachedOpen = true
        break
      }
    }
    assert.equal(reachedOpen, true, 'Tab must reach the real Library card open control')
    await page.keyboard.press('Enter')
    await inspector.waitFor({ state: 'visible' })
    assert.equal(await cardOpen.evaluate((el) => el === document.activeElement), true)
    await dismiss.focus()
    await page.keyboard.press('Escape')
    await inspector.waitFor({ state: 'detached' })
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'asset-card-open-fixture-blue')

    // Space opens Quick Look and restores focus; the sibling checkbox only selects.
    await page.keyboard.press('Space')
    const quickLook = page.getByRole('dialog', { name: '专注模式' })
    await quickLook.waitFor({ state: 'visible' })
    assert.equal(await inspector.count(), 0)
    await page.keyboard.press('Tab')
    await page.keyboard.press('Shift+Tab')
    assert.equal(await quickLook.evaluate(el => el.contains(document.activeElement)), true)
    await page.keyboard.press('Escape')
    await quickLook.waitFor({ state: 'detached' })
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'asset-card-open-fixture-blue')
    await page.keyboard.press('Control+f')
    assert.equal(await search.evaluate(el => el === document.activeElement), true)
    await cardOpen.dblclick()
    await quickLook.waitFor({ state: 'visible' })
    await page.keyboard.press('Escape')
    await quickLook.waitFor({ state: 'detached' })
    await inspector.waitFor({ state: 'visible' })
    await dismiss.click()
    await inspector.waitFor({ state: 'detached' })
    await cardOpen.focus()
    await page.keyboard.press('Tab')
    const cardSelect = page.locator('#asset-card-select-fixture-blue')
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'asset-card-select-fixture-blue')
    await page.keyboard.press('Enter')
    await page.waitForFunction(() => document.querySelector('#asset-card-select-fixture-blue')?.getAttribute('aria-checked') === 'true')
    assert.equal(await inspector.count(), 0, 'Enter on selection must not open Inspector')
    await page.keyboard.press('Space')
    await page.waitForFunction(() => document.querySelector('#asset-card-select-fixture-blue')?.getAttribute('aria-checked') === 'false')
    assert.equal(await inspector.count(), 0, 'Space on selection must not open Inspector')

    // Outside focus and an already-claimed Escape cannot close the real Inspector.
    await cardOpen.click()
    await inspector.waitFor({ state: 'visible' })
    await search.focus()
    await inspector.dispatchEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    assert.equal(await inspector.isVisible(), true, 'Outside focus must not close Inspector')
    await page.keyboard.press('Escape')
    assert.equal(await inspector.isVisible(), true, 'Real outside Escape must not close Inspector')
    await dismiss.focus()
    await page.evaluate(() => {
      const button = document.querySelector('button[aria-label="关闭素材详情"]')
      if (!button) throw new Error('Dismiss button not found')
      const handler = (event: KeyboardEvent) => { if (event.key === 'Escape') event.preventDefault() }
      ;(window as any).__preventEscape = handler
      button.addEventListener('keydown', handler)
    })
    await page.keyboard.press('Escape')
    assert.equal(await inspector.isVisible(), true, 'defaultPrevented Escape must not close Inspector')
    await page.evaluate(() => {
      const button = document.querySelector('button[aria-label="关闭素材详情"]')
      const handler = (window as any).__preventEscape
      if (button && handler) button.removeEventListener('keydown', handler)
      delete (window as any).__preventEscape
    })
    await dismiss.click()
    await inspector.waitFor({ state: 'detached' })

    // The real caption edit branch and textarea must exist and remain open on Escape.
    await cardOpen.click()
    await inspector.waitFor({ state: 'visible' })
    const editButton = page.locator('button[title="编辑描述"]')
    await editButton.waitFor({state:'visible'})
    assert.equal(await editButton.count(), 1, 'Caption edit entry must exist in real Inspector')
    await editButton.click({ force: true })
    const textarea = inspector.locator('textarea[placeholder="请输入画面描述..."]')
    assert.equal(await textarea.count(), 1, 'Caption textarea must exist after entering edit branch')
    await textarea.focus()
    await textarea.type(' edited')
    await page.keyboard.press('Escape')
    assert.equal(await inspector.isVisible(), true, 'Escape in real caption textarea must not close Inspector')
    await dismiss.click()
    await inspector.waitFor({ state: 'detached' })

    // The real viewer button and its global Escape priority must be exercised.
    await cardOpen.click()
    await inspector.waitFor({ state: 'visible' })
    const viewLarge = page.getByRole('button', { name: '专注查看', exact: true })
    assert.equal(await viewLarge.count(), 1, 'Large-view entry must exist in real Inspector')
    await viewLarge.click({ force: true })
    const modal = page.getByRole('dialog', { name: '专注模式' })
    await modal.waitFor({ state: 'visible' })
    await page.keyboard.press('Escape')
    await modal.waitFor({ state: 'detached' })
    assert.equal(await inspector.isVisible(), true, 'Child viewer Escape must leave Inspector open')
    await dismiss.click()
    await inspector.waitFor({ state: 'detached' })

    // Remove the origin card through the real store projection, then close and fall back to search.
    await cardOpen.click()
    await inspector.waitFor({ state: 'visible' })
    await page.evaluate(() => (window as LibraryQaWindow).__libraryQA?.store?.getState().setSearchQuery('unmatched-query'))
    await page.getByRole('region', { name: '筛选无匹配素材', exact: true }).waitFor({ state: 'visible' })
    assert.equal(await page.locator('#asset-card-open-fixture-blue').count(), 0, 'Origin card must leave the real route DOM')
    await dismiss.focus()
    await page.keyboard.press('Escape')
    await inspector.waitFor({ state: 'detached' })
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), '搜索素材')
    // The formal Shell and Library share the real production Adapter. This is
    // synthetic bridge integration, not native Computer Use or Main persistence.
    await page.evaluate(async () => {
      const fixture = (window as any).__libraryQA
      const scope = {libraryIdentity:'qa-library',generation:'qa-generation'}
      const before = fixture.qa.calls.length
      await fixture.qa.listeners.download({...scope,generation:'old'})
      if (fixture.qa.calls.length !== before) throw Error('Old Shell event refreshed assets')
      await fixture.qa.listeners.download(scope)
      await new Promise(resolve => setTimeout(resolve, 0))
      if (fixture.qa.calls.length !== before + 1) throw Error('Current Shell event did not refresh assets')
      let first = true
      fixture.qa.inspect = () => first ? (first=false,new Promise(resolve => { fixture.resolveReturn=resolve })) : Promise.resolve(fixture.qa.projection)
      fixture.pendingReturn = fixture.qa.listeners.return({...scope,assetId:'fixture-blue',configureAi:false,promptDraft:'stale',descriptionDraft:{value:'stale',baseCaption:''}})
    })
    await page.getByRole('link', { name: '资料库管理', exact: true }).click()
    await page.getByTestId('library-close').click()
    await page.getByTestId('library-reopen').waitFor({state:'visible'})
    await page.evaluate(async () => {
      const fixture = (window as any).__libraryQA
      fixture.resolveReturn({state:'ready',identity:'qa-library',generation:'qa-generation'})
      await fixture.pendingReturn
      if (fixture.view.getState().scope !== null || Object.keys(fixture.view.getState().prompts).length || fixture.store.getState().selectedAsset) throw Error('Old native return restored revoked presentation')
    })
    assert.equal(await page.locator('.lc-card-open').count(), 0)
    assert.deepEqual(pageErrors, [], 'Real Library route must not emit page errors')
    await context.close()
    console.log('[Playwright Browser Layer] Real Library route passed in isolated temporary harness')
    return { tempRoot }
  } catch (error) {
    if (browser) {
      // Preserve a screenshot and the independent Vite harness for inspection.
      const pages = browser.contexts().flatMap((context) => context.pages())
      if (pages[0]) await pages[0].screenshot({ path: path.join(tempRoot, 'failure.png') }).catch(() => undefined)
    }
    let pageState = ''
    if (browser) {
      const pages = browser.contexts().flatMap((context) => context.pages())
      pageState = pages[0] ? ` pageErrors=${JSON.stringify(pageErrors)} html=${(await pages[0].content()).slice(0, 1200)}` : ''
    }
    throw new Error(`Real Library route keyboard verification failed in ${tempRoot}: ${String(error)}${pageState}`)
  } finally {
    await browser?.close().catch(() => undefined)
    await server.close()
  }
}

async function main() {
  console.log('=================================================================')
  console.log('=== Task B: Asset Library Keyboard & Focus Restoration Tests ===')
  console.log('=================================================================')
  await runRenderContractTests()
  await runRealLibraryBrowserTests()
  console.log('TEST SUMMARY: Contract Layer AND real Library route Browser Behavior PASSED.')
  console.log('=================================================================')
}

main().catch((error) => {
  console.error('Test failed with error:', error)
  process.exit(1)
})
