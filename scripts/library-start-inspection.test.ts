import assert from 'node:assert/strict'
import { createLibraryStartTracer } from '../src/main/library-lifecycle/library-start.tracer'
import type { LibraryStartInspectionRequest } from '../src/main/library-lifecycle/library-start'

const portableEvidence = {
  kind: 'portable',
  compatibility: 'compatible',
  integrity: 'intact',
  filesystem: 'qualified',
  lock: 'available'
}

const compatible = createLibraryStartTracer({ observe: () => portableEvidence })
assert.deepEqual(
  await compatible.libraryStart.inspect({ kind: 'inspect-candidate', candidate: compatible.candidate }),
  {
    candidate: compatible.candidate,
    state: 'compatible',
    reason: 'candidate-compatible',
    writeAuthority: 'not-issued'
  },
  'Compatible fixture evidence grants only inspection eligibility, never Session or write authority.'
)

const legacy = createLibraryStartTracer({ observe: async () => ({ kind: 'legacy' }) })
assert.deepEqual(
  await legacy.libraryStart.inspect({ kind: 'inspect-candidate', candidate: legacy.candidate }),
  {
    candidate: legacy.candidate,
    state: 'legacy-migration-required',
    reason: 'legacy-library',
    writeAuthority: 'not-issued'
  },
  'The same inspection Interface recognizes legacy migration without reimporting or activating it.'
)

let cancelledObservations = 0
const cancelled = createLibraryStartTracer({ observe() {
  cancelledObservations++
  return portableEvidence
} })
assert.deepEqual(await cancelled.libraryStart.inspect({ kind: 'selection-cancelled' }), {
  candidate: null,
  state: 'selection-cancelled',
  reason: 'selection-cancelled',
  writeAuthority: 'not-issued'
})
assert.equal(cancelledObservations, 0, 'Cancellation must not dispatch a scope observation.')

let observed = 0
const guarded = createLibraryStartTracer({ observe() { observed++; return portableEvidence } })
const invalidRequests: unknown[] = [
  { kind: 'inspect-candidate', candidate: guarded.candidate, verified: true },
  null, undefined, [], {},
  { kind: 'inspect-candidate', candidate: guarded.candidate, lock: 'available' },
  { kind: 'selection-cancelled', path: 'sensitive-fixture-marker' }
]
for (const request of invalidRequests) {
  assert.deepEqual(await guarded.libraryStart.inspect(request as LibraryStartInspectionRequest), {
    candidate: null, state: 'not-assessed', reason: 'invalid-request', writeAuthority: 'not-issued'
  })
}
for (const candidate of [{}, { ...guarded.candidate }, compatible.candidate, 'sensitive-fixture-marker']) {
  assert.deepEqual(await guarded.libraryStart.inspect({ kind: 'inspect-candidate', candidate } as LibraryStartInspectionRequest), {
    candidate: null, state: 'not-assessed', reason: 'unknown-candidate', writeAuthority: 'not-issued'
  })
}
assert.equal(observed, 0, 'Unissued references and caller evidence must be rejected before observing a scope.')

for (const [observation, state, reason] of [
  [{ kind: 'missing' }, 'creation-required', 'library-missing'],
  [{ kind: 'unavailable' }, 'unavailable', 'candidate-unavailable'],
  [{ kind: 'not-assessed' }, 'not-assessed', 'evidence-not-assessed']
] as const) {
  const fixture = createLibraryStartTracer({ observe: () => observation })
  assert.deepEqual(await fixture.libraryStart.inspect({ kind: 'inspect-candidate', candidate: fixture.candidate }), {
    candidate: fixture.candidate, state, reason, writeAuthority: 'not-issued'
  }, 'Only explicit missing evidence may suggest creation; unavailable/unknown are different outcomes.')
}

for (const [changes, state, reason] of [
  [{ compatibility: 'unsupported' }, 'unsupported', 'library-unsupported'],
  [{ integrity: 'recovery-required' }, 'recovery-required', 'library-recovery-required'],
  [{ filesystem: 'unsupported' }, 'unsupported', 'filesystem-unsupported'],
  [{ filesystem: 'unavailable' }, 'unavailable', 'candidate-unavailable'],
  [{ lock: 'busy' }, 'busy', 'library-busy'],
  [{ filesystem: 'read-only' }, 'read-only', 'storage-read-only'],
  [{ filesystem: 'read-only', lock: 'not-assessed' }, 'not-assessed', 'evidence-not-assessed'],
  ...['compatibility', 'integrity', 'filesystem', 'lock'].map((key) =>
    [{ [key]: 'not-assessed' }, 'not-assessed', 'evidence-not-assessed'] as const)
] as const) {
  const fixture = createLibraryStartTracer({ observe: () => ({ ...portableEvidence, ...changes }) })
  assert.deepEqual(await fixture.libraryStart.inspect({ kind: 'inspect-candidate', candidate: fixture.candidate }), {
    candidate: fixture.candidate, state, reason, writeAuthority: 'not-issued'
  }, 'Every required assessment must be known before compatible or read-only eligibility is projected.')
}

