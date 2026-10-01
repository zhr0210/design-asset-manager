import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { APP_NAVIGATION_ITEMS } from '../src/shared/workflows/app-navigation.workflow'
for (const id of ['browser','sites','search']) assert.equal(APP_NAVIGATION_ITEMS.some(item => item.id === id), false)
for (const path of ['src/preload/browser.ts','src/main/services/browser-view.manager.ts','src/main/services/browser-preview-injection.ts','src/main/services/playwright.service.ts','src/main/services/auth-state.service.ts','src/main/services/search.service.ts','src/main/services/site.service.ts','src/main/plugins','src/main/extensions/photoshow','src/renderer/routes/BrowserPage.tsx','src/renderer/routes/Search.tsx','src/renderer/routes/Sites.tsx']) {
  if (path === 'src/main/plugins') { assert.deepEqual(await fs.readdir(path).catch(() => []), []); continue }
  await assert.rejects(fs.access(path))
}
const main = await fs.readFile('src/main/index.ts','utf8')
const composition = await fs.readFile('src/main/ipc/main-ipc-composition.ts','utf8')
const preload = await fs.readFile('src/preload/index.ts','utf8')
assert.doesNotMatch(main, /EmbeddedBrowserManager|PlaywrightService|AuthStateService|BrowserView|GenericImageExtractor/)
assert.doesNotMatch(composition, /registerBrowserIpc|registerSearchIpc|registerSiteIpc/)
assert.doesNotMatch(preload, /['"](?:browser:|sites:|search:run|extractor:|download:injected-trigger)/)
for (const capability of ['managedDownloads','libraryRecovery','visualAi','imageTools','tagSearchAssets','listAssets']) assert.ok(preload.includes(capability), `Retained ${capability}`)
const pkg = JSON.parse(await fs.readFile('package.json','utf8'))
assert.equal(pkg.dependencies.playwright, undefined)
assert.ok(pkg.devDependencies.playwright, 'Electron E2E keeps its development-only automation dependency')
const build = await fs.readFile('electron.vite.config.ts','utf8')
assert.doesNotMatch(build, /src\/preload\/browser.ts/)
console.log('Web retirement passed: browser/login/search/extraction removed; independent downloads, local library, recovery and AI retained.')
