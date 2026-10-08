import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createAppStorage } from '../src/main/app-storage/app-storage'
import { DownloadService } from '../src/main/services/download.service'

const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'dam-app-storage-')))
const storage = createAppStorage(root)
try {
  const tables = storage.database.prepare("SELECT name FROM sqlite_schema WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all() as Array<{ name: string }>
  assert.deepEqual(tables.map((table) => table.name), ['download_tasks'])
  const downloads = new DownloadService(storage.database)
  downloads.saveTask({ id: 'fixture-download', asset_title: 'Fixture', source_site_id: 'fixture-site', download_url: 'https://fixture.invalid/image', save_path: '/synthetic/fixture.png', status: 'queued', progress: 0, retry_count: 0 })
  assert.equal(downloads.listTasks().length, 1)
  storage.database.exec("CREATE TABLE sites (id TEXT); INSERT INTO sites VALUES ('legacy-preserved')")
  storage.close()
  const reopened = createAppStorage(root)
  assert.equal((reopened.database.prepare('SELECT id FROM sites').get() as any).id, 'legacy-preserved')
  reopened.close()
} finally {
  storage.close()
}
console.log('App storage isolation passed')
