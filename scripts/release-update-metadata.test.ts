import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'

const root = path.join(process.cwd(), 'dist-temp', 'release-update-metadata-test')
await fs.rm(root, { recursive: true, force: true })
await fs.mkdir(root, { recursive: true })

const checksumPath = path.join(root, 'checksums.json')
const outputPath = path.join(root, 'metadata.json')
await fs.writeFile(checksumPath, JSON.stringify({
  schemaVersion: 1,
  platform: 'windows',
  arch: 'x64',
  artifacts: [
    {
      fileName: 'Design Asset Manager Setup 1.0.0.exe',
      sizeBytes: 123,
      sha256: 'a'.repeat(64)
    },
    {
      fileName: 'Design Asset Manager Setup 1.0.0.exe.blockmap',
      sizeBytes: 45,
      sha256: 'b'.repeat(64)
    }
  ]
}))

await runWriter(checksumPath, outputPath)
const metadata = JSON.parse(await fs.readFile(outputPath, 'utf8'))
assert.equal(metadata.schemaVersion, 1)
assert.equal(metadata.channel, 'stable')
assert.equal(metadata.version, '1.0.0')
assert.equal(metadata.productName, 'Design Asset Manager')
assert.equal(metadata.platform, 'windows')
assert.equal(metadata.arch, 'x64')
assert.equal(metadata.artifact.fileName, 'Design Asset Manager Setup 1.0.0.exe')
assert.equal(metadata.artifact.blockmap.fileName, 'Design Asset Manager Setup 1.0.0.exe.blockmap')
assert.equal(JSON.stringify(metadata).includes(root), false)

const missingBlockmapPath = path.join(root, 'missing-blockmap.json')
await fs.writeFile(missingBlockmapPath, JSON.stringify({
  schemaVersion: 1,
  platform: 'windows',
  arch: 'x64',
  artifacts: [{
    fileName: 'Design Asset Manager Setup 1.0.0.exe',
    sizeBytes: 123,
    sha256: 'a'.repeat(64)
  }]
}))
await assert.rejects(
  runWriter(missingBlockmapPath, path.join(root, 'invalid.json')),
  /exited with 1/
)

await fs.rm(root, { recursive: true, force: true })

async function runWriter(checksums: string, output: string): Promise<void> {
  const code = await new Promise<number>((resolve, reject) => {
    const child = spawn(process.execPath, [
      'scripts/write-release-update-metadata.mjs',
      '--platform=windows',
      '--arch=x64',
      `--checksums=${checksums}`,
      `--output=${output}`
    ], {
      cwd: process.cwd(),
      stdio: 'ignore'
    })
    child.on('error', reject)
    child.on('close', (exitCode) => resolve(exitCode ?? 1))
  })
  if (code !== 0) throw new Error(`write-release-update-metadata exited with ${code}`)
}
