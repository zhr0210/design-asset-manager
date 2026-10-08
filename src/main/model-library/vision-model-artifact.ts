import fs from 'node:fs/promises'
import { constants, createReadStream } from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { validateModelArtifactPackage } from './model-artifact-format-validation.internal'
import type { ManagedVisionModelId, HuggingFaceModelBundle } from '../../shared/contracts/managed-model-library.contract'

export const VISION_MODEL_PROFILES = {
  'qwen3-vl-2b-instruct': { name: 'Qwen3-VL-2B-Instruct', hiddenSize: 2048, layers: 28, loadRamBytes: 16 * 1024 ** 3 },
  'qwen3-vl-4b-instruct': { name: 'Qwen3-VL-4B-Instruct', hiddenSize: 2560, layers: 36, loadRamBytes: 25 * 1024 ** 3 },
  'qwen3-vl-8b-instruct': { name: 'Qwen3-VL-8B-Instruct', hiddenSize: 4096, layers: 32, loadRamBytes: 44 * 1024 ** 3 },
} as const

export interface VisionModelFile { name: string; bytes: number; sha256: string }
export interface VisionModelArtifact {
  root: string
  modelId: ManagedVisionModelId
  model: string
  bytes: number
  artifactFingerprint: string
  files: VisionModelFile[]
  license: string
  gguf?: HuggingFaceModelBundle
}

async function readJson(file: string) {
  const stat = await fs.lstat(file)
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 16 * 1024 ** 2) throw Error('LOCAL_MODEL_INVALID')
  const value = JSON.parse(await fs.readFile(file, 'utf8'))
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('LOCAL_MODEL_INVALID')
  return value
}

/** Data-only validation shared by reference, copy and upstream installation. Never imports repository code. */
export async function inspectVisionModel(
  selectedRoot: string,
  signal?: AbortSignal,
  progress?: (bytes: number) => void,
): Promise<VisionModelArtifact> {
  signal?.throwIfAborted()
  const rootStat = await fs.lstat(selectedRoot)
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) throw Error('LOCAL_MODEL_INVALID')
  const root = await fs.realpath(selectedRoot)
  const configuration = await readJson(path.join(root, 'config.json'))
  const modelId = (['qwen3-vl-2b-instruct', 'qwen3-vl-4b-instruct'] as const).find(id => {
    const profile = VISION_MODEL_PROFILES[id]
    return configuration.model_type === 'qwen3_vl' && configuration.text_config?.hidden_size === profile.hiddenSize &&
      configuration.text_config?.num_hidden_layers === profile.layers
  })
  if (!modelId || configuration.auto_map || configuration.quantization_config) throw Error('LOCAL_MODEL_UNSUPPORTED')
  const entries = await fs.readdir(root, { withFileTypes: true })
  if (entries.some(e => e.isSymbolicLink())) throw Error('LOCAL_MODEL_INVALID')
  const names = entries.filter(e => e.isFile() && /\.(json|safetensors|model|txt|jinja)$/.test(e.name)).map(e => e.name).sort()
  if (!names.some(name => name.endsWith('.safetensors')) || names.length > 40 ||
    entries.some(e => /\.(bin|pt|pth|pkl)$/.test(e.name))) throw Error('LOCAL_MODEL_INVALID')
  for (const name of ['tokenizer.json', 'tokenizer_config.json', 'preprocessor_config.json', 'generation_config.json']) {
    if (!names.includes(name)) throw Error('LOCAL_MODEL_COMPANION_MISSING')
  }
  if (!names.includes('chat_template.json') && !names.includes('chat_template.jinja') && !(await readJson(path.join(root, 'tokenizer_config.json'))).chat_template)
    throw Error('LOCAL_MODEL_COMPANION_MISSING')
  for (const name of names.filter(name => name.endsWith('.json'))) {
    const json = await readJson(path.join(root, name))
    if (json.auto_map || json.quantization_config || json.tokenizer_file || json.processor_file) throw Error('LOCAL_MODEL_UNSUPPORTED')
  }
  const indexName = 'model.safetensors.index.json'
  if (names.includes(indexName)) {
    const index = await readJson(path.join(root, indexName))
    const weights = Object.values(index.weight_map ?? {})
    if (!weights.length || weights.some(v => typeof v !== 'string' || !/^model-\d+-of-\d+\.safetensors$/.test(v) || !names.includes(v)))
      throw Error('LOCAL_MODEL_COMPANION_MISSING')
    if (names.filter(n => n.endsWith('.safetensors')).some(n => !weights.includes(n))) throw Error('LOCAL_MODEL_INVALID')
  } else if (names.filter(n => n.endsWith('.safetensors')).some(n => n !== 'model.safetensors')) throw Error('LOCAL_MODEL_COMPANION_MISSING')
  const files: VisionModelFile[] = []
  let completed = 0
  for (const name of names) {
    signal?.throwIfAborted()
    const file = path.join(root, name), stat = await fs.lstat(file)
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size <= 0 || stat.size > 12 * 1024 ** 3) throw Error('LOCAL_MODEL_INVALID')
    const digest = createHash('sha256')
    const handle = await fs.open(file, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0))
    try {
      const held = await handle.stat()
      if (held.dev !== stat.dev || held.ino !== stat.ino || held.size !== stat.size) throw Error('LOCAL_MODEL_CHANGED')
      for await (const part of handle.createReadStream({ autoClose: false })) {
        signal?.throwIfAborted(); digest.update(part); completed += part.length; progress?.(completed)
      }
      const after = await handle.stat(), named = await fs.lstat(file)
      if (after.size !== held.size || after.mtimeMs !== held.mtimeMs || after.ctimeMs !== held.ctimeMs ||
        named.isSymbolicLink() || named.dev !== held.dev || named.ino !== held.ino) throw Error('LOCAL_MODEL_CHANGED')
    } finally { await handle.close() }
    files.push({ name, bytes: stat.size, sha256: digest.digest('hex') })
  }
  signal?.throwIfAborted()
  const valid = await validateModelArtifactPackage({ files: files.map(file => ({
    relativePath: file.name, readableFile: path.join(root, file.name), sizeBytes: file.bytes,
    role: file.name.endsWith('.safetensors') ? 'weights' : 'configuration',
    format: file.name.endsWith('.safetensors') ? 'safetensors' : file.name.endsWith('.json') ? 'json' : 'text',
    ...(['tokenizer.json', 'vocab.json'].includes(file.name) ? { jsonNodeLimit: 1_000_000 } : {}),
  })) })
  if (!valid) throw Error('LOCAL_MODEL_BYTES_REJECTED')
  const artifactFingerprint = createHash('sha256').update(JSON.stringify({ modelId, files })).digest('hex')
  return { root, modelId, model: VISION_MODEL_PROFILES[modelId].name, files, artifactFingerprint,
    bytes: files.reduce((sum, file) => sum + file.bytes, 0), license: '请核对所导入模型的许可；DAM 不为用户来源签名' }
}

export async function hashBoundFile(file: string, digest: ReturnType<typeof createHash>, signal?: AbortSignal) {
  const stat = await fs.lstat(file)
  if (!stat.isFile() || stat.isSymbolicLink()) throw Error('LOCAL_MODEL_INVALID')
  digest.update(path.basename(file) + '\n' + stat.size + '\n')
  for await (const part of createReadStream(file)) { signal?.throwIfAborted(); digest.update(part) }
  const after = await fs.lstat(file)
  if (after.ino !== stat.ino || after.size !== stat.size || after.mtimeMs !== stat.mtimeMs || after.ctimeMs !== stat.ctimeMs)
    throw Error('LOCAL_MODEL_CHANGED')
}
