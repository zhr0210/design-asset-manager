import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { chromium, type Browser, type Page } from 'playwright'

const ROUTES = [
  { path: '/settings', heading: '设置' },
  { path: '/tag-manager', heading: '标签' },
  { path: '/downloads', heading: '下载与入库' },
  { path: '/model-library', heading: '模型库' },
  { path: '/ai-console', heading: 'AI 运行控制台' }
] as const

type WorkspaceQa = {
  calls: string[]
  externalRequests: string[]
  maxRouteSurfaceCount: number
}

function createEntry(repoRoot: string): string {
  const appPath = `/@fs/${repoRoot}/src/renderer/App.tsx`
  const cssPath = `/@fs/${repoRoot}/src/renderer/styles/globals.css`
  return `
import React from 'react'
import { createRoot } from 'react-dom/client'

const calls = []
const settings = {
  libraryPath: '/synthetic/library-draft',
  modelRootDir: '/synthetic/model-draft',
  concurrency: 3,
  delayInterval: 1.5,
  saveOriginalUrl: true,
  autoThumbnail: true,
  enableTextColorPalette: true,
  textDetectionProvider: 'none',
  textDetectionTimeoutMs: 3000,
  maxTextBoxes: 30,
  minTextBoxConfidence: 0.5,
  enableTextColorAnalysis: true,
  textBoxProvider: 'easyocr',
  ocrTimeoutMs: 3000,
  maxTextBoxesPerImage: 30,
  autoInstallAllowed: false,
  lastOcrEnvCheckAt: '',
  cachedOcrEnvStatus: null,
  selectedPromptModelId: 'qwen3-vl-4b-instruct',
  selectedPromptModelPath: '',
  qwen3vlMaxNewTokens: 256,
  qwen3vlMaxImageSize: 1024,
  qwen3vlTemperature: 0.6,
  qwen3vlTopP: 0.9,
  aiBackends: [],
  promptReverseTemplates: [],
  promptReverseSettings: {
    backendMode: 'llama-openai', selectedNativeModelId: 'qwen3-vl-4b-instruct',
    selectedExternalBackendId: '', selectedExternalModel: '', maxNewTokens: 256,
    maxImageSize: 1024, temperature: 0.6, topP: 0.9
  },
  modelCompatStatuses: {},
  memoryPolicy: {
    clearGpuBeforePromptReverse: 'auto', forceClearWhenInsufficient: true,
    minFreeVramGBBeforeQwen8B: 10, maxGpuMemoryUsagePercent: 92,
    enableGpuMemoryGuard: true, enableGpuMemoryPollingDuringInference: true,
    gpuMemoryPollIntervalMs: 1000
  }
}
const record = (name, value) => { calls.push(name); return Promise.resolve(value) }
let folderSelection = 0
const electronAPI = Object.freeze({
  listSites: () => record('listSites', [{
    id: 'synthetic-site', name: 'Synthetic Source', base_url: 'https://fixture.invalid/',
    search_url_template: 'https://fixture.invalid/search?q={{keyword}}', requires_auth: 0,
    auth_status: 'logged', notes: 'isolated smoke fixture'
  }]),
  saveSite: () => record('saveSite', { success: false, error: 'disabled in smoke' }),
  deleteSite: () => record('deleteSite', { success: false, error: 'disabled in smoke' }),
  startLoginSite: () => record('startLoginSite', { success: false, error: 'disabled in smoke' }),
  completeLoginSite: () => record('completeLoginSite', { success: false, error: 'disabled in smoke' }),
  listDownloads: () => record('listDownloads', []),
  clearDownloads: () => record('clearDownloads', { success: false }),
  settingsLoad: () => record('settingsLoad', { ...settings }),
  settingsSelectFolder: () => {
    calls.push('settingsSelectFolder')
    folderSelection += 1
    return Promise.resolve(folderSelection === 1
      ? { canceled: false, path: '/synthetic/picked-library' }
      : { canceled: true, path: '' })
  },
  settingsSave: (patch) => { calls.push('settingsSave'); Object.assign(settings, patch); return Promise.resolve({ ...settings }) }
})
Object.defineProperty(window, 'electronAPI', { value: electronAPI, configurable: false, writable: false })
window.__workspaceMotionQA = { calls, maxRouteSurfaceCount: 0 }
location.hash = '#/settings'
await import(${JSON.stringify(cssPath)})
const { default: App } = await import(${JSON.stringify(appPath)})
createRoot(document.getElementById('root')).render(React.createElement(React.StrictMode, null, React.createElement(App)))
const observer = new MutationObserver(() => {
  window.__workspaceMotionQA.maxRouteSurfaceCount = Math.max(
    window.__workspaceMotionQA.maxRouteSurfaceCount,
    document.querySelectorAll('[data-workspace-route]').length
  )
})
observer.observe(document.documentElement, { childList: true, subtree: true })
`
}

