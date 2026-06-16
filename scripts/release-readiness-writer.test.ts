import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'

const root = path.join(process.cwd(), 'dist-temp', 'release-readiness-writer-test')
await fs.rm(root, { recursive: true, force: true })
await fs.mkdir(root, { recursive: true })

await writeJson('release-checksums-windows-x64.json', {
  schemaVersion: 1,
  platform: 'windows',
  arch: 'x64',
  artifacts: [
    { fileName: 'Design Asset Manager Setup 1.0.0.exe', sizeBytes: 100, sha256: 'a'.repeat(64) },
    { fileName: 'Design Asset Manager Setup 1.0.0.exe.blockmap', sizeBytes: 20, sha256: 'b'.repeat(64) }
  ]
})
await writeJson('release-update-metadata-windows-x64.json', {
  schemaVersion: 1,
  platform: 'windows',
  arch: 'x64',
  artifact: {
    fileName: 'Design Asset Manager Setup 1.0.0.exe',
    sizeBytes: 100,
    sha256: 'a'.repeat(64),
    blockmap: {
      fileName: 'Design Asset Manager Setup 1.0.0.exe.blockmap',
      sizeBytes: 20,
      sha256: 'b'.repeat(64)
    }
  }
})
await writeJson('release-trust-evidence-windows-x64.json', {
  schemaVersion: 1,
  platform: 'windows',
  arch: 'x64',
  checks: [{ id: 'signature', status: 'passed', detail: 'fixture' }]
})
await writeJson('release-branding-evidence-windows-x64.json', {
  schemaVersion: 1,
  platform: 'windows',
  arch: 'x64',
  checks: [
    { id: 'branding_approval', status: 'passed', detail: 'fixture' },
    { id: 'windows_icon', status: 'passed', detail: 'fixture' },
    { id: 'approved_digest', status: 'passed', detail: 'fixture' }
  ]
})
await writeJson('package-smoke-windows-x64.json', {
  generatedAt: '2026-06-16T00:00:00.000Z',
  checks: [
    { id: 'installer', status: 'passed', detail: 'fixture' },
    { id: 'installer-run', status: 'passed', detail: 'fixture' },
    { id: 'installer-subfolder', status: 'passed', detail: 'fixture' },
    { id: 'installed-exe', status: 'passed', detail: 'fixture' }
  ],
  artifacts: {}
})

const publishBlockedPath = path.join(root, 'readiness-publish-blocked.json')
assert.equal(await runWriter(publishBlockedPath), 0)
const publishBlocked = JSON.parse(await fs.readFile(publishBlockedPath, 'utf8'))
const windows = publishBlocked.platforms[0]
assert.equal(windows.platform, 'windows')
assert.equal(windows.arch, 'x64')
assert.equal(windows.stage, 'distribution_ready')
assert.equal(windows.distributionAllowed, true)
assert.equal(windows.publishAllowed, false)
assert.deepEqual(windows.blockers.map((item: { code: string }) => item.code), ['publish_approval'])
assert.equal(JSON.stringify(publishBlocked).includes(root), false)

const publishReadyPath = path.join(root, 'readiness-publish-ready.json')
assert.equal(await runWriter(publishReadyPath, true), 0)
const publishReady = JSON.parse(await fs.readFile(publishReadyPath, 'utf8'))
assert.equal(publishReady.platforms[0].stage, 'publish_ready')
assert.deepEqual(publishReady.platforms[0].blockers, [])

await fs.writeFile(path.join(root, 'release-branding-evidence-windows-x64.json'), JSON.stringify({
  schemaVersion: 1,
  platform: 'windows',
  arch: 'x64',
  checks: [{ id: 'branding_approval', status: 'failed', detail: 'fixture' }]
}))
const candidateOnlyPath = path.join(root, 'readiness-candidate-only.json')
assert.equal(await runWriter(candidateOnlyPath), 0)
const candidateOnly = JSON.parse(await fs.readFile(candidateOnlyPath, 'utf8')).platforms[0]
assert.equal(candidateOnly.stage, 'candidate_ready')
assert.ok(candidateOnly.blockers.some((item: { code: string }) => item.code === 'branding'))
assert.equal(candidateOnly.checks.branding, 'failed')

await fs.rm(path.join(root, 'release-checksums-windows-x64.json'))
const blockedPath = path.join(root, 'readiness-blocked.json')
assert.equal(await runWriter(blockedPath), 1)
const blocked = JSON.parse(await fs.readFile(blockedPath, 'utf8')).platforms[0]
assert.equal(blocked.stage, 'blocked')
assert.equal(blocked.candidateArtifactAllowed, false)
assert.ok(blocked.blockers.some((item: { code: string }) => item.code === 'build'))

const source = await fs.readFile('scripts/write-release-readiness-summary.mjs', 'utf8')
assert.doesNotMatch(source, /process\.env|secrets\.|readFile\(.*icon|createReadStream/)

await fs.rm(root, { recursive: true, force: true })

async function writeJson(fileName: string, value: unknown): Promise<void> {
  await fs.writeFile(path.join(root, fileName), JSON.stringify(value, null, 2))
}

async function runWriter(output: string, publishApproved = false): Promise<number> {
  return await new Promise<number>((resolve, reject) => {
    const child = spawn(process.execPath, [
      'scripts/write-release-readiness-summary.mjs',
      '--platform=windows',
      '--arch=x64',
      '--governance=passed',
      `--dist-dir=${root}`,
      `--output=${output}`,
      `--publish-approved=${publishApproved ? 'true' : 'false'}`
    ], {
      cwd: process.cwd(),
      stdio: 'ignore'
    })
    child.on('error', reject)
    child.on('close', (code) => resolve(code ?? 1))
  })
}
