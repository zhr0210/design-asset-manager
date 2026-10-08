import fs from 'node:fs/promises'
import path from 'node:path'

import { evaluateOfficialModelCatalogRelease } from
  '../src/main/model-library-workspace/official-model-catalog.release'
import { createOfficialModelCatalogReleaseEvidence } from
  '../src/main/packaging/official-model-catalog-release-evidence'
import { parseReleaseTargetSelection } from
  '../src/main/packaging/release-target-selection'

const options = parseArgs(process.argv.slice(2))
const { platform, arch } = parseReleaseTargetSelection(options)
const output = path.resolve(
  options.output ?? path.join(
    'dist-packages',
    `official-model-catalog-release-evidence-${platform}-${arch}.json`
  )
)
const evaluation = evaluateOfficialModelCatalogRelease()
const evidence = createOfficialModelCatalogReleaseEvidence(
  platform,
  arch,
  evaluation
)

await fs.mkdir(path.dirname(output), { recursive: true })
await fs.writeFile(output, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8')
console.log(JSON.stringify(evidence))
if (evaluation.state !== 'ready') process.exitCode = 1

function parseArgs(args: string[]): Record<string, string> {
  return Object.fromEntries(args.map((arg) => {
    const match = /^--([^=]+)=(.*)$/.exec(arg)
    if (!match) throw new Error('Invalid release evidence argument.')
    return [match[1], match[2]]
  }))
}
