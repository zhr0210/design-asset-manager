import type {
  PlatformAiBranchStatus,
  PlatformAiMissingRequirementKind,
  PlatformAiWorkflow
} from './platform-ai-branch-status.types'

export type PlatformAiActionPlanKind =
  | 'refresh_evidence'
  | 'open_model_management'
  | 'open_runtime_management'
  | 'open_backend_management'
  | 'none'

export type PlatformAiActionCommandKind =
  | 'refresh_evidence'
  | 'open_tab'
  | 'start_llama_install'
  | 'install_ocr_runtime'
  | 'install_ai_runtime_dependencies'
  | 'none'

export type PlatformAiActionCommandTab = 'models' | 'runtime' | 'services'

export interface PlatformAiActionPlan {
  workflow: PlatformAiWorkflow
  status: PlatformAiBranchStatus
  kind: PlatformAiActionPlanKind
  label: string
  enabled: boolean
  reasonKind?: PlatformAiMissingRequirementKind
  targetId?: string
}

export interface PlatformAiActionCommand {
  kind: PlatformAiActionCommandKind
  targetTab?: PlatformAiActionCommandTab
}
