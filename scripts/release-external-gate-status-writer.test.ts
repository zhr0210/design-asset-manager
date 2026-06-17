import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'

import type { ReleaseCandidateChecks } from '../src/main/packaging/release-flow-governance'
import { createReleaseReadinessSummary } from '../src/main/packaging/release-readiness-summary'

const root = path.join(process.cwd(), 'dist-temp', 'tests', 'release-external-gate-status-writer-test')
await fs.rm(root, { recursive: true, force: true })
await fs.mkdir(root, { recursive: true })

const passedChecks: ReleaseCandidateChecks = {
  build: 'passed',
  governance: 'passed',
  artifact: 'passed',
  checksum: 'passed',
  packageSmoke: 'passed',
  branding: 'passed',
  installerSmoke: 'passed',
  signature: 'passed',
  hardenedRuntime: 'not_applicable',
  nestedSignatures: 'not_applicable',
  notarization: 'not_applicable',
  staple: 'not_applicable',
  gatekeeper: 'not_applicable',
  updateMetadata: 'passed'
}

const summaryPath = path.join(root, 'release-readiness-summary-windows-x64.json')
const outputPath = path.join(root, 'release-external-gate-status-windows-x64.json')
await fs.writeFile(
  summaryPath,
  `${JSON.stringify(createReleaseReadinessSummary([{
    platform: 'windows',
    arch: 'x64',
    checks: passedChecks,
    explicitPublishApproval: false
  }], 'release-readiness-evidence'), null, 2)}\n`,
  'utf8'
)

assert.equal(await runWriter([
  '--platform=windows',
  '--arch=x64',
  `--dist-dir=${root}`
]), 0)

const status = JSON.parse(await fs.readFile(outputPath, 'utf8'))
assert.equal(status.schemaVersion, 1)
assert.equal(status.source, 'release-readiness-summary')
assert.equal(status.displayOnly, true)
assert.equal(status.platforms.length, 1)
assert.equal(status.platforms[0].platform, 'windows')
assert.equal(status.platforms[0].arch, 'x64')
assert.equal(status.platforms[0].stage, 'distribution_ready')
assert.deepEqual(
  status.platforms[0].gates.map((gate: { code: string, status: string }) => [gate.code, gate.status]),
  [
    ['branding_assets', 'satisfied'],
    ['signing_environment', 'satisfied'],
    ['signed_candidate_workflow', 'satisfied'],
    ['distribution_install_smoke', 'satisfied'],
    ['publish_approval', 'external_action_required']
  ]
)
assert.equal(JSON.stringify(status).includes(root), false)
assert.equal(JSON.stringify(status).includes('/Users/'), false)
assert.equal(JSON.stringify(status).includes('C:\\Users\\'), false)
assert.equal(JSON.stringify(status).includes('WINDOWS_CSC_KEY_PASSWORD='), false)

const customOutput = path.join(root, 'custom-status.json')
assert.equal(await runWriter([
  '--platform=windows',
  '--arch=x64',
  `--readiness=${summaryPath}`,
  `--output=${customOutput}`
]), 0)
assert.equal(JSON.parse(await fs.readFile(customOutput, 'utf8')).platforms[0].platform, 'windows')

const mismatchOutput = path.join(root, 'mismatch-status.json')
assert.equal(await runWriter([
  '--platform=macos',
  '--arch=x64',
  `--readiness=${summaryPath}`,
  `--output=${mismatchOutput}`
]), 1)

const workflow = await fs.readFile('.github/workflows/release-signed-candidate.yml', 'utf8')
assert.match(workflow, /write-release-external-gate-status\.mjs/)
assert.match(workflow, /release-external-gate-status-\*\.json/)
assert.match(workflow, /node scripts\/write-release-external-gate-status\.mjs --platform=windows --arch=\$\{\{ inputs\.arch \}\}/)
assert.match(workflow, /node scripts\/write-release-external-gate-status\.mjs --platform=macos --arch=\$\{\{ inputs\.arch \}\}/)
assertWorkflowOrder(workflow, [
  'Write Release Readiness Summary',
  'Write External Gate Status',
  'Upload signed Windows candidate'
])
assertWorkflowOrder(workflow.slice(workflow.indexOf('macos-signed-candidate:')), [
  'Write Release Readiness Summary',
  'Write External Gate Status',
  'Upload signed macOS candidate'
])
assert.doesNotMatch(workflow, /write-release-external-gate-status\.mjs[^\n]*publish-approved=true/)

const preflight = await fs.readFile('src/main/packaging/release-signed-candidate-preflight.ts', 'utf8')
assert.match(preflight, /release-external-gate-status/)

const source = await fs.readFile('scripts/write-release-external-gate-status.ts', 'utf8')
const wrapper = await fs.readFile('scripts/write-release-external-gate-status.mjs', 'utf8')
assert.match(wrapper, /write-release-external-gate-status\.ts/)
assert.match(source, /createReleaseExternalGateStatus/)
assert.doesNotMatch(source, /process\.env|secrets\.|readFile\(.*icon|createReadStream|gh\s+workflow|gh\s+release|notarytool|codesign|signtool/)
assert.doesNotMatch(source, /\/Users\/[A-Za-z0-9_.-]+|C:\\Users\\[A-Za-z0-9_.-]+/)

const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8')) as {
  scripts?: Record<string, string>
}
assert.equal(
  packageJson.scripts?.['test-release-external-gate-status-writer'],
  'node scripts/run-ts-test.mjs scripts/release-external-gate-status-writer.test.ts'
)
assert.match(packageJson.scripts?.['ci:governance'] ?? '', /test-release-external-gate-status-writer/)

await fs.rm(root, { recursive: true, force: true })
console.log('release-external-gate-status-writer passed')

async function runWriter(args: string[]): Promise<number> {
  return await new Promise<number>((resolve, reject) => {
    const child = spawn(process.execPath, [
      'scripts/write-release-external-gate-status.mjs',
      ...args
    ], {
      cwd: process.cwd(),
      stdio: 'ignore'
    })
    child.on('error', reject)
    child.on('close', (code) => resolve(code ?? 1))
  })
}

function assertWorkflowOrder(workflow: string, stepNames: string[]): void {
  let previous = -1
  for (const stepName of stepNames) {
    const current = workflow.indexOf(`- name: ${stepName}`)
    assert.notEqual(current, -1, `Missing workflow step: ${stepName}`)
    assert.ok(current > previous, `Workflow step out of order: ${stepName}`)
    previous = current
  }
}
