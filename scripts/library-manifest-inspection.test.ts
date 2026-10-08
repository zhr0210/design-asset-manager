import assert from 'node:assert/strict'
import { createLibraryManifestTracer } from
  '../src/main/library-lifecycle/library-manifest.tracer'

const encoder = new TextEncoder()

function manifestBytes(value: unknown): Uint8Array {
  return encoder.encode(JSON.stringify(value))
}

const validManifest = {
  format: 'design-asset-library',
  manifestSchemaVersion: 1,
  libraryIdentity: {
    lineage: 'lineage-alpha',
    instance: 'instance-alpha'
  },
  controlStore: {
    identity: 'control-store-alpha',
    schemaVersion: 1
  },
  applicationCompatibility: {
    minimumReaderLevel: 1,
    writerLevel: 1
  },
  managedOriginals: {
    relativePath: 'Originals'
  }
}

const valid = createLibraryManifestTracer({ read: () => ({
  manifestBytes: manifestBytes(validManifest),
  targetState: 'non-empty',
  legacyEvidence: 'absent'
}) })
assert.deepEqual(await valid.libraryStart.inspect({
  kind: 'inspect-candidate', candidate: valid.candidate
}), {
  candidate: valid.candidate,
  state: 'not-assessed',
  reason: 'manifest-compatible-evidence-pending',
  writeAuthority: 'not-issued'
}, 'A valid Manifest remains ineligible until independent filesystem and lock evidence exists.')

for (const [source, state, reason] of [
  [{ manifestBytes: null, targetState: 'empty', legacyEvidence: 'absent' },
    'creation-required', 'library-missing'],
  [{ manifestBytes: null, targetState: 'non-empty', legacyEvidence: 'present' },
    'legacy-migration-required', 'legacy-library'],
  [{ manifestBytes: null, targetState: 'non-empty', legacyEvidence: 'absent' },
    'not-assessed', 'evidence-not-assessed'],
  [{ manifestBytes: null, targetState: 'unknown', legacyEvidence: 'not-assessed' },
    'not-assessed', 'evidence-not-assessed']
] as const) {
  const fixture = createLibraryManifestTracer({ read: () => source })
  assert.deepEqual(await fixture.libraryStart.inspect({
    kind: 'inspect-candidate', candidate: fixture.candidate
  }), {
    candidate: fixture.candidate, state, reason, writeAuthority: 'not-issued'
  }, 'Only explicit empty-target evidence makes an absent Manifest creation-required.')
}

for (const [manifest, state, reason] of [
  [{ ...validManifest, manifestSchemaVersion: 2 }, 'unsupported', 'library-unsupported'],
  [{ ...validManifest, controlStore: { ...validManifest.controlStore, schemaVersion: 2 } },
    'unsupported', 'library-unsupported'],
  [{ ...validManifest, applicationCompatibility: { minimumReaderLevel: 2, writerLevel: 2 } },
    'unsupported', 'library-unsupported'],
  [{ ...validManifest, manifestSchemaVersion: 0 }, 'recovery-required', 'library-recovery-required'],
  [{ ...validManifest, controlStore: { ...validManifest.controlStore, schemaVersion: 0 } },
    'recovery-required', 'library-recovery-required'],
  [{ ...validManifest, applicationCompatibility: { minimumReaderLevel: 1, writerLevel: 0 } },
    'recovery-required', 'library-recovery-required'],
  [{ ...validManifest, applicationCompatibility: { minimumReaderLevel: 1, writerLevel: 2 } },
    'not-assessed', 'manifest-compatible-evidence-pending']
] as const) {
  const fixture = createLibraryManifestTracer({ read: () => ({
    manifestBytes: manifestBytes(manifest), targetState: 'non-empty', legacyEvidence: 'absent'
  }) })
  assert.deepEqual(await fixture.libraryStart.inspect({
    kind: 'inspect-candidate', candidate: fixture.candidate
  }), {
    candidate: fixture.candidate, state, reason, writeAuthority: 'not-issued'
  })
}

for (const relativePath of ['Originals', 'Design Assets/原片', 'Originals/2026']) {
  const manifest = { ...validManifest, managedOriginals: { relativePath } }
  const fixture = createLibraryManifestTracer({ read: () => ({
    manifestBytes: manifestBytes(manifest), targetState: 'non-empty', legacyEvidence: 'absent'
  }) })
  assert.equal((await fixture.libraryStart.inspect({
    kind: 'inspect-candidate', candidate: fixture.candidate
  })).reason, 'manifest-compatible-evidence-pending')
}

