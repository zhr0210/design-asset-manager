import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'

const args = new Set(process.argv.slice(2))
const buildInstaller = args.has('--build')
const launchUnpacked = args.has('--launch-unpacked')
const sandboxInstall = args.has('--sandbox-install')
const generateSandbox = args.has('--sandbox') || args.has('--generate-sandbox') || sandboxInstall
const openSandbox = args.has('--open-sandbox')
const timeoutArg = process.argv.find((arg) => arg.startsWith('--timeout-ms='))
const launchTimeoutMs = timeoutArg ? Number(timeoutArg.replace('--timeout-ms=', '')) : 8000

const root = process.cwd()
const distDir = path.join(root, 'dist-packages')
const installerPath = path.join(distDir, 'Design Asset Manager Setup 1.0.0.exe')
const unpackedExe = path.join(distDir, 'win-unpacked', 'Design Asset Manager.exe')
const workRootArg = process.argv.find((arg) => arg.startsWith('--work-root='))
const workRoot = path.resolve(workRootArg?.replace('--work-root=', '') || 'G:\\codex\\DesignAssetManagerPackageSmoke')
const sandboxDir = path.join(workRoot, 'sandbox')
const sandboxSharedDir = path.join(sandboxDir, 'shared')
const sandboxWsbPath = path.join(sandboxDir, 'DesignAssetManagerPackageSmoke.wsb')
const sandboxScriptPath = path.join(sandboxSharedDir, 'run-package-smoke.ps1')

const report = {
  generatedAt: new Date().toISOString(),
  checks: [],
  artifacts: {}
}

if (buildInstaller) {
  await runStep('build:renderer-main-preload', process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build'], {
    env: safeBuilderEnv()
  })
  await runStep('build:windows-installer', process.platform === 'win32' ? 'npx.cmd' : 'npx', [
    'electron-builder',
    '--win',
    '--config.electronDist=node_modules/electron/dist',
    '--config.electronVersion=30.5.1'
  ], {
    env: safeBuilderEnv()
  })
}

await checkFile('installer', installerPath)
await checkFile('winUnpackedExe', unpackedExe)

if (await exists(installerPath)) {
  report.artifacts.installer = {
    fileName: path.basename(installerPath),
    sizeBytes: (await fs.stat(installerPath)).size,
    sha256: await sha256(installerPath),
    signed: await getAuthenticodeStatus(installerPath)
  }
}

if (await exists(path.join(installerPath + '.blockmap'))) {
  report.artifacts.blockmap = {
    fileName: path.basename(installerPath + '.blockmap'),
    sizeBytes: (await fs.stat(installerPath + '.blockmap')).size
  }
}

if (launchUnpacked) {
  await smokeLaunchUnpacked()
}

if (generateSandbox || openSandbox) {
  await generateSandboxFiles()
}

if (openSandbox) {
  await runStep('open:windows-sandbox', 'WindowsSandbox.exe', [sandboxWsbPath], { allowMissing: false })
}

console.log(JSON.stringify(report, null, 2))

function safeBuilderEnv() {
  return {
    ...process.env,
    NO_PROXY: '*',
    no_proxy: '*',
    HTTP_PROXY: '',
    HTTPS_PROXY: '',
    ALL_PROXY: '',
    http_proxy: '',
    https_proxy: '',
    all_proxy: ''
  }
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
  if (process.platform !== 'win32') {
    report.checks.push({ id: 'launch-unpacked', status: 'skipped', detail: 'Windows-only smoke launch.' })
    return
  }
  if (!(await exists(unpackedExe))) {
    report.checks.push({ id: 'launch-unpacked', status: 'failed', detail: 'win-unpacked executable is missing.' })
    process.exitCode = 1
    return
  }

  const result = await new Promise((resolve) => {
    const child = spawn(unpackedExe, ['--no-sandbox', '--disable-gpu'], {
      cwd: path.dirname(unpackedExe),
      shell: false,
      windowsHide: true,
      stdio: 'ignore'
    })
    const timer = setTimeout(() => {
      const running = child.exitCode === null
      if (running) {
        child.kill()
      }
      resolve({ runningAfterTimeout: running, exitCode: child.exitCode })
    }, launchTimeoutMs)
    child.on('error', (error) => {
      clearTimeout(timer)
      resolve({ runningAfterTimeout: false, error: error.message })
    })
    child.on('exit', (code) => {
      clearTimeout(timer)
      resolve({ runningAfterTimeout: false, exitCode: code })
    })
  })

  const passed = Boolean(result.runningAfterTimeout)
  report.checks.push({
    id: 'launch-unpacked',
    status: passed ? 'passed' : 'failed',
    detail: passed ? `Process stayed alive for ${launchTimeoutMs}ms.` : `Process exited early: ${JSON.stringify(result)}`
  })
  if (!passed) process.exitCode = 1
}

