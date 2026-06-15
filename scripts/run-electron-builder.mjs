import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'

const SIGNING_ENV_KEYS = [
  'CSC_LINK',
  'CSC_NAME',
  'CSC_KEY_PASSWORD',
  'WIN_CSC_LINK',
  'WIN_CSC_NAME',
  'WIN_CSC_KEY_PASSWORD',
  'APPLE_ID',
  'APPLE_APP_SPECIFIC_PASSWORD',
  'APPLE_TEAM_ID',
  'DAM_MAC_SIGNING_IDENTITY'
]

const root = process.cwd()
const options = parseArgs(process.argv.slice(2))
const platform = requireChoice(options.platform, ['win', 'mac'], '--platform')
const mode = requireChoice(options.mode, ['dir', 'dist'], '--mode')
const signing = requireChoice(options.signing, ['disabled', 'required'], '--signing')
assertSafePassthrough(options.passthrough)
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
if (signing === 'required') {
  assertSigningApproval(platform)
  if (platform === 'mac') {
    builderArgs.push(`--config.mac.identity=${process.env.DAM_MAC_SIGNING_IDENTITY}`)
  }
} else if (platform === 'mac') {
  builderArgs.push('--config.mac.identity=null')
}
builderArgs.push(...options.passthrough)

if (options.dryRun) {
  console.log(JSON.stringify({
    platform,
    mode,
    electronVersion: electronPackage.version,
    usesLocalElectronDist: true,
    signing,
    signingCredentialEnvironment: signing === 'required' ? 'required' : 'scrubbed',
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
    signing: 'disabled',
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
    } else if (arg.startsWith('--signing=')) {
      parsed.signing = arg.slice('--signing='.length)
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
    no_proxy: '*'
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
  if (signing === 'disabled') {
    env.CSC_IDENTITY_AUTO_DISCOVERY = 'false'
    for (const key of SIGNING_ENV_KEYS) delete env[key]
  } else {
    delete env.CSC_IDENTITY_AUTO_DISCOVERY
  }
  return env
}

function assertSigningApproval(targetPlatform) {
  if (process.env.DAM_RELEASE_SIGNING_APPROVED !== 'true') {
    throw new Error('Signed packaging requires DAM_RELEASE_SIGNING_APPROVED=true.')
  }
  const required = targetPlatform === 'win'
    ? ['CSC_LINK', 'CSC_KEY_PASSWORD']
    : [
        'CSC_LINK',
        'CSC_KEY_PASSWORD',
        'APPLE_ID',
        'APPLE_APP_SPECIFIC_PASSWORD',
        'APPLE_TEAM_ID',
        'DAM_MAC_SIGNING_IDENTITY'
      ]
  const missing = required.filter((key) => !process.env[key])
  if (missing.length > 0) {
    throw new Error(`Signed ${targetPlatform} packaging is missing required environment variables: ${missing.join(', ')}.`)
  }
}

function assertSafePassthrough(args) {
  const protectedPrefixes = [
    '--publish',
    '-p',
    '--config.publish',
    '--config.electronDist',
    '--config.electronVersion',
    '--config.afterSign',
    '--config.forceCodeSigning',
    '--config.mac.identity',
    '--config.win.sign'
  ]
  const blocked = args.find((arg) => protectedPrefixes.some((prefix) => (
    arg === prefix || arg.startsWith(`${prefix}=`)
  )))
  if (blocked) {
    throw new Error(`Protected electron-builder option cannot be passed through: ${blocked}`)
  }
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
