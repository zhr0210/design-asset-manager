import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import { createActiveLibraryHost } from '../src/main/library-lifecycle'
import { createProductionActiveLibraryHostDependencies } from '../src/main/library-lifecycle/production-active-library-dependencies'
import { createWorkFileHandoffs } from '../src/main/work-mode/work-file-handoff'
import type { WorkVideoRuntime } from '../src/main/work-mode/windows-video-runtime'

// Portable storage/Copy regression with a controlled decoder port. This is not
// actual codec qualification or a user workflow; the Mac film is tested separately.
const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'dam-frame-provenance-')))
const video = path.join(root, 'controlled-codec-input.mp4')
await fs.writeFile(video, Buffer.from([0, 0, 0, 24, ...Buffer.from('ftypisom'), 0, 0, 0, 0, ...Buffer.from('fixture')]))
const png = await sharp({ create: { width: 32, height: 24, channels: 3, background: '#e63327' } }).png().toBuffer()
const metadata = { protocol: 1 as const, durationTicks: 20_000_000, width: 32, height: 24, fpsNumerator: 24, fpsDenominator: 1, actualTicks: 0 }

try {
  for (const family of ['macos-avfoundation', 'windows-media-foundation']) {
    const identity = 'controlled-decoder:' + family
    const runtime: WorkVideoRuntime = {
      identity,
      probe: async () => metadata,
      frame: async (_file, ticks) => ({ metadata: { ...metadata, actualTicks: ticks }, png })
    }
    const library = path.join(root, family)
    const host = createActiveLibraryHost(createProductionActiveLibraryHostDependencies({
      selectLibraryDirectory: async () => ({ kind: 'selected', directory: library }),
      selectLocalFiles: async () => ({ kind: 'selected', files: [{ filePath: video }] })
    }, { videoRuntime: runtime }))
    try {
      const plan = await host.prepareCreate()
      assert.equal(plan.kind, 'planned')
      if (plan.kind !== 'planned') throw Error('CREATE_PLAN')
      await host.confirmCreate(plan.plan.receipt)
      const state = host.inspect()
      const scope = { libraryIdentity: state.identity!, generation: state.generation! }
      let status = await host.workMediaStatus(scope)
      await host.enableBasicAnalysis({ ...scope, sessionToken: status.sessionToken, expectedSchemaVersion: 1, allowUpgrade: true }, new AbortController().signal)
      status = await host.workMediaStatus(scope)
      await host.enableWorkMedia({ ...scope, sessionToken: status.sessionToken, expectedSchemaVersion: 14, allowUpgrade: true })
      const intake = await host.prepareAddAssets()
      assert.equal(intake.kind, 'planned')
      if (intake.kind !== 'planned') throw Error('INTAKE_PLAN')
      assert.equal(intake.plan.confirmable, true)
      await host.dispatchAddAssets(intake.plan.receipt)
      const clip = (await host.listAssets())[0]
      const catalog = await host.readWorkSets(scope, 'device:provenance-test')
      const created = await host.writeWorkSet({ ...scope, sessionToken: catalog.sessionToken, allowUpgrade: true,
        command: { kind: 'create', value: { name: family, assetIds: [clip.id], columns: 1, colors: [], note: 'Controlled codec port' } }
      }, 'device:provenance-test')
      const mediaScope = { ...scope, setId: created.sets[0].id, assetId: clip.id }
      const before = await host.readWorkMedia(mediaScope)
      const request = { ...mediaScope, sessionToken: before.sessionToken, expectedRevision: before.revision,
        command: { kind: 'capture' as const, requestId: 'provenance-capture', requestedTicks: 10_000_000 } }
      const captured = await host.writeWorkMedia(request)
      const frame = captured.frames[0]
      assert.equal(frame.method, identity, 'record the actual decoder identity separately from PNG normalization')
      assert.equal(frame.transform, 'decoded-video-frame/sharp/png/full-resolution/v1', 'shared storage must describe its own PNG normalization, not claim a Windows decoder for every platform')
      assert.deepEqual(await host.writeWorkMedia(request), captured, 'completed capture remains idempotent')
      const stored = await host.readWorkMediaFile({ ...mediaScope, frameId: frame.id })
      const image = await sharp(stored.bytes).metadata()
      assert.equal(image.format, 'png')
      assert.deepEqual([image.width, image.height], [32, 24])
      const handoffs = createWorkFileHandoffs({ host, root: path.join(root, family + '-handoffs'), open: async () => '', trash: async () => {} })
      const receipt = await handoffs.prepare('controlled-provenance-owner', { ...mediaScope, frameId: frame.id, kind: 'reference-frame', action: 'prepare' })
      assert.deepEqual(Buffer.from((await handoffs.readFile(receipt.id)).bytes), Buffer.from(stored.bytes))
    } finally {
      await host.close()
    }
  }
  console.log('Portable production temp-SQLite provenance: decoder identity retained for Mac/Windows ports, shared Sharp PNG transform is truthful, capture is idempotent and handed frame bytes match. Controlled decoder; actual native/user qualification separate.')
} finally {
  assert.equal(path.dirname(root), await fs.realpath(os.tmpdir()))
  assert.ok(path.basename(root).startsWith('dam-frame-provenance-'))
  await fs.rm(root, { recursive: true, force: true })
}
