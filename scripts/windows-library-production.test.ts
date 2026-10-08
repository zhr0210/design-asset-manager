import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { test } from 'node:test'
import Database from 'better-sqlite3'
import sharp from 'sharp'
import { createActiveLibraryHost } from '../src/main/library-lifecycle'
import { createProductionActiveLibraryHostDependencies } from '../src/main/library-lifecycle/production-active-library-dependencies'
import { openReadonlyLibraryDatabase } from '../src/main/library-lifecycle/readonly-library-database.internal'

await test('Windows production Library creates, imports generated formats and reopens without changing originals', { skip: process.platform !== 'win32', timeout: 30000 }, async () => {
  const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'dam-win-library-')))
  const library = path.join(root, '中文 Library')
  const files = ['png', 'jpeg', 'webp'].map(format => path.join(root, 'blue-sample.' + format))
  const dependencies = createProductionActiveLibraryHostDependencies({
    selectLibraryDirectory: async () => ({ kind: 'selected', directory: library }),
    selectLocalFiles: async () => ({ kind: 'selected', files: files.map(filePath => ({ filePath })) })
  })
  const host = createActiveLibraryHost(dependencies)
  const other = createActiveLibraryHost(dependencies)
  try {
    for (const file of files) await sharp({ create: { width: 64, height: 32, channels: 3, background: '#3388cc' } }).toFile(file)
    const hashes = await Promise.all(files.map(async file => createHash('sha256').update(await fs.readFile(file)).digest('hex')))
    const creation = await host.prepareCreate()
    assert.equal(creation.kind, 'planned')
    if (creation.kind !== 'planned') throw Error('fixture')
    await host.confirmCreate(creation.plan.receipt)
    const addition = await host.prepareAddAssets()
    assert.equal(addition.kind, 'planned')
    if (addition.kind !== 'planned') throw Error('fixture')
    await host.dispatchAddAssets(addition.plan.receipt)
    assert.equal((await host.listAssets()).length, 3)
    await assert.rejects(other.open(), error => Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'library-opening'))
    await host.close()
    await host.reopen()
    assert.equal((await host.listAssets()).length, 3)
    assert.deepEqual(await Promise.all(files.map(async file => createHash('sha256').update(await fs.readFile(file)).digest('hex'))), hashes)
  } finally {
    await other.close()
    await host.close()
    assert.equal(path.dirname(root), path.resolve(os.tmpdir()))
    assert.ok(path.basename(root).startsWith('dam-win-library-'))
    await fs.rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 })
  }
})

await test('Windows read-only inspection refuses a WAL database without creating sidecars or changing bytes', { skip: process.platform !== 'win32' }, async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'dam-win-readonly-'))
  const file = path.join(root, 'wal.sqlite')
  try {
    const database = new Database(file)
    database.pragma('journal_mode = WAL')
    database.exec('CREATE TABLE fixture (value TEXT); INSERT INTO fixture VALUES (\'generated\')')
    database.close()
    const before = await fs.readFile(file)
    let reader: Database.Database | undefined
    assert.throws(() => {
      try {
        reader = openReadonlyLibraryDatabase(file)
        reader.prepare('SELECT value FROM fixture').get()
      } finally { reader?.close() }
    })
    assert.deepEqual(await fs.readdir(root), ['wal.sqlite'])
    assert.deepEqual(await fs.readFile(file), before)
  } finally {
    assert.equal(path.dirname(root), path.resolve(os.tmpdir()))
    assert.ok(path.basename(root).startsWith('dam-win-readonly-'))
    await fs.rm(root, { recursive: true, force: true })
  }
})
