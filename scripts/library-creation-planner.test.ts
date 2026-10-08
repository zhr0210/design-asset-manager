import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import {
  createLibraryCreationPlannerTracer as createPlannerTracer,
  type LibraryCreationPlannerTracerInput,
  type LibraryCreationQualificationInput
} from
  '../src/main/library-lifecycle/library-creation-planner.tracer'
import type { LibraryCreationPlanningResult } from
  '../src/main/library-lifecycle/library-creation-planner'
import { createNodeLibraryCreationTargetPlatformAdapter } from
  '../src/main/library-lifecycle/library-creation-target-platform.internal'

const hostTargetPlatform = createNodeLibraryCreationTargetPlatformAdapter()

function createLibraryCreationPlannerTracer(
  input: Omit<LibraryCreationPlannerTracerInput, 'targetPlatform'>
) {
  return createPlannerTracer({ ...input, targetPlatform: hostTargetPlatform })
}

async function temporaryRoot(): Promise<string> {
  return fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'dam-library-creation-plan-')))
}

async function snapshot(root: string): Promise<readonly unknown[]> {
  const result: unknown[] = []
  async function visit(directory: string, prefix = ''): Promise<void> {
    for (const name of (await fs.readdir(directory)).sort()) {
      const relative = prefix ? `${prefix}/${name}` : name
      const absolute = path.join(directory, name)
      const stat = await fs.lstat(absolute, { bigint: true })
      const kind = stat.isSymbolicLink() ? 'link' : stat.isDirectory() ? 'directory' : 'file'
      result.push([relative, kind, String(stat.ino), String(stat.size), String(stat.mtimeNs)])
      if (kind === 'directory') await visit(absolute, relative)
    }
  }
  const stat = await fs.lstat(root, { bigint: true })
  result.push(['.', 'directory', String(stat.ino), String(stat.size), String(stat.mtimeNs)])
  await visit(root)
  return result
}

function qualified(input: LibraryCreationQualificationInput, changes: Record<string, unknown> = {}) {
  return {
    targetGeneration: input.targetGeneration,
    qualificationGeneration: 'qualification-v1',
    filesystem: {
      kind: 'qualified', scopeIdentity: input.scopeIdentity,
      maxComponentUtf8Bytes: 255, maxCompletePathUtf16Units: 4096,
      atomicReplace: 'qualified', durableCommit: 'qualified', mountBoundary: 'qualified'
    },
    access: { kind: 'read-write', scopeIdentity: input.accessScopeIdentity },
    exclusiveLock: 'qualified',
    capacity: { availableBytes: 4096, requiredBytes: 256, safetyReserveBytes: 1024 },
    ...changes
  }
}

function requireReady(result: LibraryCreationPlanningResult) {
  assert.equal(result.state, 'ready')
  if (result.state !== 'ready') throw new Error('Expected ready creation review.')
  return result
}

