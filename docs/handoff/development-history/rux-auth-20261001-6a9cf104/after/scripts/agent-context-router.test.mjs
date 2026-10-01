import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import {
  buildContextPack,
  loadRepositoryContext,
  validateCatalog
} from './agent-context-router.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const CLI = path.join(ROOT, 'scripts/agent-context-router.mjs')
const NPM = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const FIXED_SNAPSHOT = { head: 'test-head', dirty: false }

function run(args, expectedStatus = 0) {
  const result = spawnSync(process.execPath, [CLI, ...args], {
    cwd: ROOT,
    encoding: 'utf8'
  })
  assert.equal(
    result.status,
    expectedStatus,
    `Unexpected status for ${args.join(' ')}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`
  )
  return result
}

function runNpm(args, expectedStatus = 0) {
  const result = spawnSync(NPM, args, { cwd: ROOT, encoding: 'utf8' })
  assert.equal(
    result.status,
    expectedStatus,
    `Unexpected npm status for ${args.join(' ')}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`
  )
  return result
}

function jsonRoute(args, expectedStatus = 0) {
  const result = run(['route', ...args, '--json'], expectedStatus)
  return JSON.parse(result.stdout)
}

function jsonCliError(args, expectedCode) {
  const result = run(args, 1)
  assert.equal(result.stderr, '')
  const error = JSON.parse(result.stdout)
  assert.equal(error.ok, false)
  assert.equal(error.error.code, expectedCode)
  return error
}

const check = run(['check', '--json'])
const health = JSON.parse(check.stdout)
assert.equal(health.ok, true)
assert.equal(health.coverage.unownedSourceFiles, 0)
assert.equal(health.coverage.duplicateSourceFiles, 0)
const localUntracked=execFileSync('git',['ls-files','--others','--exclude-standard','-z'],{cwd:ROOT,encoding:'utf8'}).split('\0').filter(Boolean)
assert.ok(Number.isInteger(health.coverage.untrackedFirstPartySourceFiles))
assert.ok(health.coverage.untrackedFirstPartySourceFiles<=localUntracked.length)
assert.equal(health.warnings.some(finding=>finding.code==='UNTRACKED_FIRST_PARTY_SOURCE'),health.coverage.untrackedFirstPartySourceFiles>0)
assert.equal(health.coverage.ownedSourceFiles, health.coverage.indexableSourceFiles)
assert.equal(health.coverage.repositoryFiles, health.coverage.trackedRepositoryFiles)

const listed = run(['route', '--list', '--json'])
const routeIds = JSON.parse(listed.stdout).map((route) => route.id)
assert.equal(routeIds.length, 19)
assert.ok(routeIds.length <= 19)
for (const routeId of [
  'asset-workspace',
  'asset-discovery',
  'asset-lifecycle',
  'library-creation',
  'capture-intake',
  'source-discovery',
  'ai-analysis',
  'prompt-reverse',
  'ai-runtime',
  'model-library',
  'model-library-core',
  'model-storage-root-registry',
  'model-library-product-pilot',
  'runtime-package',
  'settings-paths',
  'desktop-shell',
  'official-model-catalog-release',
  'release-packaging',
  'agent-governance'
]) assert.ok(routeIds.includes(routeId), `Missing route ${routeId}.`)

const publicJson = runNpm([
  '--silent',
  'run',
  'context:route',
  '--',
  '--task',
  'Asset Trash restore',
  '--json'
])
assert.equal(JSON.parse(publicJson.stdout).routes[0].id, 'asset-lifecycle')

const eagleConnected = jsonRoute(['--task', '实现 Eagle 连接库双向同步和旧库只读找回'])
assert.equal(eagleConnected.routes[0].id, 'asset-workspace')
assert.ok(eagleConnected.firstRead.some((item) => item.path === 'src/main/external-connected-library/README.md'))

jsonCliError(['check', '--json', '--garbage'], 'INVALID_ARGUMENT')
jsonCliError(['route', '--task', '--json'], 'INVALID_ARGUMENT')
jsonCliError(['route', '--budget', '1000junk', '--json'], 'INVALID_ARGUMENT')
jsonCliError(['unknown-command', '--json'], 'UNKNOWN_COMMAND')

const repositoryContext = loadRepositoryContext(ROOT)
const explicitUntracked=validateCatalog({...repositoryContext,root:ROOT,untrackedFiles:['src/renderer/owned-fixture-not-staged.tsx']})
assert.equal(explicitUntracked.coverage.untrackedFirstPartySourceFiles,1)
assert.ok(explicitUntracked.warnings.some(finding=>finding.code==='UNTRACKED_FIRST_PARTY_SOURCE'))
const trackedFiles = execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' })
  .split('\n')
  .filter(Boolean)

