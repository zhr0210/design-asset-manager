import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const testRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'design-asset-manager-tests-'))
const candidates = process.platform === 'win32'
  ? [
      { command: 'py', args: ['-3'] },
      { command: 'python', args: [] },
      { command: 'python3', args: [] }
    ]
  : [
      { command: 'python3', args: [] },
      { command: 'python', args: [] }
    ]

const testArgs = ['-u', '-m', 'unittest', 'discover', '-s', 'ai-service/tests', '-v']
const env = {
  ...process.env,
  HF_HUB_OFFLINE: '1',
  DESIGN_ASSET_MANAGER_DISABLE_USER_DATA_ACCESS: '1',
  DESIGN_ASSET_MANAGER_TASK_CACHE_DB: path.join(testRoot, 'tasks-cache.db'),
  PYTHONPYCACHEPREFIX: path.join(testRoot, 'pycache')
}

const sanitize = (value) => {
  const replacements = [
    [testRoot, '<test-temp>'],
    [process.cwd(), '<workspace>'],
    [os.homedir(), '<user-home>']
  ]

  return replacements.reduce(
    (output, [privatePath, label]) => output.split(privatePath).join(label),
    value ?? ''
  )
}

let result
try {
  for (const candidate of candidates) {
    result = spawnSync(candidate.command, [...candidate.args, ...testArgs], {
      cwd: process.cwd(),
      env,
      encoding: 'utf8'
    })
    if (!result.error || result.error.code !== 'ENOENT') {
      break
    }
  }

  if (!result || (result.error && result.error.code === 'ENOENT')) {
    console.error('Python 3 executable was not found.')
    process.exitCode = 1
  } else {
    process.stdout.write(sanitize(result.stdout))
    process.stderr.write(sanitize(result.stderr))
    if (result.error) {
      console.error(result.error.message)
      process.exitCode = 1
    } else {
      process.exitCode = result.status ?? 1
    }
  }
} finally {
  fs.rmSync(testRoot, { recursive: true, force: true })
}
