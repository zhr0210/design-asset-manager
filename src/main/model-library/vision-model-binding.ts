import fs from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { hashBoundFile, inspectVisionModel, type VisionModelArtifact } from './vision-model-artifact'
import { bindPythonDependencies } from '../services/ai-runtime/python-environment-binding'
import type { ModelOwnership, HuggingFaceModelBundle } from '../../shared/contracts/managed-model-library.contract'
import type { GgufLoadPlan } from '../../shared/contracts/local-ai-resources.contract'
import type { NativeGgufRuntimeBinding } from '../services/ai-runtime/managed-gguf-packages'

export interface ManagedVisionConfiguration {
  root: string
  python?: string
  gguf?: HuggingFaceModelBundle
  native?: { binding: NativeGgufRuntimeBinding; plan: GgufLoadPlan; threads: number }
  fingerprint: string
  artifactFingerprint?: string
  modelId?: VisionModelArtifact['modelId']
  model?: string
  entryId?: string
  source?: 'user-import' | 'huggingface-upstream'
  ownership?: ModelOwnership
  enabled: boolean
}
export function nativeVisionFingerprint(configuration: ManagedVisionConfiguration) {
  if (!configuration.gguf || !configuration.native || !configuration.artifactFingerprint) throw Error('LOCAL_MODEL_UNSUPPORTED')
  return createHash('sha256').update(JSON.stringify({ adapter: 'dam-native-qwen3vl-v3; driver-bound-plan; bounded-recipe-schema-v1',
    artifact: configuration.artifactFingerprint, runtime: configuration.native.binding.fingerprint,
    plan: configuration.native.plan.identity, threads: configuration.native.threads,
    platform: process.platform, arch: process.arch, maxImageTokens: 256, maxContext: 4096, maxTokens: 3072 })).digest('hex')
}

/** Semantic backend binding stays frozen across verified placement changes.
 * Every physical execution separately records the full plan/thread fingerprint. */
export function nativeVisionBackendFingerprint(configuration: ManagedVisionConfiguration) {
  if (!configuration.gguf || !configuration.native || !configuration.artifactFingerprint) throw Error('LOCAL_MODEL_UNSUPPORTED')
  return createHash('sha256').update(JSON.stringify({ adapter: 'dam-native-qwen3vl-v2; bounded-recipe-schema-v1',
    artifact: configuration.artifactFingerprint, runtimeRelease: configuration.native.binding.release,
    platform: process.platform, arch: process.arch, maxImageTokens: 256, maxContext: 4096, maxTokens: 3072 })).digest('hex')
}

export async function bindVisionEnvironment(artifact: VisionModelArtifact, selectedPython: string, runner: string, signal?: AbortSignal) {
  const python = await fs.realpath(selectedPython)
  const digest = createHash('sha256')
  digest.update(JSON.stringify({ platform: process.platform, arch: process.arch, modelId: artifact.modelId,
    artifactFingerprint: artifact.artifactFingerprint, device: 'cpu', dtype: 'float32', maxPixels: 28 * 28 * 256,
    maxContext: 4096, maxTokens: 3072 }))
  await hashBoundFile(python, digest, signal)
  await hashBoundFile(runner, digest, signal)
  await bindPythonDependencies(python, digest, ['torch-', 'transformers-', 'pillow-', 'psutil-'], signal)
  return { root: artifact.root, python, fingerprint: digest.digest('hex'), artifactFingerprint: artifact.artifactFingerprint,
    modelId: artifact.modelId, model: artifact.model }
}

export async function inspectAndBindVisionModel(root: string, python: string, runner: string, signal?: AbortSignal) {
  const artifact = await inspectVisionModel(root, signal)
  const configuration = await bindVisionEnvironment(artifact, python, runner, signal)
  return { artifact, configuration }
}
