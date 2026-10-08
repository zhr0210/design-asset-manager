import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import http from 'node:http'
import path from 'node:path'

import { _electron as electron } from 'playwright'
import sharp from 'sharp'

execFileSync(process.execPath, ['node_modules/electron-vite/bin/electron-vite.js', 'build'], {
  cwd: process.cwd(),
  stdio: 'inherit'
})

const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'dam-persistent-download-electron-e2e-')))
const profileDirectory = path.join(root, 'profile')
const libraryDirectory = path.join(root, 'library')
const evidenceDirectory = path.join(root, 'evidence')
const sourceDirectory = path.join(root, 'sources')
await Promise.all([profileDirectory, evidenceDirectory, sourceDirectory].map((directory) => fs.mkdir(directory, { recursive: true })))

const persistentBytes = await sharp(randomBytes(1024 * 1024 * 3), { raw: { width: 1024, height: 1024, channels: 3 } }).png().toBuffer()
const source = path.join(sourceDirectory, 'generated.png')
await fs.writeFile(source, persistentBytes)
const configuration = { rootDirectory: root, profileDirectory, libraryDirectory, evidenceDirectory, sourceSelections: [[source]] }
const persistentRequests = []
const fixtureServer = http.createServer(async (request, response) => {
  if (request.url === '/warmup.png') { response.end(persistentBytes); return }
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
  await page.getByTestId('library-create').click()
  await page.getByTestId('library-create-confirm').click()
  await page.getByTestId('active-library-controls').getByText('已打开', { exact: true }).waitFor()
  for (let i = 0; i < 3; i++) {
    await page.evaluate(async ({ url, persistence }) => { const review = await window.damClient.managedDownloads.prepare({ url, persistence }); await window.damClient.managedDownloads.run(review.value.receipt) }, { url: `${fixtureOrigin}/warmup.png`, persistence: i === 0 ? 'library' : 'memory' })
    await waitForAsync(() => page.evaluate(async n => (await window.damClient.managedDownloads.list()).value.filter(job => job.state === 'completed').length === n, i + 1))
  }
  await page.getByTestId('library-close').click()
  await page.getByTestId('library-reopen').click()
  await page.getByTestId('active-library-controls').getByText('已打开', { exact: true }).waitFor()

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
  await restarted.getByTestId('active-library-controls').getByText('已打开', { exact: true }).waitFor()
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
  await waitForCardCount(restarted, 4)
  await assertImagesLoaded(restarted.locator('.waterfall-item img'))
} finally {
  await electronApp.close()
  fixtureServer.closeAllConnections(); await new Promise(resolve => fixtureServer.close(resolve))
}
await waitForFile(path.join(evidenceDirectory, 'shutdown-complete'))
await fs.writeFile(path.join(evidenceDirectory, 'events.json'), JSON.stringify({ suite: 'persistent-download-electron-e2e', result: 'passed', checkpointBytes: 1048576, requests: persistentRequests.length, actualProcessRestart: true, assets: 4, shutdownDrained: true }, null, 2))
console.log(`Persistent Electron restart passed. Evidence: ${evidenceDirectory}`)

async function waitForFile(file) { for (let i=0;i<100;i++) { try { await fs.stat(file); return } catch {} await new Promise(resolve => setTimeout(resolve, 50)) } throw new Error('Fixture shutdown did not complete') }
async function waitForCardCount(page, count) { await page.waitForFunction(expected => document.querySelectorAll('.waterfall-item').length === expected, count, { timeout: 15000 }) }
async function assertImagesLoaded(images) { for (const image of await images.all()) await image.evaluate(img => { if (!img.complete || !img.naturalWidth) throw new Error('Fixture preview missing') }) }

// Playwright's installed waitForFunction treats a Promise predicate as truthy. Await IPC explicitly.
async function waitForAsync(check) {
  const deadline = Date.now() + 20000
  while (!(await check())) {
    if (Date.now() > deadline) throw new Error('Synthetic asynchronous condition did not settle')
    await new Promise(resolve => setTimeout(resolve, 40))
  }
}
