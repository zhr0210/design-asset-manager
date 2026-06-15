import fs from 'node:fs/promises'
import crypto from 'node:crypto'
import path from 'node:path'

const options = parseArgs(process.argv.slice(2))
const platform = requireChoice(options.platform, ['windows', 'macos'], '--platform')
const arch = requireChoice(options.arch, ['x64', 'arm64'], '--arch')
const buildDir = path.resolve(options['build-dir'] ?? 'build')
const approvalPath = path.resolve(options.approval ?? path.join(buildDir, 'release-branding.json'))
const outputPath = path.resolve(
  options.output ?? path.join('dist-packages', `release-branding-evidence-${platform}-${arch}.json`)
)

const required = platform === 'windows'
  ? { id: 'windows_icon', fileName: 'icon.ico', format: 'ico' }
  : { id: 'macos_icon', fileName: 'icon.icns', format: 'icns' }
const approval = await readApproval(approvalPath, platform, required.fileName)
const icon = await verifyIcon(path.join(buildDir, required.fileName), required, approval.digest)
const report = {
  schemaVersion: 1,
  platform,
  arch,
  approvalId: approval.approvalId,
  approvedAt: approval.approvedAt,
  checks: [approval.check, ...icon.checks]
}

await fs.mkdir(path.dirname(outputPath), { recursive: true })
await fs.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
console.log(JSON.stringify(report))
if (report.checks.some((check) => check.status !== 'passed')) process.exitCode = 1

async function readApproval(target, platform, expectedFileName) {
  try {
    const parsed = JSON.parse(await fs.readFile(target, 'utf8'))
    const approvalId = typeof parsed?.approvalId === 'string' ? parsed.approvalId.trim() : ''
    const approvedAt = typeof parsed?.approvedAt === 'string' ? parsed.approvedAt : ''
    const windowsEntry = parsed?.icons?.windows
    const macosEntry = parsed?.icons?.macos
    const entry = platform === 'windows' ? windowsEntry : macosEntry
    const digest = typeof entry?.sha256 === 'string' ? entry.sha256.toLowerCase() : ''
    if (
      parsed?.schemaVersion !== 1 ||
      !/^[a-z0-9][a-z0-9._-]{2,63}$/i.test(approvalId) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(approvedAt) ||
      !isApprovalEntry(windowsEntry, 'icon.ico') ||
      !isApprovalEntry(macosEntry, 'icon.icns') ||
      entry.file !== expectedFileName
    ) {
      throw new Error('invalid approval')
    }
    return {
      approvalId,
      approvedAt,
      digest,
      check: passed('branding_approval', 'Release branding approval metadata is valid.')
    }
  } catch {
    return {
      approvalId: null,
      approvedAt: null,
      digest: null,
      check: failed('branding_approval', 'Release branding approval metadata is missing or invalid.')
    }
  }
}

function isApprovalEntry(entry, expectedFileName) {
  return entry?.file === expectedFileName &&
    typeof entry.sha256 === 'string' &&
    /^[a-f0-9]{64}$/i.test(entry.sha256)
}

async function verifyIcon(target, required, approvedDigest) {
  try {
    const data = await fs.readFile(target)
    const formatError = required.format === 'ico'
      ? validateIco(data)
      : validateIcns(data)
    const formatCheck = formatError
      ? failed(required.id, formatError)
      : passed(required.id, `${required.fileName} has a valid release icon container.`)
    const actualDigest = crypto.createHash('sha256').update(data).digest('hex')
    const digestCheck = approvedDigest && crypto.timingSafeEqual(
      Buffer.from(actualDigest, 'hex'),
      Buffer.from(approvedDigest, 'hex')
    )
      ? passed('approved_digest', 'Release icon SHA-256 matches the approved branding record.')
      : failed('approved_digest', 'Release icon SHA-256 does not match an approved branding record.')
    return { checks: [formatCheck, digestCheck] }
  } catch {
    return {
      checks: [
        failed(required.id, `${required.fileName} is missing or unreadable.`),
        failed('approved_digest', 'Release icon SHA-256 could not be verified.')
      ]
    }
  }
}

function validateIco(data) {
  if (data.length < 22 || data.readUInt16LE(0) !== 0 || data.readUInt16LE(2) !== 1) {
    return 'Windows release icon is not a valid ICO container.'
  }
  const count = data.readUInt16LE(4)
  const directoryEnd = 6 + (count * 16)
  if (count < 1 || directoryEnd > data.length) {
    return 'Windows release icon has an invalid image directory.'
  }
  let hasLargeIcon = false
  for (let index = 0; index < count; index += 1) {
    const offset = 6 + (index * 16)
    const width = data[offset] === 0 ? 256 : data[offset]
    const height = data[offset + 1] === 0 ? 256 : data[offset + 1]
    const imageSize = data.readUInt32LE(offset + 8)
    const imageOffset = data.readUInt32LE(offset + 12)
    if (imageSize < 8 || imageOffset < directoryEnd || imageOffset + imageSize > data.length) {
      return 'Windows release icon contains an invalid image entry.'
    }
    const image = data.subarray(imageOffset, imageOffset + imageSize)
    const dibHeaderSize = image.length >= 4 ? image.readUInt32LE(0) : 0
    if (!isPng(image) && dibHeaderSize < 40) {
      return 'Windows release icon contains an unsupported image payload.'
    }
    if (width >= 256 && height >= 256) hasLargeIcon = true
  }
  return hasLargeIcon ? null : 'Windows release icon must contain a 256x256 image entry.'
}

function validateIcns(data) {
  if (data.length < 16 || data.subarray(0, 4).toString('ascii') !== 'icns') {
    return 'macOS release icon is not a valid ICNS container.'
  }
  if (data.readUInt32BE(4) !== data.length) {
    return 'macOS release icon has an invalid declared size.'
  }
  let offset = 8
  let hasLargePng = false
  while (offset < data.length) {
    if (offset + 8 > data.length) return 'macOS release icon has a truncated chunk header.'
    const type = data.subarray(offset, offset + 4).toString('ascii')
    const size = data.readUInt32BE(offset + 4)
    if (size < 8 || offset + size > data.length) {
      return 'macOS release icon contains an invalid chunk.'
    }
    if ((type === 'ic10' || type === 'ic14') && isPng(data.subarray(offset + 8, offset + size))) {
      hasLargePng = true
    }
    offset += size
  }
  return hasLargePng ? null : 'macOS release icon must contain a high-resolution PNG chunk.'
}

function isPng(data) {
  return data.length >= 8 && data.subarray(0, 8).equals(
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  )
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
