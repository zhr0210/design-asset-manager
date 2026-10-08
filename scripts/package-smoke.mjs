import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import os from 'node:os'
import { smokeOrdinaryPackageStartup } from './package-startup-smoke.mjs'
import {
  resolvePackageSmokeArtifactPlan,
  resolvePackageSmokeHostDefaults
} from './package-smoke-host-defaults.mjs'

const root = process.cwd()
const packageManifest = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'))
const productName = packageManifest.build?.productName ?? packageManifest.name
const version = packageManifest.version
const args = new Set(process.argv.slice(2))
const buildInstaller = args.has('--build')
const launchUnpacked = args.has('--launch-unpacked')
const dmgInstallSmoke = args.has('--dmg-install-smoke')
const sandboxInstall = args.has('--sandbox-install')
const generateSandbox = args.has('--sandbox') || args.has('--generate-sandbox') || sandboxInstall
const openSandbox = args.has('--open-sandbox')
const timeoutArg = process.argv.find((arg) => arg.startsWith('--timeout-ms='))
const launchTimeoutMs = timeoutArg ? Number(timeoutArg.replace('--timeout-ms=', '')) : 30000
const sandboxInstallTimeoutArg = process.argv.find((arg) => arg.startsWith('--sandbox-install-timeout-ms='))
const sandboxInstallTimeoutMs = sandboxInstallTimeoutArg
  ? Number(sandboxInstallTimeoutArg.replace('--sandbox-install-timeout-ms=', ''))
  : 120_000
if (!Number.isFinite(launchTimeoutMs) || launchTimeoutMs <= 0) {
  throw new Error('--timeout-ms must be a positive number.')
}
if (!Number.isFinite(sandboxInstallTimeoutMs) || sandboxInstallTimeoutMs <= 0) {
  throw new Error('--sandbox-install-timeout-ms must be a positive number.')
}
const archArg = process.argv.find((arg) => arg.startsWith('--arch='))
const requestedArch = archArg?.replace('--arch=', '') ?? process.arch
if (!['x64', 'arm64'].includes(requestedArch)) {
  throw new Error('--arch must be x64 or arm64.')
}
const outputArg = process.argv.find((arg) => arg.startsWith('--output='))
const outputPath = outputArg ? path.resolve(outputArg.replace('--output=', '')) : null

const distDirArg = process.argv.find(arg => arg.startsWith('--dist-dir='))
const distDir = distDirArg ? path.resolve(distDirArg.slice('--dist-dir='.length)) : path.join(root, 'dist-packages')
const workRootArg = process.argv.find((arg) => arg.startsWith('--work-root='))
const workRoot = path.resolve(
  workRootArg?.replace('--work-root=', '') || path.join(os.tmpdir(), 'DesignAssetManagerPackageSmoke')
)
const sandboxDir = path.join(workRoot, 'sandbox')
const sandboxSharedDir = path.join(sandboxDir, 'shared')
const sandboxWsbPath = path.join(sandboxDir, 'DesignAssetManagerPackageSmoke.wsb')
const sandboxScriptPath = path.join(sandboxSharedDir, 'run-package-smoke.ps1')

const report = {
  generatedAt: new Date().toISOString(),
  checks: [],
  artifacts: {}
}
const hostDefaults = resolvePackageSmokeHostDefaults(process.platform)
const artifactPlan = resolvePackageSmokeArtifactPlan(process.platform, {
  distDir,
  productName,
  version,
  arch: requestedArch
})

if (buildInstaller) {
  await runStep('build:renderer-main-preload', hostDefaults.npmCommand, ['run', 'build'], {
    env: safeBuilderEnv()
  })
  await runStep('build:windows-installer', process.execPath, [
    'scripts/run-electron-builder.mjs',
    '--platform=win',
    '--mode=dist'
  ], {
    env: safeBuilderEnv()
  })
}

async function findDmgFile() {
  if (!artifactPlan.scanDmgFiles) return null
  try {
    const files = await fs.readdir(distDir)
    const dmgFiles = files.filter((fileName) => fileName.endsWith('.dmg'))
    const architectureMatch = dmgFiles.find((fileName) => fileName.includes(artifactPlan.arch))
    const selected = architectureMatch ?? dmgFiles[0]
    return selected ? path.join(distDir, selected) : null
  } catch {}
  return null
}

