import assert from 'node:assert/strict'
import { spawn, type ChildProcess } from 'node:child_process'
import { createHash, generateKeyPairSync, sign } from 'node:crypto'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createInMemoryModelCatalogAdmissionTracer } from
  '../src/main/model-library/model-catalog-admission.tracer'
import type { AdmittedModelCatalog } from
  '../src/main/model-library/model-catalog-admission.tracer'
import type {
  ModelArtifactByteSource,
  ModelArtifactSourceEntry
} from '../src/main/model-library/transactional-model-library.tracer'
import { createModelStorageAuthorityTracer } from
  '../src/main/model-library/model-storage-authority.tracer'

const FIXTURE_PUBLIC_KEY_SPKI_BASE64 =
  'MCowBQYDK2VwAyEAAa0KDW723N95GQk91vidcoQqGgQw0uMz7VrcXFubrK0='
const FIXTURE_SIGNATURE_BASE64 =
  'FzC6cDw2vQnwCI57JMirmQUR1b8+qV+DvbFYebmDt6TJp10DH7ERYO8B85PRiKg8SsPDWYQFjOQoWm1tLDa7BA=='
const fixturePayload = {
  schemaVersion: 1,
  catalogId: 'official-model-catalog',
  keyId: 'test-root-2026',
  sequence: '42',
  trustVerifiedAt: '2026-08-12T00:00:00.000Z',
  artifacts: [{
    manifestId: 'qwen3-vl-4b-q4-k-m@2026-08',
    familyId: 'qwen3-vl',
    checkpointId: 'qwen3-vl-4b-instruct',
    variantId: 'qwen3-vl-4b-instruct-q4-k-m',
    displayName: 'Qwen3-VL 4B Q4_K_M',
    immutableRevision:
      'sha256:1111111111111111111111111111111111111111111111111111111111111111',
    files: [{
      path: 'tokenizer/tokenizer.json',
      role: 'tokenizer',
      format: 'json',
      sizeBytes: 200,
      sha256: '3333333333333333333333333333333333333333333333333333333333333333'
    }, {
      path: 'weights/model.gguf',
      role: 'weights',
      format: 'gguf',
      sizeBytes: 1_000,
      sha256: '2222222222222222222222222222222222222222222222222222222222222222'
    }],
    requiredAcknowledgements: [{
      id: 'license:qwen3-vl-4b:2026-08',
      kind: 'license',
      label: 'Qwen model license'
    }]
  }]
}

const admission = createInMemoryModelCatalogAdmissionTracer({
  trustRoots: [{
    catalogId: 'official-model-catalog',
    keyId: 'test-root-2026',
    publicKeySpkiBase64: FIXTURE_PUBLIC_KEY_SPKI_BASE64
  }],
  nowEpochMs: () => Date.parse('2026-08-12T12:00:00.000Z')
})
const admitted = admission.admit({
  catalogId: 'official-model-catalog',
  keyId: 'test-root-2026',
  payload: fixturePayload,
  signatureBase64: FIXTURE_SIGNATURE_BASE64
})
assert.equal(admitted.kind, 'admitted')
if (admitted.kind !== 'admitted') throw new Error('Expected a signed test Catalog.')

if (process.argv[2] === '--child-hold-storage') {
  await holdStorageInChild(process.argv[3], process.argv[4])
} else {
  await explicitlyProvisionedStorageOpensAsARevocableSession()
  await onlyOneWriterSessionOwnsTheProvisionedRoot()
  await anIndependentProcessCannotStealWriterOwnership()
  await abruptProcessExitReleasesWriterOwnership()
  await identityAndProvisioningFailuresStayPathFree()
  await unsafeProvisionTargetsFailClosed()
  await failedProvisioningReleasesItsOwnedClaim()
  await failedProvisioningNeverDeletesForeignReservedEntries()
  await unavailableUnsafeAndReadOnlyRootsHaveDistinctResults()
  await readOnlyInternalWriteBoundariesAreRejectedBeforeOpen()
  await unsupportedSchemaAndIntegrityFailureStayDistinct()
  await partiallyMissingManagedRootIsAnIntegrityFailure()
  await replacingTheRootRevokesTheOldCapability()
  await losingAuthorityBeforeSourceEntryNeverTouchesReplacementStorage()
  await losingAuthorityMidInstallStopsBeforeLogicalCommit()
  await closeRevokesNewWorkAndDrainsAcceptedInstall()
  await verifiedStorageSurvivesAuthorityCloseAndReopen()
  await blockedRecoveryDoesNotEscapeAsAnOpenedSession()
  console.log('model-library-storage-authority-tracer passed')
}

async function explicitlyProvisionedStorageOpensAsARevocableSession(): Promise<void> {
  const rootDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'dam-model-storage-authority-'))
  try {
    const tracer = createModelStorageAuthorityTracer({
      rootDirectory,
      catalog: admitted.catalog,
      byteSource: unavailableSource(),
      createActivityId: mustNotCreate('activity'),
      createStorageRecordId: mustNotCreate('storage record'),
      createStorageIdentity: () => 'model-storage-root:test-20260812'
    })

    assert.deepEqual(
      await tracer.authority.provision(Object.freeze({}) as never),
      {
        ok: false,
        error: { code: 'STORAGE_TARGET_INVALID', retry: 'not-retryable' }
      }
    )

    const provisioned = await tracer.authority.provision(tracer.target)
    assert.equal(provisioned.ok, true)
    if (!provisioned.ok) throw new Error('Expected an eligible empty target to be provisioned.')
    assert.doesNotMatch(JSON.stringify(provisioned), /Users|rootDirectory|localPath|filePath/i)
    assert.equal(JSON.stringify(provisioned).includes(rootDirectory), false)

    const opened = await tracer.authority.open(provisioned.value.root)
    assert.equal(opened.ok, true)
    if (!opened.ok) throw new Error('Expected the exact provisioned root to open.')

    const summary = await opened.value.session.library.summarize({ kind: 'library' })
    assert.equal(summary.ok, true)
    if (!summary.ok) throw new Error('Expected the authority-held Model Library summary.')
    assert.equal(summary.value.artifacts.length, 1)
    assert.equal(summary.value.artifacts[0].lifecycle.kind, 'catalog-only')
    assert.equal(JSON.stringify(summary).includes(rootDirectory), false)

    await opened.value.session.close()
    await opened.value.session.close()

    assert.deepEqual(
      await opened.value.session.library.summarize({ kind: 'library' }),
      {
        ok: false,
        error: {
          code: 'STORAGE_AUTHORITY_LOST',
          retry: 'after-user-action'
        }
      }
    )
    assert.deepEqual(
      await opened.value.session.library.install({
        artifact: {
          catalogId: 'official-model-catalog',
          manifestId: 'qwen3-vl-4b-q4-k-m@2026-08'
        },
        reviewFingerprint: `review:${'0'.repeat(64)}`,
        decision: 'install-exact-reviewed-artifact',
        acceptedAcknowledgements: []
      }),
      {
        ok: false,
        error: {
          code: 'STORAGE_AUTHORITY_LOST',
          retry: 'after-user-action'
        }
      }
    )
  } finally {
    await fs.rm(rootDirectory, { recursive: true, force: true })
  }
}

