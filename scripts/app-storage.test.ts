import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createAppStorage } from '../src/main/app-storage/app-storage'

const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'dam-app-storage-')))
const storage = createAppStorage(root)
try {
  const tables = storage.database.prepare("SELECT name FROM sqlite_schema WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all() as Array<{ name: string }>
  assert.deepEqual(tables.map((table) => table.name), [])
  storage.database.exec("CREATE TABLE download_tasks (id TEXT); INSERT INTO download_tasks VALUES ('retired-preserved'); CREATE TABLE sites (id TEXT); INSERT INTO sites VALUES ('legacy-preserved')")
  storage.close()
  const reopened = createAppStorage(root)
  assert.equal((reopened.database.prepare('SELECT id FROM sites').get() as any).id, 'legacy-preserved')
  assert.equal((reopened.database.prepare('SELECT id FROM download_tasks').get() as any).id, 'retired-preserved')
  reopened.close()
} finally {
  storage.close()
}
console.log('App storage isolation passed')
