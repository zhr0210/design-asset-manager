import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const helperUrl = pathToFileURL(path.join(process.cwd(), 'scripts', 'electron-builder-runner-options.mjs')).href
const helper = await import(helperUrl) as {
  ELECTRON_BUILDER_RUNNER_PLATFORMS: string[]
  ELECTRON_BUILDER_RUNNER_MODES: string[]
  ELECTRON_BUILDER_SIGNING_MODES: string[]
  parseElectronBuilderRunnerOptions: (options: Record<string, string | undefined>) => {
    platform: string
    mode: string
    signing: string
  }
  getElectronBuilderPlatformOptions: (platform: string) => {
    builderFlag: string
    requiredSigningEnvKeys: string[]
    usesMacIdentity: boolean
  }
  listElectronBuilderSigningEnvKeys: () => string[]
}

assert.deepEqual(helper.ELECTRON_BUILDER_RUNNER_PLATFORMS, ['win', 'mac'])
assert.deepEqual(helper.ELECTRON_BUILDER_RUNNER_MODES, ['dir', 'dist'])
assert.deepEqual(helper.ELECTRON_BUILDER_SIGNING_MODES, ['disabled', 'required'])
assert.deepEqual(
  helper.parseElectronBuilderRunnerOptions({ platform: 'win', mode: 'dist' }),
  { platform: 'win', mode: 'dist', signing: 'disabled' }
)
assert.deepEqual(
  helper.parseElectronBuilderRunnerOptions({ platform: 'mac', mode: 'dir', signing: 'required' }),
  { platform: 'mac', mode: 'dir', signing: 'required' }
)
assert.deepEqual(helper.getElectronBuilderPlatformOptions('win'), {
  builderFlag: '--win',
  requiredSigningEnvKeys: ['CSC_LINK', 'CSC_KEY_PASSWORD'],
  usesMacIdentity: false
})
assert.deepEqual(helper.getElectronBuilderPlatformOptions('mac'), {
  builderFlag: '--mac',
  requiredSigningEnvKeys: [
    'CSC_LINK',
    'CSC_KEY_PASSWORD',
    'APPLE_ID',
    'APPLE_APP_SPECIFIC_PASSWORD',
    'APPLE_TEAM_ID',
    'DAM_MAC_SIGNING_IDENTITY'
  ],
  usesMacIdentity: true
})
assert.deepEqual(helper.listElectronBuilderSigningEnvKeys(), [
  'CSC_LINK',
  'CSC_NAME',
  'CSC_KEY_PASSWORD',
  'WIN_CSC_LINK',
  'WIN_CSC_NAME',
  'WIN_CSC_KEY_PASSWORD',
  'APPLE_ID',
  'APPLE_APP_SPECIFIC_PASSWORD',
  'APPLE_TEAM_ID',
  'DAM_MAC_SIGNING_IDENTITY'
])
assert.throws(
  () => helper.parseElectronBuilderRunnerOptions({ platform: 'linux', mode: 'dist' }),
  /--platform must be one of: win, mac/
)
assert.throws(
  () => helper.parseElectronBuilderRunnerOptions({ platform: 'win', mode: 'appimage' }),
  /--mode must be one of: dir, dist/
)
assert.throws(
  () => helper.parseElectronBuilderRunnerOptions({ platform: 'win', mode: 'dist', signing: 'maybe' }),
  /--signing must be one of: disabled, required/
)

const runnerSource = await fs.readFile('scripts/run-electron-builder.mjs', 'utf8')
assert.match(runnerSource, /electron-builder-runner-options\.mjs/)
assert.match(runnerSource, /platformOptions\.builderFlag/)
assert.match(runnerSource, /platformOptions\.usesMacIdentity/)
assert.doesNotMatch(runnerSource, /platform === 'win' \? '--win' : '--mac'/)
assert.doesNotMatch(runnerSource, /targetPlatform === 'win'\s*\?/)

const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8')) as {
  scripts?: Record<string, string>
}
assert.equal(
  packageJson.scripts?.['test-electron-builder-runner-options'],
  'node scripts/run-ts-test.mjs scripts/electron-builder-runner-options.test.ts'
)
assert.match(packageJson.scripts?.['ci:governance'] ?? '', /test-electron-builder-runner-options/)

console.log('electron-builder-runner-options passed')