async function aMissingTargetProducesOnlyAReviewedPlan(): Promise<void> {
  const root = await temporaryRoot()
  try {
    const target = path.join(root, 'NewLibrary')
    const before = await snapshot(root)
    const qualificationInputs: unknown[] = []
    const planner = createLibraryCreationPlannerTracer({
      targetDirectory: target,
      qualification: {
        inspect(input) {
          qualificationInputs.push(input)
          return qualified(input)
        }
      }
    })
    const result = await planner.prepare({ kind: 'review-target' })
    assert.equal(result.state, 'ready')
    if (result.state !== 'ready') throw new Error('Expected a reviewable creation plan.')
    assert.equal(result.confirmable, true)
    assert.equal(result.writeAuthority, 'not-issued')
    assert.equal(result.review.targetState, 'missing')
    assert.deepEqual(result.review.roles, [
      'library-control', 'managed-originals', 'required-previews', 'intake-staging'
    ])
    assert.deepEqual(result.review.requirements, { requiredBytes: 256, safetyReserveBytes: 1024 })
    assert.deepEqual(result.review.collisions, {
      targetNamespace: 'none-detected',
      plannedRoles: 'none-detected',
      onDetection: 'blocks-confirmation'
    })
    assert.deepEqual(result.capacity, {
      availableBytes: 4096,
      remainingAfterCreationBytes: 3840,
      remainingBeyondReserveBytes: 2816
    })
    const identities = Object.values(result.review.identities)
    assert.equal(identities.length, 4)
    assert.equal(new Set(identities).size, 4)
    for (const identity of identities) assert.match(identity, /^[A-Za-z0-9][A-Za-z0-9._~-]{0,127}$/u)
    assert.equal(Object.isFrozen(result), true)
    assert.equal(Object.isFrozen(result.review), true)
    assert.equal(Object.isFrozen(result.review.identities), true)
    assert.equal(Object.isFrozen(result.review.receipt), true)
    assert.deepEqual(Object.keys(planner).sort(), ['inspect', 'prepare'])
    assert.equal(JSON.stringify(result).includes(root), false)
    assert.equal(JSON.stringify(qualificationInputs).includes(root), false)

    const repeated = await planner.inspect({ receipt: result.review.receipt })
    assert.equal(repeated.state, 'ready')
    if (repeated.state !== 'ready') throw new Error('Expected unchanged review.')
    assert.equal(repeated.review.receipt, result.review.receipt)
    assert.deepEqual(repeated.review.identities, result.review.identities)
    assert.deepEqual(await snapshot(root), before, 'Planning and rechecking must create no state.')
  } finally {
    assert.ok(path.basename(root).startsWith('dam-library-creation-plan-'))
    await fs.rm(root, { recursive: true, force: true })
  }
}

async function emptyAndBlockedTargetsStayUntouched(): Promise<void> {
  const cases = ['empty', 'file', 'ordinary-content', 'hidden-content', 'portable', 'legacy', 'link', 'missing-parent']
  for (const kind of cases) {
    const root = await temporaryRoot()
    try {
      let target = path.join(root, 'Selected')
      if (kind === 'file') await fs.writeFile(target, 'fixture')
      else if (kind === 'link') {
        const outside = path.join(root, 'Other')
        await fs.mkdir(outside)
        await fs.symlink(outside, target, process.platform === 'win32' ? 'junction' : 'dir')
      } else if (kind === 'missing-parent') target = path.join(root, 'Missing', 'Selected')
      else {
        await fs.mkdir(target)
        if (kind === 'ordinary-content') await fs.writeFile(path.join(target, 'source.png'), 'generated')
        if (kind === 'hidden-content') await fs.writeFile(path.join(target, '.DS_Store'), 'generated')
        if (kind === 'portable') await fs.mkdir(path.join(target, '.dam'))
        if (kind === 'legacy') await fs.writeFile(path.join(target, 'design_asset_manager.db'), 'not opened')
      }
      const before = await snapshot(root)
      let calls = 0
      const planner = createLibraryCreationPlannerTracer({
        targetDirectory: target,
        qualification: { inspect(input) { calls++; return qualified(input) } }
      })
      const result = await planner.prepare({ kind: 'review-target' })
      if (kind === 'empty') {
        assert.equal(result.state, 'ready')
        if (result.state !== 'ready') throw new Error('Expected explicit empty-root review.')
        assert.equal(result.review.targetState, 'empty')
      } else {
        assert.equal(result.state, 'blocked', kind)
        assert.equal(result.confirmable, false)
        assert.equal(calls, 0, 'Blocked targets must not request qualification or inspect file contents.')
      }
      assert.deepEqual(await snapshot(root), before, kind)
    } finally {
      assert.ok(path.basename(root).startsWith('dam-library-creation-plan-'))
      await fs.rm(root, { recursive: true, force: true })
    }
  }
}

