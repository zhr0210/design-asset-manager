import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import {
  listNodeHostPlatformDefaults,
  resolveNodeElectronExecutableCandidates,
  resolveNodeHostPlatformDefaults
} from './node-host-platform-defaults.mjs'

assert.deepEqual(resolveNodeHostPlatformDefaults('win32'), {
  platform: 'win32',
  npmCommand: 'npm.cmd',
  pathExecutableExtensions: ['.exe', '.cmd', '.bat', ''],
  pythonUnitTestCandidates: [
    { command: 'py', args: ['-3'] },
    { command: 'python', args: [] },
    { command: 'python3', args: [] }
  ]
})
assert.deepEqual(resolveNodeHostPlatformDefaults('darwin'), {
  platform: 'darwin',
  npmCommand: 'npm',
  pathExecutableExtensions: [''],
  pythonUnitTestCandidates: [
    { command: 'python3', args: [] },
    { command: 'python', args: [] }
  ]
})
assert.deepEqual(resolveNodeHostPlatformDefaults('linux'), {
  platform: 'other',
  npmCommand: 'npm',
  pathExecutableExtensions: [''],
  pythonUnitTestCandidates: [
    { command: 'python3', args: [] },
    { command: 'python', args: [] }
  ]
})

const mutableDefaults = resolveNodeHostPlatformDefaults('win32')
mutableDefaults.pathExecutableExtensions.pop()
mutableDefaults.pythonUnitTestCandidates[0].args.pop()
mutableDefaults.pythonUnitTestCandidates.pop()
assert.deepEqual(
  resolveNodeHostPlatformDefaults('win32').pathExecutableExtensions,
  ['.exe', '.cmd', '.bat', '']
)
assert.deepEqual(resolveNodeHostPlatformDefaults('win32').pythonUnitTestCandidates, [
  { command: 'py', args: ['-3'] },
  { command: 'python', args: [] },
  { command: 'python3', args: [] }
])
assert.deepEqual(
  listNodeHostPlatformDefaults().map((defaults) => defaults.platform),
  ['win32', 'darwin', 'other']
)
assert.deepEqual(resolveNodeElectronExecutableCandidates('win32', '/repo'), [
  path.join('/repo', 'node_modules', 'electron', 'dist', 'electron.exe')
])
assert.deepEqual(resolveNodeElectronExecutableCandidates('darwin', '/repo'), [
  path.join('/repo', 'node_modules', 'electron', 'dist', 'Electron.app', 'Contents', 'MacOS', 'Electron')
])
assert.deepEqual(resolveNodeElectronExecutableCandidates('linux', '/repo'), [
  path.join('/repo', 'node_modules', 'electron', 'dist', 'electron')
])

const windowsCliDefaults = JSON.parse(execFileSync(
  process.execPath,
  ['scripts/node-host-platform-defaults.mjs', '--platform=win32'],
  { encoding: 'utf8' }
))
assert.equal(windowsCliDefaults.npmCommand, 'npm.cmd')
assert.deepEqual(windowsCliDefaults.pathExecutableExtensions, ['.exe', '.cmd', '.bat', ''])

for (const consumerPath of [
  'scripts/package-smoke-host-defaults.mjs',
  'scripts/verify-platform-common.mjs',
  'scripts/run-python-unittest.mjs',
  'scripts/run-text-color-tests.py',
  'scripts/ai-console-ui-smoke.mjs'
]) {
  const source = await fs.readFile(consumerPath, 'utf8')
  assert.match(source, /node-host-platform-defaults\.mjs/)
  assert.doesNotMatch(source, /process\.platform\s*(?:===|!==)\s*['"]win32['"]|sys\.platform\s*==\s*["']win32["']/)
}

const packageSmokeDefaultsSource = await fs.readFile('scripts/package-smoke-host-defaults.mjs', 'utf8')
assert.doesNotMatch(packageSmokeDefaultsSource, /npm\.cmd|\['\.exe', '\.cmd', '\.bat', ''\]/)

const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8')) as {
  scripts?: Record<string, string>
}
assert.equal(
  packageJson.scripts?.['test-node-host-platform-defaults'],
  'node scripts/run-ts-test.mjs scripts/node-host-platform-defaults.test.ts'
)
assert.match(packageJson.scripts?.['ci:governance'] ?? '', /test-node-host-platform-defaults/)

console.log('node-host-platform-defaults passed')