async function onlyOneWriterSessionOwnsTheProvisionedRoot(): Promise<void> {
  const rootDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'dam-model-storage-writer-'))
  try {
    const tracer = createModelStorageAuthorityTracer({
      rootDirectory,
      catalog: admitted.catalog,
      byteSource: unavailableSource(),
      createActivityId: mustNotCreate('activity'),
      createStorageRecordId: mustNotCreate('storage record'),
      createStorageIdentity: () => 'model-storage-root:writer-20260812'
    })
    const provisioned = await tracer.authority.provision(tracer.target)
    assert.equal(provisioned.ok, true)
    if (!provisioned.ok) throw new Error('Expected writer root provisioning.')

    const first = await tracer.authority.open(provisioned.value.root)
    assert.equal(first.ok, true)
    if (!first.ok) throw new Error('Expected the first writer session.')

    assert.deepEqual(await tracer.authority.open(provisioned.value.root), {
      ok: false,
      error: {
        code: 'STORAGE_BUSY',
        retry: 'after-session-closes'
      }
    })

    await first.value.session.close()
    const reopened = await tracer.authority.open(provisioned.value.root)
    assert.equal(reopened.ok, true)
    if (!reopened.ok) throw new Error('Expected ownership after the first session closes.')
    await reopened.value.session.close()
  } finally {
    await fs.rm(rootDirectory, { recursive: true, force: true })
  }
}

async function anIndependentProcessCannotStealWriterOwnership(): Promise<void> {
  const rootDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'dam-model-storage-process-'))
  let child: ChildProcess | undefined
  try {
    const tracer = createTracer(
      rootDirectory,
      'model-storage-root:process-20260812'
    )
    const provisioned = await tracer.authority.provision(tracer.target)
    assert.equal(provisioned.ok, true)
    if (!provisioned.ok) throw new Error('Expected process root provisioning.')

    child = spawn(
      process.execPath,
      [
        fileURLToPath(import.meta.url),
        '--child-hold-storage',
        rootDirectory,
        provisioned.value.root
      ],
      {
        env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
        stdio: ['pipe', 'pipe', 'ignore'],
        shell: false
      }
    )
    await waitForChildLine(child, 'READY')

    assert.deepEqual(await tracer.authority.open(provisioned.value.root), {
      ok: false,
      error: {
        code: 'STORAGE_BUSY',
        retry: 'after-session-closes'
      }
    })

    child.stdin?.end('CLOSE\n')
    await waitForChildExit(child)
    child = undefined

    const reopened = await tracer.authority.open(provisioned.value.root)
    assert.equal(reopened.ok, true)
    if (!reopened.ok) throw new Error('Expected ownership after child close.')
    await reopened.value.session.close()
  } finally {
    if (child && child.exitCode === null) child.kill('SIGKILL')
    await fs.rm(rootDirectory, { recursive: true, force: true })
  }
}

async function abruptProcessExitReleasesWriterOwnership(): Promise<void> {
  const rootDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'dam-model-storage-crash-'))
  let child: ChildProcess | undefined
  try {
    const tracer = createTracer(
      rootDirectory,
      'model-storage-root:crash-20260812'
    )
    const provisioned = await tracer.authority.provision(tracer.target)
    assert.equal(provisioned.ok, true)
    if (!provisioned.ok) throw new Error('Expected crash root provisioning.')

    child = spawn(
      process.execPath,
      [
        fileURLToPath(import.meta.url),
        '--child-hold-storage',
        rootDirectory,
        provisioned.value.root
      ],
      {
        env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
        stdio: ['pipe', 'pipe', 'ignore'],
        shell: false
      }
    )
    await waitForChildLine(child, 'READY')
    assert.equal(child.kill('SIGKILL'), true)
    await waitForChildTermination(child)
    child = undefined

    const reopened = await tracer.authority.open(provisioned.value.root)
    assert.equal(reopened.ok, true)
    if (!reopened.ok) throw new Error('Expected writer ownership after abrupt child exit.')
    const summary = await reopened.value.session.library.summarize({ kind: 'library' })
    assert.equal(summary.ok, true)
    await reopened.value.session.close()
  } finally {
    if (child && child.exitCode === null) child.kill('SIGKILL')
    await fs.rm(rootDirectory, { recursive: true, force: true })
  }
}

async function identityAndProvisioningFailuresStayPathFree(): Promise<void> {
  const rootDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'dam-model-storage-identity-'))
  try {
    const tracer = createTracer(
      rootDirectory,
      'model-storage-root:identity-20260812'
    )
    const beforeProvision = await tracer.authority.open(
      'model-storage-root:identity-20260812' as never
    )
    assert.deepEqual(beforeProvision, {
      ok: false,
      error: { code: 'STORAGE_NOT_PROVISIONED', retry: 'after-user-action' }
    })

    const provisioned = await tracer.authority.provision(tracer.target)
    assert.equal(provisioned.ok, true)
    if (!provisioned.ok) throw new Error('Expected identity root provisioning.')

    const wrongIdentity = await tracer.authority.open(
      'model-storage-root:different-identity' as never
    )
    assert.deepEqual(wrongIdentity, {
      ok: false,
      error: { code: 'WRONG_STORAGE_IDENTITY', retry: 'not-retryable' }
    })
    assert.equal(JSON.stringify(wrongIdentity).includes(rootDirectory), false)

    const opened = await tracer.authority.open(provisioned.value.root)
    assert.equal(opened.ok, true)
    if (!opened.ok) throw new Error('Wrong identity must not damage the exact root.')
    await opened.value.session.close()
  } finally {
    await fs.rm(rootDirectory, { recursive: true, force: true })
  }
}

