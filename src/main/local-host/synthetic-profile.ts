import fs from 'node:fs'
import path from 'node:path'
import type { AppSettings } from '../../shared/types/settings.types'
import type { readSyntheticFixtures } from './synthetic-fixtures'

interface Configuration {
  rootDirectory: string
  profileDirectory: string
  libraryDirectory: string
}

/** Test profile is a Host boundary, independent of Renderer network restrictions. */
export function createSyntheticSettingsService(configuration: Configuration, fixtures?: ReturnType<typeof readSyntheticFixtures>) {
  const root = fs.realpathSync(configuration.rootDirectory)
  const file = path.join(configuration.profileDirectory, 'settings.json')
  const requirePath = (value: unknown): void => {
    if (value === undefined || value === null || value === '') return
    if (typeof value !== 'string' || !path.isAbsolute(value)) throw Error('SYNTHETIC_SCOPE_DENIED')
    const resolved = path.resolve(value)
    const inside = (candidate: string) => {
      const relative = path.relative(root, candidate)
      return !relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative)
    }
    if (!inside(resolved)) throw Error('SYNTHETIC_SCOPE_DENIED')
    let ancestor = resolved
    while (!fs.existsSync(ancestor)) {
      const parent = path.dirname(ancestor)
      if (parent === ancestor) throw Error('SYNTHETIC_SCOPE_DENIED')
      ancestor = parent
    }
    if (!inside(fs.realpathSync(ancestor))) throw Error('SYNTHETIC_SCOPE_DENIED')
    let current = root
    for (const part of path.relative(root, ancestor).split(path.sep).filter(Boolean)) {
      current = path.join(current, part)
      if (fs.lstatSync(current).isSymbolicLink()) throw Error('SYNTHETIC_SCOPE_DENIED')
    }
  }
  const validate = (patch: Partial<AppSettings>) => {
    for (const key of ['libraryPath', 'modelRootDir', 'selectedPromptModelPath'] as const) requirePath(patch[key])
    for (const value of Object.values(patch.managedPaths ?? {})) requirePath(value)
    if (patch.autoInstallAllowed || patch.aiRuntimeSettings || patch.cachedOcrEnvStatus) throw Error('SYNTHETIC_EXECUTION_DENIED')
    // No model/provider fixture is registered in this launch. Even arbitrary loopback services are private data.
    for (const backend of patch.aiBackends ?? []) if (backend.enabled) { if (!fixtures) throw Error('SYNTHETIC_ENDPOINT_DENIED'); fixtures.assertBackend(backend) }
  }
  let settings: AppSettings = {
    libraryPath: configuration.libraryDirectory, concurrency: 1, delayInterval: 0,
    saveOriginalUrl: false, autoThumbnail: true, enableTextColorPalette: false,
    textDetectionProvider: 'none', textDetectionTimeoutMs: 1000, maxTextBoxes: 0,
    minTextBoxConfidence: 1, enableTextColorAnalysis: false, textBoxProvider: 'none',
    ocrTimeoutMs: 1000, maxTextBoxesPerImage: 0, autoInstallAllowed: false,
    modelRootDir: path.join(configuration.profileDirectory, 'disabled-models'),
    selectedPromptModelId: null, selectedPromptModelPath: null, aiBackends: [], promptReverseTemplates: []
  }
  requirePath(file)
  if (fs.existsSync(file)) {
    const loaded = JSON.parse(fs.readFileSync(file, 'utf8'))
    validate(loaded)
    settings = { ...settings, ...loaded }
  }
  return Object.freeze({
    getSettings: () => structuredClone(settings),
    saveSettings(patch: Partial<AppSettings>) {
      validate(patch)
      const next = { ...settings, ...patch }
      const temporary = `${file}.pending`
      requirePath(temporary)
      fs.writeFileSync(temporary, JSON.stringify(next), { flag: 'w' })
      fs.renameSync(temporary, file)
      settings = next
      return structuredClone(settings)
    }
  })
}

export function requireSyntheticCommand(command: string, fixtures?: ReturnType<typeof readSyntheticFixtures>): void {
  const prohibited = new Set([
    'ai-connection:login', 'ai-connection:open-auth-url', 'ai-connection:confirm-validation',
    'ai-backend:health-check', 'ai-backend:list-models', 'ai-acceptance:run', 'ai-acceptance:confirm', 'ai-connection:models',
    'visual-ai:run', 'tag-execution:run', 'tag-batch:run', 'background-analysis:run', 'background-ocr:confirm',
    'download:prepare', 'download:enqueue', 'download:retry', 'asset-ocr:configure', 'asset-ocr:run'
  ])
  if (prohibited.has(command) && !fixtures?.permits(command)) throw Error('SYNTHETIC_EXECUTION_DENIED')
}
