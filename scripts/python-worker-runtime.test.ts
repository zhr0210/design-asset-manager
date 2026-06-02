import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { AiRuntimeManager } from '../src/main/services/ai-runtime/ai-runtime-manager'
import { MockAiRuntimeProcessRunner } from '../src/main/services/ai-runtime/process/mock-ai-runtime-process-runner'
import { createPythonWorkerLaunchPlan } from '../src/main/services/ai-runtime/providers/python-worker-launch-plan'
import { PythonWorkerRuntimeProvider } from '../src/main/services/ai-runtime/providers/python-worker-runtime.provider'
import {
  createCpuPythonWorkerRuntimeConfig,
  createDefaultPythonWorkerRuntimeConfig,
  createGpuPythonWorkerRuntimeConfig
} from '../src/main/services/ai-runtime/providers/python-worker-runtime-presets'

const defaultConfig = createDefaultPythonWorkerRuntimeConfig()
assert.equal(defaultConfig.runtimeId, 'python-worker')
assert.equal(defaultConfig.port, 8000)

assert.equal(createCpuPythonWorkerRuntimeConfig().metadata?.acceleration, 'cpu')
assert.equal(createGpuPythonWorkerRuntimeConfig().metadata?.acceleration, 'gpu')

const validConfig = createDefaultPythonWorkerRuntimeConfig({
  pythonPath: 'python',
  scriptPath: 'ai-service/app.py',
  workingDirectory: 'ai-service',
  launchArgs: ['--mock-only']
})
const plan = createPythonWorkerLaunchPlan(validConfig)
assert.equal(plan.command, 'python')
assert.deepEqual(plan.args.slice(0, 5), ['ai-service/app.py', '--host', '127.0.0.1', '--port', '8000'])
assert.ok(plan.args.includes('--mock-only'))
assert.equal(plan.blockingIssues.length, 0)
assert.ok(!plan.args.join(' ').includes('python ai-service/app.py'))

const missingPython = createPythonWorkerLaunchPlan({ ...validConfig, pythonPath: null })
assert.ok(missingPython.blockingIssues.some((issue) => issue.includes('pythonPath')))

const missingScript = createPythonWorkerLaunchPlan({ ...validConfig, scriptPath: null })
assert.ok(missingScript.blockingIssues.some((issue) => issue.includes('scriptPath')))

const runner = new MockAiRuntimeProcessRunner()
const provider = new PythonWorkerRuntimeProvider(validConfig, runner)
const started = await provider.start()
assert.equal(started.success, true)
assert.equal(started.state.status, 'running')
assert.equal(runner.getHistory().length, 1)
assert.equal(runner.getHistory()[0].command, 'python')

const health = await provider.healthCheck()
assert.equal(health.status, 'ok')

const stopped = await provider.stop()
assert.equal(stopped.success, true)
assert.equal(stopped.state.status, 'stopped')
assert.equal(runner.listProcesses()[0].signal, 'SIGTERM')

const restarted = await provider.restart()
assert.equal(restarted.success, true)
assert.equal(restarted.state.status, 'running')

const processId = restarted.state.pid
assert.ok(processId !== null)
runner.simulateExit(processId, 1)
assert.equal(provider.getState().status, 'failed')
assert.equal((await provider.healthCheck()).status, 'error')

const missingHealthProvider = new PythonWorkerRuntimeProvider({ ...validConfig, baseUrl: null }, new MockAiRuntimeProcessRunner())
await missingHealthProvider.start()
assert.equal((await missingHealthProvider.healthCheck()).status, 'warning')

const updateResult = await provider.updateConfig({
  displayName: 'Updated Python Worker',
  baseUrl: 'http://127.0.0.1:9000',
  metadata: { changed: true }
})
assert.equal(updateResult.success, true)
assert.equal(provider.getPythonConfig().displayName, 'Updated Python Worker')
assert.equal(provider.getPythonConfig().baseUrl, 'http://127.0.0.1:9000')
assert.deepEqual(provider.getPythonConfig().metadata, { changed: true })

const failingRunner = new MockAiRuntimeProcessRunner()
failingRunner.failNextSpawn('no python here')
const failingProvider = new PythonWorkerRuntimeProvider(validConfig, failingRunner)
const failedStart = await failingProvider.start()
assert.equal(failedStart.success, false)
assert.equal(failedStart.state.status, 'failed')
assert.match(failedStart.error ?? '', /no python here/)

const manager = new AiRuntimeManager()
manager.registerProvider(new PythonWorkerRuntimeProvider(validConfig, new MockAiRuntimeProcessRunner()))
assert.equal((await manager.startRuntime('python-worker')).success, true)
const allHealth = await manager.healthCheckAll()
assert.equal(allHealth.length, 1)
assert.equal(allHealth[0].runtimeId, 'python-worker')

const providerSource = await fs.readFile('src/main/services/ai-runtime/providers/python-worker-runtime.provider.ts', 'utf8')
const runnerSource = await fs.readFile('src/main/services/ai-runtime/process/mock-ai-runtime-process-runner.ts', 'utf8')
const launchPlanSource = await fs.readFile('src/main/services/ai-runtime/providers/python-worker-launch-plan.ts', 'utf8')
const combinedSource = [providerSource, runnerSource, launchPlanSource].join('\n')

assert.doesNotMatch(combinedSource, /child_process|execFile\s*\(|runProcess/)
assert.doesNotMatch(combinedSource, /\bfetch\s*\(|XMLHttpRequest|https?:\s*request|createConnection|createServer/)
assert.doesNotMatch(combinedSource, /ai-client|settings|runtime-registry\.service|RuntimeRegistry|better-sqlite3|src\/main\/db/i)