const routeEvalCases = [
  ['Asset Workspace inspector card selection', 'asset-workspace'],
  ['素材工作区批量标签操作', 'asset-workspace'],
  ['修复从本地拖入素材后缩略图不刷新的问题', 'asset-workspace'],
  ['修复用户编辑素材描述后无法写回数据库', 'asset-workspace'],
  ['修复用户编辑描述后无法写回数据库', 'asset-workspace'],
  ['Fix persistence of a user-edited caption to SQLite', 'asset-workspace'],
  ['Fix persistence of a user-edited description to SQLite', 'asset-workspace'],
  ['Fix user edit of an AI-generated caption', 'asset-workspace'],
  ['修复用户编辑 AI 自动生成的图片说明', 'asset-workspace'],
  ['用户手工改了素材描述，但刷新后编辑内容丢失。', 'asset-workspace'],
  ['A description typed by the user disappears after refresh.', 'asset-workspace'],
  ['Add assets to a tag group from the Inspector.', 'asset-workspace'],
  ['Add assets to the existing bulk-selection state.', 'asset-workspace'],
  ['Add assets to the current multi-select without importing anything.', 'asset-workspace'],
  ['Add assets to multi-selection in the Inspector, with no import operation.', 'asset-workspace'],
  ['Add assets to the selected-items counter in the library toolbar.', 'asset-workspace'],
  ['Add assets to a comparison tray without copying any files.', 'asset-workspace'],
  ['Add a caption to artwork', 'asset-workspace'],
  ['Add tags to artwork', 'asset-workspace'],
  ['Asset Discovery OCR match explanation', 'asset-discovery'],
  ['库内搜索语义命中说明', 'asset-discovery'],
  ['Fix OCR match explanation when searching the local asset library', 'asset-discovery'],
  ['修复素材库搜索时 OCR 命中字段说明不准确', 'asset-discovery'],
  ['Search my local asset library', 'asset-discovery'],
  ['在本地素材库中搜索图片', 'asset-discovery'],
  ['Find images in my library by OCR text', 'asset-discovery'],
  ['Search locally among assets captured from websites', 'asset-discovery'],
  ['不要改 IPC 通道，只修复素材库里按画面内容检索的结果。', 'asset-discovery'],
  ['Find an old asset in my existing library by its dominant color.', 'asset-discovery'],
  ['在我的素材库里找一张带红色汽车的旧图。', 'asset-discovery'],
  ['Explain why this local asset matched the query.', 'asset-discovery'],
  ['检索我已经收藏素材的标签。', 'asset-discovery'],
  ['Add search metadata to an asset', 'asset-discovery'],
  ['Locate a previously imported photograph by the objects visible in it.', 'asset-discovery'],
  ['Locate a previously saved poster in my local asset library by the words visible inside it.', 'asset-discovery'],
  ['在本地素材库已有素材里按图片上的文字找回旧海报。', 'asset-discovery'],
  ['Retrieve a saved library image using text printed in the picture.', 'asset-discovery'],
  ['在本地素材库中查找包含霓虹灯的已入库图片。', 'asset-discovery'],
  ['素材接入不在修改范围内；修复库内按颜色找图。', 'asset-discovery'],
  ['Asset Trash restore hard delete', 'asset-lifecycle'],
  ['素材回收站恢复与隐藏已删除', 'asset-lifecycle'],
  ['Plan new-library creation without mutations', 'library-creation'],
  ['规划创建一个新素材库且不写入文件', 'library-creation'],
  ['Plan the Active Library production composition and Legacy Application Library Migration', 'asset-lifecycle'],
  ['规划活动素材库正式组合和旧版应用素材库迁移', 'asset-lifecycle'],
  ['Add delete confirmation to an asset', 'asset-lifecycle'],
  ['找回被删除的素材', 'asset-lifecycle'],
  ['Copy Into Library Candidate preview', 'capture-intake'],
  ['素材接入 Candidate promotion', 'capture-intake'],
  ['Safely copy a captured candidate into the active library while preserving provenance', 'capture-intake'],
  ['把网页捕获候选安全复制进当前素材库并保留来源', 'capture-intake'],
  ['Import local image files into the library', 'capture-intake'],
  ['Copy dropped local files into the active library', 'capture-intake'],
  ['拖入本地图片并复制入素材库', 'capture-intake'],
  ['Add a downloaded web image to asset library', 'capture-intake'],
  ['Promote a captured Candidate into the active library only after Preview, ownership review, and safe copy', 'capture-intake'],
  ['Copy a dropped PNG into the active library without removing the original.', 'capture-intake'],
  ['Import local screenshots as unsorted assets.', 'capture-intake'],
  ['添加几张本机图片到素材库。', 'capture-intake'],
  ['Copy an existing file into the library rather than running a web download.', 'capture-intake'],
  ['Do not change web downloads; add local artwork to the managed library.', 'capture-intake'],
  ['Bring a batch of local JPEG files into the collection as new assets.', 'capture-intake'],
  ['Source Discovery website search', 'source-discovery'],
  ['来源发现网页搜索与下载队列', 'source-discovery'],
  ['Search the web for reference images', 'source-discovery'],
  ['Search Unsplash for images', 'source-discovery'],
  ['在网上搜索参考图片', 'source-discovery'],
  ['从网站下载图片', 'source-discovery'],
  ['去素材网站找一张红色汽车参考图。', 'source-discovery'],
  ['网页搜索结果点下载后一直失败。', 'source-discovery'],
  ['从素材站点搜索并下载一张灵感图。', 'source-discovery'],
  ['Download a page image and then promote it into the asset library.', 'source-discovery'],
  ['Look online for a free architectural reference image.', 'source-discovery'],
  ['去网上找图', 'source-discovery'],
  ['在网上找图', 'source-discovery'],
  ['AI tagging visual analysis result sync', 'ai-analysis'],
  ['AI 分析标签建议描述', 'ai-analysis'],
  ['AI result sync bug', 'ai-analysis'],
  ['Electron owns AI result sync', 'ai-analysis'],
  ['Candidate activation automatic analysis', 'ai-analysis'],
  ['Keep a new asset visible while OCR tags and captions are analyzed asynchronously', 'ai-analysis'],
  ['新素材入库后先可见，再异步运行 OCR、标签和描述分析', 'ai-analysis'],
  ['修复批量图片 AI 分析完成后标签、描述和 embedding 没有通过 Electron 写回素材库，也没有通知素材工作区刷新的问题', 'ai-analysis'],
  ['Fix batch AI analysis result writeback through Electron and notify Asset Workspace', 'ai-analysis'],
  ['修复 AI 生成描述完成后的 Electron 结果写回', 'ai-analysis'],
  ['Fix color quantization in AI image analysis', 'ai-analysis'],
  ['Fix writeback of an AI-generated description to SQLite', 'ai-analysis'],
  ['Fix writeback of AI-generated tag suggestions', 'ai-analysis'],
  ['Fix AI-generated asset descriptions', 'ai-analysis'],
  ['Fix AI-generated captions not persisting in the asset store', 'ai-analysis'],
  ['Fix AI image descriptions, but keep reverse prompt provider unchanged', 'ai-analysis'],
  ['Fix AI suggestions overwriting user-confirmed tags in Inspector', 'ai-analysis'],
  ['修复 AI 自动生成描述', 'ai-analysis'],
  ['修复 AI 生成描述没有保存到素材库', 'ai-analysis'],
  ['修复 AI 结果没有写入素材库', 'ai-analysis'],
  ['Fix AI result persistence in the asset library', 'ai-analysis'],
  ['修复 AI 分析结果未保存到素材库', 'ai-analysis'],
  ['Fix an AI-generated caption and refresh Asset Workspace', 'ai-analysis'],
  ['Fix writeback of AI-tagged assets', 'ai-analysis'],
  ['Repair automatic captioning for newly imported assets', 'ai-analysis'],
  ['修复自动生成的图片说明为空', 'ai-analysis'],
  ['Let AI draft a caption after an asset is imported.', 'ai-analysis'],
  ['AI 建议的标签没有同步到素材记录。', 'ai-analysis'],
  ['Persist the description produced by the model.', 'ai-analysis'],
  ['生成 AI 素材说明，但不要覆盖用户编辑过的文本。', 'ai-analysis'],
  ['修复 AI 生成标签的写回，同时保持用户确认标签不变。', 'ai-analysis'],
  ['Fix an AI-generated caption overwriting a user-edited caption', 'ai-analysis'],
  ['Generate a machine caption, but retain any wording entered manually.', 'ai-analysis'],
  ['The automatically proposed labels never reach the asset record.', 'ai-analysis'],
  ['后台 AI 视觉分析结束后持久化生成的说明和标签。', 'ai-analysis'],
  ['Add OCR metadata to artwork', 'ai-analysis'],
  ['Prompt Reverse image to prompt', 'prompt-reverse'],
  ['提示词反推图片提示词', 'prompt-reverse'],
  ['Fix image-to-prompt history so generated suggestions do not overwrite a user-edited prompt', 'prompt-reverse'],
  ['Fix reverse-prompt provider failure in the Inspector', 'prompt-reverse'],
  ['修复反推提示词时 provider 错误没有显示在素材检查器', 'prompt-reverse'],
  ['修复反向提示词历史：生成结果在用户确认前只能是建议，重新打开 Inspector 后应显示已确认版本', 'prompt-reverse'],
  ['Fix user-confirmed prompt history in Inspector', 'prompt-reverse'],
  ['Fix AI-generated prompt history in Inspector', 'prompt-reverse'],
  ['Keep Asset Workspace unchanged while fixing reverse prompt provider failure without changing native provider', 'prompt-reverse'],
  ['保持素材工作区不变，同时修复反推提示词 provider 错误，不要修改原生 provider', 'prompt-reverse'],
  ['Inspector 里确认的反推结果重开后丢失', 'prompt-reverse'],
  ['反推提示词使用原生 provider 而不是外部 provider', 'prompt-reverse'],
  ['Use external provider instead of native provider for reverse prompt', 'prompt-reverse'],
  ['Use native provider rather than external provider for reverse prompt', 'prompt-reverse'],
  ['Switch from native provider to external provider for reverse prompt', 'prompt-reverse'],
  ['Switch from external provider to native provider for reverse prompt', 'prompt-reverse'],
  ['Use external provider instead of native provider when running reverse prompt', 'prompt-reverse'],
  ['Use external provider, not native provider, for reverse prompt', 'prompt-reverse'],
  ['使用外部 provider 而不是原生 provider 来反推提示词', 'prompt-reverse'],
  ['Switch the reverse-prompt provider from Qwen3-VL to an OpenAI-compatible endpoint.', 'prompt-reverse'],
  ['把图片反推从原生 Qwen3VL 改成 llama-openai 服务。', 'prompt-reverse'],
  ['Replace the OpenAI-compatible prompt backend with native local inference.', 'prompt-reverse'],
  ['Change reverse prompt from native Qwen3VL to an external endpoint.', 'prompt-reverse'],
  ['反推提示词从外部 provider 切到原生 Qwen3VL。', 'prompt-reverse'],
  ['Fix the external prompt provider, but the native provider cannot change', 'prompt-reverse'],
  ['将图像转提示词的执行端由云端服务换回本机原生后端。', 'prompt-reverse'],
  ['Replace the native prompt provider by the external OpenAI-compatible adapter.', 'prompt-reverse'],
  ['反推提示词 provider 由原生 Qwen3VL 切换至外部 OpenAI-compatible。', 'prompt-reverse'],
  ['Asset Workspace is out of scope; repair the external reverse-prompt backend failure.', 'prompt-reverse'],
  ['Fix native Qwen3VL image-to-prompt provider', 'prompt-reverse'],
  ['Replace native reverse-prompt inference via an external OpenAI-compatible backend.', 'prompt-reverse'],
  ['Move reverse-prompt execution off OpenAI-compatible and onto native Qwen3-VL.', 'prompt-reverse'],
  ['Route image-to-prompt away from local Qwen3-VL and through an OpenAI-compatible provider.', 'prompt-reverse'],
  ['反推图片改用本地 Qwen3VL，弃用外部 provider。', 'prompt-reverse'],
  ['将外部反推后端迁移至原生 Qwen3VL。', 'prompt-reverse'],
  ['AI Runtime Runtime Probe GPU status', 'ai-runtime'],
  ['模型运行时能力探测与质量证据', 'ai-runtime'],
  ['The model is downloaded, but the runtime cannot load it', 'ai-runtime'],
  ['模型已下载，但运行时无法加载', 'ai-runtime'],
  ['The model library should not be modified; fix the inference runtime probe status.', 'ai-runtime'],
  ['Model Library is explicitly excluded from this change; repair CUDA capability detection.', 'ai-runtime'],
  ['Model Library is not part of this task; diagnose MPS runtime availability.', 'ai-runtime'],
  ['模型安装失败', 'model-library'],
  ['Validate signed Model Catalog and Manifest admission', 'model-library-core'],
  ['验证签名模型目录与清单准入', 'model-library-core'],
  ['Validate ONNX external tensor data package validation', 'model-library-core'],
  ['Validate Model Storage Root identity and cross-process single-writer crash recovery', 'model-library-core'],
  ['验证模型存储根身份、跨进程单写锁和进程崩溃恢复', 'model-library-core'],
  ['Connect the read-only Model Library product pilot with a bundled Official Catalog', 'model-library-product-pilot'],
  ['接入只读模型库页面、内置官方目录和模型存储设置', 'model-library-product-pilot'],
  ['Validate the Official Model Catalog release gate and public Publisher input', 'official-model-catalog-release'],
  ['验证官方模型目录发布门禁和发布者公钥输入', 'official-model-catalog-release'],
  ['Prepare the public-only Official Model Catalog release input', 'official-model-catalog-release'],
  ['生成公开的官方模型目录候选发布输入', 'official-model-catalog-release'],
  ['Install Qwen model weights', 'model-library'],
  ['download model', 'model-library'],
  ['model manifest checksum failure', 'model-library'],
  ['model package checksum mismatch', 'model-library'],
  ['model package installation', 'model-library'],
  ['模型包安装失败', 'model-library'],
  ['Add checksum verification and retry to model weight downloads in AI Console', 'model-library'],
  ['给 AI Console 的模型权重下载增加校验和失败重试', 'model-library'],
  ['Import a data-only model artifact into Model Library without treating it as a Runtime Package', 'model-library'],
  ['将模型权重导入模型库，不要把 Runtime Package 当成模型', 'model-library'],
  ['Fix model readiness so downloaded weights are not shown as usable until validation and activation complete', 'model-library'],
  ['Install a HuggingFace model', 'model-library'],
  ['Download a HuggingFace model checkpoint', 'model-library'],
  ['Change HuggingFace model quantization', 'model-library'],
  ['Validate a model weight before activation', 'model-library'],
  ['校验模型清单后再激活', 'model-library'],
  ['Fix quantization selection for a local GGUF model', 'model-library'],
  ['Change Q4_K_M quantization for a GGUF model', 'model-library'],
  ['Choose a quantized GGUF model variant', 'model-library'],
  ['Fix model checkpoint download used by image analysis', 'model-library'],
  ['Fix quantized model checkpoint checksum used by image analysis', 'model-library'],
  ['Fix HuggingFace image checkpoint download', 'model-library'],
  ['Q4_K_M selection for a local GGUF', 'model-library'],
  ['Fix quantized weights readiness', 'model-library'],
  ['Fix model artifact validation, activation, quantization and AI Console progress', 'model-library'],
  ['Manage model artifact lifecycle in AI Console', 'model-library'],
  ['Fix model download progress in AI Console', 'model-library'],
  ['Download Qwen3-VL', 'model-library'],
  ['Choose Q4_K_M for Qwen3-VL', 'model-library'],
  ['Delete the downloaded checkpoint', 'model-library'],
  ['Download an image checkpoint from Hugging Face', 'model-library'],
  ['Switch GGUF checkpoint Q4 to Q8 for image-to-prompt', 'model-library'],
  ['Download a vision-model checkpoint into model storage.', 'model-library'],
  ['Show progress while model weights are being fetched.', 'model-library'],
  ['修复下载好的模型未完成校验就显示可用', 'model-library'],
  ['Fix model readiness after Runtime Probe without changing model downloads', 'ai-runtime'],
  ['Runtime Package checksum install', 'runtime-package'],
  ['运行时包清单校验与回滚', 'runtime-package'],
  ['严禁修改设置路径，只修复运行时包回滚。', 'runtime-package'],
  ['runtime install failed', 'runtime-package'],
  ['runtime manifest checksum failure', 'runtime-package'],
  ['Add transactional installation and rollback for an executable AI Runtime Package while keeping model weights in Model Library', 'runtime-package'],
  ['为可执行 AI Runtime Package 增加事务安装和回滚，同时保持模型权重属于 Model Library', 'runtime-package'],
  ['Fix executable runtime archive installation, not model weights', 'runtime-package'],
  ['Keep release packaging unchanged while fixing Settings path persistence', 'settings-paths'],
  ['保持发布打包不变，同时修复设置路径持久化', 'settings-paths'],
  ['Keep Settings path persistence unchanged while fixing release packaging', 'release-packaging'],
  ['保持设置路径持久化不变，同时修复发布打包', 'release-packaging'],
  ['Do not change release packaging; fix Settings path persistence', 'settings-paths'],
  ['不要修改发布打包，修复设置路径持久化', 'settings-paths'],
  ['web download retry', 'source-discovery'],
  ['网页下载失败', 'source-discovery'],
  ['Fix ordinary search query history without changing reverse prompt history', 'asset-discovery'],
  ['Settings path migration', 'settings-paths'],
  ['设置路径缓存日志迁移', 'settings-paths'],
  ['修复设置页修改素材库根目录后重启应用路径没有保留的问题', 'settings-paths'],
  ['Migrate the model storage path while preserving rollback of the previous setting', 'settings-paths'],
  ['Change asset library location', 'settings-paths'],
  ['Move the model storage folder', 'settings-paths'],
  ['Move the folder used to store model weights.', 'settings-paths'],
  ['Configure where downloaded model weights are kept on disk.', 'settings-paths'],
  ['Keep packaging untouched and change the application log-directory preference.', 'settings-paths'],
  ['Keep the release build unchanged and relocate the application cache.', 'settings-paths'],
  ['Choose a different directory where AI weights will be stored.', 'settings-paths'],
  ['Persist the verified Model Storage Root Registry selection and reopen it after restart.', 'model-storage-root-registry'],
  ['Review a Model Storage Root Registry candidate without changing the current root.', 'model-storage-root-registry'],
  ['验证模型存储根注册表的同身份重连与重启恢复。', 'model-storage-root-registry'],
  ['Desktop Shell app navigation window', 'desktop-shell'],
  ['桌面外壳侧边栏导航窗口', 'desktop-shell'],
  ['Restore the main window when the Dock icon is clicked after closing it', 'desktop-shell'],
  ['修复桌面主窗口关闭后重新打开时窗口尺寸和位置没有恢复的问题', 'desktop-shell'],
  ['Add a macOS application menu command that focuses the asset search field in the main window', 'desktop-shell'],
  ['Do not modify release packaging; only fix Electron main window restore', 'desktop-shell'],
  ['不要修改打包流程，只修复 Electron 主窗口恢复', 'desktop-shell'],
  ['保持打包流程不变，只修复 Electron 主窗口恢复', 'desktop-shell'],
  ['Do not touch release packaging—only repair Electron main window restore', 'desktop-shell'],
  ['请勿修改打包流程：仅修复 Electron 主窗口恢复', 'desktop-shell'],
  ['Release Packaging signing checksum', 'release-packaging'],
  ['发布候选签名校验和', 'release-packaging'],
  ['Build a Windows installer', 'release-packaging'],
  ['Produce a signed and notarized desktop distribution.', 'release-packaging'],
  ['Please keep release packaging unchanged, update Settings path persistence', 'settings-paths'],
  ['Keep release packaging unchanged and fix Settings path persistence', 'settings-paths'],
  ['Avoid changes to release packaging and fix Settings path persistence', 'settings-paths'],
  ['请保持发布打包不变，调整设置路径持久化', 'settings-paths'],
  ['请保持发布打包不变并修复设置路径持久化', 'settings-paths'],
  ['Without changing native provider, fix external reverse prompt provider', 'prompt-reverse'],
  ['While keeping native provider unchanged, debug external reverse prompt provider', 'prompt-reverse'],
  ['Native provider must stay unchanged while fixing external reverse prompt provider', 'prompt-reverse'],
  ['Do not change release packaging, refactor Settings path persistence', 'settings-paths'],
  ['不要修改发布打包，调整设置路径持久化', 'settings-paths'],
  ['Fix Settings path persistence; leave release packaging unchanged', 'settings-paths'],
  ['Fix Settings path persistence and leave release packaging unchanged', 'settings-paths'],
  ['Fix Settings path persistence, leaving release packaging unchanged', 'settings-paths'],
  ['Fix settings path persistence but release packaging cannot change', 'settings-paths'],
  ['修复设置路径持久化，但发布打包不能变更', 'settings-paths'],
  ['修复设置路径持久化，但发布打包不能改', 'settings-paths'],
  ['修复设置路径持久化，但发布打包不能受影响', 'settings-paths'],
  ['修复设置路径持久化，但发布打包不可回归', 'settings-paths'],
  ['Fix settings path persistence, but release packaging must not regress', 'settings-paths'],
  ['Agent Context Router ADR governance', 'agent-governance'],
  ['智能体上下文代码索引路由', 'agent-governance'],
  ['Persist the Agent migration checkpoint during governance validation', 'agent-governance']
]

