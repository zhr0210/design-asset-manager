import assert from 'node:assert/strict'
import fs from 'node:fs/promises'

const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8')) as {
  scripts?: Record<string, string>
}
const smokeSource = await fs.readFile('scripts/ai-console-ui-smoke.mjs', 'utf8')

assert.equal(packageJson.scripts?.['smoke:ai-console-ui'], 'node scripts/ai-console-ui-smoke.mjs')
assert.equal(
  packageJson.scripts?.['test-ai-console-ui-smoke-contract'],
  'node scripts/run-ts-test.mjs scripts/ai-console-ui-smoke-contract.test.ts'
)

assert.match(smokeSource, /from 'playwright'/)
assert.match(smokeSource, /node-host-platform-defaults\.mjs/)
assert.match(smokeSource, /resolveNodeElectronExecutableCandidates\(process\.platform, repo\)/)
assert.match(smokeSource, /dist-temp', 'ai-console-ui-smoke'/)
assert.match(smokeSource, /dam-ai-console-smoke-/)
assert.match(smokeSource, /--user-data-dir=\$\{userData\}/)
assert.match(smokeSource, /location\.hash = '#\/ai-console'/)
assert.match(smokeSource, /getByTestId\('platform-ai-branch-status'\)/)
assert.match(smokeSource, /scrollWidth > document\.documentElement\.clientWidth/)
assert.match(smokeSource, /panel\.screenshot\(\{ path: screenshot \}\)/)
assert.match(smokeSource, /fs\.rm\(userData, \{ recursive: true, force: true \}\)/)
assert.match(smokeSource, /AI_CONSOLE_UI_SMOKE_SCREENSHOT/)
assert.match(smokeSource, /AI_CONSOLE_UI_SMOKE_OVERFLOW/)
assert.doesNotMatch(smokeSource, /USERPROFILE|Desktop|Downloads|Library\/Application Support/)
assert.doesNotMatch(smokeSource, /llamaRuntimeStartServer|probePythonCudaRuntime|probeOnnxModelLoad|macosAiInstallDeps/)
assert.doesNotMatch(smokeSource, /electron\.exe|Electron\.app|dist', 'electron'/)

console.log('ai-console-ui-smoke-contract passed')
