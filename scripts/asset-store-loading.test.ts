import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import AssetWaterfallGrid from '../src/renderer/components/library/AssetWaterfallGrid'
import type { Asset } from '../src/renderer/stores/asset.store'
import type { AssetDiscoveryMatch } from '../src/shared/workflows/asset-discovery.workflow'

// 1. Install synthetic window and electronAPI BEFORE importing store
let initialAutoLoadSettled!: () => void
const initialAutoLoadPromise = new Promise<void>((resolve) => {
  initialAutoLoadSettled = resolve
})

let isInitialImport = true
let mockListAssets: (params?: any) => Promise<any> = async () => {
  if (isInitialImport) {
    isInitialImport = false
    queueMicrotask(() => {
      queueMicrotask(() => {
        initialAutoLoadSettled()
      })
    })
    return []
  }
  return []
}
let mockTagList: () => Promise<any> = async () => ({ success: true, tags: [] })
let mockAssetTagListByAsset: (assetId: string) => Promise<any> = async () => ({ success: true, relations: [] })
let mockAssetTagAdd: (assetId: string, tagId: string) => Promise<any> = async () => ({ success: true })

const mockApi = {
  listAssets: (params?: any) => mockListAssets(params),
  tagList: () => mockTagList(),
  assetTagListByAsset: (assetId: string) => mockAssetTagListByAsset(assetId),
  assetTagAdd: (assetId: string, tagId: string) => mockAssetTagAdd(assetId, tagId),
  onAiTaskSynced: () => () => {}
}

;(globalThis as any).window = {
  electronAPI: mockApi
}

// 2. Import store and deterministically await initial auto load
const { useAssetStore } = await import('../src/renderer/stores/asset.store')
await initialAutoLoadPromise

function createMockDbAsset(id: string, overrides: Record<string, any> = {}) {
  return {
    id,
    title: `Title ${id}`,
    file_name: `${id}.png`,
    file_path: `/data/${id}.png`,
    thumbnail_path: `/data/thumb_${id}.png`,
    source_site_id: 'site-alpha',
    source_site_name: 'Site Alpha',
    source_page_url: 'https://example.com/page',
    original_url: 'https://example.com/original.png',
    width: 1920,
    height: 1080,
    file_size: 204800,
    file_type: 'PNG',
    dominant_color: '#336699',
    browser_page_title: 'Page Title',
    capture_method: 'search',
    ai_tag_status: 'not_started',
    ai_tagged_at: '',
    ai_prompt_status: 'not_started',
    ai_prompt: '',
    ai_caption: '',
    ai_analysis_status: 'not_started',
    ai_analysis_json: '',
    last_tag_updated_at: '',
    tags: ['design', 'ui'],
    created_at: '2026-09-08T00:00:00.000Z',
    ...overrides
  }
}

function createSyntheticAsset(id: string, overrides: Partial<Asset> = {}): Asset {
  return {
    id,
    title: `Title ${id}`,
    fileName: `${id}.png`,
    filePath: `/data/${id}.png`,
    thumbnailPath: `local-file:///data/thumb_${id}.png`,
    fileUrl: `local-file:///data/${id}.png`,
    sourceSiteId: 'site-alpha',
    sourceSiteName: 'Site Alpha',
    sourcePageUrl: 'https://example.com/page',
    originalUrl: 'https://example.com/original.png',
    width: 1920,
    height: 1080,
    fileSize: 204800,
    fileType: 'PNG',
    dominantColor: '#336699',
    browserPageTitle: 'Page Title',
    captureMethod: 'search',
    aiTagStatus: 'not_started',
    aiTaggedAt: '',
    aiPromptStatus: 'not_started',
    aiPrompt: '',
    aiCaption: '',
    aiAnalysisStatus: 'not_started',
    aiAnalysisJson: '',
    lastTagUpdatedAt: '',
    tags: ['design', 'ui'],
    createdAt: '2026-09-08T00:00:00.000Z',
    ...overrides
  }
}

function createMockMatch(id: string, title?: string): AssetDiscoveryMatch<Asset> {
  const asset = createSyntheticAsset(id, title ? { title } : {})
  return {
    asset,
    explanation: {
      lane: 'lexical',
      evidence: [
        { kind: 'title', match: 'exact', label: `标题：${asset.title}` }
      ]
    }
  }
}