async function inaccessibleAndLinkedAncestorTargetsFailClosed(): Promise<void> {
  const root = await temporaryRoot()
  try {
    if (process.platform !== 'win32') {
      for (const [name, mode] of [['ReadOnlyTarget', 0o555], ['NoSearchTarget', 0o666]] as const) {
        const inaccessibleTarget = path.join(root, name)
        await fs.mkdir(inaccessibleTarget)
        await fs.chmod(inaccessibleTarget, mode)
        let calls = 0
        const planner = createLibraryCreationPlannerTracer({
          targetDirectory: inaccessibleTarget,
          qualification: { inspect(input) { calls++; return qualified(input) } }
        })
        const result = await planner.prepare({ kind: 'review-target' })
        assert.equal(result.state, 'blocked')
        if (result.state !== 'blocked') throw new Error('Expected inaccessible target rejection.')
        assert.equal(result.reason, 'target-unavailable')
        assert.equal(calls, 0, 'An inaccessible target must not reach qualification.')
        await fs.chmod(inaccessibleTarget, 0o755)
      }

      const noSearchParent = path.join(root, 'NoSearchParent')
      await fs.mkdir(noSearchParent)
      await fs.chmod(noSearchParent, 0o666)
      let calls = 0
      const planner = createLibraryCreationPlannerTracer({
        targetDirectory: path.join(noSearchParent, 'Selected'),
        qualification: { inspect(input) { calls++; return qualified(input) } }
      })
      const result = await planner.prepare({ kind: 'review-target' })
      assert.equal(result.state, 'blocked')
      if (result.state !== 'blocked') throw new Error('Expected inaccessible parent rejection.')
      assert.equal(result.reason, 'target-unavailable')
      assert.equal(calls, 0, 'An inaccessible parent must not reach qualification.')
      await fs.chmod(noSearchParent, 0o755)
    }

    const outside = path.join(root, 'Outside')
    const linkedParent = path.join(root, 'LinkedParent')
    await fs.mkdir(path.join(outside, 'Nested'), { recursive: true })
    await fs.symlink(outside, linkedParent, process.platform === 'win32' ? 'junction' : 'dir')
    let calls = 0
    const planner = createLibraryCreationPlannerTracer({
      targetDirectory: path.join(linkedParent, 'Nested', 'Selected'),
      qualification: { inspect(input) { calls++; return qualified(input) } }
    })
    const result = await planner.prepare({ kind: 'review-target' })
    assert.equal(result.state, 'blocked')
    if (result.state !== 'blocked') throw new Error('Expected linked ancestor rejection.')
    assert.equal(result.reason, 'target-unsafe')
    assert.equal(calls, 0, 'A linked ancestor must not reach qualification.')
  } finally {
    assert.ok(path.basename(root).startsWith('dam-library-creation-plan-'))
    await fs.rm(root, { recursive: true, force: true })
  }
}

async function targetPlatformPolicyIsAnInjectedBoundary(): Promise<void> {
  const root = await temporaryRoot()
  try {
    assert.equal(createNodeLibraryCreationTargetPlatformAdapter('win32')
      .targetNameIsSupported('CON'), false)
    assert.equal(createNodeLibraryCreationTargetPlatformAdapter('darwin')
      .targetNameIsSupported('CON'), true)

    let accessChecks = 0
    let qualificationCalls = 0
    const denied = createPlannerTracer({
      targetDirectory: path.join(root, 'Selected'),
      targetPlatform: {
        platform: 'darwin',
        targetNameIsSupported: () => true,
        inspectAccess: async () => { accessChecks++; return 'read-only' as const }
      },
      qualification: { inspect(input) { qualificationCalls++; return qualified(input) } }
    })
    const deniedResult = await denied.prepare({ kind: 'review-target' })
    assert.equal(deniedResult.state, 'blocked')
    if (deniedResult.state !== 'blocked') throw new Error('Expected injected access rejection.')
    assert.equal(deniedResult.reason, 'target-unavailable')
    assert.equal(accessChecks, 1)
    assert.equal(qualificationCalls, 0)

    let nameChecks = 0
    const invalidName = createPlannerTracer({
      targetDirectory: path.join(root, 'CON'),
      targetPlatform: {
        platform: 'win32',
        targetNameIsSupported: () => { nameChecks++; return false },
        inspectAccess: async () => { throw new Error('Invalid names must not inspect access.') }
      },
      qualification: { inspect() { throw new Error('Invalid names must not qualify.') } }
    })
    const invalidNameResult = await invalidName.prepare({ kind: 'review-target' })
    assert.equal(invalidNameResult.state, 'blocked')
    if (invalidNameResult.state !== 'blocked') throw new Error('Expected platform name rejection.')
    assert.equal(invalidNameResult.reason, 'invalid-target')
    assert.equal(nameChecks, 1)

    let qualifiedPlatform: NodeJS.Platform | undefined
    const allowed = createPlannerTracer({
      targetDirectory: path.join(root, 'Allowed'),
      targetPlatform: {
        platform: 'win32',
        targetNameIsSupported: () => true,
        inspectAccess: async () => 'read-write'
      },
      qualification: { inspect(input) {
        qualifiedPlatform = input.platform
        return qualified(input)
      } }
    })
    assert.equal((await allowed.prepare({ kind: 'review-target' })).state, 'ready')
    assert.equal(qualifiedPlatform, 'win32')
  } finally {
    assert.ok(path.basename(root).startsWith('dam-library-creation-plan-'))
    await fs.rm(root, { recursive: true, force: true })
  }
}

