import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { test } from 'node:test'
import Database from 'better-sqlite3'
import { createActiveLibraryHost } from '../src/main/library-lifecycle'
import { createProductionActiveLibraryHostDependencies } from '../src/main/library-lifecycle/production-active-library-dependencies'
import { readLibraryManifestDeclaration } from '../src/main/library-lifecycle/library-manifest.tracer'
import { inspectLibraryControlStore, inspectSerializedLibraryControlStore } from '../src/main/library-lifecycle/library-open-control-store.internal'
import { verifyLibraryBackupSnapshot, BACKUP_SNAPSHOT_MAX_BYTES } from '../src/main/library-lifecycle/library-backup-snapshot.internal'
import { applyTagIntentSchema } from '../src/main/independent-tags/tag-intent.schema'
import { applyTagExecutionSchema } from '../src/main/independent-tags/tag-execution.schema'
import { applyTagDecisionSchema } from '../src/main/independent-tags/tag-decision.schema'
import { applyBackgroundAnalysisSchema } from '../src/main/background-analysis/background-analysis.schema'
import { applyBackgroundOcrSchema } from '../src/main/background-ocr/background-ocr.schema'

const sha = (image: Buffer) => createHash('sha256').update(image).digest('hex')
async function fixture(version: number) {
  const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'dam-snapshot-')))
  const directory = path.join(root, 'library')
  const host = createActiveLibraryHost(createProductionActiveLibraryHostDependencies({ selectLibraryDirectory: async () => ({kind:'selected', directory}), selectLocalFiles: async () => ({kind:'cancelled'}) }))
  const plan = await host.prepareCreate(); if (plan.kind !== 'planned') throw Error('fixture create')
  await host.confirmCreate(plan.plan.receipt); const state = host.inspect(); await host.close()
  const declaration = readLibraryManifestDeclaration(new Uint8Array(await fs.readFile(path.join(directory,'.dam','library.manifest.json'))))
  if (declaration.kind !== 'compatible') throw Error('fixture declaration')
  const db = new Database(path.join(directory,'.dam','library.sqlite'))
  if (version === 9) db.transaction(() => applyTagIntentSchema(db))()
  if (version === 13) db.transaction(() => {applyTagExecutionSchema(db); applyTagDecisionSchema(db); applyBackgroundAnalysisSchema(db); applyBackgroundOcrSchema(db)})()
  const expected = {declaration:declaration.declaration, generation:state.generation!, schemaVersion:version}
  return {db, expected, verify: (image: Buffer, overrides = {}) => verifyLibraryBackupSnapshot(image, {...expected, nativeReadbackSha256:sha(image), ...overrides}), close:async () => {db.close(); assert.equal(path.dirname(root),await fs.realpath(os.tmpdir())); assert.ok(path.basename(root).startsWith('dam-snapshot-')); await fs.rm(root,{recursive:true,force:true})}}
}
for (const version of [1,9,13]) await test('bounded serialized full identity/schema verifier: v'+version, async () => {
  const f = await fixture(version)
  try {
    const image = f.db.serialize(); assert.equal(f.verify(image).sha256,sha(image))
    const db = new Database(image,{readonly:true})
    try {
      assert.equal(db.readonly,true); db.pragma('query_only=ON')
      assert.deepEqual(db.pragma('database_list'),[{seq:0,name:'main',file:''}])
      assert.equal(db.pragma('journal_mode',{simple:true}),'memory')
      assert.equal(inspectSerializedLibraryControlStore(db,f.expected.declaration).kind,'recovery-required','transaction required')
      db.transaction(() => {
        assert.equal(inspectSerializedLibraryControlStore(db,f.expected.declaration).kind,'compatible')
        assert.equal(inspectLibraryControlStore(db,f.expected.declaration).kind,'recovery-required','file gate retained')
        assert.throws(() => db.exec('DELETE FROM library_control_identity'),/readonly/)
      })()
    } finally { db.close() }
    for (const key of ['lineageIdentity','libraryIdentity','controlStoreIdentity','managedOriginalsRelativePath']) {
      assert.throws(() => f.verify(image,{declaration:{...f.expected.declaration,[key]:'wrong'}}),/BACKUP_SNAPSHOT_INVALID/)
    }
    for (const overrides of [{generation:'wrong'},{schemaVersion:version+1},{nativeReadbackSha256:'0'.repeat(64)},{nativeReadbackSha256:'bad'}]) assert.throws(() => f.verify(image,overrides),/BACKUP_SNAPSHOT_INVALID/)
    for (const bad of [Buffer.alloc(10),Buffer.alloc(BACKUP_SNAPSHOT_MAX_BYTES+1),image.subarray(0,100),Buffer.alloc(image.length)]) assert.throws(() => f.verify(bad),/BACKUP_SNAPSHOT_INVALID/)
  } finally { await f.close() }
})
await test('full verifier rejects unknown SQL, unsettled journal, unsupported version and FK orphan',async () => {
  const f = await fixture(1)
  try {
    const image = f.db.serialize()
    for (const sql of ['CREATE TABLE unauthorized(value TEXT)', "INSERT INTO library_operation_journal(operation_identity,state) VALUES('test-op','pending')", 'PRAGMA user_version=99', "INSERT INTO asset_tags(asset_id,tag_id,created_at,updated_at) VALUES('missing','missing','synthetic','synthetic')"]) {
      const changed = new Database(image)
      try { changed.pragma('foreign_keys=OFF'); changed.exec(sql); assert.throws(() => f.verify(changed.serialize()),/BACKUP_SNAPSHOT_INVALID/) }
      finally { changed.close() }
    }
  } finally { await f.close() }
})
