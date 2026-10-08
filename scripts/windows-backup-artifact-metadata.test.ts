import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {createHash} from 'node:crypto'
import {test} from 'node:test'
import Database from 'better-sqlite3'
import {buildWindowsQualificationNative} from './fixtures/windows-native-qualification-build'
import {withGuardedWindowsNativeArtifact} from './fixtures/windows-backup-native-load'
import {prepareWindowsBackupHelper, getPreparedWindowsBackupNativeLoader, inspectPreparedWindowsBackupHelper, launchWindowsBackupHelper} from './fixtures/windows-backup-helper-process'
import {prepareWindowsBackupMetadataProbe, openWindowsBackupMetadataProbe, type WindowsBackupMetadataProbe} from './fixtures/windows-backup-metadata-probe'

const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex')
await prepareWindowsBackupHelper()
const preparedProbe = await prepareWindowsBackupMetadataProbe()
console.log(JSON.stringify({artifactMetadataProbePreparation: {artifact: {artifactSha256: preparedProbe.artifact.artifactSha256, sourceSha256: preparedProbe.artifact.sourceSha256, compilerSha256: preparedProbe.artifact.compilerSha256}, loadReceipt: preparedProbe.loadReceipt, productionQualified: false}}))
const native = getPreparedWindowsBackupNativeLoader()
const buildDll = () => buildWindowsQualificationNative({
  sourcePath: path.resolve('scripts/fixtures/windows-backup-vfs-extension.c'),
  outputName: 'metadata-guarded-vfs.dll', libraries: ['bcrypt.lib'],
  includeDirectories: [path.resolve('node_modules/better-sqlite3/deps/sqlite3')]
})
function observe(scenario: string, result: unknown) {
  console.log(JSON.stringify({artifactMetadata: {scenario, result, namespaceMetadataQualified: false, productionQualified: false}}))
}

for (const access of ['read-write', 'delete'] as const) await test(`DLL existing ${access} handle refuses first pin before loader`, async () => {
  const artifact = await buildDll(), root = path.dirname(artifact.path)
  const opened = openWindowsBackupMetadataProbe({root, target: artifact.path, access})
  assert.equal(opened.opened, true); const held = opened.session!
  let called = false
  try {
    await assert.rejects(withGuardedWindowsNativeArtifact(artifact, {load: () => {called = true}}), /GUARDIAN_NT_OPEN_REFUSED/)
    assert.equal(called, false)
    observe(`DLL-preexisting-${access}`, {opened: true, loadCalled: false, classification: 'blocked-by-sharing-before-ready', snapshot: held.snapshot()})
  } finally {held.close()}
  const saved = root + '-owned-released'
  await fs.rename(root, saved); await fs.rename(saved, root)
  assert.equal(sha(await fs.readFile(artifact.path)), artifact.artifactSha256)
})

await test('DLL existing attribute handle can set sparse while pinned, and independent Host recheck refuses loader', async () => {
  const artifact = await buildDll(), opened = openWindowsBackupMetadataProbe({root: path.dirname(artifact.path), target: artifact.path, access: 'attributes'})
  assert.equal(opened.opened, true); const held = opened.session!
  let extensionLoaded = false
  const db = new Database(':memory:')
  try {
    await assert.rejects(withGuardedWindowsNativeArtifact(artifact, {
      afterPin: () => {
        const result = held.attempt({operation: 'set-sparse', enabled: true})
        assert.equal(result.succeeded, true); assert.ok(result.after.attributes & 0x200)
        observe('DLL-postpin-existing-attributes-sparse', {...result, classification: 'mutation-not-prevented'})
      },
      load: pin => {
        native.verifyTransferredPins(pin.hostPins, artifact.artifactSha256)
        db.loadExtension(artifact.path, 'sqlite3_damvfspin_init'); extensionLoaded = true
      }, closeTransferredHandles: handles => native.closeTransferredHandles(handles)
    }), /LOAD_PIN_IDENTITY_MISMATCH/)
    assert.equal(extensionLoaded, false)
    assert.equal(sha(await fs.readFile(artifact.path)), artifact.artifactSha256)
    observe('DLL-postpin-sparse-qualification', {extensionLoaded, classification: 'detected-before-load', bytesUnchanged: true})
  } finally {
    assert.equal(held.attempt({operation: 'set-sparse', enabled: false}).succeeded, true)
    held.close(); db.close()
  }
})

