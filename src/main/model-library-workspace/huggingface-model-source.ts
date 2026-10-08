import { createHash } from 'node:crypto'
import publicCatalog from './huggingface-model-catalog.json'
import type { ManagedVisionModelId, HuggingFaceModelBundle, HuggingFaceDiscoveryEntry } from '../../shared/contracts/managed-model-library.contract'
import type { VisionModelFile } from '../model-library/vision-model-artifact'
import { assembleGgufBundles } from './huggingface-gguf-bundles'
import { assertChinaModelUrl, resolveChinaMirrorFile, verifyChinaMirrorRelease } from './china-model-mirror'

export interface UpstreamModelRelease {
  catalogProvider?: 'modelscope-cn'
  id: ManagedVisionModelId
  name: string
  repository: string
  revision: string
  license: string
  loadRamBytes: number
  files: Array<VisionModelFile & { gitBlob?: string }>
  gguf?: HuggingFaceModelBundle
}
export type PublicModelFetch = (url: string, init: RequestInit) => Promise<Response>
export const UPSTREAM_MODEL_RELEASES = publicCatalog.entries as UpstreamModelRelease[]
export function assertPublicModelUrl(url: string) {
  assertChinaModelUrl(url)
}

export function sourceRelease(modelId: ManagedVisionModelId): UpstreamModelRelease {
  const release = UPSTREAM_MODEL_RELEASES.find(value => value.id === modelId)
  validateUpstreamReleasePolicy(release)
  return release
}
/** Updates may add immutable upstream versions; changing the latest catalogue does not revoke old bytes.
 * DAM policy owns the repository/profile allowlist, the user owns explicit local revocation. */
export function validateUpstreamReleasePolicy(release: UpstreamModelRelease | undefined): asserts release is UpstreamModelRelease {
  if (release?.gguf) {
    const bundle = release.gguf
    if (!['2B', '4B', '8B'].includes(bundle.size) || bundle.variant !== 'Instruct' ||
      release.id !== `qwen3-vl-${bundle.size.toLowerCase()}-instruct` || release.license !== 'apache-2.0' ||
      release.repository !== bundle.repository || release.revision !== bundle.revision ||
      !/^[a-f0-9]{40}$/.test(bundle.revision) || bundle.files.length > 257 ||
      bundle.files.some(file => file.name.length > 240 || file.name.split('/').some(part => !/^[A-Za-z0-9._-]+$/.test(part) || part === '.' || part === '..')) ||
      JSON.stringify(release.files.map(({ name, bytes, sha256 }) => ({ name, bytes, sha256 }))) !==
        JSON.stringify(bundle.files.map(({ name, bytes, sha256 }) => ({ name, bytes, sha256 })))) throw Error('MODEL_SOURCE_REVOKED')
    const reconstructed = assembleGgufBundles({ repository: release.repository, revision: release.revision,
      license: release.license, files: bundle.files } as HuggingFaceDiscoveryEntry)
    if (!reconstructed.some(candidate => candidate.id === bundle.id)) throw Error('MODEL_SOURCE_REVOKED')
    return
  }
  if (!release || !['qwen3-vl-2b-instruct', 'qwen3-vl-4b-instruct'].includes(release.id) ||
    release.repository !== `Qwen/${release.id === 'qwen3-vl-2b-instruct' ? 'Qwen3-VL-2B-Instruct' : 'Qwen3-VL-4B-Instruct'}` ||
    !/^[a-f0-9]{40}$/.test(release.revision) || release.license !== 'apache-2.0' ||
    !Array.isArray(release.files) || release.files.length > 40 || !release.files.length ||
    new Set(release.files.map(file => file.name)).size !== release.files.length ||
    !['config.json', 'tokenizer.json', 'tokenizer_config.json', 'preprocessor_config.json', 'generation_config.json'].every(name => release.files.some(f => f.name === name)) ||
    !release.files.some(file => file.name.endsWith('.safetensors')) ||
    release.files.some(file => !/^[A-Za-z0-9._-]+$/.test(file.name) || !/\.(safetensors|json|txt|model|jinja)$/.test(file.name) ||
      !/^[a-f0-9]{64}$/.test(file.sha256) || (release.catalogProvider!=='modelscope-cn'&&!/^[a-f0-9]{40}$/.test(file.gitBlob ?? '')) ||
      !Number.isSafeInteger(file.bytes) || file.bytes <= 0 || file.bytes > 12 * 1024 ** 3)) throw Error('MODEL_SOURCE_REVOKED')
}
export const modelSourceBinding = (release: UpstreamModelRelease) => createHash('sha256').update(JSON.stringify({
  policy: publicCatalog.policyVersion, repository: release.repository, revision: release.revision, license: release.license,
  files: release.files,
  ...(release.catalogProvider?{catalogProvider:release.catalogProvider}:{}),
})).digest('hex')

export async function boundedSourceJson(response: Response, signal: AbortSignal) {
  if (response.status === 401 || response.status === 403 || response.status === 404) throw Error('MODEL_SOURCE_REVOKED')
  if (response.status !== 200 || !response.body) throw Error('MODEL_SOURCE_UNAVAILABLE')
  const chunks: Uint8Array[] = []; let bytes = 0
  try { for await (const chunk of response.body as unknown as AsyncIterable<Uint8Array>) {
    signal.throwIfAborted(); bytes += chunk.length
    if (bytes > 2 * 1024 ** 2) throw Error('MODEL_SOURCE_METADATA_INVALID')
    chunks.push(chunk)
  } } finally { await response.body.cancel().catch(() => {}) }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

/** TLS authenticates the selected upstream; the embedded immutable commit and hashes constrain its bytes.
 * This intentionally makes no claim of a DAM Publisher signature. No cookies, credentials, or model code. */
export async function verifyUpstreamRelease(release: UpstreamModelRelease, fetch: PublicModelFetch, signal: AbortSignal) {
  validateUpstreamReleasePolicy(release)
  await verifyChinaMirrorRelease(release,fetch,signal)
  return { binding: modelSourceBinding(release), verifiedAt: Date.now() }
}

/** Redirect targets stay inside the upstream's known HTTPS storage hosts; transient signed URLs never persist. */
export async function openUpstreamFile(release: UpstreamModelRelease, file: VisionModelFile, offset: number,
  fetch: PublicModelFetch, signal: AbortSignal): Promise<Response> {
  let url = (await resolveChinaMirrorFile(release,file,fetch,signal)).downloadUrl
  for (let redirects = 0; redirects <= 5; redirects++) {
    assertPublicModelUrl(url)
    const response = await fetch(url, { signal, method: 'GET', credentials: 'omit', redirect: 'manual',
      headers: { 'Accept-Encoding': 'identity', ...(offset ? { Range: `bytes=${offset}-` } : {}) } })
    if (![301, 302, 303, 307, 308].includes(response.status)) return response
    const location = response.headers.get('location')
    await response.body?.cancel()
    if (!location) throw Error('MODEL_SOURCE_REDIRECT_REJECTED')
    url = new URL(location, url).href
  }
  throw Error('MODEL_SOURCE_REDIRECT_REJECTED')
}
