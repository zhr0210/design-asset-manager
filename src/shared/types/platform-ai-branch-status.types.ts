export type PlatformAiBranch = 'macos' | 'windows'

export type PlatformAiWorkflow = 'ai_tag_task' | 'ai_prompt_task' | 'ocr_text_box' | 'search_embedding'

export type PlatformAiBranchStatus =
  | 'evidence_insufficient'
  | 'planned_capability'
  | 'runtime_probe_ready'
  | 'ready_to_load'
  | 'real_model_path'
  | 'unavailable'

export type PlatformAiStatusEvidenceCode =
  | 'runtime_probe_ready'
  | 'dependency_ready'
  | 'artifact_ready'
  | 'real_backend_loaded'
  | 'external_backend_healthy'
  | 'service_running'
  | 'planned_capability'
  | 'dependency_missing'
  | 'artifact_missing'
  | 'service_unavailable'
  | 'platform_unsupported'
  | 'configuration_disabled'
  | 'unknown'

export type PlatformAiStatusEvidenceSource =
  | 'static_metadata'
  | 'worker_probe'
  | 'model_readiness'
  | 'runtime_health'
  | 'backend_settings'
  | 'user_configuration'

export interface PlatformAiStatusEvidence {
  code: PlatformAiStatusEvidenceCode
  label: string
  source: PlatformAiStatusEvidenceSource
  detail?: string
}

export type PlatformAiMissingRequirementKind =
  | 'runtime_dependency'
  | 'model_artifact'
  | 'runtime_service'
  | 'backend_configuration'
  | 'platform_support'
  | 'unknown'

export interface PlatformAiMissingRequirement {
  kind: PlatformAiMissingRequirementKind
  id: string
  label: string
  detail?: string
}

export type PlatformAiNextActionKind =
  | 'install_dependencies'
  | 'download_model_artifact'
  | 'start_runtime'
  | 'configure_external_backend'
  | 'run_health_check'
  | 'none'

export interface PlatformAiNextAction {
  kind: PlatformAiNextActionKind
  label: string
  target?: {
    kind: 'runtime_lane' | 'model_artifact' | 'backend' | 'workflow'
    id: string
  }
}

export interface PlatformAiRuntimeLaneEvidence {
  lane: string
  label: string
  status: PlatformAiBranchStatus
  evidence: PlatformAiStatusEvidence[]
}

export interface PlatformAiWorkflowStatus {
  workflow: PlatformAiWorkflow
  status: PlatformAiBranchStatus
  title: string
  summary: string
  primaryRuntimeLane: string
  runtimeLanes: PlatformAiRuntimeLaneEvidence[]
  evidence: PlatformAiStatusEvidence[]
  missing: PlatformAiMissingRequirement[]
  nextAction?: PlatformAiNextAction
}

export interface PlatformAiBranchStatusResponse {
  platformBranch: PlatformAiBranch
  generatedAt: string
  workflows: PlatformAiWorkflowStatus[]
}
