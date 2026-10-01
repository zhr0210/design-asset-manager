import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import http from 'node:http'
import { randomBytes } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import sharp from 'sharp'
import { _electron as electron } from 'playwright'

execFileSync(process.execPath, ['node_modules/electron-vite/bin/electron-vite.js', 'build'], { stdio: 'inherit' })
const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'dam-intake-electron-e2e-')))
const profileDirectory = path.join(root, 'profile'), libraryDirectory = path.join(root, 'library'), evidenceDirectory = path.join(root, 'evidence')
await fs.mkdir(evidenceDirectory)
const source = path.join(root, 'generated.png')
const bytes = await sharp(randomBytes(1024 * 1024 * 3), { raw: { width: 1024, height: 1024, channels: 3 } }).png().toBuffer()
await fs.writeFile(source, bytes)
let requests = 0
const server = http.createServer((_request, response) => { requests++; response.writeHead(200, { ETag: '"fixture"', 'Content-Length': bytes.length }); response.write(bytes.subarray(0, 1024 * 1024 + 64)) })
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const origin = `http://127.0.0.1:${server.address().port}`
const launch = { args: ['.', '--dam-active-library-synthetic-e2e', `--user-data-dir=${profileDirectory}`], env: { ...process.env, NODE_ENV: 'test', DAM_ACTIVE_LIBRARY_SYNTHETIC_E2E: JSON.stringify({ rootDirectory: root, profileDirectory, libraryDirectory, evidenceDirectory, sourceSelections: [[source]] }) } }
let app = await electron.launch(launch)
const sql = query => execFileSync('/usr/bin/sqlite3', [path.join(libraryDirectory, '.dam', 'library.sqlite'), query], { encoding: 'utf8' }).trim()
let currentPage
const restart = async () => {
  await app.close(); await fileExists(path.join(evidenceDirectory, 'shutdown-complete')); await fs.unlink(path.join(evidenceDirectory, 'shutdown-complete'))
  app = await electron.launch(launch); const page = await app.firstWindow(); currentPage = page
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.getByTestId('library-open').click(); await page.getByTestId('active-library-controls').getByText('已打开', { exact: true }).waitFor()
  return page
}
try {
  let page = await app.firstWindow(); currentPage = page
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.getByTestId('library-create').click(); await page.getByTestId('library-create-confirm').click()
  await page.getByTestId('active-library-controls').getByText('已打开', { exact: true }).waitFor()
  sql("CREATE TRIGGER fixture_failure BEFORE INSERT ON promotion_links BEGIN SELECT RAISE(ABORT,'fixture'); END")
  await page.getByTestId('library-add-assets').click(); await page.getByTestId('library-copy-confirm').click()
  await page.getByTestId('library-action-error').waitFor()
  assert.equal(sql('SELECT COUNT(*) FROM assets'), '0')
  sql('DROP TRIGGER fixture_failure')
  page = await restart()
  await page.getByTestId('library-intake-recovery').click()
  let panel = page.getByRole('dialog', { name: '入库恢复', exact: true })
  await panel.getByRole('button', { name: '核验保留文件', exact: true }).click()
  await panel.getByRole('button', { name: '取消确认', exact: true }).click()
  assert.equal(sql('SELECT COUNT(*) FROM assets'), '0')
  await panel.getByRole('button', { name: '核验保留文件', exact: true }).click()
  await page.screenshot({ path: path.join(evidenceDirectory, 'copy-recovery-review.png'), animations: 'disabled' })
  await panel.getByRole('button', { name: '确认恢复入库', exact: true }).click()
  await panel.getByText('没有待恢复的图片导入或副本。', { exact: true }).waitFor()
  await panel.getByRole('button', { name: '关闭', exact: true }).click()
  assert.equal(sql('SELECT COUNT(*) FROM assets'), '1')
  assert.equal(sql('PRAGMA user_version'), '1')
  // Normal image-tool prepare/save through the production bridge; metadata failure occurs after Promotion.
  const variantReview = await page.evaluate(async () => {
    const scope = await window.electronAPI.library.inspect(); const asset = (await window.electronAPI.listAssets())[0]
    return window.electronAPI.imageTools.prepare({ libraryIdentity: scope.identity, generation: scope.generation, assetId: asset.id, options: { rotation: 90, mirror: false, crop: 'original', maxEdge: 640 } })
  })
  assert.equal(variantReview.ok, true); assert.match(variantReview.value.storageNotice, /v4/)
  sql("CREATE TRIGGER fixture_failure BEFORE UPDATE OF image_metadata_json ON assets BEGIN SELECT RAISE(ABORT,'fixture'); END")
  const failed = await page.evaluate(receipt => window.electronAPI.imageTools.save(receipt), variantReview.value.receipt)
  assert.equal(failed.ok, false); sql('DROP TRIGGER fixture_failure')
  assert.equal(sql('PRAGMA user_version'), '4')
  page = await restart()
  await page.getByTestId('library-intake-recovery').click(); panel = page.getByRole('dialog', { name: '入库恢复', exact: true })
  await panel.getByRole('button', { name: '核验保留文件', exact: true }).click()
  await page.screenshot({ path: path.join(evidenceDirectory, 'variant-recovery-review.png'), animations: 'disabled' })
  await panel.getByRole('button', { name: '确认恢复入库', exact: true }).click()
  await panel.getByText('没有待恢复的图片导入或副本。', { exact: true }).waitFor()
  await panel.getByRole('button', { name: '关闭', exact: true }).click()
  assert.equal(sql('SELECT COUNT(*) FROM assets'), '2')
  assert.equal(sql("SELECT COUNT(*) FROM assets WHERE source_site_id='image-tools'"), '1')
  // Release is a reviewed action and does not delete an imported asset or unknown files.
  await page.evaluate(() => { location.hash = '#/downloads' })
  await page.getByRole('checkbox', { name: '在当前库保留恢复检查点' }).check()
  await page.getByRole('textbox', { name: '图片下载地址', exact: true }).fill(`${origin}/abandon.png`)
  await page.getByRole('button', { name: '准备下载', exact: true }).click()
  await page.getByRole('button', { name: '确认下载并入库', exact: true }).click()
  await wait(() => page.evaluate(async () => (await window.electronAPI.managedDownloads.list()).value.some(j => j.checkpointBytes >= 1048576)))
  const job = page.locator('.managed-download-job').filter({ hasText: 'abandon.png' })
  await job.getByRole('button', { name: '取消下载', exact: true }).click(); await job.getByText('已取消', { exact: true }).waitFor()
  await job.getByRole('button', { name: '放弃任务并释放空间', exact: true }).click()
  const release = page.getByRole('region', { name: '确认下载入库' })
  await release.getByRole('button', { name: '取消', exact: true }).click()
  assert.equal(sql("SELECT COUNT(*) FROM managed_download_chunks"), '1')
  await job.getByRole('button', { name: '放弃任务并释放空间', exact: true }).click()
  await page.screenshot({ path: path.join(evidenceDirectory, 'download-release-review.png'), animations: 'disabled' })
  await release.getByRole('button', { name: '确认释放检查点', exact: true }).click()
  await job.getByText('已放弃', { exact: true }).waitFor()
  assert.equal(sql('SELECT COUNT(*) FROM managed_download_chunks'), '0')
  assert.equal(sql('SELECT COUNT(*) FROM assets'), '2'); assert.equal(requests, 1)
  assert.deepEqual(await fs.readFile(source), bytes)
  await fs.writeFile(path.join(evidenceDirectory, 'events.json'), JSON.stringify({ result: 'passed', actualRestarts: 2, assets: 2, schemaVersion: 4, networkRequests: requests, sourcePreserved: true, copyRecovery: true, variantRecovery: true, reviewedRelease: true }, null, 2))
} catch (error) { await currentPage?.screenshot({ path: path.join(evidenceDirectory, 'failure.png'), animations: 'disabled' }).catch(() => {}); console.error(`Fixture evidence: ${evidenceDirectory}`); throw error }
finally { await app.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)) }
await fileExists(path.join(evidenceDirectory, 'shutdown-complete'))
console.log(`Intake recovery Electron E2E passed. Evidence: ${evidenceDirectory}`)
async function wait(check) { const end = Date.now() + 20000; while (!(await check())) { if (Date.now() > end) throw new Error('Fixture condition did not settle'); await new Promise(resolve => setTimeout(resolve, 40)) } }
async function fileExists(file) { await wait(async () => { try { await fs.stat(file); return true } catch { return false } }) }