async function onlyExplicitQualificationAndCapacityPermitReview(): Promise<void> {
  const root = await temporaryRoot()
  try {
    const cases: ReadonlyArray<readonly [
      (input: LibraryCreationQualificationInput) => unknown,
      string
    ]> = [
      [() => null, 'qualification-not-assessed'],
      [(input) => qualified(input, { targetGeneration: 'wrong-target' }), 'qualification-not-assessed'],
      [(input) => qualified(input, { qualificationGeneration: null }), 'qualification-not-assessed'],
      [(input) => qualified(input, { access: {
        kind: 'read-only', scopeIdentity: input.accessScopeIdentity
      } }), 'storage-read-only'],
      [(input) => qualified(input, { access: {
        kind: 'not-assessed', scopeIdentity: input.accessScopeIdentity
      } }), 'qualification-not-assessed'],
      [(input) => qualified(input, { access: {
        kind: 'read-write', scopeIdentity: 'another-target'
      } }), 'qualification-not-assessed'],
      [(input) => qualified(input, { exclusiveLock: 'not-assessed' }), 'lock-not-qualified'],
      [(input) => qualified(input, { filesystem: { kind: 'not-assessed' } }), 'qualification-not-assessed'],
      [(input) => qualified(input, { filesystem: { kind: 'unsupported' } }), 'filesystem-unsupported'],
      [(input) => qualified(input, { filesystem: {
        ...qualified(input).filesystem, scopeIdentity: 'another-scope'
      } }), 'qualification-not-assessed'],
      [(input) => qualified(input, { filesystem: {
        ...qualified(input).filesystem, maxCompletePathUtf16Units: 1
      } }), 'path-headroom-insufficient'],
      [(input) => qualified(input, { capacity: {
        availableBytes: 1279, requiredBytes: 256, safetyReserveBytes: 1024
      } }), 'capacity-insufficient'],
      [(input) => qualified(input, { capacity: {
        availableBytes: Number.MAX_SAFE_INTEGER, requiredBytes: Number.MAX_SAFE_INTEGER, safetyReserveBytes: 1
      } }), 'capacity-insufficient'],
      [(input) => qualified(input, { capacity: {
        availableBytes: '4096', requiredBytes: 256, safetyReserveBytes: 1024
      } }), 'qualification-not-assessed'],
      [(input) => qualified(input, { capacity: {
        availableBytes: 4096, requiredBytes: 256, safetyReserveBytes: 0
      } }), 'qualification-not-assessed'],
      [(input) => qualified(input, { publisherSaysSafe: true }), 'qualification-not-assessed'],
      [() => { throw new Error('sensitive-fixture-marker') }, 'qualification-not-assessed']
    ]
    for (const [inspect, reason] of cases) {
      const before = await snapshot(root)
      const planner = createLibraryCreationPlannerTracer({
        targetDirectory: path.join(root, 'Selected'), qualification: { inspect }
      })
      const result = await planner.prepare({ kind: 'review-target' })
      assert.equal(result.state, 'blocked')
      if (result.state !== 'blocked') throw new Error('Expected blocked qualification.')
      assert.equal(result.reason, reason)
      assert.equal(result.confirmable, false)
      assert.equal(JSON.stringify(result).includes('sensitive-fixture-marker'), false)
      assert.deepEqual(await snapshot(root), before)
    }
  } finally {
    assert.ok(path.basename(root).startsWith('dam-library-creation-plan-'))
    await fs.rm(root, { recursive: true, force: true })
  }
}

