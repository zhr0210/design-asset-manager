import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'

const root = path.join(process.cwd(), 'dist-temp', 'release-branding-approval-template-test')
const buildDir = path.join(root, 'build')
const output = path.join(root, 'release-branding-template-evidence.json')
await fs.rm(root, { recursive: true, force: true })
await fs.mkdir(buildDir, { recursive: true })

const templatePath = path.join(process.cwd(), 'build', 'release-branding.example.json')
const templateText = await fs.readFile(templatePath, 'utf8')
const template = JSON.parse(templateText)

assert.equal(template.schemaVersion, 1)
assert.equal(template.approvalId, 'replace-with-human-approval-id')
assert.equal(template.approvedAt, 'YYYY-MM-DD')
assert.equal(template.icons.windows.file, 'icon.ico')
assert.equal(template.icons.macos.file, 'icon.icns')
assert.equal(template.icons.windows.sha256, '<sha256-of-approved-build-icon.ico>')
assert.equal(template.icons.macos.sha256, '<sha256-of-approved-build-icon.icns>')
assert.doesNotMatch(templateText, /[A-Fa-f0-9]{64}/)
assert.doesNotMatch(templateText, /\/Users\/|C:\\Users\\|dist-packages|electron\.(ico|icns)/i)

await fs.writeFile(path.join(buildDir, 'icon.ico'), createIcoFixture())
await fs.writeFile(path.join(buildDir, 'icon.icns'), createIcnsFixture())

assert.equal(await runVerifier(), 1)
const report = JSON.parse(await fs.readFile(output, 'utf8'))
assert.equal(report.schemaVersion, 1)
assert.equal(report.platform, 'windows')
assert.equal(report.approvalId, null)
assert.equal(report.approvedAt, null)
assert.equal(checkStatus(report, 'branding_approval'), 'failed')
assert.equal(checkStatus(report, 'windows_icon'), 'passed')
assert.equal(checkStatus(report, 'approved_digest'), 'failed')
assert.equal(JSON.stringify(report).includes(root), false)

const task = await fs.readFile('TASK.md', 'utf8')
assert.match(task, /release-branding\.example\.json/)
assert.match(task, /release-branding\.json/)

await fs.rm(root, { recursive: true, force: true })

function createIcoFixture(): Buffer {
  const payload = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    Buffer.alloc(32, 7)
  ])
  const directory = Buffer.alloc(22)
  directory.writeUInt16LE(0, 0)
  directory.writeUInt16LE(1, 2)
  directory.writeUInt16LE(1, 4)
  directory[6] = 0
  directory[7] = 0
  directory.writeUInt16LE(1, 10)
  directory.writeUInt16LE(32, 12)
  directory.writeUInt32LE(payload.length, 14)
  directory.writeUInt32LE(directory.length, 18)
  return Buffer.concat([directory, payload])
}

function createIcnsFixture(): Buffer {
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    Buffer.alloc(32, 9)
  ])
  const chunk = Buffer.alloc(8 + png.length)
  chunk.write('ic10', 0, 'ascii')
  chunk.writeUInt32BE(chunk.length, 4)
  png.copy(chunk, 8)
  const container = Buffer.alloc(8 + chunk.length)
  container.write('icns', 0, 'ascii')
  container.writeUInt32BE(container.length, 4)
  chunk.copy(container, 8)
  return container
}

function checkStatus(report: any, id: string): string | undefined {
  return report.checks.find((check: any) => check.id === id)?.status
}

async function runVerifier(): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [
      'scripts/verify-release-branding.mjs',
      '--platform=windows',
      '--arch=x64',
      `--build-dir=${buildDir}`,
      `--approval=${templatePath}`,
      `--output=${output}`
    ], {
      cwd: process.cwd(),
      stdio: 'ignore'
    })
    child.on('error', reject)
    child.on('close', (exitCode) => resolve(exitCode ?? 1))
  })
}
