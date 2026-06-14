import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'

const root = path.join(process.cwd(), 'dist-temp', 'release-checksums-test')
const windowsDir = path.join(root, 'windows')
const macosDir = path.join(root, 'macos')
await fs.rm(root, { recursive: true, force: true })
await fs.mkdir(windowsDir, { recursive: true })
await fs.mkdir(macosDir, { recursive: true })
await fs.writeFile(path.join(windowsDir, 'Design Asset Manager Setup 1.0.0.exe'), 'windows-artifact')
await fs.writeFile(path.join(windowsDir, 'Design Asset Manager Setup 1.0.0.exe.blockmap'), 'windows-blockmap')
await fs.writeFile(path.join(macosDir, 'Design Asset Manager-1.0.0-arm64.dmg'), 'macos-artifact')
await fs.writeFile(path.join(macosDir, 'Design Asset Manager-1.0.0-x64.dmg'), 'other-architecture')

const windowsOutput = path.join(root, 'windows-report.json')
await runChecksumWriter('windows', 'x64', windowsDir, windowsOutput)
const windowsReport = JSON.parse(await fs.readFile(windowsOutput, 'utf8'))
assert.equal(windowsReport.platform, 'windows')
assert.equal(windowsReport.arch, 'x64')
assert.equal(windowsReport.artifacts.length, 2)
assert.match(windowsReport.artifacts[0].sha256, /^[a-f0-9]{64}$/)
assert.equal(JSON.stringify(windowsReport).includes(windowsDir), false)

const macosOutput = path.join(root, 'macos-report.json')
await runChecksumWriter('macos', 'arm64', macosDir, macosOutput)
const macosReport = JSON.parse(await fs.readFile(macosOutput, 'utf8'))
assert.equal(macosReport.platform, 'macos')
assert.equal(macosReport.arch, 'arm64')
assert.equal(macosReport.artifacts.length, 1)
assert.equal(macosReport.artifacts[0].fileName, 'Design Asset Manager-1.0.0-arm64.dmg')

const missingDir = path.join(root, 'missing')
await fs.mkdir(missingDir, { recursive: true })
await assert.rejects(
  () => runChecksumWriter('windows', 'x64', missingDir, path.join(root, 'missing-report.json')),
  /exited with 1/
)

await fs.rm(root, { recursive: true, force: true })

async function runChecksumWriter(
  platform: 'windows' | 'macos',
  arch: 'x64' | 'arm64',
  distDir: string,
  output: string
): Promise<void> {
  const exitCode = await new Promise<number>((resolve, reject) => {
    const child = spawn(process.execPath, [
      'scripts/write-release-checksums.mjs',
      `--platform=${platform}`,
      `--arch=${arch}`,
      `--dist-dir=${distDir}`,
      `--output=${output}`
    ], {
      cwd: process.cwd(),
      stdio: 'ignore'
    })
    child.on('error', reject)
    child.on('close', (code) => resolve(code ?? 1))
  })
  if (exitCode !== 0) throw new Error(`write-release-checksums exited with ${exitCode}`)
}
