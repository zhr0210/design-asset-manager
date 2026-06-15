import assert from 'node:assert/strict'
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
assert.equal(missingReport.checks[0].id, 'windows_icon')
assert.equal(missingReport.checks[0].status, 'failed')
assert.equal(JSON.stringify(missingReport).includes(root), false)

await fs.writeFile(path.join(buildDir, 'icon.ico'), Buffer.concat([
  Buffer.from([0, 0, 1, 0]),
  Buffer.alloc(512, 1)
]))
const windowsOutput = path.join(root, 'windows-branding.json')
assert.equal(await runVerifier('windows', 'arm64', buildDir, windowsOutput), 0)
const windowsReport = JSON.parse(await fs.readFile(windowsOutput, 'utf8'))
assert.equal(windowsReport.checks[0].status, 'passed')
assert.equal(JSON.stringify(windowsReport).includes(root), false)

await fs.writeFile(path.join(buildDir, 'icon.icns'), Buffer.concat([
  Buffer.from('icns', 'ascii'),
  Buffer.alloc(512, 2)
]))
const macOutput = path.join(root, 'macos-branding.json')
assert.equal(await runVerifier('macos', 'arm64', buildDir, macOutput), 0)
const macReport = JSON.parse(await fs.readFile(macOutput, 'utf8'))
assert.equal(macReport.checks[0].id, 'macos_icon')
assert.equal(macReport.checks[0].status, 'passed')
assert.equal(JSON.stringify(macReport).includes(root), false)

await fs.writeFile(path.join(buildDir, 'icon.icns'), Buffer.concat([
  Buffer.from('bad!', 'ascii'),
  Buffer.alloc(512, 3)
]))
const badMacOutput = path.join(root, 'bad-macos-branding.json')
assert.equal(await runVerifier('macos', 'x64', buildDir, badMacOutput), 1)
const badMacReport = JSON.parse(await fs.readFile(badMacOutput, 'utf8'))
assert.equal(badMacReport.checks[0].status, 'failed')

await fs.rm(root, { recursive: true, force: true })

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
