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

async function findDmgFile() {
  try {
    const files = await fs.readdir(distDir)
    for (const f of files) {
      if (f.endsWith('.dmg')) {
        return path.join(distDir, f)
      }
    }
  } catch {}
  return null
}

async function findUnpackedBinary() {
  if (process.platform === 'win32') {
    const candidates = [
      path.join(distDir, 'win-unpacked', 'Design Asset Manager.exe'),
      path.join(distDir, 'win-arm64-unpacked', 'Design Asset Manager.exe')
    ]
    for (const c of candidates) {
      if (await exists(c)) return c
    }
    return null
  } else if (process.platform === 'darwin') {
    try {
      const subdirs = await fs.readdir(distDir, { withFileTypes: true })
      for (const entry of subdirs) {
        if (entry.isDirectory() && entry.name.startsWith('mac')) {
          const appPath = path.join(distDir, entry.name, 'Design Asset Manager.app')
          const binaryPath = path.join(appPath, 'Contents', 'MacOS', 'Design Asset Manager')
          if (await exists(binaryPath)) {
            return binaryPath
          }
        }
      }
    } catch {}
    const fallbacks = [
      path.join(distDir, 'mac', 'Design Asset Manager.app', 'Contents', 'MacOS', 'Design Asset Manager'),
      path.join(distDir, 'mac-arm64', 'Design Asset Manager.app', 'Contents', 'MacOS', 'Design Asset Manager')
    ]
    for (const f of fallbacks) {
      if (await exists(f)) return f
    }
    return null
  }
  return null
}

const activeInstaller = process.platform === 'win32'
  ? installerPath
  : (await findDmgFile() || path.join(distDir, 'Design Asset Manager-1.0.0-arm64.dmg'))

const activeUnpacked = process.platform === 'win32'
  ? unpackedExe
  : (await findUnpackedBinary() || path.join(distDir, 'mac-arm64', 'Design Asset Manager.app'))

await checkFile('installer', activeInstaller)
if (process.platform === 'win32') {
  await checkFile('winUnpackedExe', activeUnpacked)
} else {
  await checkFile('macUnpackedApp', activeUnpacked)
}

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
  const binaryPath = await findUnpackedBinary()
  if (!binaryPath) {
    report.checks.push({ id: 'launch-unpacked', status: 'failed', detail: 'Unpacked executable binary is missing.' })
    process.exitCode = 1
    return
  }

  console.log(`Found unpacked binary to launch: ${binaryPath}`)

  const sandboxHome = path.join(distDir, 'temp-smoke-home')
  await fs.rm(sandboxHome, { recursive: true, force: true }).catch(() => {})
  await fs.mkdir(sandboxHome, { recursive: true })

  const customEnv = {
    ...process.env,
    HOME: sandboxHome,
    USERPROFILE: sandboxHome,
    APPDATA: path.join(sandboxHome, 'AppData', 'Roaming'),
    LOCALAPPDATA: path.join(sandboxHome, 'AppData', 'Local')
  }

  const passed = await new Promise((resolve) => {
    const child = spawn(binaryPath, ['--no-sandbox', '--disable-gpu'], {
      cwd: path.dirname(binaryPath),
      shell: false,
      windowsHide: true,
      env: customEnv
    })

    let stdoutBuffer = ''
    let stderrBuffer = ''
    child.stdout.on('data', (data) => {
      stdoutBuffer += data.toString()
    })
    child.stderr.on('data', (data) => {
      stderrBuffer += data.toString()
    })

    const checkOutputs = () => {
      const fullLog = stdoutBuffer + '\n' + stderrBuffer
      const hasDbLog = fullLog.includes('[SQLite] Database successfully loaded.') || fullLog.includes('Database successfully loaded.')
      const hasPyLog = fullLog.includes('[resolvePythonExecutable]') || fullLog.includes('resolvePythonExecutable')
      return { hasDbLog, hasPyLog, fullLog }
    }

    let resolved = false
    const timer = setTimeout(() => {
      if (resolved) return
      resolved = true
      const running = child.exitCode === null
      if (running) {
        child.kill()
      }
      const { hasDbLog, hasPyLog, fullLog } = checkOutputs()
      console.log('--- Smoke Test App Log Output ---')
      console.log(fullLog)
      console.log('---------------------------------')
      resolve(hasDbLog && hasPyLog)
    }, launchTimeoutMs)

    child.on('error', (err) => {
      if (resolved) return
      resolved = true
      clearTimeout(timer)
      console.error('Failed to spawn app process:', err)
      resolve(false)
    })

    child.on('exit', (code) => {
      if (resolved) return
      resolved = true
      clearTimeout(timer)
      const { hasDbLog, hasPyLog, fullLog } = checkOutputs()
      console.log('--- Smoke Test App Log Output (Exited Early) ---')
      console.log(fullLog)
      console.log('------------------------------------------------')
      resolve(hasDbLog && hasPyLog && code === 0)
    })
  })

  report.checks.push({
    id: 'launch-unpacked',
    status: passed ? 'passed' : 'failed',
    detail: passed
      ? `Process stayed alive, loaded SQLite database, and resolved python executable.`
      : `App failed smoke checks. Check stdout/stderr logs for details.`
  })

  await fs.rm(sandboxHome, { recursive: true, force: true }).catch(() => {})

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
