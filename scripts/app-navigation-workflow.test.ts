import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import {
  APP_DEFAULT_ROUTE,
  APP_FALLBACK_TITLE,
  APP_NAVIGATION_ITEMS,
  getAppNavigationItem,
  getAppTopbarTitle,
  isAppBrowserShellRoute,
  shouldShowAppTopbar
} from '../src/shared/workflows/app-navigation.workflow'

assert.equal(APP_DEFAULT_ROUTE.path, '/dashboard')
assert.equal(APP_FALLBACK_TITLE, '设计素材管理器')
assert.deepEqual(
  APP_NAVIGATION_ITEMS.map((item) => item.id),
  [
    'dashboard',
    'sites',
    'browser',
    'search',
    'downloads',
    'library',
    'tag-manager',
    'ai-console',
    'settings'
  ]
)

for (const item of APP_NAVIGATION_ITEMS) {
  assert.equal(item.path, `/${item.routeSegment}`)
  assert.equal(getAppNavigationItem(item.path), item)
  assert.equal(getAppTopbarTitle(item.path), item.topbarTitle)
}

assert.equal(getAppTopbarTitle('/unknown'), APP_FALLBACK_TITLE)
assert.equal(isAppBrowserShellRoute('/browser'), true)
assert.equal(isAppBrowserShellRoute('/library'), false)
assert.equal(shouldShowAppTopbar('/library'), false)
assert.equal(shouldShowAppTopbar('/browser'), false)
assert.equal(shouldShowAppTopbar('/ai-console'), true)
assert.equal(shouldShowAppTopbar('/unknown'), true)
assert.equal(APP_NAVIGATION_ITEMS.find((item) => item.id === 'downloads')?.showDownloadBadge, true)

const appSource = await fs.readFile('src/renderer/App.tsx', 'utf8')
assert.match(appSource, /APP_NAVIGATION_ITEMS\.map/)
assert.match(appSource, /APP_DEFAULT_ROUTE\.path/)
assert.doesNotMatch(appSource, /to="\/dashboard"|path="dashboard"|path="ai-console"/)

const appShellSource = await fs.readFile('src/renderer/components/layout/AppShell.tsx', 'utf8')
assert.match(appShellSource, /isAppBrowserShellRoute/)
assert.match(appShellSource, /shouldShowAppTopbar/)
assert.doesNotMatch(appShellSource, /location\.pathname === '\/browser'|location\.pathname !== '\/library'/)

const topbarSource = await fs.readFile('src/renderer/components/layout/Topbar.tsx', 'utf8')
assert.match(topbarSource, /getAppTopbarTitle\(location\.pathname\)/)
assert.doesNotMatch(topbarSource, /pageTitles|网站账号管理|系统偏好设置/)

const sidebarSource = await fs.readFile('src/renderer/components/layout/Sidebar.tsx', 'utf8')
assert.match(sidebarSource, /APP_NAVIGATION_ITEMS\.map/)
assert.match(sidebarSource, /sidebarLabel/)
assert.match(sidebarSource, /showDownloadBadge/)
assert.doesNotMatch(sidebarSource, /to: '\/dashboard'|label: '仪表盘'|hasBadge/)

const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8')) as {
  scripts?: Record<string, string>
}
assert.equal(
  packageJson.scripts?.['test-app-navigation-workflow'],
  'node scripts/run-ts-test.mjs scripts/app-navigation-workflow.test.ts'
)
assert.match(packageJson.scripts?.['ci:test-governance'] ?? '', /test-app-navigation-workflow/)

console.log('app-navigation-workflow passed')
