import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import {
  listPackageSmokeHostDefaults,
  resolvePackageSmokeHostDefaults
} from './package-smoke-host-defaults.mjs'

const source = await fs.readFile('scripts/package-smoke.mjs', 'utf8')

assert.match(source, /package-smoke/)
assert.match(source, /resolvePackageSmokeHostDefaults\(process\.platform\)/)
assert.match(source, /--build/)
assert.match(source, /--launch-unpacked/)
assert.match(source, /--dmg-install-smoke/)
assert.match(source, /--sandbox/)
assert.match(source, /--sandbox-install/)
assert.match(source, /--sandbox-install-timeout-ms=/)
assert.match(source, /--work-root=/)
assert.match(source, /--output=/)
assert.match(source, /fs\.writeFile\(outputPath/)
assert.match(source, /os\.tmpdir\(\)/)
assert.match(source, /--arch=/)
assert.match(source, /packageManifest\.version/)
assert.match(source, /win-arm64-unpacked/)
assert.match(source, /WindowsSandbox\.exe/)
assert.match(source, /hdiutil/)
assert.match(source, /DMG mounted read-only/)
assert.match(source, /fs\.cp\(mountedApp, installedApp/)
assert.match(source, /child\.kill\('SIGKILL'\)/)
assert.match(source, /child\.on\('close'/)
assert.match(source, /<VGpu>Disable<\/VGpu>/)
assert.match(source, /Start-Sleep -Seconds 15/)
assert.match(source, /NO_PROXY: '\*'/)
assert.match(source, /run-electron-builder\.mjs/)
assert.doesNotMatch(source, /process\.platform === 'win32' \? 'npm\.cmd' : 'npm'/)
assert.doesNotMatch(source, /process\.platform === 'win32' \? \['\.exe', '\.cmd', '\.bat', ''\] : \[''\]/)
assert.doesNotMatch(source, /30\.5\.1/)
assert.match(source, /Get-AuthenticodeSignature/)
assert.match(source, /\$sig\.Status\.ToString\(\)/)
assert.match(source, /Get-FileHash/)
assert.match(source, /installer-subfolder/)
assert.match(source, /Start-Process -FilePath \$installer/)
assert.match(source, /\$installerProcess\.WaitForExit/)
assert.match(source, /function Write-Report/)
assert.match(source, /completed = \$completed/)
assert.match(source, /Move-Item -LiteralPath \$reportTemp -Destination \$report -Force/)
assert.match(source, /finally \{\s+Write-Report \$true/)
assert.doesNotMatch(source, /spawn\(installerPath/)
assert.doesNotMatch(source, /console\.log\(fullLog\)/)

assert.deepEqual(resolvePackageSmokeHostDefaults('win32'), {
  platform: 'win32',
  npmCommand: 'npm.cmd',
  unpackedCheckId: 'winUnpackedExe',
  pathExecutableExtensions: ['.exe', '.cmd', '.bat', ''],
  authenticodeAvailable: true
})
assert.deepEqual(resolvePackageSmokeHostDefaults('darwin'), {
  platform: 'darwin',
  npmCommand: 'npm',
  unpackedCheckId: 'macUnpackedApp',
  pathExecutableExtensions: [''],
  authenticodeAvailable: false
})
assert.deepEqual(resolvePackageSmokeHostDefaults('linux'), {
  platform: 'other',
  npmCommand: 'npm',
  unpackedCheckId: 'macUnpackedApp',
  pathExecutableExtensions: [''],
  authenticodeAvailable: false
})
const mutableDefaults = resolvePackageSmokeHostDefaults('win32')
mutableDefaults.pathExecutableExtensions.pop()
assert.deepEqual(resolvePackageSmokeHostDefaults('win32').pathExecutableExtensions, ['.exe', '.cmd', '.bat', ''])
assert.deepEqual(
  listPackageSmokeHostDefaults().map((defaults) => defaults.platform),
  ['win32', 'darwin', 'other']
)

const doc = await fs.readFile('docs/platform/PACKAGE_SMOKE_TOOL.md', 'utf8')
assert.match(doc, /node scripts\/package-smoke\.mjs --sandbox/)
assert.match(doc, /--sandbox-install/)
assert.match(doc, /--dmg-install-smoke/)
assert.match(doc, /--sandbox-install-timeout-ms/)
assert.match(doc, /operating-system temporary directory/i)
assert.match(doc, /host tool does not run the NSIS installer/i)
assert.match(doc, /incrementally/i)
assert.match(doc, /disposable install root/i)
