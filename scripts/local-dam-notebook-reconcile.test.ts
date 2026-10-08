// Actual NotebookSession and WorkspaceDraft modules with deferred synthetic reads.
// No Host, database, model, account, source media or external service is used.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { AssetNotebook, NotebookSnapshot, NotebookSaveRequest } from '../src/shared/contracts/asset-notebook.contract'
import type { WorkspaceDraftInput, WorkspaceDraftRecord, WorkspaceDraftScope } from '../src/shared/contracts/workspace-draft.contract'

const storage = new Map<string, string>(), received: WorkspaceDraftInput[] = []
Object.defineProperty(globalThis, 'window', { configurable: true, value: {
  dispatchEvent() {}, sessionStorage: { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) }
} })
const { installWorkspaceClient } = await import('../src/renderer/workspace-client')
installWorkspaceClient({ transitions: { ready: async () => {} }, drafts: {
  put: async (input: WorkspaceDraftInput) => { received.push(structuredClone(input)); return input }, remove: async () => ({ success: true })
} } as any)
const drafts = await import('../src/renderer/workspace-drafts')
const { createNotebookSession, libraryNotebookSession, clearLibraryNotebookSession } = await import('../src/renderer/components/library/canvas/notebook-session')
type Result = { success: true; value: NotebookSnapshot } | { success: false; code: string; error: string }
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(yes => { resolve = yes }); return { promise, resolve } }
const book = (name: string, text?: string): AssetNotebook => ({ pages: [{ id: 'page:one', name, elements: text ? [{ id: 'element:one', kind: 'text', x: 10, y: 10, text, color: '#123456', stroke: 1 }] : [] }], active: 'page:one' })
const snapshot = (revision: number, name: string): NotebookSnapshot => ({ book: book(name), revision, sessionToken: 'session:synthetic', sourceRef: 'preview:synthetic', requiresUpgrade: false })
const scope = { libraryIdentity: 'library:synthetic', generation: 'generation:synthetic' }
const draftScope = (entityId: string): WorkspaceDraftScope => ({ ...scope, entityId, kind: 'notebook' })
const ok = (value: NotebookSnapshot): Result => ({ success: true, value: structuredClone(value) })
const remove = async (entityId: string) => { drafts.removeWorkspaceDraft(draftScope(entityId)); await drafts.flushWorkspaceDrafts() }

await test('reconciliation uses edits made while its authoritative read is pending, including the latest page name and mark', async () => {
  const id = 'asset:typing', wait = deferred<Result>(); let reading = false
  const session = createNotebookSession(scope, () => ({ notebookRead: async () => reading ? wait.promise : ok(snapshot(1, 'Original page')), notebookSave: async () => ok(snapshot(3, 'Unused save')) }))
  try {
    await session.ensure!(id); session.hold({ [id]: book('Before pending review', 'Before pending text') }); reading = true
    const pending = session.reconcile!(id)
    session.hold({ [id]: book('Typed while reading', 'Latest mark while reading') })
    wait.resolve(ok(snapshot(2, 'Peer committed page'))); const combined = await pending
    assert.equal(combined[id].pages[0].name, 'Peer committed page')
    const copied = combined[id].pages.find(page => page.id !== 'page:one')
    assert.ok(copied, 'the current local edits need an independent conflict copy')
    assert.match(copied.name, /^Typed while reading/)
    assert.equal(copied.elements[0].text, 'Latest mark while reading')
    assert.equal(combined[id].pages.some(page => page.name.startsWith('Before pending review')), false)
    assert.equal(session.dirty(id), true)
  } finally { session.dispose(); await remove(id) }
})

await test('an older reconciliation read cannot replace a newer reviewed book or its expected save revision', async () => {
  const id = 'asset:ordered', waits: ReturnType<typeof deferred<Result>>[] = [], saves: NotebookSaveRequest[] = []; let reading = false
  const session = createNotebookSession(scope, () => ({
    notebookRead: async () => { if (!reading) return ok(snapshot(1, 'Original page')); const wait = deferred<Result>(); waits.push(wait); return wait.promise },
    notebookSave: async input => { saves.push(structuredClone(input)); return ok({ ...snapshot(input.expectedRevision + 1, 'Saved response'), book: structuredClone(input.book) }) }
  }))
  try {
    await session.ensure!(id); session.hold({ [id]: book('Local input across reads', 'Retained mark') }); reading = true
    const older = session.reconcile!(id); const olderResult = older.then(value => ({ value }), error => ({ error }))
    const newer = session.reconcile!(id); assert.equal(waits.length, 2)
    waits[1].resolve(ok(snapshot(3, 'Newest peer committed page'))); await newer
    waits[0].resolve(ok(snapshot(2, 'Obsolete peer committed page'))); await olderResult
    assert.equal(session.load()[id].pages[0].name, 'Newest peer committed page', 'a late older read cannot replace the reviewed authoritative pages')
    assert.equal(session.load()[id].pages.some(page => page.name.startsWith('Obsolete peer committed page')), false)
    assert.equal(session.load()[id].pages.some(page => page.elements.some(element => element.text === 'Retained mark')), true)
    await session.save(session.load(), id)
    assert.equal(saves[0].expectedRevision, 3, 'the next save must retain the newer reviewed baseline')
  } finally { session.dispose(); await remove(id) }
})

