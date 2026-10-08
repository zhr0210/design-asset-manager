import assert from 'node:assert/strict'
import { registerSettingsIpc } from '../src/main/ipc/settings.ipc'
import { createWorkspaceClient } from '../src/shared/client/workspace-client'
import type { AppSettings } from '../src/shared/types/settings.types'
import { registerAiBackendIpc } from '../src/main/ipc/ai-backend.ipc'

// Agreed Client / Host seam: concurrent form saves must not overwrite an edit.
let saved = { libraryPath: 'fixture', concurrency: 3, delayInterval: 1.5 } as AppSettings
const handlers = new Map<string, (...args: any[]) => any>()
const trusted = Object.freeze({})
registerSettingsIpc({ getSettings: () => saved, saveSettings: patch => (saved = { ...saved, ...patch }) },
  async () => ({ canceled: true, path: '' }), (channel, handler) => handlers.set(channel, handler), event => event === trusted)
const client = () => createWorkspaceClient({ invoke: async (channel, ...args) => handlers.get(channel)!(trusted, ...args), on() {}, removeListener() {} })
const first = client(), second = client()
const initial = await second.settingsLoad()
await first.settingsSave({ concurrency: 4 }, { concurrency: initial.concurrency })
await assert.rejects(second.settingsSave({ concurrency: 5 }, { concurrency: initial.concurrency }), /SETTINGS_CONFLICT/)
assert.equal((await second.settingsLoad()).concurrency, 4)
await second.settingsSave({ delayInterval: 2 }, { delayInterval: initial.delayInterval })
assert.equal((await first.settingsLoad()).delayInterval, 2, 'independent fields can be committed without replacing the other form')
console.log('PASS shared settings reject stale field saves and accept independent edits')
registerAiBackendIpc({ settings: { getSettings: () => saved, saveSettings: patch => (saved = { ...saved, ...patch }) },
  isTrustedSender: event => event === trusted, handle: (channel, handler) => handlers.set(channel, handler) })
const original = (await first.aiBackendList())[0]
await first.aiBackendSave({ ...original, name: '第一端连接' }, original)
await assert.rejects(second.aiBackendSave({ ...original, name: '第二端连接草稿' }, original), /BACKEND_CONFLICT/)
assert.equal((await second.aiBackendList())[0].name, '第一端连接')
