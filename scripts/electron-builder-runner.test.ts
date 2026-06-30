import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'

const winPlan = await dryRun(['--platform=win', '--mode=dist', '--target=nsis', '--x64'])
assert.equal(winPlan.platform, 'win')
assert.equal(winPlan.mode, 'dist')
assert.equal(winPlan.usesLocalElectronDist, true)
assert.equal(winPlan.signing, 'disabled')
assert.equal(winPlan.signingCredentialEnvironment, 'scrubbed')
assert.equal(winPlan.publishing, 'disabled')
assert.ok(winPlan.args.includes('--win'))
assert.ok(winPlan.args.includes('nsis'))
assert.ok(winPlan.args.includes('--x64'))
assert.ok(winPlan.args.some((arg: string) => arg.includes('electronDist=<REPO_ROOT>')))
assert.equal(JSON.stringify(winPlan).includes(process.cwd()), false)

const macPlan = await dryRun(['--platform=mac', '--mode=dir', '--target=dmg', '--arm64'])
assert.equal(macPlan.platform, 'mac')
assert.ok(macPlan.args.includes('--mac'))
assert.ok(macPlan.args.includes('--dir'))
assert.ok(macPlan.args.includes('--config.mac.identity=null'))
assert.ok(macPlan.args.includes('--publish'))
assert.ok(macPlan.args.includes('never'))

const signedMacPlan = await dryRun(
  ['--platform=mac', '--mode=dist', '--target=dmg', '--arm64', '--signing=required'],
  {
    DAM_RELEASE_SIGNING_APPROVED: 'true',
    CSC_LINK: 'fixture-certificate',
    CSC_KEY_PASSWORD: 'fixture-password',
    APPLE_ID: 'fixture@example.invalid',
    APPLE_APP_SPECIFIC_PASSWORD: 'fixture-app-password',
    APPLE_TEAM_ID: 'FIXTURETEAM',
    DAM_MAC_SIGNING_IDENTITY: 'Developer ID Application'
  }
)
assert.equal(signedMacPlan.signing, 'required')
assert.equal(signedMacPlan.signingCredentialEnvironment, 'required')
assert.ok(signedMacPlan.args.includes('--config.mac.identity=Developer ID Application'))
assert.equal(signedMacPlan.args.includes('--config.mac.identity=null'), false)
assert.equal(JSON.stringify(signedMacPlan).includes('fixture-password'), false)

await assert.rejects(
  dryRun(['--platform=win', '--mode=dist', '--x64', '--signing=required']),
  /DAM_RELEASE_SIGNING_APPROVED=true/
)
await assert.rejects(
  dryRun(['--platform=win', '--mode=dist', '--publish=always']),
  /Protected electron-builder option/
)
await assert.rejects(
  dryRun(['--platform=mac', '--mode=dist', '--config.mac.identity=Ad Hoc']),
  /Protected electron-builder option/
)

const source = await fs.readFile('scripts/run-electron-builder.mjs', 'utf8')
assert.match(source, /node_modules.*electron.*dist/)
assert.match(source, /electronPackage\.version/)
assert.match(source, /delete env\[key\]/)
assert.match(source, /listElectronBuilderSigningEnvKeys/)
assert.match(source, /getElectronBuilderPlatformOptions/)
assert.match(source, /DAM_RELEASE_SIGNING_APPROVED/)
assert.doesNotMatch(source, /30\.5\.1/)

async function dryRun(args: string[], env: NodeJS.ProcessEnv = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['scripts/run-electron-builder.mjs', ...args, '--dry-run'], {
      cwd: process.cwd(),
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe']
    })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => { stdout += chunk.toString() })
    child.stderr.on('data', (chunk) => { stderr += chunk.toString() })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `runner exited with ${code}`))
        return
      }
      resolve(JSON.parse(stdout))
    })
  })
}
