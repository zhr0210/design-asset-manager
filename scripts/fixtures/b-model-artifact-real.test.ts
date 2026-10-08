import path from 'node:path'
import { inspectVisionModel } from '../../src/main/model-library/vision-model-artifact'
const artifact = await inspectVisionModel(path.resolve('AIModels/qwen/qwen3-vl-4b-instruct'))
console.log(JSON.stringify({ inspectedPublicArtifact: artifact.model, bytes: artifact.bytes,
  fingerprint: artifact.artifactFingerprint, files: artifact.files.length }))
