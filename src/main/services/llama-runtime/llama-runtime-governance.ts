export type LlamaRuntimeGovernancePlatform = 'win32' | 'darwin' | 'linux' | 'unknown'
export type LlamaRuntimeGovernanceMode = 'external-inference' | 'llama-app' | 'llama-cpp' | 'disabled'

export interface LlamaRuntimeAdapterDesign {
  id: string
  mode: LlamaRuntimeGovernanceMode
  platform: LlamaRuntimeGovernancePlatform
  priority: number
  manualConfigurationRequired: boolean
  autoDownload: false
  autoInstall: false
  autoStart: false
  healthCheck: {
    kind: 'openai-compatible-http'
    userInitiatedOnly: true
    defaultBaseUrl: string | null
  }
  notes: string[]
}

export interface LlamaRuntimeGovernancePlan {
  phase: '12B'
  platform: LlamaRuntimeGovernancePlatform
  preferredMode: LlamaRuntimeGovernanceMode
  externalInferencePreferred: true
  adapters: LlamaRuntimeAdapterDesign[]
  readOnlyAudit: true
  autoDownload: false
  autoInstall: false
  autoStart: false
  blockingIssues: string[]
  risks: Array<{
    id: string
    level: 'low' | 'medium' | 'high'
    description: string
    mitigation: string
  }>
}

function normalizePlatform(platform: NodeJS.Platform | string): LlamaRuntimeGovernancePlatform {
  if (platform === 'win32' || platform === 'darwin' || platform === 'linux') return platform
  return 'unknown'
}

function createExternalAdapter(): LlamaRuntimeAdapterDesign {
  return {
    id: 'external-openai-compatible',
    mode: 'external-inference',
    platform: 'unknown',
    priority: 10,
    manualConfigurationRequired: true,
    autoDownload: false,
    autoInstall: false,
    autoStart: false,
    healthCheck: {
      kind: 'openai-compatible-http',
      userInitiatedOnly: true,
      defaultBaseUrl: null
    },
    notes: [
      'Prefer a user-configured OpenAI-compatible endpoint before local llama runtime installation.',
      'Health checks stay manual and must use the existing external HTTP runtime boundary.'
    ]
  }
}

function createMacLlamaAppAdapter(): LlamaRuntimeAdapterDesign {
  return {
    id: 'macos-llama-app',
    mode: 'llama-app',
    platform: 'darwin',
    priority: 20,
    manualConfigurationRequired: true,
    autoDownload: false,
    autoInstall: false,
    autoStart: false,
    healthCheck: {
      kind: 'openai-compatible-http',
      userInitiatedOnly: true,
      defaultBaseUrl: 'http://127.0.0.1:8080/v1'
    },
    notes: [
      'Treat llama.app as an already-installed external local service.',
      'Do not bundle, launch, download, or install llama.app from this phase.'
    ]
  }
}

function createWindowsLlamaCppAdapter(): LlamaRuntimeAdapterDesign {
  return {
    id: 'windows-llama-cpp',
    mode: 'llama-cpp',
    platform: 'win32',
    priority: 30,
    manualConfigurationRequired: true,
    autoDownload: false,
    autoInstall: false,
    autoStart: false,
    healthCheck: {
      kind: 'openai-compatible-http',
      userInitiatedOnly: true,
      defaultBaseUrl: 'http://127.0.0.1:8080/v1'
    },
    notes: [
      'Existing Windows installer behavior remains behind explicit user action.',
      'Future llama.cpp support should move through runtime package download, verification, and installer gates.'
    ]
  }
}

export function createLlamaRuntimeGovernancePlan(platform: NodeJS.Platform | string): LlamaRuntimeGovernancePlan {
  const normalized = normalizePlatform(platform)
  const adapters = [createExternalAdapter()]
  if (normalized === 'darwin') adapters.push(createMacLlamaAppAdapter())
  if (normalized === 'win32') adapters.push(createWindowsLlamaCppAdapter())

  return {
    phase: '12B',
    platform: normalized,
    preferredMode: 'external-inference',
    externalInferencePreferred: true,
    adapters,
    readOnlyAudit: true,
    autoDownload: false,
    autoInstall: false,
    autoStart: false,
    blockingIssues: [
      'llama-runtime downloads and installers remain deferred until explicit installer phases.',
      'Local llama service launch must remain manual and user initiated.'
    ],
    risks: [
      {
        id: 'llama-runtime-windows-installer-path',
        level: 'high',
        description: 'Existing llama-runtime install service is oriented around Windows llama.cpp artifacts.',
        mitigation: 'Route new decisions through platform-specific adapter design and prefer external inference first.'
      },
      {
        id: 'llama-runtime-download-install-exposure',
        level: 'high',
        description: 'Existing install service can download runtime packages and models when explicitly invoked.',
        mitigation: 'Governance plan keeps autoDownload and autoInstall false and does not call installer methods.'
      },
      {
        id: 'llama-runtime-service-launch-exposure',
        level: 'high',
        description: 'Existing service can start a local llama-server process when explicitly invoked.',
        mitigation: 'Governance plan keeps autoStart false and routes checks through manual HTTP health checks.'
      }
    ]
  }
}