function resetStore(initial: Partial<ReturnType<typeof useAssetStore.getState>> = {}) {
  useAssetStore.setState({
    assets: [],
    tags: [],
    selectedAsset: null,
    activeTagSearchQueries: [],
    bulkSelectedAssetIds: [],
    assetRelations: {},
    searchQuery: '',
    filterSite: '',
    filterTag: '',
    includePending: false,
    assetLoadStatus: 'idle',
    assetLoadError: null,
    hasLoadedAssets: false,
    ...initial
  })
}

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: any) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

async function runTests() {
  console.log('--- Starting asset-store-loading behavior tests ---')

  // Test 1: 首次成功加载
  {
    console.log('Test 1: Initial load success')
    resetStore()
    mockListAssets = async () => [createMockDbAsset('ast-1'), createMockDbAsset('ast-2')]

    await useAssetStore.getState().loadAssets()
    const state = useAssetStore.getState()

    assert.equal(state.assetLoadStatus, 'ready')
    assert.equal(state.assetLoadError, null)
    assert.equal(state.hasLoadedAssets, true)
    assert.equal(state.assets.length, 2)
    assert.equal(state.assets[0].id, 'ast-1')
    assert.equal(state.assets[1].id, 'ast-2')
  }

  // Test 2: 成功空结果
  {
    console.log('Test 2: Successful empty array enters ready and hasLoadedAssets=true')
    resetStore()
    mockListAssets = async () => []

    await useAssetStore.getState().loadAssets()
    const state = useAssetStore.getState()

    assert.equal(state.assetLoadStatus, 'ready')
    assert.equal(state.assetLoadError, null)
    assert.equal(state.hasLoadedAssets, true)
    assert.equal(state.assets.length, 0)
    assert.equal(state.selectedAsset, null)
    assert.deepEqual(state.bulkSelectedAssetIds, [])
  }

  // Test 3: 初次失败不能把库伪装成空库，且验证安全日志不泄露堆栈或路径
  {
    console.log('Test 3: Initial load failure with safe console.error and no stack/path leakage')
    resetStore()
    const sensitiveToken = 'SECRET_TOKEN_LEAK_PATH:/Users/private/secure_database.sqlite'
    const interceptedLogs: any[][] = []
    const originalConsoleError = console.error
    console.error = (...args: any[]) => {
      interceptedLogs.push(args)
    }

    try {
      mockListAssets = async () => {
        const sensitiveErr = new Error(`Database failure: ${sensitiveToken}`)
        sensitiveErr.stack = `Error: ${sensitiveToken}\n    at /Users/private/db.ts:10:20`
        throw sensitiveErr
      }
      await useAssetStore.getState().loadAssets()
    } finally {
      console.error = originalConsoleError
    }

    const state = useAssetStore.getState()
    assert.equal(state.assetLoadStatus, 'error')
    assert.equal(state.assetLoadError, '加载素材库失败，请重试')
    assert.equal(state.hasLoadedAssets, false, 'Initial failure must NOT set hasLoadedAssets to true')
    assert.equal(state.assets.length, 0)

    // Assert that intercepted console.error does NOT leak sensitive info
    assert.ok(interceptedLogs.length > 0, 'Must log to console.error on load failure')
    for (const callArgs of interceptedLogs) {
      const line = callArgs.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')
      assert.equal(
        line.includes(sensitiveToken),
        false,
        `console.error leaked sensitive token/path: ${line}`
      )
    }
    const hasSafeLog = interceptedLogs.some((args) =>
      args.some((a) => typeof a === 'string' && a.includes('[Store] Failed to load assets from DB'))
    )
    assert.equal(hasSafeLog, true, 'Must log fixed safe message [Store] Failed to load assets from DB')
  }

  // Test 4: 刷新失败保留此前成功加载的 assets、selectedAsset 与 bulkSelectedAssetIds
  {
    console.log('Test 4: Refresh failure preserves existing assets, selectedAsset, and bulkSelectedAssetIds')
    const asset1 = createSyntheticAsset('ast-1')
    const asset2 = createSyntheticAsset('ast-2')
    resetStore({
      assets: [asset1, asset2],
      hasLoadedAssets: true,
      assetLoadStatus: 'ready',
      selectedAsset: asset1,
      bulkSelectedAssetIds: ['ast-1', 'ast-2']
    })

    mockListAssets = async () => {
      throw new Error('Network timeout during refresh')
    }

    await useAssetStore.getState().loadAssets()
    const state = useAssetStore.getState()

    assert.equal(state.assetLoadStatus, 'error')
    assert.equal(state.assetLoadError, '加载素材库失败，请重试')
    assert.equal(state.hasLoadedAssets, true, 'hasLoadedAssets remains true after refresh failure')
    assert.equal(state.assets.length, 2, 'Previous assets must be retained')
    assert.equal(state.assets[0].id, 'ast-1')
    assert.equal(state.assets[1].id, 'ast-2')
    assert.equal(state.selectedAsset?.id, 'ast-1', 'selectedAsset must be retained')
    assert.deepEqual(state.bulkSelectedAssetIds, ['ast-1', 'ast-2'], 'bulk selection must be retained')
  }

  // Test 5: 并发成功/失败乱序 (latest-request-wins)
  {
    console.log('Test 5a: Out-of-order completion: slow Req1 completing after fast Req2 cannot overwrite')
    resetStore()

    const d1 = createDeferred<any>()
    const d2 = createDeferred<any>()

    let callCount = 0
    mockListAssets = async () => {
      callCount++
      if (callCount === 1) return d1.promise
      return d2.promise
    }

    const p1 = useAssetStore.getState().loadAssets()
    const p2 = useAssetStore.getState().loadAssets()

    // Resolve Req2 first
    d2.resolve([createMockDbAsset('req2-asset')])
    await p2

    let state = useAssetStore.getState()
    assert.equal(state.assetLoadStatus, 'ready')
    assert.equal(state.assets.length, 1)
    assert.equal(state.assets[0].id, 'req2-asset')

    // Now resolve Req1 later
    d1.resolve([createMockDbAsset('req1-asset')])
    await p1

    state = useAssetStore.getState()
    assert.equal(state.assetLoadStatus, 'ready')
    assert.equal(state.assets.length, 1)
    assert.equal(state.assets[0].id, 'req2-asset', 'Old Req1 must not overwrite newer Req2')
  }

  {
    console.log('Test 5b: Out-of-order: slow Req1 success cannot overwrite faster Req2 failure')
    resetStore()

    const d1 = createDeferred<any>()
    const d2 = createDeferred<any>()

    let callCount = 0
    mockListAssets = async () => {
      callCount++
      if (callCount === 1) return d1.promise
      return d2.promise
    }

    const p1 = useAssetStore.getState().loadAssets()
    const p2 = useAssetStore.getState().loadAssets()

    // Reject Req2 first
    d2.reject(new Error('Req2 failed'))
    await p2

    let state = useAssetStore.getState()
    assert.equal(state.assetLoadStatus, 'error')

    // Resolve Req1 later
    d1.resolve([createMockDbAsset('req1-asset')])
    await p1

    state = useAssetStore.getState()
    assert.equal(state.assetLoadStatus, 'error', 'Old Req1 success must not overwrite Req2 error state')
    assert.equal(state.assets.length, 0)
  }

  {
    console.log('Test 5c: Out-of-order: slow Req1 failure cannot overwrite faster Req2 success')
    resetStore()

    const d1 = createDeferred<any>()
    const d2 = createDeferred<any>()

    let callCount = 0
    mockListAssets = async () => {
      callCount++
      if (callCount === 1) return d1.promise
      return d2.promise
    }

    const p1 = useAssetStore.getState().loadAssets()
    const p2 = useAssetStore.getState().loadAssets()

    // Resolve Req2 first
    d2.resolve([createMockDbAsset('req2-asset')])
    await p2

    let state = useAssetStore.getState()
    assert.equal(state.assetLoadStatus, 'ready')
    assert.equal(state.assets.length, 1)
    assert.equal(state.assets[0].id, 'req2-asset')

    // Reject Req1 later
    d1.reject(new Error('Req1 failed'))
    await p1

    state = useAssetStore.getState()
    assert.equal(state.assetLoadStatus, 'ready', 'Old Req1 failure must not overwrite Req2 ready state')
    assert.equal(state.assets[0].id, 'req2-asset')
  }

  {
    console.log('Test 5d: Library authority reset invalidates pending lists and write follow-up refreshes')
    const asset = createSyntheticAsset('old-generation-asset')
    resetStore({ assets: [asset], selectedAsset: asset, hasLoadedAssets: true, assetLoadStatus: 'ready' })
    const pendingList = createDeferred<any>()
    mockListAssets = async () => pendingList.promise
    const listPromise = useAssetStore.getState().loadAssets()
    useAssetStore.getState().resetForLibraryTransition()
    pendingList.resolve([createMockDbAsset('stale-list-asset')])
    await listPromise
    assert.deepEqual(useAssetStore.getState().assets, [])
    assert.equal(useAssetStore.getState().assetLoadStatus, 'idle')

    resetStore({ assets: [asset], selectedAsset: asset, hasLoadedAssets: true, assetLoadStatus: 'ready' })
    const pendingTagWrite = createDeferred<any>()
    let followUpListCalls = 0
    mockAssetTagAdd = async () => pendingTagWrite.promise
    mockListAssets = async () => { followUpListCalls += 1; return [] }
    const tagPromise = useAssetStore.getState().addTagToAsset(asset.id, 'tag:old')
    useAssetStore.getState().resetForLibraryTransition()
    pendingTagWrite.resolve({ success: true })
    await tagPromise
    assert.equal(followUpListCalls, 0)
    assert.deepEqual(useAssetStore.getState().assetRelations, {})
  }

  // Test 6: 成功后选择清理 (Selection cleanup after success)
  {
    console.log('Test 6a: Selected asset cleared when no longer present in new results')
    const asset1 = createSyntheticAsset('ast-1')
    const asset2 = createSyntheticAsset('ast-2')
    const asset3 = createSyntheticAsset('ast-3')
    resetStore({
      assets: [asset1, asset2, asset3],
      hasLoadedAssets: true,
      assetLoadStatus: 'ready',
      selectedAsset: asset2,
      bulkSelectedAssetIds: ['ast-1', 'ast-2', 'ast-3']
    })

    // New response only has ast-1 and ast-3; ast-2 was deleted
    mockListAssets = async () => [createMockDbAsset('ast-1'), createMockDbAsset('ast-3')]

    await useAssetStore.getState().loadAssets()
    const state = useAssetStore.getState()

    assert.equal(state.selectedAsset, null, 'Deleted asset2 should be cleared from selectedAsset')
    assert.deepEqual(state.bulkSelectedAssetIds, ['ast-1', 'ast-3'], 'Deleted asset2 should be removed from bulkSelection')
  }

  {
    console.log('Test 6b: Selected asset updated to fresh instance when still present')
    const asset1Old = createSyntheticAsset('ast-1', { title: 'Old Title' })
    resetStore({
      assets: [asset1Old],
      hasLoadedAssets: true,
      assetLoadStatus: 'ready',
      selectedAsset: asset1Old,
      bulkSelectedAssetIds: ['ast-1']
    })

    mockListAssets = async () => [createMockDbAsset('ast-1', { title: 'Updated Title' })]

    await useAssetStore.getState().loadAssets()
    const state = useAssetStore.getState()

    assert.notEqual(state.selectedAsset, null)
    assert.equal(state.selectedAsset?.id, 'ast-1')
    assert.equal(state.selectedAsset?.title, 'Updated Title', 'selectedAsset must be updated with fresh object')
    assert.deepEqual(state.bulkSelectedAssetIds, ['ast-1'])
  }

  // Test 7: 用户等待期间切换选择，不被请求开始时状态覆盖
  {
    console.log('Test 7: User selection change during pending load is respected at commit time')
    const asset1 = createSyntheticAsset('ast-1')
    const asset2 = createSyntheticAsset('ast-2')
    resetStore({
      assets: [asset1, asset2],
      hasLoadedAssets: true,
      assetLoadStatus: 'ready',
      selectedAsset: asset1,
      bulkSelectedAssetIds: ['ast-1']
    })

    const d = createDeferred<any>()
    mockListAssets = async () => d.promise

    const pendingLoad = useAssetStore.getState().loadAssets()

    // While request is pending, user clicks asset-2 and selects asset-2 in bulk
    useAssetStore.getState().setSelectedAsset(asset2)
    useAssetStore.getState().toggleBulkSelectedAssetId('ast-2')

    // Now request finishes
    d.resolve([createMockDbAsset('ast-1'), createMockDbAsset('ast-2')])
    await pendingLoad

    const state = useAssetStore.getState()
    assert.equal(state.selectedAsset?.id, 'ast-2', 'User selection of ast-2 made during pending load must be preserved')
    assert.deepEqual(state.bulkSelectedAssetIds, ['ast-1', 'ast-2'], 'Bulk selection change made during pending load must be preserved')
  }

  // Test 8: 无 bridge / 非法响应当成可重试错误
  {
    console.log('Test 8a: Missing window.electronAPI treated as retryable error')
    resetStore()
    const originalApi = (globalThis as any).window.electronAPI
    ;(globalThis as any).window.electronAPI = undefined

    await useAssetStore.getState().loadAssets()
    let state = useAssetStore.getState()

    assert.equal(state.assetLoadStatus, 'error')
    assert.equal(state.assetLoadError, '素材服务不可用，请稍后重试')

    // Restore API
    ;(globalThis as any).window.electronAPI = originalApi
  }

  {
    console.log('Test 8b: listAssets is not a function treated as retryable error')
    resetStore()
    const originalApi = (globalThis as any).window.electronAPI
    ;(globalThis as any).window.electronAPI = { listAssets: 'not-a-func' }

    await useAssetStore.getState().loadAssets()
    let state = useAssetStore.getState()

    assert.equal(state.assetLoadStatus, 'error')
    assert.equal(state.assetLoadError, '素材服务不可用，请稍后重试')

    // Restore API
    ;(globalThis as any).window.electronAPI = originalApi
  }

  {
    console.log('Test 8c: Non-array response treated as retryable error')
    resetStore()
    mockListAssets = async () => ({ error: 'not an array' } as any)

    await useAssetStore.getState().loadAssets()
    let state = useAssetStore.getState()

    assert.equal(state.assetLoadStatus, 'error')
    assert.equal(state.assetLoadError, '素材数据格式异常，请稍后重试')

    // Test 8d: Retry after error succeeds
    console.log('Test 8d: Retry after invalid response succeeds')
    mockListAssets = async () => [createMockDbAsset('recovered-asset')]

    await useAssetStore.getState().loadAssets()
    state = useAssetStore.getState()

    assert.equal(state.assetLoadStatus, 'ready')
    assert.equal(state.assetLoadError, null)
    assert.equal(state.hasLoadedAssets, true)
    assert.equal(state.assets.length, 1)
    assert.equal(state.assets[0].id, 'recovered-asset')
  }

  // Test 9: 验证每次请求携带当时的 activeTagSearchQueries 与 includePending
  {
    console.log('Test 9: Passes current activeTagSearchQueries and includePending at request time')
    resetStore()

    let capturedParams: any = null
    mockListAssets = async (params) => {
      capturedParams = params
      return []
    }

    useAssetStore.setState({
      activeTagSearchQueries: ['tag:banner', 'tag:promo'],
      includePending: true
    })

    await useAssetStore.getState().loadAssets()

    assert.deepEqual(capturedParams, {
      keyword: 'tag:banner tag:promo',
      includePending: true
    })
  }

  // Test 10: AssetWaterfallGrid react-dom/server 渲染断言
  console.log('Test 10: Executable react-dom/server rendering assertions for Grid states')
  {
    // 10a: ready + unfiltered empty
    console.log('Test 10a: ready + unfiltered empty')
    const html = renderToStaticMarkup(
      React.createElement(AssetWaterfallGrid, {
        matches: [],
        selectedAsset: null,
        bulkSelectedAssetIds: [],
        setSelectedAsset: () => {},
        toggleBulkSelectedAssetId: () => {},
        assetLoadStatus: 'ready',
        hasLoadedAssets: true,
        isFiltered: false,
        onRetry: () => {}
      })
    )
    assert.ok(html.includes('素材库暂无素材'), 'Must display unfiltered empty message')
    assert.ok(html.includes('刷新素材库'), 'Must provide refresh action')
    assert.ok(html.includes('aria-label="素材库为空"'), 'Must have accessible label for empty library')
    assert.ok(!html.includes('没有找到符合筛选条件的素材'), 'Must NOT display filtered no-match message')
    assert.ok(!html.includes('正在刷新素材数据'), 'Must NOT display loading indicator')
  }

  {
    // 10b: ready + filtered no-match
    console.log('Test 10b: ready + filtered no-match')
    const html = renderToStaticMarkup(
      React.createElement(AssetWaterfallGrid, {
        matches: [],
        selectedAsset: null,
        bulkSelectedAssetIds: [],
        setSelectedAsset: () => {},
        toggleBulkSelectedAssetId: () => {},
        assetLoadStatus: 'ready',
        hasLoadedAssets: true,
        isFiltered: true,
        onClearFilters: () => {}
      })
    )
    assert.ok(html.includes('没有找到符合筛选条件的素材资产'), 'Must display filtered no-match message')
    assert.ok(html.includes('清除所有筛选'), 'Must provide clear filters action')
    assert.ok(html.includes('aria-label="筛选无匹配素材"'), 'Must have accessible label for filtered no-match')
    assert.ok(!html.includes('素材库暂无素材'), 'Must NOT display unfiltered empty message')
  }

  {
    // 10c: hasLoadedAssets=true + loading + empty (indeterminate loading state)
    console.log('Test 10c: hasLoadedAssets=true + loading + empty must not falsely report empty')
    const html = renderToStaticMarkup(
      React.createElement(AssetWaterfallGrid, {
        matches: [],
        selectedAsset: null,
        bulkSelectedAssetIds: [],
        setSelectedAsset: () => {},
        toggleBulkSelectedAssetId: () => {},
        assetLoadStatus: 'loading',
        hasLoadedAssets: true,
        isFiltered: false,
        onRetry: () => {}
      })
    )
    assert.ok(html.includes('正在刷新素材数据...'), 'Must show indeterminate loading indicator')
    assert.ok(!html.includes('素材库暂无素材'), 'Must NOT falsely report unfiltered empty during loading')
    assert.ok(!html.includes('没有找到符合筛选条件的素材资产'), 'Must NOT falsely report filtered no-match during loading')
  }

  {
    // 10d: hasLoadedAssets=true + error + empty (indeterminate refresh error state)
    console.log('Test 10d: hasLoadedAssets=true + error + empty must show refresh failure without false empty')
    const html = renderToStaticMarkup(
      React.createElement(AssetWaterfallGrid, {
        matches: [],
        selectedAsset: null,
        bulkSelectedAssetIds: [],
        setSelectedAsset: () => {},
        toggleBulkSelectedAssetId: () => {},
        assetLoadStatus: 'error',
        assetLoadError: '刷新素材库失败，请重试',
        hasLoadedAssets: true,
        isFiltered: false,
        onRetry: () => {}
      })
    )
    assert.ok(html.includes('刷新素材库失败'), 'Must show indeterminate refresh error state')
    assert.ok(html.includes('重试刷新'), 'Must provide retry action')
    assert.ok(!html.includes('素材库暂无素材'), 'Must NOT falsely report unfiltered empty on refresh error')
    assert.ok(!html.includes('没有找到符合筛选条件的素材资产'), 'Must NOT falsely report filtered no-match on refresh error')
  }

  {
    // 10e: Existing matches in loading/error still include cards and recovery hints
    console.log('Test 10e: Existing matches in loading/error still include cards and recovery hints')
    const matches = [createMockMatch('ast-card-1', 'Active Test Card')]

    // loading with existing cards
    const htmlLoading = renderToStaticMarkup(
      React.createElement(AssetWaterfallGrid, {
        matches,
        selectedAsset: null,
        bulkSelectedAssetIds: [],
        setSelectedAsset: () => {},
        toggleBulkSelectedAssetId: () => {},
        assetLoadStatus: 'loading',
        hasLoadedAssets: true,
        isFiltered: false
      })
    )
    assert.ok(htmlLoading.includes('Active Test Card'), 'Must still display card title during loading')
    assert.ok(htmlLoading.includes('waterfall-grid'), 'Must render grid container')
    assert.ok(htmlLoading.includes('正在刷新素材数据...'), 'Must include refresh indicator banner')

    // error with existing cards
    const htmlError = renderToStaticMarkup(
      React.createElement(AssetWaterfallGrid, {
        matches,
        selectedAsset: null,
        bulkSelectedAssetIds: [],
        setSelectedAsset: () => {},
        toggleBulkSelectedAssetId: () => {},
        assetLoadStatus: 'error',
        assetLoadError: '刷新失败测试',
        hasLoadedAssets: true,
        isFiltered: false,
        onRetry: () => {}
      })
    )
    assert.ok(htmlError.includes('Active Test Card'), 'Must still display card title during error')
    assert.ok(htmlError.includes('waterfall-grid'), 'Must render grid container')
    assert.ok(htmlError.includes('已保留此前已加载内容'), 'Must include retained content banner')
    assert.ok(htmlError.includes('重试刷新'), 'Must provide retry action button')
  }

  {
    // 10f: hasLoadedAssets=true + idle + empty must show indeterminate state without false empty
    console.log('Test 10f: hasLoadedAssets=true + idle + empty must show indeterminate state without false empty')
    const htmlIdleUnfiltered = renderToStaticMarkup(
      React.createElement(AssetWaterfallGrid, {
        matches: [],
        selectedAsset: null,
        bulkSelectedAssetIds: [],
        setSelectedAsset: () => {},
        toggleBulkSelectedAssetId: () => {},
        assetLoadStatus: 'idle',
        hasLoadedAssets: true,
        isFiltered: false,
        onRetry: () => {}
      })
    )
    assert.ok(htmlIdleUnfiltered.includes('正在刷新素材数据...'), 'Must show indeterminate loading/refreshing indicator during idle with empty matches')
    assert.ok(htmlIdleUnfiltered.includes('刷新素材库'), 'Must provide recovery action during idle')
    assert.ok(!htmlIdleUnfiltered.includes('素材库暂无素材'), 'Must NOT falsely report unfiltered empty during idle')
    assert.ok(!htmlIdleUnfiltered.includes('没有找到符合筛选条件的素材资产'), 'Must NOT falsely report filtered no-match during idle')

    // Also verify when isFiltered=true with idle + empty:
    const htmlIdleFiltered = renderToStaticMarkup(
      React.createElement(AssetWaterfallGrid, {
        matches: [],
        selectedAsset: null,
        bulkSelectedAssetIds: [],
        setSelectedAsset: () => {},
        toggleBulkSelectedAssetId: () => {},
        assetLoadStatus: 'idle',
        hasLoadedAssets: true,
        isFiltered: true,
        onClearFilters: () => {}
      })
    )
    assert.ok(!htmlIdleFiltered.includes('素材库暂无素材'), 'Must NOT falsely report unfiltered empty during idle when filtered')
    assert.ok(!htmlIdleFiltered.includes('没有找到符合筛选条件的素材资产'), 'Must NOT falsely report filtered no-match during idle when filtered')
  }

  // Tag load failures remain visible while preserving useful previous results.
  mockTagList = async () => ({ success: true, tags: [{ id: 'metadata-tag', name: 'Blue', aliases: ['Ocean'], parentId: 'parent-tag', usageCount: 2 }] })
  await useAssetStore.getState().loadTags()
  assert.equal(useAssetStore.getState().tags[0].parentId, 'parent-tag')
  assert.deepEqual(useAssetStore.getState().tags[0].aliases, ['Ocean'])
  mockTagList = async () => ({ success: false, error: 'synthetic private detail' })
  await useAssetStore.getState().loadTags()
  assert.equal(useAssetStore.getState().tags[0].id, 'metadata-tag')
  assert.ok(useAssetStore.getState().tagLoadError)
  assert.ok(!useAssetStore.getState().tagLoadError!.includes('private detail'))
  mockTagList = async () => ({ success: true, tags: [] })
  await useAssetStore.getState().loadTags()
  assert.equal(useAssetStore.getState().tagLoadError, null)
  assert.deepEqual(useAssetStore.getState().tags, [])

  console.log('--- All asset-store-loading behavior tests PASSED successfully ---')
}

runTests().catch((err) => {
  console.error('Test execution failed:', err)
  process.exit(1)
})
