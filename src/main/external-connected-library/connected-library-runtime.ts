import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'

import { Menu, nativeImage, Tray, safeStorage, type Protocol } from 'electron'
import { showNativeOpenDialog } from '../platform/native-open-dialog'

import type {
  ExternalConnectedLibrary,
  LegacyReadOnlyWorkspace
} from '../../shared/contracts/external-connected-library.contract'
import { createLegacyReadOnlyWorkspace } from '../legacy-readonly-workspace'
import { ConnectedLibraryBackgroundCoordinator } from './connected-library-background-coordinator'
import { createEagleCompanionHttpAdapter } from './eagle-companion-http.adapter'
import { createEagleWebApiAdapter } from './eagle-web-api.adapter'
import { createExternalConnectedLibrary } from './external-connected-library'
import { createEaglePairing, type EaglePairing } from './eagle-pairing'

export interface ConnectedSyntheticE2eConfiguration {
  eagleBaseUrl: string
  companionOrigin: string
  token: string
  libraryIdentity: string
  volumeIdentity: string
  editFile: string
  legacyDatabase: string
}

export interface ConnectedLibraryRuntime {
  connected: ExternalConnectedLibrary
  legacy: LegacyReadOnlyWorkspace
  background: ConnectedLibraryBackgroundCoordinator
  pairing?: EaglePairing
  companionArtifact(): Promise<{ fileName: string; bytesBase64: string; sha256: string }>
  registerProtocols(protocol: Protocol): void
  drain(): Promise<void>
}

