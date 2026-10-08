import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {test} from 'node:test'
import {
  backupBindingSha256,
  inspectWindowsBackupRecovery,
  serializeWindowsBackupBinding,
  type WindowsBackupBinding,
  type WindowsBackupRecoveryBundle,
} from '../src/main/platform/windows-backup-recovery.internal'

function binding(): WindowsBackupBinding {
  const imageSha256 = 'a'.repeat(64)
  return {
    format: 1,
    operation: 'snapshot-op-1',
    library: 'library-1',
    lineage: 'lineage-1',
    controlStore: 'control-store-1',
    generation: '7',
    source: {
      volume: '42', file: '123', size: '4096', created: '133000000000000000',
      written: '133000000000000001', links: 1, sha256: imageSha256,
      available: '1073741824', filesystem: 'NTFS',
    },
    connection: {pages: 1, pageSize: 4096, dataVersion: 1, schemaVersion: 1},
    imageSha256,
  }
}

function bundle(expected: WindowsBackupBinding, committed: boolean | null = true): WindowsBackupRecoveryBundle {
  const text = serializeWindowsBackupBinding(expected)
  const identity = {
    productionQualified: false,
    bindingSha256: backupBindingSha256(text),
    imageSha256: expected.imageSha256,
  }
  return {
    binding: text,
    backing: JSON.stringify({phase: 'tracer-backing-up', ...identity}),
    verified: JSON.stringify({phase: 'tracer-target-verified', ...identity}),
    finished: committed === null ? null : JSON.stringify({phase: 'tracer-finished', ...identity, mainDeclaredCommitted: committed}),
    imageSha256: expected.imageSha256,
  }
}

function changedStatus(text: string, change: (value: Record<string, unknown>) => void): string {
  const value: Record<string, unknown> = JSON.parse(text)
  change(value)
  return JSON.stringify(value)
}

await test('exact captured binding and all bound status files verify content without granting restore or commit authority', () => {
  const expected = binding(), evidence = bundle(expected)
  assert.equal(evidence.binding, JSON.stringify(expected))
  assert.equal(backupBindingSha256(evidence.binding), createHash('sha256').update(evidence.binding, 'utf8').digest('hex'))
  assert.deepEqual(inspectWindowsBackupRecovery(evidence, expected), {
    kind: 'commit-claimed', snapshot: 'content-and-binding-verified', sourceCommit: 'unproven',
    productionQualified: false, restoreAllowed: false,
  })
})

await test('missing finished file is interrupted and a cancelled declaration remains cancelled with no restore authority', () => {
  const expected = binding()
  for (const [committed, kind] of [[null, 'interrupted'], [false, 'cancelled']] as const) {
    assert.deepEqual(inspectWindowsBackupRecovery(bundle(expected, committed), expected), {
      kind, snapshot: 'content-and-binding-verified', sourceCommit: 'unproven',
      productionQualified: false, restoreAllowed: false,
    })
  }
})

await test('library, lineage, control, generation and operation cannot be replaced by self-consistent files', () => {
  const expected = binding()
  for (const field of ['library', 'lineage', 'controlStore', 'generation', 'operation'] as const) {
    const substituted = binding()
    substituted[field] = `${substituted[field]}-other`
    assert.throws(() => inspectWindowsBackupRecovery(bundle(substituted), expected), /BACKUP_RECOVERY_BINDING_REFUSED/, field)
  }
})

await test('every source and connection evidence field is bound to the captured operation', () => {
  const expected = binding()
  for (const field of ['volume', 'file', 'size', 'created', 'written', 'available'] as const) {
    const evidence = bundle(expected), substituted = binding()
    substituted.source[field] = `${substituted.source[field]}0`
    evidence.binding = JSON.stringify(substituted)
    assert.throws(() => inspectWindowsBackupRecovery(evidence, expected), /BACKUP_RECOVERY_BINDING_REFUSED/, field)
  }
  for (const field of ['links', 'sha256', 'filesystem'] as const) {
    const evidence = bundle(expected), substituted = binding()
    Reflect.set(substituted.source, field, field === 'links' ? 2 : 'other')
    evidence.binding = JSON.stringify(substituted)
    assert.throws(() => inspectWindowsBackupRecovery(evidence, expected), /BACKUP_RECOVERY_BINDING_REFUSED/, field)
  }
  for (const field of ['pages', 'pageSize', 'dataVersion', 'schemaVersion'] as const) {
    const evidence = bundle(expected), substituted = binding()
    substituted.connection[field] += 1
    evidence.binding = JSON.stringify(substituted)
    assert.throws(() => inspectWindowsBackupRecovery(evidence, expected), /BACKUP_RECOVERY_BINDING_REFUSED/, field)
  }
})

await test('image evidence must match captured digest even when supplied statuses consistently claim another image', () => {
  const expected = binding(), substituted = binding()
  substituted.imageSha256 = 'b'.repeat(64)
  substituted.source.sha256 = substituted.imageSha256
  assert.throws(() => inspectWindowsBackupRecovery(bundle(substituted), expected), /BACKUP_RECOVERY_BINDING_REFUSED/)
  const evidence = bundle(expected)
  evidence.imageSha256 = 'b'.repeat(64)
  assert.throws(() => inspectWindowsBackupRecovery(evidence, expected), /BACKUP_RECOVERY_BINDING_REFUSED/)
})

