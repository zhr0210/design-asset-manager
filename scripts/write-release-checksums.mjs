import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import {
  parseReleaseScriptTarget,
  releaseScriptEvidenceFileName
} from './release-script-targets.mjs'

const options = parseArgs(process.argv.slice(2))
const { platform, arch } = parseReleaseScriptTarget(options)
const distDir = path.resolve(options['dist-dir'] ?? 'dist-packages')
const outputPath = path.resolve(
  options.output ?? path.join(distDir, releaseScriptEvidenceFileName('release-checksums', { platform, arch }))
)
const allowedExtensions = platform === 'windows'
  ? new Set(['.exe', '.blockmap'])
  : new Set(['.dmg', '.blockmap'])
const primaryExtension = platform === 'windows' ? '.exe' : '.dmg'

const entries = await fs.readdir(distDir, { withFileTypes: true })
const availableArtifactNames = entries
  .filter((entry) => entry.isFile() && allowedExtensions.has(path.extname(entry.name).toLowerCase()))
  .map((entry) => entry.name)
  .sort((left, right) => left.localeCompare(right))

const primaryNames = availableArtifactNames
  .filter((fileName) => path.extname(fileName).toLowerCase() === primaryExtension)
const architectureMatches = primaryNames.filter((fileName) => fileName.toLowerCase().includes(arch))
const selectedPrimaryNames = architectureMatches.length > 0 ? architectureMatches : primaryNames
if (selectedPrimaryNames.length === 0) {
  throw new Error(`No ${primaryExtension} release artifact was found.`)
}
if (selectedPrimaryNames.length > 1) {
  throw new Error(`Multiple ${primaryExtension} release artifacts match ${arch}.`)
}
const primaryName = selectedPrimaryNames[0]
const artifactNames = availableArtifactNames.filter((fileName) => (
  fileName === primaryName || fileName === `${primaryName}.blockmap`
))

const artifacts = []
for (const fileName of artifactNames) {
  const filePath = path.join(distDir, fileName)
  const stat = await fs.stat(filePath)
  artifacts.push({
    fileName,
    sizeBytes: stat.size,
    sha256: await sha256(filePath)
  })
}

const report = {
  schemaVersion: 1,
  platform,
  arch,
  artifacts
}

await fs.mkdir(path.dirname(outputPath), { recursive: true })
await fs.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
console.log(JSON.stringify(report))

function parseArgs(args) {
  return Object.fromEntries(args.map((arg) => {
    const match = /^--([^=]+)=(.*)$/.exec(arg)
    if (!match) throw new Error(`Invalid argument: ${arg}`)
    return [match[1], match[2]]
  }))
}

async function sha256(filePath) {
  const hash = crypto.createHash('sha256')
  const handle = await fs.open(filePath, 'r')
  try {
    for await (const chunk of handle.createReadStream()) hash.update(chunk)
  } finally {
    await handle.close()
  }
  return hash.digest('hex')
}