const invalidBindings = [
  '', '.', '..', '/Originals', '~/Originals', 'C:/Originals', 'file://Originals',
  'Originals\\nested', 'Originals/', 'Originals//nested', 'Originals/../escape',
  '.control/Originals', 'Originals/.hidden', 'cache', 'Library/models',
  'runtime/Originals', 'plugins', 'CON', 'PRN.txt', 'Originals ', 'Originals.',
  'e\u0301', '\ud800', 'a'.repeat(121), 'a/'.repeat(8) + 'b', 'a'.repeat(241), 'a\u0000b'
]
for (const relativePath of invalidBindings) {
  const fixture = createLibraryManifestTracer({ read: () => ({
    manifestBytes: manifestBytes({ ...validManifest, managedOriginals: { relativePath } }),
    targetState: 'non-empty', legacyEvidence: 'absent'
  }) })
  assert.equal((await fixture.libraryStart.inspect({
    kind: 'inspect-candidate', candidate: fixture.candidate
  })).state, 'recovery-required')
}

for (const manifest of [
  { ...validManifest, format: 'other-library' },
  { ...validManifest, unexpected: true },
  { ...validManifest, libraryIdentity: { lineage: 'same', instance: 'same' } },
  { ...validManifest, libraryIdentity: { lineage: '../lineage', instance: 'instance-alpha' } },
  { ...validManifest, libraryIdentity: { lineage: 'lineage-alpha', instance: 'instance:alpha' } },
  { ...validManifest, controlStore: { ...validManifest.controlStore, identity: 'lineage-alpha' } },
  { ...validManifest, controlStore: { ...validManifest.controlStore, extra: true } },
  { ...validManifest, applicationCompatibility: { minimumReaderLevel: 1.5, writerLevel: 2 } },
  { ...validManifest, libraryIdentity: { lineage: 'a'.repeat(129), instance: 'instance-alpha' } }
]) {
  const fixture = createLibraryManifestTracer({ read: () => ({
    manifestBytes: manifestBytes(manifest), targetState: 'non-empty', legacyEvidence: 'absent'
  }) })
  assert.equal((await fixture.libraryStart.inspect({
    kind: 'inspect-candidate', candidate: fixture.candidate
  })).reason, 'library-recovery-required')
}

const validText = JSON.stringify(validManifest)
const hostileBytes = [
  new Uint8Array(),
  new Uint8Array([0xff]),
  encoder.encode(` ${validText}`),
  encoder.encode(validText.replace('"manifestSchemaVersion":1',
    '"manifestSchemaVersion":2,"manifestSchemaVersion":1')),
  new Uint8Array([0xef, 0xbb, 0xbf, ...encoder.encode(validText)]),
  new Uint8Array(16 * 1024 + 1)
]
for (const [index, bytes] of hostileBytes.entries()) {
  const fixture = createLibraryManifestTracer({ read: () => ({
    manifestBytes: bytes, targetState: 'non-empty', legacyEvidence: 'absent'
  }) })
  assert.equal((await fixture.libraryStart.inspect({
    kind: 'inspect-candidate', candidate: fixture.candidate
  })).reason, 'library-recovery-required', `Hostile Manifest byte case ${index} must fail closed.`)
}

let typedArrayGetterReads = 0
const ownSlice = manifestBytes(validManifest)
Object.defineProperty(ownSlice, 'slice', {
  configurable: true,
  get() { typedArrayGetterReads++; throw new Error('sensitive-fixture-marker') }
})
const ownByteLength = manifestBytes(validManifest)
Object.defineProperty(ownByteLength, 'byteLength', {
  configurable: true,
  get() { typedArrayGetterReads++; return validText.length }
})
for (const bytes of [ownSlice, ownByteLength]) {
  const fixture = createLibraryManifestTracer({ read: () => ({
    manifestBytes: bytes, targetState: 'non-empty', legacyEvidence: 'absent'
  }) })
  assert.equal((await fixture.libraryStart.inspect({
    kind: 'inspect-candidate', candidate: fixture.candidate
  })).reason, 'library-recovery-required')
}
assert.equal(typedArrayGetterReads, 0, 'Typed-array expandos are rejected without invoking them.')