async function unsafeProvisionTargetsFailClosed(): Promise<void> {
  const parent = await fs.mkdtemp(path.join(os.tmpdir(), 'dam-model-storage-unsafe-'))
  try {
    const nonEmptyRoot = path.join(parent, 'non-empty')
    await fs.mkdir(nonEmptyRoot)
    await fs.writeFile(path.join(nonEmptyRoot, 'foreign.txt'), 'foreign', 'utf8')
    const nonEmptyTracer = createTracer(
      nonEmptyRoot,
      'model-storage-root:non-empty-20260812'
    )
    assert.deepEqual(
      await nonEmptyTracer.authority.provision(nonEmptyTracer.target),
      {
        ok: false,
        error: {
          code: 'STORAGE_TARGET_NOT_EMPTY',
          retry: 'after-user-action'
        }
      }
    )

    const actualDirectory = path.join(parent, 'actual')
    const symbolicTarget = path.join(parent, 'symbolic')
    await fs.mkdir(actualDirectory)
    await fs.symlink(actualDirectory, symbolicTarget, 'dir')
    const symbolicTracer = createTracer(
      symbolicTarget,
      'model-storage-root:symbolic-20260812'
    )
    const symbolicResult = await symbolicTracer.authority.provision(symbolicTracer.target)
    assert.deepEqual(symbolicResult, {
      ok: false,
      error: { code: 'STORAGE_TARGET_UNSAFE', retry: 'not-retryable' }
    })
    assert.equal(JSON.stringify(symbolicResult).includes(parent), false)
  } finally {
    await fs.rm(parent, { recursive: true, force: true })
  }
}

async function unavailableUnsafeAndReadOnlyRootsHaveDistinctResults(): Promise<void> {
  const parent = await fs.mkdtemp(path.join(os.tmpdir(), 'dam-model-storage-states-'))
  try {
    const missingRoot = path.join(parent, 'missing')
    const missingTracer = createTracer(
      missingRoot,
      'model-storage-root:missing-20260812'
    )
    assert.deepEqual(
      await missingTracer.authority.open(
        'model-storage-root:missing-20260812' as never
      ),
      {
        ok: false,
        error: { code: 'STORAGE_UNAVAILABLE', retry: 'after-user-action' }
      }
    )

    const actualRoot = path.join(parent, 'actual')
    const symbolicRoot = path.join(parent, 'symbolic')
    await fs.mkdir(actualRoot)
    await fs.symlink(actualRoot, symbolicRoot, 'dir')
    const symbolicTracer = createTracer(
      symbolicRoot,
      'model-storage-root:symbolic-open-20260812'
    )
    assert.deepEqual(
      await symbolicTracer.authority.open(
        'model-storage-root:symbolic-open-20260812' as never
      ),
      {
        ok: false,
        error: { code: 'STORAGE_UNSAFE', retry: 'not-retryable' }
      }
    )

    const readOnlyRoot = path.join(parent, 'read-only')
    await fs.mkdir(readOnlyRoot)
    const readOnlyTracer = createTracer(
      readOnlyRoot,
      'model-storage-root:read-only-20260812'
    )
    const provisioned = await readOnlyTracer.authority.provision(readOnlyTracer.target)
    assert.equal(provisioned.ok, true)
    if (!provisioned.ok) throw new Error('Expected read-only fixture provisioning.')
    await fs.chmod(readOnlyRoot, 0o500)
    try {
      assert.deepEqual(
        await readOnlyTracer.authority.open(provisioned.value.root),
        {
          ok: false,
          error: { code: 'STORAGE_READ_ONLY', retry: 'after-user-action' }
        }
      )
    } finally {
      await fs.chmod(readOnlyRoot, 0o700)
    }
  } finally {
    await fs.rm(parent, { recursive: true, force: true })
  }
}

async function failedProvisioningReleasesItsOwnedClaim(): Promise<void> {
  const rootDirectory = await fs.mkdtemp(
    path.join(os.tmpdir(), 'dam-model-storage-provision-retry-')
  )
  try {
    const invalidIdentityTracer = createModelStorageAuthorityTracer({
      rootDirectory,
      catalog: admitted.catalog,
      byteSource: unavailableSource(),
      createActivityId: mustNotCreate('activity'),
      createStorageRecordId: mustNotCreate('storage record'),
      createStorageIdentity: () => 'invalid storage identity'
    })
    assert.deepEqual(
      await invalidIdentityTracer.authority.provision(
        invalidIdentityTracer.target
      ),
      {
        ok: false,
        error: { code: 'STORAGE_TARGET_UNSAFE', retry: 'not-retryable' }
      }
    )

    const retryTracer = createTracer(
      rootDirectory,
      'model-storage-root:retry-20260812'
    )
    const retried = await retryTracer.authority.provision(retryTracer.target)
    assert.equal(
      retried.ok,
      true,
      'A failed provision must release only its owned claim so a valid retry can succeed.'
    )
  } finally {
    await fs.rm(rootDirectory, { recursive: true, force: true })
  }
}

async function failedProvisioningNeverDeletesForeignReservedEntries(): Promise<void> {
  for (const collision of [
    'foreign-control-entry',
    'foreign-authority-database'
  ] as const) {
    const rootDirectory = await fs.mkdtemp(
      path.join(os.tmpdir(), `dam-model-storage-${collision}-`)
    )
    try {
      const collidingInput = {
        rootDirectory,
        catalog: admitted.catalog,
        byteSource: unavailableSource(),
        createActivityId: mustNotCreate('activity'),
        createStorageRecordId: mustNotCreate('storage record'),
        createStorageIdentity: () => `model-storage-root:${collision}`,
        tracerOnlyProvisionCollision: collision
      }
      const collidingTracer = createModelStorageAuthorityTracer(collidingInput)
      assert.deepEqual(
        await collidingTracer.authority.provision(collidingTracer.target),
        {
          ok: false,
          error: {
            code: 'STORAGE_TARGET_NOT_EMPTY',
            retry: 'after-user-action'
          }
        }
      )

      const retryTracer = createTracer(
        rootDirectory,
        `model-storage-root:${collision}-retry`
      )
      assert.deepEqual(
        await retryTracer.authority.provision(retryTracer.target),
        {
          ok: false,
          error: {
            code: 'STORAGE_TARGET_NOT_EMPTY',
            retry: 'after-user-action'
          }
        },
        'The failed attempt must leave a foreign reserved entry untouched.'
      )
    } finally {
      await fs.rm(rootDirectory, { recursive: true, force: true })
    }
  }
}

async function readOnlyInternalWriteBoundariesAreRejectedBeforeOpen(): Promise<void> {
  for (const fixture of [
    'model-staging-read-only',
    'authority-sqlite-read-only'
  ] as const) {
    const rootDirectory = await fs.mkdtemp(
      path.join(os.tmpdir(), `dam-model-storage-${fixture}-`)
    )
    try {
      const input = {
        rootDirectory,
        catalog: admitted.catalog,
        byteSource: unavailableSource(),
        createActivityId: mustNotCreate('activity'),
        createStorageRecordId: mustNotCreate('storage record'),
        createStorageIdentity: () => `model-storage-root:${fixture}`,
        tracerOnlyProvisionedState: fixture
      }
      const tracer = createModelStorageAuthorityTracer(input)
      const provisioned = await tracer.authority.provision(tracer.target)
      assert.equal(provisioned.ok, true)
      if (!provisioned.ok) throw new Error('Expected read-only fixture provisioning.')
      assert.deepEqual(await tracer.authority.open(provisioned.value.root), {
        ok: false,
        error: { code: 'STORAGE_READ_ONLY', retry: 'after-user-action' }
      })
    } finally {
      await fs.rm(rootDirectory, { recursive: true, force: true })
    }
  }
}

