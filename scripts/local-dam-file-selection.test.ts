import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {createFileSelection} from '../src/main/local-host/file-selection'

const fixture = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'dam-picker-boundary-')))
const root = path.join(fixture, 'allowed'), sibling = path.join(fixture, 'sibling')
await fs.mkdir(root); await fs.mkdir(sibling)
let notifyStarted: () => void = () => {}
const started = new Promise<void>(resolve => {notifyStarted = resolve})
const picker = createFileSelection({syntheticRoot: root, generation: () => 'fixture:1', notify: () => notifyStarted()})
const selected = picker.select('fixture-owner', {properties: ['openDirectory']})
const originalRealpath = fs.realpath
try {
  await started
  const session = (await picker.pending('fixture-owner'))!
  const resolved: string[] = []
  fs.realpath = (async (candidate: string, ...args: any[]) => {
    resolved.push(String(candidate))
    return (originalRealpath as any)(candidate, ...args)
  }) as typeof fs.realpath
  await assert.rejects(picker.browse('fixture-owner', {session: session.id, path: sibling}), /测试模式只能/)
  assert.equal(resolved.includes(sibling), false, 'deny lexical escape before resolving the target')
  const missing = path.join(sibling, 'missing')
  await assert.rejects(picker.browse('fixture-owner', {session: session.id, path: missing}), /测试模式只能/)
  assert.equal(resolved.includes(missing), false, 'nonexistent outside targets must not be probed')
  const link = path.join(root, 'escape-link')
  await fs.symlink(sibling, link, process.platform === 'win32' ? 'junction' : 'dir')
  await assert.rejects(picker.browse('fixture-owner', {session: session.id, path: link}), /链接目录/)
  assert.equal(resolved.includes(link), false, 'reject links before following their targets')
  const created = await picker.createDirectory('fixture-owner', {session: session.id, name: 'within-fixture'})
  const entry = created.entries.find(entry => entry.name === 'within-fixture')!
  await picker.browse('fixture-owner', {session: session.id, entry: entry.id})
  assert.equal((await picker.pending('fixture-owner'))!.directory, path.join(root, 'within-fixture'))
  picker.cancel('fixture-owner', session.id)
  assert.equal((await selected).canceled, true)
  // The real bounded listing must be confirmable as one reviewed selection.
  // This uses actual temporary filesystem entries, not an injected path map.
  const bulk = path.join(root, 'bulk')
  await fs.mkdir(bulk)
  for (let i = 0; i < 2000; i++) await fs.writeFile(path.join(bulk, `public-${String(i).padStart(4, '0')}.png`), 'controlled selector file')
  const bulkStarted = new Promise<void>(resolve => { notifyStarted = resolve })
  const pendingBulk = picker.select('fixture-owner', { properties: ['openFile', 'multiSelections'], defaultPath: bulk })
  await bulkStarted
  const bulkSnapshot = (await picker.pending('fixture-owner'))!
  assert.equal(bulkSnapshot.entries.length, 2000)
  const ids = bulkSnapshot.entries.map(entry => entry.id)
  await assert.rejects(picker.confirm('fixture-owner', { session: bulkSnapshot.id, entries: [...ids, 'selection-entry:over-limit'] }))
  await assert.rejects(picker.confirm('unrelated-owner', { session: bulkSnapshot.id, entries: ids }))
  await assert.rejects(picker.confirm('fixture-owner', { session: bulkSnapshot.id, entries: [ids[0], ids[0]] }))
  await picker.confirm('fixture-owner', { session: bulkSnapshot.id, entries: ids })
  const bulkResult = await pendingBulk
  assert.equal(bulkResult.canceled, false)
  assert.equal(bulkResult.filePaths.length, 2000)
  assert.equal(new Set(bulkResult.filePaths).size, 2000)
  assert.ok(bulkResult.filePaths.every(file => path.dirname(file) === bulk))
  const singleStarted = new Promise<void>(resolve => { notifyStarted = resolve })
  const pendingSingle = picker.select('fixture-owner', { properties: ['openFile'], defaultPath: bulk })
  await singleStarted
  const singleSnapshot = (await picker.pending('fixture-owner'))!
  await assert.rejects(picker.confirm('fixture-owner', { session: singleSnapshot.id, entries: singleSnapshot.entries.slice(0, 2).map(entry => entry.id) }), /只能选择一个/)
  await picker.confirm('fixture-owner', { session: singleSnapshot.id, entries: [singleSnapshot.entries[0].id] })
  assert.equal((await pendingSingle).filePaths.length, 1)
  console.log('PASS scoped picker rejects targets before filesystem resolution, retains session and permits in-scope directories')
} finally {
  fs.realpath = originalRealpath
  picker.cancelAll()
  await selected
  assert.equal(path.dirname(fixture), await fs.realpath(os.tmpdir()))
  assert.ok(path.basename(fixture).startsWith('dam-picker-boundary-'))
  await fs.rm(fixture, {recursive: true, force: true})
}