await test('DLL metadata changed by the actual loader callback is refused after load, not prevented', async () => {
  const artifact = await buildDll(), db = new Database(':memory:')
  let held: WindowsBackupMetadataProbe | undefined, extensionLoaded = false
  try {
    const opened = openWindowsBackupMetadataProbe({root: path.dirname(artifact.path), target: artifact.path, access: 'attributes'})
    assert.equal(opened.opened, true); held = opened.session!
    await assert.rejects(withGuardedWindowsNativeArtifact(artifact, {
      load: pin => {
        native.verifyTransferredPins(pin.hostPins, artifact.artifactSha256)
        db.loadExtension(artifact.path, 'sqlite3_damvfspin_init'); extensionLoaded = true
        const mutation = held!.attempt({operation: 'set-attributes'})
        assert.equal(mutation.succeeded, true)
        observe('DLL-load-then-metadata-mutation', {...mutation, extensionLoaded, classification: 'known-counterexample-to-prevention'})
      }, closeTransferredHandles: handles => native.closeTransferredHandles(handles)
    }), /GUARDIAN_FINISH_REFUSED/)
    assert.equal(extensionLoaded, true)
    assert.equal(db.prepare("SELECT name FROM pragma_function_list WHERE name='dam_windows_backup_vfs'").pluck().get(), 'dam_windows_backup_vfs')
    assert.equal(sha(await fs.readFile(artifact.path)), artifact.artifactSha256)
  } finally {held?.close(); db.close()}
})

await test('DLL timestamp mutation preserves exact bytes and is allowed non-content metadata under limited guard receipt', async () => {
  const artifact = await buildDll(), db = new Database(':memory:')
  const opened = openWindowsBackupMetadataProbe({root: path.dirname(artifact.path), target: artifact.path, access: 'attributes'})
  assert.equal(opened.opened, true); const held = opened.session!
  try {
    const guarded = await withGuardedWindowsNativeArtifact(artifact, {
      afterPin: () => {
        const result = held.attempt({operation: 'set-time'})
        assert.equal(result.succeeded, true)
        observe('DLL-postpin-timestamp', {...result, classification: 'allowed-non-content-metadata'})
      }, load: pin => {native.verifyTransferredPins(pin.hostPins, artifact.artifactSha256); db.loadExtension(artifact.path, 'sqlite3_damvfspin_init')},
      closeTransferredHandles: handles => native.closeTransferredHandles(handles)
    })
    assert.equal(guarded.receipt.namespaceMetadataQualified, false)
    assert.equal(guarded.receipt.productionBootstrapQualified, false)
    assert.equal(sha(await fs.readFile(artifact.path)), artifact.artifactSha256)
  } finally {held.close(); db.close()}
})

await test('DLL late pathname hardlink is refused by current pin sharing; unpinned control succeeds', async () => {
  const artifact = await buildDll(), link = artifact.path + '.owned-link'
  let linked = false
  try {
    const guarded = await withGuardedWindowsNativeArtifact(artifact, {
      afterPin: async () => {await assert.rejects(fs.link(artifact.path, link), {code: 'EBUSY'})},
      load: pin => native.verifyTransferredPins(pin.hostPins, artifact.artifactSha256),
      closeTransferredHandles: handles => native.closeTransferredHandles(handles)
    })
    assert.equal(guarded.receipt.namespaceMetadataQualified, false)
    assert.equal((await fs.stat(artifact.path)).nlink, 1)
    await fs.link(artifact.path, link); linked = true
    assert.equal(sha(await fs.readFile(link)), artifact.artifactSha256)
    assert.equal((await fs.stat(artifact.path)).nlink, 2)
    observe('DLL-late-path-hardlink', {pinnedError: 'EBUSY', unpinnedLinkSucceeded: true, classification: 'blocked-for-current-pathname-access-tuple'})
  } finally {if (linked) await fs.unlink(link)}
})

await test('pinned DLL attribute-only FSCTLs retain exact access errors, without treating them as all-FSCTL protection', async () => {
  const artifact = await buildDll(), opened = openWindowsBackupMetadataProbe({root: path.dirname(artifact.path), target: artifact.path, access: 'attributes'})
  assert.equal(opened.opened, true); const held = opened.session!
  try {
    const guarded = await withGuardedWindowsNativeArtifact(artifact, {
      afterPin: () => {
        for (const operation of ['set-compression', 'zero-data'] as const) {
          const result = held.attempt({operation})
          assert.equal(result.succeeded, false); assert.notEqual(result.win32Error, 0)
          observe('DLL-attribute-only-' + operation, {...result, classification: 'blocked-by-requested-access-tuple'})
        }
      }, load: pin => native.verifyTransferredPins(pin.hostPins, artifact.artifactSha256),
      closeTransferredHandles: handles => native.closeTransferredHandles(handles)
    })
    assert.equal(guarded.receipt.namespaceMetadataQualified, false)
    assert.equal(sha(await fs.readFile(artifact.path)), artifact.artifactSha256)
  } finally {held.close()}
})