async function navigate(page: Page, route: string, heading: string) {
  await page.evaluate((nextRoute) => { window.location.hash = `#${nextRoute}` }, route)
  await page.getByRole('heading', { name: heading, exact: true }).first().waitFor({ state: 'visible' })
  await page.waitForFunction((expected) => {
    const roots = document.querySelectorAll('[data-workspace-route]')
    return roots.length === 1 && roots[0].getAttribute('data-workspace-route') === expected
  }, route)
}

function isIdentityTransform(transform: string): boolean {
  return transform === 'none'
    || transform === 'matrix(1, 0, 0, 1, 0, 0)'
    || transform === 'matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)'
}

async function main() {
  const repoRoot = process.cwd()
  const tempRoot = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'dam-workspace-motion-')))
  const evidenceDirectory = path.join(tempRoot, 'evidence')
  await fs.mkdir(evidenceDirectory, { recursive: true })
  await fs.writeFile(path.join(tempRoot, 'index.html'), '<!doctype html><html lang="zh-CN"><body><div id="root"></div><script type="module" src="/entry.tsx"></script></body></html>')
  await fs.writeFile(path.join(tempRoot, 'entry.tsx'), createEntry(repoRoot))
  await fs.symlink(path.join(repoRoot, 'node_modules'), path.join(tempRoot, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir')

  const require = createRequire(path.join(repoRoot, 'package.json'))
  const vitePackage = require.resolve('vite/package.json')
  const tailwindcss = require('tailwindcss')
  const autoprefixer = require('autoprefixer')
  const tailwindConfigModule = await import(pathToFileURL(path.join(repoRoot, 'tailwind.config.js')).href)
  const tailwindConfig = {
    ...tailwindConfigModule.default,
    content: [
      path.join(repoRoot, 'src/renderer/**/*.{js,ts,jsx,tsx}'),
      path.join(tempRoot, 'index.html'),
      path.join(tempRoot, 'entry.tsx')
    ]
  }
  const { createServer } = await import(pathToFileURL(path.join(path.dirname(vitePackage), 'dist/node/index.js')).href)
  const server = await createServer({
    configFile: false,
    root: tempRoot,
    cacheDir: path.join(tempRoot, 'vite-cache'),
    logLevel: 'error',
    css: { postcss: { plugins: [tailwindcss(tailwindConfig), autoprefixer()] } },
    resolve: { dedupe: ['react', 'react-dom'] },
    server: { host: '127.0.0.1', port: 0, fs: { allow: [tempRoot, repoRoot] } }
  })
  await server.listen()
  const address = server.httpServer.address()
  assert.ok(address && typeof address !== 'string')

  let browser: Browser | undefined
  const pageErrors: string[] = []
  const externalRequests: string[] = []
  try {
    browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] })
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      reducedMotion: 'reduce',
      colorScheme: 'light'
    })
    await context.route('**/*', (route) => {
      const requestUrl = new URL(route.request().url())
      if (requestUrl.hostname === '127.0.0.1') return route.continue()
      externalRequests.push(requestUrl.origin)
      return route.abort('blockedbyclient')
    })
    const page = await context.newPage()
    page.on('pageerror', (error) => pageErrors.push(error.message))
    const response = await page.goto(`http://127.0.0.1:${address.port}`)
    assert.ok(response?.ok(), `Vite harness failed to load: ${response?.status()}`)
    assert.equal(await page.locator('body').evaluate((element) => getComputedStyle(element).margin), '0px')

    await navigate(page, '/settings', '设置')
    const settingsGroup = page.getByRole('navigation', { name: '设置分类' })
    const appearance = settingsGroup.getByRole('button', { name: '外观与操作', exact: true })
    const storage = settingsGroup.getByRole('button', { name: '资料库', exact: true })
    const advanced = settingsGroup.getByRole('button', { name: '高级维护', exact: true })
    assert.equal(await appearance.getAttribute('aria-pressed'), 'true')
    await appearance.focus()
    await appearance.press('ArrowRight')
    assert.equal(await storage.getAttribute('aria-pressed'), 'true')
    assert.equal(await storage.evaluate((element) => element === document.activeElement), true)
    const libraryDraft = page.getByRole('textbox', { name: '素材存储路径偏好' })
    await libraryDraft.fill('/synthetic/unsaved-library')
    await storage.press('End')
    assert.equal(await advanced.getAttribute('aria-pressed'), 'true')
    await advanced.press('Home')
    assert.equal(await appearance.getAttribute('aria-pressed'), 'true')
    await appearance.press('End')
    assert.equal(await advanced.getAttribute('aria-pressed'), 'true')
    await storage.click()
    assert.equal(await libraryDraft.inputValue(), '/synthetic/unsaved-library', 'Storage draft must survive category switches')
    const browseFolder = page.getByRole('button', { name: '浏览文件夹', exact: true })
    await browseFolder.click()
    assert.equal(await libraryDraft.inputValue(), '/synthetic/picked-library')
    await browseFolder.click()
    assert.equal(await libraryDraft.inputValue(), '/synthetic/picked-library', 'Cancelled folder selection must retain the draft')
    assert.equal(await page.evaluate(() => (window as any).__workspaceMotionQA.calls.filter((call: string) => call === 'settingsSave').length), 0)
    await appearance.click()
    await page.getByRole('button', { name: '浅色外观' }).click()
    await page.screenshot({ path: path.join(evidenceDirectory, 'settings-light.png'), fullPage: true })
    await page.getByRole('button', { name: '深色外观' }).click()
    assert.equal(await page.locator('html').evaluate((element) => element.classList.contains('dark')), true)
    await page.screenshot({ path: path.join(evidenceDirectory, 'settings-dark.png'), fullPage: true })

    for (const route of ROUTES.slice(1)) {
      await navigate(page, route.path, route.heading)
      const transform = await page.locator('[data-workspace-route]').evaluate((element) => getComputedStyle(element).transform)
      assert.equal(isIdentityTransform(transform), true, `Reduced-motion route ${route.path} moved with transform ${transform}`)
      if (route.path === '/tag-manager') {
        await page.screenshot({ path: path.join(evidenceDirectory, 'tags.png'), fullPage: true })
      }
      if (route.path === '/ai-console') {
        const stats = page.getByText('GPU 与显存', { exact: true }).first().locator('xpath=ancestor::section[contains(@class,"grid")]')
        await stats.waitFor({ state: 'visible' })
        assert.equal(await stats.evaluate((element) => getComputedStyle(element).display), 'grid')
        assert.ok((await stats.evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').length)) >= 4)
        const consoleGroup = page.getByRole('group', { name: 'AI 控制台分类' })
        const overview = consoleGroup.getByRole('button', { name: '总览', exact: true })
        const models = consoleGroup.getByRole('button', { name: '模型', exact: true })
        const logs = consoleGroup.getByRole('button', { name: '日志', exact: true })
        await overview.focus()
        await overview.press('ArrowRight')
        assert.equal(await models.getAttribute('aria-pressed'), 'true')
        assert.equal(await models.evaluate((element) => element === document.activeElement), true)
        await models.press('End')
        assert.equal(await logs.getAttribute('aria-pressed'), 'true')
        await logs.press('Home')
        assert.equal(await overview.getAttribute('aria-pressed'), 'true')
        const aiSettingsTrigger = page.getByRole('button', { name: 'AI 设置', exact: true })
        await aiSettingsTrigger.click()
        const aiSettingsDialog = page.getByRole('dialog', { name: 'AI 设置' })
        await aiSettingsDialog.waitFor({ state: 'visible' })
        assert.equal(await aiSettingsDialog.evaluate((element) => element === document.activeElement), true)
        await page.keyboard.press('Escape')
        await aiSettingsDialog.waitFor({ state: 'detached' })
        assert.equal(await aiSettingsTrigger.evaluate((element) => element === document.activeElement), true)
        const shell = page.locator('.workspace-shell')
        const rail = page.getByRole('navigation', { name: '工作区导航' })
        const shellColumns = await shell.evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' '))
        assert.equal(await shell.evaluate((element) => getComputedStyle(element).display), 'grid')
        assert.equal(shellColumns.length, 2)
        assert.equal(await rail.getByRole('link').count(), 6)
        assert.ok((await rail.boundingBox())?.width ?? 0 > 180)
        await page.screenshot({ path: path.join(evidenceDirectory, 'ai-console.png'), fullPage: true })
      }
    }

    await page.evaluate(() => {
      ;(window as any).__workspaceMotionQA.maxRouteSurfaceCount = document.querySelectorAll('[data-workspace-route]').length
    })
    const rapidRoutes = ['/settings', '/tag-manager', '/downloads', '/model-library', '/ai-console']
    await page.evaluate(async ({ routes }) => {
      for (let pass = 0; pass < 3; pass += 1) {
        for (const route of routes) {
          window.location.hash = `#${route}`
          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
          if (document.querySelectorAll('[data-workspace-route]').length > 1) {
            throw new Error('More than one workspace route remained mounted')
          }
        }
      }
    }, { routes: rapidRoutes })
    await navigate(page, '/ai-console', 'AI 运行控制台')
    const qa = await page.evaluate(() => (window as unknown as { __workspaceMotionQA: WorkspaceQa }).__workspaceMotionQA)
    assert.equal(qa.maxRouteSurfaceCount, 1, 'Rapid route changes must never retain an old route surface')
    assert.deepEqual(externalRequests, [], 'The isolated workspace smoke must not attempt external network requests')
    assert.deepEqual(pageErrors, [], 'The real workspace routes must not emit page errors')
    assert.ok(qa.calls.includes('settingsLoad'))
    assert.equal(qa.calls.includes('listSites'), false)
    assert.ok(qa.calls.includes('listDownloads'))
    assert.equal(qa.calls.some((call) => ['saveSite', 'deleteSite', 'startLoginSite', 'completeLoginSite', 'clearDownloads', 'settingsSave'].includes(call)), false, 'Smoke must not perform a write-like Electron action')
    await context.close()

    const motionExternalRequests: string[] = []
    const motionPageErrors: string[] = []
    const motionContext = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      reducedMotion: 'no-preference',
      colorScheme: 'light'
    })
    await motionContext.route('**/*', (route) => {
      const requestUrl = new URL(route.request().url())
      if (requestUrl.hostname === '127.0.0.1') return route.continue()
      motionExternalRequests.push(requestUrl.origin)
      return route.abort('blockedbyclient')
    })
    const motionPage = await motionContext.newPage()
    motionPage.on('pageerror', (error) => motionPageErrors.push(error.message))
    const motionResponse = await motionPage.goto(`http://127.0.0.1:${address.port}`)
    assert.ok(motionResponse?.ok())
    await navigate(motionPage, '/settings', '设置')
    await motionPage.evaluate(async ({ routes }) => {
      for (let pass = 0; pass < 3; pass += 1) {
        for (const route of routes) {
          window.location.hash = `#${route}`
          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
          if (document.querySelectorAll('[data-workspace-route]').length > 1) {
            throw new Error('Normal-motion navigation retained an old route')
          }
        }
      }
    }, { routes: rapidRoutes })
    await navigate(motionPage, '/ai-console', 'AI 运行控制台')
    const motionQa = await motionPage.evaluate(() => (window as unknown as { __workspaceMotionQA: WorkspaceQa }).__workspaceMotionQA)
    assert.equal(motionQa.maxRouteSurfaceCount, 1)

    const menuTrigger = motionPage.getByRole('button', { name: '打开导航菜单', exact: true })
    await menuTrigger.click()
    const menu = motionPage.getByTestId('global-navigation-menu-popover')
    await menu.waitFor({ state: 'visible' })
    await menuTrigger.click()
    if (await menu.count()) {
      assert.equal(await menu.getAttribute('aria-hidden'), 'true')
      assert.equal(await menu.evaluate((element) => element.hasAttribute('inert') || element.inert), true)
      assert.equal(await menu.evaluate((element) => getComputedStyle(element).pointerEvents), 'none')
    }
    await menu.waitFor({ state: 'detached' })
    assert.deepEqual(motionExternalRequests, [])
    assert.deepEqual(motionPageErrors, [])
    await motionContext.close()
    console.log(`workspace-motion passed; synthetic screenshots: ${evidenceDirectory}`)
  } finally {
    await browser?.close().catch(() => undefined)
    await server.close()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