async function unsupportedSchemaAndIntegrityFailureStayDistinct(): Promise<void> {
  const fixtures = [
    {
      state: 'authority-schema-v2' as const,
      expectedCode: 'STORAGE_SCHEMA_UNSUPPORTED'
    },
    {
      state: 'authority-integrity-invalid' as const,
      expectedCode: 'STORAGE_INTEGRITY_FAILED'
    }
  ]
  for (const fixture of fixtures) {
    const rootDirectory = await fs.mkdtemp(
      path.join(os.tmpdir(), `dam-model-storage-${fixture.state}-`)
    )
    try {
      const input = {
        rootDirectory,
        catalog: admitted.catalog,
        byteSource: unavailableSource(),
        createActivityId: mustNotCreate('activity'),
        createStorageRecordId: mustNotCreate('storage record'),
        createStorageIdentity: () => `model-storage-root:${fixture.state}`,
        tracerOnlyProvisionedState: fixture.state
      }
      const tracer = createModelStorageAuthorityTracer(input)
      const provisioned = await tracer.authority.provision(tracer.target)
      assert.equal(provisioned.ok, true)
      if (!provisioned.ok) throw new Error('Expected authority-state fixture provisioning.')
      const result = await tracer.authority.open(provisioned.value.root)
      assert.deepEqual(result, {
        ok: false,
        error: { code: fixture.expectedCode, retry: 'after-user-action' }
      })
      const serialized = JSON.stringify(result)
      assert.equal(serialized.includes(rootDirectory), false)
      assert.doesNotMatch(serialized, /sqlite|pragma|table|exception|stack/i)
    } finally {
      await fs.rm(rootDirectory, { recursive: true, force: true })
    }
  }
}

async function partiallyMissingManagedRootIsAnIntegrityFailure(): Promise<void> {
  const rootDirectory = await fs.mkdtemp(
    path.join(os.tmpdir(), 'dam-model-storage-partial-root-')
  )
  try {
    const input = {
      rootDirectory,
      catalog: admitted.catalog,
      byteSource: unavailableSource(),
      createActivityId: mustNotCreate('activity'),
      createStorageRecordId: mustNotCreate('storage record'),
      createStorageIdentity: () => 'model-storage-root:partial-20260812',
      tracerOnlyProvisionedState: 'model-control-missing' as const
    }
    const tracer = createModelStorageAuthorityTracer(input)
    const provisioned = await tracer.authority.provision(tracer.target)
    assert.equal(provisioned.ok, true)
    if (!provisioned.ok) throw new Error('Expected partial-root fixture provisioning.')
    const result = await tracer.authority.open(provisioned.value.root)
    assert.deepEqual(result, {
      ok: false,
      error: {
        code: 'STORAGE_INTEGRITY_FAILED',
        retry: 'after-user-action'
      }
    })
    assert.equal(JSON.stringify(result).includes(rootDirectory), false)
  } finally {
    await fs.rm(rootDirectory, { recursive: true, force: true })
  }
}

async function replacingTheRootRevokesTheOldCapability(): Promise<void> {
  const parent = await fs.mkdtemp(path.join(os.tmpdir(), 'dam-model-storage-replaced-'))
  const rootDirectory = path.join(parent, 'selected-root')
  const displacedRoot = path.join(parent, 'displaced-root')
  await fs.mkdir(rootDirectory)
  let oldSession: Awaited<ReturnType<ReturnType<typeof createTracer>['authority']['open']>> | undefined
  try {
    const oldTracer = createTracer(
      rootDirectory,
      'model-storage-root:old-20260812'
    )
    const oldProvisioned = await oldTracer.authority.provision(oldTracer.target)
    assert.equal(oldProvisioned.ok, true)
    if (!oldProvisioned.ok) throw new Error('Expected old root provisioning.')
    const oldOpened = await oldTracer.authority.open(oldProvisioned.value.root)
    assert.equal(oldOpened.ok, true)
    if (!oldOpened.ok) throw new Error('Expected old root opening.')
    oldSession = oldOpened

    await fs.rename(rootDirectory, displacedRoot)
    await fs.mkdir(rootDirectory)
    const replacementTracer = createTracer(
      rootDirectory,
      'model-storage-root:replacement-20260812'
    )
    const replacementProvisioned = await replacementTracer.authority.provision(
      replacementTracer.target
    )
    assert.equal(replacementProvisioned.ok, true)
    if (!replacementProvisioned.ok) throw new Error('Expected replacement root provisioning.')
    const replacementOpened = await replacementTracer.authority.open(
      replacementProvisioned.value.root
    )
    assert.equal(replacementOpened.ok, true)
    if (!replacementOpened.ok) throw new Error('Expected replacement root opening.')

    assert.deepEqual(
      await oldOpened.value.session.library.summarize({ kind: 'library' }),
      {
        ok: false,
        error: {
          code: 'STORAGE_AUTHORITY_LOST',
          retry: 'after-user-action'
        }
      }
    )
    await oldOpened.value.session.close()
    oldSession = undefined
    await replacementOpened.value.session.close()
  } finally {
    if (oldSession?.ok) await oldSession.value.session.close()
    await fs.rm(parent, { recursive: true, force: true })
  }
}