const routeEvalMetrics = []
for (const [task, expectedRoute] of routeEvalCases) {
  const pack = buildContextPack({
    ...repositoryContext,
    root: ROOT,
    task,
    snapshot: FIXED_SNAPSHOT
  })
  assert.equal(pack.ok, true, `${task}: ${pack.error?.code ?? 'route failed'}`)
  assert.equal(pack.routes.length, 1, `${task}: default routing must return one primary route.`)
  assert.equal(pack.routes[0].id, expectedRoute, `${task}: wrong primary route.`)
  assert.ok(pack.budget.selectedFiles <= 7, `${task}: too many first-read files.`)
  assert.ok(pack.budget.estimatedTokens <= 16000, `${task}: context budget exceeded.`)
  assert.equal(pack.budget.basis, 'full-file-conservative')
  assert.ok(pack.budget.outputEstimatedTokens <= pack.budget.maxMetadataTokens)
  assert.ok(pack.firstRead.every((item) => !path.isAbsolute(item.path)))
  assert.ok(pack.validations.every((command) => /^(?:npm run|node |python3? |py -3 )/.test(command)))
  routeEvalMetrics.push({ files: pack.budget.selectedFiles, tokens: pack.budget.estimatedTokens })
}

const discovery = jsonRoute(['--task', '素材工作区 OCR 命中说明错误'])
assert.equal(discovery.routes[0].id, 'asset-discovery')
assert.ok(discovery.firstRead.some((item) => item.path === 'src/shared/workflows/asset-discovery.workflow.ts'))
assert.ok(!JSON.stringify(discovery).includes('素材工作区 OCR 命中说明错误'))

const symbolItem = discovery.firstRead.find((item) => item.path === 'src/shared/workflows/asset-discovery.workflow.ts')
assert.ok(symbolItem.anchor)
assert.equal(
  symbolItem.estimatedTokens,
  Math.ceil(fs.statSync(path.join(ROOT, symbolItem.path)).size / discovery.budget.bytesPerToken),
  'A symbol anchor is a locator; its budget must still conservatively cover the full file.'
)
assert.ok(
  Math.ceil(Buffer.byteLength(JSON.stringify(discovery), 'utf8') / discovery.budget.bytesPerToken) <= 4000,
  'Serialized Context Pack output must remain under the output budget.'
)

const automaticAnalysis = jsonRoute(['--task', 'Candidate activation automatic analysis'])
assert.equal(automaticAnalysis.routes[0].id, 'ai-analysis')
assert.ok(automaticAnalysis.firstRead.some((item) => item.path.startsWith('docs/adr/0141-')))

const trash = jsonRoute(['--task', '把 assets:delete 接成可恢复 Trash 并支持 Restore'])
assert.ok(trash.states.some((state) => state.reality === 'Current Implementation' && /hard-delete/.test(state.summary)))
assert.ok(trash.states.some((state) => state.reality === 'Validated Tracer'))
assert.ok(trash.states.some((state) => state.reality === 'Target Architecture'))
assert.ok(trash.firstRead.some((item) => item.path === 'src/main/services/asset.service.ts'))
assert.ok(trash.firstRead.some((item) => item.path === 'src/main/ipc/asset.ipc.ts'))
assert.ok(trash.firstRead.some((item) => item.path === 'src/main/library-lifecycle/asset-trash.ts'))
assert.ok(trash.firstRead.some((item) => item.path.startsWith('docs/adr/0067-')))

const activeLibraryComposition = jsonRoute([
  '--task',
  'Plan the Active Library production composition and Legacy Application Library Migration'
])
assert.equal(activeLibraryComposition.routes[0].id, 'asset-lifecycle')
assert.ok(activeLibraryComposition.firstRead.some((item) =>
  item.path === 'src/main/library-lifecycle/active-library-session.ts'
))
assert.ok(activeLibraryComposition.firstRead.some((item) =>
  item.path.startsWith('docs/adr/0482-') && item.required
))
assert.ok(!activeLibraryComposition.firstRead.some((item) =>
  item.path === 'CONTEXT.md'
))

