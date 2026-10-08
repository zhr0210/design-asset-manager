import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { createHash } from 'node:crypto'
import { test } from 'node:test'
import Database from 'better-sqlite3'
import { prepareWindowsBackupHelper, launchWindowsBackupHelper, inspectPreparedWindowsBackupHelper } from './fixtures/windows-backup-helper-process'
import {createVisualAdmission} from '../src/main/visual-ai/visual-admission'
import {prepareWindowsBackupLifecycle, WindowsBackupPhysicalExitUnconfirmedError} from '../src/main/platform/windows-backup-lifecycle.internal'

await test('helper runtime refuses before explicit build preparation', async () => {
  await assert.rejects(launchWindowsBackupHelper({ env: {} }), /NOT_PRECOMPILED/)
})
await prepareWindowsBackupHelper()
const compiled = inspectPreparedWindowsBackupHelper()
const hash = (value: Buffer) => createHash('sha256').update(value).digest('hex')
async function fixture() {
  const directory = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'dam-native-target-helper-')))
  const database = new Database(':memory:'); database.exec('CREATE TABLE owned_synthetic(value TEXT); INSERT INTO owned_synthetic VALUES(\'fixture\')')
  const image = database.serialize(); database.close()
  const environment = (mode: string, stress?: string) => ({ SystemRoot: process.env.SystemRoot ?? 'C:\\Windows', WINDIR: process.env.SystemRoot ?? 'C:\\Windows', TEMP: os.tmpdir(), TMP: os.tmpdir(), DAM_NATIVE_TARGET_DIRECTORY: directory, DAM_NATIVE_TARGET_DESTINATION: directory, DAM_NATIVE_TARGET_MODE: mode, DAM_BACKUP_HELPER_STRESS: stress })
  const close = async () => { assert.equal(path.dirname(directory), await fs.realpath(os.tmpdir())); assert.ok(path.basename(directory).startsWith('dam-native-target-helper-')); await fs.rm(directory, { recursive: true, force: true }) }
  return { directory, image, environment, close }
}
function sendImage(child: Awaited<ReturnType<typeof launchWindowsBackupHelper>>['child'], image: Buffer, end: boolean) {
  const length = Buffer.alloc(4); length.writeInt32LE(image.length); child.stdin.write(length); child.stdin.write(image); if (end) child.stdin.end()
}
await test('actual suspended launch failure retains native owner and shared ledger until Job is observed empty',async()=>{
  const f=await fixture(),admission=createVisualAdmission(),hold=admission.hold();let unknown:WindowsBackupPhysicalExitUnconfirmedError|undefined
  try{
    await assert.rejects(prepareWindowsBackupLifecycle({hold,imageBytes:f.image.length,signal:new AbortController().signal,
      readMemory:()=>({free:8*1024**3,total:16*1024**3}),createImage:()=>f.image,verifyImage:()=>{},runTarget:async()=>{
        try{await launchWindowsBackupHelper({env:f.environment('normal'),injectLaunchUnknown:true})}
        catch(error){assert.ok(error instanceof WindowsBackupPhysicalExitUnconfirmedError);unknown=error;throw error}
      }}),/PHYSICAL_EXIT_UNKNOWN_RETAINED/)
    assert.ok(unknown);assert.ok(admission.inspect().materialBytes>0)
    hold();assert.ok(admission.inspect().materialBytes>0)
    await unknown.released;await new Promise<void>(resolve=>setImmediate(resolve))
    assert.equal(admission.inspect().materialBytes,0);assert.deepEqual(await fs.readdir(f.directory),[])
  }finally{hold();await unknown?.released;await f.close()}
})

