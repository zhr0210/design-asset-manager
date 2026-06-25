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
  { isWindows: true, command: 'npm.cmd' },
  { command: 'npm' }
])
assert.equal(resolveDoctorNpmCommand(true), 'npm.cmd')
assert.equal(resolveDoctorNpmCommand(false), 'npm')

assert.deepEqual(DOCTOR_PYTHON_LAUNCHER_ADAPTERS, [
  {
    isWindows: true,
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
assert.deepEqual(resolveDoctorPythonLauncherAdapter(true).candidates.map((candidate) => candidate.command), ['py', 'python', 'python3'])
assert.deepEqual(resolveDoctorPythonLauncherAdapter(false).candidates.map((candidate) => candidate.command), ['python3', 'python'])
assert.equal(MAX_DOCTOR_PYTHON_CHECK_TIMEOUT_MS, 5000)
assert.equal(DOCTOR_PYTHON_COMMAND_BUDGET_RATIO, 0.8)
assert.equal(resolveDoctorPythonCommandTimeout(1000, 3), 200)
assert.equal(resolveDoctorPythonCommandTimeout(10_000, 2), 1333)
assert.equal(resolveDoctorPythonCommandTimeout(1, 10), 1)

const nodeCheckSource = await fs.readFile('src/main/doctor/checks/node.check.ts', 'utf8')
const pythonCheckSource = await fs.readFile('src/main/doctor/checks/python.check.ts', 'utf8')
const resolverSource = await fs.readFile('src/main/doctor/doctor-command-resolver.ts', 'utf8')

assert.match(nodeCheckSource, /resolveDoctorNpmCommand\(context\.platformInfo\.isWindows\)/)
assert.doesNotMatch(nodeCheckSource, /NPM_COMMAND_ADAPTERS|npm\.cmd/)
assert.match(pythonCheckSource, /resolveDoctorPythonLauncherAdapter\(context\.platformInfo\.isWindows\)/)
assert.match(pythonCheckSource, /resolveDoctorPythonCommandTimeout\(context\.timeoutMs, adapter\.candidates\.length\)/)
assert.doesNotMatch(pythonCheckSource, /PYTHON_LAUNCHER_ADAPTERS|MAX_PYTHON_CHECK_TIMEOUT_MS|PYTHON_COMMAND_BUDGET_RATIO/)
assert.match(resolverSource, /DOCTOR_NPM_COMMAND_ADAPTERS/)
assert.match(resolverSource, /DOCTOR_PYTHON_LAUNCHER_ADAPTERS/)
assert.match(resolverSource, /isWindows: true[\s\S]*command: 'py'/)

console.log('doctor-command-resolver passed')
