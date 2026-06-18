import fs from 'node:fs/promises'
import path from 'node:path'

import type { ReleaseExternalGateStatus } from '../src/main/packaging/release-external-gate-status'
import {
  createReleaseEvidenceBundleStatus,
  type ReleaseEvidenceBundleTargetStage
} from '../src/main/packaging/release-evidence-bundle-status'
import {
  createDefaultReleaseEvidenceBundleRequirements,
  formatReleaseEvidenceBundleRequirements,
  parseReleaseEvidenceBundleRequirements
} from '../src/main/packaging/release-target-selection'

const options = parseArgs(process.argv.slice(2))
const distDir = path.resolve(options['dist-dir'] ?? 'dist-packages')
const targetStage = requireChoice(
  options['target-stage'] ?? 'distribution_ready',
  ['distribution_ready', 'publish_ready'],
  '--target-stage'
) as ReleaseEvidenceBundleTargetStage
const defaultRequirements = formatReleaseEvidenceBundleRequirements(
  createDefaultReleaseEvidenceBundleRequirements()
)
const requirements = parseReleaseEvidenceBundleRequirements(options.required ?? defaultRequirements)
const outputPath = path.resolve(
  options.output ?? path.join(distDir, 'release-evidence-bundle-status.json')
)

const statuses = await readGateStatuses(distDir)
const bundleStatus = createReleaseEvidenceBundleStatus(statuses, requirements, targetStage)

await fs.mkdir(path.dirname(outputPath), { recursive: true })
await fs.writeFile(outputPath, `${JSON.stringify(bundleStatus, null, 2)}\n`, 'utf8')
console.log(JSON.stringify(bundleStatus))
if (!bundleStatus.bundleReady) process.exitCode = 1

async function readGateStatuses(targetDir: string): Promise<ReleaseExternalGateStatus[]> {
  const entries = await fs.readdir(targetDir)
  const statusFileNames = entries
    .filter((entry) => /^release-external-gate-status-[a-z]+-[a-z0-9]+\.json$/i.test(entry))
    .sort()

  return await Promise.all(statusFileNames.map(async (fileName) =>
    JSON.parse(await fs.readFile(path.join(targetDir, fileName), 'utf8')) as ReleaseExternalGateStatus
  ))
}

function parseArgs(args: string[]): Record<string, string> {
  return Object.fromEntries(args.map((arg) => {
    const match = /^--([^=]+)=(.*)$/.exec(arg)
    if (!match) throw new Error(`Invalid argument: ${arg}`)
    return [match[1], match[2]]
  }))
}

function requireChoice(value: string | undefined, choices: readonly string[], flag: string): string {
  if (!choices.includes(value ?? '')) {
    throw new Error(`${flag} must be one of: ${choices.join(', ')}`)
  }
  return value as string
}
