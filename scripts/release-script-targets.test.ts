import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { getReleasePlatformTarget } from '../src/main/packaging/release-flow-governance'
import {
  releaseArchChoices,
  releaseEvidenceFileName,
  releasePlatformChoices
} from '../src/main/packaging/release-target-selection'

const helperUrl = pathToFileURL(path.join(process.cwd(), 'scripts', 'release-script-targets.mjs')).href
const helper = await import(helperUrl) as {
  RELEASE_SCRIPT_PLATFORMS: string[]
  RELEASE_SCRIPT_ARCHES: string[]
  resolveReleaseScriptPlatformTarget: (platform: string) => {
    platform: string
    primaryArtifactExtension: string
    artifactExtensions: string[]
    brandingIconFileName: string
    brandingIconFormat: string
    brandingEvidenceIconCheckId: string
  }
  listReleaseScriptPlatformTargets: () => Array<{
    platform: string
    primaryArtifactExtension: string
    artifactExtensions: string[]
    brandingIconFileName: string
    brandingIconFormat: string
    brandingEvidenceIconCheckId: string
  }>
  parseReleaseScriptTarget: (options: Record<string, string>) => { platform: string, arch: string }
  releaseScriptEvidenceFileName: (prefix: string, target: { platform: string, arch: string }) => string
  requireChoice: (value: string | undefined, choices: string[], flag: string) => string
}

assert.deepEqual(helper.RELEASE_SCRIPT_PLATFORMS, releasePlatformChoices())
assert.deepEqual(helper.RELEASE_SCRIPT_ARCHES, releaseArchChoices())
assert.deepEqual(helper.resolveReleaseScriptPlatformTarget('windows'), {
  platform: 'windows',
  primaryArtifactExtension: '.exe',
  artifactExtensions: ['.exe', '.blockmap'],
  brandingIconFileName: 'icon.ico',
  brandingIconFormat: 'ico',
  brandingEvidenceIconCheckId: 'windows_icon'
})
assert.deepEqual(helper.resolveReleaseScriptPlatformTarget('macos'), {
  platform: 'macos',
  primaryArtifactExtension: '.dmg',
  artifactExtensions: ['.dmg', '.blockmap'],
  brandingIconFileName: 'icon.icns',
  brandingIconFormat: 'icns',
  brandingEvidenceIconCheckId: 'macos_icon'
})
const mutableTarget = helper.resolveReleaseScriptPlatformTarget('windows')
mutableTarget.artifactExtensions.pop()
assert.deepEqual(
  helper.resolveReleaseScriptPlatformTarget('windows').artifactExtensions,
  ['.exe', '.blockmap']
)
assert.deepEqual(
  helper.listReleaseScriptPlatformTargets().map((target) => target.platform),
  releasePlatformChoices()
)
for (const target of helper.listReleaseScriptPlatformTargets()) {
  const sharedTarget = getReleasePlatformTarget(target.platform as 'windows' | 'macos')
  assert.equal(target.brandingIconFileName, sharedTarget.brandingIconFileName)
  assert.equal(target.brandingEvidenceIconCheckId, sharedTarget.brandingEvidenceIconCheckId)
}
assert.deepEqual(
  helper.parseReleaseScriptTarget({ platform: 'windows', arch: 'x64' }),
  { platform: 'windows', arch: 'x64' }
)
assert.equal(
  helper.releaseScriptEvidenceFileName('release-checksums', { platform: 'macos', arch: 'arm64' }),
  releaseEvidenceFileName('release-checksums', { platform: 'macos', arch: 'arm64' })
)
assert.throws(
  () => helper.parseReleaseScriptTarget({ platform: 'linux', arch: 'x64' }),
  /--platform must be one of: windows, macos/
)
assert.throws(
  () => helper.parseReleaseScriptTarget({ platform: 'windows', arch: 'ia32' }),
  /--arch must be one of: x64, arm64/
)
assert.equal(helper.requireChoice('stable', ['stable'], '--channel'), 'stable')

const helperSource = await fs.readFile('scripts/release-script-targets.mjs', 'utf8')
assert.doesNotMatch(helperSource, /process\.env|\bfs\.|\breadFile\b|\breaddir\b|\bcreateReadStream\b/)
assert.doesNotMatch(helperSource, /\/Users\/[A-Za-z0-9_.-]+|C:\\Users\\[A-Za-z0-9_.-]+/)

for (const scriptPath of [
  'scripts/write-release-checksums.mjs',
  'scripts/write-release-update-metadata.mjs',
  'scripts/verify-release-trust.mjs',
  'scripts/verify-release-branding.mjs'
]) {
  const source = await fs.readFile(scriptPath, 'utf8')
  assert.match(source, /release-script-targets\.mjs/)
  assert.doesNotMatch(source, /\['windows', 'macos'\]/)
  assert.doesNotMatch(source, /\['x64', 'arm64'\]/)
}

for (const scriptPath of [
  'scripts/write-release-checksums.mjs',
  'scripts/write-release-update-metadata.mjs',
  'scripts/verify-release-branding.mjs'
]) {
  const source = await fs.readFile(scriptPath, 'utf8')
  assert.match(source, /resolveReleaseScriptPlatformTarget\(platform\)/)
  assert.doesNotMatch(source, /\bplatform\s*(?:===|!==)\s*['"](?:windows|macos)['"]/)
}

const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8')) as {
  scripts?: Record<string, string>
}
assert.equal(
  packageJson.scripts?.['test-release-script-targets'],
  'node scripts/run-ts-test.mjs scripts/release-script-targets.test.ts'
)
assert.match(packageJson.scripts?.['ci:governance'] ?? '', /test-release-script-targets/)

console.log('release-script-targets passed')