const authorityBaseline = jsonRoute(['--task', 'asset authority baseline'])
assert.equal(authorityBaseline.routes[0].id, 'asset-lifecycle')
assert.ok(authorityBaseline.firstRead.some((item) =>
  item.path === 'src/main/library-lifecycle/README.md'
))
assert.ok(authorityBaseline.validations.includes('npm run test-asset-authority-baseline'))
assert.ok(!activeLibraryComposition.firstRead.some((item) =>
  item.path === 'scripts/asset-authority-baseline.ts'
), 'The temporary guard must not crowd the existing production-composition context.')

const libraryStart = jsonRoute(['--task', 'Define a path-free read-only Library Start Interface'])
assert.equal(libraryStart.routes[0].id, 'asset-lifecycle')
assert.ok(libraryStart.firstRead.some((item) => item.path === 'src/main/library-lifecycle/library-start.ts'))
assert.ok(libraryStart.firstRead.some((item) => item.path === 'src/main/library-lifecycle/library-start.tracer.ts'))
assert.ok(libraryStart.firstRead.some((item) => item.path.startsWith('docs/adr/0276-') && item.required))
assert.ok(libraryStart.validations.includes('npm run test-library-start-foundation'))
assert.ok(libraryStart.validations.includes('npm run test-asset-authority-baseline'))
assert.ok(libraryStart.states.some((state) => state.reality === 'Validated Tracer'))
assert.ok(!libraryStart.firstRead.some((item) => ['CONTEXT.md', 'package.json', 'src/main/services/asset.service.ts'].includes(item.path)))
assert.equal(jsonRoute(['--task', '只读素材库启动接口']).routes[0].id, 'asset-lifecycle')

const libraryManifest = jsonRoute(['--task', 'Validate portable Library Manifest identity and compatibility'])
assert.equal(libraryManifest.routes[0].id, 'asset-lifecycle')
assert.ok(libraryManifest.firstRead.some((item) => item.path === 'src/main/library-lifecycle/library-start.ts'))
assert.ok(libraryManifest.firstRead.some((item) => item.path === 'src/main/library-lifecycle/library-manifest.tracer.ts'))
assert.ok(libraryManifest.firstRead.some((item) => item.path === 'scripts/library-manifest-inspection.test.ts'))
assert.ok(libraryManifest.firstRead.some((item) => item.path.startsWith('docs/adr/0276-') && item.required))
assert.ok(libraryManifest.firstRead.some((item) => item.path.startsWith('docs/adr/0282-') && item.required))
assert.ok(libraryManifest.validations.includes('npm run test-library-start-foundation'))
assert.ok(!libraryManifest.firstRead.some((item) => ['CONTEXT.md','package.json','src/main/services/asset.service.ts'].includes(item.path)))
assert.equal(jsonRoute(['--task', 'asset deletion']).routes[0].id, 'asset-lifecycle')

const filesystemEligibility = jsonRoute(['--task', 'Observe filesystem eligibility without write probes'])
assert.equal(filesystemEligibility.routes[0].id, 'asset-lifecycle')
assert.ok(filesystemEligibility.firstRead.some((item) => item.path === 'src/main/library-lifecycle/library-start.ts'))
assert.ok(filesystemEligibility.firstRead.some((item) => item.path === 'src/main/library-lifecycle/library-filesystem.tracer.ts'))
assert.ok(filesystemEligibility.firstRead.some((item) => item.path === 'scripts/library-filesystem-inspection.test.ts'))
for (const prefix of ['docs/adr/0276-','docs/adr/0282-','docs/adr/0291-']) {
  assert.ok(filesystemEligibility.firstRead.some((item) => item.path.startsWith(prefix) && item.required))
}
assert.ok(filesystemEligibility.validations.includes('npm run test-library-start-foundation'))
assert.ok(!filesystemEligibility.firstRead.some((item) => ['CONTEXT.md','package.json','src/main/services/asset.service.ts'].includes(item.path)))

const exclusiveLibraryLock = jsonRoute([
  '--task', 'Prove a real cross-process Exclusive Library Lock with crash release'
])
assert.equal(exclusiveLibraryLock.routes[0].id, 'asset-lifecycle')
assert.ok(exclusiveLibraryLock.firstRead.some((item) => item.path === 'src/main/library-lifecycle/exclusive-library-lock.tracer.ts'))
assert.ok(exclusiveLibraryLock.firstRead.some((item) => item.path === 'src/main/library-lifecycle/active-library-session.ts'))
assert.ok(exclusiveLibraryLock.firstRead.some((item) => item.path.startsWith('docs/adr/0276-') && item.required))
assert.ok(exclusiveLibraryLock.validations.includes('npm run test-library-start-foundation'))
assert.ok(!exclusiveLibraryLock.firstRead.some((item) => ['CONTEXT.md','package.json','src/main/services/asset.service.ts'].includes(item.path)))
assert.equal(jsonRoute(['--task', 'library open inspection']).routes[0].id, 'asset-lifecycle')

const libraryOpenComposition = jsonRoute([
  '--task', 'Compose fail-closed read-only Library Open Inspection'
])
assert.equal(libraryOpenComposition.routes[0].id, 'asset-lifecycle')
assert.ok(libraryOpenComposition.firstRead.some((item) => item.path === 'src/main/library-lifecycle/library-open-inspection.tracer.ts'))
assert.ok(libraryOpenComposition.firstRead.some((item) => item.path === 'src/main/library-lifecycle/library-start.ts'))
for (const prefix of ['docs/adr/0276-', 'docs/adr/0282-', 'docs/adr/0482-']) {
  assert.ok(libraryOpenComposition.firstRead.some((item) => item.path.startsWith(prefix) && item.required))
}
assert.ok(libraryOpenComposition.validations.includes('npm run test-library-start-foundation'))
assert.ok(!libraryOpenComposition.firstRead.some((item) => ['CONTEXT.md', 'package.json', 'src/main/services/asset.service.ts'].includes(item.path)))

const libraryCreation = jsonRoute([
  '--task', 'Plan new-library creation without mutations and preserve reserve capacity'
])
assert.equal(libraryCreation.routes[0].id, 'library-creation')
assert.ok(libraryCreation.firstRead.some((item) => item.path === 'src/main/library-lifecycle/library-creation-planner.ts'))
assert.ok(libraryCreation.firstRead.some((item) => item.path === 'src/main/library-lifecycle/library-creation-planner.tracer.ts'))
for (const prefix of ['docs/adr/0275-', 'docs/adr/0282-', 'docs/adr/0291-']) {
  assert.ok(libraryCreation.firstRead.some((item) => item.path.startsWith(prefix) && item.required))
}
assert.ok(libraryCreation.validations.includes('npm run test-library-creation-planner'))
assert.ok(!libraryCreation.firstRead.some((item) => ['CONTEXT.md', 'package.json', 'src/main/services/asset.service.ts'].includes(item.path)))
const chineseLibraryCreation = jsonRoute(['--task', '规划创建一个新素材库且不写入文件'])
assert.ok(chineseLibraryCreation.firstRead.some((item) =>
  item.path === 'src/main/library-lifecycle/library-creation-planner.ts'
))
const libraryCreationPlatform = jsonRoute([
  '--task', 'Audit target access and Windows filename policy for new roots'
])
assert.equal(libraryCreationPlatform.routes[0].id, 'library-creation')
assert.ok(libraryCreationPlatform.firstRead.some((item) =>
  item.path === 'src/main/library-lifecycle/library-creation-target-platform.internal.ts'
))

const capture = jsonRoute(['--task', 'Copy Into Library 的 Candidate Preview 失败重试'])
const captureStates = capture.states.filter((state) => state.route === 'capture-intake')
assert.ok(captureStates.some((state) => state.reality === 'Validated Tracer'))
assert.ok(captureStates.some((state) => state.reality === 'Target Architecture'))
assert.ok(!captureStates.some((state) => state.reality === 'Current Implementation'))
assert.ok(capture.warnings.some((warning) => /not Current Implementation/.test(warning)))
assert.ok(capture.firstRead.some((item) => item.path.startsWith('docs/adr/0123-')))
assert.ok(capture.firstRead.some((item) => item.path.startsWith('docs/adr/0292-')))

const captureAdrLimit = jsonRoute([
  '--task',
  'Copy Into Library 的 Candidate Preview 失败重试',
  '--max-adrs',
  '1'
], 2)
assert.equal(captureAdrLimit.error.code, 'BUDGET_UNSATISFIABLE')

const completeCapturePromotion = jsonRoute([
  '--task',
  'Promote a captured Candidate into the active library only after Preview, ownership review, and safe copy'
])
for (const requiredAdr of ['0123-', '0292-', '0276-']) {
  assert.ok(completeCapturePromotion.firstRead.some((item) =>
    item.required && item.path.includes(requiredAdr)
  ))
}
for (const optionalAdr of ['0105-', '0106-']) {
  assert.ok(completeCapturePromotion.deferred.context.some((item) =>
    !item.required && item.path.includes(optionalAdr)
  ))
}

const explicitRuntime = jsonRoute(['--module', 'ai-runtime'])
assert.equal(explicitRuntime.routes[0].id, 'ai-runtime')

const realModelPath = jsonRoute(['--task', '确认 macOS OCR 当前是否有 Real Model Path，而不只是一条 Runtime Probe'])
assert.ok(realModelPath.firstRead.some((item) => item.path === 'scripts/ai-runtime-panel-contract.test.ts'))
assert.ok(realModelPath.deferred.context.some((item) => item.path === 'src/renderer/components/settings/AiRuntimePanel.tsx'))

const asyncAnalysis = jsonRoute([
  '--task',
  'Keep a new asset visible while OCR tags and captions are analyzed asynchronously'
])
assert.ok(asyncAnalysis.firstRead.some((item) => item.path === 'src/main/ipc/ai-client.ipc.ts'))

