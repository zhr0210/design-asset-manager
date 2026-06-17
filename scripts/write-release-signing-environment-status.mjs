import { build } from 'esbuild'
import path from 'node:path'

const entry = path.resolve('scripts/write-release-signing-environment-status.ts')

const result = await build({
  absWorkingDir: process.cwd(),
  entryPoints: [path.relative(process.cwd(), entry).split(path.sep).join('/')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  packages: 'external',
  logLevel: 'silent',
  write: false
})

const script = result.outputFiles[0]?.text
if (!script) {
  throw new Error('Failed to build write-release-signing-environment-status.ts')
}

await import(`data:text/javascript;base64,${Buffer.from(script).toString('base64')}`)