export async function createConnectedLibraryRuntime(input: {
  userDataDirectory: string
  synthetic: ConnectedSyntheticE2eConfiguration | null
  openConnectedPage(): void
  requestQuit(): void
}): Promise<ConnectedLibraryRuntime> {
  const connectedRoot = path.join(input.userDataDirectory, 'connected-libraries', 'eagle')
  const pairing = input.synthetic ? undefined : createEaglePairing({
    file: path.join(connectedRoot, 'pairing.encrypted'),
    stagingRoot: path.join(connectedRoot, 'edit-staging'),
    protection: {
      available: () => safeStorage.isEncryptionAvailable() && (process.platform !== 'linux' || safeStorage.getSelectedStorageBackend() !== 'basic_text'),
      encrypt: value => safeStorage.encryptString(value),
      decrypt: value => safeStorage.decryptString(value)
    }
  })
  const provider = input.synthetic
    ? createEagleWebApiAdapter({
        token: input.synthetic.token,
        baseUrl: input.synthetic.eagleBaseUrl,
        allowSyntheticLoopback: true,
        syntheticPermanentDelete: true,
        companion: createEagleCompanionHttpAdapter({
          origin: input.synthetic.companionOrigin,
          allowSyntheticLoopback: true
        }),
        resolveTrustedIdentity: async () => ({
          providerIdentity: 'eagle-provider:synthetic-paired',
          libraryIdentity: input.synthetic!.libraryIdentity,
          volumeIdentity: input.synthetic!.volumeIdentity
        })
      })
    : pairing!.provider

  const connected = await createExternalConnectedLibrary({
    appOwnedRoot: connectedRoot,
    databasePath: path.join(connectedRoot, 'connected-library.sqlite'),
    previewCacheDirectory: path.join(connectedRoot, 'preview-cache'),
    editStagingDirectory: path.join(connectedRoot, 'edit-staging'),
    previewCacheQuotaBytes: 256 * 1024 * 1024,
    editStagingQuotaBytes: 2 * 1024 * 1024 * 1024,
    provider,
    editSelection: {
      selectEditFile: async () => {
        if (input.synthetic) return { kind: 'selected', filePath: input.synthetic.editFile }
        const result = await showNativeOpenDialog({ title: '选择素材文件', buttonLabel: '选择文件', properties: ['openFile'] })
        return result.canceled || result.filePaths.length !== 1
          ? { kind: 'cancelled' }
          : { kind: 'selected', filePath: result.filePaths[0] }
      }
    }
  })

  const legacy = createLegacyReadOnlyWorkspace({
    evidenceLevel: input.synthetic ? 'synthetic-read-only' : 'local-read-only',
    selection: {
      selectLegacyDatabase: async () => {
        if (input.synthetic) {
          const syntheticRoot = path.dirname(input.synthetic.legacyDatabase)
          return {
            kind: 'selected',
            databasePath: input.synthetic.legacyDatabase,
            assetRootDirectory: syntheticRoot,
            tildeRootDirectory: syntheticRoot
          }
        }
        const databaseResult = await showNativeOpenDialog({
          title: '第 1 步：选择旧版素材库数据库（.db 或 .sqlite）',
          buttonLabel: '选择数据库',
          properties: ['openFile'],
          filters: [{ name: 'Legacy DAM SQLite', extensions: ['sqlite', 'db'] }]
        })
        if (databaseResult.canceled || databaseResult.filePaths.length !== 1) {
          return { kind: 'cancelled' }
        }
        const assetRootResult = await showNativeOpenDialog({
          title: '第 2 步：选择旧素材所在的文件夹',
          buttonLabel: '选择素材文件夹',
          properties: ['openDirectory']
        })
        return assetRootResult.canceled || assetRootResult.filePaths.length !== 1
          ? { kind: 'cancelled' }
          : {
              kind: 'selected',
              databasePath: databaseResult.filePaths[0],
              assetRootDirectory: assetRootResult.filePaths[0],
              tildeRootDirectory: assetRootResult.filePaths[0]
            }
      }
    }
  })

  let tray: Tray | undefined
  const updateTray = (projection: ReturnType<ExternalConnectedLibrary['inspect']>) => {
    if (!tray) return
    tray.setToolTip(`Design Asset Manager · Eagle ${projection.state}`)
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: `Eagle: ${projection.state}`, enabled: false },
      { label: '显示 Eagle 连接库', click: input.openConnectedPage },
      {
        label: '立即检查同步',
        enabled: projection.grant !== 'none',
        click: () => void background.tick()
      },
      { type: 'separator' },
      { label: '退出 Design Asset Manager', click: input.requestQuit }
    ]))
  }
  const background = new ConnectedLibraryBackgroundCoordinator({ host: connected, onProjection: updateTray })
  background.start()
  const icon = process.platform === 'darwin'
    ? nativeImage.createFromNamedImage('NSStatusAvailable')
    : nativeImage.createEmpty()
  icon.setTemplateImage(true)
  tray = new Tray(icon)
  updateTray(connected.inspect())

  const handleConnectedPreview = (rawUrl: string) => servePreview(
    rawUrl,
    'dam-connected-preview:',
    connected.inspect().libraryIdentity,
    connected.inspect().generation,
    (id) => connected.readPreview(id)
  )
  const handleLegacyPreview = (rawUrl: string) => {
    const authority = legacy.inspect()
    return servePreview(
      rawUrl,
      'dam-legacy-preview:',
      authority.state === 'ready' ? authority.identity : null,
      authority.state === 'ready' ? authority.generation : null,
      (id) => legacy.readPreview(id)
    )
  }

  return Object.freeze({
    connected,
    legacy,
    background,
    pairing,
    async companionArtifact() {
      const fileName = 'DAM-Eagle-Companion-0.2.0.eagleplugin'
      const bytes = await fs.promises.readFile(path.join(path.dirname(fileURLToPath(import.meta.url)), 'eagle-companion', fileName))
      if (bytes.length > 1024 * 1024) throw Error('EAGLE_COMPANION_ARTIFACT_INVALID')
      return { fileName, bytesBase64: bytes.toString('base64'), sha256: createHash('sha256').update(bytes).digest('hex') }
    },
    registerProtocols(protocol: Protocol) {
      protocol.handle('dam-connected-preview', (request) => handleConnectedPreview(request.url))
      protocol.handle('dam-legacy-preview', (request) => handleLegacyPreview(request.url))
    },
    async drain() {
      await background.drain()
      tray?.destroy()
      tray = undefined
      await connected.close()
      await legacy.close()
    }
  })
}