async function losingAuthorityMidInstallStopsBeforeLogicalCommit(): Promise<void> {
  const parent = await fs.mkdtemp(
    path.join(os.tmpdir(), 'dam-model-storage-mid-install-loss-')
  )
  const rootDirectory = path.join(parent, 'selected-root')
  const displacedRoot = path.join(parent, 'displaced-root')
  await fs.mkdir(rootDirectory)
  try {
    const file = syntheticFile(7)
    const manifestId = 'storage-authority-loss@2026-08'
    const catalog = admitSyntheticCatalog(manifestId, file)
    const source = gatedMidFileSource(file)
    const oldTracer = createModelStorageAuthorityTracer({
      rootDirectory,
      catalog,
      byteSource: source.source,
      createActivityId: () => 'authority-loss-activity-1',
      createStorageRecordId: () => 'authority-loss-storage-1',
      createStorageIdentity: () => 'model-storage-root:loss-20260812'
    })
    const provisioned = await oldTracer.authority.provision(oldTracer.target)
    assert.equal(provisioned.ok, true)
    if (!provisioned.ok) throw new Error('Expected authority-loss root provisioning.')
    const opened = await oldTracer.authority.open(provisioned.value.root)
    assert.equal(opened.ok, true)
    if (!opened.ok) throw new Error('Expected authority-loss root opening.')

    const artifact = {
      catalogId: 'storage-authority-catalog',
      manifestId
    }
    const before = await opened.value.session.library.summarize({
      kind: 'artifact',
      artifact
    })
    assert.equal(before.ok, true)
    if (!before.ok) throw new Error('Expected authority-loss review.')
    const review = before.value.artifacts[0].review
    assert.equal(review.state, 'confirmable')
    if (review.state !== 'confirmable') throw new Error('Expected confirmable review.')

    const installing = opened.value.session.library.install({
      artifact,
      reviewFingerprint: review.fingerprint,
      decision: 'install-exact-reviewed-artifact',
      acceptedAcknowledgements: ['license:storage-authority-synthetic']
    })
    await source.started

    await fs.rename(rootDirectory, displacedRoot)
    await fs.mkdir(rootDirectory)
    const replacementTracer = createModelStorageAuthorityTracer({
      rootDirectory,
      catalog,
      byteSource: unavailableSource(),
      createActivityId: mustNotCreate('replacement activity'),
      createStorageRecordId: mustNotCreate('replacement storage record'),
      createStorageIdentity: () => 'model-storage-root:loss-replacement-20260812'
    })
    const replacementProvisioned = await replacementTracer.authority.provision(
      replacementTracer.target
    )
    assert.equal(replacementProvisioned.ok, true)
    if (!replacementProvisioned.ok) throw new Error('Expected replacement provisioning.')
    source.release()
    assert.deepEqual(await installing, {
      ok: false,
      error: {
        code: 'STORAGE_AUTHORITY_LOST',
        retry: 'after-user-action'
      }
    })
    assert.deepEqual(
      await opened.value.session.library.summarize({ kind: 'library' }),
      {
        ok: false,
        error: {
          code: 'STORAGE_AUTHORITY_LOST',
          retry: 'after-user-action'
        }
      }
    )
    await opened.value.session.close()

    const replacementOpened = await replacementTracer.authority.open(
      replacementProvisioned.value.root
    )
    assert.equal(replacementOpened.ok, true)
    if (!replacementOpened.ok) throw new Error('Expected replacement opening.')

    const replacementSummary = await replacementOpened.value.session.library.summarize({
      kind: 'artifact',
      artifact
    })
    assert.equal(replacementSummary.ok, true)
    if (!replacementSummary.ok) throw new Error('Expected replacement summary.')
    assert.equal(replacementSummary.value.artifacts[0].lifecycle.kind, 'catalog-only')
    assert.deepEqual(replacementSummary.value.activities, [])
    await replacementOpened.value.session.close()

    const displacedTracer = createModelStorageAuthorityTracer({
      rootDirectory: displacedRoot,
      catalog,
      byteSource: unavailableSource(),
      createActivityId: mustNotCreate('displaced activity'),
      createStorageRecordId: mustNotCreate('displaced storage record'),
      createStorageIdentity: mustNotCreate('displaced identity')
    })
    const displacedOpened = await displacedTracer.authority.open(
      provisioned.value.root
    )
    assert.equal(displacedOpened.ok, true)
    if (!displacedOpened.ok) throw new Error('Expected displaced root reconciliation.')
    const displacedSummary = await displacedOpened.value.session.library.summarize({
      kind: 'artifact',
      artifact
    })
    assert.equal(displacedSummary.ok, true)
    if (!displacedSummary.ok) throw new Error('Expected displaced root summary.')
    assert.equal(displacedSummary.value.artifacts[0].lifecycle.kind, 'catalog-only')
    assert.deepEqual(displacedSummary.value.activities, [])
    await displacedOpened.value.session.close()
  } finally {
    await fs.rm(parent, { recursive: true, force: true })
  }
}

async function losingAuthorityBeforeSourceEntryNeverTouchesReplacementStorage(): Promise<void> {
  const parent = await fs.mkdtemp(
    path.join(os.tmpdir(), 'dam-model-storage-pre-entry-loss-')
  )
  const rootDirectory = path.join(parent, 'selected-root')
  const displacedRoot = path.join(parent, 'displaced-root')
  await fs.mkdir(rootDirectory)
  try {
    const file = syntheticFile(8)
    const manifestId = 'storage-authority-pre-entry-loss@2026-08'
    const catalog = admitSyntheticCatalog(manifestId, file)
    const source = gatedSource(file)
    const oldTracer = createModelStorageAuthorityTracer({
      rootDirectory,
      catalog,
      byteSource: source.source,
      createActivityId: () => 'authority-pre-entry-loss-activity-1',
      createStorageRecordId: () => 'authority-pre-entry-loss-storage-1',
      createStorageIdentity: () => 'model-storage-root:pre-entry-loss-20260812'
    })
    const provisioned = await oldTracer.authority.provision(oldTracer.target)
    assert.equal(provisioned.ok, true)
    if (!provisioned.ok) throw new Error('Expected pre-entry root provisioning.')
    const opened = await oldTracer.authority.open(provisioned.value.root)
    assert.equal(opened.ok, true)
    if (!opened.ok) throw new Error('Expected pre-entry root opening.')
    const artifact = { catalogId: 'storage-authority-catalog', manifestId }
    const before = await opened.value.session.library.summarize({
      kind: 'artifact',
      artifact
    })
    assert.equal(before.ok, true)
    if (!before.ok) throw new Error('Expected pre-entry review.')
    const review = before.value.artifacts[0].review
    assert.equal(review.state, 'confirmable')
    if (review.state !== 'confirmable') throw new Error('Expected confirmable review.')
    const installing = opened.value.session.library.install({
      artifact,
      reviewFingerprint: review.fingerprint,
      decision: 'install-exact-reviewed-artifact',
      acceptedAcknowledgements: ['license:storage-authority-synthetic']
    })
    await source.started

    await fs.rename(rootDirectory, displacedRoot)
    await fs.mkdir(rootDirectory)
    const replacementTracer = createModelStorageAuthorityTracer({
      rootDirectory,
      catalog,
      byteSource: unavailableSource(),
      createActivityId: mustNotCreate('replacement activity'),
      createStorageRecordId: mustNotCreate('replacement storage record'),
      createStorageIdentity: () => 'model-storage-root:pre-entry-replacement-20260812'
    })
    const replacementProvisioned = await replacementTracer.authority.provision(
      replacementTracer.target
    )
    assert.equal(replacementProvisioned.ok, true)
    if (!replacementProvisioned.ok) throw new Error('Expected replacement provisioning.')

    source.release()
    assert.deepEqual(await installing, {
      ok: false,
      error: { code: 'STORAGE_AUTHORITY_LOST', retry: 'after-user-action' }
    })
    await opened.value.session.close()

    const replacementOpened = await replacementTracer.authority.open(
      replacementProvisioned.value.root
    )
    assert.equal(replacementOpened.ok, true)
    if (!replacementOpened.ok) throw new Error('Expected replacement open.')
    const replacementSummary = await replacementOpened.value.session.library.summarize({
      kind: 'artifact',
      artifact
    })
    assert.equal(replacementSummary.ok, true)
    if (!replacementSummary.ok) throw new Error('Expected replacement summary.')
    assert.equal(replacementSummary.value.artifacts[0].lifecycle.kind, 'catalog-only')
    assert.deepEqual(replacementSummary.value.activities, [])
    await replacementOpened.value.session.close()

    const displacedTracer = createModelStorageAuthorityTracer({
      rootDirectory: displacedRoot,
      catalog,
      byteSource: unavailableSource(),
      createActivityId: mustNotCreate('displaced activity'),
      createStorageRecordId: mustNotCreate('displaced storage record'),
      createStorageIdentity: mustNotCreate('displaced identity')
    })
    const displacedOpened = await displacedTracer.authority.open(provisioned.value.root)
    assert.equal(displacedOpened.ok, true)
    if (!displacedOpened.ok) throw new Error('Expected displaced reconciliation.')
    const displacedSummary = await displacedOpened.value.session.library.summarize({
      kind: 'artifact',
      artifact
    })
    assert.equal(displacedSummary.ok, true)
    if (!displacedSummary.ok) throw new Error('Expected displaced summary.')
    assert.equal(displacedSummary.value.artifacts[0].lifecycle.kind, 'catalog-only')
    assert.deepEqual(displacedSummary.value.activities, [])
    await displacedOpened.value.session.close()
  } finally {
    await fs.rm(parent, { recursive: true, force: true })
  }
}

