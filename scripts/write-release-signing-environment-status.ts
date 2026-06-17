import fs from 'node:fs/promises'
import path from 'node:path'

import { createReleaseSigningEnvironmentStatus } from '../src/main/packaging/release-signing-environment-status'

const options = parseArgs(process.argv.slice(2))
const distDir = path.resolve(options['dist-dir'] ?? 'dist-packages')
const evidencePath = path.resolve(
  options.evidence ?? path.join(distDir, 'release-signing-environment-evidence.json')
)
const outputPath = path.resolve(
  options.output ?? path.join(distDir, 'release-signing-environment-status.json')
)

const evidence = await readOptionalJson(evidencePath)
const status = createReleaseSigningEnvironmentStatus(evidence)

await fs.mkdir(path.dirname(outputPath), { recursive: true })
await fs.writeFile(outputPath, `${JSON.stringify(status, null, 2)}\n`, 'utf8')
console.log(JSON.stringify(status))
if (status.status !== 'ready') process.exitCode = 1

async function readOptionalJson(target: string): Promise<unknown> {
  try {
    return JSON.parse(await fs.readFile(target, 'utf8'))
  } catch {
    return null
  }
}

function parseArgs(args: string[]): Record<string, string> {
  return Object.fromEntries(args.map((arg) => {
    const match = /^--([^=]+)=(.*)$/.exec(arg)
    if (!match) throw new Error(`Invalid argument: ${arg}`)
    return [match[1], match[2]]
  }))
}