await test('normal helper proves complete launcher and target lifecycle with exact artifact identities', async context => {
  const fixtureOwned = await fixture()
  try {
    const launched = await launchWindowsBackupHelper({ env: fixtureOwned.environment('normal') })
    let output = ''; launched.child.stdout.on('data', bytes => { output += bytes })
    sendImage(launched.child, fixtureOwned.image, true)
    const receipt = await launched.completion, exited = await launched.physicalExit
    assert.equal(receipt.startupHardLimited, true); assert.equal(receipt.launcherTailUnmeasured, false)
    assert.equal(receipt.launcherExited, true); assert.equal(receipt.targetExited, true); assert.equal(receipt.jobEmpty, true); assert.equal(receipt.managedArtifactsPinned, true)
    assert.equal(receipt.commitHardLimited, true); assert.equal(receipt.rssHardLimited, false); assert.equal(receipt.rssEvidence, 'postexit-kernel-high-water')
    assert.equal(receipt.launcherPeakWorkingSet, exited.launcherPeakWorkingSet); assert.equal(receipt.launcherPeakCommit, exited.launcherPeakCommit)
    assert.equal(receipt.launcherSha256, compiled.launcherSha256); assert.equal(receipt.targetSha256, compiled.targetSha256); assert.equal(receipt.supervisorSha256, compiled.supervisor.artifactSha256)
    assert.equal(JSON.parse(output.trim()).Hash, hash(fixtureOwned.image)); context.diagnostic(JSON.stringify(receipt))
  } finally { await fixtureOwned.close() }
})

await test('actual startup exhaustion is bounded before nested Job assignment and performs no backup writes', async context => {
  const fixtureOwned = await fixture()
  try {
    const launched = await launchWindowsBackupHelper({ env: fixtureOwned.environment('normal', 'startup-memory-limit') })
    let output = ''; launched.child.stdout.on('data', bytes => { output += bytes }); launched.child.stdin.end()
    await assert.rejects(launched.completion, /TERMINATED_WITHOUT_RESOURCE_RECEIPT/)
    const exited = await launched.physicalExit
    assert.equal(exited.exitCode, 70); assert.equal(exited.jobEmpty, true); assert.equal(exited.killed, false); assert.equal(output.trim(), 'STARTUP_LIMIT_REACHED')
    assert.ok(exited.launcherPeakCommit > 96 * 1024 * 1024); assert.ok(exited.launcherPeakCommit <= exited.processLimit); assert.ok(exited.launcherPeakWorkingSet > 96 * 1024 * 1024)
    assert.ok(exited.jobPeakCommit <= exited.jobLimit); assert.deepEqual(await fs.readdir(fixtureOwned.directory), []); context.diagnostic(JSON.stringify(exited))
  } finally { await fixtureOwned.close() }
})

await test('tail exhaustion after old receipt measurement appears in actual exit kernel peaks', async context => {
  const fixtureOwned = await fixture()
  try {
    const launched = await launchWindowsBackupHelper({ env: fixtureOwned.environment('normal', 'tail-memory-limit') })
    let output = ''; launched.child.stdout.on('data', bytes => { output += bytes }); sendImage(launched.child, fixtureOwned.image, true)
    const receipt = await launched.completion
    assert.match(output, /TAIL_LIMIT_REACHED/); assert.equal(receipt.launcherTailUnmeasured, false)
    assert.ok(receipt.launcherPeakCommit > 96 * 1024 * 1024); assert.ok(receipt.launcherPeakWorkingSet > 96 * 1024 * 1024)
    assert.ok(receipt.launcherPeakCommit <= receipt.processLimit); assert.ok(receipt.targetPeakWorkingSet + receipt.launcherPeakWorkingSet <= receipt.jobLimit); context.diagnostic(JSON.stringify(receipt))
  } finally { await fixtureOwned.close() }
})

await test('non-reading child cannot block Host timeout; blocked pipe write settles before physical release', async context => {
  const fixtureOwned = await fixture()
  try {
    const launched = await launchWindowsBackupHelper({ env: fixtureOwned.environment('normal', 'never-read-input') })
    let output = '', writeSettled = false, timerRan = false
    launched.child.stdout.on('data', bytes => { output += bytes }); launched.child.stdin.on('error', () => {})
    const started = Date.now()
    // Larger than the owned pipe capacity; the target deliberately reads none.
    launched.child.stdin.write(Buffer.alloc(1024 * 1024, 1), () => { writeSettled = true })
    const timeout = setTimeout(() => { timerRan = true; launched.child.kill(); launched.child.stdin.destroy() }, 150)
    try {
      await assert.rejects(launched.completion, /TERMINATED_WITHOUT_RESOURCE_RECEIPT/)
      const exited = await launched.physicalExit
      assert.equal(timerRan, true); assert.equal(writeSettled, true); assert.equal(exited.jobEmpty, true); assert.equal(exited.killed, true)
      assert.match(output, /INPUT_NOT_READ/); assert.ok(Date.now() - started < 2000); assert.deepEqual(await fs.readdir(fixtureOwned.directory), [])
      context.diagnostic(JSON.stringify(exited))
    } finally { clearTimeout(timeout) }
  } finally { await fixtureOwned.close() }
})

