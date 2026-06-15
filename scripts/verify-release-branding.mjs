import fs from 'node:fs/promises'
import path from 'node:path'

const options = parseArgs(process.argv.slice(2))
const platform = requireChoice(options.platform, ['windows', 'macos'], '--platform')
const arch = requireChoice(options.arch, ['x64', 'arm64'], '--arch')
const buildDir = path.resolve(options['build-dir'] ?? 'build')
const outputPath = path.resolve(
  options.output ?? path.join('dist-packages', `release-branding-evidence-${platform}-${arch}.json`)
)

const required = platform === 'windows'
  ? { id: 'windows_icon', fileName: 'icon.ico', format: 'ico' }
  : { id: 'macos_icon', fileName: 'icon.icns', format: 'icns' }
const check = await verifyIcon(path.join(buildDir, required.fileName), required)
const report = {
  schemaVersion: 1,
  platform,
  arch,
  checks: [check]
}

await fs.mkdir(path.dirname(outputPath), { recursive: true })
await fs.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
console.log(JSON.stringify(report))
if (check.status !== 'passed') process.exitCode = 1

async function verifyIcon(target, required) {
  try {
    const stat = await fs.stat(target)
    if (!stat.isFile()) return failed(required.id, `${required.fileName} is not a regular file.`)
    if (stat.size < 256) return failed(required.id, `${required.fileName} is too small to be an approved release icon.`)
    const handle = await fs.open(target, 'r')
    try {
      const header = Buffer.alloc(required.format === 'ico' ? 4 : 8)
      await handle.read(header, 0, header.length, 0)
      if (required.format === 'ico' && !header.subarray(0, 4).equals(Buffer.from([0, 0, 1, 0]))) {
        return failed(required.id, 'Windows release icon is not a valid ICO file.')
      }
      if (required.format === 'icns' && header.subarray(0, 4).toString('ascii') !== 'icns') {
        return failed(required.id, 'macOS release icon is not a valid ICNS file.')
      }
    } finally {
      await handle.close()
    }
    return passed(required.id, `${required.fileName} is present and has the expected release icon format.`)
  } catch {
    return failed(required.id, `${required.fileName} is missing or unreadable.`)
  }
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
