import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { getDownloadedArtifactState, isCompleteDownloadedArtifact } from '../src/main/services/llama-runtime/llama-runtime-local-models'

const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'llama-local-models-'))
const modelPath = path.join(tmpDir, 'Qwen3VL-2B-Instruct-Q4_K_M.gguf')

assert.equal(isCompleteDownloadedArtifact(modelPath), false)
assert.equal(getDownloadedArtifactState(modelPath), 'missing')

await fs.writeFile(modelPath, Buffer.from('gguf'))
assert.equal(isCompleteDownloadedArtifact(modelPath), true)
assert.equal(getDownloadedArtifactState(modelPath), 'downloaded')

await fs.writeFile(`${modelPath}.aria2`, Buffer.from('resume-state'))
assert.equal(isCompleteDownloadedArtifact(modelPath), false)
assert.equal(getDownloadedArtifactState(modelPath), 'downloading')

await fs.unlink(`${modelPath}.aria2`)
assert.equal(isCompleteDownloadedArtifact(modelPath), true)
assert.equal(getDownloadedArtifactState(modelPath), 'downloaded')