let coercions = 0
const coerciveTarget = { toString() { coercions++; return 'non-empty' } }
const coercive = createLibraryManifestTracer({ read: () => ({
  manifestBytes: manifestBytes(validManifest),
  targetState: coerciveTarget,
  legacyEvidence: 'absent'
}) })
assert.equal((await coercive.libraryStart.inspect({
  kind: 'inspect-candidate', candidate: coercive.candidate
})).reason, 'library-recovery-required')
assert.equal(coercions, 0, 'Manifest source fields are never coerced into trusted declarations.')

let getterReads = 0
const accessorSource = Object.defineProperty({
  targetState: 'non-empty', legacyEvidence: 'absent'
}, 'manifestBytes', {
  enumerable: true,
  get() { getterReads++; return manifestBytes(validManifest) }
})
for (const read of [
  () => accessorSource,
  () => Object.create({
    manifestBytes: manifestBytes(validManifest), targetState: 'non-empty', legacyEvidence: 'absent'
  }),
  () => new Proxy({}, { ownKeys() { throw new Error('sensitive-fixture-marker') } })
]) {
  const fixture = createLibraryManifestTracer({ read })
  assert.equal((await fixture.libraryStart.inspect({
    kind: 'inspect-candidate', candidate: fixture.candidate
  })).reason, 'library-recovery-required')
}
assert.equal(getterReads, 0, 'Source accessors are not invoked while decoding Manifest input.')

for (const read of [
  () => { throw new Error('sensitive-fixture-marker') },
  async () => { throw { path: 'sensitive-fixture-marker', sql: 'sensitive-fixture-marker' } }
]) {
  const fixture = createLibraryManifestTracer({ read })
  assert.deepEqual(await fixture.libraryStart.inspect({
    kind: 'inspect-candidate', candidate: fixture.candidate
  }), {
    candidate: fixture.candidate,
    state: 'not-assessed',
    reason: 'observation-failed',
    writeAuthority: 'not-issued'
  })
}

const originalBytes = manifestBytes(validManifest)
const originalSnapshot = new Uint8Array(originalBytes)
if (typeof SharedArrayBuffer !== 'undefined') {
  const sharedBytes = new Uint8Array(new SharedArrayBuffer(originalSnapshot.length))
  sharedBytes.set(originalSnapshot)
  const shared = createLibraryManifestTracer({ read: () => ({
    manifestBytes: sharedBytes, targetState: 'non-empty', legacyEvidence: 'absent'
  }) })
  assert.equal((await shared.libraryStart.inspect({
    kind: 'inspect-candidate', candidate: shared.candidate
  })).reason, 'library-recovery-required', 'Shared mutable bytes cannot be deterministic Manifest evidence.')
}
const immutableInput = createLibraryManifestTracer({ read: () => ({
  manifestBytes: originalBytes, targetState: 'non-empty', legacyEvidence: 'absent'
}) })
const immutableResult = await immutableInput.libraryStart.inspect({
  kind: 'inspect-candidate', candidate: immutableInput.candidate
})
assert.deepEqual(originalBytes, originalSnapshot, 'Manifest fixture bytes are read, never rewritten.')
assert.deepEqual(Object.keys(immutableResult).sort(), ['candidate', 'reason', 'state', 'writeAuthority'])
assert.equal(JSON.stringify(immutableResult).includes('lineage-alpha'), false)
assert.equal(JSON.stringify(immutableResult).includes('Originals'), false)

const reorderedManifest = {
  managedOriginals: validManifest.managedOriginals,
  applicationCompatibility: validManifest.applicationCompatibility,
  controlStore: validManifest.controlStore,
  libraryIdentity: validManifest.libraryIdentity,
  manifestSchemaVersion: 1,
  format: 'design-asset-library'
}
const reordered = createLibraryManifestTracer({ read: () => ({
  manifestBytes: manifestBytes(reorderedManifest), targetState: 'non-empty', legacyEvidence: 'absent'
}) })
assert.equal((await reordered.libraryStart.inspect({
  kind: 'inspect-candidate', candidate: reordered.candidate
})).reason, 'manifest-compatible-evidence-pending', 'Canonical field order is not semantic.')

console.log('library-manifest-inspection passed')
