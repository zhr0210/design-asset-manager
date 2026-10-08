import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import sharp from 'sharp'
import {startLocalDamFixtures} from './local-dam-fixtures.mjs'

const client = process.argv.includes('--client=desktop') ? 'desktop' : 'browser'
const synthetic = process.argv.includes('--synthetic')
const fixturesRequested = process.argv.includes('--fixtures')
const profiles = process.argv.slice(2).filter(argument => argument.startsWith('--profile='))
if (profiles.length > 1 || (synthetic && profiles.length)) throw Error('Choose one ordinary profile')
const profile = profiles[0]?.slice('--profile='.length)
if (profile !== undefined && (!profile || !path.isAbsolute(profile))) throw Error('Profile must be an absolute directory')
if (fixturesRequested && !synthetic) throw Error('Fixtures require the isolated synthetic profile')
if (process.argv.slice(2).some(argument => !['--client=desktop', '--client=browser', '--synthetic','--fixtures'].includes(argument) && !argument.startsWith('--profile='))) throw Error('Unknown launch argument')
const require = createRequire(import.meta.url)
const args = ['.']
const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE
delete env.DAM_ACTIVE_LIBRARY_SYNTHETIC_E2E
if (client === 'browser') args.push('--dam-browser')
if (profile) args.push(`--dam-profile=${path.resolve(profile)}`)
let evidenceDirectory
let fixtures
if (synthetic) {
  const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'dam-local-client-')))
  const profileDirectory = path.join(root, 'profile')
  evidenceDirectory = path.join(root, 'evidence')
  const sourceDirectory = path.join(root, 'sources')
  await Promise.all([profileDirectory, evidenceDirectory, sourceDirectory].map(directory => fs.mkdir(directory)))
  if(fixturesRequested){fixtures=await startLocalDamFixtures(root);console.log(`Synthetic fixtures only: ${fixtures.origin}; OCR folder: fixtures/ocr`)}
  const sources = [path.join(sourceDirectory, '青蓝参考.png'), path.join(sourceDirectory, '暖色参考.jpg')]
  await sharp({ create: { width: 640, height: 480, channels: 3, background: '#4a9dab' } }).png().toFile(sources[0])
  await sharp({ create: { width: 480, height: 640, channels: 3, background: '#d69a6b' } }).jpeg().toFile(sources[1])
  env.DAM_ACTIVE_LIBRARY_SYNTHETIC_E2E = JSON.stringify({ rootDirectory: root, profileDirectory, libraryDirectory: path.join(root, 'library'), evidenceDirectory, sourceSelections: [sources], interactiveDialogs: true })
  env.NODE_ENV = 'test'
  args.push('--dam-active-library-synthetic-e2e', `--user-data-dir=${profileDirectory}`)
  await fs.mkdir('.scratch/local-dual-client', { recursive: true })
  await fs.writeFile('.scratch/local-dual-client/controlled-launch.json', JSON.stringify({ testId: 'local-client-synthetic', evidenceDirectory, rootDirectory: root, profileDirectory }, null, 2))
}
// Electron is a GUI executable. A Browser-first Host may later be asked to
// present its first native window; Windows must not inherit SW_HIDE for that
// presentation. Browser mode itself creates no native workspace window.
const child = spawn(require('electron'), args, { cwd: process.cwd(), env, windowsHide: false, stdio: 'ignore' })
child.once('error', error => { console.error('DAM launcher failed:', error.code); process.exitCode = 1 })
child.once('exit', async code => { await fixtures?.close(); process.exitCode = code ?? 1 })
if (evidenceDirectory && client === 'browser') {
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const receipt = JSON.parse(await fs.readFile(path.join(evidenceDirectory, 'local-host.json'), 'utf8'))
      console.log(`DAM synthetic Browser entry: ${receipt.entry}`)
      break
    } catch { await new Promise(resolve => setTimeout(resolve, 500)) }
  }
}
