import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import fs from 'node:fs/promises'
import {openSync,closeSync} from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const arguments_ = process.argv.slice(2)
if (process.platform !== 'darwin') throw Error('Native A/B candidates currently require macOS; Windows is not implemented or certified')
const candidate = arguments_.find(a => a.startsWith('--candidate='))?.slice('--candidate='.length)
if (!['a', 'b'].includes(candidate) || arguments_.some(a => !a.startsWith('--candidate=') && !a.startsWith('--profile='))) {
  throw Error('Use --candidate=a|b [--profile=/absolute/isolated/directory]')
}
const profile = arguments_.find(a => a.startsWith('--profile='))?.slice('--profile='.length) ??
  path.resolve(`artifacts/window-candidates/profile-${candidate}`)
if (!path.isAbsolute(profile)) throw Error('Absolute candidate profile required')
await fs.mkdir(profile, { recursive: true })
// Public generated files only; available in the ordinary file chooser.
const fixtures = path.join(profile, 'fixtures')
await fs.mkdir(fixtures, { recursive: true })
for (const [name, color] of [['蓝色参考.png', '#4A9DAB'], ['暖色参考.png', '#D69A6B']]) {
  const file = path.join(fixtures, name)
  try { await fs.access(file) } catch {
    await sharp({ create: { width: 640, height: 480, channels: 3, background: color } }).png().toFile(file)
  }
}
try { await fs.access(path.join(fixtures, '测试文字.txt')) } catch {
  await fs.writeFile(path.join(fixtures, '测试文字.txt'), 'DAM window candidate public generated fixture.\n')
}
const require = createRequire(import.meta.url)
const binary = candidate === 'a' ? path.resolve('build/shelf-candidates/DAM Shelf A.app/Contents/MacOS/Shelf') : require('electron')
const args = candidate === 'a' ? ['--mode=a', `--state-root=${profile}`] :
  ['.', `--dam-profile=${profile}`, '--dam-work-window-candidate=b']
const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE
delete env.DAM_ACTIVE_LIBRARY_SYNTHETIC_E2E
console.log(`Candidate ${candidate.toUpperCase()}: ${profile}`)
// Keep long-lived GUI output away from a terminal/tool pipe that can disappear.
const log=openSync(path.join(profile,'candidate-runtime.log'),'a',0o600)
const child = spawn(binary, args, { stdio: ['ignore',log,log], env, windowsHide: false })
closeSync(log)
child.once('error', error => { console.error(error.message); process.exitCode = 1 })
child.once('exit', code => { process.exitCode = code ?? 1 })
