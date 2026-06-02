import assert from 'node:assert/strict'
import fs from 'node:fs/promises'

type PackagingAudit = {
  readOnly?: boolean
  changedPackagingBehavior?: boolean
  packagingConfig?: {
    electronBuilderConfigPresent?: boolean
    packageScriptsPresent?: Record<string, boolean>
  }
  auditAreas?: Array<{ id?: string; status?: string; risk?: string }>
  forbiddenForPhase?: string[]
}

const auditPath = '.codeindex/electron-packaging-audit.json'
const docPath = 'docs/platform/ELECTRON_PACKAGING_AUDIT.md'
const packageJsonPath = 'package.json'
const electronViteConfigPath = 'electron.vite.config.ts'

const audit = JSON.parse(await fs.readFile(auditPath, 'utf8')) as PackagingAudit
const doc = await fs.readFile(docPath, 'utf8')
const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8')) as {
  scripts?: Record<string, string>
  build?: {
    asar?: unknown
    asarUnpack?: string[]
    publish?: unknown
    win?: { executableName?: unknown }
    mac?: { identity?: unknown }
    nsis?: {
      oneClick?: unknown
      include?: unknown
      allowToChangeInstallationDirectory?: unknown
    }
  }
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}
const electronViteConfig = await fs.readFile(electronViteConfigPath, 'utf8')
const installerNsh = await fs.readFile('build/installer.nsh', 'utf8')

assert.equal(audit.readOnly, true)
assert.equal(audit.changedPackagingBehavior, false)
assert.equal(audit.packagingConfig?.electronBuilderConfigPresent, false)
if (packageJson.build) {
  assert.equal(packageJson.build.asar, true)
  assert.ok(packageJson.build.asarUnpack?.includes('node_modules/better-sqlite3/**/*'))
  assert.ok(packageJson.build.asarUnpack?.includes('node_modules/sharp/**/*'))
  assert.ok(packageJson.build.asarUnpack?.includes('node_modules/@img/**/*'))
  assert.equal(packageJson.build.publish, null)
  assert.equal(packageJson.build.win?.executableName, 'Design Asset Manager')
  assert.equal(packageJson.build.mac?.identity, null)
  assert.equal(packageJson.build.nsis?.oneClick, false)
  assert.equal(packageJson.build.nsis?.include, 'build/installer.nsh')
  assert.equal(packageJson.build.nsis?.allowToChangeInstallationDirectory, true)
}

assert.match(installerNsh, /customPageAfterChangeDir/)
assert.match(installerNsh, /customInit/)
assert.match(installerNsh, /NormalizeDesignAssetManagerInstallDir/)
assert.match(installerNsh, /\$INSTDIR "\$0\\\$\{APP_FILENAME\}"/)
assert.match(installerNsh, /\$INSTDIR "\$0\$\{APP_FILENAME\}"/)
assert.match(installerNsh, /nsDialogs::Create/)

for (const scriptName of ['pack:win', 'pack:mac', 'dist:win', 'dist:mac']) {
  assert.equal(audit.packagingConfig?.packageScriptsPresent?.[scriptName], false)
  const currentScript = packageJson.scripts?.[scriptName]
  if (currentScript) {
    assert.match(currentScript, /electron-builder/)
    assert.doesNotMatch(currentScript, /\b(publish|release|notarize|afterSign|curl|wget|pip install|python -m pip)\b/i)
  }
}

assert.match(electronViteConfig, /src\/preload\/index\.ts/)
assert.match(electronViteConfig, /src\/preload\/browser\.ts/)
assert.match(electronViteConfig, /externalizeDepsPlugin/)
assert.ok(packageJson.dependencies?.['better-sqlite3'])
assert.ok(packageJson.dependencies?.sharp)
assert.ok(packageJson.devDependencies?.['electron-builder'])

const areaIds = new Set((audit.auditAreas ?? []).map((area) => area.id))
for (const requiredArea of [
  'electron-vite',
  'electron-builder',
  'asar-unpack',
  'native-dependencies',
  'preload',
  'python-worker-resources',
  'windows-macos-targets'
]) {
  assert.ok(areaIds.has(requiredArea), `Missing audit area: ${requiredArea}`)
  assert.match(doc, new RegExp(requiredArea.replaceAll('-', '.*'), 'i'))
}

const combined = [doc, JSON.stringify(audit)].join('\n')
assert.match(combined, /read-only|readOnly/i)
assert.match(combined, /better-sqlite3/)
assert.match(combined, /sharp/)
assert.match(combined, /ai-service/)
assert.match(combined, /no signing|signing/i)
assert.match(combined, /notarization/i)
assert.match(combined, /no release|release/i)
assert.doesNotMatch(combined, /C:\\Users\\[A-Za-z0-9_.-]+/i)
assert.doesNotMatch(combined, /\/Users\/[A-Za-z0-9_.-]+/)

const forbidden = (audit.forbiddenForPhase ?? []).join('\n')
assert.match(forbidden, /running electron-builder/)
assert.match(forbidden, /release publishing/)
