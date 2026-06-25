import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import {
  DESKTOP_VIEWPORT_POLICY,
  DESKTOP_WINDOW_FRAME_ALLOWANCE
} from '../src/shared/desktop-viewport-policy'

assert.equal(
  DESKTOP_VIEWPORT_POLICY.window.minOuterWidth,
  DESKTOP_VIEWPORT_POLICY.shell.minContentWidth + DESKTOP_WINDOW_FRAME_ALLOWANCE.width
)
assert.equal(
  DESKTOP_VIEWPORT_POLICY.window.minOuterHeight,
  DESKTOP_VIEWPORT_POLICY.shell.minContentHeight + DESKTOP_WINDOW_FRAME_ALLOWANCE.height
)
assert.ok(DESKTOP_VIEWPORT_POLICY.window.defaultWidth >= DESKTOP_VIEWPORT_POLICY.window.minOuterWidth)
assert.ok(DESKTOP_VIEWPORT_POLICY.window.defaultHeight >= DESKTOP_VIEWPORT_POLICY.window.minOuterHeight)
assert.ok(DESKTOP_VIEWPORT_POLICY.shell.mainContentMinWidth < DESKTOP_VIEWPORT_POLICY.shell.minContentWidth)

const mainSource = await fs.readFile('src/main/index.ts', 'utf8')
assert.match(mainSource, /DESKTOP_VIEWPORT_POLICY/)
assert.match(mainSource, /width:\s*DESKTOP_VIEWPORT_POLICY\.window\.defaultWidth/)
assert.match(mainSource, /height:\s*DESKTOP_VIEWPORT_POLICY\.window\.defaultHeight/)
assert.match(mainSource, /minWidth:\s*DESKTOP_VIEWPORT_POLICY\.window\.minOuterWidth/)
assert.match(mainSource, /minHeight:\s*DESKTOP_VIEWPORT_POLICY\.window\.minOuterHeight/)
assert.doesNotMatch(mainSource, /minWidth:\s*1024|minHeight:\s*700/)

const appShellSource = await fs.readFile('src/renderer/components/layout/AppShell.tsx', 'utf8')
assert.match(appShellSource, /DESKTOP_VIEWPORT_POLICY/)
assert.match(appShellSource, /minWidth:\s*DESKTOP_VIEWPORT_POLICY\.shell\.minContentWidth/)
assert.match(appShellSource, /minHeight:\s*DESKTOP_VIEWPORT_POLICY\.shell\.minContentHeight/)
assert.match(appShellSource, /minWidth:\s*DESKTOP_VIEWPORT_POLICY\.shell\.mainContentMinWidth/)
assert.doesNotMatch(appShellSource, /DESKTOP_MIN_WIDTH|min-h-\[720px\]|min-w-\[1040px\]/)

const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8')) as {
  scripts?: Record<string, string>
}
assert.equal(
  packageJson.scripts?.['test-desktop-viewport-policy'],
  'node scripts/run-ts-test.mjs scripts/desktop-viewport-policy.test.ts'
)
assert.match(packageJson.scripts?.['ci:test-governance'] ?? '', /test-desktop-viewport-policy/)

console.log('desktop-viewport-policy passed')