async function closeRevokesNewWorkAndDrainsAcceptedInstall(): Promise<void> {
  const rootDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'dam-model-storage-drain-'))
  try {
    const file = syntheticFile(3)
    const manifestId = 'storage-authority-drain@2026-08'
    const catalog = admitSyntheticCatalog(manifestId, file)
    const source = gatedSource(file)
    const tracer = createModelStorageAuthorityTracer({
      rootDirectory,
      catalog,
      byteSource: source.source,
      createActivityId: () => 'authority-drain-activity-1',
      createStorageRecordId: () => 'authority-drain-storage-1',
      createStorageIdentity: () => 'model-storage-root:drain-20260812'
    })
    const provisioned = await tracer.authority.provision(tracer.target)
    assert.equal(provisioned.ok, true)
    if (!provisioned.ok) throw new Error('Expected drain root provisioning.')
    const opened = await tracer.authority.open(provisioned.value.root)
    assert.equal(opened.ok, true)
    if (!opened.ok) throw new Error('Expected drain root opening.')

    const artifact = {
      catalogId: 'storage-authority-catalog',
      manifestId
    }
    const summary = await opened.value.session.library.summarize({
      kind: 'artifact',
      artifact
    })
    assert.equal(summary.ok, true)
    if (!summary.ok) throw new Error('Expected drain review.')
    const review = summary.value.artifacts[0].review
    assert.equal(review.state, 'confirmable')
    if (review.state !== 'confirmable') throw new Error('Expected drain review.')

    const installing = opened.value.session.library.install({
      artifact,
      reviewFingerprint: review.fingerprint,
      decision: 'install-exact-reviewed-artifact',
      acceptedAcknowledgements: ['license:storage-authority-synthetic']
    })
    const alreadyAcceptedSummary = opened.value.session.library.summarize({
      kind: 'artifact',
      artifact
    })
    await source.started
    const closing = opened.value.session.close()

    assert.deepEqual(
      await opened.value.session.library.summarize({ kind: 'library' }),
      {
        ok: false,
        error: {
          code: 'STORAGE_AUTHORITY_LOST',
          retry: 'after-user-action'
        }
      }
    )
    assert.deepEqual(await tracer.authority.open(provisioned.value.root), {
      ok: false,
      error: { code: 'STORAGE_BUSY', retry: 'after-session-closes' }
    })

    source.release()
    assert.equal((await installing).ok, true)
    const drainedSummary = await alreadyAcceptedSummary
    assert.equal(drainedSummary.ok, true)
    if (!drainedSummary.ok) throw new Error('Accepted work must drain before close.')
    assert.equal(drainedSummary.value.artifacts[0].lifecycle.kind, 'verified-stored')
    await closing

    const reopened = await tracer.authority.open(provisioned.value.root)
    assert.equal(reopened.ok, true)
    if (!reopened.ok) throw new Error('Expected writer ownership after drained close.')
    const persisted = await reopened.value.session.library.summarize({
      kind: 'artifact',
      artifact
    })
    assert.equal(persisted.ok, true)
    if (!persisted.ok) throw new Error('Expected drained install to persist.')
    assert.equal(persisted.value.artifacts[0].lifecycle.kind, 'verified-stored')
    await reopened.value.session.close()
  } finally {
    await fs.rm(rootDirectory, { recursive: true, force: true })
  }
}

