import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

const root = path.join(process.cwd(), 'dist-temp', 'release-trust-evidence-test')
const binDir = path.join(root, 'bin')
await fs.rm(root, { recursive: true, force: true })
await fs.mkdir(binDir, { recursive: true })

if (process.platform !== 'win32') {
  await writeExecutable('powershell.exe', '#!/bin/sh\nprintf \'{\"status\":\"Valid\"}\\n\'\n')
}
if (process.platform !== 'win32') {
  await writeExecutable('codesign', `#!/bin/sh
if [ "$1" = "--display" ]; then
  printf 'flags=0x10000(runtime)\\nTeamIdentifier=FIXTURETEAM\\n' >&2
fi
exit 0
`)
  for (const command of ['xcrun', 'spctl', 'hdiutil']) {
    await writeExecutable(command, '#!/bin/sh\nexit 0\n')
  }
}

const windowsDir = path.join(root, 'windows')
await fs.mkdir(windowsDir, { recursive: true })
const windowsArtifact = 'signed fixture'
const windowsBlockmap = 'windows blockmap'
await fs.writeFile(path.join(windowsDir, 'fixture.exe'), windowsArtifact)
await fs.writeFile(path.join(windowsDir, 'fixture.exe.blockmap'), windowsBlockmap)
await fs.writeFile(path.join(windowsDir, 'metadata.json'), JSON.stringify({
  schemaVersion: 1,
  platform: 'windows',
  arch: 'x64',
  productName: 'Fixture',
  artifact: {
    fileName: 'fixture.exe',
    sizeBytes: Buffer.byteLength(windowsArtifact),
    sha256: sha256(windowsArtifact),
    blockmap: {
      fileName: 'fixture.exe.blockmap',
      sizeBytes: Buffer.byteLength(windowsBlockmap),
      sha256: sha256(windowsBlockmap)
    }
  }
}))
const windowsOutput = path.join(root, 'windows-trust.json')
const windowsExit = await runVerifier('windows', 'x64', windowsDir, path.join(windowsDir, 'metadata.json'), windowsOutput)
const windowsReport = JSON.parse(await fs.readFile(windowsOutput, 'utf8'))
assert.equal(windowsReport.checks[0].id, 'artifact_checksum')
assert.equal(windowsReport.checks[0].status, 'passed')
assert.equal(windowsReport.checks[1].id, 'blockmap_checksum')
assert.equal(windowsReport.checks[1].status, 'passed')
assert.equal(windowsReport.checks[2].id, 'signature')
if (process.platform === 'win32') {
  assert.equal(windowsExit, 1)
  assert.equal(windowsReport.checks[2].status, 'failed')
} else {
  assert.equal(windowsExit, 0)
  assert.equal(windowsReport.checks[2].status, 'passed')
}

if (process.platform !== 'win32') {
  const macDir = path.join(root, 'macos')
  const macArtifact = 'signed fixture'
  const macBlockmap = 'macos blockmap'
  await fs.mkdir(path.join(macDir, 'mac-arm64', 'Fixture.app'), { recursive: true })
  await fs.writeFile(path.join(macDir, 'Fixture-1.0.0-arm64.dmg'), macArtifact)
  await fs.writeFile(path.join(macDir, 'Fixture-1.0.0-arm64.dmg.blockmap'), macBlockmap)
  await fs.writeFile(path.join(macDir, 'metadata.json'), JSON.stringify({
    schemaVersion: 1,
    platform: 'macos',
    arch: 'arm64',
    productName: 'Fixture',
    artifact: {
      fileName: 'Fixture-1.0.0-arm64.dmg',
      sizeBytes: Buffer.byteLength(macArtifact),
      sha256: sha256(macArtifact),
      blockmap: {
        fileName: 'Fixture-1.0.0-arm64.dmg.blockmap',
        sizeBytes: Buffer.byteLength(macBlockmap),
        sha256: sha256(macBlockmap)
      }
    }
  }))
  const macOutput = path.join(root, 'mac-trust.json')
  assert.equal(
    await runVerifier('macos', 'arm64', macDir, path.join(macDir, 'metadata.json'), macOutput),
    0
  )
  const macReport = JSON.parse(await fs.readFile(macOutput, 'utf8'))
  assert.equal(macReport.checks.length, 9)
  assert.ok(macReport.checks.every((check: { status: string }) => check.status === 'passed'))
  assert.equal(JSON.stringify(macReport).includes(root), false)
}

await fs.writeFile(path.join(windowsDir, 'fixture.exe'), 'tampered fixture')
const tamperedOutput = path.join(root, 'tampered-trust.json')
assert.equal(
  await runVerifier('windows', 'x64', windowsDir, path.join(windowsDir, 'metadata.json'), tamperedOutput),
  1
)
const tamperedReport = JSON.parse(await fs.readFile(tamperedOutput, 'utf8'))
assert.equal(tamperedReport.checks[0].status, 'failed')
assert.equal(tamperedReport.checks.some((check: { id: string }) => check.id === 'signature'), false)

await fs.rm(root, { recursive: true, force: true })

async function writeExecutable(name: string, content: string): Promise<void> {
  const target = path.join(binDir, name)
  await fs.writeFile(target, content)
  await fs.chmod(target, 0o755)
}

async function runVerifier(
  platform: 'windows' | 'macos',
  arch: 'x64' | 'arm64',
  distDir: string,
  metadata: string,
  output: string
): Promise<number> {
  const code = await new Promise<number>((resolve, reject) => {
    const child = spawn(process.execPath, [
      'scripts/verify-release-trust.mjs',
      `--platform=${platform}`,
      `--arch=${arch}`,
      `--dist-dir=${distDir}`,
      `--metadata=${metadata}`,
      `--output=${output}`
    ], {
      cwd: process.cwd(),
      env: { ...process.env, PATH: `${binDir}${path.delimiter}${process.env.PATH ?? ''}` },
      stdio: 'ignore'
    })
    child.on('error', reject)
    child.on('close', (exitCode) => resolve(exitCode ?? 1))
  })
  return code
}

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex')
}
