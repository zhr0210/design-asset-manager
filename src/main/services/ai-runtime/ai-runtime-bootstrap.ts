import path from 'node:path'
import { createMacOSAiBranchRuntimeMetadata } from '../../../shared/constants/macos-ai-runtime.constants'
import { createWindowsAiBranchRuntimeMetadata } from '../../../shared/constants/windows-ai-runtime.constants'
import type { AiRuntimeOperationResult, AiRuntimeProvider, PythonWorkerRuntimeConfig } from '../../../shared/types/ai-runtime.types'
import type { PlatformArch, PlatformName } from '../../../shared/types/platform.types'
import type { RuntimeProfileId } from '../../../shared/types/runtime-profile.types'
import { runtimeProfileRuleMatchesTarget } from '../../runtime/runtime-profile-selection'
import { AiRuntimeManager } from './ai-runtime-manager'
import { DisabledAiRuntimeProvider } from './providers/disabled-ai-runtime.provider'
import { PythonWorkerRuntimeProvider } from './providers/python-worker-runtime.provider'
import { createDefaultPythonWorkerRuntimeConfig } from './providers/python-worker-runtime-presets'

interface PlatformAiBranchRuntimeProviderProfileRule {
  platform: PlatformName
  arch?: PlatformArch
  profileId: RuntimeProfileId
}

interface PlatformAiBranchRuntimeProviderDescriptor {
  id: string
  displayName: string
  platform: PlatformName
  profileRules: PlatformAiBranchRuntimeProviderProfileRule[]
  createMetadata: (currentPlatform: PlatformName, currentArch: PlatformArch) => Record<string, unknown>
}

interface AiRuntimeBootstrapPlatformAdapter {
  platform?: PlatformName
  autoStartPythonWorker: boolean
  pathParts: string[]
}

export interface AiRuntimeBootstrapHost {
  platform: PlatformName
  arch: PlatformArch
  homeDir: string
  pythonExecutable: string | null
  aiServiceRoot: string
}

export interface AiRuntimeBootstrapDependencies {
  manager?: AiRuntimeManager
  createPythonWorkerProvider?: (config: PythonWorkerRuntimeConfig) => AiRuntimeProvider
  onAutoStartError?: (error: unknown) => void
}

export interface AiRuntimeBootstrapResult {
  manager: AiRuntimeManager
  autoStartResult: Promise<AiRuntimeOperationResult | null> | null
}

const PLATFORM_AI_BRANCH_RUNTIME_PROVIDER_DESCRIPTORS: PlatformAiBranchRuntimeProviderDescriptor[] = [
  {
    id: 'macos-ai-branch-runtime',
    displayName: 'macOS AI Branch Runtime',
    platform: 'darwin',
    profileRules: [
      { platform: 'darwin', arch: 'arm64', profileId: 'macos-apple-silicon' },
      { platform: 'darwin', profileId: 'macos-intel' }
    ],
    createMetadata: (currentPlatform, currentArch) => ({
      displayName: 'macOS AI Branch',
      macosAiBranch: createMacOSAiBranchRuntimeMetadata(currentPlatform, currentArch)
    })
  },
  {
    id: 'windows-ai-branch-runtime',
    displayName: 'Windows AI Branch Runtime',
    platform: 'win32',
    profileRules: [
      { platform: 'win32', profileId: 'windows-nvidia-cuda' }
    ],
    createMetadata: (currentPlatform, currentArch) => ({
      displayName: 'Windows AI Branch',
      windowsAiBranch: createWindowsAiBranchRuntimeMetadata(currentPlatform, currentArch)
    })
  }
]

const AI_RUNTIME_BOOTSTRAP_PLATFORM_ADAPTERS: AiRuntimeBootstrapPlatformAdapter[] = [
  {
    platform: 'win32',
    autoStartPythonWorker: true,
    pathParts: ['AppData', 'Local', 'design-asset-manager', 'runtime']
  },
  {
    platform: 'darwin',
    autoStartPythonWorker: true,
    pathParts: ['Library', 'Application Support', 'design-asset-manager', 'runtime']
  },
  {
    autoStartPythonWorker: false,
    pathParts: ['Library', 'Application Support', 'design-asset-manager', 'runtime']
  }
]

function resolvePlatformAiBranchProviderProfileId(
  descriptor: PlatformAiBranchRuntimeProviderDescriptor,
  currentPlatform: PlatformName,
  currentArch: PlatformArch
): RuntimeProfileId | null {
  const rule = descriptor.profileRules.find((candidate) => runtimeProfileRuleMatchesTarget(candidate, {
    platform: currentPlatform,
    arch: currentArch
  }))
  return rule?.profileId ?? null
}

function resolveAiRuntimeBootstrapPlatformAdapter(platform: PlatformName): AiRuntimeBootstrapPlatformAdapter {
  return AI_RUNTIME_BOOTSTRAP_PLATFORM_ADAPTERS.find((candidate) => {
    return !candidate.platform || candidate.platform === platform
  })!
}

function resolveAiRuntimeAppDataRoot(adapter: AiRuntimeBootstrapPlatformAdapter, homeDir: string): string {
  return path.join(homeDir, ...adapter.pathParts)
}

export function bootstrapAiRuntimeManager(
  host: AiRuntimeBootstrapHost,
  dependencies: AiRuntimeBootstrapDependencies = {}
): AiRuntimeBootstrapResult {
  const manager = dependencies.manager ?? new AiRuntimeManager()
  const createPythonWorkerProvider = dependencies.createPythonWorkerProvider
    ?? ((config: PythonWorkerRuntimeConfig) => new PythonWorkerRuntimeProvider(config))
  const platformAdapter = resolveAiRuntimeBootstrapPlatformAdapter(host.platform)
  const appDataRoot = resolveAiRuntimeAppDataRoot(platformAdapter, host.homeDir)

  manager.registerProvider(new DisabledAiRuntimeProvider({ id: 'disabled-runtime' }))
  for (const descriptor of PLATFORM_AI_BRANCH_RUNTIME_PROVIDER_DESCRIPTORS) {
    manager.registerProvider(new DisabledAiRuntimeProvider({
      id: descriptor.id,
      displayName: descriptor.displayName,
      platform: descriptor.platform,
      profileId: resolvePlatformAiBranchProviderProfileId(descriptor, host.platform, host.arch),
      metadata: descriptor.createMetadata(host.platform, host.arch)
    }))
  }
  manager.registerProvider(createPythonWorkerProvider(
    createDefaultPythonWorkerRuntimeConfig({
      runtimeId: 'python-worker-runtime',
      displayName: 'Python AI Worker Runtime',
      pythonPath: host.pythonExecutable,
      scriptPath: path.join(host.aiServiceRoot, 'app.py'),
      workingDirectory: host.aiServiceRoot,
      env: {
        PYTHONUNBUFFERED: '1',
        DESIGN_ASSET_MANAGER_STRICT_REAL_AI: '1',
        HF_HOME: path.join(appDataRoot, 'huggingface-cache'),
        PADDLE_HOME: path.join(appDataRoot, 'paddle-cache'),
        PADDLEX_HOME: path.join(appDataRoot, 'paddlex-cache')
      }
    })
  ))

  if (!platformAdapter.autoStartPythonWorker) {
    manager.selectActiveRuntime('disabled-runtime')
    return { manager, autoStartResult: null }
  }

  manager.selectActiveRuntime('python-worker-runtime')
  const autoStartResult = manager.startRuntime('python-worker-runtime').catch((error) => {
    dependencies.onAutoStartError?.(error)
    return null
  })
  return { manager, autoStartResult }
}