const aiResultWriteback = jsonRoute([
  '--task',
  '修复批量图片 AI 分析完成后标签、描述和 embedding 没有通过 Electron 写回素材库，也没有通知素材工作区刷新的问题'
])
for (const expectedPath of [
  'src/main/ipc/ai-client.ipc.ts',
  'src/main/services/ai-client.service.ts',
  'src/main/services/ai-client/ai-result-sync.projector.ts'
]) assert.ok(aiResultWriteback.firstRead.some((item) => item.path === expectedPath))

const promptReverseHistory = jsonRoute([
  '--task',
  '修复反向提示词历史：生成结果在用户确认前只能是建议，重新打开 Inspector 后应显示已确认版本'
])
assert.equal(promptReverseHistory.routes[0].id, 'prompt-reverse')
assert.ok(promptReverseHistory.firstRead.some((item) => item.path === 'src/main/ipc/visual-ai.ipc.ts'))

const downloadedModelReadiness = jsonRoute([
  '--task',
  'Fix model readiness so downloaded weights are not shown as usable until validation and activation complete'
])
assert.equal(downloadedModelReadiness.routes[0].id, 'model-library')
assert.ok(downloadedModelReadiness.firstRead.some((item) => item.path === 'src/shared/workflows/model-artifact-readiness.workflow.ts'))

const explicitPromptReverse = jsonRoute(['--module', 'prompt-reverse'])
assert.equal(explicitPromptReverse.routes[0].id, 'prompt-reverse')
assert.ok(!explicitPromptReverse.firstRead.some((item) => item.path.includes('/providers/')))
const explicitNativePromptReverse = jsonRoute([
  '--module',
  'prompt-reverse',
  '--task',
  'native qwen3vl prompt reverse'
])
assert.ok(explicitNativePromptReverse.firstRead.some((item) => item.path.endsWith('qwen3vl-prompt.provider.ts')))

const nativePromptWithoutExternal = jsonRoute([
  '--task',
  'Fix native prompt reverse without external provider'
])
assert.ok(nativePromptWithoutExternal.firstRead.some((item) => item.path.endsWith('qwen3vl-prompt.provider.ts')))
assert.ok(!nativePromptWithoutExternal.firstRead.some((item) => item.path.endsWith('openai-compatible.provider.ts')))

const externalPromptWithoutNative = jsonRoute([
  '--task',
  'Fix external reverse prompt provider failure without changing native provider'
])
assert.ok(externalPromptWithoutNative.firstRead.some((item) => item.path.endsWith('openai-compatible.provider.ts')))
assert.ok(!externalPromptWithoutNative.firstRead.some((item) => item.path.endsWith('qwen3vl-prompt.provider.ts')))

const nestedPromptConstraints = jsonRoute([
  '--task',
  'Keep Asset Workspace unchanged while fixing external reverse prompt provider failure without changing native provider'
])
assert.ok(nestedPromptConstraints.firstRead.some((item) => item.path.endsWith('openai-compatible.provider.ts')))
assert.ok(!nestedPromptConstraints.firstRead.some((item) => item.path.endsWith('qwen3vl-prompt.provider.ts')))

const externalPromptPurposeAfterConstraint = jsonRoute([
  '--task',
  'Use external provider instead of native provider for reverse prompt'
])
assert.ok(externalPromptPurposeAfterConstraint.firstRead.some((item) => item.path.endsWith('openai-compatible.provider.ts')))
assert.ok(!externalPromptPurposeAfterConstraint.firstRead.some((item) => item.path.endsWith('qwen3vl-prompt.provider.ts')))

const nativePromptPurposeAfterConstraint = jsonRoute([
  '--task',
  'Use native provider rather than external provider for reverse prompt'
])
assert.ok(nativePromptPurposeAfterConstraint.firstRead.some((item) => item.path.endsWith('qwen3vl-prompt.provider.ts')))
assert.ok(!nativePromptPurposeAfterConstraint.firstRead.some((item) => item.path.endsWith('openai-compatible.provider.ts')))

for (const task of [
  'Switch from native provider to external provider for reverse prompt',
  'Use external provider instead of native provider when running reverse prompt',
  'Use external provider, not native provider, for reverse prompt',
  '使用外部 provider 而不是原生 provider 来反推提示词',
  'Switch the reverse-prompt provider from Qwen3-VL to an OpenAI-compatible endpoint.',
  '把图片反推从原生 Qwen3VL 改成 llama-openai 服务。',
  'Change reverse prompt from native Qwen3VL to an external endpoint.',
  'Replace the native prompt provider by the external OpenAI-compatible adapter.',
  'Replace native reverse-prompt inference via an external OpenAI-compatible backend.',
  'Route image-to-prompt away from local Qwen3-VL and through an OpenAI-compatible provider.',
  '反推提示词 provider 由原生 Qwen3VL 切换至外部 OpenAI-compatible。'
]) {
  const pack = jsonRoute(['--task', task])
  assert.ok(pack.firstRead.some((item) => item.path.endsWith('openai-compatible.provider.ts')), task)
  assert.ok(!pack.firstRead.some((item) => item.path.endsWith('qwen3vl-prompt.provider.ts')), task)
}

const switchToNativePrompt = jsonRoute([
  '--task',
  'Switch from external provider to native provider for reverse prompt'
])
assert.ok(switchToNativePrompt.firstRead.some((item) => item.path.endsWith('qwen3vl-prompt.provider.ts')))
assert.ok(!switchToNativePrompt.firstRead.some((item) => item.path.endsWith('openai-compatible.provider.ts')))

const replaceWithNativePrompt = jsonRoute([
  '--task',
  'Replace the OpenAI-compatible prompt backend with native local inference.'
])
assert.ok(replaceWithNativePrompt.firstRead.some((item) => item.path.endsWith('qwen3vl-prompt.provider.ts')))
assert.ok(!replaceWithNativePrompt.firstRead.some((item) => item.path.endsWith('openai-compatible.provider.ts')))

const changeToNativePrompt = jsonRoute([
  '--task',
  '反推提示词从外部 provider 切到原生 Qwen3VL。'
])
assert.ok(changeToNativePrompt.firstRead.some((item) => item.path.endsWith('qwen3vl-prompt.provider.ts')))
assert.ok(!changeToNativePrompt.firstRead.some((item) => item.path.endsWith('openai-compatible.provider.ts')))

const returnToNativePrompt = jsonRoute([
  '--task',
  '将图像转提示词的执行端由云端服务换回本机原生后端。'
])
assert.ok(returnToNativePrompt.firstRead.some((item) => item.path.endsWith('qwen3vl-prompt.provider.ts')))
assert.ok(!returnToNativePrompt.firstRead.some((item) => item.path.endsWith('openai-compatible.provider.ts')))

for (const task of [
  'Move reverse-prompt execution off OpenAI-compatible and onto native Qwen3-VL.',
  '反推图片改用本地 Qwen3VL，弃用外部 provider。',
  '将外部反推后端迁移至原生 Qwen3VL。'
]) {
  const pack = jsonRoute(['--task', task])
  assert.ok(pack.firstRead.some((item) => item.path.endsWith('qwen3vl-prompt.provider.ts')), task)
  assert.ok(!pack.firstRead.some((item) => item.path.endsWith('openai-compatible.provider.ts')), task)
}

const settingsPersistence = jsonRoute([
  '--task',
  '修复设置页修改素材库根目录后重启应用路径没有保留的问题'
])
for (const expectedPath of [
  'src/main/ipc/settings.ipc.ts',
  'src/renderer/stores/settings.store.ts',
  'scripts/settings-service-defaults.test.ts'
]) assert.ok(settingsPersistence.firstRead.some((item) => item.path === expectedPath))

const desktopWindowLifecycle = jsonRoute([
  '--task',
  '修复桌面主窗口关闭后重新打开时窗口尺寸和位置没有恢复的问题'
])
for (const expectedPath of [
  'src/shared/desktop-viewport-policy.ts',
  'src/shared/workflows/electron-app-lifecycle.workflow.ts',
  'scripts/desktop-viewport-policy.test.ts',
  'scripts/electron-main-lifecycle-policy.test.ts'
]) assert.ok(desktopWindowLifecycle.firstRead.some((item) => item.path === expectedPath))
assert.ok(!desktopWindowLifecycle.firstRead.some((item) => item.path === 'src/preload/index.ts'))

const sourceHandoff = jsonRoute([
  '--module',
  'source-discovery',
  '--task',
  'Hand off an external website download into the Capture Gateway'
])
assert.ok(sourceHandoff.firstRead.some((item) => item.path.startsWith('docs/adr/0106-')))
assert.ok(sourceHandoff.firstRead.some((item) => item.path === 'src/main/managed-download/managed-download.ts'))
assert.ok(sourceHandoff.firstRead.some((item) => item.path === 'src/main/ipc/main-ipc-composition.ts'))

const sourcePromotionHandoff = jsonRoute([
  '--task',
  'Download a page image and then promote it into the asset library.'
])
assert.equal(sourcePromotionHandoff.routes[0].id, 'source-discovery')
assert.ok(sourcePromotionHandoff.warnings.some((warning) => /Secondary route capture-intake/.test(warning)))

const thumbnailRefresh = jsonRoute(['--task', '修复从本地拖入素材后缩略图不刷新的问题'])
assert.ok(thumbnailRefresh.firstRead.some((item) => item.path === 'src/renderer/components/library/canvas/LibraryCanvas.tsx'))
assert.ok([...thumbnailRefresh.firstRead,...thumbnailRefresh.deferred.context].some((item) => item.path === 'src/renderer/stores/asset.store.ts'))
assert.ok(thumbnailRefresh.budget.estimatedTokens<=thumbnailRefresh.budget.maxEstimatedTokens)
if(thumbnailRefresh.deferred.context.some(item=>item.path==='src/renderer/stores/asset.store.ts'))assert.ok(thumbnailRefresh.warnings.some(warning=>warning.includes('Budget deferred')))