async function manifestBindingAndMinimumPathUseTheExistingPolicy(): Promise<void> {
  const root = await temporaryRoot()
  try {
    for (const [binding, expected] of [
      ['Assets/Originals', 'ready'],
      ['../escape', 'invalid-manifest-binding'],
      ['models', 'invalid-manifest-binding'],
      ['Originals\u0000bad', 'invalid-manifest-binding'],
      ['\ud800', 'invalid-manifest-binding'],
      ['a'.repeat(180), 'path-headroom-insufficient']
    ]) {
      const before = await snapshot(root)
      const planner = createLibraryCreationPlannerTracer({
        targetDirectory: path.join(root, 'Selected'),
        managedOriginalsRelativePath: binding,
        qualification: { inspect: qualified }
      })
      const result = await planner.prepare({ kind: 'review-target' })
      if (expected === 'ready') assert.equal(result.state, 'ready')
      else {
        assert.equal(result.state, 'blocked')
        if (result.state !== 'blocked') throw new Error('Expected unsafe binding rejection.')
        assert.equal(result.reason, expected)
      }
      assert.deepEqual(await snapshot(root), before)
    }
  } finally {
    assert.ok(path.basename(root).startsWith('dam-library-creation-plan-'))
    await fs.rm(root, { recursive: true, force: true })
  }
}

async function receiptRechecksBindTargetRequirementsAndProposedIdentities(): Promise<void> {
  const root = await temporaryRoot()
  try {
    const target = path.join(root, 'Selected')
    let availableBytes = 4096
    let requiredBytes = 256
    let qualificationGeneration = 'qualification-v1'
    const planner = createLibraryCreationPlannerTracer({
      targetDirectory: target,
      qualification: { inspect(input) {
        return qualified(input, {
          qualificationGeneration,
          capacity: { availableBytes, requiredBytes, safetyReserveBytes: 1024 }
        })
      } }
    })
    const first = requireReady(await planner.prepare({ kind: 'review-target' }))
    const firstIdentities = first.review.identities

    availableBytes = 3800
    const refreshed = requireReady(await planner.inspect({ receipt: first.review.receipt }))
    assert.equal(refreshed.review.receipt, first.review.receipt)
    assert.equal(refreshed.review.identities, firstIdentities)
    assert.equal(refreshed.capacity.availableBytes, 3800,
      'Free bytes are re-observed rather than represented as a reservation.')

    requiredBytes = 257
    const changedRequirement = await planner.inspect({ receipt: first.review.receipt })
    assert.equal(changedRequirement.state, 'blocked')
    if (changedRequirement.state !== 'blocked') throw new Error('Expected stale requirements.')
    assert.equal(changedRequirement.reason, 'review-stale')
    requiredBytes = 256
    assert.equal((await planner.inspect({ receipt: first.review.receipt })).state, 'blocked',
      'A stale receipt cannot revive after evidence returns to its old value.')

    const second = requireReady(await planner.prepare({ kind: 'review-target' }))
    assert.notEqual(second.review.receipt, first.review.receipt)
    assert.notDeepEqual(second.review.identities, firstIdentities)
    qualificationGeneration = 'qualification-v2'
    const changedQualification = await planner.inspect({ receipt: second.review.receipt })
    assert.equal(changedQualification.state, 'blocked')
    if (changedQualification.state !== 'blocked') throw new Error('Expected qualification drift.')
    assert.equal(changedQualification.reason, 'review-stale')

    qualificationGeneration = 'qualification-v2'
    const third = requireReady(await planner.prepare({ kind: 'review-target' }))
    await fs.mkdir(target)
    const targetChanged = await planner.inspect({ receipt: third.review.receipt })
    assert.equal(targetChanged.state, 'blocked')
    if (targetChanged.state !== 'blocked') throw new Error('Expected target drift.')
    assert.equal(targetChanged.reason, 'review-stale')
    await fs.rmdir(target)
    assert.equal((await planner.inspect({ receipt: third.review.receipt })).state, 'blocked')
  } finally {
    assert.ok(path.basename(root).startsWith('dam-library-creation-plan-'))
    await fs.rm(root, { recursive: true, force: true })
  }
}