async function findUnpackedBinary() {
  if (artifactPlan.scanMacUnpackedDirs) {
    try {
      const subdirs = await fs.readdir(distDir, { withFileTypes: true })
      for (const entry of subdirs) {
        if (entry.isDirectory() && entry.name.startsWith(artifactPlan.macUnpackedDirectoryPrefix)) {
          const appPath = path.join(distDir, entry.name, `${productName}.app`)
          const binaryPath = path.join(appPath, 'Contents', 'MacOS', productName)
          if (await exists(binaryPath)) {
            return binaryPath
          }
        }
      }
    } catch {}
  }

  for (const candidate of artifactPlan.unpackedBinaryCandidates) {
    if (await exists(candidate)) return candidate
  }
  return null
}

const activeInstaller = await findDmgFile() || artifactPlan.installerPath
const activeUnpacked = await findUnpackedBinary() || artifactPlan.unpackedArtifactPath

await checkFile('installer', activeInstaller)
await checkFile(hostDefaults.unpackedCheckId, activeUnpacked)

if (await exists(activeInstaller)) {
  report.artifacts.installer = {
    fileName: path.basename(activeInstaller),
    sizeBytes: (await fs.stat(activeInstaller)).size,
    sha256: await sha256(activeInstaller),
    signed: await getAuthenticodeStatus(activeInstaller)
  }
}

if (await exists(path.join(activeInstaller + '.blockmap'))) {
  report.artifacts.blockmap = {
    fileName: path.basename(activeInstaller + '.blockmap'),
    sizeBytes: (await fs.stat(activeInstaller + '.blockmap')).size
  }
}

if (launchUnpacked) {
  await smokeLaunchUnpacked()
}

if (dmgInstallSmoke) {
  await smokeInstallDmg()
}

if (generateSandbox || openSandbox) {
  await generateSandboxFiles()
}

if (openSandbox) {
  await runStep('open:windows-sandbox', 'WindowsSandbox.exe', [sandboxWsbPath], { allowMissing: false })
}

if (outputPath) {
  await fs.mkdir(path.dirname(outputPath), { recursive: true })
  await fs.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
}
console.log(JSON.stringify(report, null, 2))

function safeBuilderEnv() {
  const env = {
    ...process.env,
    NO_PROXY: '*',
    no_proxy: '*'
  }
  for (const key of ['HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY', 'http_proxy', 'https_proxy', 'all_proxy']) {
    delete env[key]
  }
  return env
}

async function checkFile(id, filePath) {
  const present = await exists(filePath)
  report.checks.push({
    id,
    status: present ? 'passed' : 'failed',
    detail: present ? `${id} exists` : `${id} is missing`
  })
  if (!present) {
    process.exitCode = 1
  }
}

async function smokeLaunchUnpacked() {
  const binaryPath = await findUnpackedBinary()
  if (!binaryPath) {
    report.checks.push({ id: 'launch-unpacked', status: 'failed', detail: 'Unpacked executable binary is missing.' })
    process.exitCode = 1
    return
  }

  const sandboxHome = path.join(distDir, 'temp-smoke-home')
  const passed = await launchPackagedBinary(binaryPath, sandboxHome)

  report.checks.push({
    id: 'launch-unpacked',
    status: passed ? 'passed' : 'failed',
    detail: passed
      ? `Ordinary packaged Host returned its actual build/platform health and its owned process exited; UI/model use is not verified.`
      : `App failed smoke checks or required startup evidence was incomplete.`
  })

  if (!passed) process.exitCode = 1
}

