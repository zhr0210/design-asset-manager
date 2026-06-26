import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import {
  listPackageSmokeHostDefaults,
  resolvePackageSmokeArtifactPlan,
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
assert.match(source, /resolvePackageSmokeArtifactPlan\(process\.platform/)
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
assert.doesNotMatch(source, /const activeInstaller = process\.platform === 'win32'/)
assert.doesNotMatch(source, /const activeUnpacked = process\.platform === 'win32'/)
assert.doesNotMatch(source, /requestedArch === 'arm64' \? 'win-arm64-unpacked' : 'win-unpacked'/)
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
assert.deepEqual(resolvePackageSmokeArtifactPlan('win32', {
  distDir: '/dist',
  productName: 'Design Asset Manager',
  version: '1.0.0',
  arch: 'arm64'
}), {
  platform: 'win32',
  arch: 'arm64',
  installerPath: path.join('/dist', 'Design Asset Manager Setup 1.0.0.exe'),
  unpackedArtifactPath: path.join('/dist', 'win-arm64-unpacked', 'Design Asset Manager.exe'),
  unpackedBinaryCandidates: [
    path.join('/dist', 'win-arm64-unpacked', 'Design Asset Manager.exe'),
    path.join('/dist', 'win-unpacked', 'Design Asset Manager.exe')
  ],
  scanDmgFiles: false,
  scanMacUnpackedDirs: false,
  sandboxUnpackedDir: 'win-arm64-unpacked',
  sandboxUnpackedExecutablePath: path.join('/dist', 'win-arm64-unpacked', 'Design Asset Manager.exe')
})
assert.deepEqual(resolvePackageSmokeArtifactPlan('darwin', {
  distDir: '/dist',
  productName: 'Design Asset Manager',
  version: '1.0.0',
  arch: 'x64'
}), {
  platform: 'darwin',
  arch: 'x64',
  installerPath: path.join('/dist', 'Design Asset Manager-1.0.0-x64.dmg'),
  unpackedArtifactPath: path.join('/dist', 'mac-x64', 'Design Asset Manager.app'),
  unpackedBinaryCandidates: [
    path.join('/dist', 'mac', 'Design Asset Manager.app', 'Contents', 'MacOS', 'Design Asset Manager'),
    path.join('/dist', 'mac-arm64', 'Design Asset Manager.app', 'Contents', 'MacOS', 'Design Asset Manager')
  ],
  scanDmgFiles: true,
  scanMacUnpackedDirs: true,
  macUnpackedDirectoryPrefix: 'mac',
  sandboxUnpackedDir: 'win-unpacked',
  sandboxUnpackedExecutablePath: path.join('/dist', 'win-unpacked', 'Design Asset Manager.exe')
})
const mutableArtifactPlan = resolvePackageSmokeArtifactPlan('win32', {
  distDir: '/dist',
  productName: 'Design Asset Manager',
  version: '1.0.0',
  arch: 'x64'
})
mutableArtifactPlan.unpackedBinaryCandidates.pop()
assert.deepEqual(
  resolvePackageSmokeArtifactPlan('win32', {
    distDir: '/dist',
    productName: 'Design Asset Manager',
    version: '1.0.0',
    arch: 'x64'
  }).unpackedBinaryCandidates,
  [
    path.join('/dist', 'win-unpacked', 'Design Asset Manager.exe'),
    path.join('/dist', 'win-x64-unpacked', 'Design Asset Manager.exe')
  ]
)
assert.throws(
  () => resolvePackageSmokeArtifactPlan('win32', {
    distDir: '/dist',
    productName: 'Design Asset Manager',
    version: '1.0.0',
    arch: 'ia32'
  }),
  /--arch must be x64 or arm64/
)
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