async function verifiedStorageSurvivesAuthorityCloseAndReopen(): Promise<void> {
  const rootDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'dam-model-storage-commit-'))
  try {
    const weights = createSafeTensorsFixture()
    const file = {
      path: 'weights/model.safetensors',
      role: 'weights',
      format: 'safetensors',
      bytes: weights
    }
    const manifestId = 'storage-authority-synthetic@2026-08'
    const catalog = admitSyntheticCatalog(manifestId, file)
    const firstTracer = createModelStorageAuthorityTracer({
      rootDirectory,
      catalog,
      byteSource: sourceFromEntries([file]),
      createActivityId: () => 'authority-activity-1',
      createStorageRecordId: () => 'authority-storage-record-1',
      createStorageIdentity: () => 'model-storage-root:commit-20260812'
    })
    const provisioned = await firstTracer.authority.provision(firstTracer.target)
    assert.equal(provisioned.ok, true)
    if (!provisioned.ok) throw new Error('Expected commit root provisioning.')
    const opened = await firstTracer.authority.open(provisioned.value.root)
    assert.equal(opened.ok, true)
    if (!opened.ok) throw new Error('Expected commit root opening.')

    const artifact = {
      catalogId: 'storage-authority-catalog',
      manifestId
    }
    const summary = await opened.value.session.library.summarize({
      kind: 'artifact',
      artifact
    })
    assert.equal(summary.ok, true)
    if (!summary.ok) throw new Error('Expected exact synthetic review.')
    const review = summary.value.artifacts[0].review
    assert.equal(review.state, 'confirmable')
    if (review.state !== 'confirmable') throw new Error('Expected a confirmable review.')
    const request = {
      artifact,
      reviewFingerprint: review.fingerprint,
      decision: 'install-exact-reviewed-artifact' as const,
      acceptedAcknowledgements: ['license:storage-authority-synthetic']
    }
    const installed = await opened.value.session.library.install(request)
    assert.equal(installed.ok, true)
    if (!installed.ok) throw new Error('Expected verified storage under authority.')
    assert.equal(installed.value.disposition, 'new-install')
    await opened.value.session.close()

    const reopenedTracer = createModelStorageAuthorityTracer({
      rootDirectory,
      catalog,
      byteSource: unavailableSource(),
      createActivityId: mustNotCreate('replayed activity'),
      createStorageRecordId: mustNotCreate('replayed storage record'),
      createStorageIdentity: mustNotCreate('replacement identity')
    })
    const reopened = await reopenedTracer.authority.open(provisioned.value.root)
    assert.equal(reopened.ok, true)
    if (!reopened.ok) throw new Error('Expected the exact authority root to reopen.')
    const persisted = await reopened.value.session.library.summarize({
      kind: 'artifact',
      artifact
    })
    assert.equal(persisted.ok, true)
    if (!persisted.ok) throw new Error('Expected persisted verified storage.')
    assert.deepEqual(persisted.value.artifacts[0].lifecycle, {
      kind: 'verified-stored',
      storageRecordId: 'authority-storage-record-1',
      activeCapabilityAssignments: []
    })
    assert.deepEqual(await reopened.value.session.library.install(request), {
      ok: true,
      value: {
        disposition: 'idempotent-replay',
        activity: installed.value.activity
      }
    })
    await reopened.value.session.close()
  } finally {
    await fs.rm(rootDirectory, { recursive: true, force: true })
  }
}

async function blockedRecoveryDoesNotEscapeAsAnOpenedSession(): Promise<void> {
  const rootDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'dam-model-storage-recovery-'))
  try {
    const firstFile = syntheticFile(1)
    const firstManifestId = 'storage-authority-recovery-a@2026-08'
    const firstCatalog = admitSyntheticCatalog(firstManifestId, firstFile)
    const firstTracer = createModelStorageAuthorityTracer({
      rootDirectory,
      catalog: firstCatalog,
      byteSource: sourceFromEntries([firstFile]),
      createActivityId: () => 'authority-recovery-activity-1',
      createStorageRecordId: () => 'authority-recovery-storage-1',
      createStorageIdentity: () => 'model-storage-root:recovery-20260812'
    })
    const provisioned = await firstTracer.authority.provision(firstTracer.target)
    assert.equal(provisioned.ok, true)
    if (!provisioned.ok) throw new Error('Expected recovery root provisioning.')
    const firstOpen = await firstTracer.authority.open(provisioned.value.root)
    assert.equal(firstOpen.ok, true)
    if (!firstOpen.ok) throw new Error('Expected recovery root opening.')
    const firstArtifact = {
      catalogId: 'storage-authority-catalog',
      manifestId: firstManifestId
    }
    const firstSummary = await firstOpen.value.session.library.summarize({
      kind: 'artifact',
      artifact: firstArtifact
    })
    assert.equal(firstSummary.ok, true)
    if (!firstSummary.ok) throw new Error('Expected recovery setup review.')
    const firstReview = firstSummary.value.artifacts[0].review
    assert.equal(firstReview.state, 'confirmable')
    if (firstReview.state !== 'confirmable') throw new Error('Expected recovery setup review.')
    assert.equal((await firstOpen.value.session.library.install({
      artifact: firstArtifact,
      reviewFingerprint: firstReview.fingerprint,
      decision: 'install-exact-reviewed-artifact',
      acceptedAcknowledgements: ['license:storage-authority-synthetic']
    })).ok, true)
    await firstOpen.value.session.close()

    const incompatibleCatalog = admitSyntheticCatalog(
      'storage-authority-recovery-b@2026-08',
      syntheticFile(2)
    )
    const incompatibleTracer = createModelStorageAuthorityTracer({
      rootDirectory,
      catalog: incompatibleCatalog,
      byteSource: unavailableSource(),
      createActivityId: mustNotCreate('activity'),
      createStorageRecordId: mustNotCreate('storage record'),
      createStorageIdentity: mustNotCreate('identity')
    })
    assert.deepEqual(
      await incompatibleTracer.authority.open(provisioned.value.root),
      {
        ok: false,
        error: { code: 'RECOVERY_BLOCKED', retry: 'after-user-action' }
      }
    )

    const exactTracer = createModelStorageAuthorityTracer({
      rootDirectory,
      catalog: firstCatalog,
      byteSource: unavailableSource(),
      createActivityId: mustNotCreate('activity'),
      createStorageRecordId: mustNotCreate('storage record'),
      createStorageIdentity: mustNotCreate('identity')
    })
    const exactOpen = await exactTracer.authority.open(provisioned.value.root)
    assert.equal(exactOpen.ok, true)
    if (!exactOpen.ok) throw new Error('Blocked recovery must release writer ownership.')
    await exactOpen.value.session.close()
  } finally {
    await fs.rm(rootDirectory, { recursive: true, force: true })
  }
}

async function holdStorageInChild(
  rootDirectory: string | undefined,
  root: string | undefined
): Promise<void> {
  if (!rootDirectory || !root) throw new Error('CHILD_INPUT_REQUIRED')
  const tracer = createTracer(rootDirectory, 'must-not-provision-in-child')
  const opened = await tracer.authority.open(root as never)
  if (!opened.ok) throw new Error(`CHILD_OPEN_FAILED:${opened.error.code}`)
  process.stdout.write('READY\n')
  await new Promise<void>((resolve) => {
    process.stdin.setEncoding('utf8')
    process.stdin.once('data', () => resolve())
  })
  await opened.value.session.close()
}

function createTracer(rootDirectory: string, storageIdentity: string) {
  return createModelStorageAuthorityTracer({
    rootDirectory,
    catalog: admitted.catalog,
    byteSource: unavailableSource(),
    createActivityId: mustNotCreate('activity'),
    createStorageRecordId: mustNotCreate('storage record'),
    createStorageIdentity: () => storageIdentity
  })
}

function createSafeTensorsFixture(): Uint8Array {
  const headerValue = JSON.stringify({
    weight: { dtype: 'F32', shape: [1], data_offsets: [0, 4] }
  })
  const padding = ' '.repeat((8 - Buffer.byteLength(headerValue, 'utf8') % 8) % 8)
  const header = Buffer.from(`${headerValue}${padding}`, 'utf8')
  const prefix = Buffer.alloc(8)
  prefix.writeBigUInt64LE(BigInt(header.byteLength), 0)
  return Buffer.concat([prefix, header, Buffer.from([0, 0, 128, 63])])
}

