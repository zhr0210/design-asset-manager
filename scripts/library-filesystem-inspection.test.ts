import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { createLibraryFilesystemTracer, type LibraryFilesystemQualificationAdapter } from
  '../src/main/library-lifecycle/library-filesystem.tracer'

type FixtureEntry = readonly [relativePath: string, kind: string, size: number]

async function snapshotFixture(root: string): Promise<readonly FixtureEntry[]> {
  const output: FixtureEntry[] = []
  async function visit(directory: string, parent = ''): Promise<void> {
    const entries = await fs.readdir(directory, { withFileTypes: true })
    entries.sort((left, right) => left.name.localeCompare(right.name))
    for (const entry of entries) {
      const relative = parent ? `${parent}/${entry.name}` : entry.name
      const absolute = path.join(directory, entry.name)
      const stat = await fs.lstat(absolute)
      const kind = stat.isSymbolicLink() ? 'link' : stat.isDirectory() ? 'directory' : 'file'
      output.push([relative, kind, stat.size])
      if (stat.isDirectory() && !stat.isSymbolicLink()) await visit(absolute, relative)
    }
  }
  await visit(root)
  return output
}

const prefix = path.join(os.tmpdir(), 'dam-library-filesystem-')
const taskRoot = await fs.mkdtemp(prefix)
const outsideRoot = await fs.mkdtemp(prefix)
try {
  const control = path.join(taskRoot, '.dam')
  const originals = path.join(taskRoot, 'Originals')
  await fs.mkdir(control)
  await fs.mkdir(originals)
  await fs.mkdir(path.join(taskRoot, 'unrelated'))
  await fs.writeFile(path.join(taskRoot, 'unrelated', 'sentinel.bin'), 'fixture')
  await fs.mkdir(path.join(outsideRoot, 'Managed'))
  await fs.symlink(outsideRoot, path.join(taskRoot, 'unrelated', 'outside-link'),
    process.platform === 'win32' ? 'junction' : 'dir')

  const before = await snapshotFixture(taskRoot)
  const qualificationInputs: unknown[] = []
  const fixture = createLibraryFilesystemTracer({
    libraryRootDirectory: taskRoot,
    libraryControlDirectory: control,
    managedOriginalsDirectory: originals,
    qualification: {
      inspect(input) {
        qualificationInputs.push(input)
        return {
          kind: 'qualified',
          scopeIdentity: input.scopeIdentity,
          maxComponentUtf8Bytes: 255,
          maxCompletePathUtf16Units: 4096,
          atomicReplace: 'qualified',
          durableCommit: 'qualified',
          mountBoundary: 'qualified'
        }
      }
    }
  })

  assert.deepEqual(await fixture.libraryStart.inspect({
    kind: 'inspect-candidate', candidate: fixture.candidate
  }), {
    candidate: fixture.candidate,
    state: 'not-assessed',
    reason: 'filesystem-observed-evidence-pending',
    writeAuthority: 'not-issued'
  })
  assert.deepEqual(await snapshotFixture(taskRoot), before,
    'Read-only observation must not change selected or unrelated fixture entries.')
  assert.equal(qualificationInputs.length, 1)
  assert.deepEqual(Object.keys(qualificationInputs[0] as object).sort(), [
    'platform', 'scopeIdentity'
  ])
  assert.equal(JSON.stringify(qualificationInputs).includes(taskRoot), false,
    'Qualification lookup receives an opaque volume identity, never a root path.')

  async function inspect(
    qualification: LibraryFilesystemQualification,
    changes: Partial<{
      libraryRootDirectory: string
      libraryControlDirectory: string
      managedOriginalsDirectory: string
    }> = {}
  ) {
    const next = createLibraryFilesystemTracer({
      libraryRootDirectory: changes.libraryRootDirectory ?? taskRoot,
      libraryControlDirectory: changes.libraryControlDirectory ?? control,
      managedOriginalsDirectory: changes.managedOriginalsDirectory ?? originals,
      qualification: { inspect: qualification }
    })
    return next.libraryStart.inspect({ kind: 'inspect-candidate', candidate: next.candidate })
  }

  type LibraryFilesystemQualification = LibraryFilesystemQualificationAdapter['inspect']

  const qualified = (input: { scopeIdentity: string }, overrides: Record<string, unknown> = {}) => ({
    kind: 'qualified',
    scopeIdentity: input.scopeIdentity,
    maxComponentUtf8Bytes: 255,
    maxCompletePathUtf16Units: 4096,
    atomicReplace: 'qualified',
    durableCommit: 'qualified',
    mountBoundary: 'qualified',
    ...overrides
  })

  for (const [qualification, state, reason] of [
    [() => ({ kind: 'not-assessed' }), 'not-assessed', 'filesystem-capability-not-assessed'],
    [() => ({ kind: 'unsupported' }), 'unsupported', 'filesystem-unsupported'],
    [(input: { scopeIdentity: string }) => qualified(input, { scopeIdentity: 'wrong-scope' }),
      'not-assessed', 'filesystem-capability-not-assessed'],
    [(input: { scopeIdentity: string }) => qualified(input, { atomicReplace: 'unsupported' }),
      'unsupported', 'filesystem-unsupported'],
    [(input: { scopeIdentity: string }) => qualified(input, { durableCommit: 'not-assessed' }),
      'not-assessed', 'filesystem-capability-not-assessed'],
    [(input: { scopeIdentity: string }) => qualified(input, { mountBoundary: 'unsupported' }),
      'unsupported', 'filesystem-unsupported'],
    [(input: { scopeIdentity: string }) => qualified(input, { mountBoundary: 'not-assessed' }),
      'not-assessed', 'filesystem-capability-not-assessed'],
    [(input: { scopeIdentity: string }) => qualified(input, { maxComponentUtf8Bytes: 2 }),
      'unsupported', 'filesystem-unsupported'],
    [(input: { scopeIdentity: string }) => qualified(input, { maxCompletePathUtf16Units: 1 }),
      'unsupported', 'filesystem-unsupported'],
    [(input: { scopeIdentity: string }) => ({ ...qualified(input), driveLabel: 'fixture', writable: true }),
      'not-assessed', 'filesystem-capability-not-assessed'],
    [() => { throw new Error('sensitive-fixture-marker') },
      'not-assessed', 'filesystem-capability-not-assessed']
  ] as const) {
    const result = await inspect(qualification as LibraryFilesystemQualification)
    assert.equal(result.state, state)
    assert.equal(result.reason, reason)
    assert.equal(result.writeAuthority, 'not-issued')
  }

  const roleFile = path.join(taskRoot, 'role-file')
  await fs.writeFile(roleFile, 'fixture')
  const missing = path.join(taskRoot, 'missing-role')
  const nestedManaged = path.join(control, 'nested-managed')
  await fs.mkdir(nestedManaged)
  const linkedControl = path.join(taskRoot, 'linked-control')
  await fs.symlink(control, linkedControl, process.platform === 'win32' ? 'junction' : 'dir')
  const escapedManaged = path.join(taskRoot, 'unrelated', 'outside-link', 'Managed')
  const caseControl = path.join(taskRoot, 'CaseRole')
  const caseManaged = path.join(taskRoot, 'caserole')
  await fs.mkdir(caseControl)
  await fs.mkdir(caseManaged).catch((error: unknown) => {
    if (!(error instanceof Error && 'code' in error && error.code === 'EEXIST')) throw error
  })
  const beforeStatic = await snapshotFixture(taskRoot)
  const staticCases = [
    [{ managedOriginalsDirectory: missing }, 'unavailable'],
    [{ managedOriginalsDirectory: roleFile }, 'recovery-required'],
    [{ managedOriginalsDirectory: control }, 'recovery-required'],
    [{ managedOriginalsDirectory: nestedManaged }, 'recovery-required'],
    [{ libraryControlDirectory: linkedControl }, 'recovery-required'],
    [{ managedOriginalsDirectory: escapedManaged }, 'recovery-required'],
    [{ libraryControlDirectory: caseControl, managedOriginalsDirectory: caseManaged }, 'recovery-required'],
    [{ libraryRootDirectory: roleFile, libraryControlDirectory: path.join(roleFile, '.dam') }, 'recovery-required']
  ] as const
  for (const [changes, state] of staticCases) {
    const calls: unknown[] = []
    const result = await inspect((input) => { calls.push(input); return qualified(input) }, changes)
    assert.equal(result.state, state)
    assert.equal(calls.length, 0, 'Invalid/missing role shapes are rejected before qualification lookup.')
  }
  assert.deepEqual(await snapshotFixture(taskRoot), beforeStatic,
    'Static failure inspection is read-only.')

  const longManaged = path.join(taskRoot, 'm'.repeat(201))
  await fs.mkdir(longManaged)
  assert.equal((await inspect((input) => qualified(input), {
    managedOriginalsDirectory: longManaged
  })).state, 'unsupported')

  const beforeChange = await snapshotFixture(taskRoot)
  const replacement = path.join(taskRoot, 'Originals-replaced')
  const changed = await inspect(async (input) => {
    await fs.rename(originals, replacement)
    await fs.mkdir(originals)
    return qualified(input)
  })
  assert.equal(changed.state, 'recovery-required',
    'Replacing a selected role during inspection invalidates the observation.')
  assert.notDeepEqual(await snapshotFixture(taskRoot), beforeChange,
    'Only the injected test actor mutates the changed-target fixture.')
} finally {
  assert.ok(taskRoot.startsWith(prefix))
  assert.ok(outsideRoot.startsWith(prefix))
  await fs.rm(taskRoot, { recursive: true, force: true })
  await fs.rm(outsideRoot, { recursive: true, force: true })
}

console.log('library-filesystem-inspection passed')
