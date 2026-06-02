import { spawn } from 'node:child_process'

const child = spawn(process.execPath, ['scripts/doctor-check.mjs', '--json'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    CI: process.env.CI ?? 'true',
    DAM_CI_SAFE: process.env.DAM_CI_SAFE ?? 'true',
    DAM_DISABLE_MODEL_DOWNLOADS: process.env.DAM_DISABLE_MODEL_DOWNLOADS ?? 'true',
    DAM_DISABLE_RUNTIME_DOWNLOADS: process.env.DAM_DISABLE_RUNTIME_DOWNLOADS ?? 'true',
    DAM_DISABLE_REAL_AI_WORKER: process.env.DAM_DISABLE_REAL_AI_WORKER ?? 'true',
    DAM_DISABLE_EXTERNAL_INFERENCE: process.env.DAM_DISABLE_EXTERNAL_INFERENCE ?? 'true'
  },
  stdio: ['ignore', 'pipe', 'inherit']
})

let stdout = ''
child.stdout.setEncoding('utf8')
child.stdout.on('data', (chunk) => {
  stdout += chunk
})

const exitCode = await new Promise((resolve) => {
  child.on('close', resolve)
})

if (exitCode !== 0) {
  process.exit(Number(exitCode) || 1)
}

let report
try {
  report = JSON.parse(stdout)
} catch (error) {
  console.error('Doctor CI check could not parse doctor JSON output.')
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}

const checks = Array.isArray(report.checks) ? report.checks : []
const errors = checks.filter((check) => check?.status === 'error')

console.log(`Doctor CI ${String(report.overallStatus).toUpperCase()} ${report.platform}/${report.arch} ${report.profile}`)
for (const check of checks) {
  console.log(`[${check.status}] ${check.id}: ${check.message}`)
}

if (errors.length > 0) {
  console.error(`Doctor CI failed because ${errors.length} check(s) reported error.`)
  process.exit(1)
}
