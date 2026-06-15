import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'

const root = path.join(process.cwd(), 'dist-temp', 'release-branding-evidence-test')
const buildDir = path.join(root, 'build')
await fs.rm(root, { recursive: true, force: true })
await fs.mkdir(buildDir, { recursive: true })

const missingOutput = path.join(root, 'missing-branding.json')
assert.equal(await runVerifier('windows', 'x64', buildDir, missingOutput), 1)
const missingReport = JSON.parse(await fs.readFile(missingOutput, 'utf8'))
assert.equal(missingReport.schemaVersion, 1)
assert.equal(missingReport.platform, 'windows')
assert.equal(missingReport.arch, 'x64')
assert.equal(missingReport.approvalId, null)
assert.equal(missingReport.approvedAt, null)
assert.equal(missingReport.checks[0].id, 'branding_approval')
assert.equal(missingReport.checks[0].status, 'failed')
assert.equal(JSON.stringify(missingReport).includes(root), false)

const fakeIco = Buffer.concat([Buffer.from([0, 0, 1, 0]), Buffer.alloc(512, 1)])
await fs.writeFile(path.join(buildDir, 'icon.ico'), fakeIco)
await writeApproval(buildDir, fakeIco, Buffer.alloc(0))
const fakeOutput = path.join(root, 'fake-windows-branding.json')
assert.equal(await runVerifier('windows', 'x64', buildDir, fakeOutput), 1)
const fakeReport = JSON.parse(await fs.readFile(fakeOutput, 'utf8'))
assert.equal(checkStatus(fakeReport, 'branding_approval'), 'passed')
assert.equal(checkStatus(fakeReport, 'windows_icon'), 'failed')
assert.equal(checkStatus(fakeReport, 'approved_digest'), 'passed')

const ico = createIcoFixture()
await fs.writeFile(path.join(buildDir, 'icon.ico'), ico)
await writeApproval(buildDir, ico, Buffer.alloc(0))
const windowsOutput = path.join(root, 'windows-branding.json')
assert.equal(await runVerifier('windows', 'arm64', buildDir, windowsOutput), 0)
const windowsReport = JSON.parse(await fs.readFile(windowsOutput, 'utf8'))
assert.equal(windowsReport.approvalId, 'dam-brand-v1')
assert.equal(windowsReport.approvedAt, '2026-06-15')
assert.equal(checkStatus(windowsReport, 'windows_icon'), 'passed')
assert.equal(checkStatus(windowsReport, 'approved_digest'), 'passed')
assert.equal(JSON.stringify(windowsReport).includes(root), false)

const icns = createIcnsFixture()
const malformedIcns = Buffer.concat([Buffer.from('bad!', 'ascii'), Buffer.alloc(48, 3)])
await fs.writeFile(path.join(buildDir, 'icon.icns'), malformedIcns)
await writeApproval(buildDir, ico, malformedIcns)
const malformedMacOutput = path.join(root, 'malformed-macos-branding.json')
assert.equal(await runVerifier('macos', 'arm64', buildDir, malformedMacOutput), 1)
const malformedMacReport = JSON.parse(await fs.readFile(malformedMacOutput, 'utf8'))
assert.equal(checkStatus(malformedMacReport, 'macos_icon'), 'failed')
assert.equal(checkStatus(malformedMacReport, 'approved_digest'), 'passed')

await fs.writeFile(path.join(buildDir, 'icon.icns'), icns)
await writeApproval(buildDir, ico, icns)
const macOutput = path.join(root, 'macos-branding.json')
assert.equal(await runVerifier('macos', 'arm64', buildDir, macOutput), 0)
const macReport = JSON.parse(await fs.readFile(macOutput, 'utf8'))
assert.equal(checkStatus(macReport, 'macos_icon'), 'passed')
assert.equal(checkStatus(macReport, 'approved_digest'), 'passed')
assert.equal(JSON.stringify(macReport).includes(root), false)
assert.equal(JSON.stringify(macReport).includes(digest(icns)), false)

await fs.writeFile(path.join(buildDir, 'icon.icns'), Buffer.from(icns.map((value, index) => (
  index === icns.length - 1 ? value ^ 1 : value
))))
const badMacOutput = path.join(root, 'bad-macos-branding.json')
assert.equal(await runVerifier('macos', 'x64', buildDir, badMacOutput), 1)
const badMacReport = JSON.parse(await fs.readFile(badMacOutput, 'utf8'))
assert.equal(checkStatus(badMacReport, 'macos_icon'), 'passed')
assert.equal(checkStatus(badMacReport, 'approved_digest'), 'failed')

await fs.rm(root, { recursive: true, force: true })

async function writeApproval(buildDirectory: string, ico: Buffer, icns: Buffer): Promise<void> {
  await fs.writeFile(path.join(buildDirectory, 'release-branding.json'), `${JSON.stringify({
    schemaVersion: 1,
    approvalId: 'dam-brand-v1',
    approvedAt: '2026-06-15',
    icons: {
      windows: {
        file: 'icon.ico',
        sha256: digest(ico)
      },
      macos: {
        file: 'icon.icns',
        sha256: digest(icns)
      }
    }
  }, null, 2)}\n`)
}

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

function digest(value: Buffer): string {
  return crypto.createHash('sha256').update(value).digest('hex')
}

function checkStatus(report: any, id: string): string | undefined {
  return report.checks.find((check: any) => check.id === id)?.status
}

async function runVerifier(
  platform: 'windows' | 'macos',
  arch: 'x64' | 'arm64',
  buildDirectory: string,
  output: string
): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [
      'scripts/verify-release-branding.mjs',
      `--platform=${platform}`,
      `--arch=${arch}`,
      `--build-dir=${buildDirectory}`,
      `--output=${output}`
    ], {
      cwd: process.cwd(),
      stdio: 'ignore'
    })
    child.on('error', reject)
    child.on('close', (exitCode) => resolve(exitCode ?? 1))
  })
}
