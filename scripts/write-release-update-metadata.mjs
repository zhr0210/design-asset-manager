import fs from 'node:fs/promises'
import path from 'node:path'

const options = parseArgs(process.argv.slice(2))
const platform = requireChoice(options.platform, ['windows', 'macos'], '--platform')
const arch = requireChoice(options.arch, ['x64', 'arm64'], '--arch')
const channel = requireChoice(options.channel ?? 'stable', ['stable'], '--channel')
const packageManifest = JSON.parse(await fs.readFile('package.json', 'utf8'))
const version = requireVersion(packageManifest.version)
const productName = requireProductName(packageManifest.build?.productName ?? packageManifest.name)
const checksumPath = path.resolve(
  options.checksums ?? `dist-packages/release-checksums-${platform}-${arch}.json`
)
const outputPath = path.resolve(
  options.output ?? `dist-packages/release-update-metadata-${platform}-${arch}.json`
)
const checksums = JSON.parse(await fs.readFile(checksumPath, 'utf8'))

if (checksums.schemaVersion !== 1) {
  throw new Error('Checksum manifest schemaVersion must be 1.')
}
if (checksums.platform !== platform || checksums.arch !== arch) {
  throw new Error('Checksum manifest platform and architecture must match the requested metadata.')
}

const primaryExtension = platform === 'windows' ? '.exe' : '.dmg'
const artifacts = requireArtifacts(checksums.artifacts)
const primary = artifacts.filter((artifact) => artifact.fileName.toLowerCase().endsWith(primaryExtension))
if (primary.length !== 1) {
  throw new Error(`Release metadata requires exactly one ${primaryExtension} artifact.`)
}
const blockmap = artifacts.find((artifact) => artifact.fileName === `${primary[0].fileName}.blockmap`)
if (!blockmap) {
  throw new Error('Release metadata requires the primary artifact blockmap.')
}

const metadata = {
  schemaVersion: 1,
  channel,
  version,
  productName,
  platform,
  arch,
  artifact: {
    fileName: primary[0].fileName,
    sizeBytes: primary[0].sizeBytes,
    sha256: primary[0].sha256,
    blockmap: {
      fileName: blockmap.fileName,
      sizeBytes: blockmap.sizeBytes,
      sha256: blockmap.sha256
    }
  }
}

await fs.mkdir(path.dirname(outputPath), { recursive: true })
await fs.writeFile(outputPath, `${JSON.stringify(metadata, null, 2)}\n`, 'utf8')
console.log(JSON.stringify(metadata))

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

function requireVersion(value) {
  if (typeof value !== 'string' || !/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(value)) {
    throw new Error('package.json version must be a semantic version.')
  }
  return value
}

function requireProductName(value) {
  if (typeof value !== 'string' || value.length === 0 || /[\\/\0]/.test(value) || path.basename(value) !== value) {
    throw new Error('Package productName must be a non-empty file-name-safe string.')
  }
  return value
}

function requireArtifacts(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error('Checksum manifest artifacts must be a non-empty array.')
  }
  return value.map((artifact) => {
    if (
      !artifact
      || typeof artifact.fileName !== 'string'
      || /[\\/\0]/.test(artifact.fileName)
      || path.basename(artifact.fileName) !== artifact.fileName
      || !Number.isSafeInteger(artifact.sizeBytes)
      || artifact.sizeBytes < 0
      || typeof artifact.sha256 !== 'string'
      || !/^[a-f0-9]{64}$/i.test(artifact.sha256)
    ) {
      throw new Error('Checksum manifest contains an invalid artifact entry.')
    }
    return {
      fileName: artifact.fileName,
      sizeBytes: artifact.sizeBytes,
      sha256: artifact.sha256.toLowerCase()
    }
  })
}