async function smokeInstallDmg() {
  if (process.platform !== 'darwin') {
    report.checks.push({
      id: 'dmg-install-smoke',
      status: 'skipped',
      detail: 'DMG install smoke is available only on macOS.'
    })
    return
  }

  const dmgPath = await findDmgFile()
  if (!dmgPath) {
    report.checks.push({ id: 'dmg-mount', status: 'failed', detail: 'DMG artifact is missing.' })
    process.exitCode = 1
    return
  }

  const smokeRoot = path.join(workRoot, 'macos-dmg-install')
  const mountPoint = path.join(smokeRoot, 'mount')
  const installRoot = path.join(smokeRoot, 'installed')
  const sandboxHome = path.join(smokeRoot, 'home')
  const mountedApp = path.join(mountPoint, `${productName}.app`)
  const installedApp = path.join(installRoot, `${productName}.app`)
  const installedBinary = path.join(installedApp, 'Contents', 'MacOS', productName)
  await fs.rm(smokeRoot, { recursive: true, force: true }).catch(() => {})
  await fs.mkdir(mountPoint, { recursive: true })

  let mounted = false
  try {
    const mountResult = await runCaptured('hdiutil', [
      'attach',
      '-readonly',
      '-nobrowse',
      '-mountpoint',
      mountPoint,
      dmgPath
    ])
    mounted = mountResult === 0
    report.checks.push({
      id: 'dmg-mount',
      status: mounted ? 'passed' : 'failed',
      detail: mounted ? 'DMG mounted read-only.' : 'DMG mount failed.'
    })
    if (!mounted) {
      process.exitCode = 1
      return
    }

    const sourcePresent = await exists(mountedApp)
    if (sourcePresent) {
      await fs.mkdir(installRoot, { recursive: true })
      await fs.cp(mountedApp, installedApp, { recursive: true, force: true })
    }
    const installed = sourcePresent && await exists(installedBinary)
    report.checks.push({
      id: 'dmg-copy',
      status: installed ? 'passed' : 'failed',
      detail: installed
        ? 'Application copied into the disposable install root.'
        : 'Application copy or installed executable check failed.'
    })
    if (!installed) {
      process.exitCode = 1
      return
    }

    const launched = await launchPackagedBinary(installedBinary, sandboxHome)
    report.checks.push({
      id: 'dmg-installed-launch',
      status: launched ? 'passed' : 'failed',
      detail: launched
        ? 'Installed application launched with isolated app data.'
        : 'Installed application failed isolated launch checks.'
    })
    if (!launched) process.exitCode = 1
  } finally {
    if (mounted) {
      const detached = await runCaptured('hdiutil', ['detach', '-force', mountPoint]) === 0
      report.checks.push({
        id: 'dmg-detach',
        status: detached ? 'passed' : 'failed',
        detail: detached ? 'DMG detached.' : 'DMG detach failed.'
      })
      if (!detached) process.exitCode = 1
    }
    await fs.rm(smokeRoot, { recursive: true, force: true }).catch(() => {})
  }
}

async function launchPackagedBinary(binaryPath, sandboxHome) {
  const result = await smokeOrdinaryPackageStartup({ binaryPath, workRoot, timeoutMs: launchTimeoutMs })
  report.artifacts.ordinaryStartup = result
  return result.passed
}

async function generateSandboxFiles() {
  if (process.platform !== 'win32') {
    report.checks.push({ id: 'sandbox-files', status: 'skipped', detail: 'Windows Sandbox config is Windows-only.' })
    return
  }

  await fs.mkdir(sandboxSharedDir, { recursive: true })
  const sandboxInstallerPath = path.join(sandboxSharedDir, path.basename(artifactPlan.installerPath))
  const sandboxUnpackedDir = path.join(sandboxSharedDir, artifactPlan.sandboxUnpackedDir)

  if (await exists(artifactPlan.installerPath)) {
    await fs.copyFile(artifactPlan.installerPath, sandboxInstallerPath)
  }
  if (await exists(path.join(artifactPlan.installerPath + '.blockmap'))) {
    await fs.copyFile(path.join(artifactPlan.installerPath + '.blockmap'), path.join(sandboxSharedDir, path.basename(artifactPlan.installerPath + '.blockmap')))
  }
  if (await exists(path.dirname(artifactPlan.sandboxUnpackedExecutablePath))) {
    await copyDir(path.dirname(artifactPlan.sandboxUnpackedExecutablePath), sandboxUnpackedDir)
  }

  await fs.writeFile(sandboxScriptPath, sandboxScript(), 'utf8')
  await fs.writeFile(sandboxWsbPath, sandboxConfig(), 'utf8')
  report.artifacts.sandbox = {
    workRoot: workRootArg ? '<CUSTOM_WORK_ROOT>' : '<TEMP>',
    config: path.basename(sandboxWsbPath),
    sharedDir: path.basename(sandboxSharedDir),
    launchCommand: `WindowsSandbox.exe "${path.basename(sandboxWsbPath)}"`
  }
  report.checks.push({ id: 'sandbox-files', status: 'passed', detail: 'Sandbox config and smoke script generated.' })
}

function sandboxConfig() {
  const hostFolder = escapeXml(sandboxSharedDir)
  const command = 'powershell.exe -ExecutionPolicy Bypass -File C:\\Users\\WDAGUtilityAccount\\Desktop\\package-smoke\\run-package-smoke.ps1'
  return `<?xml version="1.0" encoding="UTF-8"?>
<Configuration>
  <VGpu>Disable</VGpu>
  <MappedFolders>
    <MappedFolder>
      <HostFolder>${hostFolder}</HostFolder>
      <SandboxFolder>C:\\Users\\WDAGUtilityAccount\\Desktop\\package-smoke</SandboxFolder>
      <ReadOnly>false</ReadOnly>
    </MappedFolder>
  </MappedFolders>
  <LogonCommand>
    <Command>${escapeXml(command)}</Command>
  </LogonCommand>
</Configuration>
`
}

