import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import type { DoctorCheckContext } from '../src/shared/types/doctor.types'
import { EnvironmentDoctor, aggregateDoctorStatus } from '../src/main/doctor/environment-doctor'
import { pathCheck } from '../src/main/doctor/checks/path.check'
import { portCheck } from '../src/main/doctor/checks/port.check'
import { createPythonCheck } from '../src/main/doctor/checks/python.check'
import { createNativeDepsCheck } from '../src/main/doctor/checks/native-deps.check'

assert.equal(aggregateDoctorStatus([{ id: 'a', label: 'a', status: 'ok', message: 'ok', durationMs: 0 }]), 'ok')
assert.equal(aggregateDoctorStatus([{ id: 'a', label: 'a', status: 'warning', message: 'warn', durationMs: 0 }]), 'warning')
assert.equal(aggregateDoctorStatus([{ id: 'a', label: 'a', status: 'error', message: 'err', durationMs: 0 }]), 'error')

const base = path.join(process.cwd(), 'dist-temp', 'doctor-tests')
await fs.rm(base, { recursive: true, force: true })

const context: DoctorCheckContext = {
  platformInfo: {
    platform: 'win32',
    arch: 'x64',
    profile: 'windows-x64',
    isWindows: true,
    isMacOS: false,
    isAppleSilicon: false
  },
  managedPaths: {
    userDataDir: path.join(base, 'user-data'),
    configDir: path.join(base, 'user-data', 'config'),
    databaseDir: path.join(base, 'user-data', 'database'),
    logsDir: path.join(base, 'user-data', 'logs'),
    cacheDir: path.join(base, 'user-data', 'cache'),
    runtimeDir: path.join(base, 'user-data', 'runtime'),
    modelsDir: path.join(base, 'user-data', 'models'),
    tempDir: path.join(base, 'temp'),
    downloadsDir: path.join(base, 'downloads')
  },
  aiWorkerConfig: {
    baseUrl: 'http://127.0.0.1:9',
    healthPath: '/health',
    timeoutMs: 100
  },
  timeoutMs: 1000
}

const doctor = new EnvironmentDoctor([
  {
    id: 'ok-check',
    label: 'OK check',
    async run() {
      return { id: 'ok-check', label: 'OK check', status: 'ok', message: 'ok', durationMs: 0 }
    }
  },
  {
    id: 'throwing-check',
    label: 'Throwing check',
    async run() {
      throw new Error('boom')
    }
  }
])
const report = await doctor.runAllChecks({ context })
assert.equal(report.overallStatus, 'error')
assert.equal(report.checks.length, 2)
assert.equal(report.checks[1].status, 'error')

const pathResult = await pathCheck.run(context)
assert.equal(pathResult.status, 'ok')
assert.equal((pathResult.details?.paths as any).userDataDir.path.includes('..'), false)

const portResult = await portCheck.run({ ...context, timeoutMs: 100 })
assert.equal(portResult.status, 'warning')

const pythonCheck = createPythonCheck(async () => ({ available: false, error: 'not found' }))
const noPythonContext = { ...context, platformInfo: { ...context.platformInfo, isWindows: false } }
const pythonResult = await pythonCheck.run(noPythonContext)
assert.equal(pythonResult.status, 'warning')

const nonWindowsPythonCommands: string[] = []
const nonWindowsPythonCheck = createPythonCheck(async (command) => {
  nonWindowsPythonCommands.push(command)
  return { available: false, error: 'not found' }
})
const missingNonWindowsPython = await nonWindowsPythonCheck.run(noPythonContext)
assert.deepEqual(nonWindowsPythonCommands, ['python3', 'python'])
assert.equal((missingNonWindowsPython.details?.pip as any).skipped, true)

const windowsPythonCommands: string[] = []
const windowsPythonCheck = createPythonCheck(async (command) => {
  windowsPythonCommands.push(command)
  return { available: command === 'py' }
})
const windowsPythonResult = await windowsPythonCheck.run(context)
assert.equal(windowsPythonResult.status, 'ok')
assert.deepEqual(windowsPythonCommands, ['py', 'py'])
assert.equal((windowsPythonResult.details?.pyLauncher as any).available, true)
assert.equal((windowsPythonResult.details?.python as any).skipped, true)
assert.equal((windowsPythonResult.details?.python3 as any).skipped, true)

const windowsFallbackCommands: string[] = []
const windowsFallbackCheck = createPythonCheck(async (command, args) => {
  windowsFallbackCommands.push(`${command} ${args.join(' ')}`)
  return { available: command === 'python' }
})
const windowsFallbackResult = await windowsFallbackCheck.run(context)
assert.equal(windowsFallbackResult.status, 'ok')
assert.deepEqual(windowsFallbackCommands, [
  'py --version',
  'python --version',
  'python -m pip --version'
])

const nonWindowsPreferredCommands: string[] = []
const nonWindowsPreferredCheck = createPythonCheck(async (command, args) => {
  nonWindowsPreferredCommands.push(`${command} ${args.join(' ')}`)
  return { available: command === 'python3' }
})
const nonWindowsPreferredResult = await nonWindowsPreferredCheck.run(noPythonContext)
assert.equal(nonWindowsPreferredResult.status, 'ok')
assert.deepEqual(nonWindowsPreferredCommands, [
  'python3 --version',
  'python3 -m pip --version'
])

const timeoutBudgets: number[] = []
const budgetedPythonCheck = createPythonCheck(async (command, _args, timeoutMs) => {
  timeoutBudgets.push(timeoutMs)
  return { available: command === 'python3' }
})
await budgetedPythonCheck.run(context)
assert.ok(timeoutBudgets.reduce((sum, timeoutMs) => sum + timeoutMs, 0) < context.timeoutMs)

const nodeCheckSource = await fs.readFile('src/main/doctor/checks/node.check.ts', 'utf8')
assert.match(nodeCheckSource, /resolveDoctorNpmCommand\(context\.platformInfo\.isWindows\)/)
assert.doesNotMatch(nodeCheckSource, /NPM_COMMAND_ADAPTERS|function resolveNpmCommand|npm\.cmd/)
assert.doesNotMatch(nodeCheckSource, /context\.platformInfo\.isWindows\s*\?\s*'npm\.cmd'\s*:\s*'npm'/)

const pythonCheckSource = await fs.readFile('src/main/doctor/checks/python.check.ts', 'utf8')
assert.match(pythonCheckSource, /resolveDoctorPythonLauncherAdapter\(context\.platformInfo\.isWindows\)/)
assert.match(pythonCheckSource, /resolveDoctorPythonCommandTimeout\(context\.timeoutMs, adapter\.candidates\.length\)/)
assert.match(pythonCheckSource, /detected\.candidate\.command, \['-m', 'pip', '--version'\]/)
assert.doesNotMatch(pythonCheckSource, /PYTHON_LAUNCHER_ADAPTERS|function resolvePythonLauncherAdapter|function resolvePythonCommandTimeout/)
assert.doesNotMatch(pythonCheckSource, /checkCommand\('python', \['-m', 'pip', '--version'\]/)

const nativeDepsCheck = createNativeDepsCheck(async () => {
  throw new Error('native import failed')
})
const nativeResult = await nativeDepsCheck.run(context)
assert.equal(nativeResult.status, 'warning')
assert.ok(nativeResult.fixSuggestion?.includes('will not rebuild'))

await fs.rm(base, { recursive: true, force: true })