async function generateSandboxFiles() {
  if (process.platform !== 'win32') {
    report.checks.push({ id: 'sandbox-files', status: 'skipped', detail: 'Windows Sandbox config is Windows-only.' })
    return
  }

  await fs.mkdir(sandboxSharedDir, { recursive: true })
  const sandboxInstallerPath = path.join(sandboxSharedDir, path.basename(installerPath))
  const sandboxUnpackedDir = path.join(sandboxSharedDir, 'win-unpacked')

  if (await exists(installerPath)) {
    await fs.copyFile(installerPath, sandboxInstallerPath)
  }
  if (await exists(path.join(installerPath + '.blockmap'))) {
    await fs.copyFile(path.join(installerPath + '.blockmap'), path.join(sandboxSharedDir, path.basename(installerPath + '.blockmap')))
  }
  if (await exists(path.dirname(unpackedExe))) {
    await copyDir(path.dirname(unpackedExe), sandboxUnpackedDir)
  }

  await fs.writeFile(sandboxScriptPath, sandboxScript(), 'utf8')
  await fs.writeFile(sandboxWsbPath, sandboxConfig(), 'utf8')
  report.artifacts.sandbox = {
    workRoot,
    config: sandboxWsbPath,
    sharedDir: sandboxSharedDir,
    launchCommand: `WindowsSandbox.exe "${sandboxWsbPath}"`
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
  $expectedInstallDir = Join-Path $installParent 'Design Asset Manager'
  Remove-Item -LiteralPath $installParent -Recurse -Force -ErrorAction SilentlyContinue
  New-Item -ItemType Directory -Force -Path $installParent | Out-Null
  $installerProcess = Start-Process -FilePath $installer -ArgumentList @('/S', ('/D=' + $installParent)) -PassThru -Wait
  Add-Check 'installer-run' ($(if ($installerProcess.ExitCode -eq 0) { 'passed' } else { 'failed' })) ('Installer exited with code ' + $installerProcess.ExitCode)
  Add-Check 'installer-subfolder' ($(if (Test-Path $expectedInstallDir) { 'passed' } else { 'failed' })) $expectedInstallDir
  Add-Check 'installed-exe' ($(if (Test-Path (Join-Path $expectedInstallDir 'Design Asset Manager.exe')) { 'passed' } else { 'failed' })) 'Installed executable under normalized subfolder.'
}
`
    : ''
  return `$ErrorActionPreference = 'Stop'
Start-Sleep -Seconds 15
$root = 'C:\\Users\\WDAGUtilityAccount\\Desktop\\package-smoke'
$report = Join-Path $root 'sandbox-report.json'
$installer = Join-Path $root '${path.basename(installerPath)}'
$unpacked = Join-Path $root 'win-unpacked\\Design Asset Manager.exe'
$checks = @()

function Add-Check($id, $status, $detail) {
  $script:checks += [pscustomobject]@{ id = $id; status = $status; detail = $detail }
}

Add-Check 'installer-present' ($(if (Test-Path $installer) { 'passed' } else { 'failed' })) 'Installer presence check.'
Add-Check 'unpacked-present' ($(if (Test-Path $unpacked) { 'passed' } else { 'failed' })) 'Unpacked executable presence check.'

if (Test-Path $unpacked) {
  $p = Start-Process -FilePath $unpacked -ArgumentList @('--no-sandbox','--disable-gpu') -PassThru -WindowStyle Hidden
  Start-Sleep -Seconds 8
  if (-not $p.HasExited) {
    Stop-Process -Id $p.Id -Force
    Add-Check 'unpacked-launch' 'passed' 'Unpacked app stayed alive for 8 seconds.'
  } else {
    Add-Check 'unpacked-launch' 'failed' ('Unpacked app exited early with code ' + $p.ExitCode)
  }
}

if (Test-Path $installer) {
  $hash = (Get-FileHash $installer -Algorithm SHA256).Hash
  $sig = Get-AuthenticodeSignature $installer
  Add-Check 'installer-hash' 'passed' $hash
  Add-Check 'installer-signature' ($(if ($sig.Status -eq 'Valid') { 'passed' } else { 'warning' })) $sig.Status
}
${sandboxInstallBlock}

[pscustomobject]@{
  generatedAt = (Get-Date).ToString('o')
  checks = $checks
} | ConvertTo-Json -Depth 5 | Set-Content -Path $report -Encoding UTF8
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

async function commandExists(command) {
  if (command.includes(path.sep) || command.includes('/')) return exists(command)
  const pathEntries = (process.env.PATH ?? '').split(path.delimiter)
  const extensions = process.platform === 'win32' ? ['.exe', '.cmd', '.bat', ''] : ['']
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
  if (process.platform !== 'win32') return 'skipped-non-windows'
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
