import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { createOcrController } from '../src/main/ocr/ocr-controller'
import { createLibraryQuiescence } from '../src/main/library-quiescence'
import { readSyntheticFixtures } from '../src/main/local-host/synthetic-fixtures'
import { createFileSelection } from '../src/main/local-host/file-selection'
import { configureProductOpenDialog, showNativeOpenDialog } from '../src/main/platform/native-open-dialog'
import { clientRequestScope } from '../src/main/local-host/client-context'

async function fixture() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'dam-ocr-page-picker-'))
  const root = await fs.realpath(directory), profile = path.join(root, 'profile')
  await fs.mkdir(path.join(root, 'fixtures', 'ocr'), { recursive: true })
  await fs.mkdir(profile)
  await fs.writeFile(path.join(root, 'fixtures', 'registry.json'), JSON.stringify({ schema: 1, ocr: true, origin: 'http://127.0.0.1:49152' }))
  let ready = false, idle = true, selectorCalls = 0, visualHolds = 0, businessHolds = 0
  const owner = Object.freeze({ kind: 'browser-client' as const, id: 'synthetic-ocr-owner', role: 'workspace' as const })
  let notify!: () => void
  let notified = new Promise<void>(resolve => { notify = resolve })
  const selection = createFileSelection({ syntheticRoot: root, generation: () => ready ? 'ready-generation' : 'closed-generation', notify: () => notify() })
  configureProductOpenDialog(options => {
    assert.equal(clientRequestScope.getStore(), owner, 'configuration must keep the authenticated Browser owner through awaits')
    selectorCalls++
    return selection.select(owner.id, options)
  })
  const unexpected = async () => { throw Error('UNEXPECTED_LIBRARY_ACCESS') }
  const host = {
    inspect: () => ready
      ? { state: 'ready' as const, identity: 'synthetic-library', generation: 'ready-generation' }
      : { state: 'closed' as const, identity: null, generation: null },
    readAssetContext: unexpected, readPreview: unexpected, readOcr: unexpected, commitOcr: unexpected, correctOcr: unexpected,
    readVisualSession: async () => ({ sessionToken: 'synthetic-session', leaseIdentity: 'synthetic-lease' }),
    holdBusinessAdmission: () => { businessHolds++; return () => { businessHolds-- } }, close: unexpected
  }
  const runtime = readSyntheticFixtures(root)!.ocrRuntime(profile, async () => {
    const result = await showNativeOpenDialog({ title: '选择 OCR 环境', properties: ['openDirectory'] })
    return result.canceled ? null : result.filePaths[0] ?? null
  })
  const ocr = createOcrController({ host, runtime, changed() {}, runtimeChanged() {} })
  const quiescence = createLibraryQuiescence({
    current: () => ({ activeLibraryHost: host, ocr, visualAdmission: { hold: () => { visualHolds++; return () => { visualHolds-- } } } }),
    isShutdownIdle: () => idle, confirmSwitchDraftDiscard() {}
  })
  return {
    host, ocr, quiescence, selection, owner,
    setReady(value: boolean) { ready = value }, setIdle(value: boolean) { idle = value },
    get selectorCalls() { return selectorCalls },
    async cycle() { await quiescence.onAuthorityWillChange(); await quiescence.onAuthorityDidChange(); assert.equal(visualHolds, 0); assert.equal(businessHolds, 0) },
    async cancelConfiguration() {
      notified = new Promise(resolve => { notify = resolve })
      let failure: unknown
      const configure = clientRequestScope.run(owner, () => ocr.configure()).catch(error => { failure = error })
      try {
        await Promise.race([notified, configure])
        const pending = await selection.pending(owner.id)
        assert.ok(pending, 'app-scoped environment selection must open the actual page picker after a completed Library cycle')
        assert.equal(pending.mode, 'directory')
        selection.cancel(owner.id, pending.id)
        await configure
        assert.equal(failure, undefined)
        assert.deepEqual(await fs.readdir(profile), [], 'cancel must not configure an environment')
      } finally { selection.cancelAll(); await configure }
    },
    async dispose() {
      selection.cancelAll()
      assert.equal(path.dirname(directory), os.tmpdir())
      await fs.rm(directory, { recursive: true, force: true })
    }
  }
}

await test('Browser OCR configuration uses its page picker with no active Library; cancellation writes nothing', async () => {
  const f = await fixture()
  try { await f.cancelConfiguration(); assert.equal(f.selectorCalls, 1) } finally { await f.dispose() }
})

await test('after closing the Library, app-scoped OCR configuration reaches the page picker again', async () => {
  const f = await fixture()
  try { await f.cycle(); await f.cancelConfiguration(); assert.equal(f.selectorCalls, 1) } finally { await f.dispose() }
})

await test('ready Library coordination and a later close both preserve Browser OCR environment selection', async () => {
  const f = await fixture()
  try {
    f.setReady(true); await f.cycle(); await f.cancelConfiguration()
    f.setReady(false); await f.cycle(); await f.cancelConfiguration()
    assert.equal(f.selectorCalls, 2)
  } finally { await f.dispose() }
})

await test('authority completion during shutdown never reopens Browser OCR configuration', async () => {
  const f = await fixture()
  try {
    await f.quiescence.onAuthorityWillChange(); f.setIdle(false)
    await f.quiescence.onAuthorityDidChange()
    await assert.rejects(clientRequestScope.run(f.owner, () => f.ocr.configure()), /OCR_BUSY/)
    assert.equal(f.selectorCalls, 0)
  } finally { await f.dispose() }
})

await test('a failed ready-session check keeps OCR suspended until a later successful authority cycle', async () => {
  const f = await fixture()
  try {
    f.setReady(true)
    const valid = f.host.readVisualSession
    f.host.readVisualSession = async () => { throw Error('SYNTHETIC_SESSION_REVOKED') }
    await f.quiescence.onAuthorityWillChange()
    await assert.rejects(f.quiescence.onAuthorityDidChange(), /SYNTHETIC_SESSION_REVOKED/)
    await assert.rejects(clientRequestScope.run(f.owner, () => f.ocr.configure()), /OCR_BUSY/)
    assert.equal(f.selectorCalls, 0)
    f.host.readVisualSession = valid
    await f.cycle(); await f.cancelConfiguration()
  } finally { await f.dispose() }
})
