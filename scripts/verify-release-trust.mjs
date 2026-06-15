import { spawn } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

const options = parseArgs(process.argv.slice(2))
const platform = requireChoice(options.platform, ['windows', 'macos'], '--platform')
const arch = requireChoice(options.arch, ['x64', 'arm64'], '--arch')
const distDir = path.resolve(options['dist-dir'] ?? 'dist-packages')
const metadataPath = path.resolve(
  options.metadata ?? path.join(distDir, `release-update-metadata-${platform}-${arch}.json`)
)
const outputPath = path.resolve(
  options.output ?? path.join(distDir, `release-trust-evidence-${platform}-${arch}.json`)
)
const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'))
validateMetadata(metadata)
const artifactPath = path.join(distDir, metadata.artifact.fileName)
const blockmapPath = path.join(distDir, metadata.artifact.blockmap.fileName)
const artifactChecks = [
  await verifyBoundFile('artifact_checksum', artifactPath, metadata.artifact),
  await verifyBoundFile('blockmap_checksum', blockmapPath, metadata.artifact.blockmap)
]
const platformChecks = artifactChecks.every((check) => check.status === 'passed')
  ? (platform === 'windows'
      ? await verifyWindows(artifactPath)
      : await verifyMacos(artifactPath))
  : []
const checks = [...artifactChecks, ...platformChecks]
const report = {
  schemaVersion: 1,
  platform,
  arch,
  checks
}

await fs.mkdir(path.dirname(outputPath), { recursive: true })
await fs.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
console.log(JSON.stringify(report))
if (checks.some((check) => check.status !== 'passed')) process.exitCode = 1

async function verifyWindows(target) {
  const script = [
    '$ErrorActionPreference = "Stop"',
    '$signature = Get-AuthenticodeSignature -LiteralPath $env:DAM_RELEASE_ARTIFACT',
    '[pscustomobject]@{ status = $signature.Status.ToString() } | ConvertTo-Json -Compress'
  ].join('; ')
  const result = await run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
    DAM_RELEASE_ARTIFACT: target
  })
  if (result.code !== 0) {
    return [failed('signature', 'Authenticode verification command failed.')]
  }
  try {
    const signature = JSON.parse(result.stdout.trim())
    return [signature.status === 'Valid'
      ? passed('signature', 'Authenticode signature is valid.')
      : failed('signature', `Authenticode signature status is ${String(signature.status || 'Unknown')}.`)]
  } catch {
    return [failed('signature', 'Authenticode verification returned invalid structured output.')]
  }
}

async function verifyMacos(target) {
  const appPath = await findMacApp()
  const checks = []
  const strict = await run('codesign', ['--verify', '--deep', '--strict', '--verbose=2', appPath])
  checks.push(strict.code === 0
    ? passed('signature', 'Developer ID signature verification passed.')
    : failed('signature', 'Developer ID signature verification failed.'))
  checks.push(strict.code === 0
    ? passed('nested_signatures', 'Nested signature verification passed.')
    : failed('nested_signatures', 'Nested signature verification failed.'))

  const details = await run('codesign', ['--display', '--verbose=4', appPath])
  const signingDetails = `${details.stdout}\n${details.stderr}`
  const hardened = details.code === 0
    && /flags=.*\bruntime\b/i.test(signingDetails)
    && /TeamIdentifier=(?!not set)(?!$).+/im.test(signingDetails)
  checks.push(hardened
    ? passed('hardened_runtime', 'Hardened Runtime and Team ID evidence are present.')
    : failed('hardened_runtime', 'Hardened Runtime or Team ID evidence is missing.'))

  const staple = await run('xcrun', ['stapler', 'validate', appPath])
  checks.push(staple.code === 0
    ? passed('notarization', 'A valid notarization ticket is attached.')
    : failed('notarization', 'Notarization ticket validation failed.'))
  checks.push(staple.code === 0
    ? passed('staple', 'Stapled ticket validation passed.')
    : failed('staple', 'Stapled ticket validation failed.'))

  const gatekeeper = await run('spctl', [
    '--assess',
    '--type',
    'execute',
    '--verbose=2',
    appPath
  ])
  checks.push(gatekeeper.code === 0
    ? passed('gatekeeper', 'Gatekeeper assessment passed.')
    : failed('gatekeeper', 'Gatekeeper assessment failed.'))

  const dmg = await run('hdiutil', ['verify', target])
  checks.push(dmg.code === 0
    ? passed('dmg_integrity', 'DMG integrity verification passed.')
    : failed('dmg_integrity', 'DMG integrity verification failed.'))
  return checks
}

