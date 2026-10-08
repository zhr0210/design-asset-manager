import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import type { AiBackendConfig } from '../../shared/types/ai-backend.types'
import type { OcrRuntime } from '../ocr/ocr-runtime'

/** Optional, explicit test registration. Merely being a loopback service grants nothing. */
export function readSyntheticFixtures(rootDirectory: string) {
  const root = fs.realpathSync(rootDirectory), directory = path.join(root,'fixtures'), registry = path.join(directory,'registry.json')
  if (!fs.existsSync(registry)) return undefined
  if (fs.lstatSync(directory).isSymbolicLink() || fs.lstatSync(registry).isSymbolicLink() || fs.statSync(registry).size > 4096) throw Error('SYNTHETIC_FIXTURE_INVALID')
  const config = JSON.parse(fs.readFileSync(registry,'utf8'))
  const origin = new URL(config.origin)
  if (Object.keys(config).sort().join() !== 'ocr,origin,schema' || config.schema !== 1 || typeof config.ocr !== 'boolean' || origin.protocol !== 'http:' || origin.hostname !== '127.0.0.1' || !origin.port || origin.origin !== config.origin) throw Error('SYNTHETIC_FIXTURE_INVALID')
  const inference = new Set(['ai-connection:confirm-validation','visual-ai:run','tag-execution:run','tag-batch:run','ai-acceptance:confirm','ai-backend:list-models'])
  const assertBackend = (backend: AiBackendConfig) => {
    if (!backend.enabled) return
    if (backend.baseUrl !== origin.origin+'/v1' || backend.transport !== 'pi' || backend.providerKind !== 'openai-compatible' || backend.authMode !== 'none') throw Error('SYNTHETIC_ENDPOINT_DENIED')
  }
  return Object.freeze({
    origin: origin.origin,
    permits: (command: string) => inference.has(command) || ['download:prepare','download:enqueue','download:retry'].includes(command) || config.ocr && ['asset-ocr:configure','asset-ocr:run','background-ocr:confirm'].includes(command),
    assertBackend,
    authorizePi(request: unknown) {
      const value = request as {kind?:string;connection?:AiBackendConfig}
      if (!value || !['infer','models'].includes(value.kind ?? '') || !value.connection) throw Error('SYNTHETIC_EXECUTION_DENIED')
      assertBackend({...value.connection,enabled:true})
    },
    fetch: (async (resource: string | URL | Request, options?: RequestInit) => {
      const url = new URL(resource instanceof Request ? resource.url : String(resource))
      if (url.origin !== origin.origin || !url.pathname.startsWith('/download/') || url.username || url.password) throw Error('SYNTHETIC_ENDPOINT_DENIED')
      return fetch(resource,{...options,redirect:'manual'})
    }) as typeof fetch,
    ocrRuntime(profile: string, select: () => Promise<string | null>): OcrRuntime {
      const ready = path.join(profile,'synthetic-ocr-selected.json'), expected = path.join(directory,'ocr')
      const verify = () => {
        if (!config.ocr || !fs.existsSync(expected) || fs.lstatSync(expected).isSymbolicLink() || fs.realpathSync(expected) !== expected) throw Error('SYNTHETIC_EXECUTION_DENIED')
      }
      return {
        configure: async () => { verify(); const selected = await select(); if (!selected) return; if (fs.realpathSync(selected) !== expected) throw Error('SYNTHETIC_SCOPE_DENIED'); fs.writeFileSync(ready,'true') },
        current: async () => {
          if (!fs.existsSync(ready)) return null
          verify()
          return {label:'合成 OCR 验收 · 无真实模型',fingerprint:'synthetic-ocr-v1',run:async (preview,signal) => {
            signal.throwIfAborted(); const dimensions = await sharp(preview).metadata(); signal.throwIfAborted()
            return {engine:'rapidocr-onnxruntime',version:'1.4.4',recipe:'rapidocr-preview-v1',modelSha256:{det:'a'.repeat(64),cls:'b'.repeat(64),rec:'c'.repeat(64)},width:dimensions.width!,height:dimensions.height!,elapsedMs:1,threshold:.5,blocks:[{text:'合成文字验收 2026',confidence:.99,polygon:[[.05,.05],[.8,.05],[.8,.15],[.05,.15]]}]}
          }}
        }
      }
    }
  })
}