async function cancellationForgeryAndConcurrentPreparationStayRevoked(): Promise<void> {
  const root = await temporaryRoot()
  try {
    const target = path.join(root, 'Selected')
    let calls = 0
    const planner = createLibraryCreationPlannerTracer({
      targetDirectory: target,
      qualification: { inspect(input) { calls++; return qualified(input) } }
    })
    const ready = requireReady(await planner.prepare({ kind: 'review-target' }))
    assert.equal(calls, 1)

    const forged = await planner.inspect({ receipt: Object.freeze({}) as typeof ready.review.receipt })
    assert.equal(forged.state, 'blocked')
    if (forged.state !== 'blocked') throw new Error('Expected forged receipt rejection.')
    assert.equal(forged.reason, 'unknown-review')
    assert.equal(calls, 1)

    let getterReads = 0
    const accessorRequest = Object.defineProperty({}, 'kind', {
      enumerable: true,
      get() { getterReads++; return 'selection-cancelled' }
    })
    const invalid = await planner.prepare(accessorRequest as never)
    assert.equal(invalid.state, 'blocked')
    assert.equal(getterReads, 0)
    requireReady(await planner.inspect({ receipt: ready.review.receipt }))
    assert.equal(calls, 2, 'Malformed input must not revoke the valid review.')

    const cancelled = await planner.prepare({ kind: 'selection-cancelled' })
    assert.deepEqual(cancelled, {
      state: 'cancelled', confirmable: false, reason: 'selection-cancelled',
      writeAuthority: 'not-issued'
    })
    assert.equal(calls, 2, 'Cancellation performs no qualification work.')
    const afterCancel = await planner.inspect({ receipt: ready.review.receipt })
    assert.equal(afterCancel.state, 'blocked')
    if (afterCancel.state !== 'blocked') throw new Error('Expected cancelled receipt rejection.')
    assert.equal(afterCancel.reason, 'unknown-review')
    assert.equal(calls, 2)

    let markStarted: (() => void) | undefined
    let releaseQualification: (() => void) | undefined
    const started = new Promise<void>((resolve) => { markStarted = resolve })
    const released = new Promise<void>((resolve) => { releaseQualification = resolve })
    const gated = createLibraryCreationPlannerTracer({
      targetDirectory: target,
      qualification: { async inspect(input) {
        markStarted?.()
        await released
        return qualified(input)
      } }
    })
    const pending = gated.prepare({ kind: 'review-target' })
    await started
    assert.equal((await gated.prepare({ kind: 'selection-cancelled' })).state, 'cancelled')
    releaseQualification?.()
    const superseded = await pending
    assert.equal(superseded.state, 'blocked')
    if (superseded.state !== 'blocked') throw new Error('Expected cancelled in-flight review.')
    assert.equal(superseded.reason, 'review-superseded')

    let concurrentCalls = 0
    const concurrent = createLibraryCreationPlannerTracer({
      targetDirectory: target,
      qualification: { inspect(input) { concurrentCalls++; return qualified(input) } }
    })
    const [older, newer] = await Promise.all([
      concurrent.prepare({ kind: 'review-target' }),
      concurrent.prepare({ kind: 'review-target' })
    ])
    assert.equal(older.state, 'blocked')
    if (older.state !== 'blocked') throw new Error('Expected older preparation rejection.')
    assert.equal(older.reason, 'review-superseded')
    assert.equal(newer.state, 'ready')
    assert.equal(concurrentCalls, 1, 'Only the latest concurrent preparation is qualified.')

    const noTarget = createLibraryCreationPlannerTracer({
      targetDirectory: path.join(root, 'MissingParent', 'Selected'),
      qualification: { inspect() { throw new Error('Cancellation must not qualify.') } }
    })
    assert.equal((await noTarget.prepare({ kind: 'selection-cancelled' })).state, 'cancelled')
  } finally {
    assert.ok(path.basename(root).startsWith('dam-library-creation-plan-'))
    await fs.rm(root, { recursive: true, force: true })
  }
}

