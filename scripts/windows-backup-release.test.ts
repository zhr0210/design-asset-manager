import assert from 'node:assert/strict'
import {test} from 'node:test'
import path from 'node:path'
import os from 'node:os'
import {execFile} from 'node:child_process'
import {promisify} from 'node:util'
import {prepareWindowsBackupMetadataProbe} from './fixtures/windows-backup-metadata-probe'
import {observeWindowsBackupImmediateRelease, prepareWindowsBackupReleaseDiagnostic, observeWindowsBackupOwnHandlePositiveControl, observeWindowsBackupObserverFault, type ReleaseDiagnosticMode} from './fixtures/windows-backup-release-diagnostic'

const run = promisify(execFile)
const observerFault = process.env.DAM_OWNED_RELEASE_OBSERVER_FAULT
if (observerFault !== undefined && observerFault !== 'throw' && observerFault !== 'thenable') throw Error('RELEASE_OBSERVER_FAULT_REFUSED')

const prepared = await prepareWindowsBackupMetadataProbe()
console.log(JSON.stringify({releaseDiagnosticPreparation: {artifactSha256: prepared.artifact.artifactSha256, sourceSha256: prepared.artifact.sourceSha256, compilerSha256: prepared.artifact.compilerSha256, loadReceipt: prepared.loadReceipt, productionQualified: false}}))
const mode = process.env.DAM_OWNED_RELEASE_DIAGNOSTIC_MODE
if (mode !== undefined && mode !== 'guardian-wait' && mode !== 'native-first-move') throw Error('RELEASE_DIAGNOSTIC_MODE_REFUSED')
if (mode || observerFault) {
  console.log(JSON.stringify({releaseNativeDiagnosticPreparation: await prepareWindowsBackupReleaseDiagnostic()}))
  if (!observerFault) await test('private release observer exact current-Host name snapshot has held/closed positive controls', async () => {
    console.log(JSON.stringify({releaseNativeDiagnosticControl: await observeWindowsBackupOwnHandlePositiveControl()}))
  })
}

if (observerFault) await test(`private ${observerFault} observer fault retains UNKNOWN after kernel guardian exit`, async () => {
  console.log(JSON.stringify({releaseObserverFault: await observeWindowsBackupObserverFault(observerFault)}))
})
else {
for (const access of ['read-write', 'delete'] as const) await test(`fresh owned ${access} guardian refusal releases before each first immediate rename`, async () => {
  const failed: {sample: number; error: unknown}[] = []
  for (let sample = 0; sample < 12; sample++) {
    const observation = await observeWindowsBackupImmediateRelease({access, sample, diagnosticMode: mode as ReleaseDiagnosticMode | undefined})
    console.log(JSON.stringify({releaseDiagnostic: observation}))
    if (!observation.immediateRename.succeeded) failed.push({sample, error: observation.immediateRename.error})
  }
  assert.deepEqual(failed, [], 'Every first rename must succeed; observations retain failures without rename retry.')
})

if (!mode) for (const fault of ['throw', 'thenable'] as const) await test(`observer ${fault} fault cleans its owned PROCESS once and blocks subsequent preparation in isolated Host`, async () => {
  const result = await run(process.execPath, [path.resolve('scripts/run-ts-test.mjs'), 'scripts/windows-backup-release.test.ts'], {
    cwd: path.resolve('.'), windowsHide: true, timeout: 60000, maxBuffer: 65536,
    env: {SystemRoot: 'C:\\Windows', WINDIR: 'C:\\Windows', TEMP: os.tmpdir(), TMP: os.tmpdir(), LOCALAPPDATA: process.env.LOCALAPPDATA ?? '', ELECTRON_RUN_AS_NODE: '1', DAM_OWNED_RELEASE_OBSERVER_FAULT: fault}
  })
  assert.equal(result.stderr, '')
  const line = result.stdout.split(/\r?\n/).find(value => value.startsWith('{"releaseObserverFault":'))
  assert.ok(line)
  const observation = JSON.parse(line).releaseObserverFault
  assert.equal(observation.fault, fault); assert.equal(observation.loaderCalled, false)
  assert.equal(observation.guardian.kernelSignaled, true); assert.equal(observation.retained, true)
  assert.equal(observation.nextPreparation, 'REFUSED')
  console.log(JSON.stringify({releaseObserverFaultIsolatedHost: observation}))
})
}