const signedRelease = jsonRoute(['--task', 'Notarize and sign the macOS release candidate'])
assert.ok(signedRelease.firstRead.some((item) => item.path === 'scripts/notarize.js'))
assert.ok(
  signedRelease.firstRead.some((item) =>
    item.path === 'scripts/signed-release-workflow.test.ts'
  ) || signedRelease.deferred.context.some((item) =>
    item.path === 'scripts/signed-release-workflow.test.ts'
  )
)

const windowsInstaller = jsonRoute(['--task', 'Build a Windows installer'])
assert.equal(windowsInstaller.routes[0].id, 'release-packaging')
assert.ok(!windowsInstaller.warnings.some((warning) => /Secondary route desktop-shell/.test(warning)))

const designAssignment = jsonRoute(['--task', 'Improve design asset assignment'], 2)
assert.equal(designAssignment.error.code, 'NO_ROUTE')

const exactWorkspaceRoute = jsonRoute(['--task', 'Asset Workspace'])
assert.equal(exactWorkspaceRoute.routes[0].score, 120, 'Route id and identical alias must not double-score.')

const modelLibrary = jsonRoute(['--task', '模型安装失败'])
assert.equal(modelLibrary.routes[0].id, 'model-library')
assert.ok(modelLibrary.states.some((state) => state.reality === 'Current Implementation'))
assert.ok(modelLibrary.states.some((state) => state.reality === 'Target Architecture'))
assert.ok(!modelLibrary.states.some((state) => state.reality === 'Validated Tracer'))
assert.ok(!modelLibrary.firstRead.some((item) => item.path === 'src/main/model-library/model-library.ts'))
assert.ok(modelLibrary.firstRead.some((item) => item.path.startsWith('docs/adr/0152-')))
assert.ok(modelLibrary.validations.includes('npm run test-legacy-model-management-containment'))
assert.ok(modelLibrary.validations.includes('npm run test-model-artifact-readiness'))
assert.ok(!modelLibrary.validations.includes('npm run test-model-library-core-tracer'))
assert.ok(!modelLibrary.validations.includes('npm run test-model-library-verified-blob-store-tracer'))
assert.ok(modelLibrary.warnings.some((warning) => /not the accepted dedicated Model Library/.test(warning)))

const modelLibraryCore = jsonRoute(['--task', 'Design and validate Model Library core interface'])
assert.equal(modelLibraryCore.routes[0].id, 'model-library-core')
assert.ok(modelLibraryCore.states.some((state) => state.reality === 'Validated Tracer'))
assert.ok(modelLibraryCore.states.some((state) => state.reality === 'Target Architecture'))
assert.ok(modelLibraryCore.firstRead.some((item) => item.path === 'src/main/model-library/model-library.ts'))
assert.ok(modelLibraryCore.validations.includes('npm run test-model-library-core-tracer'))
assert.ok(modelLibraryCore.deferred.validations.includes('npm run test-model-library-core-governance'))
assert.ok(modelLibraryCore.warnings.some((warning) => /Temporary fixtures/.test(warning)))

const modelVerifiedBlobTracer = jsonRoute([
  '--task',
  'Validate synthetic model bytes in a transactional Blob Store with crash recovery'
])
assert.equal(modelVerifiedBlobTracer.routes[0].id, 'model-library-core')
assert.ok(modelVerifiedBlobTracer.states.some((state) => state.reality === 'Validated Tracer'))
const verifiedBlobContext = [
  ...modelVerifiedBlobTracer.firstRead,
  ...modelVerifiedBlobTracer.deferred.context
]
assert.ok(verifiedBlobContext.some((item) =>
  item.path === 'src/main/model-library/transactional-model-library.tracer.ts'
))
assert.ok(verifiedBlobContext.some((item) =>
  item.path === 'scripts/model-library-verified-blob-store.tracer.test.ts'
))
assert.ok(modelVerifiedBlobTracer.validations.includes(
  'npm run test-model-library-verified-blob-store-tracer'
))
assert.ok(modelVerifiedBlobTracer.deferred.validations.includes(
  'npm run test-model-library-core-governance'
))
assert.ok(modelVerifiedBlobTracer.warnings.some((warning) => /Temporary fixtures/.test(warning)))

const modelContainerValidation = jsonRoute([
  '--task',
  'Validate model container validation for Safetensors, GGUF, and ONNX'
])
assert.equal(modelContainerValidation.routes[0].id, 'model-library-core')
assert.ok([
  ...modelContainerValidation.firstRead,
  ...modelContainerValidation.deferred.context
].some((item) =>
  item.path === 'src/main/model-library/model-artifact-format-validation.internal.ts'
))

const modelOnnxExternalData = jsonRoute([
  '--task',
  'Validate ONNX external tensor data package validation'
])
assert.equal(modelOnnxExternalData.routes[0].id, 'model-library-core')
assert.ok([
  ...modelOnnxExternalData.firstRead,
  ...modelOnnxExternalData.deferred.context
].some((item) =>
  item.path === 'src/main/model-library/model-artifact-format-validation.internal.ts'
))
assert.ok(modelOnnxExternalData.validations.includes(
  'npm run test-model-library-verified-blob-store-tracer'
))

const modelStorageAuthority = jsonRoute([
  '--task',
  'Validate Model Storage Root identity and cross-process single-writer crash recovery'
])
assert.equal(modelStorageAuthority.routes[0].id, 'model-library-core')
assert.ok(modelStorageAuthority.states.some((state) => state.reality === 'Validated Tracer'))
assert.ok(modelStorageAuthority.states.some((state) => state.reality === 'Target Architecture'))
const modelStorageAuthorityContext = [
  ...modelStorageAuthority.firstRead,
  ...modelStorageAuthority.deferred.context
]
assert.ok(modelStorageAuthorityContext.some((item) =>
  item.path === 'src/main/model-library/model-storage-authority.tracer.ts'
))
assert.ok(modelStorageAuthorityContext.some((item) =>
  item.path === 'src/main/model-library/model-storage-authority.internal.ts'
))
assert.ok(modelStorageAuthorityContext.some((item) =>
  item.path === 'scripts/model-library-storage-authority.tracer.test.ts'
))
assert.ok(modelStorageAuthority.firstRead.some((item) =>
  item.path === 'docs/adr/0167-model-storage-roots-migrate-transactionally.md'
))
assert.ok(modelStorageAuthority.validations.includes(
  'npm run test-model-library-storage-authority-tracer'
))
assert.ok(modelStorageAuthority.deferred.validations.includes(
  'npm run test-model-library-core-governance'
))
assert.ok(modelStorageAuthority.warnings.some((warning) =>
  /current-host SQLite\/OS single-writer crash release only/.test(warning)
))

const modelStorageAuthorityZh = jsonRoute([
  '--task',
  '验证模型存储根身份、跨进程单写锁和进程崩溃恢复'
])
assert.equal(modelStorageAuthorityZh.routes[0].id, 'model-library-core')

const modelStorageRootRegistry = jsonRoute([
  '--task',
  'Persist the verified Model Storage Root Registry selection and reopen it after restart'
])
assert.equal(modelStorageRootRegistry.routes[0].id, 'model-storage-root-registry')
assert.ok(modelStorageRootRegistry.states.some((state) =>
  state.reality === 'Validated Tracer'
))
assert.ok(modelStorageRootRegistry.firstRead.some((item) =>
  item.path === 'src/main/model-library/model-storage-root-registry.tracer.ts'
))
assert.ok(modelStorageRootRegistry.firstRead.some((item) =>
  item.path === 'docs/adr/0167-model-storage-roots-migrate-transactionally.md'
))
assert.ok(modelStorageRootRegistry.validations.includes(
  'npm run test-model-library-root-registry-tracer'
))
assert.ok(modelStorageRootRegistry.deferred.validations.includes(
  'npm run test-model-library-core-governance'
))
assert.ok(!modelStorageRootRegistry.firstRead.some((item) =>
  item.path === 'src/main/services/settings.service.ts'
))
assert.equal(modelStorageRootRegistry.validations.length, 4)

const modelStorageRootRegistryZh = jsonRoute([
  '--task',
  '验证模型存储根注册表的同身份重连与重启恢复'
])
assert.equal(modelStorageRootRegistryZh.routes[0].id, 'model-storage-root-registry')

const modelLibraryProductPilot = jsonRoute([
  '--task',
  'Connect the read-only Model Library product pilot with a bundled Official Catalog'
])
assert.equal(
  modelLibraryProductPilot.routes[0].id,
  'model-library-product-pilot'
)
assert.ok(modelLibraryProductPilot.states.some((state) =>
  state.reality === 'Current Implementation'
))
assert.ok(modelLibraryProductPilot.states.some((state) =>
  state.reality === 'Validated Tracer'
))
assert.ok(modelLibraryProductPilot.firstRead.some((item) =>
  item.path === 'src/main/model-library-workspace/model-library-workspace.ts'
))
assert.ok(modelLibraryProductPilot.firstRead.some((item) =>
  item.path === 'src/shared/contracts/model-library-workspace.contract.ts'
))
assert.ok(modelLibraryProductPilot.validations.includes(
  'npm run test-model-library-product-pilot'
))
assert.ok(!modelLibraryProductPilot.firstRead.some((item) =>
  item.path === 'src/renderer/routes/AiConsolePage.tsx'
))
assert.ok(modelLibraryProductPilot.warnings.some((warning) =>
  /release bundle is intentionally absent/.test(warning)
))

const modelLibraryProductPilotZh = jsonRoute([
  '--task',
  '接入只读模型库页面、内置官方目录和模型存储设置'
])
assert.equal(
  modelLibraryProductPilotZh.routes[0].id,
  'model-library-product-pilot'
)

const officialModelCatalogRelease = jsonRoute([
  '--task',
  'Validate the Official Model Catalog release gate and public Publisher input'
])
assert.equal(
  officialModelCatalogRelease.routes[0].id,
  'official-model-catalog-release'
)
assert.ok(officialModelCatalogRelease.firstRead.some((item) =>
  item.path ===
    'src/main/model-library-workspace/official-model-catalog.release.ts'
))
assert.ok(officialModelCatalogRelease.firstRead.some((item) =>
  item.path ===
    'src/main/model-library-workspace/official-model-catalog.release-input.json'
))
assert.ok(officialModelCatalogRelease.validations.includes(
  'npm run test-official-model-catalog-release-gate'
))
assert.ok(officialModelCatalogRelease.validations.includes(
  'npm run test-official-model-catalog-release-evidence'
))
assert.ok(!officialModelCatalogRelease.firstRead.some((item) =>
  item.path === 'package.json'
))

