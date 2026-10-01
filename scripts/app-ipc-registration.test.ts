import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { createAppStorage } from '../src/main/app-storage/app-storage'
import { createActiveLibraryHost } from '../src/main/library-lifecycle'
import { createProductionActiveLibraryHostDependencies } from '../src/main/library-lifecycle/production-active-library-dependencies'
import { registerMainIpcComposition } from '../src/main/ipc/main-ipc-composition'
import { readFile } from 'node:fs/promises'
import { createNewInstallAppSettingsDefaults } from '../src/main/services/settings/settings-defaults.builder'
import { createModelLibraryWorkspace } from '../src/main/model-library-workspace/model-library-workspace'

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'dam-app-ipc-registration-'))
const appStorage = createAppStorage(path.join(root, 'app-state'))
const host = createActiveLibraryHost(createProductionActiveLibraryHostDependencies({
  selectLibraryDirectory: async () => ({ kind: 'cancelled' as const }),
  selectLocalFiles: async () => ({ kind: 'cancelled' as const })
}))

const handlers = new Map<string, unknown>()
const events = new Map<string, unknown>()
let settings = createNewInstallAppSettingsDefaults()
const settingsService = {
  getSettings: () => settings,
  saveSettings: (patch: Partial<typeof settings>) => { settings = { ...settings, ...patch }; return settings }
}
const modelWorkspace = createModelLibraryWorkspace({ officialCatalogReleaseState: 'missing' })
const connectedProjection={state:'unconfigured',evidenceLevel:'not-connected',provider:'eagle',providerIdentity:null,libraryIdentity:null,generation:null,displayName:null,originalAuthority:'eagle-single-original',scope:null,grant:'none',capabilities:null,counts:{indexed:0,inScope:0,pending:0,conflicts:0,trashed:0,cleanupCandidates:0},cursor:null,indexingComplete:false}
const connectedHost=new Proxy({inspect:()=>connectedProjection},{get:(target,key)=>key in target?(target as any)[key]:async()=>[]}) as any
const legacyProjection={state:'unconfigured',evidenceLevel:'not-opened',identity:null,generation:null,counts:{assets:0,tags:0,relations:0},limitations:[]}
const legacyHost=new Proxy({inspect:()=>legacyProjection},{get:(target,key)=>key in target?(target as any)[key]:async()=>[]}) as any
const handle = (channel: string, handler: unknown): void => {
  if (handlers.has(channel) || events.has(channel)) throw new Error(`duplicate IPC channel: ${channel}`)
  handlers.set(channel, handler)
}


registerMainIpcComposition({
  appDatabase: appStorage.database,
  settingsService,
  selectSettingsFolder: async () => ({ canceled: true, path: '' }),
  modelLibraryWorkspace: { getWorkspace: () => modelWorkspace },
  activeLibrary: { host, isTrustedSender: () => true },
  externalConnectedLibrary:{host:connectedHost,legacy:legacyHost,isTrustedSender:()=>true},
  handle
})

for (const prefix of ['library:', 'library-trash:']) {
  assert.ok([...handlers.keys()].some((channel) => channel.startsWith(prefix)), `missing ${prefix} handler`)
}
for (const channel of ['sites:list', 'sites:save', 'sites:delete', 'sites:login:start', 'sites:login:complete']) assert.equal(handlers.has(channel), false)
for (const channel of ['download:list', 'download:save', 'download:clear']) assert.equal(handlers.has(channel), true)
for (const channel of ['browser:load-url', 'browser:go-back', 'browser:go-forward', 'browser:reload', 'browser:resize', 'browser:hide', 'browser:show', 'browser:capture-snapshot']) assert.equal(handlers.has(channel), false)
assert.equal(handlers.has('search:run'), false)
assert.equal(handlers.has('extractor:scan-current-page'), false)
assert.equal(events.size, 0)

function resolvePreloadInvokeChannels(source: string, constants: Map<string, string>): string[] {
  const channels: string[] = []
  const pattern = /\b(?:ipcRenderer|invoker)\.invoke\(\s*(['"])([^'"]+)\1|\b(?:ipcRenderer|invoker)\.invoke\(\s*([A-Za-z_$][\w$]*)/g
  for (const match of source.matchAll(pattern)) {
    const literal = match[2]
    const identifier = match[3]
    if (literal) channels.push(literal)
    else if (identifier && identifier !== 'channel') {
      const value = constants.get(identifier)
      assert.ok(value, `unresolved preload invoke channel ${identifier}`)
      channels.push(value)
    }
  }
  return channels
}

const sharedContractFiles = await fs.readdir(path.join(process.cwd(), 'src/shared/contracts'))
const constantValues = new Map<string, string>()
for (const file of sharedContractFiles.filter((name) => name.endsWith('.ts'))) {
  const source = await readFile(path.join(process.cwd(), 'src/shared/contracts', file), 'utf8')
  for (const match of source.matchAll(/export const ([A-Z][A-Z0-9_]+)\s*=\s*['"]([^'"]+)['"]/g)) constantValues.set(match[1], match[2])
  for (const match of source.matchAll(/export const ([A-Z][A-Z0-9_]+)\s*=\s*\n\s*['"]([^'"]+)['"]/g)) constantValues.set(match[1], match[2])
}
const preloadSources = await Promise.all([
  readFile(path.join(process.cwd(), 'src/preload/index.ts'), 'utf8'),
  readFile(path.join(process.cwd(), 'src/preload/asset-card.ts'), 'utf8'),
  readFile(path.join(process.cwd(), 'src/preload/work-window.ts'), 'utf8'),
  readFile(path.join(process.cwd(), 'src/preload/external-connected-library.preload.ts'), 'utf8'),
  readFile(path.join(process.cwd(), 'src/preload/model-library-workspace.preload.ts'), 'utf8')
])
const preloadInvokeChannels = [...new Set(preloadSources.flatMap((source) => resolvePreloadInvokeChannels(source, constantValues)))]
const missing = preloadInvokeChannels.filter((channel) => !handlers.has(channel))
assert.deepEqual(missing, [], `preload invoke channels lack exactly one Main handler: ${missing.join(', ')}`)
for (const channel of preloadInvokeChannels) assert.equal((handlers.has(channel) ? 1 : 0), 1, `preload channel ${channel} is not uniquely handled`)

await host.close()
appStorage.close()
console.log(`Main IPC registration composition passed (${handlers.size} invoke channels, ${events.size} event channels)`)
