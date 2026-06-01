import { build } from 'esbuild'
import { pathToFileURL } from 'url'
import path from 'path'
import fs from 'fs/promises'

const args = new Set(process.argv.slice(2))
const json = args.has('--json')
const checkArg = process.argv.find((arg) => arg.startsWith('--checks='))
const checkIds = checkArg
  ? checkArg.replace('--checks=', '').split(',').map((item) => item.trim()).filter(Boolean)
  : undefined

const outdir = path.resolve('dist-temp', 'doctor')
const outfile = path.join(outdir, 'doctor-check.mjs')
const entry = path.resolve('src/main/doctor/environment-doctor.ts')

await fs.mkdir(outdir, { recursive: true })
await build({
  absWorkingDir: process.cwd(),
  entryPoints: [path.relative(process.cwd(), entry).split(path.sep).join('/')],
  outfile,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  packages: 'external',
  logLevel: 'silent'
})

const { EnvironmentDoctor } = await import(pathToFileURL(outfile).href)
const doctor = new EnvironmentDoctor()
const report = checkIds?.length
  ? await doctor.runChecks(checkIds)
  : await doctor.runAllChecks()

if (json) {
  console.log(JSON.stringify(report, null, 2))
} else {
  console.log(`Doctor ${report.overallStatus.toUpperCase()} ${report.platform}/${report.arch} ${report.profile}`)
  for (const check of report.checks) {
    console.log(`[${check.status}] ${check.id}: ${check.message}`)
  }
}