async function findMacApp() {
  const entries = await fs.readdir(distDir, { withFileTypes: true })
  const preferredDirectoryNames = arch === 'arm64'
    ? ['mac-arm64']
    : ['mac', 'mac-x64']
  for (const entry of preferredDirectoryNames.flatMap((name) => entries.filter((item) => item.name === name))) {
    if (!entry.isDirectory() || !entry.name.startsWith('mac')) continue
    const candidate = path.join(distDir, entry.name, `${metadata.productName}.app`)
    try {
      await assertDirectory(candidate, 'Packaged macOS app')
      return candidate
    } catch {}
  }
  throw new Error('Packaged macOS app is missing from the release artifact directory.')
}

function validateMetadata(value) {
  if (
    value?.schemaVersion !== 1
    || value.platform !== platform
    || value.arch !== arch
    || typeof value.productName !== 'string'
    || value.productName.length === 0
    || !isSafeFileName(value.productName)
    || typeof value.artifact?.fileName !== 'string'
    || !isSafeFileName(value.artifact.fileName)
    || !Number.isSafeInteger(value.artifact.sizeBytes)
    || value.artifact.sizeBytes < 0
    || !isSha256(value.artifact.sha256)
    || typeof value.artifact.blockmap?.fileName !== 'string'
    || !isSafeFileName(value.artifact.blockmap.fileName)
    || value.artifact.blockmap.fileName !== `${value.artifact.fileName}.blockmap`
    || !Number.isSafeInteger(value.artifact.blockmap.sizeBytes)
    || value.artifact.blockmap.sizeBytes < 0
    || !isSha256(value.artifact.blockmap.sha256)
  ) {
    throw new Error('Release Update Metadata does not match the requested platform and architecture.')
  }
}

async function verifyBoundFile(id, target, expected) {
  try {
    const stat = await fs.stat(target)
    if (!stat.isFile()) return failed(id, 'Bound release file is not a regular file.')
    if (stat.size !== expected.sizeBytes) return failed(id, 'Bound release file size does not match metadata.')
    if (await sha256(target) !== expected.sha256.toLowerCase()) {
      return failed(id, 'Bound release file SHA-256 does not match metadata.')
    }
    return passed(id, 'Bound release file size and SHA-256 match metadata.')
  } catch {
    return failed(id, 'Bound release file is missing or unreadable.')
  }
}

function isSafeFileName(value) {
  return value.length > 0 && !/[\\/\0]/.test(value) && path.basename(value) === value
}

function isSha256(value) {
  return typeof value === 'string' && /^[a-f0-9]{64}$/i.test(value)
}

function passed(id, detail) {
  return { id, status: 'passed', detail }
}

function failed(id, detail) {
  return { id, status: 'failed', detail }
}

function parseArgs(args) {
  return Object.fromEntries(args.map((arg) => {
    const match = /^--([^=]+)=(.*)$/.exec(arg)
    if (!match) throw new Error(`Invalid argument: ${arg}`)
    return [match[1], match[2]]
  }))
}

function requireChoice(value, choices, flag) {
  if (!choices.includes(value)) {
    throw new Error(`${flag} must be one of: ${choices.join(', ')}`)
  }
  return value
}

async function run(command, args, extraEnv = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: { ...process.env, ...extraEnv },
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe']
    })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => { stdout += chunk.toString() })
    child.stderr.on('data', (chunk) => { stderr += chunk.toString() })
    child.on('error', () => resolve({ code: 127, stdout, stderr }))
    child.on('close', (code) => resolve({ code: code ?? 1, stdout, stderr }))
  })
}

async function assertDirectory(target, label) {
  const stat = await fs.stat(target)
  if (!stat.isDirectory()) throw new Error(`${label} is not a directory.`)
}

async function sha256(target) {
  const hash = crypto.createHash('sha256')
  const handle = await fs.open(target, 'r')
  try {
    for await (const chunk of handle.createReadStream()) hash.update(chunk)
  } finally {
    await handle.close()
  }
  return hash.digest('hex')
}
