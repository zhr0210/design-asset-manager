import { build } from 'esbuild'
import { pathToFileURL } from 'url'
import path from 'path'
import fs from 'fs/promises'

const entryArg = process.argv[2]
if (!entryArg) {
  console.error('Usage: node scripts/run-ts-test.mjs <entry.ts>')
  process.exit(1)
}
const entry = path.resolve(entryArg)
const relativeEntry = path.relative(process.cwd(), entry).split(path.sep).join('/')

const outdir = path.resolve('dist-temp', 'tests')
await fs.mkdir(outdir, { recursive: true })

const outfile = path.join(outdir, `${path.basename(entry, '.ts')}.mjs`)

await build({
  absWorkingDir: process.cwd(),
  entryPoints: [relativeEntry],
  outfile,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  packages: 'external',
  logLevel: 'silent'
})

await import(pathToFileURL(outfile).href)