function syntheticFile(value: number) {
  const bytes = Buffer.from(createSafeTensorsFixture())
  bytes[bytes.byteLength - 1] = value
  return {
    path: 'weights/model.safetensors',
    role: 'weights',
    format: 'safetensors',
    bytes
  }
}

function admitSyntheticCatalog(
  manifestId: string,
  file: {
    readonly path: string
    readonly role: string
    readonly format: string
    readonly bytes: Uint8Array
  }
): AdmittedModelCatalog {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519')
  const payload = {
    schemaVersion: 1,
    catalogId: 'storage-authority-catalog',
    keyId: 'storage-authority-test-root',
    sequence: '1',
    trustVerifiedAt: '2026-08-12T00:00:00.000Z',
    artifacts: [{
      manifestId,
      familyId: 'storage-authority-family',
      checkpointId: 'storage-authority-checkpoint',
      variantId: 'storage-authority-variant',
      displayName: 'Storage Authority Synthetic Model',
      immutableRevision: `sha256:${'4'.repeat(64)}`,
      files: [{
        path: file.path,
        role: file.role,
        format: file.format,
        sizeBytes: file.bytes.byteLength,
        sha256: createHash('sha256').update(file.bytes).digest('hex')
      }],
      requiredAcknowledgements: [{
        id: 'license:storage-authority-synthetic',
        kind: 'license',
        label: 'Synthetic storage authority fixture license'
      }]
    }]
  }
  const admission = createInMemoryModelCatalogAdmissionTracer({
    trustRoots: [{
      catalogId: payload.catalogId,
      keyId: payload.keyId,
      publicKeySpkiBase64: publicKey.export({
        format: 'der',
        type: 'spki'
      }).toString('base64')
    }],
    nowEpochMs: () => Date.parse('2026-08-12T12:00:00.000Z')
  })
  const decision = admission.admit({
    catalogId: payload.catalogId,
    keyId: payload.keyId,
    payload,
    signatureBase64: sign(
      null,
      Buffer.from(canonicalJson(payload), 'utf8'),
      privateKey
    ).toString('base64')
  })
  assert.equal(decision.kind, 'admitted')
  if (decision.kind !== 'admitted') throw new Error('Expected synthetic Catalog admission.')
  return decision.catalog
}

function sourceFromEntries(entries: ReadonlyArray<{
  readonly path: string
  readonly bytes: Uint8Array
}>): ModelArtifactByteSource {
  return {
    async *entries(): AsyncIterable<ModelArtifactSourceEntry> {
      for (const entry of entries) {
        yield { relativePath: entry.path, bytes: chunks(entry.bytes) }
      }
    }
  }
}

function gatedSource(file: {
  readonly path: string
  readonly bytes: Uint8Array
}) {
  let markStarted: (() => void) | undefined
  let releaseSource: (() => void) | undefined
  const started = new Promise<void>((resolve) => {
    markStarted = resolve
  })
  const released = new Promise<void>((resolve) => {
    releaseSource = resolve
  })
  return {
    started,
    release: () => releaseSource?.(),
    source: {
      async *entries(): AsyncIterable<ModelArtifactSourceEntry> {
        markStarted?.()
        await released
        yield { relativePath: file.path, bytes: chunks(file.bytes) }
      }
    } satisfies ModelArtifactByteSource
  }
}

function gatedMidFileSource(file: {
  readonly path: string
  readonly bytes: Uint8Array
}) {
  let markStarted: (() => void) | undefined
  let releaseSource: (() => void) | undefined
  const started = new Promise<void>((resolve) => {
    markStarted = resolve
  })
  const released = new Promise<void>((resolve) => {
    releaseSource = resolve
  })
  return {
    started,
    release: () => releaseSource?.(),
    source: {
      async *entries(): AsyncIterable<ModelArtifactSourceEntry> {
        const split = Math.max(1, Math.floor(file.bytes.byteLength / 2))
        yield {
          relativePath: file.path,
          bytes: (async function *(): AsyncIterable<Uint8Array> {
            yield file.bytes.subarray(0, split)
            markStarted?.()
            await released
            if (split < file.bytes.byteLength) {
              throw new Error('TRACER_SOURCE_FAILED_AFTER_AUTHORITY_LOSS')
            }
          })()
        }
      }
    } satisfies ModelArtifactByteSource
  }
}

async function *chunks(bytes: Uint8Array): AsyncIterable<Uint8Array> {
  const split = Math.max(1, Math.floor(bytes.byteLength / 2))
  yield bytes.subarray(0, split)
  if (split < bytes.byteLength) yield bytes.subarray(split)
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    const encoded = JSON.stringify(value)
    if (encoded === undefined) throw new Error('Unsupported fixture value.')
    return encoded
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  const record = value as Record<string, unknown>
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
    .join(',')}}`
}

async function waitForChildLine(child: ChildProcess, expected: string): Promise<void> {
  const stdout = child.stdout
  if (!stdout) throw new Error('CHILD_STDOUT_UNAVAILABLE')
  stdout.setEncoding('utf8')
  await new Promise<void>((resolve, reject) => {
    let text = ''
    const timeout = setTimeout(() => reject(new Error('CHILD_READY_TIMEOUT')), 5_000)
    const onExit = () => reject(new Error('CHILD_EXITED_BEFORE_READY'))
    child.once('exit', onExit)
    stdout.on('data', (chunk: string) => {
      text += chunk
      if (!text.includes(`${expected}\n`)) return
      clearTimeout(timeout)
      child.off('exit', onExit)
      resolve()
    })
  })
}

async function waitForChildExit(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null) {
    assert.equal(child.exitCode, 0)
    return
  }
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('CHILD_EXIT_TIMEOUT')), 5_000)
    child.once('exit', (code) => {
      clearTimeout(timeout)
      if (code === 0) resolve()
      else reject(new Error('CHILD_EXIT_FAILED'))
    })
  })
}

async function waitForChildTermination(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('CHILD_TERMINATION_TIMEOUT')), 5_000)
    child.once('exit', () => {
      clearTimeout(timeout)
      resolve()
    })
  })
}

function unavailableSource(): ModelArtifactByteSource {
  return {
    async *entries(): AsyncIterable<ModelArtifactSourceEntry> {
      throw new Error('The provision/open slice must not acquire model bytes.')
    }
  }
}

function mustNotCreate(kind: string): () => string {
  return () => {
    throw new Error(`The provision/open slice must not create a ${kind}.`)
  }
}