async function externalMutationAndConstructorRetargetingCannotProduceAuthority(): Promise<void> {
  const root = await temporaryRoot()
  try {
    const target = path.join(root, 'Selected')
    let actorSnapshot: readonly unknown[] | undefined
    const planner = createLibraryCreationPlannerTracer({
      targetDirectory: target,
      qualification: { async inspect(input) {
        await fs.mkdir(target)
        actorSnapshot = await snapshot(root)
        return qualified(input)
      } }
    })
    const result = await planner.prepare({ kind: 'review-target' })
    assert.equal(result.state, 'blocked')
    if (result.state !== 'blocked') throw new Error('Expected externally changed target.')
    assert.equal(result.reason, 'target-changed')
    assert.deepEqual(await snapshot(root), actorSnapshot,
      'Only the explicit test actor may create the changed target; planning never cleans it.')

    const other = path.join(root, 'Other')
    await fs.mkdir(other)
    await fs.writeFile(path.join(other, 'existing.txt'), 'generated')
    const qualification = { inspect: (input: LibraryCreationQualificationInput) => qualified(input) }
    const mutable = {
      targetDirectory: path.join(root, 'BoundTarget'),
      managedOriginalsRelativePath: 'Originals',
      qualification
    }
    const bound = createLibraryCreationPlannerTracer(mutable)
    mutable.targetDirectory = other
    mutable.managedOriginalsRelativePath = '../escape'
    qualification.inspect = () => { throw new Error('A replaced Adapter method must not be used.') }
    const boundResult = requireReady(await bound.prepare({ kind: 'review-target' }))
    assert.equal(boundResult.review.targetState, 'missing')
    assert.equal(JSON.stringify(boundResult).includes(root), false)

    const another = createLibraryCreationPlannerTracer({
      targetDirectory: path.join(root, 'AnotherTarget'),
      qualification: { inspect: qualified }
    })
    const anotherResult = requireReady(await another.prepare({ kind: 'review-target' }))
    const cross = await another.inspect({ receipt: boundResult.review.receipt })
    assert.equal(cross.state, 'blocked')
    if (cross.state !== 'blocked') throw new Error('Expected cross-planner receipt rejection.')
    assert.equal(cross.reason, 'unknown-review')
    requireReady(await another.inspect({ receipt: anotherResult.review.receipt }))
  } finally {
    assert.ok(path.basename(root).startsWith('dam-library-creation-plan-'))
    await fs.rm(root, { recursive: true, force: true })
  }
}

async function parentNamespaceInspectionIsBounded(): Promise<void> {
  const root = await temporaryRoot()
  try {
    const expected: string[] = []
    for (let offset = 0; offset < 4097; offset += 128) {
      const names = Array.from({ length: Math.min(128, 4097 - offset) },
        (_unused, index) => `entry-${String(offset + index).padStart(4, '0')}`)
      expected.push(...names)
      await Promise.all(names.map((name) => fs.writeFile(path.join(root, name), '')))
    }
    const beforeStat = await fs.lstat(root, { bigint: true })
    let calls = 0
    const planner = createLibraryCreationPlannerTracer({
      targetDirectory: path.join(root, 'Selected'),
      qualification: { inspect(input) { calls++; return qualified(input) } }
    })
    const result = await planner.prepare({ kind: 'review-target' })
    assert.equal(result.state, 'blocked')
    if (result.state !== 'blocked') throw new Error('Expected bounded namespace rejection.')
    assert.equal(result.reason, 'namespace-not-assessed')
    assert.equal(calls, 0)
    assert.deepEqual((await fs.readdir(root)).sort(), expected.sort())
    const afterStat = await fs.lstat(root, { bigint: true })
    assert.equal(afterStat.ino, beforeStat.ino)
    assert.equal(afterStat.mtimeNs, beforeStat.mtimeNs)
  } finally {
    assert.ok(path.basename(root).startsWith('dam-library-creation-plan-'))
    await fs.rm(root, { recursive: true, force: true })
  }
}

await aMissingTargetProducesOnlyAReviewedPlan()
await emptyAndBlockedTargetsStayUntouched()
await inaccessibleAndLinkedAncestorTargetsFailClosed()
await targetPlatformPolicyIsAnInjectedBoundary()
await onlyExplicitQualificationAndCapacityPermitReview()
await manifestBindingAndMinimumPathUseTheExistingPolicy()
await receiptRechecksBindTargetRequirementsAndProposedIdentities()
await cancellationForgeryAndConcurrentPreparationStayRevoked()
await externalMutationAndConstructorRetargetingCannotProduceAuthority()
await parentNamespaceInspectionIsBounded()
console.log('library-creation-planner passed')
