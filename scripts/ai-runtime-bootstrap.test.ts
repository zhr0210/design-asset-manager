import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import type { PythonWorkerRuntimeConfig } from '../src/shared/types/ai-runtime.types'
import type { PlatformArch, PlatformName } from '../src/shared/types/platform.types'
import {
  bootstrapAiRuntimeManager,
  type AiRuntimeBootstrapHost
} from '../src/main/services/ai-runtime/ai-runtime-bootstrap'
import { MockAiRuntimeProcessRunner } from '../src/main/services/ai-runtime/process/mock-ai-runtime-process-runner'
import { PythonWorkerRuntimeProvider } from '../src/main/services/ai-runtime/providers/python-worker-runtime.provider'

function host(platform: PlatformName, arch: PlatformArch): AiRuntimeBootstrapHost {
  return {
    platform,
    arch,
    homeDir: path.join(path.parse(process.cwd()).root, 'test-home'),
    pythonExecutable: 'python-test',
    aiServiceRoot: path.join(path.parse(process.cwd()).root, 'test-app', 'ai-service')
  }
}

function bootstrap(platform: PlatformName, arch: PlatformArch) {
  const runner = new MockAiRuntimeProcessRunner()
  const configs: PythonWorkerRuntimeConfig[] = []
  const result = bootstrapAiRuntimeManager(host(platform, arch), {
    createPythonWorkerProvider: (config) => {
      configs.push(config)
      return new PythonWorkerRuntimeProvider(config, runner)
    }
  })
  return { ...result, runner, config: configs[0] }
}

const macOS = bootstrap('darwin', 'arm64')
assert.deepEqual(macOS.manager.listRuntimes().map((runtime) => runtime.id), [
  'disabled-runtime',
  'macos-ai-branch-runtime',
  'windows-ai-branch-runtime',
  'python-worker-runtime'
])
assert.equal(macOS.manager.getProvider('macos-ai-branch-runtime')?.getConfig().profileId, 'macos-apple-silicon')
assert.equal(macOS.manager.getProvider('windows-ai-branch-runtime')?.getConfig().profileId, null)
assert.equal((macOS.manager.getRuntimeState('macos-ai-branch-runtime')?.metadata?.macosAiBranch as { isCurrentPlatform?: boolean }).isCurrentPlatform, true)
assert.equal((macOS.manager.getRuntimeState('windows-ai-branch-runtime')?.metadata?.windowsAiBranch as { isCurrentPlatform?: boolean }).isCurrentPlatform, false)
assert.equal(macOS.manager.getActiveRuntime()?.id, 'python-worker-runtime')
assert.equal((await macOS.autoStartResult)?.success, true)
assert.equal(macOS.runner.getHistory().length, 1)
assert.equal(macOS.config.pythonPath, 'python-test')
assert.equal(macOS.config.scriptPath, path.join(macOS.config.workingDirectory!, 'app.py'))
assert.equal(macOS.config.env.HF_HOME, path.join(host('darwin', 'arm64').homeDir, 'Library', 'Application Support', 'design-asset-manager', 'runtime', 'huggingface-cache'))
assert.equal(macOS.config.env.DESIGN_ASSET_MANAGER_STRICT_REAL_AI, '1')

const macOSIntel = bootstrap('darwin', 'x64')
assert.equal(macOSIntel.manager.getProvider('macos-ai-branch-runtime')?.getConfig().profileId, 'macos-intel')
await macOSIntel.autoStartResult

const windows = bootstrap('win32', 'x64')
assert.equal(windows.manager.getProvider('windows-ai-branch-runtime')?.getConfig().profileId, 'windows-nvidia-cuda')
assert.equal(windows.manager.getProvider('macos-ai-branch-runtime')?.getConfig().profileId, null)
assert.equal((windows.manager.getRuntimeState('windows-ai-branch-runtime')?.metadata?.windowsAiBranch as { isCurrentPlatform?: boolean }).isCurrentPlatform, true)
assert.equal((windows.manager.getRuntimeState('macos-ai-branch-runtime')?.metadata?.macosAiBranch as { isCurrentPlatform?: boolean }).isCurrentPlatform, false)
assert.equal(windows.manager.getActiveRuntime()?.id, 'python-worker-runtime')
assert.equal((await windows.autoStartResult)?.success, true)
assert.equal(windows.runner.getHistory().length, 1)
assert.equal(windows.config.env.PADDLE_HOME, path.join(host('win32', 'x64').homeDir, 'AppData', 'Local', 'design-asset-manager', 'runtime', 'paddle-cache'))

const linux = bootstrap('linux', 'x64')
assert.equal(linux.autoStartResult, null)
assert.equal(linux.manager.getActiveRuntime()?.id, 'disabled-runtime')
assert.equal(linux.runner.getHistory().length, 0)
assert.equal(linux.config.env.HF_HOME, path.join(host('linux', 'x64').homeDir, 'Library', 'Application Support', 'design-asset-manager', 'runtime', 'huggingface-cache'))
assert.equal((linux.manager.getRuntimeState('macos-ai-branch-runtime')?.metadata?.macosAiBranch as { isCurrentPlatform?: boolean }).isCurrentPlatform, false)
assert.equal((linux.manager.getRuntimeState('windows-ai-branch-runtime')?.metadata?.windowsAiBranch as { isCurrentPlatform?: boolean }).isCurrentPlatform, false)

const bootstrapSource = await fs.readFile('src/main/services/ai-runtime/ai-runtime-bootstrap.ts', 'utf8')
const ipcSource = await fs.readFile('src/main/ipc/ai-runtime.ipc.ts', 'utf8')
assert.match(bootstrapSource, /PLATFORM_AI_BRANCH_RUNTIME_PROVIDER_DESCRIPTORS/)
assert.match(bootstrapSource, /AI_RUNTIME_BOOTSTRAP_PLATFORM_ADAPTERS/)
assert.match(bootstrapSource, /resolveAiRuntimeBootstrapPlatformAdapter/)
assert.match(bootstrapSource, /autoStartPythonWorker: true/)
assert.match(bootstrapSource, /autoStartPythonWorker: false/)
assert.doesNotMatch(bootstrapSource, /PYTHON_WORKER_AUTOSTART_PLATFORMS|AI_RUNTIME_APP_DATA_ROOT_ADAPTERS/)
assert.doesNotMatch(bootstrapSource, /process\.platform|process\.arch|os\.homedir|ipcMain/)
assert.match(ipcSource, /bootstrapAiRuntimeManager\(\{/)
assert.doesNotMatch(ipcSource, /PLATFORM_AI_BRANCH_RUNTIME_PROVIDER_DESCRIPTORS|AI_RUNTIME_BOOTSTRAP_PLATFORM_ADAPTERS/)
assert.doesNotMatch(ipcSource, /new DisabledAiRuntimeProvider|new PythonWorkerRuntimeProvider/)

console.log('ai-runtime-bootstrap passed')
