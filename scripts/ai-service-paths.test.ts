import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { resolveAiServicePath, resolveAiServiceRoot } from '../src/main/services/ai-service-paths'

const packagedResources = path.resolve('/Applications/Design Asset Manager.app/Contents/Resources')
const packagedAiService = path.join(packagedResources, 'ai-service')

assert.equal(
  resolveAiServiceRoot({
    cwd: '/',
    resourcesPath: packagedResources,
    isPackaged: true,
    existsSync: (candidate) => candidate === packagedAiService
  }),
  packagedAiService
)

assert.equal(
  resolveAiServicePath(['prompt_workers', 'qwen3vl_prompt_worker.py'], {
    cwd: '/',
    resourcesPath: packagedResources,
    isPackaged: true,
    existsSync: (candidate) => candidate === packagedAiService
  }),
  path.join(packagedAiService, 'prompt_workers', 'qwen3vl_prompt_worker.py')
)

assert.equal(
  resolveAiServiceRoot({
    cwd: '/repo',
    resourcesPath: '/missing/Resources',
    isPackaged: false,
    existsSync: (candidate) => candidate === '/repo/ai-service'
  }),
  '/repo/ai-service'
)

const guardedSources = [
  'src/main/services/ai-worker/providers/qwen3vl-prompt.provider.ts',
  'src/main/services/ai-worker/ai-gpu-monitor.service.ts',
  'src/main/services/ai-worker/ai-memory-guard.service.ts',
  'src/main/services/ai-models/ai-model-download.service.ts',
  'src/main/ipc/ai-model.ipc.ts',
  'src/main/services/text-detection/easyocr-text-box-provider.ts',
  'src/main/services/ocr-dependency.service.ts'
]

for (const sourcePath of guardedSources) {
  const source = await fs.readFile(sourcePath, 'utf8')
  assert.doesNotMatch(
    source,
    /process\.cwd\(\)[\s\S]{0,80}ai-service|ai-service[\s\S]{0,80}process\.cwd\(\)/,
    `${sourcePath} should use resolveAiServicePath for packaged ai-service resources`
  )
}
