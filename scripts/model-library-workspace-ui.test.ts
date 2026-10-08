import assert from 'node:assert/strict'
import fs from 'node:fs/promises'

const pageSource = await fs.readFile(
  'src/renderer/routes/ModelLibraryPage.tsx',
  'utf8'
)
const adapterSource = await fs.readFile(
  'src/renderer/modules/model-library-workspace/electron-model-library-workspace.adapter.ts',
  'utf8'
)
const appSource = await fs.readFile('src/renderer/App.tsx', 'utf8')
const preloadSource = await fs.readFile('src/preload/index.ts', 'utf8')
const clientSource = await fs.readFile('src/shared/client/workspace-client.ts', 'utf8')
const aiWorkspaceSource = await fs.readFile('src/renderer/routes/AiWorkspace.tsx', 'utf8')
const aiConsoleSource = await fs.readFile(
  'src/renderer/routes/AiConsolePage.tsx',
  'utf8'
)
const statusCardSource = await fs.readFile(
  'src/renderer/components/ai/ModelLibraryStatusCard.tsx',
  'utf8'
)

assert.match(pageSource, /createElectronModelLibraryWorkspaceModule/)
assert.match(pageSource, /loadPage/)
assert.match(pageSource, /Official Catalog/)
assert.match(pageSource, /未包含可验证的官方模型目录/)
assert.match(pageSource, /模型存储尚未设置/)
assert.match(pageSource, /projectModelStorageCondition/)
assert.match(pageSource, /storagePresentation\.tone === 'positive'/)
assert.match(pageSource, /使用推荐位置/)
assert.match(pageSource, /选择其他位置/)
assert.doesNotMatch(
  pageSource,
  /downloadModel|installModel|deleteModel|activateModel|startInference|CHANNEL_.*(?:DOWNLOAD|INSTALL)/i
)
assert.doesNotMatch(pageSource, /modelRootDir|settingsSelectFolder|filePath|defaultPath/)

assert.match(adapterSource, /modelLibraryWorkspace/)
assert.match(adapterSource, /summarize/)
assert.match(adapterSource, /configureStorage/)
assert.doesNotMatch(adapterSource, /settingsSelectFolder|modelRootDir/)

assert.match(appSource, /ModelLibraryPage/)
assert.match(appSource, /'model-library': <AiConsolePage/)
assert.match(aiConsoleSource, /export \{default\} from ['"]\.\/AiWorkspace['"]/)
assert.match(aiWorkspaceSource, /id==='model-library'/)
assert.match(aiWorkspaceSource, /<OcrEnvironmentSettings\/><ModelLibraryPage\/>/)
assert.match(preloadSource, /createWorkspaceClient\(/)
assert.match(preloadSource, /exposeInMainWorld\(['"]damClient['"], client\)/)
assert.match(clientSource, /modelLibraryWorkspace:/)
assert.match(adapterSource, /return getWorkspaceClient\(\) \?\? null/)

assert.match(aiWorkspaceSource, /appPath\(route\)/)
assert.match(aiWorkspaceSource, /本地模型与 OCR/)
assert.match(statusCardSource, /loadAiConsoleSummary/)
assert.match(statusCardSource, /createElectronModelLibraryWorkspaceModule/)
assert.match(statusCardSource, /APP_MODEL_LIBRARY_ROUTE\.path/)
assert.doesNotMatch(statusCardSource, /to="\/model-library"/)
assert.doesNotMatch(statusCardSource, /configureStorage|review-|confirm-/)

console.log('model-library-workspace-ui passed')
