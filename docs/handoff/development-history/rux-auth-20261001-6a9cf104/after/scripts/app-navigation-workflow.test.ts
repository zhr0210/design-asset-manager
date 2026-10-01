import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { APP_DEFAULT_ROUTE, APP_HOME_ROUTE, APP_NAVIGATION_ITEMS, appPath, resolveAppPath, appScope, AI_SECTION_ROUTES, getAppMenuNavigationItems, getAppNavigationItem, shouldShowAppTopbar } from '../src/shared/workflows/app-navigation.workflow'
assert.equal(APP_DEFAULT_ROUTE.path, '/library')
assert.equal(APP_HOME_ROUTE.path, '/library')
for (const path of ['/browser','/sites','/search']) assert.equal(getAppNavigationItem(path), undefined)
for (const path of ['/library','/downloads','/settings','/ai-console','/model-library','/tag-manager','/legacy-library','/connected-libraries']) assert.ok(getAppNavigationItem(path))
for (const item of APP_NAVIGATION_ITEMS) { assert.equal(item.path, `/${item.routeSegment}`); assert.equal(shouldShowAppTopbar(item.path), true) }
assert.equal(getAppMenuNavigationItems().some(item => item.id === 'library'), false)
const app = await fs.readFile('src/renderer/App.tsx','utf8')
assert.match(app, /APP_NAVIGATION_ITEMS\.map/)
assert.match(app, /path="\*" element={<Navigate to={APP_DEFAULT_ROUTE.path} replace/)
const shell = await fs.readFile('src/renderer/components/layout/AppShell.tsx','utf8')
assert.match(shell, /<Outlet/); assert.match(shell, /GlobalNavigationMenu/)
assert.doesNotMatch(shell, /BrowserPage|nativeVisibility|AppInteractionKernel/)
console.log('Navigation passed: local workspace and downloads remain; web routes are absent and use default fallback.')

await test('global AI canonical paths, old aliases and ownership resolve without duplicate destinations',()=>{
assert.equal(resolveAppPath('/ai-console'),'/ai/connections')
assert.equal(resolveAppPath('/settings','?section=ai'),'/ai/connections')
assert.equal(resolveAppPath('/model-library'),'/ai/local-models')
assert.equal(resolveAppPath('/downloads'),'/tasks')
assert.equal(new Set(APP_NAVIGATION_ITEMS.map(item=>item.path)).size,APP_NAVIGATION_ITEMS.length)
for(const id of AI_SECTION_ROUTES){assert.equal(appScope(id),'app');assert.ok(appPath(id).startsWith('/ai/'))}
assert.equal(appScope('library'),'library')
})
