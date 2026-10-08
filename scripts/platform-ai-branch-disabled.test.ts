import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createAppStorage } from '../src/main/app-storage/app-storage'
import { createActiveLibraryHost } from '../src/main/library-lifecycle'
import { createProductionActiveLibraryHostDependencies } from '../src/main/library-lifecycle/production-active-library-dependencies'
import { registerMainIpcComposition } from '../src/main/ipc/main-ipc-composition'
import { createNewInstallAppSettingsDefaults } from '../src/main/services/settings/settings-defaults.builder'
import { createModelLibraryWorkspace } from '../src/main/model-library-workspace/model-library-workspace'
import type { MainIpcHandleRegistrar } from '../src/main/ipc/ipc-registrar'

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'dam-branch-disabled-'))
const storage = createAppStorage(path.join(root, 'app-state'))
const host = createActiveLibraryHost(createProductionActiveLibraryHostDependencies({
  selectLibraryDirectory: async () => ({ kind: 'cancelled' }), selectLocalFiles: async () => ({ kind: 'cancelled' })
}))
const handlers = new Map<string, Parameters<MainIpcHandleRegistrar>[1]>()
let settings = createNewInstallAppSettingsDefaults()
try {
  registerMainIpcComposition({
    appDatabase: storage.database, activeLibrary: { host, isTrustedSender: () => true },
    settingsService: { getSettings: () => settings, saveSettings: patch => { settings = { ...settings, ...patch }; return settings } },
    selectSettingsFolder: async () => ({ canceled: true, path: '' }),
    modelLibraryWorkspace: { getWorkspace: () => createModelLibraryWorkspace({ officialCatalogReleaseState: 'missing' }) },
    handle: (channel, handler) => { assert.equal(handlers.has(channel), false, channel); handlers.set(channel, handler) }
  })
  const channels = [...handlers.keys()].filter(channel => /^(?:aiRuntime|ai-runtime|llama-runtime):/.test(channel))
  for (const required of ['ai-runtime:get-macos-ai-branch-status', 'ai-runtime:get-windows-ai-branch-status', 'aiRuntime:probePythonCudaExecution', 'aiRuntime:getPythonCudaStatus', 'aiRuntime:getWindowsCapabilities', 'llama-runtime:test-server']) assert.ok(channels.includes(required), required)
  for (const channel of channels) assert.deepEqual(await handlers.get(channel)!({} as never), {
    success: false, error: 'This operation is unavailable while Active Library authority is active.', code: 'LIBRARY_FEATURE_DISABLED'
  }, channel)
  console.log(`Production composition denies all ${channels.length} retained Runtime channels`)
} finally { await host.close(); storage.close() }
