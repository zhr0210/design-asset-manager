import type { PlatformAiWorkflow } from './platform-ai-branch-status.types'

export type AiModelArtifactReadinessState =
  | 'unknown'
  | 'dependency_missing'
  | 'artifact_missing'
  | 'artifact_downloading'
  | 'ready_to_load'
  | 'loaded_real'
  | 'external_backend_healthy'

export type AiModelArtifactReadinessSource =
  | 'cooperative_model'
  | 'llama_local_model'
  | 'external_backend'
  | 'worker_runtime'
  | 'explicit_load_probe'

export interface AiModelArtifactReadiness {
  workflow: PlatformAiWorkflow
  runtimeLane: string
  artifactId: string
  label: string
  state: AiModelArtifactReadinessState
  source: AiModelArtifactReadinessSource
  detail?: string
  missing?: Array<{
    id: string
    label: string
    kind: 'runtime_dependency' | 'model_artifact' | 'backend_configuration' | 'unknown'
    detail?: string
  }>
}

export interface CooperativeWorkerReadiness {
  state?: string
  label?: string
  backend?: string
  missing_dependencies?: string[]
  missing_files?: string[]
}

export interface CooperativeWorkerModelStatus {
  loaded?: boolean
  backend?: string
  is_mock?: boolean | null
  downloaded?: boolean
  readiness?: CooperativeWorkerReadiness
}

export interface WorkerModelStatusSnapshot {
  loaded_models?: Record<string, unknown>
  cooperative_models?: Record<string, CooperativeWorkerModelStatus>
}
