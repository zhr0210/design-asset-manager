import type { PythonWorkerRuntimeConfig } from '../ai-runtime.types'

export function createDefaultPythonWorkerRuntimeConfig(config: Partial<PythonWorkerRuntimeConfig> = {}): PythonWorkerRuntimeConfig {
  return {
    runtimeId: 'python-worker',
    displayName: 'Python AI Worker',
    pythonPath: null,
    scriptPath: null,
    workingDirectory: null,
    host: '127.0.0.1',
    port: 8000,
    baseUrl: 'http://127.0.0.1:8000',
    healthEndpoint: '/health',
    launchArgs: [],
    env: {},
    timeoutMs: 5_000,
    platform: 'all',
    profileId: null,
    metadata: {},
    ...config
  }
}

export function createCpuPythonWorkerRuntimeConfig(config: Partial<PythonWorkerRuntimeConfig> = {}): PythonWorkerRuntimeConfig {
  return createDefaultPythonWorkerRuntimeConfig({
    displayName: 'Python AI Worker CPU',
    metadata: { acceleration: 'cpu' },
    ...config
  })
}

export function createGpuPythonWorkerRuntimeConfig(config: Partial<PythonWorkerRuntimeConfig> = {}): PythonWorkerRuntimeConfig {
  return createDefaultPythonWorkerRuntimeConfig({
    displayName: 'Python AI Worker GPU',
    metadata: { acceleration: 'gpu' },
    ...config
  })
}
