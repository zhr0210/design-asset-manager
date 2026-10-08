import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import type { HuggingFaceModelBundle, ManagedVisionModelId } from '../../shared/contracts/managed-model-library.contract'
import type { VisionModelArtifact } from './vision-model-artifact'
import { validateModelArtifactPackage } from './model-artifact-format-validation.internal'
import { verifyTransferredFile } from '../model-library-workspace/model-file-transfer'

/** GGUF is data. Exact selected hashes, all split parts and the paired projector
 * are checked before inventory registration; this never qualifies inference. */
export async function inspectGgufModel(selectedRoot: string, bundle: HuggingFaceModelBundle,
  signal: AbortSignal): Promise<VisionModelArtifact> {
  const stat = await fs.lstat(selectedRoot)
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw Error('MODEL_STAGING_UNSAFE')
  const root = await fs.realpath(selectedRoot)
  for (const file of bundle.files) {
    let parent = root
    const parts = file.name.split('/')
    for (const part of parts.slice(0, -1)) {
      parent = path.join(parent, part)
      const directory = await fs.lstat(parent)
      if (!directory.isDirectory() || directory.isSymbolicLink()) throw Error('MODEL_STAGING_UNSAFE')
    }
    await verifyTransferredFile(path.join(root, ...parts), file, signal)
  }
  const valid = await validateModelArtifactPackage({ files: bundle.files.map(file => ({
    relativePath: file.name, role: file.name.split('/').at(-1)!.startsWith('mmproj-') ? 'vision-projector' : 'weights',
    format: 'gguf', sizeBytes: file.bytes, readableFile: path.join(root, file.name),
    ggufExpectedArchitecture: file.name.split('/').at(-1)!.startsWith('mmproj-') ? 'clip' : 'qwen3vl',
  })) })
  if (!valid) throw Error('LOCAL_MODEL_BYTES_REJECTED')
  signal.throwIfAborted()
  const files = bundle.files.map(({ name, bytes, sha256 }) => ({ name, bytes, sha256 }))
  const modelId = `qwen3-vl-${bundle.size.toLowerCase()}-instruct` as ManagedVisionModelId
  return { root, modelId, model: `Qwen3-VL-${bundle.size}-Instruct · ${bundle.languageQuantization} / ${bundle.projectorQuantization}`,
    bytes: bundle.bytes, gguf: bundle, files, license: 'apache-2.0',
    artifactFingerprint: createHash('sha256').update(JSON.stringify({ modelId, bundleId: bundle.id, files })).digest('hex') }
}

/** Installation binding only. Runtime/build/layout must still be bound and
 * really verified by the owned native runtime before this may be enabled. */
export function bindGgufArtifact(artifact: VisionModelArtifact) {
  if (!artifact.gguf) throw Error('LOCAL_MODEL_UNSUPPORTED')
  return { root: artifact.root, gguf: artifact.gguf, artifactFingerprint: artifact.artifactFingerprint,
    fingerprint: artifact.artifactFingerprint, modelId: artifact.modelId, model: artifact.model }
}
