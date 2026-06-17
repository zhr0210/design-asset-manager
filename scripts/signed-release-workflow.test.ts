import assert from 'node:assert/strict'
import fs from 'node:fs/promises'

const workflow = await fs.readFile('.github/workflows/release-signed-candidate.yml', 'utf8')
const runner = await fs.readFile('scripts/run-electron-builder.mjs', 'utf8')
const notarizeHook = await fs.readFile('scripts/notarize.js', 'utf8')

assert.match(workflow, /workflow_dispatch/)
assert.match(workflow, /signing_approved/)
assert.match(workflow, /refs\/heads\/main/)
assert.match(workflow, /refs\/tags\/v/)
assert.match(workflow, /environment: release-signing-windows/)
assert.match(workflow, /environment: release-signing-macos/)
assert.match(workflow, /runs-on: windows-2022/)
assert.match(workflow, /actions\/checkout@v6/)
assert.match(workflow, /actions\/setup-node@v6/)
assert.match(workflow, /permissions:\s+contents: read/)
assert.match(workflow, /--signing=required/)
assert.match(workflow, /DAM_RELEASE_SIGNING_APPROVED: true/)
assert.match(workflow, /write-release-update-metadata\.mjs/)
assert.match(workflow, /verify-release-trust\.mjs/)
assert.match(workflow, /release-trust-evidence-\*\.json/)
assert.match(workflow, /verify-release-branding\.mjs/)
assert.match(workflow, /build\/release-branding\.json/)
assert.match(workflow, /release-branding-evidence-\*\.json/)
assert.match(workflow, /--output=dist-packages\/package-smoke-windows-\$\{\{ inputs\.arch \}\}\.json/)
assert.match(workflow, /--output=dist-packages\/package-smoke-macos-\$\{\{ inputs\.arch \}\}\.json/)
assert.match(workflow, /write-release-readiness-summary\.mjs/)
assert.match(workflow, /release-readiness-summary-\*\.json/)
assert.match(workflow, /write-release-external-gate-status\.mjs/)
assert.match(workflow, /release-external-gate-status-\*\.json/)
assert.match(workflow, /package-smoke-\*\.json/)
assert.match(workflow, /APPLE_APP_SPECIFIC_PASSWORD/)
assert.match(workflow, /WINDOWS_CSC_LINK/)
assert.match(workflow, /MACOS_CSC_LINK/)
assert.doesNotMatch(workflow, /contents: write|gh release|create-release|--publish always|npm publish/i)
assert.doesNotMatch(workflow, /publish-approved=true/)

const installDependencies = workflow.match(/- name: Install dependencies[\s\S]*?(?=\n      - name:)/)?.[0] ?? ''
const governance = workflow.match(/- name: Run release governance[\s\S]*?(?=\n      - name:)/)?.[0] ?? ''
assert.doesNotMatch(installDependencies, /CSC_LINK|APPLE_ID|APPLE_TEAM_ID/)
assert.doesNotMatch(governance, /CSC_LINK|APPLE_ID|APPLE_TEAM_ID/)

const windowsJob = extractJob('windows-signed-candidate', 'macos-signed-candidate')
assertWorkflowOrder(windowsJob, [
  'Run release governance',
  'Build signed NSIS candidate',
  'Write checksum manifest',
  'Write Release Update Metadata',
  'Verify Authenticode evidence',
  'Verify release branding evidence',
  'Run static Package Smoke',
  'Write Release Readiness Summary',
  'Write External Gate Status',
  'Upload signed Windows candidate'
])
assert.match(windowsJob, /npm run package:smoke -- --arch=\$\{\{ inputs\.arch \}\} --output=dist-packages\/package-smoke-windows-\$\{\{ inputs\.arch \}\}\.json/)
assert.match(windowsJob, /node scripts\/write-release-readiness-summary\.mjs --platform=windows --arch=\$\{\{ inputs\.arch \}\} --governance=passed/)
assert.match(windowsJob, /node scripts\/write-release-external-gate-status\.mjs --platform=windows --arch=\$\{\{ inputs\.arch \}\}/)
assert.doesNotMatch(windowsJob, /package:smoke[^\n]*(sandbox-install|dmg-install-smoke)|write-release-readiness-summary\.mjs[^\n]*publish-approved=true|write-release-external-gate-status\.mjs[^\n]*publish-approved=true/)

const macosJob = extractJob('macos-signed-candidate')
assertWorkflowOrder(macosJob, [
  'Run release governance',
  'Build signed and notarized DMG candidate',
  'Write checksum manifest',
  'Write Release Update Metadata',
  'Verify macOS trust evidence',
  'Verify release branding evidence',
  'Run static Package Smoke',
  'Write Release Readiness Summary',
  'Write External Gate Status',
  'Upload signed macOS candidate'
])
assert.match(macosJob, /npm run package:smoke -- --arch=\$\{\{ inputs\.arch \}\} --output=dist-packages\/package-smoke-macos-\$\{\{ inputs\.arch \}\}\.json/)
assert.match(macosJob, /node scripts\/write-release-readiness-summary\.mjs --platform=macos --arch=\$\{\{ inputs\.arch \}\} --governance=passed/)
assert.match(macosJob, /node scripts\/write-release-external-gate-status\.mjs --platform=macos --arch=\$\{\{ inputs\.arch \}\}/)
assert.doesNotMatch(macosJob, /package:smoke[^\n]*(sandbox-install|dmg-install-smoke)|write-release-readiness-summary\.mjs[^\n]*publish-approved=true|write-release-external-gate-status\.mjs[^\n]*publish-approved=true/)

assert.match(runner, /--publish/)
assert.match(runner, /never/)
assert.match(runner, /DAM_RELEASE_SIGNING_APPROVED/)
assert.match(runner, /SIGNING_ENV_KEYS/)
assert.match(notarizeHook, /path\.basename\(appPath\)/)
assert.doesNotMatch(notarizeHook, /console\.error\('Apple notarization failed:', error\)/)

function extractJob(startName: string, nextName?: string): string {
  const start = workflow.indexOf(`  ${startName}:`)
  assert.notEqual(start, -1, `Missing workflow job: ${startName}`)

  if (!nextName) return workflow.slice(start)

  const end = workflow.indexOf(`  ${nextName}:`, start + startName.length)
  assert.notEqual(end, -1, `Missing workflow job: ${nextName}`)
  return workflow.slice(start, end)
}

function assertWorkflowOrder(block: string, stepNames: string[]): void {
  let previous = -1
  for (const stepName of stepNames) {
    const current = block.indexOf(`- name: ${stepName}`)
    assert.notEqual(current, -1, `Missing workflow step: ${stepName}`)
    assert.ok(current > previous, `Workflow step out of order: ${stepName}`)
    previous = current
  }
}
