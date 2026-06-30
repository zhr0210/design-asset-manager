import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import {
  DOCTOR_NPM_COMMAND_ADAPTERS,
  DOCTOR_PYTHON_COMMAND_BUDGET_RATIO,
  DOCTOR_PYTHON_LAUNCHER_ADAPTERS,
  MAX_DOCTOR_PYTHON_CHECK_TIMEOUT_MS,
  resolveDoctorNpmCommand,
  resolveDoctorPythonCommandTimeout,
  resolveDoctorPythonLauncherAdapter
} from '../src/main/doctor/doctor-command-resolver'

assert.deepEqual(DOCTOR_NPM_COMMAND_ADAPTERS, [
  { platform: 'win32', command: 'npm.cmd' },
  { command: 'npm' }
])
assert.equal(resolveDoctorNpmCommand('win32'), 'npm.cmd')
assert.equal(resolveDoctorNpmCommand('darwin'), 'npm')
assert.equal(resolveDoctorNpmCommand('linux'), 'npm')
assert.equal(resolveDoctorNpmCommand('unknown'), 'npm')

assert.deepEqual(DOCTOR_PYTHON_LAUNCHER_ADAPTERS, [
  {
    platform: 'win32',
    candidates: [
      { detailKey: 'pyLauncher', command: 'py' },
      { detailKey: 'python', command: 'python' },
      { detailKey: 'python3', command: 'python3' }
    ]
  },
  {
    candidates: [
      { detailKey: 'python3', command: 'python3' },
      { detailKey: 'python', command: 'python' }
    ]
  }
])
assert.deepEqual(resolveDoctorPythonLauncherAdapter('win32').candidates.map((candidate) => candidate.command), ['py', 'python', 'python3'])
assert.deepEqual(resolveDoctorPythonLauncherAdapter('darwin').candidates.map((candidate) => candidate.command), ['python3', 'python'])
assert.deepEqual(resolveDoctorPythonLauncherAdapter('linux').candidates.map((candidate) => candidate.command), ['python3', 'python'])
assert.deepEqual(resolveDoctorPythonLauncherAdapter('unknown').candidates.map((candidate) => candidate.command), ['python3', 'python'])
assert.equal(MAX_DOCTOR_PYTHON_CHECK_TIMEOUT_MS, 5000)
assert.equal(DOCTOR_PYTHON_COMMAND_BUDGET_RATIO, 0.8)
assert.equal(resolveDoctorPythonCommandTimeout(1000, 3), 200)
assert.equal(resolveDoctorPythonCommandTimeout(10_000, 2), 1333)
assert.equal(resolveDoctorPythonCommandTimeout(1, 10), 1)

const nodeCheckSource = await fs.readFile('src/main/doctor/checks/node.check.ts', 'utf8')
const pythonCheckSource = await fs.readFile('src/main/doctor/checks/python.check.ts', 'utf8')
const resolverSource = await fs.readFile('src/main/doctor/doctor-command-resolver.ts', 'utf8')

assert.match(nodeCheckSource, /resolveDoctorNpmCommand\(context\.platformInfo\.platform\)/)
assert.doesNotMatch(nodeCheckSource, /NPM_COMMAND_ADAPTERS|npm\.cmd/)
assert.match(pythonCheckSource, /resolveDoctorPythonLauncherAdapter\(context\.platformInfo\.platform\)/)
assert.match(pythonCheckSource, /resolveDoctorPythonCommandTimeout\(context\.timeoutMs, adapter\.candidates\.length\)/)
assert.doesNotMatch(pythonCheckSource, /context\.platformInfo\.isWindows/)
assert.doesNotMatch(pythonCheckSource, /PYTHON_LAUNCHER_ADAPTERS|MAX_PYTHON_CHECK_TIMEOUT_MS|PYTHON_COMMAND_BUDGET_RATIO/)
assert.match(resolverSource, /DOCTOR_NPM_COMMAND_ADAPTERS/)
assert.match(resolverSource, /DOCTOR_PYTHON_LAUNCHER_ADAPTERS/)
assert.match(resolverSource, /platformAdapterMatchesCurrentPlatform\(candidate, \{ currentPlatform: platform \}\)/)
assert.match(resolverSource, /platform: 'win32'[\s\S]*command: 'py'/)
assert.doesNotMatch(resolverSource, /\bisWindows\b/)
assert.doesNotMatch(resolverSource, /candidate\.platform\s*===\s*platform|candidate\.platform\s*!==\s*platform/)

console.log('doctor-command-resolver passed')