await test('successful reconciliation checkpoints its visible conflict pages and reviewed baseline for explicit refresh recovery', async () => {
  const id = 'asset:checkpoint'; let remote = snapshot(1, 'Original page')
  const api = { notebookRead: async () => ok(remote), notebookSave: async () => ok(remote) }
  const session = createNotebookSession(scope, () => api); let reopened: ReturnType<typeof createNotebookSession> | undefined
  try {
    await session.ensure!(id); session.hold({ [id]: book('Local conflict page', 'Local retained annotation') }); await drafts.flushWorkspaceDrafts()
    remote = snapshot(2, 'Peer committed page'); const combined = await session.reconcile!(id); await drafts.flushWorkspaceDrafts()
    const record = received.filter(input => input.entityId === id).at(-1)!
    assert.deepEqual(record.value, combined[id], 'the received recovery draft must match the visible reconciled pages')
    assert.deepEqual(record.base, { revision: 2, sourceRef: remote.sourceRef, book: remote.book })
    session.dispose(); drafts.clearWorkspaceDraftView()
    const recovery: WorkspaceDraftRecord = { ...record, id: 'draft:notebook-checkpoint', revision: 1, updatedAt: 1, clientKind: 'browser', owned: true, activeElsewhere: false }
    drafts.rememberRecoveredDraft(recovery)
    reopened = createNotebookSession(scope, () => api); const restored = await reopened.ensure!(id)
    assert.deepEqual(restored[id], combined[id], 'explicit refresh recovery must keep the exact conflict-copy ids and current annotations')
    assert.equal(reopened.dirty(id), true)
    assert.deepEqual(drafts.currentWorkspaceDraft(draftScope(id))?.base, record.base)
  } finally { session.dispose(); reopened?.dispose(); await remove(id) }
})

await test('clearing the active notebook session rejects a late reconciliation without reviving it or replacing a new session draft', async () => {
  const id = 'asset:clear', wait = deferred<Result>(); let reading = false
  const previous = libraryNotebookSession(scope, () => ({ notebookRead: async () => reading ? wait.promise : ok(snapshot(1, 'Original page')), notebookSave: async () => ok(snapshot(2, 'Unused save')) }))
  let current: ReturnType<typeof libraryNotebookSession> | undefined
  try {
    await previous.ensure!(id); previous.hold({ [id]: book('Input before clear') }); reading = true
    const pending = previous.reconcile!(id); const result = pending.then(value => ({ value }), error => ({ error }))
    clearLibraryNotebookSession(); drafts.clearWorkspaceDraftView()
    current = libraryNotebookSession(scope, () => ({ notebookRead: async () => ok(snapshot(3, 'New session saved page')), notebookSave: async () => ok(snapshot(4, 'Unused save')) }))
    await current.ensure!(id); current.hold({ [id]: book('New session local input', 'New session mark') })
    wait.resolve(ok(snapshot(2, 'Late old peer page'))); const settled = await result
    assert.ok('error' in settled, 'a disposed session may not resolve a usable reconciliation')
    assert.deepEqual(previous.load(), {}); assert.equal(current.load()[id].pages[0].name, 'New session local input')
    assert.equal(drafts.currentWorkspaceDraft(draftScope(id))?.value && (drafts.currentWorkspaceDraft(draftScope(id))!.value as AssetNotebook).pages[0].name, 'New session local input')
    await drafts.flushWorkspaceDrafts(); assert.equal(received.filter(input => input.entityId === id).at(-1)?.base && (received.filter(input => input.entityId === id).at(-1)!.base as { revision: number }).revision, 3)
  } finally { clearLibraryNotebookSession(); await remove(id) }
})

drafts.clearWorkspaceDraftView(); delete (globalThis as { window?: unknown }).window