const officialModelCatalogPreparation = jsonRoute([
  '--task',
  'Prepare the public-only Official Model Catalog release input'
])
assert.equal(
  officialModelCatalogPreparation.routes[0].id,
  'official-model-catalog-release'
)
assert.ok(officialModelCatalogPreparation.firstRead.some((item) =>
  item.path ===
    'src/main/model-library-workspace/official-model-catalog-release-preparation.ts'
))
assert.ok(officialModelCatalogPreparation.firstRead.some((item) =>
  item.path === 'scripts/prepare-official-model-catalog-release-input.ts'
))
assert.ok(officialModelCatalogPreparation.validations.includes(
  'npm run test-official-model-catalog-release-preparation'
))
assert.ok(officialModelCatalogPreparation.validations.includes(
  'npm run test-official-model-catalog-release-preparation-cli'
))
assert.ok(!officialModelCatalogPreparation.firstRead.some((item) =>
  item.path === 'package.json'
))

for (const task of [
  'Move the model storage folder',
  'Migrate the model storage path while preserving rollback of the previous setting'
]) {
  assert.equal(jsonRoute(['--task', task]).routes[0].id, 'settings-paths')
}

const modelVerifiedBlobTracerZh = jsonRoute([
  '--task',
  '验证合成模型字节、模型制品存储事务与崩溃恢复'
])
assert.equal(modelVerifiedBlobTracerZh.routes[0].id, 'model-library-core')

const modelCatalogAdmission = jsonRoute(['--task', 'Validate signed Model Catalog and Manifest admission'])
assert.equal(modelCatalogAdmission.routes[0].id, 'model-library-core')
assert.ok(modelCatalogAdmission.firstRead.some((item) =>
  item.path === 'src/main/model-library/model-catalog-admission.tracer.ts'
))
assert.ok(modelCatalogAdmission.firstRead.some((item) =>
  item.path === 'src/main/model-library/model-catalog-admission.internal.ts'
))
assert.ok(
  modelCatalogAdmission.firstRead.some((item) =>
    item.path === 'scripts/model-library-catalog-admission.tracer.test.ts'
  ) || modelCatalogAdmission.deferred.context.some((item) =>
    item.path === 'scripts/model-library-catalog-admission.tracer.test.ts'
  )
)
assert.ok(!modelCatalogAdmission.firstRead.some((item) =>
  item.path === 'scripts/model-library-core-tracer.test.ts'
))
assert.ok(modelCatalogAdmission.validations.includes('npm run test-model-library-catalog-admission-tracer'))
assert.ok(modelCatalogAdmission.deferred.validations.includes('npm run test-model-library-core-governance'))
assert.ok(modelCatalogAdmission.warnings.some((warning) => /sequence floor and freshness clock/.test(warning)))

for (const task of [
  'Fix quantized weights readiness',
  'Fix model artifact validation, activation, quantization and AI Console progress',
  'Choose Q4_K_M for Qwen3-VL'
]) {
  const pack = jsonRoute(['--task', task])
  assert.ok(pack.firstRead.some((item) =>
    item.path === 'src/shared/workflows/model-artifact-readiness.workflow.ts'
  ), task)
}

const multiRouteDefault = jsonRoute(['--task', 'AI runtime package'])
assert.deepEqual(multiRouteDefault.routes.map((route) => route.id), ['runtime-package'])
assert.ok(multiRouteDefault.warnings.some((warning) => /Secondary route ai-runtime/.test(warning)))
const multiRouteExplicit = jsonRoute(['--task', 'AI runtime package', '--max-routes', '2'])
assert.deepEqual(multiRouteExplicit.routes.map((route) => route.id), ['runtime-package', 'ai-runtime'])

const trueDoubleActionDefault = jsonRoute([
  '--task',
  'Fix Settings path persistence while fixing release packaging'
])
assert.ok(trueDoubleActionDefault.warnings.some((warning) => /Secondary route settings-paths/.test(warning)))

const trueDoubleActionExplicit = jsonRoute([
  '--task',
  'Fix Settings path persistence while fixing release packaging',
  '--max-routes',
  '2',
  '--expand'
])
assert.deepEqual(
  trueDoubleActionExplicit.routes.map((route) => route.id),
  ['release-packaging', 'settings-paths']
)

const trueDoubleActionChinese = jsonRoute([
  '--task',
  '修复素材检索，同时修复网页下载重试',
  '--max-routes',
  '2',
  '--expand'
])
assert.deepEqual(
  trueDoubleActionChinese.routes.map((route) => route.id),
  ['asset-discovery', 'source-discovery']
)

const chineseDownloadedModelReadiness = jsonRoute([
  '--task',
  '修复下载好的模型未完成校验就显示可用'
])
assert.ok(chineseDownloadedModelReadiness.firstRead.some((item) =>
  item.path === 'src/shared/workflows/model-artifact-readiness.workflow.ts'
))

const unknown = jsonRoute(['--task', 'quantum payroll reconciliation'], 2)
assert.equal(unknown.error.code, 'NO_ROUTE')

const genericDescription = jsonRoute(['--task', '修复页面描述文案'], 2)
assert.equal(genericDescription.error.code, 'NO_ROUTE')

const huggingFaceDataset = jsonRoute(['--task', 'Download a HuggingFace dataset for evaluation'], 2)
assert.equal(huggingFaceDataset.error.code, 'NO_ROUTE')

const tinyBudget = jsonRoute(['--module', 'asset-lifecycle', '--budget', '100'], 2)
assert.equal(tinyBudget.error.code, 'BUDGET_UNSATISFIABLE')

const deterministicInput = {
  ...repositoryContext,
  root: ROOT,
  task: '素材库语义搜索命中说明',
  snapshot: FIXED_SNAPSHOT
}
assert.deepEqual(buildContextPack(deterministicInput), buildContextPack(deterministicInput))

const ambiguousCatalog = structuredClone(repositoryContext.catalog)
ambiguousCatalog.routes['asset-workspace'].aliases.push('ambiguous-token')
ambiguousCatalog.routes['asset-discovery'].aliases.push('ambiguous-token')
const ambiguous = buildContextPack({
  catalog: ambiguousCatalog,
  testsMap: repositoryContext.testsMap,
  root: ROOT,
  task: 'ambiguous-token',
  snapshot: FIXED_SNAPSHOT
})
assert.equal(ambiguous.ok, false)
assert.equal(ambiguous.error.code, 'AMBIGUOUS_ROUTE')

function catalogHealth(catalog, overrides = {}) {
  return validateCatalog({
    ...repositoryContext,
    catalog,
    root: ROOT,
    files: trackedFiles,
    untrackedFiles: [],
    ...overrides
  })
}

// TASK is optional for unrelated tasks; existing two-file catalogs stay valid.
for (const filesRead of [['AGENTS.md'], ['AGENTS.md', 'TASK.md']]) {
  const startupCatalog = structuredClone(repositoryContext.catalog)
  startupCatalog.current_context.files_read = filesRead
  assert.equal(catalogHealth(startupCatalog).ok, true)
}
for (const filesRead of [[], ['TASK.md'], ['TASK.md', 'AGENTS.md'], ['AGENTS.md', 'extra.md']]) {
  const startupCatalog = structuredClone(repositoryContext.catalog)
  startupCatalog.current_context.files_read = filesRead
  const health = catalogHealth(startupCatalog)
  assert.equal(health.ok, false)
  assert.ok(health.errors.some((finding) => finding.code === 'SCHEMA_VALIDATION'))
}

const malformedOwnsCatalog = structuredClone(repositoryContext.catalog)
malformedOwnsCatalog.modules.renderer.owns = 42
const malformedOwnsHealth = catalogHealth(malformedOwnsCatalog)
assert.equal(malformedOwnsHealth.ok, false)
assert.ok(malformedOwnsHealth.errors.some((finding) => finding.code === 'SCHEMA_VALIDATION'))

const missingAdrReasonCatalog = structuredClone(repositoryContext.catalog)
delete missingAdrReasonCatalog.routes['asset-lifecycle'].adrs[0].reason
const missingAdrReasonHealth = catalogHealth(missingAdrReasonCatalog)
assert.equal(missingAdrReasonHealth.ok, false)
assert.ok(missingAdrReasonHealth.errors.some((finding) => finding.code === 'SCHEMA_VALIDATION'))

const oversizedMetadataCatalog = structuredClone(repositoryContext.catalog)
oversizedMetadataCatalog.routes['asset-workspace'].warnings = ['x'.repeat(241)]
const oversizedMetadataHealth = catalogHealth(oversizedMetadataCatalog)
assert.equal(oversizedMetadataHealth.ok, false)
assert.ok(oversizedMetadataHealth.errors.some((finding) => finding.code === 'SCHEMA_VALIDATION'))

const tooManyRoutesCatalog = structuredClone(repositoryContext.catalog)
for (const suffix of ['a', 'b', 'c']) {
  tooManyRoutesCatalog.routes[`overflow-${suffix}`] = structuredClone(repositoryContext.catalog.routes['asset-workspace'])
}
const tooManyRoutesHealth = catalogHealth(tooManyRoutesCatalog)
assert.equal(tooManyRoutesHealth.ok, false)
assert.ok(tooManyRoutesHealth.errors.some((finding) => finding.code === 'SCHEMA_VALIDATION'))

const tooManyReadCandidates = structuredClone(repositoryContext.catalog)
tooManyReadCandidates.routes['asset-lifecycle'].read_first.push(
  structuredClone(repositoryContext.catalog.routes['asset-lifecycle'].read_first[0])
)
assert.equal(tooManyReadCandidates.routes['asset-lifecycle'].read_first.length, 14)
assert.ok(catalogHealth(tooManyReadCandidates).errors.some((finding) => finding.code === 'SCHEMA_VALIDATION'))

