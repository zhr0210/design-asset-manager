import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'

const args = new Set(process.argv.slice(2))
const clean = args.has('--clean')
const platformArg = process.argv.find((arg) => arg.startsWith('--platform='))
const requestedPlatform = platformArg?.replace('--platform=', '') || process.platform

const startedAt = Date.now()
const summary = []
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'

const verifyEnv = {
  ...process.env,
  CI: process.env.CI ?? 'true',
  DAM_CI_SAFE: process.env.DAM_CI_SAFE ?? 'true',
  DAM_DISABLE_MODEL_DOWNLOADS: process.env.DAM_DISABLE_MODEL_DOWNLOADS ?? 'true',
  DAM_DISABLE_RUNTIME_DOWNLOADS: process.env.DAM_DISABLE_RUNTIME_DOWNLOADS ?? 'true',
  DAM_DISABLE_REAL_AI_WORKER: process.env.DAM_DISABLE_REAL_AI_WORKER ?? 'true',
  DAM_DISABLE_EXTERNAL_INFERENCE: process.env.DAM_DISABLE_EXTERNAL_INFERENCE ?? 'true'
}

if (clean) {
  await cleanTempArtifacts()
}

for (const commandLine of [
  `${npmCommand} run ci:governance`,
  `${npmCommand} run typecheck`,
  `${npmCommand} run build`
]) {
  await runStep(commandLine)
}

console.log('')
console.log(`Platform verification summary for ${requestedPlatform}`)
for (const item of summary) {
  console.log(`[${item.status}] ${item.command} (${item.durationMs}ms)`)
}
console.log(`Completed in ${Date.now() - startedAt}ms`)

async function runStep(commandLine) {
  const label = commandLine
  const stepStarted = Date.now()
  console.log(`Running ${label}`)

  const exitCode = await new Promise((resolve) => {
    const child = spawn(commandLine, {
      cwd: process.cwd(),
      env: verifyEnv,
      shell: true,
      stdio: 'inherit'
    })
    child.on('close', resolve)
  })

  const durationMs = Date.now() - stepStarted
  if (exitCode !== 0) {
    summary.push({ command: label, durationMs, status: 'failed' })
    console.error(`Verification failed at ${label}`)
    process.exit(Number(exitCode) || 1)
  }
  summary.push({ command: label, durationMs, status: 'passed' })
}

async function cleanTempArtifacts() {
  const distTemp = path.resolve('dist-temp')
  const allowedEntries = ['doctor', 'platform-tests', 'settings-migration-tests', 'tests']

  for (const entry of allowedEntries) {
    await fs.rm(path.join(distTemp, entry), { recursive: true, force: true })
  }
}
