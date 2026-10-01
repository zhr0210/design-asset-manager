import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { createAppStorage } from '../src/main/app-storage/app-storage'
import { createNewInstallAppSettingsDefaults } from '../src/main/services/settings/settings-defaults.builder'
import { registerSettingsIpc } from '../src/main/ipc/settings.ipc'
import { registerModelLibraryWorkspaceIpc } from '../src/main/ipc/model-library-workspace.ipc'
import { createModelLibraryWorkspace } from '../src/main/model-library-workspace/model-library-workspace'
import { createActiveLibraryHost } from '../src/main/library-lifecycle'
import { createProductionActiveLibraryHostDependencies } from '../src/main/library-lifecycle/production-active-library-dependencies'
import { registerActiveLibraryIpc } from '../src/main/ipc/active-library.ipc'

const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'dam-app-settings-model-')))
const appStorage = createAppStorage(path.join(root, 'app-state'))
let settings = createNewInstallAppSettingsDefaults()
const handlers = new Map<string, (event: unknown, ...args: any[]) => unknown>()
const handle = (channel: string, handler: (event: unknown, ...args: any[]) => unknown): void => {
  if (handlers.has(channel)) throw new Error(`duplicate IPC channel: ${channel}`)
  handlers.set(channel, handler)
}
const event = { sender: { id: 1 }, senderFrame: { parent: null, url: 'file:///synthetic/renderer/index.html' } }
const settingsService = {
  getSettings: () => settings,
  saveSettings: (patch: Partial<typeof settings>) => { settings = { ...settings, ...patch }; return settings }
}

registerSettingsIpc(settingsService, async () => ({ canceled: true, path: '' }), handle,()=>true)
const workspace = createModelLibraryWorkspace({ officialCatalogReleaseState: 'missing' })
registerModelLibraryWorkspaceIpc({ getWorkspace: () => workspace }, handle)

const target = path.join(root, 'library')
const host = createActiveLibraryHost(createProductionActiveLibraryHostDependencies({
  selectLibraryDirectory: async () => ({ kind: 'selected' as const, directory: target }),
  selectLocalFiles: async () => ({ kind: 'cancelled' as const })
}))
registerActiveLibraryIpc({ host, isTrustedSender: () => true }, handle)
const invoke = async (channel: string, ...args: any[]) => handlers.get(channel)!(event, ...args)

const initial = await invoke('settings:load')
assert.equal(initial.libraryPath, settings.libraryPath)
const saved = await invoke('settings:save', { concurrency: 9 })
assert.equal(saved.concurrency, 9)
assert.deepEqual(await invoke('settings:select-folder'), { canceled: true, path: '' })

const plan = await invoke('library:create:prepare')
assert.equal(plan.success, true)
assert.equal((await invoke('library:create:confirm', { receipt: plan.value.plan.receipt })).success, true)
assert.equal((await invoke('library:close')).success, true)
assert.equal((await invoke('library:reopen')).success, true)
assert.equal((await invoke('settings:load')).concurrency, 9)

const pageSummary = await invoke('model-library-workspace:summarize', { kind: 'page' })
assert.equal(pageSummary.ok, true)
assert.equal(pageSummary.value.catalog.state, 'unavailable')
assert.equal(pageSummary.value.catalog.reason, 'BUNDLE_MISSING')
assert.deepEqual(pageSummary.value.storage, { state: 'not-configured' })
const aiSummary = await invoke('model-library-workspace:summarize', { kind: 'ai-console' })
assert.deepEqual(aiSummary.value.catalog, { state: 'unavailable' })
assert.deepEqual(await invoke('model-library-workspace:configure-storage', { kind: 'review-recommended-location' }), {
  ok: false,
  error: { code: 'MODULE_UNAVAILABLE', retry: 'not-retryable' }
})
assert.deepEqual(await invoke('model-library-workspace:summarize', { kind: 'page', path: '/private' }), {
  ok: false,
  error: { code: 'INVALID_REQUEST', retry: 'not-retryable' }
})

await host.close()
appStorage.close()
console.log('App Settings and Model Workspace integration passed')