function sandboxScript() {
  const sandboxInstallBlock = sandboxInstall
    ? `
if (Test-Path $installer) {
  $installParent = Join-Path $root 'install-parent'
  $expectedInstallDir = Join-Path $installParent '${productName}'
  Remove-Item -LiteralPath $installParent -Recurse -Force -ErrorAction SilentlyContinue
  New-Item -ItemType Directory -Force -Path $installParent | Out-Null
  $installerProcess = Start-Process -FilePath $installer -ArgumentList @('/S', ('/D=' + $installParent)) -PassThru -WindowStyle Hidden
  if ($installerProcess.WaitForExit(${sandboxInstallTimeoutMs})) {
    Add-Check 'installer-run' ($(if ($installerProcess.ExitCode -eq 0) { 'passed' } else { 'failed' })) ('Installer exited with code ' + $installerProcess.ExitCode)
    Add-Check 'installer-subfolder' ($(if (Test-Path $expectedInstallDir) { 'passed' } else { 'failed' })) 'Installer used the normalized product subfolder.'
    Add-Check 'installed-exe' ($(if (Test-Path (Join-Path $expectedInstallDir '${productName}.exe')) { 'passed' } else { 'failed' })) 'Installed executable exists under the normalized product subfolder.'
    if ($installerProcess.ExitCode -eq 0 -and (Test-Path (Join-Path $expectedInstallDir '${productName}.exe'))) {
      Test-OrdinaryHost (Join-Path $expectedInstallDir '${productName}.exe') 'installed-launch'
    }
  } else {
    Stop-Process -Id $installerProcess.Id -Force -ErrorAction SilentlyContinue
    Add-Check 'installer-run' 'failed' 'Installer exceeded the ${sandboxInstallTimeoutMs} ms timeout.'
  }
}
`
    : ''
  return `$ErrorActionPreference = 'Stop'
$root = 'C:\\Users\\WDAGUtilityAccount\\Desktop\\package-smoke'
$report = Join-Path $root 'sandbox-report.json'
$reportTemp = Join-Path $root 'sandbox-report.json.tmp'
$installer = Join-Path $root '${path.basename(artifactPlan.installerPath)}'
$unpacked = Join-Path $root '${artifactPlan.sandboxUnpackedDir}\\${productName}.exe'
$checks = @()

function Write-Report([bool]$completed = $false) {
  [pscustomobject]@{
    generatedAt = (Get-Date).ToString('o')
    completed = $completed
    checks = $script:checks
  } | ConvertTo-Json -Depth 5 | Set-Content -Path $reportTemp -Encoding UTF8
  Move-Item -LiteralPath $reportTemp -Destination $report -Force
}

function Add-Check($id, $status, $detail) {
  $script:checks += [pscustomobject]@{ id = $id; status = $status; detail = $detail }
  Write-Report $false
}

function Test-OrdinaryHost($binary, $checkId) {
  $profile = Join-Path $root ('ordinary-profile-' + [guid]::NewGuid().ToString('N'))
  New-Item -ItemType Directory -Path $profile | Out-Null
  $p = $null
  $ready = $false
  $exited = $false
  try {
    $p = Start-Process -FilePath $binary -ArgumentList @('--dam-browser', ('"--dam-profile=' + $profile + '"')) -PassThru -WindowStyle Hidden
    $deadline = (Get-Date).AddMilliseconds(${launchTimeoutMs})
    while (-not $p.HasExited -and (Get-Date) -lt $deadline) {
      try {
        $receipt = Get-Content -LiteralPath (Join-Path $profile 'host-startup.json') -Raw | ConvertFrom-Json
        $origin = [uri]$receipt.origin
        if ($receipt.schema -ne 1 -or $receipt.pid -ne $p.Id -or $origin.Scheme -ne 'http' -or $origin.Host -ne '127.0.0.1' -or $origin.Port -le 0 -or $origin.AbsolutePath -ne '/' -or $origin.Query -or $origin.Fragment -or $origin.UserInfo) { throw 'STARTUP_RECEIPT_INVALID' }
        $health = Invoke-RestMethod -Uri ($receipt.origin + '/api/health') -TimeoutSec 2 -MaximumRedirection 0
        if ($health.schema -eq 1 -and $health.state -eq 'ready' -and $health.buildId -eq $receipt.buildId -and $health.platform -eq $receipt.platform -and $health.arch -eq $receipt.arch -and $health.version -eq $receipt.version) { $ready = $true; break }
      } catch {}
      Start-Sleep -Milliseconds 250
    }
  } finally {
    if ($p) {
      if (-not $p.HasExited) { Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue }
      $exited = $p.WaitForExit(5000)
    }
    # Only remove the fresh owned empty profile after confirmed process exit.
    $resolvedProfile = [System.IO.Path]::GetFullPath($profile)
    if ($exited -and [System.IO.Path]::GetDirectoryName($resolvedProfile) -eq [System.IO.Path]::GetFullPath($root)) {
      Remove-Item -LiteralPath $resolvedProfile -Recurse -Force
    }
  }
  Add-Check $checkId ($(if ($ready -and $exited) { 'passed' } else { 'failed' })) 'Ordinary Host health and confirmed process exit; no UI/model/upgrade acceptance.'
}

try {
  Add-Check 'installer-present' ($(if (Test-Path $installer) { 'passed' } else { 'failed' })) 'Installer presence check.'
  Add-Check 'unpacked-present' ($(if (Test-Path $unpacked) { 'passed' } else { 'failed' })) 'Unpacked executable presence check.'

  if (Test-Path $unpacked) {
    Test-OrdinaryHost $unpacked 'unpacked-launch'
  }

  if (Test-Path $installer) {
    $hash = (Get-FileHash $installer -Algorithm SHA256).Hash
    $sig = Get-AuthenticodeSignature $installer
    Add-Check 'installer-hash' 'passed' $hash
    Add-Check 'installer-signature' ($(if ($sig.Status -eq 'Valid') { 'passed' } else { 'warning' })) $sig.Status.ToString()
  }
${sandboxInstallBlock}
} catch {
  Add-Check 'sandbox-script' 'failed' $_.Exception.Message
} finally {
  Write-Report $true
}
`
}

