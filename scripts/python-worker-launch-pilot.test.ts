import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { MockAiRuntimeProcessRunner } from '../src/main/services/ai-runtime/process/mock-ai-runtime-process-runner'
import { PythonWorkerRuntimeProvider } from '../src/main/services/ai-runtime/providers/python-worker-runtime.provider'
import { createDefaultPythonWorkerRuntimeConfig } from '../src/main/services/ai-runtime/providers/python-worker-runtime-presets'
import {
  createControlledPythonWorkerLaunchPlan,
  createPythonWorkerCrashLogPlan,
  createPythonWorkerStopPlan
} from '../src/main/services/ai-runtime/providers/python-worker-launch-control'

const config = createDefaultPythonWorkerRuntimeConfig({
  runtimeId: 'python-worker-pilot',
  pythonPath: 'python',
  scriptPath: 'app.py',
  workingDirectory: 'ai-service',
  host: '127.0.0.1',
  port: 8765,
  baseUrl: 'http://127.0.0.1:8765',
  healthEndpoint: '/health',
  env: { PYTHONUNBUFFERED: '1' }
})

const plan = createControlledPythonWorkerLaunchPlan(config)
assert.equal(plan.command, 'python')
assert.deepEqual(plan.args.slice(0, 5), ['app.py', '--host', '127.0.0.1', '--port', '8765'])
assert.equal(plan.cwd, 'ai-service')
assert.equal(plan.healthUrl, 'http://127.0.0.1:8765/health')
assert.equal(plan.blockingIssues.length, 0)

const badPort = createControlledPythonWorkerLaunchPlan({ ...config, port: 70_000 })
assert.ok(badPort.blockingIssues.some((issue) => issue.includes('port')))

const escapingScript = createControlledPythonWorkerLaunchPlan({ ...config, scriptPath: '../outside.py' })
assert.ok(escapingScript.blockingIssues.some((issue) => issue.includes('inside workingDirectory')))

const sensitiveEnv = createControlledPythonWorkerLaunchPlan({ ...config, env: { API_TOKEN: 'redacted' } })
assert.ok(sensitiveEnv.warnings.some((warning) => warning.includes('sensitive-looking')))

const runner = new MockAiRuntimeProcessRunner()
const provider = new PythonWorkerRuntimeProvider(config, runner)
const started = await provider.start()
assert.equal(started.success, true)
assert.equal(runner.getHistory().length, 1)
assert.equal(runner.getHistory()[0].command, 'python')
assert.equal(runner.getHistory()[0].options.cwd, 'ai-service')

const processState = runner.listProcesses()[0]
const crashLogPlan = createPythonWorkerCrashLogPlan(config, processState)
assert.match(crashLogPlan.crashLogPath ?? '', /python-worker-pilot-crash\.log/)
assert.equal(crashLogPlan.stdoutTailLimit, 20)
assert.equal(crashLogPlan.stderrTailLimit, 20)

const stopPlan = createPythonWorkerStopPlan(config, processState)
assert.equal(stopPlan.pid, processState.pid)
assert.equal(stopPlan.signal, 'SIGTERM')
assert.equal(stopPlan.cleanupTempFiles, false)

const stopped = await provider.stop()
assert.equal(stopped.success, true)

const manifest = JSON.parse(await fs.readFile('.codeindex/python-worker-launch-pilot.json', 'utf8')) as {
  realProcessRunnerAvailable?: boolean
  testsUseMockRunner?: boolean
  autoInstallPython?: boolean
  autoInstallDependencies?: boolean
  autoStartWorker?: boolean
  cleanupDeletesFiles?: boolean
}
assert.equal(manifest.realProcessRunnerAvailable, true)
assert.equal(manifest.testsUseMockRunner, true)
assert.equal(manifest.autoInstallPython, false)
assert.equal(manifest.autoInstallDependencies, false)
assert.equal(manifest.autoStartWorker, true)
assert.equal(manifest.cleanupDeletesFiles, false)

const controlSource = await fs.readFile('src/main/services/ai-runtime/providers/python-worker-launch-control.ts', 'utf8')
assert.doesNotMatch(controlSource, /spawn\s*\(|execFile\s*\(|runProcess/)
assert.doesNotMatch(controlSource, /writeFile|createWriteStream|rm\(|unlink/)

const realRunnerSource = await fs.readFile('src/main/services/ai-runtime/process/real-ai-runtime-process-runner.ts', 'utf8')
assert.match(realRunnerSource, /spawn\(/)
assert.match(realRunnerSource, /child\.pid/)
assert.match(realRunnerSource, /OUTPUT_TAIL_LIMIT/)
assert.match(realRunnerSource, /SIGTERM/)
assert.match(realRunnerSource, /SIGKILL/)
assert.doesNotMatch(realRunnerSource, /runProcess/)
assert.doesNotMatch(realRunnerSource, /pip install|python -m pip|download|curl|wget/i)

const doc = await fs.readFile('docs/platform/PYTHON_WORKER_LAUNCH_PILOT.md', 'utf8')
assert.match(doc, /MockAiRuntimeProcessRunner/)
assert.match(doc, /disposable local child process/i)
assert.match(doc, /starts automatically/i)
assert.match(doc, /does not remain orphaned/i)
