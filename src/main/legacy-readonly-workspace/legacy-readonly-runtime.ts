import { type Protocol } from 'electron'
import { showNativeOpenDialog } from '../platform/native-open-dialog'
import { createLegacyReadOnlyWorkspace } from './legacy-readonly-workspace'

export function createLegacyReadOnlyRuntime() {
  const legacy = createLegacyReadOnlyWorkspace({
    evidenceLevel: 'local-read-only',
    selection: {
      selectLegacyDatabase: async () => {
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

  return {
    legacy,
    registerProtocols(protocol: Protocol) {
      protocol.handle('dam-legacy-preview', request => {
        const authority = legacy.inspect()
        return servePreview(request.url, 'dam-legacy-preview:', authority.state === 'ready' ? authority.identity : null, authority.state === 'ready' ? authority.generation : null, id => legacy.readPreview(id))
      })
    },
    drain: () => legacy.close()
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
      url.port || url.search) throw new Error('LEGACY_MEDIA_REQUEST_INVALID')
  const parts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent)
  if (parts.length !== 3 || parts.some((part) => !ID.test(part))) {
    throw new Error('LEGACY_MEDIA_REQUEST_INVALID')
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

const ID = /^[A-Za-z0-9][A-Za-z0-9._:~-]{0,255}$/u