let getterReads = 0
const accessorEvidence = Object.defineProperty({ ...portableEvidence }, 'filesystem', {
  enumerable: true,
  get() { getterReads++; throw new Error('sensitive-fixture-marker') }
})
for (const observation of [
  null, undefined, [], 'sensitive-fixture-marker', {},
  { kind: 'portable' },
  { ...portableEvidence, compatibility: true },
  { ...portableEvidence, lock: 'verified' },
  { ...portableEvidence, rootPath: 'sensitive-fixture-marker' },
  { kind: 'legacy', sql: 'sensitive-fixture-marker' },
  Object.create(portableEvidence), accessorEvidence,
  new Proxy({}, { ownKeys() { throw new Error('sensitive-fixture-marker') } })
]) {
  const fixture = createLibraryStartTracer({ observe: () => observation })
  assert.deepEqual(await fixture.libraryStart.inspect({ kind: 'inspect-candidate', candidate: fixture.candidate }), {
    candidate: fixture.candidate, state: 'not-assessed', reason: 'invalid-observation', writeAuthority: 'not-issued'
  }, 'Malformed Adapter output must not become eligibility or escape as raw data.')
}
assert.equal(getterReads, 0, 'Evidence getters are not invoked to obtain conclusions.')

for (const observe of [
  () => { throw new Error('sensitive-fixture-marker') },
  async () => { throw { message: 'sensitive-fixture-marker', sql: 'sensitive-fixture-marker' } }
]) {
  const fixture = createLibraryStartTracer({ observe })
  assert.deepEqual(await fixture.libraryStart.inspect({ kind: 'inspect-candidate', candidate: fixture.candidate }), {
    candidate: fixture.candidate, state: 'not-assessed', reason: 'observation-failed', writeAuthority: 'not-issued'
  }, 'Synchronous and asynchronous Adapter exceptions are fixed, path-free outcomes.')
}

const accessorRequest = Object.defineProperty({ candidate: guarded.candidate }, 'kind', {
  enumerable: true,
  get() { getterReads++; return 'inspect-candidate' }
})
for (const request of [
  accessorRequest,
  Object.create({ kind: 'inspect-candidate', candidate: guarded.candidate }),
  { kind: 'inspect-candidate', candidate: guarded.candidate, [Symbol('fixture')]: true },
  new Proxy({}, { ownKeys() { throw new Error('sensitive-fixture-marker') } })
]) {
  assert.equal((await guarded.libraryStart.inspect(request as LibraryStartInspectionRequest)).reason, 'invalid-request')
}
assert.equal(getterReads, 0)
assert.equal(observed, 0)

let current: unknown = portableEvidence
const changing = createLibraryStartTracer({ observe: () => current })
const request = { kind: 'inspect-candidate' as const, candidate: changing.candidate }
const first = await changing.libraryStart.inspect(request)
current = { ...portableEvidence, lock: 'busy' }
assert.equal((await changing.libraryStart.inspect(request)).state, 'busy', 'Each inspection reads fresh Adapter evidence.')
assert.equal(first.state, 'compatible', 'A later observation does not rewrite the earlier result.')
assert.equal(Reflect.set(first, 'writeAuthority', 'issued'), false)
assert.deepEqual(Object.keys(first).sort(), ['candidate', 'reason', 'state', 'writeAuthority'])
assert.deepEqual(Object.keys(changing.libraryStart), ['inspect'])
assert.equal(Object.isFrozen(changing.candidate), true)
assert.deepEqual(Reflect.ownKeys(changing.candidate), [], 'The opaque ref contains no paths, IDs, Adapter or native handles.')

const negativeAndUnknown = createLibraryStartTracer({ observe: () => ({
  ...portableEvidence, integrity: 'recovery-required', lock: 'not-assessed'
}) })
assert.equal((await negativeAndUnknown.libraryStart.inspect({
  kind: 'inspect-candidate', candidate: negativeAndUnknown.candidate
})).state, 'recovery-required', 'Known blockers may be reported without inferring positive eligibility from unknown evidence.')

console.log('library-start-inspection passed')
