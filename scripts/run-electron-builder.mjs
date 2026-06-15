import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const options = parseArgs(process.argv.slice(2))
const platform = requireChoice(options.platform, ['win', 'mac'], '--platform')
const mode = requireChoice(options.mode, ['dir', 'dist'], '--mode')
const electronPackagePath = path.join(root, 'node_modules', 'electron', 'package.json')
const electronDist = path.join(root, 'node_modules', 'electron', 'dist')
const builderCli = path.join(root, 'node_modules', 'electron-builder', 'out', 'cli', 'cli.js')
const electronPackage = JSON.parse(await fs.readFile(electronPackagePath, 'utf8'))

await assertDirectory(electronDist, 'Installed Electron distribution')
await assertFile(builderCli, 'electron-builder CLI')

const builderArgs = [
  builderCli,
  platform === 'win' ? '--win' : '--mac'
]
if (options.target) builderArgs.push(options.target)
if (mode === 'dir') builderArgs.push('--dir')
builderArgs.push(
  `--config.electronDist=${electronDist}`,
  `--config.electronVersion=${electronPackage.version}`,
  '--publish',
  'never'
)
if (platform === 'mac') builderArgs.push('--config.mac.identity=null')
builderArgs.push(...options.passthrough)

if (options.dryRun) {
  console.log(JSON.stringify({
    platform,
    mode,
    electronVersion: electronPackage.version,
    usesLocalElectronDist: true,
    signing: 'disabled',
    publishing: 'disabled',
    args: builderArgs.slice(1).map(redactRoot)
  }))
  process.exit(0)
}

const exitCode = await new Promise((resolve) => {
  const child = spawn(process.execPath, builderArgs, {
    cwd: root,
    env: createBuilderEnv(),
    shell: false,
    stdio: 'inherit'
  })
  child.on('error', () => resolve(127))
  child.on('close', (code) => resolve(code ?? 1))
})
process.exitCode = exitCode

function parseArgs(args) {
  const parsed = {
    platform: undefined,
    mode: undefined,
    target: undefined,
    dryRun: false,
    passthrough: []
  }
  for (const arg of args) {
    if (arg === '--dry-run') {
      parsed.dryRun = true
    } else if (arg.startsWith('--platform=')) {
      parsed.platform = arg.slice('--platform='.length)
    } else if (arg.startsWith('--mode=')) {
      parsed.mode = arg.slice('--mode='.length)
    } else if (arg.startsWith('--target=')) {
      parsed.target = arg.slice('--target='.length)
    } else {
      parsed.passthrough.push(arg)
    }
  }
  return parsed
}

function requireChoice(value, choices, flag) {
  if (!choices.includes(value)) {
    throw new Error(`${flag} must be one of: ${choices.join(', ')}`)
  }
  return value
}

function createBuilderEnv() {
  const env = {
    ...process.env,
    NO_PROXY: '*',
    no_proxy: '*',
    CSC_IDENTITY_AUTO_DISCOVERY: 'false'
  }
  for (const key of [
    'HTTP_PROXY',
    'HTTPS_PROXY',
    'ALL_PROXY',
    'http_proxy',
    'https_proxy',
    'all_proxy'
  ]) {
    delete env[key]
  }
  return env
}

function redactRoot(value) {
  return value.replaceAll(root, '<REPO_ROOT>')
}

async function assertDirectory(target, label) {
  const stat = await fs.stat(target)
  if (!stat.isDirectory()) throw new Error(`${label} is not a directory.`)
}

async function assertFile(target, label) {
  const stat = await fs.stat(target)
  if (!stat.isFile()) throw new Error(`${label} is not a file.`)
}
