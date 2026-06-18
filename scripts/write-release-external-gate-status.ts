import fs from 'node:fs/promises'
import path from 'node:path'

import { createReleaseExternalGateStatus } from '../src/main/packaging/release-external-gate-status'
import type { ReleaseReadinessSummary } from '../src/main/packaging/release-readiness-summary'
import {
  parseReleaseTargetSelection,
  releaseEvidenceFileName
} from '../src/main/packaging/release-target-selection'

const options = parseArgs(process.argv.slice(2))
const { platform, arch } = parseReleaseTargetSelection(options)
const distDir = path.resolve(options['dist-dir'] ?? 'dist-packages')
const readinessPath = path.resolve(
  options.readiness ?? path.join(distDir, releaseEvidenceFileName('release-readiness-summary', { platform, arch }))
)
const outputPath = path.resolve(
  options.output ?? path.join(distDir, releaseEvidenceFileName('release-external-gate-status', { platform, arch }))
)

const readinessSummary = JSON.parse(await fs.readFile(readinessPath, 'utf8')) as ReleaseReadinessSummary
const platformSummary = readinessSummary.platforms?.[0]
if (
  readinessSummary.schemaVersion !== 1
  || readinessSummary.source !== 'release-readiness-evidence'
  || readinessSummary.platforms.length !== 1
  || platformSummary?.platform !== platform
  || platformSummary?.arch !== arch
) {
  throw new Error('Release readiness summary does not match the requested platform and architecture.')
}

const status = createReleaseExternalGateStatus(readinessSummary)
await fs.mkdir(path.dirname(outputPath), { recursive: true })
await fs.writeFile(outputPath, `${JSON.stringify(status, null, 2)}\n`, 'utf8')
console.log(JSON.stringify(status))

function parseArgs(args: string[]): Record<string, string> {
  return Object.fromEntries(args.map((arg) => {
    const match = /^--([^=]+)=(.*)$/.exec(arg)
    if (!match) throw new Error(`Invalid argument: ${arg}`)
    return [match[1], match[2]]
  }))
}
