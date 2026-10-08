import assert from 'node:assert/strict'
;(globalThis as any).window = {}
const { installWorkspaceClient } = await import('../src/renderer/workspace-client')
const fail = async () => { throw Error('SYNTHETIC_READ_FAILED') }
installWorkspaceClient({ settingsLoad: fail, listDownloads: fail, managedDownloads: { list: async () => ({ ok: false }) } } as any)
const { useSettingsStore } = await import('../src/renderer/stores/settings.store')
const { useDownloadStore } = await import('../src/renderer/stores/download.store')
await useSettingsStore.getState().loadSettings()
await useDownloadStore.getState().loadDownloads()
await useDownloadStore.getState().loadManaged()
await assert.rejects(useSettingsStore.getState().loadSettings(true), /SYNTHETIC_READ_FAILED/)
await assert.rejects(useDownloadStore.getState().loadDownloads(true), /SYNTHETIC_READ_FAILED/)
await assert.rejects(useDownloadStore.getState().loadManaged(true), /MANAGED_STATE_UNAVAILABLE/)
const { createWorkspaceClient } = await import('../src/shared/client/workspace-client')
const client = createWorkspaceClient({ invoke: async () => ({ success: false }), on() {}, removeListener() {} })
await assert.rejects(client.listAssets(), /素材列表暂时无法读取/)
console.log('PASS failed snapshots propagate to reconciliation and cannot masquerade as an empty library')