const missingPathCatalog = structuredClone(repositoryContext.catalog)
missingPathCatalog.routes['asset-discovery'].read_first[0].path = 'src/shared/workflows/missing.workflow.ts'
const missingPathHealth = catalogHealth(missingPathCatalog)
assert.equal(missingPathHealth.ok, false)
assert.ok(missingPathHealth.errors.some((finding) => finding.code === 'MISSING_PATH'))

const untrackedReferenceHealth = catalogHealth(repositoryContext.catalog, {
  files: trackedFiles.filter((repoPath) => repoPath !== 'src/shared/workflows/asset-discovery.workflow.ts')
})
assert.equal(untrackedReferenceHealth.ok, false)
assert.ok(untrackedReferenceHealth.errors.some((finding) => finding.code === 'UNTRACKED_CONTEXT_PATH'))

const untrackedSourceHealth = catalogHealth(repositoryContext.catalog, {
  untrackedFiles: ['src/main/untracked-helper.ts']
})
assert.equal(untrackedSourceHealth.ok, true)
assert.equal(untrackedSourceHealth.coverage.untrackedFirstPartySourceFiles, 1)
assert.ok(untrackedSourceHealth.warnings.some((finding) => finding.code === 'UNTRACKED_FIRST_PARTY_SOURCE'))

const duplicateCatalog = structuredClone(repositoryContext.catalog)
duplicateCatalog.modules.renderer.owns.push('src/shared/**')
const duplicateHealth = catalogHealth(duplicateCatalog)
assert.equal(duplicateHealth.ok, false)
assert.ok(duplicateHealth.errors.some((finding) => finding.code === 'DUPLICATE_OWNERSHIP'))

const unownedCatalog = structuredClone(repositoryContext.catalog)
unownedCatalog.modules.shared.owns = ['src/shared/does-not-exist/**']
const unownedHealth = catalogHealth(unownedCatalog)
assert.equal(unownedHealth.ok, false)
assert.ok(unownedHealth.errors.some((finding) => finding.code === 'UNOWNED_SOURCE'))

const protectedCatalog = structuredClone(repositoryContext.catalog)
protectedCatalog.routes['asset-workspace'].read_first[0].path = 'runtime-data/private.sqlite'
const protectedHealth = catalogHealth(protectedCatalog)
assert.equal(protectedHealth.ok, false)
assert.ok(protectedHealth.errors.some((finding) => finding.code === 'PROTECTED_CONTEXT_PATH'))

const protectedSuffixCatalog = structuredClone(repositoryContext.catalog)
protectedSuffixCatalog.routes['asset-workspace'].read_first[0].path = 'src/main/private.sqlite'
const protectedSuffixHealth = catalogHealth(protectedSuffixCatalog)
assert.equal(protectedSuffixHealth.ok, false)
assert.ok(protectedSuffixHealth.errors.some((finding) => finding.code === 'PROTECTED_CONTEXT_PATH'))

const invalidPathPolicyHealth = catalogHealth(repositoryContext.catalog, {
  pathPolicy: { ...repositoryContext.pathPolicy, blocking_suffixes: [] }
})
assert.equal(invalidPathPolicyHealth.ok, false)
assert.ok(invalidPathPolicyHealth.errors.some((finding) => finding.code === 'INVALID_PATH_POLICY'))

const weakenedPathPolicyHealth = catalogHealth(repositoryContext.catalog, {
  pathPolicy: {
    forbidden_directories: ['placeholder/'],
    context_protected_directories: ['placeholder/'],
    blocking_suffixes: ['.placeholder']
  }
})
assert.equal(weakenedPathPolicyHealth.ok, false)
assert.ok(weakenedPathPolicyHealth.errors.some((finding) => finding.code === 'WEAKENED_PATH_POLICY'))

const invalidCurrentCatalog = structuredClone(repositoryContext.catalog)
invalidCurrentCatalog.routes['asset-workspace'].states[0].evidence = ['scripts/asset-display-workflow.test.ts']
const invalidCurrentHealth = catalogHealth(invalidCurrentCatalog)
assert.equal(invalidCurrentHealth.ok, false)
assert.ok(invalidCurrentHealth.errors.some((finding) => finding.code === 'CURRENT_EVIDENCE_NOT_ROUTED'))

const invalidTracerCatalog = structuredClone(repositoryContext.catalog)
invalidTracerCatalog.routes['asset-lifecycle'].states[1].evidence = ['scripts/asset-trash-sqlite-persistence.test.ts']
const invalidTracerHealth = catalogHealth(invalidTracerCatalog)
assert.equal(invalidTracerHealth.ok, false)
assert.ok(invalidTracerHealth.errors.some((finding) => finding.code === 'TRACER_WITHOUT_SEAM'))

const unrelatedTracerTestCatalog = structuredClone(repositoryContext.catalog)
unrelatedTracerTestCatalog.routes['asset-lifecycle'].test_profiles = ['desktop_shell']
unrelatedTracerTestCatalog.routes['asset-lifecycle'].states[1].evidence = [
  'src/main/library-lifecycle/asset-trash.ts',
  'src/main/library-lifecycle/sqlite-asset-trash.adapter.ts',
  'scripts/app-navigation-workflow.test.ts'
]
const unrelatedTracerTestHealth = catalogHealth(unrelatedTracerTestCatalog)
assert.equal(unrelatedTracerTestHealth.ok, false)
assert.ok(unrelatedTracerTestHealth.errors.some((finding) => finding.code === 'TRACER_WITHOUT_EXECUTABLE_EVIDENCE'))

const npmAliasTestsMap = structuredClone(repositoryContext.testsMap)
npmAliasTestsMap.asset_discovery = ['npm run test-dangerous-runtime-db']
const npmAliasPackageJson = structuredClone(repositoryContext.packageJson)
npmAliasPackageJson.scripts['test-dangerous-runtime-db'] = 'python3 scripts/inspect_ram_db.py'
const npmAliasHealth = catalogHealth(repositoryContext.catalog, {
  testsMap: npmAliasTestsMap,
  packageJson: npmAliasPackageJson
})
assert.equal(npmAliasHealth.ok, false)
assert.ok(npmAliasHealth.errors.some((finding) => finding.code === 'UNSAFE_NPM_SCRIPT'))

const approvedPythonAliasTestsMap = structuredClone(repositoryContext.testsMap)
approvedPythonAliasTestsMap.asset_discovery = ['npm run test-forbidden-paths']
const approvedPythonAliasHealth = catalogHealth(repositoryContext.catalog, {
  testsMap: approvedPythonAliasTestsMap
})
assert.equal(approvedPythonAliasHealth.ok, true)

const approvedElectronNodeTestsMap = structuredClone(repositoryContext.testsMap)
approvedElectronNodeTestsMap.asset_discovery = ['npm run test-electron-native-fixture']
const approvedElectronNodePackageJson = structuredClone(repositoryContext.packageJson)
approvedElectronNodePackageJson.scripts['test-electron-native-fixture'] =
  'node scripts/run-electron-node-test.mjs scripts/asset-trash-sqlite-persistence.test.ts'
const approvedElectronNodeHealth = catalogHealth(repositoryContext.catalog, {
  testsMap: approvedElectronNodeTestsMap,
  packageJson: approvedElectronNodePackageJson
})
assert.equal(approvedElectronNodeHealth.ok, true)

const npmLifecycleTestsMap = structuredClone(repositoryContext.testsMap)
npmLifecycleTestsMap.asset_discovery = ['npm run test-safe-with-dangerous-prehook']
const npmLifecyclePackageJson = structuredClone(repositoryContext.packageJson)
npmLifecyclePackageJson.scripts['test-safe-with-dangerous-prehook'] =
  'node scripts/run-ts-test.mjs scripts/asset-discovery-workflow.test.ts'
npmLifecyclePackageJson.scripts['pretest-safe-with-dangerous-prehook'] =
  'python3 scripts/inspect_ram_db.py'
const npmLifecycleHealth = catalogHealth(repositoryContext.catalog, {
  testsMap: npmLifecycleTestsMap,
  packageJson: npmLifecyclePackageJson
})
assert.equal(npmLifecycleHealth.ok, false)
assert.ok(npmLifecycleHealth.errors.some((finding) => finding.code === 'UNSAFE_NPM_LIFECYCLE_HOOK'))

for (const unsafeCommand of [
  'npm run test-asset-discovery-workflow | echo unsafe',
  'npm run test-asset-discovery-workflow > output.txt',
  'npm run test-asset-discovery-workflow\necho unsafe',
  'npm run dist:mac',
  'python3 scripts/inspect_ram_db.py',
  'node scripts/run-electron-node-test.mjs src/main/index.ts',
  'scripts/asset-discovery-workflow.test.ts'
]) {
  const unsafeTestsMap = structuredClone(repositoryContext.testsMap)
  unsafeTestsMap.asset_discovery = [unsafeCommand]
  const unsafeCommandHealth = catalogHealth(repositoryContext.catalog, { testsMap: unsafeTestsMap })
  assert.equal(unsafeCommandHealth.ok, false, `Unsafe command was accepted: ${unsafeCommand}`)
  assert.ok(unsafeCommandHealth.errors.some((finding) =>
    ['UNSAFE_VALIDATION_COMMAND', 'UNSUPPORTED_VALIDATION_COMMAND'].includes(finding.code)
  ))
}

const serializedPacks = JSON.stringify([discovery, trash, capture, explicitRuntime])
for (const forbidden of [
  'src/main/extensions/photoshow/unpacked',
  'models_cache',
  'runtime-data',
  'dist-packages'
]) assert.ok(!serializedPacks.includes(forbidden), `Context packs must exclude ${forbidden}.`)

const fileCounts = routeEvalMetrics.map((metric) => metric.files)
const tokenCounts = routeEvalMetrics.map((metric) => metric.tokens)
console.log(
  `Agent Context Router tests passed (${routeEvalCases.length} route-eval tasks; ` +
  `${Math.min(...fileCounts)}-${Math.max(...fileCounts)} files; ` +
  `${Math.min(...tokenCounts)}-${Math.max(...tokenCounts)} estimated tokens).`
)
