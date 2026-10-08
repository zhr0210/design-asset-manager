import fs from 'node:fs/promises'
import path from 'node:path'

import { createReleaseSignedCandidateDispatchStatus } from '../src/main/packaging/release-signed-candidate-dispatch-status'
import {
  parseReleaseTargetSelection,
  releaseEvidenceFileName
} from '../src/main/packaging/release-target-selection'

const options = parseArgs(process.argv.slice(2))
const { platform, arch } = parseReleaseTargetSelection(options)
const ref = options.ref ?? 'refs/heads/main'
const signingApproved = options['signing-approved'] === 'true'
const distDir = path.resolve(options['dist-dir'] ?? 'dist-packages')
const signingEnvironmentStatusPath = path.resolve(
  options['signing-environment-status'] ?? path.join(distDir, 'release-signing-environment-status.json')
)
const brandingEvidencePath = path.resolve(
  options.branding ?? path.join(distDir, releaseEvidenceFileName('release-branding-evidence', { platform, arch }))
)
const outputPath = path.resolve(
  options.output ?? path.join(distDir, releaseEvidenceFileName('release-signed-candidate-dispatch-status', { platform, arch }))
)

const status = createReleaseSignedCandidateDispatchStatus({
  platform,
  arch,
  ref,
  signingApproved,
  signingEnvironmentStatus: await readOptionalJson(signingEnvironmentStatusPath),
  brandingEvidence: await readOptionalJson(brandingEvidencePath)
})

await fs.mkdir(path.dirname(outputPath), { recursive: true })
await fs.writeFile(outputPath, `${JSON.stringify(status, null, 2)}\n`, 'utf8')
console.log(JSON.stringify(status))
if (!status.dispatchReady) process.exitCode = 1

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
