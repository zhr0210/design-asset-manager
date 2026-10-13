// Isolated presentation regression. Formal Host/user-path acceptance is separate.
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { chromium } from 'playwright'

const paths = [
  'src/renderer/styles/design-system.css',
  'src/renderer/styles/asset-workspace-modes.css',
  'src/renderer/components/gallery/tokens.css',
  'src/renderer/components/gallery/gallery.css',
  'src/renderer/components/library/canvas/library-canvas.css',
  'src/renderer/styles/app-design.css',
  'src/renderer/components/gallery/work-window-legacy-tokens.css'
]
const styles = (await Promise.all(paths.map(async p => {
  try { return await fs.readFile(p, 'utf8') } catch (e) { if (e.code === 'ENOENT') return ''; throw e }
}))).join('\n')
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const browser = await chromium.launch(existsSync(chrome) ? { executablePath: chrome } : {})
try {
  const page = await browser.newPage()
  const markup = '<div class="gallery-design minimal-prototype"><div class="library-manager"><button class="ui-button ui-button-primary">创建</button></div><label class="select-asset"><input type="checkbox" checked><span>✓</span></label><div class="floating-navigation"><button class="glass">导航</button></div></div>'
  await page.setContent('<html class="app-design"><head><style>'+styles+'</style></head><body>'+markup+'</body></html>')
  const css = selector => page.locator(selector).evaluate(e=>({bg:getComputedStyle(e).backgroundColor,color:getComputedStyle(e).color,blur:getComputedStyle(e).backdropFilter}))
  assert.equal((await css('.ui-button-primary')).bg, 'rgb(0, 113, 227)', 'primary confirmation must use adopted accent')
  assert.equal((await css('.ui-button-primary')).color, 'rgb(255, 255, 255)')
  assert.notEqual((await css('.select-asset span')).bg, 'rgb(0, 113, 227)', 'selection is independent of action accent')
  await page.evaluate(()=>document.documentElement.classList.add('dark'))
  assert.equal((await css('.ui-button-primary')).bg, 'rgb(0, 113, 227)')
  await page.emulateMedia({ contrast: 'more' })
  await page.waitForFunction(()=>getComputedStyle(document.querySelector('.floating-navigation button')).backgroundColor==='rgb(35, 38, 46)')
  assert.equal((await css('.floating-navigation button')).blur, 'none', 'navigation obeys accessibility fallback')
  assert.equal((await css('.floating-navigation button')).bg, 'rgb(35, 38, 46)', 'navigation fallback must actually be opaque')
  assert.equal((await css('.library-manager')).bg, 'rgb(35, 38, 46)', 'Library management fallback must actually be opaque')
  const legacy = await browser.newPage()
  await legacy.setContent('<html><head><style>'+styles+'</style></head><body><div class="gallery-design minimal-prototype native-work-surface"><button class="primary">现有工作窗</button></div></body></html>')
  assert.equal(await legacy.locator('.primary').evaluate(e=>getComputedStyle(e).backgroundColor), 'rgb(85, 88, 95)', 'excluded work window retains its original roles')
  console.log('Adopted primary/selection/theme/fallback and excluded work-window roles passed')
} finally { await browser.close() }