await test('binding bytes must be canonical, not merely equivalent parsed JSON', () => {
  const expected = binding(), evidence = bundle(expected)
  const {imageSha256, ...otherFields} = expected
  for (const text of [
    ` ${evidence.binding}`,
    JSON.stringify(expected, null, 2),
    evidence.binding.replace('{"format":1,', '{"format":2,"format":1,'),
    JSON.stringify({...expected, operation: undefined, operationAlias: expected.operation}),
    JSON.stringify({imageSha256, ...otherFields}),
  ]) assert.throws(() => inspectWindowsBackupRecovery({...evidence, binding: text}, expected), /BACKUP_RECOVERY_BINDING_REFUSED/)
})

await test('expected binding validates exact complete schemas and bounded values before inspecting files', () => {
  const mutations: Array<(value: WindowsBackupBinding) => void> = [
    value => {Reflect.set(value, 'format', 2)},
    value => {Reflect.set(value, 'generation', 7)},
    value => {value.operation = '../snapshot'},
    value => {value.library = ''},
    value => {value.generation = 'x'.repeat(257)},
    value => {value.imageSha256 = 'A'.repeat(64)},
    value => {value.source.sha256 = 'b'.repeat(64)},
    value => {Reflect.set(value, 'extra', true)},
    value => {Reflect.deleteProperty(value, 'lineage')},
    value => {Reflect.set(value.source, 'extra', true)},
    value => {Reflect.deleteProperty(value.source, 'written')},
    value => {value.source.file = '00'},
    value => {Reflect.set(value.source, 'volume', 42)},
    value => {Reflect.set(value.source, 'file', 123)},
    value => {Reflect.set(value.source, 'size', 4096)},
    value => {Reflect.set(value.source, 'created', 133000000000000000)},
    value => {Reflect.set(value.source, 'written', 133000000000000001)},
    value => {Reflect.set(value.source, 'available', 1073741824)},
    value => {value.source.file = '0'},
    value => {value.source.size = '8192'},
    value => {value.source.created = '0'},
    value => {value.source.written = '0'},
    value => {value.source.available = '-1'},
    value => {value.source.volume = '1'.repeat(4096)},
    value => {value.source.links = 2},
    value => {value.source.filesystem = 'ReFS'},
    value => {Reflect.set(value.connection, 'extra', true)},
    value => {Reflect.deleteProperty(value.connection, 'pages')},
    value => {value.connection.pages = 0},
    value => {value.connection.pageSize = 3},
    value => {value.connection.dataVersion = 0},
    value => {value.connection.schemaVersion = 0},
    value => {value.connection.pages = 1.5},
    value => {value.connection.pageSize = Infinity},
  ]
  const evidence = bundle(binding())
  for (const [index, mutate] of mutations.entries()) {
    const expected = binding()
    mutate(expected)
    assert.throws(() => serializeWindowsBackupBinding(expected), `invalid expected schema mutation ${index}`)
    assert.throws(() => inspectWindowsBackupRecovery(evidence, expected), `invalid recovery schema mutation ${index}`)
  }
})

await test('each status rejects changed phase, qualification, binding digest and image digest', () => {
  const expected = binding(), original = bundle(expected)
  const changes: Array<(value: Record<string, unknown>) => void> = [
    value => {value.phase = 'tracer-finished-other'},
    value => {value.productionQualified = true},
    value => {value.bindingSha256 = 'b'.repeat(64)},
    value => {value.imageSha256 = 'b'.repeat(64)},
  ]
  for (const field of ['backing', 'verified', 'finished'] as const) {
    const text = original[field]
    assert.ok(text)
    for (const change of changes) {
      assert.throws(() => inspectWindowsBackupRecovery({...original, [field]: changedStatus(text, change)}, expected))
    }
  }
})

await test('all status schemas reject missing or extra fields and finished accepts only a boolean declaration', () => {
  const expected = binding(), original = bundle(expected)
  for (const field of ['backing', 'verified', 'finished'] as const) {
    const text = original[field]
    assert.ok(text)
    for (const key of Object.keys(JSON.parse(text))) {
      assert.throws(() => inspectWindowsBackupRecovery({...original, [field]: changedStatus(text, value => {delete value[key]})}, expected))
    }
    assert.throws(() => inspectWindowsBackupRecovery({...original, [field]: changedStatus(text, value => {value.extra = true})}, expected))
  }
  assert.ok(original.finished)
  for (const declaration of ['true', 1, null, {}, []]) {
    const finished = changedStatus(original.finished, value => {value.mainDeclaredCommitted = declaration})
    assert.throws(() => inspectWindowsBackupRecovery({...original, finished}, expected))
  }
})

await test('status files reject duplicate keys, noncanonical text, malformed JSON and oversized input', () => {
  const expected = binding(), original = bundle(expected)
  for (const field of ['backing', 'verified', 'finished'] as const) {
    const text = original[field]
    assert.ok(text)
    const candidates = [
      ` ${text}`, JSON.stringify(JSON.parse(text), null, 2),
      text.replace('{"phase":', '{"phase":"forged","phase":'),
      text.replace('tracer-', 'tracer\\u002d'),
      '{', '', 'null', '[]', 'true', '"status"',
      ' '.repeat(4097), `${' '.repeat(4096)}${text}`,
    ]
    for (const candidate of candidates) assert.throws(() => inspectWindowsBackupRecovery({...original, [field]: candidate}, expected))
  }
})
