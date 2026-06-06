import assert from 'node:assert/strict'
import fs from 'node:fs/promises'

const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8'))
const runnerSource = await fs.readFile('scripts/run-python-unittest.mjs', 'utf8')
const taskQueueSource = await fs.readFile('ai-service/core/task_queue.py', 'utf8')
const visualRouterSource = await fs.readFile('ai-service/models/visual_router.py', 'utf8')
const imagePreprocessSource = await fs.readFile('ai-service/utils/image_preprocess.py', 'utf8')
const hfDownloaderSource = await fs.readFile('ai-service/tools/download_hf_model.py', 'utf8')
const cooperativeDownloaderSource = await fs.readFile(
  'ai-service/tools/download_cooperative_hf_model.py',
  'utf8'
)

assert.equal(packageJson.scripts['test-python-unittest'], 'node scripts/run-python-unittest.mjs')
assert.match(runnerSource, /DESIGN_ASSET_MANAGER_DISABLE_USER_DATA_ACCESS/)
assert.match(runnerSource, /DESIGN_ASSET_MANAGER_TASK_CACHE_DB/)
assert.match(runnerSource, /PYTHONPYCACHEPREFIX/)
assert.match(runnerSource, /process\.platform === 'win32'/)
assert.match(runnerSource, /os\.homedir\(\)/)

assert.match(taskQueueSource, /DESIGN_ASSET_MANAGER_DISABLE_USER_DATA_ACCESS/)
assert.match(taskQueueSource, /DESIGN_ASSET_MANAGER_TASK_CACHE_DB/)
assert.match(taskQueueSource, /DESIGN_ASSET_MANAGER_RUNTIME_DB/)
assert.match(visualRouterSource, /DESIGN_ASSET_MANAGER_DISABLE_USER_DATA_ACCESS/)
assert.match(visualRouterSource, /DESIGN_ASSET_MANAGER_RUNTIME_DB/)
assert.match(imagePreprocessSource, /DESIGN_ASSET_MANAGER_DISABLE_USER_DATA_ACCESS/)
assert.match(imagePreprocessSource, /DESIGN_ASSET_MANAGER_RUNTIME_DB/)
assert.match(imagePreprocessSource, /replace\("\\\\", "\/"\)/)

for (const downloaderSource of [hfDownloaderSource, cooperativeDownloaderSource]) {
  assert.doesNotMatch(downloaderSource, /"localDir"\s*:/)
  assert.doesNotMatch(downloaderSource, /"localPath"\s*:/)
}