export function readConnectedSyntheticE2eConfiguration(input: {
  encoded: string | undefined
  activeRoot: string | null
  isPackaged: boolean
  requested: boolean
}): ConnectedSyntheticE2eConfiguration | null {
  if (!input.encoded) return null
  if (!input.activeRoot || input.isPackaged || !input.requested) {
    throw new Error('CONNECTED_SYNTHETIC_E2E_NOT_ALLOWED')
  }
  let value: unknown
  try {
    value = JSON.parse(input.encoded)
  } catch {
    throw new Error('CONNECTED_SYNTHETIC_E2E_CONFIG_INVALID')
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('CONNECTED_SYNTHETIC_E2E_CONFIG_INVALID')
  }
  const record = value as Record<string, unknown>
  const keys = [
    'rootDirectory', 'eagleBaseUrl', 'companionOrigin', 'token',
    'libraryIdentity', 'volumeIdentity', 'editFile', 'legacyDatabase'
  ]
  if (Object.keys(record).sort().join('\0') !== keys.sort().join('\0') ||
      path.resolve(String(record.rootDirectory)) !== input.activeRoot) {
    throw new Error('CONNECTED_SYNTHETIC_E2E_CONFIG_INVALID')
  }
  for (const key of ['eagleBaseUrl', 'companionOrigin', 'token', 'libraryIdentity', 'volumeIdentity']) {
    if (typeof record[key] !== 'string' || !record[key]) {
      throw new Error('CONNECTED_SYNTHETIC_E2E_CONFIG_INVALID')
    }
  }
  const editFile = descendant(record.editFile, input.activeRoot)
  const legacyDatabase = descendant(record.legacyDatabase, input.activeRoot)
  for (const filePath of [editFile, legacyDatabase]) {
    const stat = fs.lstatSync(filePath)
    if (!stat.isFile() || stat.isSymbolicLink()) {
      throw new Error('CONNECTED_SYNTHETIC_E2E_CONFIG_INVALID')
    }
  }
  return {
    eagleBaseUrl: String(record.eagleBaseUrl),
    companionOrigin: String(record.companionOrigin),
    token: String(record.token),
    libraryIdentity: String(record.libraryIdentity),
    volumeIdentity: String(record.volumeIdentity),
    editFile,
    legacyDatabase
  }
}

async function servePreview(
  rawUrl: string,
  scheme: string,
  identity: string | null,
  generation: string | null,
  read: (id: string) => Promise<Uint8Array>
): Promise<Response> {
  try {
    const parsed = parseMedia(rawUrl, scheme)
    if (!identity || !generation || parsed.identity !== identity || parsed.generation !== generation) {
      return new Response('Forbidden', { status: 403 })
    }
    const bytes = await read(parsed.itemId)
    return new Response(Buffer.from(bytes), {
      status: 200,
      headers: { 'Content-Type': mediaType(bytes), 'Cache-Control': 'no-store' }
    })
  } catch {
    return new Response('Unavailable', { status: 404 })
  }
}

function parseMedia(rawUrl: string, scheme: string) {
  const url = new URL(rawUrl)
  if (url.protocol !== scheme || url.host !== 'preview' || url.username || url.password ||
      url.port || url.search) throw new Error('CONNECTED_MEDIA_REQUEST_INVALID')
  const parts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent)
  if (parts.length !== 3 || parts.some((part) => !ID.test(part))) {
    throw new Error('CONNECTED_MEDIA_REQUEST_INVALID')
  }
  return { identity: parts[0], generation: parts[1], itemId: parts[2] }
}

function mediaType(bytes: Uint8Array): string {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50) return 'image/png'
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8) return 'image/jpeg'
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
      String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP') return 'image/webp'
  return 'application/octet-stream'
}

function descendant(value: unknown, root: string) {
  if (typeof value !== 'string' || !path.isAbsolute(value)) {
    throw new Error('CONNECTED_SYNTHETIC_E2E_CONFIG_INVALID')
  }
  const candidate = path.resolve(value)
  const relative = path.relative(root, candidate)
  if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error('CONNECTED_SYNTHETIC_E2E_CONFIG_INVALID')
  }
  return candidate
}

const ID = /^[A-Za-z0-9][A-Za-z0-9._:~-]{0,255}$/u