async function helperFixture() {
  const temporary = await fs.realpath(os.tmpdir())
  const root = await fs.realpath(await fs.mkdtemp(path.join(temporary, 'dam-native-target-artifact-metadata-')))
  const db = new Database(':memory:'); db.exec('CREATE TABLE synthetic(value TEXT); INSERT INTO synthetic VALUES(\'owned\')')
  const image = db.serialize(); db.close()
  const env = {SystemRoot: process.env.SystemRoot ?? 'C:\\Windows', WINDIR: process.env.SystemRoot ?? 'C:\\Windows', TEMP: os.tmpdir(), TMP: os.tmpdir(), DAM_NATIVE_TARGET_DIRECTORY: root, DAM_NATIVE_TARGET_DESTINATION: root, DAM_NATIVE_TARGET_MODE: 'hold'}
  return {root, image, env, close: async () => {
    assert.equal(path.dirname(root), temporary); assert.ok(path.basename(root).startsWith('dam-native-target-artifact-metadata-'))
    await fs.rm(root, {recursive: true, force: true, maxRetries: 5, retryDelay: 100})
  }}
}

for (const access of ['read-write', 'delete'] as const) await test(`managed target existing ${access} handle refuses before helper creation`, async () => {
  const f = await helperFixture(), prepared = inspectPreparedWindowsBackupHelper()
  const opened = openWindowsBackupMetadataProbe({root: path.dirname(prepared.target), target: prepared.target, access})
  assert.equal(opened.opened, true); const held = opened.session!
  try {
    await assert.rejects(launchWindowsBackupHelper({env: f.env}), /ARTIFACT_COMPONENT_OPEN_REFUSED/)
    assert.deepEqual(await fs.readdir(f.root), [])
    observe('managed-target-preexisting-' + access, {opened: true, classification: 'blocked-before-process-creation', snapshot: held.snapshot()})
  } finally {held.close(); await f.close()}
})

await test('managed target existing attributes mutate during actual held process; pinned is not full executable qualification', async () => {
  const f = await helperFixture(), prepared = inspectPreparedWindowsBackupHelper()
  const opened = openWindowsBackupMetadataProbe({root: path.dirname(prepared.target), target: prepared.target, access: 'attributes'})
  assert.equal(opened.opened, true); const held = opened.session!
  let launch: Awaited<ReturnType<typeof launchWindowsBackupHelper>> | undefined
  let finished = false
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    launch = await launchWindowsBackupHelper({env: f.env})
    launch.child.stdin.on('error', () => {})
    let rejectTimeout!: (reason: Error) => void
    const timeout = new Promise<never>((_resolve, reject) => {rejectTimeout = reject})
    timer = setTimeout(() => rejectTimeout(Error('OWNED_METADATA_HELPER_HELD_TIMEOUT')), 5000)
    let output = ''
    const ready = new Promise<void>(resolve => launch.child.stdout.on('data', bytes => {output += bytes; if (/HELD [a-f0-9]{64}\r?\n/.test(output)) resolve()}))
    const length = Buffer.alloc(4); length.writeInt32LE(f.image.length)
    launch.child.stdin.write(length); launch.child.stdin.write(f.image)
    await Promise.race([ready, timeout, launch.physicalExit.then(() => {throw Error('OWNED_METADATA_HELPER_EXIT_BEFORE_HELD')})])
    const sparse = held.attempt({operation: 'set-sparse', enabled: true})
    const timestamp = held.attempt({operation: 'set-time'})
    assert.equal(sparse.succeeded, true); assert.equal(timestamp.succeeded, true)
    assert.equal(sha(await fs.readFile(prepared.target)), prepared.targetSha256)
    observe('managed-target-live-metadata', {sparse, timestamp, classification: 'known-counterexample-to-metadata-exclusion', bytesUnchanged: true})
    launch.child.stdin.write(Buffer.from([1])); launch.child.stdin.end()
    const receipt = await launch.completion
    assert.equal(receipt.managedArtifactsPinned, true)
    assert.equal(receipt.managedExecutablePathLaunchQualified, false)
    assert.equal(receipt.supervisorModuleLoadQualified, false)
    assert.equal((await launch.physicalExit).jobEmpty, true); finished = true
  } finally {
    clearTimeout(timer)
    if (launch) {
      if (!finished) {launch.child.kill(); launch.child.stdin.destroy()}
      await launch.physicalExit.catch(() => {}); await launch.completion.catch(() => {})
    }
    assert.equal(held.attempt({operation: 'set-sparse', enabled: false}).succeeded, true)
    held.close(); await f.close()
  }
})
