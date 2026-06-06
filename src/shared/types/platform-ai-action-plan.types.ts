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

export interface PlatformAiActionPlan {
  workflow: PlatformAiWorkflow
  status: PlatformAiBranchStatus
  kind: PlatformAiActionPlanKind
  label: string
  enabled: boolean
  reasonKind?: PlatformAiMissingRequirementKind
  targetId?: string
}
