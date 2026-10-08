import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const entryArg = process.argv[2]
if (!entryArg || process.argv.length !== 3) {
  console.error('Usage: node scripts/run-electron-node-test.mjs <entry.ts>')
  process.exit(1)
}

const normalizedEntry = entryArg.split(path.sep).join('/')
if (!/^scripts\/(?:[A-Za-z0-9._/-]+\.test|test-[A-Za-z0-9._/-]+)\.(?:ts|tsx|js|mjs)$/.test(normalizedEntry)) {
  console.error('Electron Node test entry must be a repository scripts test file.')
  process.exit(1)
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const scriptsRoot = path.join(root, 'scripts')
const entry = path.resolve(root, normalizedEntry)
if (!entry.startsWith(`${scriptsRoot}${path.sep}`) || !fs.existsSync(entry)) {
  console.error('Electron Node test entry is missing or outside the repository.')
  process.exit(1)
}

const require = createRequire(import.meta.url)
const electronBinary = require('electron')
const runner = path.join(root, 'scripts/run-ts-test.mjs')
// These owned qualification processes need SQLite URI configuration before
// the first native import. The formal Host and all other tests keep their env.
const uriQualification = new Set([
  'scripts/windows-backup-journal.test.ts',
  'scripts/windows-backup-source-metadata.test.ts',
  'scripts/windows-native-backup-integration.test.ts'
]).has(normalizedEntry)
const result = spawnSync(electronBinary, [runner, normalizedEntry], {
  cwd: root,
  env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', ...(uriQualification ? {SQLITE_USE_URI: '1'} : {}) },
  stdio: 'inherit',
  shell: false
})

if (result.error) {
  console.error(`Unable to start Electron Node test host: ${result.error.message}`)
  process.exit(1)
}
if (result.signal) {
  console.error(`Electron Node test host stopped by signal ${result.signal}.`)
  process.exit(1)
}
process.exit(result.status ?? 1)