async function runStep(id, command, stepArgs, options = {}) {
  if (options.allowMissing === false && !(await commandExists(command))) {
    report.checks.push({ id, status: 'failed', detail: `${command} is not available.` })
    process.exitCode = 1
    return
  }

  const exitCode = await new Promise((resolve) => {
    const child = spawn(command, stepArgs, {
      cwd: root,
      env: options.env ?? process.env,
      shell: false,
      stdio: 'inherit'
    })
    child.on('error', () => resolve(127))
    child.on('close', resolve)
  })
  report.checks.push({
    id,
    status: exitCode === 0 ? 'passed' : 'failed',
    detail: `${command} ${stepArgs.join(' ')} exited with ${exitCode}.`
  })
  if (exitCode !== 0) process.exitCode = Number(exitCode) || 1
}

async function runCaptured(command, stepArgs) {
  return new Promise((resolve) => {
    const child = spawn(command, stepArgs, {
      cwd: root,
      env: process.env,
      shell: false,
      stdio: 'ignore'
    })
    child.on('error', () => resolve(127))
    child.on('close', (code) => resolve(code ?? 1))
  })
}

async function commandExists(command) {
  if (command.includes(path.sep) || command.includes('/')) return exists(command)
  const pathEntries = (process.env.PATH ?? '').split(path.delimiter)
  const extensions = hostDefaults.pathExecutableExtensions
  for (const entry of pathEntries) {
    for (const ext of extensions) {
      if (await exists(path.join(entry, command.endsWith(ext) ? command : `${command}${ext}`))) {
        return true
      }
    }
  }
  return false
}

async function sha256(filePath) {
  const hash = crypto.createHash('sha256')
  const handle = await fs.open(filePath, 'r')
  try {
    for await (const chunk of handle.createReadStream()) {
      hash.update(chunk)
    }
  } finally {
    await handle.close()
  }
  return hash.digest('hex').toUpperCase()
}

async function getAuthenticodeStatus(filePath) {
  if (!hostDefaults.authenticodeAvailable) return 'skipped-non-windows'
  const script = `Get-AuthenticodeSignature -LiteralPath '${filePath.replace(/'/g, "''")}' | Select-Object -ExpandProperty Status`
  return new Promise((resolve) => {
    const child = spawn('powershell.exe', ['-NoProfile', '-Command', script], {
      shell: false,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'ignore']
    })
    let stdout = ''
    child.stdout.on('data', (chunk) => { stdout += chunk.toString() })
    child.on('close', () => resolve(stdout.trim() || 'unknown'))
    child.on('error', () => resolve('unknown'))
  })
}

async function exists(filePath) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

async function copyDir(source, target) {
  await fs.rm(target, { recursive: true, force: true })
  await fs.mkdir(target, { recursive: true })
  const entries = await fs.readdir(source, { withFileTypes: true })
  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name)
    const targetPath = path.join(target, entry.name)
    if (entry.isDirectory()) {
      await copyDir(sourcePath, targetPath)
    } else if (entry.isFile()) {
      await fs.copyFile(sourcePath, targetPath)
    }
  }
}

function escapeXml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
