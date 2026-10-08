import { createHash, randomBytes } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import type { SecretProtection } from '../ai-credentials/credential-vault'
import type { EagleProviderPort } from './eagle-provider.port'
import { createEagleWebApiAdapter } from './eagle-web-api.adapter'
import { createEagleCompanionHttpAdapter } from './eagle-companion-http.adapter'
import type { EaglePairingProjection } from '../../shared/contracts/external-connected-library.contract'

const ORIGIN = 'http://127.0.0.1:41596'
const ID = /^[A-Za-z0-9][A-Za-z0-9._:~-]{0,255}$/u
interface Session {
  token: string
  requestedGrant: 'read-only' | 'read-write'
  identity?: { providerIdentity: string; libraryIdentity: string; volumeIdentity: string }
}

/** Pairing secrets never leave Main. No Eagle requests until explicit begin or a saved grant. */
export function createEaglePairing(input: {
  file: string
  stagingRoot: string
  protection: SecretProtection
  fetch?: typeof fetch
}) {
  const fetchImpl = input.fetch ?? globalThis.fetch
  let session: Session | null = null
  let loaded = false
  let adapter: EagleProviderPort | null = null
  let projection: EaglePairingProjection = {
    state: 'unpaired', displayName: null, requestedGrant: null, protocolVersion: 1
  }
  let tail: Promise<unknown> = Promise.resolve()
  const locked = <T>(fn: () => Promise<T>) => {
    const result = tail.then(fn, fn)
    tail = result.catch(() => undefined)
    return result
  }
  const exchange = async (body: unknown): Promise<any> => {
    const response = await fetchImpl(`${ORIGIN}/v1/dam-eagle-pairing`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body), signal: AbortSignal.timeout(5000), redirect: 'error'
    })
    if (!response.ok) throw Error('EAGLE_COMPANION_UNAVAILABLE')
    const bytes = await response.text()
    if (Buffer.byteLength(bytes) > 16384) throw Error('EAGLE_PAIRING_INVALID')
    return JSON.parse(bytes)
  }
  const load = async () => {
    if (loaded) return
    loaded = true
    if (!input.protection.available()) return
    try {
      const stat = await fs.lstat(input.file)
      if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 16384) return
      const value = JSON.parse(input.protection.decrypt(await fs.readFile(input.file)))
      if (/^[a-f0-9]{64}$/u.test(value.token) && ['read-only', 'read-write'].includes(value.requestedGrant) &&
          value.identity && Object.values(value.identity).length === 3 && Object.values(value.identity).every(id => typeof id === 'string' && ID.test(id))) {
        session = value
        projection = { ...projection, state: 'unavailable', requestedGrant: value.requestedGrant }
      }
    } catch { /* Corrupt/unavailable credentials never grant access. Explicit pairing repairs. */ }
  }
  const save = async () => {
    if (!input.protection.available()) throw Error('EAGLE_SECRET_STORAGE_UNAVAILABLE')
    await fs.mkdir(path.dirname(input.file), { recursive: true, mode: 0o700 })
    const temporary = `${input.file}.${randomBytes(8).toString('hex')}.tmp`
    try {
      await fs.writeFile(temporary, input.protection.encrypt(JSON.stringify(session)), { flag: 'wx', mode: 0o600 })
      await fs.rename(temporary, input.file)
    } finally { await fs.rm(temporary, { force: true }) }
  }
  const observe = async () => {
    await load()
    if (!session) return null
    const response = await exchange({ kind: 'observe', sessionToken: session.token })
    if (response?.state !== 'paired' || response.protocolVersion !== 1 ||
        response.requestedGrant !== session.requestedGrant || typeof response.displayName !== 'string' ||
        typeof response.libraryPath !== 'string' || !response.identity ||
        !['providerIdentity', 'libraryIdentity', 'volumeIdentity'].every(key => ID.test(response.identity[key]))) {
      projection = { ...projection, state: response?.state === 'pending' ? 'awaiting-eagle' : 'unavailable' }
      adapter = null
      return null
    }
    const realPath = await fs.realpath(response.libraryPath)
    const stat = await fs.stat(realPath, { bigint: true })
    if (!stat.isDirectory() || stat.ino === 0n || stat.dev === 0n) throw Error('EAGLE_IDENTITY_UNAVAILABLE')
    const identity = {
      providerIdentity: response.identity.providerIdentity as string,
      libraryIdentity: `eagle-library:${digest(`${stat.dev}:${stat.ino}:${stat.birthtimeNs}`)}`,
      volumeIdentity: `eagle-volume:${digest(String(stat.dev))}`
    }
    if (identity.libraryIdentity !== response.identity.libraryIdentity || identity.volumeIdentity !== response.identity.volumeIdentity ||
        session.identity && JSON.stringify(session.identity) !== JSON.stringify(identity)) {
      adapter = null
      projection = { ...projection, state: 'unavailable' }
      return null
    }
    if (!session.identity) { session.identity = identity; await save() }
    projection = { ...projection, state: 'paired', displayName: response.displayName, requestedGrant: session.requestedGrant }
    return { identity, libraryPath: realPath }
  }
  const resolveAdapter = async () => {
    const observed = await observe().catch(() => null)
    if (!observed || !session) return null
    if (!adapter) {
      const active = session
      adapter = createEagleWebApiAdapter({
        token: active.token,
        companion: createEagleCompanionHttpAdapter({ origin: ORIGIN, fetch: fetchImpl }),
        // The companion validates token, grant, current library and endpoint before forwarding.
        fetch: async (url, init) => {
          const parsed = new URL(String(url))
          if (parsed.origin !== 'http://127.0.0.1:41595') throw Error('EAGLE_ORIGIN_INVALID')
          return fetchImpl(`${ORIGIN}/v1/dam-eagle-web-api`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionToken: active.token, libraryIdentity: active.identity!.libraryIdentity,
              endpoint: parsed.pathname, method: init?.method, payload: init?.body ? JSON.parse(String(init.body)) : null }),
            signal: init?.signal, redirect: 'error'
          })
        },
        resolveTrustedIdentity: async info => {
          const current = await observe()
          if (!current || await fs.realpath(info.libraryPath) !== current.libraryPath) throw Error('EAGLE_LIBRARY_CHANGED')
          return current.identity
        },
        readOnly: active.requestedGrant === 'read-only'
      })
    }
    return adapter
  }
  const provider: EagleProviderPort = {
    negotiate: async () => (await resolveAdapter())?.negotiate() ?? null,
    listPage: async request => { const current = await resolveAdapter(); if (!current) throw Error('EAGLE_PROVIDER_UNAVAILABLE'); return current.listPage(request) },
    getItem: async id => (await resolveAdapter())?.getItem(id) ?? { kind: 'unavailable', reason: 'transport' },
    readPreview: async id => (await resolveAdapter())?.readPreview(id) ?? null,
    updateMetadata: async (id, patch) => (await resolveAdapter())?.updateMetadata(id, patch) ?? { kind: 'unavailable' },
    addFile: async (id, file, metadata) => (await resolveAdapter())?.addFile(id, file, metadata) ?? { kind: 'unavailable' },
    replaceFile: async (id, file, before, after) => (await resolveAdapter())?.replaceFile(id, file, before, after) ?? { kind: 'unavailable' },
    setDeleted: async (id, deleted) => (await resolveAdapter())?.setDeleted(id, deleted) ?? { kind: 'unavailable' },
    permanentlyDelete: async () => ({ kind: 'unsupported' }),
    disconnect: async () => { await adapter?.disconnect(); adapter = null }
  }
  return {
    provider,
    inspect: () => locked(async () => {
      if (!input.protection.available()) return { ...projection, state: 'storage-unavailable' as const }
      await observe().catch(() => { adapter = null; projection = { ...projection, state: 'unavailable' } })
      return { ...projection }
    }),
    begin: (requestedGrant: 'read-only' | 'read-write') => locked(async () => {
      if (!input.protection.available()) return { ...projection, state: 'storage-unavailable' as const }
      await load()
      if (projection.state === 'awaiting-eagle') return { ...projection }
      if (session && await observe().catch(() => null)) return { ...projection }
      if (session) await exchange({ kind: 'revoke', sessionToken: session.token }).catch(() => undefined)
      adapter = null
      session = { token: randomBytes(32).toString('hex'), requestedGrant }
      try {
        const result = await exchange({ kind: 'begin', sessionToken: session.token, requestedGrant, stagingRoot: input.stagingRoot })
        projection = { ...projection, displayName: null, requestedGrant,
          state: result?.state === 'pending' ? 'awaiting-eagle' : 'unavailable' }
      } catch { projection = { ...projection, state: 'unavailable' } }
      return { ...projection }
    }),
    revoke: () => locked(async () => {
      await load()
      if (session) await exchange({ kind: 'revoke', sessionToken: session.token }).catch(() => undefined)
      session = null; adapter = null
      await fs.rm(input.file, { force: true })
      projection = { state: 'unpaired', displayName: null, requestedGrant: null, protocolVersion: 1 }
      return { ...projection }
    })
  }
}
export type EaglePairing = ReturnType<typeof createEaglePairing>
function digest(text: string) { return createHash('sha256').update(text).digest('hex') }