await test('retained executable and ancestry refuse replacement while held; kill closes the entire Job before release', async context => {
  const fixtureOwned = await fixture()
  const artifactDirectory = path.dirname(compiled.launcher), renamedDirectory = artifactDirectory + '-owned-cut'
  try {
    const launched = await launchWindowsBackupHelper({ env: fixtureOwned.environment('hold') })
    let output = ''; launched.child.stdin.on('error', () => {})
    const held = new Promise<void>(resolve => launched.child.stdout.on('data', bytes => { output += bytes; if (/HELD [a-f0-9]{64}\r?\n/.test(output)) resolve() }))
    sendImage(launched.child, fixtureOwned.image, false); await held
    await assert.rejects(fs.rename(artifactDirectory, renamedDirectory), /EPERM|EBUSY|EACCES/)
    await assert.rejects(fs.writeFile(compiled.target, Buffer.from('owned substitution')), /EPERM|EBUSY|EACCES/)
    await assert.rejects(fs.writeFile(compiled.supervisor.path, Buffer.from('owned Host substitution')), /EPERM|EBUSY|EACCES/)
    assert.equal(launched.child.kill(), true); launched.child.stdin.destroy()
    await assert.rejects(launched.completion, /TERMINATED_WITHOUT_RESOURCE_RECEIPT/)
    const exited = await launched.physicalExit; assert.equal(exited.jobEmpty, true); assert.equal(exited.killed, true)
    await fs.rename(artifactDirectory, renamedDirectory); await fs.rename(renamedDirectory, artifactDirectory)
    await fs.rename(path.join(fixtureOwned.directory, 'schema-backups'), path.join(fixtureOwned.directory, 'owned-released-backups'))
    assert.equal(hash(await fs.readFile(compiled.target)), compiled.targetSha256); context.diagnostic(JSON.stringify(exited))
  } finally { await fixtureOwned.close() }
})

await test('same-byte executable hardlink is refused by single-link native pin', async () => {
  const fixtureOwned = await fixture(), link = compiled.target + '.owned-link'
  try {
    await fs.link(compiled.target, link)
    await assert.rejects(launchWindowsBackupHelper({ env: fixtureOwned.environment('normal') }), /ARTIFACT_KIND_REFUSED/)
    assert.deepEqual(await fs.readdir(fixtureOwned.directory), [])
  } finally { await fs.unlink(link); await fixtureOwned.close() }
})

await test('same-byte executable ancestry junction substitution is refused before helper creation', async () => {
  const fixtureOwned = await fixture(), directory = path.dirname(compiled.target), saved = directory + '-owned-junction-cut'
  let moved = false, junction = false
  try {
    assert.equal(path.dirname(directory), await fs.realpath(os.tmpdir())); assert.ok(path.basename(directory).startsWith('dam-backup-helper-build-'))
    await fs.rename(directory, saved); moved = true
    await fs.symlink(saved, directory, 'junction'); junction = true
    await assert.rejects(launchWindowsBackupHelper({ env: fixtureOwned.environment('normal') }), /ARTIFACT_COMPONENT_OPEN_REFUSED|ARTIFACT_KIND_REFUSED/)
    assert.deepEqual(await fs.readdir(fixtureOwned.directory), [])
  } finally {
    // Windows directory junctions require rmdir, which removes the link itself.
    // Never recurse into the saved compiler output through the junction.
    if (junction) {
      assert.equal((await fs.lstat(directory)).isSymbolicLink(), true)
      assert.equal(path.resolve(await fs.readlink(directory)), path.resolve(saved))
      await fs.rmdir(directory)
    }
    if (moved) await fs.rename(saved, directory)
    await fixtureOwned.close()
  }
})
